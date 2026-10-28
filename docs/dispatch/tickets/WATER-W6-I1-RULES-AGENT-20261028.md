# WATER-W6-I1：Agent 工具规则（轻门）

2026-10-28，正式票，总控（Claude）。以 [第六波 manifest](../wave6/manifest.json) 中本票 `status` 为准；READY 不代表已外贴。可以新开对话执行。本票与 I2、I3 同时进行，各改各的目录。

| 项 | 精确值 |
|---|---|
| 权威票 | F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W6-I1-RULES-AGENT-20261028.md |
| 唯一工作树 / 分支 | F:/new/smaltalk/water/.worktrees/w6-i1 / worker/water-w6-i1 |
| 精确首次 HEAD | d79fb096ef0557430b7dd43634b4d60e8f2de958，必须干净；`packages/junk-rules` 是第五波 H5 合入后的版本（61 条规则） |
| SPEC | F:/new/smaltalk/water/contracts/m3-v1/RULES-AGENT.md（本票的全部要求） |
| 仍然有效的契约 | F:/new/smaltalk/water/contracts/checkup-v1/RULES.md；F:/new/smaltalk/water/contracts/checkup-v1/MODEL.md |
| 调研资料 | F:/new/smaltalk/water/docs/research/agent-tools-20261028/VERIFY.md（总控本机核对，以它为准）；同目录 GROK-REPORT.md（公开文档出处） |
| 规则 | F:/new/smaltalk/water/docs/dispatch/W6-M3-WORKER-RULES.md |
| 检查入口 | F:/new/smaltalk/water/scripts/checkup-wave-check.mjs |
| 回执 | F:/new/smaltalk/water/.worktrees/w6-i1/docs/dispatch/reports/WATER-W6-I1-REPORT.md |
| 证据目录 | F:/new/smaltalk/water/.worktrees/w6-i1/docs/acceptance/wave6/i1/ |
| 门 | 轻门：1 条负控 + check、test、real 三个 final |

先读：
1. 规则与 SPEC RULES-AGENT 全文，再读 RULES（规则格式与校验）与 MODEL（段语法）；
2. 调研资料 VERIFY.md（本机实际目录与更正）；GROK-REPORT.md 只用来找官方网址；
3. 规则包：`packages/junk-rules/rules/windows.json` 里现有的 `agent_tool` 与 `electron-app-cache`、`claude-desktop-old-versions`（`keep_newest` 与 `cmdline_references_item` 的写法），`tests/rules_v1.rs` 的种子表与 `locator_summary`。

## 要做的（全部在 `packages/junk-rules/`）

1. 按 SPEC 第 2.1、2.2 节在 `rules/windows.json` **末尾**按表中顺序新增 14 条规则；字段、顺序与写法照现有条目，不新增字段。
2. 按 SPEC 第 2.3 节给 `electron-app-cache` 插入一个定位器。
3. 文案按 SPEC 第 2.4 节的要点写，长度与语气照 RULES 第 2 节。
4. 来源按 SPEC 第 2.5 节：每条至少一条本机观察；表中列出的规则还要有官方或源码出处，你要打开网页核对网址与标题（只读，不下载），回执里写出核对了什么、哪天核对的。
5. `data_version` 改为 `2026-10-28.1`。
6. 测试按 SPEC 第 4 节补断言，并按其中的“获准改动”改三处旧数值。

**不变**：SPEC 第 5 节，包括其余规则、校验器、格式版本、依赖。本票不改扫描、服务与宿主。

**进程名**：只用 SPEC 第 1 节列的 `cursor.exe`、`claude.exe`。别的工具即使你知道进程名也不要写。

## 白名单

- `packages/junk-rules/` 下的文件（不得改 `Cargo.toml`、`Cargo.lock`）
- `docs/dispatch/reports/WATER-W6-I1-REPORT.md`
- `docs/acceptance/wave6/i1/` 下 `--mode archive` 生成的证据

## 测试

`packages/junk-rules/tests/rules_v1.rs`，仍是精确 4 个测试，名字不变：`rules_schema_strict`、`rules_protection_precedence`、`rules_resolve_plan`、`rules_seed_coverage`。

新断言加在已有测试里，失败信息带标记 `RULES_AGENT_TOOLS`。旧断言只能改 SPEC 第 4 节“获准改动”的三处；若还有别的写死数量必须改，回执逐条写出原值、新值与原因。

## 负控

| 负控 | 让什么失效（举例，选一处） | 标记 |
|---|---|---|
| nc1 | 生产代码里与新规则有关、真正被用到的一处，例如解析 `keep_newest` 或在用设置、或计划解析时丢掉某类定位器 | `RULES_AGENT_TOOLS` |

**只改 `packages/junk-rules/src/` 下的一处**（检查器不认只改规则数据的负控），不改测试 → `--mode red-nc1` → `git checkout` 恢复原字节 → 立即 `--mode test`。

## 命令（在工作树根目录执行）

```powershell
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W6-I1 --mode baseline
```

之后反复用 `lock`、`check`、`test`，做完负控；提交干净实现后依次跑 `check --final`、`test --final`、`real --final`，再 `archive`。

`real --final` 只解析本机已知目录的计划、核对目录是否存在，不读文件内容，输出不含路径。

## 预算与边界

- cargo 离线、单线程、私有 target。
- 原生窗口 0、选择框 0。核对官方文档只读网页，不下载。
- 不 merge、不 rebase，不改台账、契约、检查器、其它包。
- 提交身份照规则第 5 节：只在提交命令的进程里设，用你自己的名字，不借用人类作者身份。
- **远端与历史**：
  - 不 push 到任何远端，不添加或修改 git 远端与配置；
  - 不改写已有提交（不 amend、reset、squash 或任何强制操作），只在首次 HEAD 之后新增提交；
  - 提交信息写错就在回执里说明，不要改写。

## 交回

回执第一行与通知完全一致：

```text
WATER-W6-I1 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w6-i1/docs/dispatch/reports/WATER-W6-I1-REPORT.md
```

回执要写：
- 实际模型、实现提交 SHA；
- 14 条新规则与 `electron-app-cache` 改动后的完整 JSON；每条来源核对了什么、哪天；
- 改过的旧断言：原值、新值、原因；
- 每个检查命令与结果；
- 负控：改了哪一处、失败信息、恢复后的哈希；
- 没做或没验证的事。

受阻则同一路径写“WATER-W6-I1 任务受阻”，写清冲突与最小补充需求，不要自行变通。
