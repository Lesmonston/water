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

## 补单 01（2026-11-06）：预览阻塞已解除，发现整组跳过的契约缺口

本节是从 `920afafa68099da57d1d3385ca3e7585bb6bbfa7` 续做的记录；上面各节是原单历史，按补单要求保留。状态仍为**任务受阻**，原因已经变化。

### 续做核对与已完成阅读

- 实际执行者仍为 Codex（系统标识 GPT-6，具体模型快照未提供），没有子代理。
- 已按顺序读取权威原单、补单 01、自己的原回执。工作树、分支正确，续做 HEAD 为 `920afafa68099da57d1d3385ca3e7585bb6bbfa7`，开始时干净。
- 补单 01 已解除“必须先开浏览器看设计”的冲突。这次使用图片查看工具，逐张看过 v3 的 `home`、`scan`、`results`、`drawer`、`confirm`、`done`、`quarantine`、`trends`、`history`、`settings`、`dedupe` 十一张原截图，没有启动浏览器。
- 已读取 v3 mockup 的样式、图表脚本及部分页面源码；整份输出的中段被截断，未把它记作源码全部读完。v3 DESIGN、工作规则与 UI-M35 全文沿用原单已经读过的内容。
- 继续核对 v2 行为规则、IPC-M35、IPC-M3C、IPC 与旧 UI 约束，以及本次相关夹具与计划条目时，发现下述接口缺口。为核实缺口，只读查看 SERVICE-M35、HOST-M35 相关条款与既有 `skip_add` 实现。完整先读清单尚未完成，未开始产品实现。

### 新阻塞：卡片和汇总行要求“以后都跳过”，接口只有单项跳过

要求与接口的具体冲突如下（路径均相对 Water 项目根，权威文件也在主树核对过）：

| 来源 | 当前冻结内容 |
|---|---|
| `contracts/m35-v1/UI-M35.md:41`，第 3 节 3.4 行 | 每个抽屉汇总行的菜单有“以后都跳过”，命令列为 `skip_add` |
| `docs/design/water-ui-v2/DESIGN.md` 第 3.3、3.4、3.12 节 | 判断卡有“以后都跳过”；一行汇总可以整行“以后都跳过” |
| `contracts/m35-v1/IPC-M35.md:104` | `Card.menu` 的 `skip` 对应“以后都跳过”；Card 给出 `group_id`，没有条目 ID |
| `contracts/m3c-v1/IPC-M3C.md:19`、第 3 节 | `skip_add` 只收 `{itemId}`，必须是最新扫描中的单个条目；跳过只匹配该条目的完整路径，不连带上级或下级；跳过名单至多 64 条 |
| `contracts/m35-v1/IPC-M35.md` 第 1、10 节 | 原 19 个命令旧形状和语义不变；新增 17 个命令没有组级或汇总行级跳过命令，也没有扩展 `skip_add` |
| `contracts/m35-v1/IPC-M35.md:138`、第 4 节 | `group_items` 最多返回 200 项，无分页参数或游标 |
| `contracts/m35-v1/SERVICE-M35.md:40` | “原有的类别、自选位置、跳过名单不变” |
| `contracts/m35-v1/SERVICE-M35.md:135`～143 | 汇总行 ID 为 `r:` 加哈希，合并行的 row ID 为组 ID；只有一项一行的情况才是条目 ID |

**冻结样例里的具体反例**：`contracts/m35-v1/ui-fixtures-m35.json` 的 `v2_group_detail_rows` 是 `system-temp-old`，共 8,470 项，其中可选汇总行：

```text
row_id: r:f1c74035973ccb9f
label_zh: *.tmp 文件 × 6,120
count: 6120
selectable: true
expandable: true
```

这一行只给 `row_id`，没有 `item_id` 或 `item_ids`。`v2_conclusion_typical.cards` 的五张卡也都给了 `skip` 菜单，但只提供 `group_id`。

不能在现有契约下把这些操作实现为“全部以后跳过”：

1. 把 `row_id` / `group_id` 当 `itemId` 发送，会违反单项 ID 语义；既有 `packages/water-service/src/service.rs:671` 的 `add_skip()` 用 `item_index(item_id)` 查单个条目，查不到就 `invalid`，第 700 行还执行 64 条上限。
2. 先调 `group_items` 再遍历 `skip_add`，最多取得 200 项，无法取得示例中的 6,120 项；即便全拿到，也超出 64 条上限，且中途失败会留下部分跳过。
3. `conclusion_decide {row, include:false}` / `{group, choice:"keep"}` 是本次决定，不能冒充永久跳过。
4. 不能从显示路径推导父目录发送，也不能擅自把行为降级为只跳过显示的前几项。

这个缺口不是补单 01 所说的“换完令牌后旧页面暂时难看或测试变红”。它是 UI 要求与冻结 IPC/服务语义不一致；M6 仅获准改 UI，不能自行添加接口或改服务。因此依据执行者规则第 2 节“契约冲突或缺东西时写受阻回执，不要自行变通”停止。

### 最小补充需求

请总控冻结一种一致的处理方式，并同步本票相关规则和夹具：

- 范围较小的修订：本波“以后都跳过”仅出现在已经取得真实 `item_id` 的逐项菜单；卡片与汇总行只提供查看/展开入口。明确这替代 v2 的整组、整行跳过要求，并修订 Card.menu 的 `skip` 含义或样例。
- 若仍要求整组、整行永久跳过：需要给 IPC、宿主和服务补充按组/行 ID 跳过的协议，冻结版本绑定、64 条上限与原子失败语义、未来新成员是否跳过，并给对应样例与测试。M6 再消费该协议。

由总控选择并发正式补单；执行者没有自行选择产品行为，也没有向用户请求临时放宽权限。

### 本次检查、改动与未验证项

- `git status --short`：空；`git branch --show-current`：`worker/water-w10-m6`；`git rev-parse HEAD`：上述续做提交。
- Node 只读解析冻结 JSON，输出并核对上述组 ID、总项数、6,120 项汇总行、对象键集和五张卡的 `skip` 菜单；没有造夹具、没有调用服务。
- `rg` 核对 M35 契约、补单与 M3C 契约中的全部 `skip_add` / 跳过条款，未找到组级跳过扩展；只读查看服务的单项查找与 64 条拒绝分支。
- `git diff --exit-code 920afafa68099da57d1d3385ca3e7585bb6bbfa7 -- apps/water/ui`：退出码 0。
- 实现提交 SHA：无。本次仅追加这一节回执；原证据不变，没有新的正式检查器证据需要归档。
- 没有重跑要求精确首次 HEAD 的 baseline；没有运行 check、test、browser、负控、final 或 archive。
- 未进入动手阶段，因此没有换令牌、改旧断言或做半成品页面。SPEC 1～8 的产品实现、三条负控、25 张截图与逐张差异仍未完成。
- 没有浏览器、原生窗口、选择框、自有后台进程；没有扫描真实数据、删除文件、联网、下载或 Cargo。
- 没有修改契约、设计稿、台账、检查器、其它包或 Git 配置；没有 push、merge 或改写历史。
