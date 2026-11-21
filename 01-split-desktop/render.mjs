import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import {mkdir, mkdtemp, rename, rm} from 'node:fs/promises';
import path from 'node:path';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';
import puppeteer from 'puppeteer-core';

const FPS = 30;
const {values} = parseArgs({options: {
  from: {type: 'string', default: '0'},
  to: {type: 'string'},
  width: {type: 'string'},
  out: {type: 'string', default: 'out/animation.mp4'},
  audio: {type: 'string'},
  'no-audio': {type: 'boolean', default: false},
  help: {type: 'boolean', short: 'h'}
}});

if (values.help) {
  console.log('npm run render -- [--from 秒] [--to 秒] [--width 像素] [--out 文件.mp4] [--audio 配乐文件 | --no-audio]');
  console.log('默认使用项目自带的演示配乐；若未找到默认配乐或传入 --no-audio，将导出无声视频。');
  process.exit(0);
}

function findChrome() {
  if (process.env.CHROME_BIN) return process.env.CHROME_BIN;
  const windows = [process.env.LOCALAPPDATA, process.env.PROGRAMFILES, process.env['ProgramFiles(x86)']]
    .filter(Boolean).map(folder => path.join(folder, 'Google', 'Chrome', 'Application', 'chrome.exe'));
  const chrome = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser',
    ...windows
  ].find(existsSync);
  if (!chrome) throw new Error('请安装 Chrome，或将 CHROME_BIN 设为 Chrome / Chromium 的可执行文件路径。');
  return chrome;
}

async function render() {
  const url = new URL('index.html?capture=1', import.meta.url);
  const ratio = 4 / 3;
  const width = Number(values.width ?? 960);
  const height = Math.round((width / ratio) / 2) * 2;
  const from = Number(values.from);
  const until = values.to === undefined ? undefined : Number(values.to);
  const out = path.resolve(values.out);
  if (values.audio && values['no-audio']) throw new Error('--audio 和 --no-audio 只能选一个。');
  const defaultAudio = fileURLToPath(new URL('assets/soundtrack.m4a', import.meta.url));
  const audio = values['no-audio'] ? null : (values.audio ? path.resolve(values.audio) : (existsSync(defaultAudio) ? defaultAudio : null));
  if (!Number.isSafeInteger(width) || width < 16 || width % 2) throw new Error('--width 需要大于等于 16 的偶数。');
  if (!Number.isFinite(from) || from < 0 || (until !== undefined && (!Number.isFinite(until) || until <= from))) {
    throw new Error('请填写有效的时间范围（0 ≤ --from < --to）。');
  }
  if (path.extname(out).toLowerCase() !== '.mp4') throw new Error('--out 需要使用 .mp4 扩展名。');
  if (values.audio && !existsSync(audio)) throw new Error(`找不到配乐文件：${audio}`);
  url.searchParams.set('w', width);
  url.searchParams.set('h', height);

  const browser = await puppeteer.launch({
    executablePath: findChrome(),
    args: ['--hide-scrollbars', '--force-color-profile=srgb', '--enable-unsafe-swiftshader']
  });
  let temp;
  try {
    const page = await browser.newPage();
    let pageError;
    page.on('pageerror', error => { pageError ??= error; });
    await page.setViewport({width, height, deviceScaleFactor: 1});
    await page.goto(url.href);
    await page.waitForFunction(() => Boolean(window.animationReady));
    const {duration, multisample} = await page.evaluate(async () => {
      const animation = window.animation = await window.animationReady;
      return {duration: animation.duration, multisample: Boolean(animation.drawSample)};
    });
    if (pageError) throw pageError;
    const first = Math.round(from * FPS);
    const last = Math.round(Math.min(until ?? duration, duration) * FPS);
    if (first >= last) throw new Error('选定时间范围内没有可渲染的帧。');

    const slots = multisample ? 6 : 1;
    const filter = multisample
      ? "tmix=frames=6,select='eq(mod(n\\,6)\\,5)',setpts=N/30/TB,format=yuv420p"
      : 'format=yuv420p';
    async function* frames() {
      for (let frame = first; frame < last; frame++) {
        if (pageError) throw pageError;
        const samples = multisample ? await page.evaluate((f, w) => window.animation.samples(f, w), frame, width) : 1;
        for (let i = 0; i < samples; i++) {
          const offset = (i + 0.5) / samples - 0.5;
          await page.evaluate(async (f, offset, fps) => {
            const {drawSample, seek} = window.animation;
            await (drawSample ? drawSample(f, offset) : seek(f / fps));
          }, frame, offset, FPS);
          if (pageError) throw pageError;
          const image = await page.screenshot({type: 'png', captureBeyondViewport: false});
          for (let repeat = 0; repeat < slots / samples; repeat++) yield image;
        }
        if ((frame - first + 1) % 60 === 0 || frame + 1 === last) console.log(`${frame - first + 1} / ${last - first} 帧`);
      }
    }

    await mkdir(path.dirname(out), {recursive: true});
    temp = await mkdtemp(path.join(path.dirname(out), '.render-'));
    const file = path.join(temp, 'animation.mp4');
    const audioFilter = `asetpts=PTS-STARTPTS,apad,atrim=duration=${(last - first) / FPS}`;
    const sound = audio
      ? ['-ss', String(first / FPS), '-i', audio, '-map', '0:v:0', '-map', '1:a:0', '-c:a', 'aac', '-b:a', '256k', '-af', audioFilter]
      : ['-an'];
    const encoder = spawn(process.env.FFMPEG_BIN || 'ffmpeg', [
      '-hide_banner', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS * slots), '-i', 'pipe:0',
      ...sound, '-vf', filter, '-r', String(FPS), '-c:v', 'libx264', '-crf', '18', '-preset', 'fast', '-movflags', '+faststart', file
    ], {stdio: ['pipe', 'ignore', 'pipe']});
    let stderr = '';
    encoder.stderr.on('data', data => { stderr = (stderr + data).slice(-4000); });
    const encoded = new Promise((resolve, reject) => {
      encoder.once('error', err => reject(err.code === 'ENOENT' ? new Error('找不到 ffmpeg，请先安装 FFmpeg 或设置 FFMPEG_BIN。') : err));
      encoder.once('close', (code, signal) => code === 0 ? resolve() : reject(new Error(stderr || `FFmpeg exited with ${code ?? signal}.`)));
    });
    try {
      await Promise.all([encoded, pipeline(Readable.from(frames()), encoder.stdin)]);
    } catch (error) {
      encoder.kill();
      await encoded.catch(() => {});
      throw error;
    }
    await rename(file, out);
    console.log(out);
  } finally {
    const browserProcess = browser.process();
    try {
      await browser.close();
    } finally {
      // A browser helper can keep the inherited pipes open after Chrome exits.
      browserProcess?.stdout?.destroy();
      browserProcess?.stderr?.destroy();
      if (temp) await rm(temp, {recursive: true, force: true});
    }
  }
}

render().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
