# Flick

Windows 上的磁盘垃圾体检与清理工具。先只读体检，再给你一个结论：哪些可以放心清理，哪些要你看一眼，哪些不会动。

[English](README.en.md)

## 它做什么

- **只读体检**：查常用位置、整块盘或你加的文件夹。体检和清理都在本机完成，不上传任何数据。
- **结论在先**：推荐项可以直接清理；要你判断的（安装包、旧备份、会话记录等）一张卡一个决定；受保护的数据只列出来，不会被选中。
- **先放隔离区**：你选的项先移到同一块盘上的 `.flick-quarantine`，确认没问题再永久删除，也可以还原。推荐项直接删除。
- **先记后做**：每动一个文件之前先写日志；日志写不进去就停下，已经做了的照实记录。
- **以后都跳过**：一个位置、一整组、同一模板或同一目录下的条目都能记进跳过名单，随时在“设置 → 跳过名单”里移除。
- **规则可查**：每条规则写明是什么、为什么能清、清了之后会怎样，以及依据。覆盖 AI 编程工具的缓存与日志、浏览器与内置浏览器缓存、开发工具缓存、崩溃转储、显卡着色器缓存、安装包等。
- **交给 agent**：一直在长的目录会给出一段线索，可以复制给编程 agent 去查根因。

界面目前只有中文。

## 安装

- 系统：Windows 10 或 11（x64）。需要 Microsoft Edge WebView2 运行时，Windows 11 已自带。
- 在 [Releases](https://github.com/dfan0519-tech/flick/releases) 下载：
  - `Flick-Setup-<版本>.exe`：装到当前用户，不需要管理员权限，会建开始菜单快捷方式；
  - `flick-<版本>-windows-x64.zip`：便携版，解压后运行 `flick.exe`；
  - `SHA256SUMS.txt`：上面两个文件的校验和。
- 0.1 还没有代码签名，第一次运行时 SmartScreen 可能提示“未知发布者”。
- 设置、体检记录与清理日志在 `%LOCALAPPDATA%\Flick`。卸载不会删除这个文件夹。

## 从源码构建

需要 Rust 1.95.0（仓库里的 `rust-toolchain.toml` 会自动选用）。界面是静态文件，不需要 Node 构建。

```powershell
cargo build --release --locked --manifest-path apps/water/host/Cargo.toml --bin flick
```

生成的程序在 `apps/water/host/target/release/flick.exe`。

测试与 CI（`.github/workflows/ci.yml`）一致：

```powershell
cargo test --locked --manifest-path packages/junk-rules/Cargo.toml   # 每个包各自运行
node --test apps/water/ui/tests/unit.test.mjs                         # 界面单元测试
```

打安装包需要 [NSIS](https://nsis.sourceforge.io/) 3：

```powershell
powershell -NoProfile -File packaging/windows/build.ps1 -Exe <flick.exe> -Version 0.1.0 -OutDir <新目录>
```

## 目录

| 位置 | 内容 |
|---|---|
| `apps/water/host` | 桌面程序（Tauri 2） |
| `apps/water/ui` | 界面 |
| `packages/water-service` | 体检结论、清理计划、隔离区与记录 |
| `packages/junk-rules` | 规则，数据在 `rules/windows.json` |
| `packages/junk-scan`、`packages/junk-clean` | 扫描与执行（先记日志再动文件） |
| `packages/process-scan`、`packages/installed-apps` | 判断文件是否正被程序使用、属于哪个已安装的程序 |
| `packages/cleanup-manifest` | 项目自己声明的可清目录（`.flick-cleanup.json`） |
| `packages/dup-finder` | 查重 |
| `packages/native-picker`、`packages/native-root`、`packages/scope-registry` | 选择文件夹与体检范围 |
| `contracts` | 界面与服务之间的接口说明和测试样例 |
| `packaging/windows` | 安装包脚本 |

代码里的包名还叫 `water`（项目原名），产品名是 Flick。

## 参与

欢迎提问题、提规则、提代码，见 [CONTRIBUTING.md](CONTRIBUTING.md)。最需要的是新规则：你的电脑上哪个目录一直在长、是哪个程序留下的、能不能放心删。

## 安全

如果 Flick 删除或移动了不该动的东西，请按 [SECURITY.md](SECURITY.md) 私下报告。

## 许可证

MIT 或 Apache-2.0，任选其一，见 [LICENSE-MIT](LICENSE-MIT) 与 [LICENSE-APACHE](LICENSE-APACHE)。
