# Water Desktop Preview

WATER-W1-AC：独立 Windows 静态桌面基础，尚未接入扫描或 AA/AB。
只有本地嵌入 HTML/CSS，无脚本、插件、IPC、目录选择、扫描或报告下载。

当前状态：依赖初始化因 crates.io 网络/TLS 失败及 600 秒超时而受阻。
本目录只保存未构建、未通过产品测试的初始骨架，尚无 Cargo.lock 或许可证清单。
公开配置/导航函数仍为默认拒绝的骨架，启动会失败关闭；不能当作已实现的桌面产品。
详见 docs/dispatch/reports/WATER-W1-AC-REPORT.md（从工作树根定位）。

本 workspace 固定 Rust 1.95.0、Tauri 2.12.5、tauri-build 2.7.4、serde 1.0.229、serde_json 1.0.151。
依赖初始化只使用冻结 helper 的 dependencies 模式和本工作树私有 Cargo home/target/tmp；随后离线。
许可证及精确传递依赖尚不可用；失败详情见本票验收目录中的 dependencies-result 归档。

从本票工作树根运行冻结 scripts/delivery-wave-check.mjs 的 AC 模式，按正式票顺序执行。
baseline 仅验证既有 MSVC/WebView2；不能视为产品测试。
native 是整票唯一的一次桌面窗口，必须在干净受测提交上由冻结 helper 启动及关闭，禁止手动试开或重试。

骨架在 setup 前调用配置校验入口，在导航回调中调用公开导航策略；新窗口总是拒绝。
WebView 数据使用本工作树 .local/desktop-webview/ 中独占新目录，保留而不清理。
Windows 构建资源为本项目生成的 16×16 纯色 ICO（1150 字节），无第三方图案。
默认系统装饰，窗口 1000×760。配置和资源检查不证明完整桌面扫描闭环或 macOS 支持。

框架 API 来源：[Tauri 配置](https://v2.tauri.app/reference/config/)、
[Tauri 2.12.5](https://docs.rs/tauri/2.12.5/tauri/)。仅使用框架依赖，未复制第三方应用代码。
