# WATER-W9-L1：标记的附加条件与兜底规则（轻门，final 含只读真实冒烟）

2026-11-02，正式单，总控（Claude）。以[第九波 manifest](../wave9/manifest.json) 中本单 `status` 为准；READY 不代表已外贴。可以新开对话执行。本单与 L2、L3、L4 同时进行，各改各的目录。

| 项 | 精确值 |
|---|---|
| 权威单 | F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W9-L1-RULES-20261102.md |
| 唯一工作树 / 分支 | F:/new/smaltalk/water/.worktrees/w9-l1 / worker/water-w9-l1 |
| 精确首次 HEAD | 57ecd7ce42a98f9932faecc69e5d82c648991669，必须干净 |
| SPEC | F:/new/smaltalk/water/contracts/m3d-v1/RULES-M3D.md（本单的全部要求） |
| 仍然有效的契约 | F:/new/smaltalk/water/contracts/checkup-v1/RULES.md；F:/new/smaltalk/water/contracts/checkup-v1/MODEL.md；F:/new/smaltalk/water/contracts/m3c-v1/RULES-M3C.md；计划 JSON 的扫描侧见 F:/new/smaltalk/water/contracts/m3d-v1/SCAN-M3D.md 第 1 节 |
| 规则 | F:/new/smaltalk/water/docs/dispatch/W9-M3D-WORKER-RULES.md |
| 检查入口 | F:/new/smaltalk/water/scripts/checkup-wave-check.mjs |
| 回执 | F:/new/smaltalk/water/.worktrees/w9-l1/docs/dispatch/reports/WATER-W9-L1-REPORT.md |
| 证据目录 | F:/new/smaltalk/water/.worktrees/w9-l1/docs/acceptance/wave9/l1/ |
| 门 | 轻门：2 条负控 + check、test、real 三个 final |

先读：
1. 规则与 SPEC RULES-M3D 全文，再读 RULES 第 2～4 节、RULES-M3C；
2. 代码：
   - `packages/junk-rules/src/rules.rs`：定位器解析 `parse_locator`，约 349～390 行；
   - `src/types.rs`：`Marker`、`Locator`、`MatchSpec`，约 243～287 行，以及定位摘要，约 497～525 行；
   - `src/plan.rs`：`resolve_plan` 与计划 JSON 的读写；
   - `rules/windows.json`；
3. `tests/rules_v1.rs`：规则总数、目标总数、custom 规则个数、`beta_position + 3`、盘根的 6 个标记目标、`rules()[62..]`、种子表、`data_version` 的现有断言。

## 要做的（全部在 `packages/junk-rules/`）

SPEC 第 1～5 节：
1. 标记定位器的 `conditions`（四种条件）与校验；
2. `node-modules`、`test-browser-profiles` 加条件；
3. `fallback_for` 与校验，新增 `bundled-node-modules`、`browser-data-dirs` 两条规则，放在 `git-worktrees` 之后，字段与文案逐字照 SPEC 第 3 节；
4. `Condition` 类型、两个变体加字段，计划 JSON 的新键；不带条件的目标序列化结果逐字节不变；
5. `data_version` 为 `2026-11-02.1`。

**不变**：其余规则的字段与文案、定位摘要的格式、校验的其它条款、`resolve_plan` 原有目标的顺序、依赖。

## 白名单

- `packages/junk-rules/` 下的文件（不得改 `Cargo.toml` 的依赖、`Cargo.lock`）
- `docs/dispatch/reports/WATER-W9-L1-REPORT.md`
- `docs/acceptance/wave9/l1/` 下 `--mode archive` 生成的证据

## 测试

`packages/junk-rules/tests/rules_v1.rs`，仍是精确 4 个测试，名字不变：`rules_schema_strict`、`rules_protection_precedence`、`rules_resolve_plan`、`rules_seed_coverage`。

- 新断言照 SPEC 第 6 节加在已有测试里，失败信息带 `RULES_M3D_CONDITIONS`、`RULES_M3D_FALLBACK`、`RULES_M3D_VERSION`。
- 旧断言只能改 SPEC 第 6 节获准的八类，回执逐条写原值与新值。

## 负控

| 负控 | 让什么失效（举例，选一处） | 标记 |
|---|---|---|
| nc1 | 校验器不再要求被兜底的规则带 `conditions` | `RULES_M3D_FALLBACK` |
| nc2 | `resolve_plan` 不把 `conditions` 带进目标 | `RULES_M3D_CONDITIONS` |

只改 `packages/junk-rules/src/` 里一处（只改规则数据不算）→ `--mode red-ncN` → `git checkout` 恢复原字节 → 立即 `--mode test`。要找只有新断言才抓得到的位置，否则旧断言会先失败，检查器不认。

## 命令（在工作树根目录执行）

```powershell
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W9-L1 --mode baseline
```

之后反复用 `lock`、`check`、`test`，做完两条负控；提交干净实现后依次跑 `check --final`、`test --final`、`real --final`，再 `archive`。

`real --final` 只核对本机已知目录是否存在，不读文件内容，输出不含路径。

## 预算与边界

- 原生窗口 0、选择框 0、浏览器 0。
- cargo 离线、单线程、私有 target，不下载；不需要联网查资料。
- 不 merge、不 rebase，不改台账、契约、检查器、其它包。
- 提交身份照规则第 5 节：只在提交命令的进程里设，用你自己的名字，不借用人类作者身份。
- **远端与历史**：
  - 不 push 到任何远端，不添加或修改 git 远端与配置；
  - 不改写已有提交（不 amend、reset、squash 或任何强制操作），只在首次 HEAD 之后新增提交；
  - 提交信息写错就在回执里说明，不要改写。

## 交回

回执第一行与通知完全一致：

```text
WATER-W9-L1 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w9-l1/docs/dispatch/reports/WATER-W9-L1-REPORT.md
```

回执要写：
- 实际模型、实现提交 SHA；
- SPEC 第 1～5 节逐条：改了哪里、怎么满足；
- 改过的旧断言：原值与新值；
- 每个检查命令与结果，`real` 的结果；
- 负控：改了哪一处、失败信息、恢复后的哈希；
- 没做或没验证的事。

受阻则同一路径写“WATER-W9-L1 任务受阻”，写清冲突与最小补充需求，不要自行变通。
