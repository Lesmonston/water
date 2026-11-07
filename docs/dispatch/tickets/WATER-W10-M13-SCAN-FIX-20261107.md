# WATER-W10-M13：扫描补修，泄漏簇不认会话、备份与程序资源（中门）

2026-11-07，正式单，总控（Claude）。执行者：astra（用户 11-07 派，排在 M12 之后；后端单默认是 sol）。状态以[第十波 manifest](../wave10/manifest.json) 中本单的 `status` 为准；READY 不代表已外贴。可以新开对话执行。

## 0. 背景

M3.5 收口的真实只读体检（[收口报告](../../acceptance/wave10/controller/WATER-M35-CLOSE-20261107.md)第 2.3 节 R3）在 D 盘和一个工具目录里认出 58 个“确认泄漏”的簇。其中：
- 37 个是会话记录：Codex 按天分的 `sessions\2026\10\05\rollout-…-<uuid>.jsonl`、Claude Code 的 `…\<uuid>\subagents\agent-<hex>.jsonl`；
- 8 个是备份：`local_<uuid>.json`、`claude-code-sessions.backup-20260713-213458`；
- 7 个是程序自带的资源：`…_type_color0.png`、`description_step01.html`、`UserGameStatsSchema_271590.bin`、帮助图片 `uuid-<uuid>.png`。

会话记录本来只该由会话开关管（ADR-019 第 5 节），这里绕过了开关。

原因都在名字识别：
- `<r6>` 把 `color0`、`step01`、`271590` 这种普通名字当成随机尾巴；
- 带 UUID 的文件几乎都是程序自己的记录或资源，却也成簇；
- 没有排除对话记录与备份。

本单收紧这几处。真正的泄漏（`verify-7mzKFP` 这类目录、`apk_<hex>.apk`）照旧认。

| 项 | 精确值 |
|---|---|
| 权威单 | F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W10-M13-SCAN-FIX-20261107.md |
| 唯一工作树 / 分支 | F:/new/smaltalk/water/.worktrees/w10-m13 / worker/water-w10-m13 |
| 精确首次 HEAD | 98f9678e（tag `water-w10-m13-base-20261107`），必须干净；完整 SHA 见 manifest |
| SPEC | F:/new/smaltalk/water/contracts/m35-v1/SCAN-M35.md，加上本单第 1 节的补充（本单优先） |
| 规则 | F:/new/smaltalk/water/docs/dispatch/W10-M35-WORKER-RULES.md；没有预列、却因本单必然要变的旧断言，按 F:/new/smaltalk/water/docs/dispatch/WORKER-RULES.md 第 3 节直接迁移（不得变弱），回执逐条写原值与新值 |
| 检查入口 | F:/new/smaltalk/water/scripts/checkup-wave-check.mjs |
| 回执 | F:/new/smaltalk/water/.worktrees/w10-m13/docs/dispatch/reports/WATER-W10-M13-REPORT.md |
| 证据目录 | F:/new/smaltalk/water/.worktrees/w10-m13/docs/acceptance/wave10/m13/ |
| 门 | 中门：3 条负控 + check、test、real 三个 final |

先读：
1. 规则、SPEC 第 5 节全文（5.1 模板、5.2 在哪里找、5.3 信号）。
2. 代码：
   - `packages/junk-scan/src/templates.rs`；
   - `packages/junk-scan/src/scan/streaming.rs` 第 242～300 行（`potential_children`）；
   - `packages/junk-scan/src/scan.rs` 第 1307～1480 行（`build_clusters`）；
   - `packages/junk-scan/tests/scan_v1.rs` 里的 `m35_plan_templates`（第 2256 行起）、`m35_clusters`（第 2630 行起）、`m35_clusters_addendum`（第 2893 行起）。

下面的行号都指 `98f9678e`。

## 1. 要做的（全部在 `packages/junk-scan/`）

1. **`<r6>` 尾巴**（`templates.rs` 第 71～77 行，SPEC 5.1）改为：6 位 ASCII 字母数字，**至少一个大写字母**，并且至少一个数字或小写字母。
   - 仍是 `<r6>`：`7mzKFP`、`bjVTM3`、`Nig1h3`、`0gAvKc`、`AbC123`、`A00001`。
   - 不再是 `<r6>`：`color0`、`step01`、`271590`、`q0uodi`、`abcdef`、`ABCDEF`。

   这条也影响每个条目的 `Item.template`，照新规则算。
2. **文件簇不认 `<u>` 尾巴**：SPEC 5.2 的“文件簇只认四种尾巴”改为只认 `<h>`、`<r6>`、`<p8>` 三种。目录簇照旧五种都认。
3. **扩展名是 `jsonl`（不分大小写）的文件不成簇**：这是 agent 工具的对话记录格式。
4. **模板里含 `backup` 或 `bak`（ASCII 不分大小写）的不成簇**：旧备份交给备份规则。
5. **对话记录所在的目录里不找簇**：父目录本身或它往上 4 级之内，有一级名字（ASCII 不分大小写）恰好是下面之一，这一层就不找簇：
   - `sessions`
   - `subagents`
   - `conversations`
   - `chats`
   - `transcripts`

   例：`…\codex\sessions\2026\10\05` 往上第 3 级是 `sessions`，不找；`…\<uuid>\subagents` 本身就是，不找。
6. **两处判断一致**：`streaming.rs` 的 `potential_children` 与 `scan.rs` 的 `build_clusters` 都要按第 1～5 条判断（现在两处各写了一遍“文件不认 `<d>`”）。建议抽成一个函数两处共用；被排除的子项只是不当簇成员，别的处理不变（它们本来就不是任何命中）。
7. **SPEC 补充**：SCAN-M35 第 5.1 节 `<r6>` 的定义、第 5.2 节文件簇的尾巴与“在哪里找”，以本条为准。5.1 节例表里 `verify-abcdef` 仍不是模板。

**不变**：
- 信号 S2、S4 与级别、`group_id` 算法、`ClusterInfo`、成员资格、排序；
- 公开类型与函数签名；
- 系统函数清单。

## 2. 白名单

- `packages/junk-scan/` 下的文件（不得改 `Cargo.toml` 的依赖与 `Cargo.lock`）
- `docs/dispatch/reports/WATER-W10-M13-REPORT.md`
- `docs/acceptance/wave10/m13/` 下 `--mode archive` 生成的证据

## 3. 测试

- `packages/junk-scan/tests/scan_v1.rs`，精确 5 个测试，与 M2 相同：`scan_plan_contract`、`scan_pattern_marker_discovery`、`scan_overlap_and_guards`、`scan_reparse_budget_cancel`、`scan_snapshot_growth_keys`。新断言放进它们调用的辅助函数里。
- **模板**（`m35_plan_templates`，标记 `SCAN_M35_TEMPLATE`）：第 1 条两张名单逐个断言；原有的例子全部不变。
- **簇**（`m35_clusters` 或 `m35_clusters_addendum`，标记 `SCAN_M35_CLUSTERS`）：
  - 夹具只造结构，名字照收口复验的真实写法，内容用占位字节。在一个自选位置下建：
    - a. `res/` 里 12 个文件 `icon_type_color0.png`～`icon_type_color9.png`、`icon_type_step01.png`、`icon_type_step02.png` → 不成簇；
    - b. `help/image/` 里 12 个 `uuid-<随机 UUID>.png` → 不成簇；
    - c. `codex/sessions/2026/10/05/` 里 12 个 `rollout-2026-10-05T00-19-4N-<UUID>.jsonl` → 不成簇；
    - d. `proj/<UUID>/subagents/` 里 12 个 `agent-a0123456789abcdeN.jsonl` → 不成簇；
    - e. `backups/` 里 12 个目录 `claude-code-sessions.backup-20260713-21345N` → 不成簇；
    - f. `work/sessions/x/y/` 里 12 个目录 `run-<UUID>`（`sessions` 在父目录往上第 2 级）→ 不成簇；
    - g. `work/runs/` 里 12 个目录 `session-<UUID>` → **仍成簇**（目录可以用 `<u>`，上级也没有排除的名字）；
    - h. 原有的 `verify-A0000N` 簇 → 仍成簇，成员与级别不变。
  - a～f 的条目都不出现在任何 `leak:` 组里；g、h 的 `group_id`、`member_count` 断言到具体值。
- **安装包模式**（标记 `SCAN_M35_RULES`）：
  - 计划里放一个 `file_name` marker 目标，模式正好是 M12 的三个（`*setup*.exe`、`*installer*.exe`、`*#.#*.exe`），条件 `parent_lacks_file_matching` `*.dll`，`max_depth` 3。
  - 夹具文件：
    - 命中：`MostLogin-setup.exe`、`Mirasim-0.0.783.exe`、`WorkBuddy 5.1.0.exe`、`cc-switch_installer.exe`；
    - 不命中：`unins000.exe`、`Uninstall.exe`、`install-service.exe`、`clash-verge-service-install.exe`、`cpuz_x64.exe`、`cli-32.exe`、`f2py.exe`、`ct2-marian-converter.exe`；
    - 再放一个目录，里面有 `a.dll` 和 `Tool-setup.exe`，后者不命中。
  - 逐个断言命中与否。这一条测的是扫描包里 `#` 的匹配，M12 不改扫描。
- 夹具照规则第 3 节：只在本树 `.local/` 下，用完只删本次新建的那一个目录。
- 获准修改的旧断言：总控 grep 过，没有找到会被撞到的（原有夹具都是 `verify-A0000N`、`run-A0000N`、`proj-A0000N`，仍是 `<r6>`）。

## 4. 负控

| 负控 | 让什么失效 | 标记 |
|---|---|---|
| nc1 | `<r6>` 又接受只有小写字母与数字（第 1 条） | `SCAN_M35_TEMPLATE` 或 `SCAN_M35_CLUSTERS` |
| nc2 | 文件簇又认 `<u>`（第 2 条） | `SCAN_M35_CLUSTERS` |
| nc3 | 去掉对话记录目录的判断（第 5 条） | `SCAN_M35_CLUSTERS` |

只改 `packages/junk-scan/src/` 的生产代码一处 → `--mode red-ncN` → `git checkout` 恢复原字节 → 立即 `--mode test`。

## 5. 命令（在工作树根目录执行）

```powershell
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W10-M13 --mode baseline
```

之后反复用 `lock`、`check`、`test`、`real`，做完负控；提交干净实现后依次跑 `check --final`、`test --final`、`real --final`，再 `archive`。`real` 照 M2：只读扫描，只出组级结果。

## 6. 预算与边界

- 系统函数照 M2，不新增。原生窗口 0、选择框 0、浏览器 0。
- cargo 离线、单线程、私有 target，不下载，不联网。
- 跑测试前按进程名看一眼，没有别的 cargo 检查进程。只因偶发超时失败的，原样重跑，最多 3 次，不算受阻。
- 不 merge、不 rebase，不改台账、契约、检查器、其它包。
- 提交身份照规则第 5 节：只在提交命令的进程里设，用你自己的名字。
- **远端与历史**：
  - 不 push 到任何远端，不添加或修改 git 远端与配置；
  - 不改写已有提交（不 amend、reset、squash 或任何强制操作），只在首次 HEAD 之后新增提交；
  - 提交信息写错就在回执里说明，不要改写。

## 7. 交回

回执第一行与通知完全一致：

```text
WATER-W10-M13 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w10-m13/docs/dispatch/reports/WATER-W10-M13-REPORT.md
```

回执要写：
- 实际模型、实现提交 SHA；
- 第 1 节逐条：改了哪里；两处判断是不是共用一个函数；
- 每个检查命令与结果；
- 改过的旧断言（如有）的原值与新值；
- 负控：改了哪一处、失败信息、恢复后的哈希；
- 真实冒烟的结果；
- 没做或没验证的事。

受阻则写“WATER-W10-M13 任务受阻”，写清冲突与最小补充需求。
