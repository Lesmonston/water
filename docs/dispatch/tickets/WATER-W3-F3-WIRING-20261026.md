# WATER-W3-F3：接线与整机体检（`water-desktop` 第 2 版）

2026-10-26，正式票，总控（Claude）。以 [第三波 manifest](../wave3/manifest.json) 中本票 `status` 为准；READY 不代表已外贴。**可以在新对话里执行；建议交给熟悉 Tauri 与 Rust 的模型。**

| 项 | 精确值 |
|---|---|
| 权威票 | F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W3-F3-WIRING-20261026.md |
| 唯一工作树 / 分支 | F:/new/smaltalk/water/.worktrees/w3-f3 / worker/water-w3-f3 |
| 精确首次 HEAD | d56ebc66becc02e855ffda0edbf36a2e82470c2d（标签 water-w3-f3-base-20261026），必须干净；`apps/water/host` 是已验收的 F2 宿主 |
| SPEC | F:/new/smaltalk/water/contracts/desktop-v1/WIRING.md |
| 依据 | HOST：F:/new/smaltalk/water/contracts/desktop-v1/HOST.md 与 F2 补单 01；SERVICE：F:/new/smaltalk/water/contracts/desktop-v1/SERVICE.md；IPC：F:/new/smaltalk/water/contracts/checkup-v1/IPC.md |
| 规则 | F:/new/smaltalk/water/docs/dispatch/W3-DESKTOP-WORKER-RULES.md（特别是第 6 节“F3 补充”） |
| 检查入口 | F:/new/smaltalk/water/scripts/desktop-wave-check.mjs |
| 回执 | F:/new/smaltalk/water/.worktrees/w3-f3/docs/dispatch/reports/WATER-W3-F3-REPORT.md |
| 证据目录 | F:/new/smaltalk/water/.worktrees/w3-f3/docs/acceptance/wave3/f3/ |
| 门 | 轻门：3 条负控 + 1 次整机窗口检查 |

先读规则、[第三波计划](../wave3/PLAN.md) 的 F3 一节、WIRING、HOST、F2 补单 01，再读已验收的宿主代码 `apps/water/host/src/` 与 `tests/host_v1.rs`，以及服务核心的公开接口 `packages/water-service/src/lib.rs`。服务的测试 `packages/water-service/tests/service_v1.rs` 里有现成的测试平台写法可以参考。

## 本票要点

- **接线**：宿主用 `ServiceBackend` 包住 `water_service::Service` 作为 `Backend`，用 `HostPicker` 包住已有的 `pick_folder` 作为服务的 `FolderPicker`。`CLEAN_ENABLED` 固定为 false，M1 只做体检。
- **启动顺序重写**：Tauri 在 `setup` 里出错会直接 panic，所以**不再使用 `setup`**，检查器会拒绝源码里的 `.setup(`。按 WIRING 第 2 节的 9 步，在 `Builder::build` 之后依次准备数据目录、取单实例锁、构造服务、建窗口，最后 `run`。每一步失败都返回 `StartupError`，`main` 打印固定中文并以 1 退出。
- **单实例**：在数据目录用标准库的 `share_mode(0)` 独占打开 `water.lock`，第二个实例打印“Water 已经在运行。”后退出。
- **依赖**：在已验收的 7 项之外，恰好加 `water-service`、`water-junk-rules`、`water-process-scan` 三个路径依赖。后两个只为在测试里写出 `Platform` 接口的类型。registry 包仍须全部出自 AC 锁。
- 窗口的各项设置、配置文件、权限、导航与拒绝规则、数据目录规则都与已验收的 F2 完全相同，只是挪到了 `run` 里。
- **不改** `packages/`、`apps/water/ui/`、契约、检查器、台账。

## 白名单

- `apps/water/host/` 下 HOST 第 2 节列出的文件（`tauri.conf.json`、`capabilities/main.json`、`icons/icon.ico` 不改）
- `docs/dispatch/reports/WATER-W3-F3-REPORT.md`
- `docs/acceptance/wave3/f3/` 下 `--mode archive` 生成的证据（含整机检查的截图）

## 唯一测试

`apps/water/host/tests/host_v1.rs` 精确五个：`host_config_boundary`、`host_navigation_boundary`、`host_command_registry`、`host_data_directory`、`host_service_wiring`，内容按 WIRING 第 5 节。

- 新增的服务接线测试在 `.local/w3-f3-fixtures/` 的随机目录里用测试自己的平台，不读真实位置。
- 测试中不打开任何窗口或选择框。`HostPicker` 只用相对路径作初始目录。

## 命令顺序（在工作树根目录执行）

```powershell
node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W3-F3 --mode baseline
```

1. 改好 `Cargo.toml` 后跑一次 `--mode lock`。
2. 反复使用 `--mode check` 与 `--mode test`。第一次编译 Tauri 与服务用单线程，可能要 10～20 分钟，不要中途重跑。
3. 三条负控，每条只改 `src/` 下真正被调用的一行，失败信息必须含目标标记，然后立即 `git checkout` 恢复原字节，再跑一次 `--mode test`：

| 负控 | 让什么失效 | 标记 |
|---|---|---|
| nc1 | 清理开关为真 | `HOST_CLEAN_DISABLED` |
| nc2 | 锁文件不再独占 | `HOST_SINGLE_INSTANCE` |
| nc3 | 从 `generate_handler!` 里去掉一个命令 | `HOST_COMMANDS` |

提交干净实现后依次运行：

```powershell
node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W3-F3 --mode check --final
node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W3-F3 --mode test --final
node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W3-F3 --mode native --final
node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W3-F3 --mode archive
```

`native --final` 会打开 **一次** 真正的 Water 窗口，由检查器的整机观察器驱动界面，过程见 WIRING 第 6 节：
- 在首页开始体检，**做一次真实的整机只读扫描**，约 1～3 分钟；
- 在结果页点“清理所选”，确认只得到“这一版只做体检…”；
- 再依次打开增长趋势、清理记录、扫描位置，共截 6 张图；
- 关窗后检查器核对数据目录里只有这一次体检，没有任何清理计划或清理记录。

整个过程可能要几分钟，不要中途打断，也不要操作这个窗口。失败不要重跑，写受阻回执。

## 预算与边界

- 原生窗口：整票 1 次，只在 `native --final`。
- 选择框 0、浏览器 0。
- 真实数据：只有 `native --final` 里经界面完成的那一次只读扫描，清理保持关闭。
- 不联网、不下载、不改网络与全局配置。
- 不 push、不 merge、不 rebase，不改主线台账。

## 交回

回执第一行与通知完全一致：

```text
WATER-W3-F3 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w3-f3/docs/dispatch/reports/WATER-W3-F3-REPORT.md
```

回执要写：
- 实际模型；
- 实现提交 SHA；
- 逐条对照 WIRING 第 1～6 节；
- 每个检查命令与结果；
- 三条负控：改了哪一行、失败信息、恢复后的哈希；
- 整机检查的结果：每一步是否通过、体检用了多久、数据目录核对结果；逐张截图写看到了什么；
- 没做或没验证的事。

受阻则同一路径写“WATER-W3-F3 任务受阻”，写清具体冲突与最小补充需求，不要自行变通。完成只进入 SUBMITTED，由总控复核后才算 VERIFIED。
