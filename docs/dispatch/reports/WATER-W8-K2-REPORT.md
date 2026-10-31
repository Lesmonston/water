WATER-W8-K2 任务受阻，任务报告在 F:/new/smaltalk/water/.worktrees/w8-k2/docs/dispatch/reports/WATER-W8-K2-REPORT.md

日期：2026-10-31。执行者：Codex（GPT-6；本会话未提供更细的模型型号）。

## 工作树与启动检查

- 工作树：`F:/new/smaltalk/water/.worktrees/w8-k2`。
- 分支：`worker/water-w8-k2`。
- 首次 HEAD：`912eba100ba342c3eeb21ba555c6d589b91e6b4f`，与工单一致。
- 开工与受阻确认时 `git status --porcelain=v1` 均为空；未修改产品、测试、契约、检查器、依赖或台账。
- 实现提交 SHA：无。本次只提交本受阻回执，不表示实现完成或验收通过。
- 权威工单读取自票面指定的主仓库绝对路径；未把主线合入工作树。

已按票面先读第八波执行者规则、RULES-M3C 及原规则契约，核对 ADR-018、第八波计划、MODEL、PROCESS-M3C 第 2 节、现有规则代码与测试。静态核对发现下面三类旧断言冲突，触发工单要求的受阻处理。

## 阻塞依据

`docs/dispatch/W8-M3C-WORKER-RULES.md:44` 明确规定：

> SPEC 没想到、但因本单改动而必然要改的旧断言：**先写受阻回执**，不要自行改。

`contracts/m3c-v1/RULES-M3C.md:70` 起只授权修改四类旧断言：规则总数、四条通用规则的在用设置、custom 规则个数、data_version，并写明“其余不变”。以下不属于这四类；因此不能沿用较早 RULES-AGENT 对其它写死数量的宽泛授权，也不能通过改产品语义绕过。

### 1. 两个 custom root 的目标总数冲突

- `packages/junk-rules/tests/rules_v1.rs:641` 固定断言 `assert_eq!(expected, 255)`。
- RULES-M3C 第 3 节必须新增一个 marker 定位器；原 RULES 第 4 节要求每个 custom root 都生成目标。
- 现有测试有 alpha、beta 两个 custom root，新增目标必须为 2 个，故目标总数应为 **255 → 257**。
- 这是目标数量，不是已获准修改的规则数量或 custom 规则数量。维持 255 必须漏生成目标或移除原目标，均违反契约。

### 2. Agent 目标尾段的边界、数量及顺序冲突

- `packages/junk-rules/tests/rules_v1.rs:822` 起找到 `custom:beta:rust-build-dirs#1`；第 827 行把其后的全部目标作为 `appended`。
- 第 828～831 行要求该尾段恰好 38 个目标，第 834～843 行从 `appended[0]` 开始逐项核对原 Agent 规则顺序。
- RULES-M3C 第 3 节要求新规则紧跟 `rust-build-dirs`，原解析顺序保持。因此此处尾段必然变为 **38 → 40**，前两项是 `custom:alpha:git-worktrees#1`、`custom:beta:git-worktrees#1`，后面才是原来的 38 个 Agent 目标。
- 即使只改 38 为 40，原 Agent 顺序断言仍会把 Git 目标当作第一个 Agent 目标。必须同时授权调整尾段边界，保留原 38 个 Agent 目标的完整检查。

### 3. 新规则逐字文案与旧措辞断言冲突

- RULES-M3C 第 3 节规定 `git-worktrees.why_zh` 必须逐字为：

  `里面可能有还没提交的改动，Water 不读文件内容，无法确认，所以只列出、不提供清理。`

- `packages/junk-rules/tests/rules_v1.rs:961` 起遍历所有规则与公开文案，第 973～976 行断言 `!value.contains("只列出")`，失败标记为 `RULES_M3_WORDING`。
- 新规则必然在 `why_zh` 与公开 `why_zh` 两处触发旧断言。改变规定文案违反逐字要求；为新规则收窄该旧断言又不在四类授权之内。

## 最小补充需求

请总控通过绑定本单与续做基线的编号补单明确授权以下测试调整，并同步受影响工单、SPEC、manifest：

1. 两个 custom root 的目标总数断言 **255 → 257**。
2. 将原 Agent 尾段检查的起点移至新增的两个 Git 目标之后，保留对原 **38** 个 Agent 目标的数量、字段及顺序核对；另用 `RULES_M3C_WORKTREE` 精确核对新增目标、插入位置和根顺序。
3. 仅允许 `git-worktrees` 的规定 `why_zh` 及其公开投影含“只列出”，并用 `RULES_M3C_WORKTREE` 逐字锁定；其它规则与其它字段继续保留旧措辞检查及原标记。

无需放宽产品安全边界、依赖、文件白名单或四个测试的名称和数量。

## 已运行的检查与证据

在指定工作树根执行：

```powershell
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W8-K2 --mode baseline
```

结果：退出码 **0**，`status: passed`，`offlineCache: complete`，前后 HEAD 均为原始基线，前后状态干净。工具链定位与版本检查通过。

原始回执保留在：

`.local/checks/WATER-W8-K2/2026-10-31T14-15-46.868Z-43588-baseline-result.json`

关联日志为同前缀的 `baseline-1.log`、`baseline-2.log`、`baseline-3.log`。baseline 只证明环境与输入就绪，`productTestsRun: false`、`realDataRead: false`；不作为产品测试或真实冒烟通过的证据。

另对仓库内的规则 JSON 做只读内存计数，并核对测试原文，结果为：

| 项 | 基线实值 | 按 SPEC 必然产生的值 |
|---|---:|---:|
| 规则总数 | 75 | 76 |
| marker 定位器数 | 5 | 6 |
| 两个 custom root 的计划目标数 | 255 | 257 |
| Rust beta 目标之后的尾段长度 | 38 | 40 |
| 规定 Git 文案是否含旧测试禁止的“只列出” | 不适用 | 是 |

这些是静态核对及计数，不是修改产品后运行测试所得的失败记录。未构造虚假的红灯或负控证据。

## SPEC 实现状态与未执行项

- 第 1 节新在用方式、第 2 节四条通用规则、第 3 节 Git 工作树规则、第 4 节盘根支持、第 5 节版本更新：**均未实现**，保持原始产品字节。
- 修改过的旧断言：**无**。
- `lock`、`check`、`test`、两条负控、三个 final、`real`、`archive`：**均未运行**。没有负控恢复哈希或 final 通过记录。
- 未读取真实用户文件内容，未扫描整盘，未删除数据，原生窗口 0、选择框 0；未下载依赖、未联网查资料。
- 未改任何远端或 Git 配置，未 push、merge、rebase、amend、reset 或改写历史；未启动子代理或后台任务。
- 未验证 macOS、进程/扫描/服务的跨票集成或任何真实清理链路。
- 本报告仅交回可定位、可复核的契约冲突；待总控编号补单后续做。
