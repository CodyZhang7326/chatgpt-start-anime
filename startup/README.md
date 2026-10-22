# Windows 启动动画：莱茵融合版

当前默认是 24 秒、1920 × 1080、60 FPS 的莱茵融合版。桌面「ChatGPT」与开始菜单「ChatGPT（动画启动）」使用它；已有的原生任务栏入口仍直接打开客户端。

页面速度恢复为原版。五页分别使用权限清单与完整角色立绘、半身头像身份卡与签名扫描、传输路径与数据柱图、模块加载与读取进度、核验结果与闭合六边形雷达图；环线逐段描出并加粗外圈。核验页完全退场后才开始最后的人像勾勒，避免两页叠在一起。

前半段采用参考项目的授权、身份确认、读取权限与环形核验，后半段衔接原有银白角色的细线、材质和睁眼。声音沿用指定项目的前五段语音和提示音；结尾恢复最初版启动动画的电子提示音，在 21.25 秒接入，并保留原有余音。结尾没有 Welcome 人声。最后 1.4 秒画面渐隐。

许可页的“申请访问许可”是实际按钮，支持鼠标点击、Enter 与聚焦后的空格。5.95 秒暂停等待，确认后进入 6.2 秒的身份页。等待时间不计入播放超时；Esc 仍可提前进入客户端。网页具有相同的点击等待行为。

访问页的全身立绘和身份页的半身头像都会眨眼、呼吸和轻微摆动。访问页等待点击时，原生播放器循环播放单独的 4.8 秒无声人物片段；网页持续绘制相同动作。等待不会重复播放语音。

第一次从开场标志换到访问许可页时，已去掉扫声和短提示音，保留访问许可语音。

## 试听和切换

- `output/chatgpt-boot-rhine.mp4`：当前莱茵融合版，与默认 `chatgpt-boot.mp4` 一致。
- `output/chatgpt-boot-instrumental.mp4`：此前的无人声版，保留原画面与原音轨。
- `output/chatgpt-boot-voice.mp4`：此前的中文女声版，保留原画面与原音轨。

在项目目录执行：

```powershell
.\startup\Update-Startup.ps1 -AudioVariant rhine
```

也可将 `rhine` 换成 `voice` 或 `instrumental`。脚本先备份正式播放器、默认视频和安装记录，再同步更新；备份位于安装目录 `versions`。现有快捷方式保持不变。

`Build-Preview.ps1 -AudioVariant rhine` 构建独立试听版。默认参数 `approved` 使用当前 `output/chatgpt-boot.mp4`。试听程序默认不会启动应用；`--inspect` 仅让调试窗口出现在任务栏，正常播放没有额外任务栏入口。

## 全屏与应用交接

窗口覆盖主显示器整个屏幕，包括任务栏，视频按比例居中铺满。屏幕比例不同会裁剪超出屏幕的边缘。网页同样使用 cover 布局，没有底栏、播放控件或底色边条；Esc 可提前结束。

按实际视频时长，在结束前约 2.9 秒预激活目标客户端（当前约第 21.1 秒，不计许可页等待），视频结束后深灰覆盖层再淡出 0.85 秒。线性动画为 24 秒，另加用户在许可页的等待时间，另有约 1.1 秒交接过程。目标应用激活成功不等于内部加载完毕；播放器保留超时退场机制。

正式目录：`C:\Users\Administrator\Documents\ChatGPT\启动器`。

本机目标应用标识是 `OpenAI.Codex_2p2nqsd0c76g0!App`。开始菜单「ChatGPT 启动工具」保留直接打开与恢复默认启动入口。

## 音频与来源

指定视频：[莱茵生命DeepSeekHarness启动动画](https://www.bilibili.com/video/BV1erpE6qEPU/)。源码：[6shenhonghong9/dsh-startup-screen](https://github.com/6shenhonghong9/dsh-startup-screen)。改编范围、原始音频哈希和 MIT 许可见 `third-party/dsh-startup-screen/`。

结尾从最初成片 `codex-boot.mp4` 的 21.25–24 秒直接提取，与最早录制版本的对应提示音核对一致。当前使用 `assets/chatgpt-original-ending.wav`，不变速、不变调；来源、哈希与参数见 `assets/original-ending-production.json`。最终混音参数见 `assets/rhine-audio-production.json`。

视频对应的 `.interaction.json` 保存许可页时间点、主视频 SHA-256 与等待片段 SHA-256。构建、安装和更新脚本同步此文件及 `chatgpt-permission-idle.mp4`；旧版本没有对应配置时继续线性播放。

已检查新成片完整解码、1440 帧输出、48 kHz 立体声、音量无削波、网页等待点击、Enter、重播重新等待、结尾进入及 Esc 进入终端。原生预览完整播放结束；正式安装的 Esc 进入客户端与全屏覆盖日志均已核验。
