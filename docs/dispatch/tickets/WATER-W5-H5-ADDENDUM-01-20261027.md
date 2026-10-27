# WATER-W5-H5 补单 01：新规则带来的数量与数据版本变化（轻门）

2026-10-27，总控（Claude）。回应 WATER-W5-H5 的受阻回执（回执提交 `d6c83ea92996b148a585a3d6719c6a9e8babf25c`）。可以新开对话执行。开工前依次读：
1. 原票 `F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W5-H5-RULES-M2-20261027.md`；
2. 规则 `F:/new/smaltalk/water/docs/dispatch/W5-M2-WORKER-RULES.md`；
3. SPEC `F:/new/smaltalk/water/contracts/m2-v1/RULES-M2.md`（全文），以及仍然有效的 `F:/new/smaltalk/water/contracts/checkup-v1/RULES.md`、`F:/new/smaltalk/water/contracts/checkup-v1/MODEL.md`；
4. 本补单（与原票冲突时以本补单为准）；
5. 上一轮回执 `F:/new/smaltalk/water/.worktrees/w5-h5/docs/dispatch/reports/WATER-W5-H5-REPORT.md`。

## 受阻判断

受阻成立，是总控票面的疏漏。原票第 45 行“原有标记与断言不变”没有考虑到：新增一条规则必然改变两个写死的数量。总控已只读核对：
- `rules/windows.json` 现有 60 条规则，其中 `custom` 类 4 条；
- `expected_target_count` 对 marker 定位器按自定义文件夹个数计数，`rules_resolve_plan` 用两个自定义文件夹，新规则只有一个 marker 定位器，所以目标数加 2；
- 其它测试里的数量不受影响：`marker_targets` 只筛 `cachedir-tagged`，仍是 2；三条登录与网站数据规则各 32 个目标不变；
- 其它包（服务、扫描、宿主、界面）没有依赖规则条数、目标数或数据版本字面值的断言。

## 要做的

### 1. 规则与数据版本（`packages/junk-rules/rules/windows.json`）

- 按 SPEC 第 1 节新增 `rust-build-dirs`，放在 `custom` 类现有规则之后（同原票）；
- `data_version` 由 `2026-10-26.2` 改为 **`2026-10-27.1`**。规则数据变了，数据版本加一；第二波 A 补单 01 改规则时也是这样做的。
- `rules_version`（规则格式版本 `water.junk-rules.v1`）不变。

### 2. 授权改动的旧断言（`packages/junk-rules/tests/rules_v1.rs`）

只改下面三处字面值，原有失败信息原样保留：

| 测试 | 原断言 | 改为 |
|---|---|---|
| `rules_protection_precedence` | `assert_eq!(embedded.rules().len(), 60, "seed set must load");` | `61` |
| `rules_resolve_plan` | `assert_eq!(expected, 214);` | `216` |
| `rules_resolve_plan` | `assert_eq!(plan.rules_data_version, "2026-10-26.2");` | `"2026-10-27.1"` |

- `rules_protection_precedence` 里构造子集时写的 `"data_version": "2026-10-26.2"` 是测试输入，**不要改**。
- 除这三处外，原有断言、标记与 4 个测试名都不变。

### 3. 新断言

照原票与 SPEC 第 3 节，加在已有测试里，失败信息带 `RULES_RUST_BUILD`：
- 种子表加上新规则，`rules_seed_coverage` 逐字段核对；
- 对一个自定义文件夹解析计划，得到以 `.rustc_info.json` 为标记文件、大小界限 2～65536、深度 12 的 marker 目标；
- 现有校验约束照样适用于新规则，不新增约束。

上面第 2 节改过的三处是旧断言，不要求加标记。

## 不变

- SPEC 第 4 节：其余规则及其级别、年龄、在用设置；校验器、规则格式版本、依赖；
- 不改 `packages/junk-scan`、`Cargo.toml`、`Cargo.lock`；
- 白名单、负控 nc1（标记 `RULES_RUST_BUILD`）、三个 final 都同原票。

## 续做与检查

- 同一工作树 `F:/new/smaltalk/water/.worktrees/w5-h5`、分支 `worker/water-w5-h5`，从回执提交 `d6c83ea92996b148a585a3d6719c6a9e8babf25c` 接着做。开工时树应干净且 HEAD 为该提交。**不要重跑 baseline。**
- 命令同原票（在工作树根目录执行），例如：
  ```powershell
  node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W5-H5 --mode test
  ```
  反复用 `lock`、`check`、`test`；负控：只改规则数据或生产代码里一处 → `--mode red-nc1` → `git checkout` 恢复原字节 → 立即 `--mode test`。提交干净实现后依次跑 `check --final`、`test --final`、`real --final`，再 `archive`。
- 提交身份照上一轮做法：只在提交命令的进程里设作者与提交者环境变量，不写任何 git 配置，不借用人类作者身份。
- 原生窗口 0、选择框 0、浏览器窗口 0。
- 不 merge、不 rebase，不改台账、契约、检查器、其它包。
- **远端与历史**：
  - 不 push 到任何远端，不添加或修改 git 远端与配置；
  - 不改写已有提交（不 amend、reset、squash 或任何强制操作），只在 `d6c83ea9` 之后新增提交；
  - 提交信息写错就在回执里说明，不要改写。

## 交回

改写同一份回执，第一行与原票一致：

```text
WATER-W5-H5 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w5-h5/docs/dispatch/reports/WATER-W5-H5-REPORT.md
```

原有的受阻一节保留，新增“补单 01”一节，写：
- 实际模型、续做起点、实现提交 SHA；
- 新规则的完整 JSON 与核对过的来源（官方文档写网址、标题、访问日期）；
- 第 2 节三处改动前后的原文；
- 每个检查命令与结果；
- 负控：改了哪一处、失败信息、恢复后的哈希；
- 没做或没验证的事。

受阻则写“WATER-W5-H5 任务受阻”，写清冲突与最小补充需求，不要自行变通。
