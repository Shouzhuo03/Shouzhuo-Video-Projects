# Shouzhuo - Video Projects

[简体中文](README.zh-CN.md)

Project files for three of my previously published videos. Download and extract the repository, open the project's `index.html` in Chrome or Chromium, and click Play to preview it offline. Keep the project directory intact so the browser can load its scripts, fonts, and assets.

| Project | Original video | Offline preview | Editable text |
| --- | --- | --- | --- |
| Split Desktop | [Watch on Bilibili](https://www.bilibili.com/video/BV1rJno6EECw/) | [index.html](01-split-desktop/index.html) | Notifications, icon names, desktop menus, clock, and end title in [config.js](01-split-desktop/config.js) |
| Recreation | [Watch on Bilibili](https://www.bilibili.com/video/BV1rwWd6QEUk/) | [index.html](02-recreation-film/index.html) | Social post, dialogue, canvas labels, video placeholder labels, end title, and credits in [config.js](02-recreation-film/config.js) |
| A World Without AI | [Watch on Bilibili](https://www.bilibili.com/video/BV1eG4K6kERC/) | [index.html](03-world-without-ai/index.html) | End title, text along the curve, and on-screen logs in [config.js](03-world-without-ai/config.js) |

Save your changes and reload the preview. In the log entries for *A World Without AI*, the second field is the visible text and the optional third field identifies a shot cue. The bundled fonts cover common Simplified Chinese characters. Other characters fall back to Chinese fonts installed on your system.

*Recreation* uses static placeholders for the original English clip and its Chinese recreation. The pixel-art PNG props are included.

I generated the *Split Desktop* wallpaper with code.

## Exporting video

You need Node.js 22.12.0 or later with npm, Chrome or Chromium, and FFmpeg with the `libx264` encoder. Confirm that `node --version` and `ffmpeg -version` work in your terminal.

Run these commands from the project directory containing `package.json`. The first dependency installation requires internet access.

```sh
npm ci
npm run render
```

The default output is `out/animation.mp4`. Run `npm run render -- --to 1` for a one-second test export and `npm run render -- --help` for the time range, resolution, and audio options. *Split Desktop* and *A World Without AI* use their bundled soundtracks by default. Use `--audio <path>` to supply your own track or `--no-audio` to export without audio. *Recreation* is silent by default and accepts `--audio <path>`.

The renderer searches common browser installation locations. Set `CHROME_BIN` to the full browser executable path for a custom installation. Set `FFMPEG_BIN` to the FFmpeg executable if it is outside `PATH`.

### Optional post-processing

*Recreation* and *A World Without AI* can export frames for a depth-of-field or moiré pass, respectively. This workflow requires Python 3 and has been tested with Python 3.13. Run the commands from the corresponding project directory.

macOS and Linux

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
npm run render -- --frames out/frames
.venv/bin/python postprocess.py out/frames out/final.mp4
```

Windows PowerShell

```powershell
py -3 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
npm run render -- --frames out/frames
.\.venv\Scripts\python.exe postprocess.py out/frames out/final.mp4
```

Each successful frame export replaces the previous set in its output directory. Choose a different directory to keep multiple versions.

## License

This repository is licensed under [CC BY 4.0](LICENSE). Third-party materials retain their own licenses. [Third-party notices](THIRD_PARTY_NOTICES.md)

When you share my work, mentioning **@守拙Shouzhuo** in a suitable place satisfies all attribution requirements for my work. Your mention encourages me to open-source more projects.
