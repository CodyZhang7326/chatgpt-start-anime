# ChatGPT / 个人研究终端

一套参考《明日方舟》莱茵生命终端气质制作的本地交互作品：24 秒动画加交互等待、沿轮廓逐笔描绘的 ChatGPT 标识，以及以你提供的女性形象为基础制作的动态近景。背景使用炭黑 #212121，界面统一为黑、白与紫色。

**当前版本：莱茵生命授权序列与现有 ChatGPT 角色动画融合，使用参考项目原提示音及前五段语音，结尾恢复最初版启动动画的电子提示音，不含 Welcome 人声。桌面 `ChatGPT` 与开始菜单 `ChatGPT（动画启动）` 使用全屏覆盖、无底栏和平滑过渡。**

启动器现覆盖主显示器整个屏幕（包括任务栏区域），视频等比例铺满，消除旧版两侧露出的深色边条。屏幕比例不同时居中裁剪边缘；网页预览也采用铺满视口的显示方式。

默认成片 `output/chatgpt-boot.mp4` 对应 `output/chatgpt-boot-rhine.mp4`。之前的女声版和无人声版仍保留。通过 `startup/Update-Startup.ps1 -AudioVariant rhine`、`voice` 或 `instrumental` 切换，脚本先备份当前版本。完整源码与音频来源见 `third-party/dsh-startup-screen/README.md`。

本机的图形客户端显示为 ChatGPT，内部 Windows 应用标识为 `OpenAI.Codex_2p2nqsd0c76g0!App`；两者对应同一份安装。本次通过独立启动器接入，原始系统应用入口仍直接打开客户端。正式启动器保存在 `C:\Users\Administrator\Documents\ChatGPT\启动器`，恢复入口位于开始菜单「ChatGPT 启动工具」。

## 打开

通过本地服务器打开 `index.html` 观看启动动画；在许可页点击“申请访问许可”或按 Enter 继续，结尾自动进入主终端；按 Esc 可提前进入。也可以直接打开 `terminal.html`。新版启动页没有播放工具栏、音效开关、进度条或跳过按钮。

页面与资源均保存在本地，没有第三方运行依赖。如果需要一致的本机任务存储及视频拖动体验，在项目目录运行 `node server.cjs`，然后打开 `http://127.0.0.1:4173/`。

## 页面

| 文件 | 内容 |
| --- | --- |
| `index.html` | 24 秒交互式启动动画，结尾渐隐后自动进入主终端 |
| `terminal.html` | 主终端，动态角色、档案入口与可切换的终端留言 |
| `operator.html` | 干员档案，基础信息、协作方式、形象设定与动态开关 |
| `archives.html` | 六份记忆档案，支持分类、搜索、查看影像与下载素材 |
| `workspace.html` | 本机任务板，支持添加、调整状态、删除、撤销及清理完成项 |

工作台任务保存在当前浏览器的本机存储中，不自动提交给 ChatGPT，不跨浏览器同步。终端留言是预设文案。启动中的身份认证属于视觉叙事，不连接真实认证服务。

## 启动时间轴

| 时间 | 阶段 |
| --- | --- |
| 0–3.6 秒 | 黑幕标识、细光扫描与淡紫曝光过渡 |
| 3.6–6.2 秒 | 权限清单与动态完整立绘；5.95 秒停留等待“申请访问许可”，人物继续活动，点击或 Enter 后继续 |
| 6.2–8.7 秒 | 动态半身头像身份卡、条码、签名扫描和档案确认 |
| 8.7–11.1 秒 | 传输路径、数据柱图与逐段勾勒的标识环线 |
| 11.1–13.6 秒 | 模块加载卡、中央读取百分比、内存阵列与数据流 |
| 13.6–16.5 秒 | 逐项核验、加粗的描线圆弧与闭合六边形雷达图；整页先退场再进入人物近景 |
| 16.5–19.8 秒 | 银白角色的细线、材质、睁眼与身份资料 |
| 19.8–24 秒 | 最初版电子提示音及其自然余音，最后 1.4 秒画面渐隐 |

画面速度恢复为原版。24 秒是不含交互等待的线性片长；网页和原生播放器会在许可页等待用户，等待期间不播放语音，也不触发播放超时。MP4 仅作为线性成片，交互由网页或原生播放器提供。

访问页的全身立绘与身份页的半身头像具有眨眼、呼吸和轻微摆动。眼部采用局部合成，避免眨眼时衣饰跳变；访问页等待期间持续播放 4.8 秒循环动作，界面和按钮保持稳定。原生播放器使用单独的无声等待片段，点击后进入身份页。

开场标志切到访问许可页时不播放扫声或短提示音；“需要访问许可”的语音播报与后续声音保留。

浏览器试听地址可加 `?review=1&audio=rhine`；`audio=voice` 和 `audio=instrumental` 可对比旧音轨。试听模式可用空格暂停、R 重播、M 静音，没有对应的屏幕按钮；浏览器若限制自动音频播放，点击画面任意位置即可启用。正式 Windows 启动器不受浏览器自动播放限制。页面遵循系统「减少动态效果」设置。

角色在主终端和档案页采用同一套近景、紫色环境暗光与边缘渐隐，具有轻微呼吸、眨眼与指针视差。点击主终端角色会切换留言。完整立绘仍保留在记忆档案中。

Q版陪伴形象依据新提供的龙女设定图制作，保留银白长发、淡紫眼睛、龙角、银色结饰、翼尾与白紫裙装。启动序列在连接路径、权限读取和最终核验页分别加入小尺寸待机、工作、招手姿态，三个页面使用不同姿态；人物和文字、数据图分开排布，并随页面淡入淡出、轻微呼吸和摆动。网页遵循系统「减少动态效果」设置。工作台顶部显示使用电脑的Q版形象；记忆档案的协作准则、行动记录卡片以及搜索空状态使用对应的Q版素材，遵循档案页的动态开关。

三张透明 PNG 位于 `assets/chatgpt-chibi-idle.png`、`assets/chatgpt-chibi-work.png` 与 `assets/chatgpt-chibi-wave.png`，由内置 ImageGen 制作；参考图保存在 `assets/chatgpt-chibi-reference.jpg`，完整提示词保存在 `assets/chibi-prompts.json`。加载页预览见 `output/chatgpt-chibi-pages-review.png`，招手核验页预览见 `output/chatgpt-chibi-wave-review.png`。本次更新前的源码和成片保存在 `output/versions/before-chibi-*` 中。

眨眼以 60 FPS 采样，单次闭合、停留、睁开共约 0.567 秒。页面每 6.4 秒的眨眼间隔不变，新启动片中的眨眼在 21.72 秒开始。五个眼睑关键状态之间连续插值，仅合成眼部区域；首次睁眼在约 19.1–19.6 秒完成，随后接入最初版电子收尾音。

## 成片与素材

- `output/chatgpt-boot.mp4`、`output/chatgpt-boot-rhine.mp4`：24 秒、1920 × 1080、60 fps、H.264 + AAC，莱茵融合版。
- `output/chatgpt-permission-idle.mp4`：4.8 秒、60 fps 的无声人物等待循环，随交互配置一起安装。
- `assets/rhine-sequence.js`：莱茵授权、核验、角色唤醒与欢迎画面的 Canvas 时间轴。
- `assets/chatgpt-startup-rhine.wav`、`assets/rhine-audio/`：48 kHz 立体声混音及参考项目原始声音片段。
- `assets/chatgpt-original-ending.wav`：从最初版动画直接提取的电子收尾提示音，保留原速度、音高和余音，21.25 秒接入。
- `tools/compose-rhine-audio.cjs`、`tools/prepare-original-ending.py`、`tools/render-rhine.cjs`：新音轨制作、最初版电子提示音提取及逐帧 60 FPS 视频导出。
- `output/chatgpt-boot-voice.mp4`、`output/chatgpt-boot-instrumental.mp4`：之前的女声版和无人声版完整成片，原文件保留。
- `assets/chatgpt-startup-voice.wav`、`assets/chatgpt-startup-instrumental.wav`、`tools/compose-audio.py`、`tools/record-voice.py`：之前的原创合成音轨及制作流程。
- `output/chatgpt-boot-poster.png`：启动结束画面。
- `assets/chatgpt-operator.png`：透明背景睁眼立绘，配饰已统一为淡紫色。
- `assets/chatgpt-operator-blink.png`：对应的闭眼帧。
- `assets/chatgpt-reference.jpg`：你提供的原始形象参考。
- `assets/chatgpt-cinematic.png`、`assets/chatgpt-cinematic-blink.png`：融入环境的近景及其闭眼帧。
- `assets/chatgpt-cinematic-blink-25.png`、`assets/chatgpt-cinematic-blink-50.png`、`assets/chatgpt-cinematic-blink-75.png`：内置 ImageGen 补绘的三个眼睑过渡状态，完整提示词见 `assets/blink-prompts.json`。
- `assets/eyes.js`：网页与启动动画共用的 60 FPS、30% 速度眨眼时间轴及局部合成器。
- `assets/portrait.js`：运行时细线显现、明暗融合、睁眼及轻微镜头移动，不改写原始素材。
- `assets/chatgpt-mark.svg`、`assets/mark.js`：ChatGPT 矢量标识及真实曲线路径的逐笔绘制。
- `assets/chatgpt.ico`：Windows 预览窗口使用的 ChatGPT 图标。
- `assets/image-prompts.json`：初稿、眨眼帧及最终紫色修订的完整提示词，均使用内置 ImageGen 工具制作。初稿 `codex-operator*.png` 仅作为编辑来源保留，不用于当前界面。
- `assets/cinematic-prompts.json`：本次近景与闭眼帧的完整提示词，使用内置 ImageGen 工具制作。
- `startup/preview/ChatGPT-Startup-Preview.exe`：独立 Windows 试听窗口，默认仅预览，许可页等待点击，播放结束自动淡出。显式传入 `--app-id` 时可以体验应用衔接。详细说明见 `startup/README.md`。

代码使用 Canvas、CSS、原生 JavaScript 与 Web Audio。`window.ChatGPTBoot` 提供 `duration`、`ready`、`seek(ms)`、`pause()`、`play()`、`replay()`、`render(ms)`、`state` 与 `record()`，用于预览和视频录制。

## 参考

本次直接参考用户指定的[《莱茵生命DeepSeekHarness启动动画》](https://www.bilibili.com/video/BV1erpE6qEPU/)，改编 [6shenhonghong9/dsh-startup-screen](https://github.com/6shenhonghong9/dsh-startup-screen) 的授权序列、逐字动画、准星与 Web Audio 提示，并沿用仓库内的原语音和提示音。源码 MIT 许可、音频来源与改编范围见 `third-party/dsh-startup-screen/`。下方为早期版本参考记录。

视觉方向参考[《明日方舟》特别映像《莱茵生命：访问》](https://www.bilibili.com/video/BV1rr4y1b7sz/)。未使用原片图像或声音。ChatGPT 标识轮廓取自 [OpenAI 网站](https://openai.com/brand/)，按你的要求添加本地动效。角色基础设计来自你提供的参考图片，形象编辑保留银白长发、淡紫眼睛、龙角、翼尾与白紫长裙。

启动交互参考 [NativeDog1/dsh-boot-animation](https://github.com/NativeDog1/dsh-boot-animation) 的可跳过播放流程，以及 [Isilsolme/dsh-splash-launcher](https://github.com/Isilsolme/dsh-splash-launcher) 的独立启动窗口思路。本项目没有复制或运行这两个仓库的代码，也未使用它们的视频素材；动画与 Windows 播放器均为本地实现。

本次人物融合方式参考你当前使用的 Wallpaper Engine 壁纸「deepseek专业工作模式【4K/60FPS】」（本机项目 3816462474）：参考其人物细线显现、面部近景与睁眼的呈现方式。保留你提供的白发、龙角、银色结饰和淡紫眼睛，重新制作 ChatGPT 专用近景；成片没有使用原壁纸的画面或声音。
