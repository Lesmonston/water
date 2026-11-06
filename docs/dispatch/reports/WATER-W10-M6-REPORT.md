WATER-W10-M6 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w10-m6/docs/dispatch/reports/WATER-W10-M6-REPORT.md

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

## 补单 02（2026-11-06）：历史交回内容的 UTF-8 补写

本节按原交回内容恢复中文，描述当时的实现与验证。后续总控验收结论为 REWORK：两处卡死、七处小错、三处视觉问题及回执编码问题由补单 03 处理，不能把本节的单票门禁通过理解为总控验收通过。

### 提交与实现范围

执行者为 Codex（会话提供的模型标识 GPT-6，具体快照未提供），没有子代理。从 e63161cfa0957be3e72ce7975783fcaa305d5bc7 续做。产品提交 ef33016405dda2c97a77e3b4b87c6e35e9982aa4；测试修订提交 7eccdb3d3c34496e9e47337f4d80d054936d1f4a、8c9f4c11089ee6f06b997aef901419284703e502。最终受测提交为 8c9f4c11，交回回执与证据提交为 3d5e01a7。只改 UI、回执及 archive 证据，不改契约、设计稿、检查器、其它包、台账或远端。

### SPEC 逐节结论（历史）

| 节 | 当时完成的内容 |
|---|---|
| 1 | 原生 ES 模块、单一 app.mjs 入口、零 npm。v3 tokens 原样复制，SHA-256 为 2850d65eb9e51eedcfc319850ce92b000184f39766499aa7d84de757223f2697。IPC 扩展到 36 命令，显示路径不作为参数，格式与比例使用 BigInt。 |
| 2 | 顶部四导航、设置四子页、旧地址重定向与旧 #/ 前缀兼容。体检内切换进度、结论、明细、清理、完成、查重；每页至多一张黑色主卡。 |
| 3 | 首页位置选择、新文件夹单选；决定后整份结论替换；抽屉汇总/单项/搜索；确认两种模式；隔离区还原/冲突/二次删除；趋势、记录、设置、查重接线。 |
| 4 | v3 小圆角、天蓝数据、柠檬绿选中与橙红危险样式；菜单方向键、Esc、卡片 Enter/Delete、对话框 Tab 与 reduced-motion。 |
| 5 | 保留冻结页面文案；设置、重新体检图标具备相同的 aria-label 和 title。 |
| 6 | 三份冻结 JSON 顶层叠加；假宿主只在测试中，未把演示数据放入产品。后两次测试修订对齐确认预览、查重预览和余项 AppState。 |
| 7 | 指定三个单元与六个浏览器测试通过，生成 25 张截图，逐张对照设计。 |
| 8 | 三条指定负控命中目标断言，逐条恢复后 browser 及 test 变绿；最终 proofAudit 通过。 |

补单 02 明确的单项跳过规则已实现：卡片忽略 skip，r: 行和 m: 合并行只有展开；小组逐项行用 row_id，展开项用 item_id。没有循环调用跳过整组，也没有由显示路径推导父目录。

### 逐屏数字来源、图表省略与替换（历史）

| 屏 | 处理 |
|---|---|
| home | 容量来自 drives；只画已用/可用，不把上次推荐量算成当前磁盘构成。D/E/F 独立展示；历史点来自 trends.points，未补满三十天或虚构清理标记。省略具体满盘日期。 |
| scan | 使用 percent、visited_entries、found_bytes、elapsed_ms、locations；省略 ETA、逐位置耗时与百分比。位置方块条表示发现体量占比，竖线仅取本次实际收到的采样。 |
| results | 页头使用 delete_bytes、chosen_bytes、plan.bytes，summary_zh 原样显示。不显示缺失的独立“比上次”数和“这次看到 56.1 GB”；条与树图使用 categories/cards 各自 bytes，没有从证据文字推算分项小图。 |
| drawer | 示例为 Codex；主数来自 total_bytes，条形来自 eligible_bytes/total_bytes。没有当前组已选合计字段，底部明确显示整个 plan.bytes。 |
| confirm | total_bytes/delete/chosen/expected_skip 直接显示；样例为 19.0 GB，设计 v3 为 16.9 GB，不自行合并或计算。 |
| done | 使用 freed_bytes、quarantined.bytes、estimate_bytes；省略未提供的跳过体量和新的满盘日期。圆表用 total/free_before/free_after，各组结果替代不存在的类别合计。 |
| quarantine | 五批按服务顺序全部显示；不把首卡冒称为最早。days 和 view.bytes 原样显示；省略历史累计移入图，现存卡 bytes 不能证明原始移入量。 |
| trends | 只用已有 points 与 forecast 画图，不虚构历史日值或簇的小曲线。省略具体日期、来源拆分、上次清理量；当时对无预测/非正值的错误显示由补单 03 修正。 |
| history | 不算累计释放、月/类别合计或最多一次。按条使用 HistoryEntry.bytes，同日取最深等级，提示列出各条、不相加；当时 UTC 分天问题由补单 03 修正。 |
| settings | 七类开关和所有 SessionTool；省略无字段的类别体量条、无 IPC 的打开记录文件夹。会话显示 bytes/largest_bytes/retention_zh；声明只显示已有条目与保护数量。 |
| dedupe | 树图用 size，整体多余量/已选量用 extra_bytes/chosen_bytes；省略结果接口未提供的文件总数及耗时，不在产品内把 size 乘份数补造数字。 |

### 旧断言改动（历史）

1. ui_format_bytes_time 保持不变，format.mjs 当时也未修改；大整数、负值、日期及原曲线断言保留。
2. 按 UI-M35 第 7 节授权，将整个 ui_selection_rules 替换为 ui_v2_view_rules：原本地选择树、排序及合计断言改为服务顺序、路由、搜索、单项身份规则。
3. 按同节授权，旧五个浏览器测试（含 ui_m1_polish）整体替换为指定六个 ui_v2_*；读取 v1 DESIGN 的 polish 断言删除。
4. ui_ipc_boundary 的命令数从 19 改为 36，导出集合由原 19 个 cases 扩展为原 cases 加 17 个 newCases。原命令的参数、令牌、路径拒绝和缺宿主拒绝断言保留，新增 M35 重载与校验断言。
5. 后续只修正测试内样例一致性并加断言；测试变动后重新完成全部负控，没有沿用旧 testHash 的记录。

### 当时的负控、final 与边界

| 负控 | 一处改坏 | 命中的信息 |
|---|---|---|
| nc1 | viewCards 按 bytes 降序 | UI_V2_CONCLUSION: preserve all card order, never resort by bytes |
| nc2 | prepare 缺省 quarantine 改为 delete | UI_V2_CONFIRM: initial request defaults to quarantine |
| nc3 | 搜索 query 改为 display_path | UI_IPC_NO_PATH: search sends query only, never display_path |

当时最终 red 回执分别为 08-49-43.393Z-29108、08-50-30.149Z-37484、08-51-18.020Z-31648（完整文件名前缀均为 2026-11-06T，后缀为对应 red-ncN-result.json）。每条用 git checkout 恢复原字节，再 browser、test；原检查器只把 test 的绿色记录纳入 proofAudit，故补跑单元门。nc3 的路径被 IPC 层拒绝，没有声称已经穿透宿主。

当时恢复后 model.mjs SHA-256 为 ba16dbd24d01cd47a5f01acda1cd8502d48ce8b7148aaca2d43df6f4d8b7ee1e，app.mjs 为 31a5d2157ec3157059e379a2ccd5fae029d440cd2d2baeafe60e3e841437abb9。三个 final 的 productionHash 为 11f22e1be6278a18f824477bef5b712e0350890647905f002090e7b22c18ac2e，testHash 为 d8bd2c32a27e6b7ad4ac0500e9d92cdb59b41f9afeff600276b7c4a4bc808a65。该 productionHash 包含当时混用行尾的工作树字节，不等于已消除总控后来发现的审计差异。

当时 check、test、browser 三个 final 均 passed，单元 3/3，浏览器 6/6。归档累计 1,446 项、53,978,830 字节，原回执、源码快照和所有失败历史保留。两次早期浏览器红灯分别涉及扫描完成态误取、重试等待条件，以及新增位置后页脚覆盖按钮；后续修复后通过。真实 M5/M7 联合链路、原生窗口、macOS 和真实清理均未验证；没有真实数据操作、下载或 Cargo。

### 当时 25 张截图的差异（恢复中文）

下表恢复当时的逐张结论，链接仍指向历史 final；补单 03 的新截图在下一节。

| 截图 | 对照 | 差异 |
|---|---|---|
| [v3-home-1240x820.png](../../acceptance/wave10/m6/screenshots/2026-11-06T08-52-48.819Z-18760/v3-home-1240x820.png) | v3 home | 黑卡选位置，D/E/F 按服务顺序分为三卡；已用/可用条和已有五个历史点取代设计稿的三段构成及完整三十天曲线。 |
| [v3-home-new-1240x820.png](../../acceptance/wave10/m6/screenshots/2026-11-06T08-52-48.819Z-18760/v3-home-new-1240x820.png) | v2 home-new / v3 home | 新文件夹 denglou 单独选中，黑卡内滚动到该位置；没有复制 v2 的蓝色位置胶囊。 |
| [v3-scan-1240x820.png](../../acceptance/wave10/m6/screenshots/2026-11-06T08-52-48.819Z-18760/v3-scan-1240x820.png) | v3 scan | 进度为 62%，两张位置卡与两个实际进度采样点；没有虚构 ETA、逐位置耗时或三十六个历史点。 |
| [v3-results-1240x820.png](../../acceptance/wave10/m6/screenshots/2026-11-06T08-52-48.819Z-18760/v3-results-1240x820.png) | v3 results | 完整保留服务五张判断卡与六类开关，树图和线索在下方；页头使用删除、已选及计划量，长内容纵向滚动。 |
| [v3-results-decided-1240x820.png](../../acceptance/wave10/m6/screenshots/2026-11-06T08-52-48.819Z-18760/v3-results-decided-1240x820.png) | v2 results-decided / v3 results | 三张已决定卡压成带撤销的一行，仍保持服务顺序，未把未决定卡提前排序；此样例计划为 19.0 GB。 |
| [v3-results-folds-1240x820.png](../../acceptance/wave10/m6/screenshots/2026-11-06T08-52-48.819Z-18760/v3-results-folds-1240x820.png) | v2 results-folds / v3 results | 截图滚动到受保护清单，逐行展示服务内容；其它 folds 也可原位展开，没有自行生成额外归属数据。 |
| [v3-results-stale-1240x820.png](../../acceptance/wave10/m6/screenshots/2026-11-06T08-52-48.819Z-18760/v3-results-stale-1240x820.png) | SPEC 过期规则 / v3 results | 页头增加橙红过期提示，类别、判断与清理控件停用；保留原结果供查看。 |
| [v3-results-empty-1240x820.png](../../acceptance/wave10/m6/screenshots/2026-11-06T08-52-48.819Z-18760/v3-results-empty-1240x820.png) | SPEC 空状态规则 / v3 results | 没有判断卡和主清理按钮，不画空树图；0 按原格式显示为 <1 MB，仍保留受保护清单。 |
| [v3-menu-1240x820.png](../../acceptance/wave10/m6/screenshots/2026-11-06T08-52-48.819Z-18760/v3-menu-1240x820.png) | v2 menu / 补单 02 | 普通卡菜单只有查看明细，线索卡可复制已有线索；没有整组永久跳过，采用 v3 方角白色浮层。 |
| [v3-drawer-1240x820.png](../../acceptance/wave10/m6/screenshots/2026-11-06T08-52-48.819Z-18760/v3-drawer-1240x820.png) | v3 drawer | 480px 抽屉使用 Codex 四项样例而非 Jest；三项勾选、一项在用；底部显示整体计划，不冒充不存在的组内已选合计。 |
| [v3-drawer-big-1240x820.png](../../acceptance/wave10/m6/screenshots/2026-11-06T08-52-48.819Z-18760/v3-drawer-big-1240x820.png) | v2 drawer-big / v3 drawer | 8,470 项由服务汇总为六行，保留 Teams 解除条件；r: 行仅能展开，数字使用冻结样例而非旧稿的 2.0 GB。 |
| [v3-details-1240x820.png](../../acceptance/wave10/m6/screenshots/2026-11-06T08-52-48.819Z-18760/v3-details-1240x820.png) | v2 details / v3 骨架 | 一个类别/位置分段与搜索，展开一节，保留合并位置及未变化折叠；清理操作放右侧黑卡，完整清单可滚动。 |
| [v3-confirm-1240x820.png](../../acceptance/wave10/m6/screenshots/2026-11-06T08-52-48.819Z-18760/v3-confirm-1240x820.png) | v3 confirm | 600px 居中白框覆盖已决定的结论，默认隔离；样例是三条删除类别、两项自选和 19.0 GB，比设计稿内容更多。 |
| [v3-confirm-direct-1240x820.png](../../acceptance/wave10/m6/screenshots/2026-11-06T08-52-48.819Z-18760/v3-confirm-direct-1240x820.png) | v2 confirm-direct / v3 confirm | 直接删除选项黑色描边，主按钮为橙红并写删除 19.0 GB；切换重新 prepare。 |
| [v3-done-1240x820.png](../../acceptance/wave10/m6/screenshots/2026-11-06T08-52-48.819Z-18760/v3-done-1240x820.png) | v3 done | 已释放 15.0 GB、隔离 3.6 GB；两盘圆表带腾出区段，按组结果替代类别合计，没有推算新的满盘日期。 |
| [v3-quarantine-1240x820.png](../../acceptance/wave10/m6/screenshots/2026-11-06T08-52-48.819Z-18760/v3-quarantine-1240x820.png) | v3 quarantine | 完整保留五批，未重排成设计稿三批；首卡为黑卡但不冒称最早，每个隔离根都有打开入口。 |
| [v3-quarantine-leftover-1240x820.png](../../acceptance/wave10/m6/screenshots/2026-11-06T08-52-48.819Z-18760/v3-quarantine-leftover-1240x820.png) | SPEC 余项规则 / v3 quarantine | 两批合计 12 MB，与导航一致；保留占用、保留名原因和重试操作，使用小方块条以容纳原因文字。 |
| [v3-dedupe-menu-1240x820.png](../../acceptance/wave10/m6/screenshots/2026-11-06T08-52-48.819Z-18760/v3-dedupe-menu-1240x820.png) | v2 dedupe-menu / v3 home | 从黑色位置卡的 E 盘菜单进入查重，菜单向上展开避免裁切，不自动开始读取内容。 |
| [v3-dedupe-intro-1240x820.png](../../acceptance/wave10/m6/screenshots/2026-11-06T08-52-48.819Z-18760/v3-dedupe-intro-1240x820.png) | v2 dedupe-intro / v3 浮层 | 保留读内容说明和开始查重按钮；省略接口没有的以这里为准文件夹选择及额外筛选。 |
| [v3-dedupe-1240x820.png](../../acceptance/wave10/m6/screenshots/2026-11-06T08-52-48.819Z-18760/v3-dedupe-1240x820.png) | v3 dedupe | 使用六组冻结音频样例和 4.0 GB 所选量；树图面积用 size，全部六行保留，建议保留路径仅显示。 |
| [v3-trends-1240x820.png](../../acceptance/wave10/m6/screenshots/2026-11-06T08-52-48.819Z-18760/v3-trends-1240x820.png) | v3 trends | C 盘约 23 天预测、实际历史点与空心预测点；三种簇状态全部显示，没有虚构每个簇的每日曲线。 |
| [v3-history-1240x820.png](../../acceptance/wave10/m6/screenshots/2026-11-06T08-52-48.819Z-18760/v3-history-1240x820.png) | v3 history | 仅显示样例实际覆盖日期的热力格子；逐条记录条形取代累计分类条，黑卡列清理记录，不计算累计释放量。 |
| [v3-settings-1240x820.png](../../acceptance/wave10/m6/screenshots/2026-11-06T08-52-48.819Z-18760/v3-settings-1240x820.png) | v3 settings | 七个扫描开关、完整会话工具和隐私卡；缺失的类别体量图省略，天数用原生 7/30/90 选择框，不增加打开日志命令。 |
| [v3-settings-decl-1240x820.png](../../acceptance/wave10/m6/screenshots/2026-11-06T08-52-48.819Z-18760/v3-settings-decl-1240x820.png) | v2 settings-decl / v3 settings | 每份声明显示可清条目、状态、保护计数与信任操作；不臆造未提供的受保护路径，invalid 不能信任。 |
| [v3-home-narrow-1040x720.png](../../acceptance/wave10/m6/screenshots/2026-11-06T08-52-48.819Z-18760/v3-home-narrow-1040x720.png) | v3 home 的窄屏适配 | 1040×720 圆表缩在卡内，主按钮可见；位置列表滚动，页面不横向溢出。 |

### 当时所有检查命令与结果

完整前缀为 node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W10-M6，后接下表参数。red 的 passed 表示按预期观察到内部测试退出 1；普通 passed 为退出 0，failed 的 browser 为退出 1。共 37 次检查、23 次串行浏览器门，每次一个私有无头浏览器。

| 参数 | 结果 | 回执文件 |
|---|---|---|
| --mode check | passed | 2026-11-06T08-06-50.702Z-20772-check-result.json |
| --mode test | passed | 2026-11-06T08-07-55.074Z-22984-test-result.json |
| --mode browser | failed | 2026-11-06T08-12-14.227Z-34896-browser-result.json |
| --mode browser | failed | 2026-11-06T08-14-54.640Z-33344-browser-result.json |
| --mode browser | passed | 2026-11-06T08-17-19.752Z-35028-browser-result.json |
| --mode browser | passed | 2026-11-06T08-21-54.488Z-12436-browser-result.json |
| --mode browser | passed | 2026-11-06T08-26-41.587Z-23200-browser-result.json |
| --mode check | passed | 2026-11-06T08-29-12.621Z-15488-check-result.json |
| --mode test | passed | 2026-11-06T08-29-16.054Z-31116-test-result.json |
| --mode browser | passed | 2026-11-06T08-29-18.349Z-4200-browser-result.json |
| --mode red-nc1 | passed | 2026-11-06T08-34-01.648Z-31480-red-nc1-result.json |
| --mode browser | passed | 2026-11-06T08-36-30.370Z-37572-browser-result.json |
| --mode test | passed | 2026-11-06T08-36-53.584Z-34320-test-result.json |
| --mode browser | passed | 2026-11-06T08-37-50.002Z-15568-browser-result.json |
| --mode red-nc1 | passed | 2026-11-06T08-38-48.142Z-26168-red-nc1-result.json |
| --mode browser | passed | 2026-11-06T08-39-57.388Z-3812-browser-result.json |
| --mode test | passed | 2026-11-06T08-40-17.654Z-35256-test-result.json |
| --mode red-nc2 | passed | 2026-11-06T08-41-21.868Z-36288-red-nc2-result.json |
| --mode browser | passed | 2026-11-06T08-42-42.556Z-30096-browser-result.json |
| --mode test | passed | 2026-11-06T08-43-03.142Z-10144-test-result.json |
| --mode red-nc3 | passed | 2026-11-06T08-43-58.041Z-28796-red-nc3-result.json |
| --mode browser | passed | 2026-11-06T08-46-19.784Z-35804-browser-result.json |
| --mode test | passed | 2026-11-06T08-46-40.170Z-13880-test-result.json |
| --mode browser | passed | 2026-11-06T08-47-32.067Z-32852-browser-result.json |
| --mode red-nc1 | passed | 2026-11-06T08-49-43.393Z-29108-red-nc1-result.json |
| --mode browser | passed | 2026-11-06T08-50-03.675Z-37804-browser-result.json |
| --mode test | passed | 2026-11-06T08-50-26.473Z-18348-test-result.json |
| --mode red-nc2 | passed | 2026-11-06T08-50-30.149Z-37484-red-nc2-result.json |
| --mode browser | passed | 2026-11-06T08-50-51.793Z-25716-browser-result.json |
| --mode test | passed | 2026-11-06T08-51-14.211Z-12060-test-result.json |
| --mode red-nc3 | passed | 2026-11-06T08-51-18.020Z-31648-red-nc3-result.json |
| --mode browser | passed | 2026-11-06T08-51-41.752Z-36012-browser-result.json |
| --mode test | passed | 2026-11-06T08-52-04.190Z-18632-test-result.json |
| --mode check --final | passed | 2026-11-06T08-52-42.808Z-37792-check-result.json |
| --mode test --final | passed | 2026-11-06T08-52-46.424Z-31736-test-result.json |
| --mode browser --final | passed | 2026-11-06T08-52-48.819Z-18760-browser-result.json |
| --mode archive | passed | 2026-11-06T08-53-09.612Z-30672-archive-result.json |

## 补单 03（2026-11-06）：本次完成回执

### 提交、模型与范围

本次从 3d5e01a7f593c73a27e57b968d4d11f5174ff91e 续做，分支 worker/water-w10-m6，开工时干净。已按顺序读原单、补单 01/02/03、原回执及总控验收第 12 节。执行者仍为 Codex（会话提供的模型标识 GPT-6，具体快照未提供）；没有子代理。

**实现与测试提交：31fd786d43808db3972aa42cc198fec33f8b4f34。** 三个 final 均绑定该干净提交。之后仅重写本回执与提交 archive 证据，未再改变产品或测试。未改契约、设计稿、样例、检查器、其它包、台账、Git 配置或远端；没有 push、merge 或历史改写。

### 逐项修复及测试

| 补单条目 | 实现 | 新断言与结果 |
|---|---|---|
| 1.1 轮询暂停 | 提示条和重新连接入口直接跟随 pollPaused；暂停原因独立保留。scan_cancel、clean_stop、dedupe_cancel 成功后调用共同恢复逻辑重新轮询。 | home_scan 覆盖进度失败、切页、停止失败、再次停止到结束；confirm_done 覆盖清理暂停后导航与停止；quarantine_dedupe 覆盖查重停止、永久删除暂停后切页和重连。均通过。 |
| 1.2 返回路径 | 查重结果新增次要“返回”；空闲查重/完成状态点击体检导航使用相同退出流程。有缓存结论回结论，没有则读一次，not_found 回可操作首页；完成按钮强制重读结论。 | 有/无结论分别测试返回和导航；完成页两个出口分别测试 not_found 无错误回首页。均通过。 |
| 2.1 stale 作用域 | run 按命令所属结果处理过期。查重的 stale 重读 dedupe_result(id,false)，关闭过期预览但不改结论；重读失败回首页并提示“查重结果已失效，请重新查重”。 | 分别让 dedupe_decide 和查重 clean_prepare 返回 stale，确认重新读取且缓存结论清理按钮仍可用；再测重读 not_found。通过。 |
| 2.2 类别设置 | 移除 categories 设置成功后的 markStale；会话、信任及跳过名单的失效逻辑不变。 | 切浏览器类别开关后回到原结论，清理按钮仍可用。通过。 |
| 2.3 查重组数 | 有 more 时标题使用“找到重复文件”，保留 more.text_zh；没有 more 才使用 groups.length，不与 more.count 相加。 | v2_dedupe_result_more 的标题不出现“8 组”，并显示原样 more 文案。通过。 |
| 2.4 趋势数值 | days_to_full 为 null 或 bytes_per_day 非正时不画消耗格、页头消耗数或相关预测；显示 note_zh，未改成零。 | 原 F 盘和一个有 days_to_full 但日均为负的内存变体均不出现 F 盘消耗格，原因可见。通过。 |
| 2.5 复制缺失线索 | 先在当前 clues 查到对象才加入卡片复制菜单，不再用空串兜底。 | 去掉卡片关联线索后菜单无复制项，剪贴板调用为零。通过。 |
| 2.6 本地日历 | format.mjs 新增 localDateKey，使用与 dateTime 相同的本地年月日；热力图按本地午夜分组、按 setDate 跨天，不按 UTC 截字符串。 | CDP 控制测试页时区，构造跨 UTC/本地日界线记录；期望日期由页面导入产品同一个函数计算。通过，不依赖机器时区，也未修改系统时区。 |
| 2.7 迟到列表 | 隔离区视图增加修订号。还原安装新视图、永久删除启动及完成更新会使旧读取失效；loadRoute/revealRoots 丢弃旧回复。 | 假宿主挂起再次进入时的列表，先还原为空，再释放旧五卡回复；页面仍为空。通过。 |
| 3.1 根按钮 | 根打开按钮从 display_path 提取盘符，写为“打开 C 盘隔离区”等；IPC 仍只传 targetId。 | 对每个根逐一核对按钮文案；原只发编号断言保留。通过。 |
| 3.2 树图名称 | 放不下名称的块用编号关联图下可见名称；不改面积或列表顺序，共用树图同时改善结论页。 | 断言剔除 SVG title 后仍能找到原窄块名称，防止只有 tooltip 的假通过；截图已看。 |
| 3.3 窄屏滚动条 | location-list 设置 thin 与 v3 中性色，并有 WebKit 细滚动条样式。 | 1040×720 计算样式为 thin，原无横向溢出断言保持；截图已看。 |

### 原 SPEC 与安全边界保持

原 SPEC 第 1～2 节的 v3 tokens、ES 模块、36 命令、只发 ID、服务决定列表和计划、页面骨架不变；第 3～5 节按本补单修正状态流、文案和少量样式；第 6 节只在测试内构造变体；第 7～8 节仍是三个单元、六个浏览器测试、25 张截图、三条负控。没有新接口、依赖、生产测试开关或真实文件操作。

本补单没有改动原断言：对照起点逐行核验，浏览器原有 91 行含断言代码和单元原有 82 行含断言代码全部仍在，缺失为零；单元测试文件没有改动。新增断言均放进指定测试，不改名、不跳过、不提高等待上限。假宿主只新增缺失结论、缺失线索、受控时区数据、命令失败及挂起列表回复等测试情形。

先在旧产品上运行新增测试，五个浏览器测试以新标记失败，原抽屉测试通过；这份失败记录保留。修复后原断言和新断言全部通过，随后增加查重/永久删除暂停的补充场景再验证。该初始失败是回归取证，不冒充三条正式负控。

### 行尾、编码与回执补写

执行过票面要求的 git checkout，随后比较 index.html、styles/app.css 与 git cat-file --filters HEAD:<path> 的检出字节，发现 Git 没有重写已按内容判定干净的旧行尾。先断言差异仅为 CRLF/LF，再按 Git 输出的原始 Buffer 写回两文件并刷新索引；没有逻辑变化或新增源提交。final 前再次 checkout、逐字节比较和 git status 核对全部通过。MJS 恢复也按提交字节进行。

原回执损坏的补单 02 段已用 apply_patch 直接写回 UTF-8，未经过 PowerShell 到 Node 的文本管道；原单及补单 01 内容保留。原补单 02 的提交、数字来源、旧断言变更、25 张历史截图差异及 37 次检查表都已恢复。本文补单 03 另给出本次新 25 张截图。

提交前用 Node TextDecoder 的 UTF-8 严格模式读回**整份**回执，检查连续问号和 Unicode 替换字符均为零，并分段读取正文确认中文正常。辅助断言比对命令第一次因 PowerShell 参数引号失败，未写文件；修正命令参数后核对通过。没有把这一辅助命令错误记成产品测试失败。

### 本次负控与原字节恢复

| 负控 | 唯一临时改动 | 失败信息 | red 回执 |
|---|---|---|---|
| nc1 | model.mjs 中 viewCards 重新按体量排序 | UI_V2_CONCLUSION: preserve all card order, never resort by bytes | 2026-11-06T10-32-52.011Z-22404-red-nc1-result.json |
| nc2 | app.mjs 中 prepare 缺省改为 delete | UI_V2_CONFIRM: initial request defaults to quarantine | 2026-11-06T10-34-07.532Z-34396-red-nc2-result.json |
| nc3 | app.mjs 中搜索 query 改为第一项 display_path | UI_IPC_NO_PATH: search sends query only, never display_path | 2026-11-06T10-35-21.785Z-19004-red-nc3-result.json |

每条只改一个实际调用的生产位置，不改测试；随后立即 git checkout 单文件恢复，browser 六测变绿，再补 test 三测供现有 proofAudit 核验。nc3 被 IPC 参数校验拦住，浏览器验证合法搜索不能误用显示路径，不声称路径已送达宿主。全部负控命中目标而非语法错误或超时。

恢复后 model.mjs SHA-256：ba16dbd24d01cd47a5f01acda1cd8502d48ce8b7148aaca2d43df6f4d8b7ee1e。
恢复后 app.mjs SHA-256：4a914d68e1fe9ce6795af38e73fc5362d8379f0f0f9cd7a4395f14604d770556。
三个 final 的共同 productionHash：3e12830a49d36e15343669c183136e46e5ebed5c6c3dd1c490740cff0b4b82a3。
共同 testHash：03316ad3f26b756291a341db09372a85fbaea0f9f1695dd5f1b7dfd19b4f2da3。

最终 test 回执列出三条匹配的 red 与 restored 记录，恢复记录分别为 2026-11-06T10-34-03.536Z-36544-test-result.json、2026-11-06T10-35-18.613Z-12412-test-result.json、2026-11-06T10-36-36.693Z-24180-test-result.json；各自前面均有立即恢复后的 browser 绿色记录。

### 最终门、归档与全部命令

- check --final：passed，2026-11-06T10-37-23.796Z-7028-check-result.json。
- test --final：passed，3/3，2026-11-06T10-37-28.094Z-35288-test-result.json，三项 proofAudit 通过。
- browser --final：passed，6/6，2026-11-06T10-37-31.290Z-35664-browser-result.json，恰好 25 张 PNG。
- archive：passed，2026-11-06T10-38-14.249Z-18616-archive-result.json。索引累计 2,113 项、80,106,651 字节，已独立逐项复算长度和 SHA-256，全部一致。
- 最终 PNG：24 张 1240×820、一张 1040×720。目录为 docs/acceptance/wave10/m6/screenshots/2026-11-06T10-37-31.290Z-35664/。
- archive 本次自身回执在 .local/checks/WATER-W10-M6/，不会被同一次 archive 复制自身；没有手工改动归档证据。
- 没有重跑要求原首次 HEAD 的 baseline。本次共 18 次检查模式，其中 10 次串行浏览器门，每次仅一个私有无头浏览器。

以下均从指定工作树根执行，前缀为：

    node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W10-M6

red 模式的 passed 表示预期的内部测试退出 1 已观察到；其余 passed 模式退出 0。初次 browser 的 failed 退出 1，记录如实保留。

| 参数 | 结果 | 回执文件 |
|---|---|---|
| --mode browser | failed | 2026-11-06T10-15-13.479Z-30480-browser-result.json |
| --mode check | passed | 2026-11-06T10-21-49.423Z-35084-check-result.json |
| --mode test | passed | 2026-11-06T10-21-53.084Z-31248-test-result.json |
| --mode browser | passed | 2026-11-06T10-21-55.376Z-27872-browser-result.json |
| --mode browser | passed | 2026-11-06T10-26-23.908Z-16664-browser-result.json |
| --mode red-nc1 | passed | 2026-11-06T10-32-52.011Z-22404-red-nc1-result.json |
| --mode browser | passed | 2026-11-06T10-33-26.867Z-27812-browser-result.json |
| --mode test | passed | 2026-11-06T10-34-03.536Z-36544-test-result.json |
| --mode red-nc2 | passed | 2026-11-06T10-34-07.532Z-34396-red-nc2-result.json |
| --mode browser | passed | 2026-11-06T10-34-42.092Z-23688-browser-result.json |
| --mode test | passed | 2026-11-06T10-35-18.613Z-12412-test-result.json |
| --mode red-nc3 | passed | 2026-11-06T10-35-21.785Z-19004-red-nc3-result.json |
| --mode browser | passed | 2026-11-06T10-35-58.725Z-21020-browser-result.json |
| --mode test | passed | 2026-11-06T10-36-36.693Z-24180-test-result.json |
| --mode check --final | passed | 2026-11-06T10-37-23.796Z-7028-check-result.json |
| --mode test --final | passed | 2026-11-06T10-37-28.094Z-35288-test-result.json |
| --mode browser --final | passed | 2026-11-06T10-37-31.290Z-35664-browser-result.json |
| --mode archive | passed | 2026-11-06T10-38-14.249Z-18616-archive-result.json |

### 本次逐屏数据来源与省略

补单 02 表中的十一屏字段来源继续适用，未新增数值接口：home 仍用 drives/points；scan 用实际进度；results 用 plan/cards；drawer 底部仍是整体计划；confirm 用预览；done 用释放与隔离结果；quarantine 用原卡；dedupe 用 size 与 extra/chosen bytes；settings 用原 Locations。具体变化是 trends 不再给无预测或非正值补零，history 改为本地日历归组；树图可见标签只引用同一条目的 title，不增加或重算体量。缺失的 ETA、历史累计、类别历史、组内选择合计和新的满盘日期仍省略，不从说明文字反推。

### 本次 25 张截图逐张差异

以下 PNG 均已在本次 final 后逐张打开查看，按 v3 十一屏及 v2 对应状态对照。设计预览含外部留白，应用截图是实际视口；没有宣称逐像素相同。列表全部保留，因此五张判断卡、五批隔离记录等比设计稿样例多的内容允许纵向滚动。

| 截图 | 对照 | 差异 |
|---|---|---|
| [v3-home-1240x820.png](../../acceptance/wave10/m6/screenshots/2026-11-06T10-37-31.290Z-35664/v3-home-1240x820.png) | v3 home | 黑卡选位置，D/E/F 按服务顺序分为三卡；已用/可用条和已有五个历史点取代设计稿的三段构成及完整三十天曲线。 本轮位置列表使用细滚动条；其余布局和数据来源保持。 |
| [v3-home-new-1240x820.png](../../acceptance/wave10/m6/screenshots/2026-11-06T10-37-31.290Z-35664/v3-home-new-1240x820.png) | v2 home-new / v3 home | 新文件夹 denglou 单独选中，黑卡内滚动到该位置；没有复制 v2 的蓝色位置胶囊。 本轮新增位置可见且采用细滚动条，系统盘等其它位置未误选。 |
| [v3-scan-1240x820.png](../../acceptance/wave10/m6/screenshots/2026-11-06T10-37-31.290Z-35664/v3-scan-1240x820.png) | v3 scan | 进度为 62%，两张位置卡与两个实际进度采样点；没有虚构 ETA、逐位置耗时或三十六个历史点。 本轮视觉保持；相关状态流修复另由新增交互断言覆盖。 |
| [v3-results-1240x820.png](../../acceptance/wave10/m6/screenshots/2026-11-06T10-37-31.290Z-35664/v3-results-1240x820.png) | v3 results | 完整保留服务五张判断卡与六类开关，树图和线索在下方；页头使用删除、已选及计划量，长内容纵向滚动。 本轮视觉保持；相关状态流修复另由新增交互断言覆盖。 |
| [v3-results-decided-1240x820.png](../../acceptance/wave10/m6/screenshots/2026-11-06T10-37-31.290Z-35664/v3-results-decided-1240x820.png) | v2 results-decided / v3 results | 三张已决定卡压成带撤销的一行，仍保持服务顺序，未把未决定卡提前排序；此样例计划为 19.0 GB。 本轮视觉保持；相关状态流修复另由新增交互断言覆盖。 |
| [v3-results-folds-1240x820.png](../../acceptance/wave10/m6/screenshots/2026-11-06T10-37-31.290Z-35664/v3-results-folds-1240x820.png) | v2 results-folds / v3 results | 截图滚动到受保护清单，逐行展示服务内容；其它 folds 也可原位展开，没有自行生成额外归属数据。 本轮共用树图为放不下的标签补了编号和可见图外名称。 |
| [v3-results-stale-1240x820.png](../../acceptance/wave10/m6/screenshots/2026-11-06T10-37-31.290Z-35664/v3-results-stale-1240x820.png) | SPEC 过期规则 / v3 results | 页头增加橙红过期提示，类别、判断与清理控件停用；保留原结果供查看。 本轮视觉保持；相关状态流修复另由新增交互断言覆盖。 |
| [v3-results-empty-1240x820.png](../../acceptance/wave10/m6/screenshots/2026-11-06T10-37-31.290Z-35664/v3-results-empty-1240x820.png) | SPEC 空状态规则 / v3 results | 没有判断卡和主清理按钮，不画空树图；0 按原格式显示为 <1 MB，仍保留受保护清单。 本轮视觉保持；相关状态流修复另由新增交互断言覆盖。 |
| [v3-menu-1240x820.png](../../acceptance/wave10/m6/screenshots/2026-11-06T10-37-31.290Z-35664/v3-menu-1240x820.png) | v2 menu / 补单 02 | 普通卡菜单只有查看明细，线索卡可复制已有线索；没有整组永久跳过，采用 v3 方角白色浮层。 本轮只有当前 clues 中确实存在的线索才显示复制入口；截图中的普通卡仍只有查看明细。 |
| [v3-drawer-1240x820.png](../../acceptance/wave10/m6/screenshots/2026-11-06T10-37-31.290Z-35664/v3-drawer-1240x820.png) | v3 drawer | 480px 抽屉使用 Codex 四项样例而非 Jest；三项勾选、一项在用；底部显示整体计划，不冒充不存在的组内已选合计。 本轮视觉保持；相关状态流修复另由新增交互断言覆盖。 |
| [v3-drawer-big-1240x820.png](../../acceptance/wave10/m6/screenshots/2026-11-06T10-37-31.290Z-35664/v3-drawer-big-1240x820.png) | v2 drawer-big / v3 drawer | 8,470 项由服务汇总为六行，保留 Teams 解除条件；r: 行仅能展开，数字使用冻结样例而非旧稿的 2.0 GB。 本轮视觉保持；相关状态流修复另由新增交互断言覆盖。 |
| [v3-details-1240x820.png](../../acceptance/wave10/m6/screenshots/2026-11-06T10-37-31.290Z-35664/v3-details-1240x820.png) | v2 details / v3 骨架 | 一个类别/位置分段与搜索，展开一节，保留合并位置及未变化折叠；清理操作放右侧黑卡，完整清单可滚动。 本轮视觉保持；相关状态流修复另由新增交互断言覆盖。 |
| [v3-confirm-1240x820.png](../../acceptance/wave10/m6/screenshots/2026-11-06T10-37-31.290Z-35664/v3-confirm-1240x820.png) | v3 confirm | 600px 居中白框覆盖已决定的结论，默认隔离；样例是三条删除类别、两项自选和 19.0 GB，比设计稿内容更多。 本轮视觉保持；相关状态流修复另由新增交互断言覆盖。 |
| [v3-confirm-direct-1240x820.png](../../acceptance/wave10/m6/screenshots/2026-11-06T10-37-31.290Z-35664/v3-confirm-direct-1240x820.png) | v2 confirm-direct / v3 confirm | 直接删除选项黑色描边，主按钮为橙红并写删除 19.0 GB；切换重新 prepare。 本轮视觉保持；相关状态流修复另由新增交互断言覆盖。 |
| [v3-done-1240x820.png](../../acceptance/wave10/m6/screenshots/2026-11-06T10-37-31.290Z-35664/v3-done-1240x820.png) | v3 done | 已释放 15.0 GB、隔离 3.6 GB；两盘圆表带腾出区段，按组结果替代类别合计，没有推算新的满盘日期。 本轮完成按钮及体检导航可退出；conclusion_get 的 not_found 回首页，外观保持。 |
| [v3-quarantine-1240x820.png](../../acceptance/wave10/m6/screenshots/2026-11-06T10-37-31.290Z-35664/v3-quarantine-1240x820.png) | v3 quarantine | 完整保留五批，未重排成设计稿三批；首卡为黑卡但不冒称最早，每个隔离根都有打开入口。 本轮两个根按钮明确写成打开 C 盘隔离区、打开 F 盘隔离区，参数仍只发 targetId。 |
| [v3-quarantine-leftover-1240x820.png](../../acceptance/wave10/m6/screenshots/2026-11-06T10-37-31.290Z-35664/v3-quarantine-leftover-1240x820.png) | SPEC 余项规则 / v3 quarantine | 两批合计 12 MB，与导航一致；保留占用、保留名原因和重试操作，使用小方块条以容纳原因文字。 本轮同样写明 C/F 盘；迟到列表不会把已还原或删除后的视图盖回去。 |
| [v3-dedupe-menu-1240x820.png](../../acceptance/wave10/m6/screenshots/2026-11-06T10-37-31.290Z-35664/v3-dedupe-menu-1240x820.png) | v2 dedupe-menu / v3 home | 从黑色位置卡的 E 盘菜单进入查重，菜单向上展开避免裁切，不自动开始读取内容。 本轮视觉保持；相关状态流修复另由新增交互断言覆盖。 |
| [v3-dedupe-intro-1240x820.png](../../acceptance/wave10/m6/screenshots/2026-11-06T10-37-31.290Z-35664/v3-dedupe-intro-1240x820.png) | v2 dedupe-intro / v3 浮层 | 保留读内容说明和开始查重按钮；省略接口没有的以这里为准文件夹选择及额外筛选。 本轮视觉保持；相关状态流修复另由新增交互断言覆盖。 |
| [v3-dedupe-1240x820.png](../../acceptance/wave10/m6/screenshots/2026-11-06T10-37-31.290Z-35664/v3-dedupe-1240x820.png) | v3 dedupe | 使用六组冻结音频样例和 4.0 GB 所选量；树图面积用 size，全部六行保留，建议保留路径仅显示。 本轮增加次要返回按钮；第四个窄块用编号 4 对应图下完整可见名称，不再仅靠悬停。 |
| [v3-trends-1240x820.png](../../acceptance/wave10/m6/screenshots/2026-11-06T10-37-31.290Z-35664/v3-trends-1240x820.png) | v3 trends | C 盘约 23 天预测、实际历史点与空心预测点；三种簇状态全部显示，没有虚构每个簇的每日曲线。 本轮 F 盘没有日均消耗字节格，改显示服务 note_zh；负值不再替换为零。 |
| [v3-history-1240x820.png](../../acceptance/wave10/m6/screenshots/2026-11-06T10-37-31.290Z-35664/v3-history-1240x820.png) | v3 history | 仅显示样例实际覆盖日期的热力格子；逐条记录条形取代累计分类条，黑卡列清理记录，不计算累计释放量。 本轮按 localDateKey 的本地日历日期分格，与列表 dateTime 一致，仍不相加。 |
| [v3-settings-1240x820.png](../../acceptance/wave10/m6/screenshots/2026-11-06T10-37-31.290Z-35664/v3-settings-1240x820.png) | v3 settings | 七个扫描开关、完整会话工具和隐私卡；缺失的类别体量图省略，天数用原生 7/30/90 选择框，不增加打开日志命令。 本轮视觉保持；相关状态流修复另由新增交互断言覆盖。 |
| [v3-settings-decl-1240x820.png](../../acceptance/wave10/m6/screenshots/2026-11-06T10-37-31.290Z-35664/v3-settings-decl-1240x820.png) | v2 settings-decl / v3 settings | 每份声明显示可清条目、状态、保护计数与信任操作；不臆造未提供的受保护路径，invalid 不能信任。 本轮视觉保持；相关状态流修复另由新增交互断言覆盖。 |
| [v3-home-narrow-1040x720.png](../../acceptance/wave10/m6/screenshots/2026-11-06T10-37-31.290Z-35664/v3-home-narrow-1040x720.png) | v3 home 的窄屏适配 | 1040×720 圆表缩在卡内，主按钮可见；位置列表滚动，页面不横向溢出。 本轮黑卡内使用 thin 滚动条并设置 v3 中性色，不再使用原宽滚动条。 |

### 没做和未验证的事

没有真实用户目录扫描、文件内容读取、文件选择框、资源管理器打开、真实清理、Cargo、下载或联网研究；测试只使用合成 IPC 数据和浏览器私有 profile。未创建删除夹具或手工删除旧目录。按补单 02，本波仍不做整组永久跳过。

未验证真实 M5/M7/Tauri/WebView 联合链路、macOS 或生产竞态的完整系统边界；本次迟到回复测试是有界的假宿主时序，不冒充真实文件系统竞态验收。没有更改总控台账、合入主线或宣告 VERIFIED。全部测试结束，交回后不再测试或运行自有后台任务。
