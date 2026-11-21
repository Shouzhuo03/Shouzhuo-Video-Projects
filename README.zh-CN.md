# Shouzhuo - 视频工程

[English](README.md)

这里是我三个往期视频的工程文件。下载并解压仓库后，用 Chrome 或 Chromium 打开对应项目的 `index.html`，点「播放」即可离线预览。请保留完整的项目目录，浏览器会从中加载脚本、字体和素材。

| 项目 | B 站原视频 | 预览入口 | 可改文案 |
| --- | --- | --- | --- |
| 分身乏术 | [《分身乏术》｜这也是 Ai 做的视频！！？](https://www.bilibili.com/video/BV1rJno6EECw/) | [index.html](01-split-desktop/index.html) | [config.js](01-split-desktop/config.js) 的通知、图标名称、桌面菜单、时钟和片尾标题 |
| 复刻 | [【接受挑战】我用 Ai复刻了这个爆火视频](https://www.bilibili.com/video/BV1rwWd6QEUk/) | [index.html](02-recreation-film/index.html) | [config.js](02-recreation-film/config.js) 的帖子、对白、画布标签、两段视频占位文案、片尾标题和致谢 |
| 没有 AI 的世界线 | [古法手搓老艺术家想要回到没有Ai的世界线](https://www.bilibili.com/video/BV1eG4K6kERC/) | [index.html](03-world-without-ai/index.html) | [config.js](03-world-without-ai/config.js) 的片尾标题、沿曲线出现的文字和画面内的日志 |

保存配置并刷新预览即可看到修改。《没有 AI 的世界线》的日志条目里，第二项是画面文字，第三项若存在是镜头定位用的标识。随附字体覆盖常用简体汉字，其余字会使用系统已安装的中文字体。

《复刻》的英文原片和中文复刻使用静态占位画面，画布上的像素风 PNG 随项目附带。

《分身乏术》的桌面壁纸是我用代码生成的。

## 导出视频

视频导出需要 Node.js 22.12.0 或更新版本（含 npm）、Chrome 或 Chromium，以及带有 `libx264` 编码器的 FFmpeg。先确认终端能运行 `node --version` 和 `ffmpeg -version`。

在对应项目的 `package.json` 所在目录运行以下命令。首次安装 npm 依赖需要联网。

```sh
npm ci
npm run render
```

默认输出 `out/animation.mp4`。可用 `npm run render -- --to 1` 试导出前 1 秒，用 `npm run render -- --help` 查看时间范围、分辨率和音轨参数。《分身乏术》和《没有 AI 的世界线》默认使用自带配乐，可用 `--audio 路径` 更换，或用 `--no-audio` 导出无声视频。《复刻》默认无声，也可用 `--audio 路径` 加配乐。

导出脚本会从常见的安装位置查找浏览器。自定义安装可将环境变量 `CHROME_BIN` 设为浏览器可执行文件的完整路径。FFmpeg 不在 `PATH` 时，可用 `FFMPEG_BIN` 指定可执行文件。

### 可选后期

《复刻》和《没有 AI 的世界线》可以先导出帧，再分别应用景深或摩尔纹后期。需要 Python 3，已用 Python 3.13 验证。请在对应项目目录运行命令。

macOS 和 Linux

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

每次成功导出帧后，新帧会替换输出目录中的上一批帧。如需保留多个版本，请分别指定输出目录。

## 许可

本仓库采用 [CC BY 4.0](LICENSE)。第三方素材适用各自的许可。[第三方声明](THIRD_PARTY_NOTICES.md)

分享我的作品时，在适当的地方 **@守拙Shouzhuo** 就满足署名要求了。你的 @ 会鼓励我开源更多的仓库。
