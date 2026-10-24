# Water Desktop Preview

WATER-W1-AC：独立 Windows 静态桌面基础，尚未接入扫描或 AA/AB。
只有本地嵌入 HTML/CSS，无脚本、插件、IPC、目录选择、扫描或报告下载。

原官方 registry 受阻历史保存在 WATER-W1-AC-REPORT.md，补充单02在原对话续做。
总控已通过用户授权的中科大镜像准备 Windows 依赖及 Cargo.lock；产品检查全程 offline/locked。
实际实现、先红/负控和同 SHA final 结果，以工作树根下
docs/dispatch/reports/WATER-W1-AC-ADDENDUM-02-REPORT.md 为准。

本 workspace 固定 Rust 1.95.0、Tauri 2.12.5、tauri-build 2.7.4、serde 1.0.229、serde_json 1.0.151。
依赖使用本工作树私有 Cargo home/target/tmp。唯一检查入口是主检出绝对路径
F:/new/smaltalk/water/scripts/ac-mirror-check.mjs；不再使用旧 dependencies 入口。
镜像仅通过每条 Cargo 命令 source replacement 参数选取既有缓存，不持久化 Cargo 或网络配置。
锁内 canonical source 仍为 crates.io；Windows 来源/许可证、checksum 和独立比较的范围见补单02归档。
没有独立官方索引对照的项按用户授权信任镜像及 Cargo checksum 机制，不称全部内容已官方逐项鉴真。

从本票工作树根运行上述绝对检查入口，按补单02顺序执行。
baseline 仅验证既有 MSVC/WebView2；不能视为产品测试。
native 是整票唯一的一次桌面窗口，必须在干净受测提交上由冻结 helper 启动及关闭，禁止手动试开或重试。

main 在 setup 前调用公开配置 validator，导航回调调用同一公开导航 validator；新窗口总是拒绝。
配置按必填 typed 字段严格反序列化，拒绝重复/未知字段、权限及 CSP 矛盾。
导航只放行精确内嵌 origin 的根或 /index.html，可带 fragment；没有凭证、端口或 query。
JavaScript、下载、拖放和 WebView 权限请求关闭，不提供 invoke handler 或插件。
WebView 数据使用本工作树 .local/desktop-webview/ 中独占新目录，保留而不清理。
父目录拒绝符号链接及 Windows reparse point；这不是面向恶意并发替换的生产竞态保证。
Windows 构建资源为本项目生成的 16×16 纯色 ICO（1150 字节），无第三方图案。
默认系统装饰，窗口 1000×760。配置和资源检查不证明完整桌面扫描闭环或 macOS 支持。

框架 API 来源：[Tauri 配置](https://v2.tauri.app/reference/config/)、
[Tauri 2.12.5](https://docs.rs/tauri/2.12.5/tauri/)。仅使用框架依赖，未复制第三方应用代码。
