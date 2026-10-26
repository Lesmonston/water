# 第三波派前回执（2026-10-26）

总控（Claude）。第三波 F1、F2 两票 READY，可以同时外贴，也可以在新对话里执行。计划见 [PLAN](PLAN.md)，登记见 [manifest](manifest.json)。

## 基点与冻结

- 基点 `197dfdaecc94dc8b84e94aa8d91ee5cb1c0d965e`，标签 `water-w3-desktop-base-20261026`，内容是两份契约、执行者规则、计划、检查入口与原生窗口观察器。
- manifest 冻结 9 个文件：MODEL、IPC、回放数据、SERVICE、HOST、镜像契约、AC 已验收锁、第三波执行者规则、ADR-018。

## 派前实测

| 项 | 结果 |
|---|---|
| F1 baseline（`.worktrees/w3-f1`） | 通过；离线缓存齐全 |
| F2 baseline（`.worktrees/w3-f2`） | 通过；AC 缓存含 Windows 构建所需的 238 个包，关键包齐全 |
| 检查入口自测：service 路径（`.worktrees/w3-selftest-f1`，桩 crate） | lock、check、test、red-nc1、精确恢复、三个 final（含 real）、archive 全部走通 |
| 检查入口自测：service 拦截路径 | 生产代码读环境变量、多出依赖、改动已验收 crate、`remove_dir_all`、真实输出含路径，五种都被拒 |
| 检查入口自测：host 路径（`.worktrees/w3-selftest-f2`，桩宿主） | lock、check、test、red-nc1、精确恢复、三个 final（含原生窗口）、archive 全部走通，见下节 |

## host 路径自测要点

- **离线构建**：
  - lock 先复制 AC 已验收锁，Cargo 只补了 4 个路径包。395 个 registry 包与 AC 锁的名字、版本、校验和逐个一致。
  - Tauri 首次单线程编译约 6 分钟，全程离线、没有下载。
- **自测中修了检查入口的三处**，都已写进 `scripts/desktop-wave-check.mjs` 与观察器：
  1. AC 锁里有其它平台的包，Windows 构建从不下载它们。baseline 改为只要求关键包，完整性由离线构建证明；`cargo metadata` 加 `--filter-platform x86_64-pc-windows-msvc`。
  2. `cargo clippy` 是外部子命令，镜像参数必须放在 `clippy` 之后，否则内部的 `cargo check` 拿不到。第一波 AC 的 `scripts/ac-clippy-arguments.mjs` 用的是同一个办法。
  3. Tauri 在 Windows 上总会多一个隐藏的 `Tao Thread Event Target` 窗口。观察器第一次因此报“顶层窗口数不对”，检查器随即结束了自有进程，没有残留进程。现在观察器把这一个事件窗口单独记数，仍要求真正的主窗口恰好一个。第一次的窗口预约已改名留档。
- **原生窗口**（第二次）：
  - 标题 `Water`，页面文字命中，系统背景类型 2（Mica）。
  - 截到本窗口一张图，私有 WebView 目录确认。
  - 正常关闭、退出码 0，6 个 WebView 子进程全部结束，全程 3.5 秒。
  - 截图显示已验收的白色磨砂界面在真实窗口里完整渲染，占位后端下显示“无法连接 Water 服务”。窗口左上角图标还是 AC 的灰色占位，F2 需换成 Water 自己的图标。
- 证据：[preflight-20261026](../../acceptance/wave3/controller/preflight-20261026/)（两张票的 baseline、两棵自测树的全部回执与截图）。

## 外贴句（每张票一句，分别发给不同执行者）

后端票：

```text
你接手 Water 项目 WATER-W3-F1（服务核心）。先读 F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W3-F1-WATER-SERVICE-20261026.md，按其中列出的顺序读规则与契约，在 F:/new/smaltalk/water/.worktrees/w3-f1（分支 worker/water-w3-f1）从 197dfda 开工。
```

桌面宿主票（Tauri 与 Windows 窗口，建议选熟悉 Rust 桌面开发的模型）：

```text
你接手 Water 项目 WATER-W3-F2（桌面宿主）。先读 F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W3-F2-DESKTOP-HOST-20261026.md，按其中列出的顺序读规则与契约，在 F:/new/smaltalk/water/.worktrees/w3-f2（分支 worker/water-w3-f2）从 197dfda 开工。
```
