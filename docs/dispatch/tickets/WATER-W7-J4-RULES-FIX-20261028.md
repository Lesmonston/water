# WATER-W7-J4：规则措辞与出处（轻门）

2026-10-28，正式票，总控（Claude）。以 [第七波 manifest](../wave7/manifest.json) 中本票 `status` 为准；READY 不代表已外贴。可以新开对话执行。本票与 J1、J2、J3 同时进行，各改各的目录。

| 项 | 精确值 |
|---|---|
| 权威票 | F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W7-J4-RULES-FIX-20261028.md |
| 唯一工作树 / 分支 | F:/new/smaltalk/water/.worktrees/w7-j4 / worker/water-w7-j4 |
| 精确首次 HEAD | 282876950df40a14b7abeec6ab27677ea0adc897，必须干净；`packages/junk-rules` 是第六波 I1 合入后的版本（75 条规则） |
| SPEC | F:/new/smaltalk/water/contracts/m3-v1/RULES-M3-FIX.md（本票的全部要求） |
| 仍然有效的契约 | F:/new/smaltalk/water/contracts/m3-v1/RULES-AGENT.md；F:/new/smaltalk/water/contracts/checkup-v1/RULES.md；F:/new/smaltalk/water/contracts/checkup-v1/MODEL.md |
| 规则 | F:/new/smaltalk/water/docs/dispatch/W7-M3-FIX-WORKER-RULES.md |
| 检查入口 | F:/new/smaltalk/water/scripts/checkup-wave-check.mjs |
| 回执 | F:/new/smaltalk/water/.worktrees/w7-j4/docs/dispatch/reports/WATER-W7-J4-REPORT.md |
| 证据目录 | F:/new/smaltalk/water/.worktrees/w7-j4/docs/acceptance/wave7/j4/ |
| 门 | 轻门：1 条负控 + check、test、real 三个 final |

先读：
1. 规则与 SPEC RULES-M3-FIX 全文，再读 RULES-AGENT 与 RULES 第 2 节（文案约束）；
2. 背景：[第六波收单验收](../../acceptance/wave6/controller/WATER-W6-REVIEW-20261028.md) I1 一节；
3. `packages/junk-rules/rules/windows.json` 里 SPEC 点名的规则，`tests/rules_v1.rs` 第六波加的 `RULES_AGENT_TOOLS` 断言与种子表。

## 要做的（全部在 `packages/junk-rules/`）

SPEC 第 1～4 节：
1. 六处说明文字按表一字不差替换；
2. `opencode-sessions` 第 1 个定位器最后一段改为 `opencode.db*`；
3. 四条 `local_observation` 的 `ref` 按表替换，`checked_on` 写 `2026-10-28`；
4. `data_version` 改为 `2026-10-28.2`。

本票不需要上网，出处网址一律不动。

**不变**：SPEC 第 7 节，包括其余规则的全部字段与顺序、校验器、解析器、格式版本、依赖；规则数 75、目标数 255。

## 白名单

- `packages/junk-rules/` 下的文件（不得改 `Cargo.toml`、`Cargo.lock`）
- `docs/dispatch/reports/WATER-W7-J4-REPORT.md`
- `docs/acceptance/wave7/j4/` 下 `--mode archive` 生成的证据

## 测试

`packages/junk-rules/tests/rules_v1.rs`，仍是精确 4 个测试，名字不变：`rules_schema_strict`、`rules_protection_precedence`、`rules_resolve_plan`、`rules_seed_coverage`。

新断言照 SPEC 第 5 节加在已有测试里，失败信息带 `RULES_M3_WORDING`。旧断言只能改 SPEC 第 5 节“获准改动”的那些，回执逐条写出原值与新值。

## 负控

| 负控 | 让什么失效（举例，选一处） | 标记 |
|---|---|---|
| nc1 | 生产代码里与新断言有关、真正被用到的一处，例如读取说明文字或来源字段时改动了内容，或解析定位器段时丢掉结尾的 `*` | `RULES_M3_WORDING` |

**只改 `packages/junk-rules/src/` 下的一处**（检查器不认只改规则数据的负控），不改测试 → `--mode red-nc1` → `git checkout` 恢复原字节 → 立即 `--mode test`。旧断言常会先失败（第六波 I1 的经验），要找只有新断言才抓得到的位置；找不到就写受阻回执。

## 命令（在工作树根目录执行）

```powershell
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W7-J4 --mode baseline
```

之后反复用 `lock`、`check`、`test`，做完负控；提交干净实现后依次跑 `check --final`、`test --final`、`real --final`，再 `archive`。

`real --final` 只解析本机已知目录的计划、核对目录是否存在，不读文件内容，输出不含路径。

## 预算与边界

- cargo 离线、单线程、私有 target。
- 原生窗口 0、选择框 0。
- 不 merge、不 rebase，不改台账、契约、检查器、其它包。
- 提交身份照规则第 5 节：只在提交命令的进程里设，用你自己的名字，不借用人类作者身份。
- **远端与历史**：
  - 不 push 到任何远端，不添加或修改 git 远端与配置；
  - 不改写已有提交（不 amend、reset、squash 或任何强制操作），只在首次 HEAD 之后新增提交；
  - 提交信息写错就在回执里说明，不要改写。

## 交回

回执第一行与通知完全一致：

```text
WATER-W7-J4 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w7-j4/docs/dispatch/reports/WATER-W7-J4-REPORT.md
```

回执要写：
- 实际模型、实现提交 SHA；
- 改动后这几条规则的完整 JSON；
- 改过的旧断言：原值、新值；
- 每个检查命令与结果；
- 负控：改了哪一处、失败信息、恢复后的哈希；
- 没做或没验证的事。

受阻则同一路径写“WATER-W7-J4 任务受阻”，写清冲突与最小补充需求，不要自行变通。
