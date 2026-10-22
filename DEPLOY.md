# ChatGPT 启动动画 · 完整部署包

当前导出版本：24 秒（不含交互等待），1920 × 1080，60 FPS，默认莱茵原提示音与语音、最初版电子收尾提示音。包含网页动画、终端页面、Windows 播放器源码及可执行文件、完整素材、三版成片与制作脚本。

当前默认成片已包含三个不同的Q版姿态：连接页待机、加载页工作、核验页微笑招手。三张透明角色图、生成提示词、工作台与档案页的Q版展示均随包提供，部署时无需重新生成图片或渲染视频。`output/chatgpt-chibi-pages-review.png` 与 `output/chatgpt-chibi-wave-review.png` 提供页面效果预览。

这是打开目标应用前播放的启动动画；安装后从新快捷方式启动 ChatGPT/Codex。它不替换 Windows 系统引导画面，也不添加登录自启动。

## 直接使用（Windows）

先将 ZIP **全部解压**到一个固定目录。

1. 双击 `preview.cmd`：全屏预览当前动画，在许可页点击“申请访问许可”或按 Enter 继续，结束自动退出，Esc 提前结束。无需安装 Node.js 或 Python。
2. 双击 `install.cmd`：识别本机已安装的 ChatGPT/Codex Windows 应用，编译并安装动画启动器，创建桌面「ChatGPT」与开始菜单「ChatGPT（动画启动）」快捷方式。安装器会备份它改写的旧快捷方式。
3. 以后通过新快捷方式打开客户端。恢复入口在开始菜单「ChatGPT 启动工具 → 恢复默认启动」。

Windows 播放器使用 WPF/.NET Framework 4.x，构建脚本使用 Windows x64 中的 `Framework64\v4.0.30319\csc.exe`；需要系统能够播放 H.264/AAC。安装的是当前用户入口，通常不需要管理员权限。

如果找不到唯一目标应用，在 Windows PowerShell 中列出应用并指定实际 AppID：

```powershell
Get-StartApps | Where-Object { $_.Name -match 'ChatGPT|Codex' }
powershell -NoProfile -ExecutionPolicy Bypass -File .\startup\Deploy-Startup.ps1 -AppId '这里替换为实际的AppID'
```

应用标识按目标电脑查询，不写死为导出电脑的值。播放器安装到当前用户“文档”目录下的 `ChatGPT\启动器`。若已有本项目安装，安装命令会报告已安装；使用下列更新命令切换或更新版本：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\startup\Update-Startup.ps1 -AudioVariant rhine
powershell -NoProfile -ExecutionPolicy Bypass -File .\startup\Update-Startup.ps1 -AudioVariant instrumental
powershell -NoProfile -ExecutionPolicy Bypass -File .\startup\Update-Startup.ps1 -AudioVariant voice
```

三条命令分别启用莱茵融合版、旧无人声版、旧女声版，先备份现有播放器与视频。仅试听女声可运行：

```powershell
.\startup\preview\ChatGPT-Startup-Preview.exe --preview --video "$PWD\output\chatgpt-boot-voice.mp4"
```

## 网页预览与静态部署

安装 Node.js 20 或更高版本后，双击 `web-preview.cmd`，或在本目录执行：

```powershell
node server.cjs
```

打开 `http://127.0.0.1:4173/`。网页运行没有 npm 依赖，无需执行 `npm install`。浏览器若限制声音自动播放，点击画面一次即可开启声音。许可页等待点击或 Enter，动画结束自动进入主终端，Esc 可提前进入。

- 莱茵融合版试听：`http://127.0.0.1:4173/?review=1&audio=rhine`
- 旧音轨无人声试听：`http://127.0.0.1:4173/?review=1&audio=instrumental`
- 旧音轨女声试听：`http://127.0.0.1:4173/?review=1&audio=voice`
- 试听快捷键：空格暂停，R 重播，M 静音。

静态托管时，将根目录的五个 HTML 页面、`assets/` 和 `output/` 的成片、交互配置与海报文件保持相对结构上传到静态 Web 目录即可。支持子目录部署。无需上传 `startup/`、`tools/`、开发依赖或校验文件。使用支持 MP4、WAV MIME 类型与视频字节范围请求的常规静态服务器。

Node 服务默认仅监听本机；如需局域网访问可配置：

```powershell
$env:HOST = '0.0.0.0'
$env:PORT = '8080'
node server.cjs
```

网页中的工作台数据保存在当前浏览器的 localStorage 中。包内不包含浏览器个人任务记录。更换浏览器或站点地址后会使用独立的存储空间。

## 包含内容

| 路径 | 内容 |
| --- | --- |
| `index.html` | Canvas 动画源代码与 24 秒时间轴与许可按钮 |
| `terminal.html`、`operator.html`、`archives.html`、`workspace.html` | 主终端、角色档案、记忆档案、任务板 |
| `assets/` | CSS、JavaScript、全部角色图片、眼睑过渡帧、标识、图标、WAV 音轨、原始女声 MP3 与生成提示词 |
| `assets/chatgpt-chibi-idle.png`、`chatgpt-chibi-work.png`、`chatgpt-chibi-wave.png` | 待机、工作、招手三种不同的Q版透明素材 |
| `assets/chibi-prompts.json` | 三种Q版姿态的生成提示词与参考关系 |
| `output/chatgpt-boot.mp4` | 当前默认莱茵融合成片 |
| `output/chatgpt-boot-rhine.mp4` | 莱茵融合版，与当前默认文件一致 |
| `output/chatgpt-boot-instrumental.mp4` | 此前无人声备选成片 |
| `output/chatgpt-boot-voice.mp4` | AI 女声成片 |
| `output/chatgpt-boot-poster.png` | 海报帧 |
| `output/chatgpt-boot*.interaction.json`、`output/chatgpt-permission-idle.mp4` | 访问许可的等待时间、视频校验信息与无声待机循环 |
| `startup/StartupPlayer.cs` | Windows WPF 播放器完整 C# 源码 |
| `startup/*.ps1` | 编译、目标识别、安装、更新与恢复脚本 |
| `startup/preview/` | 已编译播放器、默认视频和图标，解压即可预览 |
| `tools/` | 音频制作、视频导出、整包导出和校验脚本 |
| `package.json`、`requirements.txt` | 可选制作依赖；仅重新制作时需要 |
| `docs/PROJECT-NOTES.md` | 原项目说明及创作参考，所述本机安装状态属于制作记录 |
| `PACKAGE-MANIFEST.json`、`SHA256SUMS.txt` | 包内文件大小与 SHA-256 校验清单 |

## 从源码重新制作

已有成片和素材可以直接部署；以下步骤仅在修改动画或音轨后使用。角色图像均已随包提供，制作提示词在 `assets/*-prompts.json`，重新生成图片需要相应图像生成工具。

### 重新编译 Windows 播放器

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\startup\Build-Preview.ps1
```

默认采用 `output/chatgpt-boot.mp4`；也可加 `-AudioVariant rhine`、`voice` 或 `instrumental`。

### 重新合成音频与导出视频

已有声音片段可以离线重新混音；最初版电子提示音已随素材提供。Windows 上安装 Node.js、Python 与 Edge 后，在本目录运行：

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
npm install
$env:PYTHON = "$PWD\.venv\Scripts\python.exe"
npm run compose:rhine
npm run render
```

渲染脚本使用已安装的 Edge，逐帧导出24 秒（不含交互等待）、60 FPS 视频，写入 `output/chatgpt-boot-rhine.mp4` 、交互配置与对应海报。运行时间随机器性能变化，帧时间不受实时播放掉帧影响。FFmpeg 按 `FFMPEG_BINARY`、系统 PATH、指定 Python 的 imageio-ffmpeg 依次查找。

最初版电子收尾音已包含在 `assets/chatgpt-original-ending.wav`。若需重新提取，可运行 `tools/prepare-original-ending.py` 并传入最初版视频路径；随后重新执行混音与渲染。当前成片不使用此前的 Welcome 女声处理脚本。

导出后执行 `startup/Update-Startup.ps1 -AudioVariant rhine`，更新已安装启动器和项目默认成片。旧版素材与已导出的 ZIP 保持原样。`render:legacy-audio` 是旧音轨比较工具，会将当前画面与旧音轨组合并改写默认文件；通常使用 `npm run render`。

参考代码和音频的来源说明保留于 `third-party/dsh-startup-screen/`，应与项目一起保留。

### 导出与校验

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\Verify-Package.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\Export-Package.ps1
```

校验命令用于解压后的原始部署包；修改代码或重建文件后，旧清单将不再匹配。再次导出会在 `export/` 下创建新目录与 ZIP，并生成新的校验清单。

包内不包含开发缓存、调试日志、本机安装记录或绑定原电脑路径的 `.lnk` 快捷方式。便捷脚本均按自身所在目录定位资源。
