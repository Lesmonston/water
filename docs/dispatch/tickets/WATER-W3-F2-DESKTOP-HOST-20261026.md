# WATER-W3-F2：桌面宿主（`water-desktop`）

2026-10-26，正式票，总控（Claude）。以 [第三波 manifest](../wave3/manifest.json) 中本票 `status` 为准；READY 不代表已外贴。**可以在新对话里执行；建议交给熟悉 Tauri 与 Windows 窗口的模型。**

| 项 | 精确值 |
|---|---|
| 权威票 | F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W3-F2-DESKTOP-HOST-20261026.md |
| 唯一工作树 / 分支 | F:/new/smaltalk/water/.worktrees/w3-f2 / worker/water-w3-f2 |
| 精确首次 HEAD | 197dfdaecc94dc8b84e94aa8d91ee5cb1c0d965e（标签 water-w3-desktop-base-20261026），必须干净、`apps/water/host` 不存在 |
| SPEC | F:/new/smaltalk/water/contracts/desktop-v1/HOST.md |
| 依据 | IPC：F:/new/smaltalk/water/contracts/checkup-v1/IPC.md |
| 参照（只读） | 第一波已验收的静态桌面壳 `apps/desktop-preview`（`src/main.rs`、`src/v1.rs`、`Cargo.lock`）；已验收界面 `apps/water/ui`；文件夹选择框 `packages/native-picker` |
| 规则 | F:/new/smaltalk/water/docs/dispatch/W3-DESKTOP-WORKER-RULES.md |
| 检查入口 | F:/new/smaltalk/water/scripts/desktop-wave-check.mjs |
| 回执 | F:/new/smaltalk/water/.worktrees/w3-f2/docs/dispatch/reports/WATER-W3-F2-REPORT.md |
| 证据目录 | F:/new/smaltalk/water/.worktrees/w3-f2/docs/acceptance/wave3/f2/ |
| 门 | 轻门：2 条负控 + 1 次原生窗口检查 |

先读规则、[第三波计划](../wave3/PLAN.md)、SPEC、IPC，再读 `apps/desktop-preview` 的 `src/main.rs` 与 `src/v1.rs`。它们是已验收的写法，本票在此基础上开启 JavaScript 与 IPC。

## 本票要点

- 新建独立 crate `apps/water/host`，包名 `water-desktop`，可执行文件 `water`。前端直接用 `../ui`（已验收的界面，**只读**）。
- **依赖必须全部来自第一波 AC 已验收的锁。**
  - 第一次跑 `--mode lock` 时，检查器先把 `apps/desktop-preview/Cargo.lock` 复制成你的锁，再让 Cargo 只补上本 crate 与选择框的路径包。
  - 之后每个 registry 包都会与 AC 锁逐个核对名字、版本、校验和。
  - 不要手工改锁，不要升级任何包，不要联网。
- 配置与权限必须与 SPEC 第 3 节逐字一致，检查器会直接比对 `tauri.conf.json` 与 `capabilities/main.json`。
- 窗口：
  - 1240×820、最小 1040×720、透明加 Mica、保留系统标题栏。
  - JavaScript 开启，开发者工具关闭。
  - 导航、新窗口、下载、权限请求的拒绝规则沿用 AC。
- 17 个 IPC 命令逐个转给 `Backend::call`，参数重组成 IPC 的 camelCase 对象。本票的 `main.rs` 用 `UnavailableBackend`；接上真正的服务核心是下一票 F3 的事。
- 数据目录：`WATER_DATA_DIR` 优先，否则用 `%LOCALAPPDATA%\Water`。WebView 数据放在其中的 `webview` 子目录。
- `pick_folder` 只做好接线点与错误映射，**测试里不得打开选择框**。

## 白名单

- `apps/water/host/` 下 SPEC 第 2 节列出的文件
- `docs/dispatch/reports/WATER-W3-F2-REPORT.md`
- `docs/acceptance/wave3/f2/` 下 `--mode archive` 生成的证据（含原生窗口截图）

其余一律只读，包括 `apps/water/ui/`、`apps/desktop-preview/`、`packages/`、契约、检查入口与台账。

## 唯一测试

`apps/water/host/tests/host_v1.rs` 精确四个：`host_config_boundary`、`host_navigation_boundary`、`host_command_registry`、`host_data_directory`，内容按 SPEC 第 5 节。测试中不打开任何窗口。

## 命令顺序（在工作树根目录执行）

```powershell
node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W3-F2 --mode baseline
```

写好 `Cargo.toml` 后跑一次 `--mode lock`。之后反复使用 `--mode check` 与 `--mode test`。

- 第一次编译 Tauri 用单线程，可能要 10～20 分钟，不要中途重跑。
- 构建会在 `apps/water/host/gen/` 生成文件，`.gitignore` 只写 `gen/`。

两条负控，每条只改 `src/` 下真正被调用的一行，失败信息必须含目标标记，然后立即 `git checkout` 恢复原字节，再跑一次 `--mode test`：

| 负控 | 让什么失效 | 标记 |
|---|---|---|
| nc1 | 配置校验放过多出的权限 | `HOST_CONFIG` |
| nc2 | 导航校验放行外部地址 | `HOST_NAVIGATION` |

提交干净实现后依次运行：

```powershell
node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W3-F2 --mode check --final
node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W3-F2 --mode test --final
node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W3-F2 --mode native --final
node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W3-F2 --mode archive
```

`native --final` 会打开 **一次** 真正的窗口，整票只有这一次。检查器会核对以下几项，并截一张本窗口的图：
- 窗口标题；
- 页面文字“磁盘体检”与“无法连接”；
- Mica 背景；
- 正常退出；
- WebView 子进程全部结束；
- WebView 数据目录落在指定位置。

失败不要重跑，写受阻回执。

## 预算与边界

- 原生窗口：整票 1 次，只在 `native --final`。
- 选择框 0、浏览器 0。
- 不联网、不下载、不改网络与全局配置。
- 不 push、不 merge、不 rebase，不改主线台账。

## 交回

回执第一行与通知完全一致：

```text
WATER-W3-F2 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w3-f2/docs/dispatch/reports/WATER-W3-F2-REPORT.md
```

回执要写：
- 实际模型；
- 实现提交 SHA；
- 逐条对照 SPEC 第 1～6 节；
- 每个检查命令与结果；
- 两条负控（改了哪一行、失败信息、恢复后的哈希）；
- 原生窗口检查的结果，以及你看截图看到了什么；
- 没做或没验证的事。

受阻则同一路径写“WATER-W3-F2 任务受阻”，写清具体冲突与最小补充需求。完成只进入 SUBMITTED，由总控复核后才算 VERIFIED。
