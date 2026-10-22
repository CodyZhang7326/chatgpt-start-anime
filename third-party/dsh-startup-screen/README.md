# 莱茵生命启动序列来源

- 用户指定视频：[莱茵生命DeepSeekHarness启动动画](https://www.bilibili.com/video/BV1erpE6qEPU/)。
- 上游：[6shenhonghong9/dsh-startup-screen](https://github.com/6shenhonghong9/dsh-startup-screen)。
- 固定提交：`8ec3132e69f0906b3ed2f7eb083b1035cd69c1d4`。
- 上游代码版权：Copyright (c) 2026 沈宏宏，MIT；完整许可保留于本目录 `LICENSE`。

`assets/rhine-sequence.js` 改编了上游 `lib/splash.js` 的黑幕标识、曝光过渡、档案水印、五步授权文案、固定字宽逐字显现、双圆弧准星与结尾色散。画面重新使用本项目的 ChatGPT 矢量路径、深灰淡紫配色和银白角色；角色素材与 Windows 播放器仍来自本项目。

`tools/compose-rhine-audio.cjs` 改编了上游 Web Audio 的提示频率与包络。`assets/rhine-audio/` 中的 `line-1.mp3` 至 `line-6.mp3`、`sfx-tick.mp3`、`sfx-ticks-run.mp3` 为上游原文件，逐字节保留。前五段语音及两种提示音用于新成片；第六段原始 “Welcome” 保留为来源记录，当前成片不使用它。

上游说明将第三方音频与 MIT 源码分开：这些音频不因源码的 MIT 许可证而获得相同许可。本目录记录其来源，未将其标为本项目原创或免版权素材。

结尾已根据用户最终选择恢复为本项目最初版启动动画的电子提示音，从最初的 `codex-boot.mp4` 原样提取，取代此前的 Welcome 人声及其伴奏提示。来源与提取参数见 `assets/original-ending-production.json`；该收尾音不是来自本目录所述的参考仓库。

`source.json` 记录原文件 SHA-256、仓库提交和与用户指定视频的语音互相关结果，供复核使用。
