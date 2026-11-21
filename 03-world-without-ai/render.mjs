import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import {lstat, mkdir, mkdtemp, readdir, rename, rm, writeFile} from 'node:fs/promises';
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
  frames: {type: 'string'},
  help: {type: 'boolean', short: 'h'}
}});

if (values.help) {
  console.log('npm run render -- [--from 秒] [--to 秒] [--width 像素] [--out 文件.mp4] [--audio 配乐文件 | --no-audio]');
  console.log('npm run render -- --frames 目录 [--from 秒] [--to 秒] [--width 像素]');
  console.log('python3 postprocess.py 帧目录 文件.mp4 [--audio 配乐文件 | --no-audio]');
  console.log('MP4 导出和后期编码默认使用项目自带的配乐。');
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

async function replaceFrames(destination, capture) {
  const parent = path.dirname(destination), lock = destination + '.lock';
  await mkdir(parent, {recursive: true});
  try {
    await mkdir(lock);
  } catch (error) {
    if (error.code === 'EEXIST') throw new Error(`帧目录正在使用：${destination}`);
    throw error;
  }
  let work, keepBackup = false;
  try {
    const existing = await lstat(destination).catch(error => {
      if (error.code === 'ENOENT') return null;
      throw error;
    });
    if (existing) {
      if (!existing.isDirectory()) throw new Error(`帧输出路径需要是目录：${destination}`);
      const files = await readdir(destination, {withFileTypes: true});
      if (files.some(file => !file.isFile() || !/^f_\d{5}(?:\.json|_s[0-5]\.png)$/.test(file.name))) {
        throw new Error(`帧目录包含其他文件，请换一个输出目录：${destination}`);
      }
    }
    work = await mkdtemp(path.join(parent, '.frames-'));
    const next = path.join(work, 'next'), previous = path.join(work, 'previous');
    await mkdir(next);
    await capture(next);
    if (existing) await rename(destination, previous);
    try {
      await rename(next, destination);
    } catch (error) {
      if (existing) {
        try {
          await rename(previous, destination);
        } catch {
          keepBackup = true;
          throw new Error(`无法更新帧目录，上一轮的帧在 ${previous}`, {cause: error});
        }
      }
      throw error;
    }
  } finally {
    await rm(lock, {recursive: true, force: true});
    if (work && !keepBackup) await rm(work, {recursive: true, force: true});
  }
}

async function render() {
  const url = new URL('index.html?capture=1', import.meta.url);
  const ratio = 9 / 16;
  const width = Number(values.width ?? 540);
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
  if (values.frames && values.audio) throw new Error('使用 --frames 时，请在运行后期脚本时传入 --audio。');
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
    const duration = await page.evaluate(async () => {
      window.animation = await window.animationReady;
      return window.animation.duration;
    });
    if (pageError) throw pageError;
    const first = Math.round(from * FPS);
    const last = Math.round(Math.min(until ?? duration, duration) * FPS);
    if (first >= last) throw new Error('选定时间范围内没有可渲染的帧。');

    async function* frames(destination) {
      for (let frame = first; frame < last; frame++) {
        if (pageError) throw pageError;
        await page.evaluate(seconds => window.animation.seek(seconds), frame / FPS);
        if (pageError) throw pageError;
        const image = await page.screenshot({type: 'png', captureBeyondViewport: false});
        if (destination) {
          const stem = 'f_' + String(frame).padStart(5, '0');
          const camera = await page.evaluate(() => window.animation.camera());
          await writeFile(path.join(destination, stem + '_s0.png'), image);
          await writeFile(path.join(destination, stem + '.json'), JSON.stringify({...camera, sub: 1}));
        } else {
          yield image;
        }
        if ((frame - first + 1) % 60 === 0 || frame + 1 === last) console.log(`${frame - first + 1} / ${last - first} 帧`);
      }
    }

    if (values.frames) {
      const destination = path.resolve(values.frames);
      await replaceFrames(destination, async dir => {
        for await (const _ of frames(dir)) {}
      });
      console.log(destination);
      return;
    }

    await mkdir(path.dirname(out), {recursive: true});
    temp = await mkdtemp(path.join(path.dirname(out), '.render-'));
    const file = path.join(temp, 'animation.mp4');
    const audioFilter = `asetpts=PTS-STARTPTS,apad,atrim=duration=${(last - first) / FPS}`;
    const sound = audio
      ? ['-ss', String(first / FPS), '-i', audio, '-map', '0:v:0', '-map', '1:a:0', '-c:a', 'aac', '-b:a', '256k', '-af', audioFilter]
      : ['-an'];
    const encoder = spawn(process.env.FFMPEG_BIN || 'ffmpeg', [
      '-hide_banner', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', 'pipe:0',
      ...sound, '-vf', 'format=yuv420p', '-r', String(FPS), '-c:v', 'libx264', '-crf', '18', '-preset', 'fast', '-movflags', '+faststart', file
    ], {stdio: ['pipe', 'ignore', 'pipe']});
    let stderr = '';
    encoder.stderr.on('data', data => { stderr = (stderr + data).slice(-4000); });
    const encoded = new Promise((resolve, reject) => {
      encoder.once('error', error => reject(error.code === 'ENOENT' ? new Error('找不到 FFmpeg，请先安装或设置 FFMPEG_BIN。') : error));
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
