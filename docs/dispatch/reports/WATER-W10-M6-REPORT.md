WATER-W10-M6 任务受阻，任务报告在 F:/new/smaltalk/water/.worktrees/w10-m6/docs/dispatch/reports/WATER-W10-M6-REPORT.md

日期：2026-11-06。执行者：Codex（系统标识 GPT-6，具体模型快照未提供）。没有委派子代理。

## 工作树与提交

- 权威工单：`F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W10-M6-UI-20261106.md`。
- 工作树：`F:/new/smaltalk/water/.worktrees/w10-m6`。
- 分支：`worker/water-w10-m6`。
- 首次 HEAD：`06d266d1483b7ab210dd2c492d39a2511a134abe`，首次状态干净。
- 实现提交 SHA：无。产品、测试、令牌均未修改；本次新增提交仅包含本回执和检查器归档的证据。
- 采用主树权威 manifest；工作树中的历史 manifest 未修改。实际 baseline 使用新基线且通过。

## 受阻原因：先看设计稿与浏览器启动限制之间缺少入口

工单“先读”第 2 项要求先在浏览器打开设计 v3 的十一屏，再看十一张截图；第 4 项才是读取产品代码。用户本次也明确重复了这一顺序。

但同一工单第 84 行限定：

> 原生窗口 0、选择框 0、浏览器 1（只在 `browser` 模式，检查器启动）。

实际指定检查器 `F:/new/smaltalk/water/scripts/checkup-wave-check.mjs` 的执行顺序是：

1. 第 151 行，`uiGate()` 先执行 `capture(); uiPolicy();`。
2. 第 129 行，`uiPolicy()` 要求工作树产品 `apps/water/ui/styles/tokens.css` 与设计 v3 令牌逐字节一致。
3. 第 160 行才启动浏览器测试文件；没有独立的设计稿预览模式。

未实施的精确基线仍使用原产品令牌，因此按授权入口实际运行 `--mode browser`，在浏览器启动之前即失败：

```text
AssertionError [ERR_ASSERTION]: styles/tokens.css must equal the design tokens byte for byte
```

对应 SHA-256：

| 文件（工作树内） | SHA-256 |
|---|---|
| `apps/water/ui/styles/tokens.css` | `703e7b3c185bd95d79bb580cc1911736962159846832ece5a40ba5df0770cb29` |
| `docs/design/water-ui-v3/tokens.css` | `2850d65eb9e51eedcfc319850ce92b000184f39766499aa7d84de757223f2697` |

令牌不同是尚未实施改版的正常基线状态，不是新发现的产品缺陷，也不是 baseline 失败。阻塞点是：现有授权入口要求先更改产品，才能启动完成“先读”所需的浏览器。本次没有提前改令牌或测试来绕过顺序，没有直接调用浏览器 helper 绕过工单的启动限制，也没有改检查器。

按工单第 108 行“受阻……写清冲突与最小补充需求，不要自行变通”，在这里停止实现。

## 最小补充需求

请总控用正式补充单明确一个实现前的设计稿预览入口。例如授权复用现有私有浏览器 helper，以一次浏览器进程、loopback 本地服务依次打开十一屏，临时文件仅放本树 `.local/`，并说明这一预读步骤不受“只在 browser 模式”限制。产品测试、负控与 final 仍使用原检查器，无需放宽产品源码政策。

也可以由总控提供独立的只读设计稿预览模式。补单需绑定本次回执提交作为续做起点；本次没有修改基线、台账或授权范围。

## 已执行检查与证据

以下命令均从指定工作树根目录执行：

| 命令 | 退出码与结果 |
|---|---|
| `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W10-M6 --mode baseline` | 0，passed；只证明环境与输入就绪 |
| `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W10-M6 --mode browser` | 1，failed；源码政策在浏览器启动前拒绝，`productTestsRun: false` |
| `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W10-M6 --mode archive` | 0，passed；归档原字节证据 |

归档索引：`docs/acceptance/wave10/m6/ARCHIVE.json`。

本次主要证据：

- `docs/acceptance/wave10/m6/receipts/2026-11-06T06-26-20.817Z-34072-baseline-result.json`。
- `docs/acceptance/wave10/m6/receipts/2026-11-06T06-29-05.054Z-27628-browser-result.json`，包括失败堆栈、两次干净状态与源码摘要。
- 同前缀 `browser-source-0.txt` 至 `browser-source-22.txt` 为检查器捕获的原产品/测试字节，不是本次实现。

归档器也纳入了开工前已存在的 `2026-11-05T08-18-39.569Z-5740-baseline-result.json` 与 `2026-11-06T05-55-27.055Z-10824-baseline-result.json`。它们属于历史记录，不算本次运行。archive 自身回执保留在 `.local/checks/WATER-W10-M6/2026-11-06T06-30-03.316Z-36680-archive-result.json`，未手工复制入证据目录。

归档后独立复算全部 27 份索引条目的长度和 SHA-256，全部一致，共 321,307 字节。`git diff --exit-code 06d266d1483b7ab210dd2c492d39a2511a134abe -- apps/water/ui` 返回 0。全量 `git diff --cached --check` 对归档中保留 CRLF 的源码快照报告尾随空白；这些是原字节证据，未作格式改写。本回执单独做空白检查。

## 阅读与未完成事项

已读工单、执行者规则、UI-M35 全文、ADR-018、ADR-019、设计 v3 DESIGN 全文及令牌；已核对项目工作规则与启动资料。为查清预读入口，提前只读检查器、浏览器 helper 与原浏览器测试的启动片段，没有修改这些文件。首次启动资料批量读取存在输出截断，不能声称所有历史状态条目均已逐字阅读。

“先读”停在设计 v3 浏览器预览之前：十一屏没有在浏览器打开，十一张设计截图也未完成逐张查看；v2 规则、其余 IPC 契约/夹具及全部产品代码尚未按后续顺序读完。

- SPEC 第 1～5 节：未实现；没有省略或替换任何界面字段或图表。
- SPEC 第 6～7 节：未改测试、未改旧断言；25 张产品截图均未生成，因此没有逐张设计差异结论。
- SPEC 第 8 节：三条负控均未运行，无恢复哈希或有效负控声明。
- `check`、`test`、三个 final 均未运行；本次失败的 `browser` 不是浏览器测试红灯或有效负控。
- 实际启动浏览器 0、原生窗口 0、选择框 0；没有本次自有后台进程。
- 未读取真实用户数据，未扫描或清理真实文件，未造删除夹具，未下载、联网查资料或运行 Cargo。
- 未 push、merge、改写历史、修改 Git 配置、契约、设计稿、台账或其它包；没有产品实现与平台验收结论。
