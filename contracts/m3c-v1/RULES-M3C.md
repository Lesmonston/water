# RULES-M3C：在用方式、工作树规则与整盘位置（W8-K2）

2026-10-31，总控（Claude）冻结。补充 [RULES](../checkup-v1/RULES.md)、[RULES-AGENT](../m3-v1/RULES-AGENT.md) 与 [RULES-M3-FIX](../m3-v1/RULES-M3-FIX.md)，冲突时以本文为准。只改 `packages/junk-rules/`。

## 1. 新的在用方式

- MODEL 的 `in_use.mode` 增加 `runs_from_or_references_item`，语义见 [PROCESS-M3C](PROCESS-M3C.md) 第 2 节。
- 字段约束（原 RULES 第 2 节 `in_use` 一行）改为：
  - `none`：processes 为空数组（不变）；
  - `process_running`、`cmdline_references_item`：1～8 个小写 `*.exe`（不变）；
  - `runs_from_or_references_item`：**0～8 个**小写 `*.exe`，空数组表示任何进程。
- 解析计划时原样带进 target 的 `in_use`。

## 2. 四条通用规则改用新方式

下面四条规则的 `in_use` 改为 `{"mode":"runs_from_or_references_item","processes":[]}`，其余字段与文案不变：
- `cachedir-tagged`
- `python-tool-caches`
- `node-modules`
- `rust-build-dirs`

`test-browser-profiles` 不变。

## 3. 新规则：Git 工作树（仅供参考）

在规则文件里紧跟 `rust-build-dirs` 之后，新增一条 marker 规则：

| 字段 | 值 |
|---|---|
| `rule_id` | `git-worktrees` |
| `title_zh` | `Git 工作树或子模块` |
| `owner_zh` | `Git` |
| `category` / `level` | `custom` / `advisory` |
| `locate` | `[{"kind":"marker","marker":{"kind":"file","name":".git","min_bytes":1,"max_bytes":4096},"max_depth":8}]` |
| `item_type` / `min_age_hours` / `keep_newest` | `dir` / `0` / `0` |
| `in_use` | `{"mode":"none","processes":[]}` |
| `growth` | `slow` |
| `what_zh` | `目录里的 .git 是一个小文件而不是文件夹，通常是 git worktree 建出的工作树，也可能是子模块。` |
| `why_zh` | `里面可能有还没提交的改动，Water 不读文件内容，无法确认，所以只列出、不提供清理。` |
| `after_zh` | `确认不再需要后，在主仓库里用 git worktree remove 删除，主仓库的登记会一并清掉。` |
| `fix_hint_zh` | `null` |
| `sources` | `[{"kind":"local_observation","ref":"F 盘清理记录 docs/maintenance/F-CLEANUP-20261029.md：130 棵已合并的旧工作树共 56 GB","checked_on":"2026-10-29"},{"kind":"official_doc","ref":"https://git-scm.com/docs/git-worktree","checked_on":"2026-10-31"}]` |

- 只看 `.git` 的类型与大小（元数据），不读内容，符合 ADR-018。
- 文案逐字照上表，测试逐字核对。

## 4. 自选位置可以是非系统盘的盘根

- `resolve_plan` 的 `CustomRoot.path` 原来不接受盘根。改为也接受恰好形如 `X:\`（字母、冒号、反斜杠，共 3 个字符）的盘根，其余路径规则不变（不得以 `\` 结尾、不得有 `..` 等）。
- 是不是系统盘由服务判断（[SERVICE-M3C](SERVICE-M3C.md)）。规则层只保证：
  - 盘根形状合法；
  - 它和其它 custom root 一样进入 `hard_guards`（盘根本身永远不可清理）。
- 盘根位置的 `root_id` 由服务给出，规则层不改 `root_id` 的格式。

## 5. 数据版本

`data_version` 改为 `2026-10-31.1`。

## 6. 测试

`tests/rules_v1.rs` 仍是精确四个测试，名字不变。新断言加在已有测试里，失败信息带标记：

| 标记 | 内容 |
|---|---|
| `RULES_M3C_IN_USE` | 新方式可解析：空名单与 1～8 个名单都通过，9 个被拒；`process_running` 与 `cmdline_references_item` 的空名单仍被拒；四条通用规则的 `in_use` 精确等于第 2 节；`test-browser-profiles` 不变 |
| `RULES_M3C_WORKTREE` | `git-worktrees` 的字段逐项等于第 3 节；有 custom root 时生成 `custom:<root_id>:git-worktrees` 目标，marker 为 `.git` 文件、大小 1～4096 |
| `RULES_M3C_DRIVE_ROOT` | custom root 为 `F:\` 时生成全部 marker 目标，`hard_guards` 含 `F:\`；`F:`、`F:\\`、`F:\a\` 仍被拒 |
| `RULES_M3C_VERSION` | `data_version` 为 `2026-10-31.1` |

原有断言中，以下几处与本文必然冲突，**获准修改**，其余不变：
- 规则总数；
- 四条通用规则的 `in_use`；
- custom 规则个数（5 → 6）；
- `data_version`。

回执逐条写出原值与新值。

## 7. 负控与真实冒烟

- **nc1**：校验器对新方式也要求非空名单，测试以 `RULES_M3C_IN_USE` 失败。
- **nc2**：`resolve_plan` 拒绝盘根，测试以 `RULES_M3C_DRIVE_ROOT` 失败。
- 负控只认 `src/` 里的改动，只改规则数据不算。
- **真实冒烟**（`--mode real`）与原来相同，只核对已知目录是否存在。
