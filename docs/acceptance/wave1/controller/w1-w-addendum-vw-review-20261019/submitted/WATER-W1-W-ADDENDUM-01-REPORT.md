WATER-W1-W 补充单01 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w/docs/dispatch/reports/WATER-W1-W-ADDENDUM-01-REPORT.md

2026-10-19。状态：SUBMITTED，等待总控独立验收。本补修复 W_DIR_BUDGET；没有自行修改主线台账、集成W或标记VERIFIED。真实V→W联合验收仍由总控后续执行。

## 基线、提交与执行范围

| 项目 | 实际值 |
|---|---|
| 原树 / 分支 | F:/new/smaltalk/water/.worktrees/w / worker/water-w1-w |
| 原共同基线 | 30a803537602211ed2a11c106c63fd27cefb260f |
| 本补首次续做HEAD | b65902d8f702bf34097adffd7fbaa7daddabe934，精确、干净 |
| 原受测实现 | 63db62b020efff4601a03da7dc561549dcb1f762 |
| 本补实现 / 全部final受测SHA | 020cd89cd592471836cca8fa5d263176348b2165 |
| 实现提交题 | fix(w): reject native reports exceeding per-directory budgets |
| 永久产品差异 | model.mjs增加8行；tests/model.test.mjs增加90行；无删除行，原断言保持 |
| 回执提交定位 | 本文件首次提交，题为 docs(w): submit addendum 01 budget evidence；父提交为上方受测SHA。用 git log -1 --format=%H -- docs/dispatch/reports/WATER-W1-W-ADDENDUM-01-REPORT.md 定位；该提交仅本报告及addendum-01证据 |
| 实际模型 | Codex，本会话系统标识为基于GPT-6；未提供更细模型版本ID，不推断变体。无子代理/分包 |
| 执行环境 | Windows x64，Node v24.16.0，已有私有headless Chrome；零新依赖 |
| 冻结与旧交付 | 新锁5条目/14继承锁/341唯一主线冻结通过，旧336保持；原报告/ARCHIVE/RUN-AUDIT哈希保持，原1642归档文件全部原字节保持 |

从主检出读取权威补单/SPEC/CASES/锁/wrapper，不向W树复制控制材料，不merge/reset。所有检查都从W树通过主检出绝对路径 `F:/new/smaltalk/water/scripts/native-review-addendum-check.mjs` 执行，由wrapper原样委托本树冻结旧helper；没有直接以旧首次baseline替代resume。

## 修复与需求对照

[model.mjs](../../../prototypes/native-review/model.mjs)在每个确认的原生snapshot中建立局部Map。每个finding先通过原nativePath检查，再以最后一个斜线之前的字符串作为父目录，无斜线时用根空串。每组只累计实际已记录的直接子项，计数超过max_dir_entries立即调用原fail，仍为 `Error('Unsupported native review.')`。completed/partial/cancelled共用该路径，无状态豁免；选择取消无snapshot不进入此计数，原预算取值范围验证保留。

| 要求 | 验证与结果 |
|---|---|
| 完整/partial超限拒绝 | 冻结完整捕获限值1/6、partial限值1在模型、readSession、startServer、startFromStream均拒绝；已确认cancelled限值2也拒绝 |
| 根/非根独立，孙辈不重复计数 | 完整捕获根7/dir1，限值7仍接受其8条总数；合成a/b每组2、a/n深层每组2接受；非根a或a/n的3个直接子项在限值2下拒绝，限值3下接受 |
| 合法跨目录总数 | 6条总记录、每组最多2在限值2下接受；深层7条总记录也可在限值2下接受，未用总findings数或顶层前缀计数替代逐父目录检查 |
| 取消保持 | partial根恰1、cancelled根恰3接受；已确认预取消空报告、选择取消无snapshot在limit=1下接受；选择取消limit=0仍按原范围拒绝 |
| 不修改caller数据 | 正反例均核输入与事前深拷贝相等；不修正预算、不截断findings、不改partial/Unknown、不重算Q、不换legacy tag |
| 公开入口及资源 | 16组正反例分别覆盖模型、readSession、startServer、startFromStream，共64组入口观察；正例真实HTTP核session及Q原字节，无snapshot无下载；反例检查固定错误。测试对任何错误接受的server均用finally关闭；生产guard在startServer原同步模型验证阶段拒绝，未进入listen |
| 原行为保持 | 原8真实捕获、两ID变体、旧T24、合法64MiB/单LF/超限、严格UTF-8、Unknown/保护/祖先、Q/隐私、实际下载及所有原语义断言均保留；恰五顶层，无skip/filter/嵌套凑数 |

新增报告构造仅在现有[模型测试](../../../prototypes/native-review/tests/model.test.mjs)内，由冻结捕获的目录/文件形状派生并同步summary/Q/祖先原因，明确属于合成内存数据，不冒充新扫描。生产逻辑不根据任何case名、fixture名或ID匹配结果。

仅model与model测试有永久变更。server/app/host只在原定义负控中临时改坏，之后逐字节恢复；其它9个产品/测试文件及原w报告、全部原w证据、A–V产品、契约/输入/helper/锁不改。浏览器测试未修改，保持原私有context、单次鼠标点击、250ms间隔和原超时。

## 预算先红、稳定负控与原四链

04:32:27 UTC实际resume：精确干净HEAD及范围/冻结通过，8原生+24旧输入及2个正对照通过；3矛盾输入×4入口共12次错误接受被按预期复现。resume PASSED只代表已知缺陷复现。04:32:33在原缺陷/原测试字节运行red-budget；追加测试后04:34:02再次在未修复生产逻辑运行red-budget，均观察12次W_DIR_BUDGET，probe退出1、wrapper退出0。它们保留为修复前证据，不充当新增guard的稳定负控。

04:34:05首次修复suite通过：原完整五测5/5及冻结四入口回归全部通过。源码/测试稳定后，04:35:24真正删除新增guard的条件拒绝语句（其余计数逻辑保持），red-budget重新观察12次错误接受；04:35:28立即按保存原字节恢复、核SHA256并完整suite五绿/回归绿。没有生产测试开关。

| 当前稳定链 | 真正临时改坏内容 / 目标 | 红wrapper回执时间及PID | 立即恢复suite时间及PID |
|---|---|---|---|
| budget | 禁用实际新增预算拒绝语句；W_DIR_BUDGET | 04:35:24.861Z-22552 | 04:35:28.280Z-30332 |
| behavior | 实际下载路由从Q改发view；W_BEHAVIOR | 04:36:07.823Z-31948 | 04:37:01.715Z-12056 |
| nc1 | 同一实际下载路由改发view；W_Q_ONLY | 04:37:36.797Z-25856 | 04:38:37.412Z-24264 |
| nc2 | 把选择取消显示为完成0条并启用报告/预览/下载；W_SELECTION_CANCELLED | 04:39:10.816Z-27380 | 04:39:46.556Z-32820 |
| nc3 | 真实TextDecoder关闭fatal UTF-8；W_STREAM_BOUNDARY | 04:40:18.745Z-22392 | 04:40:49.628Z-30384 |

原四红均真实运行全部五测；分别为2通过/3失败、2通过/3失败、3通过/2失败、4通过/1失败。每次恢复后均5/5且冻结预算probe为0失败，无skip。UTF-8反例仍破坏合法自由路径及对应title，宽松解码后的对象可过模型，避免以后续模型拒绝冒充严格解码边界。

当前productionHash为 `6ffcd8a07ad1d6a42c453bf99f627cb9284c394a5576c315843e04728d4fe9e7`，testHash为 `6f3f07cd9cdc59847de87c8f167fa81ce65b39d5b6184ec32aa5b63b8b8467c8`。模型原字节SHA256为 `3123d5cd803236b20bd26b1baa883a200e8f52511ab3c2084128bb9c2e72a0fe`。每次原/坏/恢复hash、时间和源快照定位见[恢复审计](../../acceptance/wave1/w/addendum-01/wrapper/WORKER-RESTORE-AUDIT.json)。

## 同一干净SHA的final

命令共同前缀为 `node F:/new/smaltalk/water/scripts/native-review-addendum-check.mjs --task WATER-W1-W --mode`。三个final全部绑定干净 `020cd89cd592471836cca8fa5d263176348b2165`，前后HEAD一致且无工作区改动。

| 命令后缀 | 退出/结果 | wrapper原始回执 |
|---|---|---|
| check --final | 0；原语法、原四链及新增预算链审计通过，四入口回归全拒绝矛盾 | [check](../../acceptance/wave1/w/addendum-01/wrapper/2026-10-19T04-41-43.724Z-33364-check-result.json) |
| test --final | 0；原3模型/流/HTTP顶层通过，预算回归通过 | [test](../../acceptance/wave1/w/addendum-01/wrapper/2026-10-19T04-42-03.265Z-23936-test-result.json) |
| browser --final | 0；原2浏览器顶层通过，34次实际点击落盘，预算回归通过 | [browser](../../acceptance/wave1/w/addendum-01/wrapper/2026-10-19T04-42-12.634Z-28668-browser-result.json) |

冻结旧helper的三final各自proofAudit核当前behavior/nc1/nc2/nc3，wrapper各自budgetProof核稳定red-budget及当前恢复源码/测试字节。budgetProof最终引用04:40:49最新完整suite，04:35:28首次立即恢复suite也保留，两者均为当前字节，不把旧测试hash当证明。

本补所有17次wrapper均按预期通过；没有非预期产品失败、编译失败、CDP/下载超时或门失败。预期错误包括resume/修复前预算矛盾、稳定预算guard关闭、原四生产负控，其完整原始失败输出与源快照全部归档。首次阅读过程中rg未找到额外嵌套AGENTS返回1，属于无匹配，不是产品门失败。原票历史失败及截图限制继续留在原报告，不覆写或追认。

## 归档、旧文件保持与看图

[ARCHIVE.json](../../acceptance/wave1/w/addendum-01/ARCHIVE.json)包含本补新产生的1148个原字节文件、17060188字节，逐项记录source/archive/bytes/SHA256，复制后逐文件核验。两套检查输出均纳入：wrapper/来自本补绝对wrapper，original-helper/来自其委托的旧helper；另有全部本补实际Q下载、逐次截图及当前三图。[RUN-AUDIT.json](../../acceptance/wave1/w/addendum-01/RUN-AUDIT.json)列完整命令argv/退出码、所有预期失败、测试计数、五链/final、预算12项观察及保留哈希；[开始清单](../../acceptance/wave1/w/addendum-01/wrapper/WORKER-START-INVENTORY.json)区分本补新产物与原现场。

原1642个归档文件逐项长度/SHA256保持；原报告、原ARCHIVE和原RUN-AUDIT符合补单锁的三个冻结hash。没有更新原ARCHIVE，证据仅写addendum-01；继承原w/.gitattributes，日志显式-f逐文件加入，归档原字节与Git index再次核对。target/cache/binary/profile/fixture payload不入交付；原与新profile/下载/日志全部原地保留，无清理。本补新目录未发现需要排除的额外浏览器payload。

以下final新图均已通过图像工具逐张实际查看，并与原final三图逐字节相同：

- [1440×1000](../../acceptance/wave1/w/addendum-01/current/native-review-1440x1000.png)：原生策略/预算与8条观察、8受保护、3大小未知可读，来源总量未知，筛选区正常，无水平溢出。
- [900×800](../../acceptance/wave1/w/addendum-01/current/native-review-900x800.png)：标题/快照选择纵向布局，策略换行正常，计数与来源卡片清晰；后续列表正常纵向滚动，无水平遮挡。
- [选择取消](../../acceptance/wave1/w/addendum-01/current/native-review-cancel.png)：显示“目录选择已取消；未开始扫描”，无报告/预览/下载，未伪造完成0条。

图片观察和浏览器断言分别保留；不以PNG存在或hash相同代替实际看图。

## 未验证边界与交回

本补系统原生目录窗口0，无物理扫描fixture创建/访问，无普通内容采集、真实用户scope/HOME/整盘访问，无V构建/程序调用。真实V.exe→W固定启动器→HTTP/Chrome/下载及生命周期联合链尚未验收，由总控收补单后另做有界联合验证；保留捕获回放不冒充该链。

没有新依赖、任意程序路径、生产测试开关、删除/ACL/移动、上游执行、push/merge/reset/clean或台账变更。来源声明仍不认证真实性/新鲜度；本修复只拒绝已提供数据能够证明的内部预算矛盾。macOS、真实用户scope、自然手势鉴真、恶意生产竞态、桌面壳/发布及M1仍未验证/未完成。提交回执和证据后停止测试与修改，等待总控独立验收。

## 全部执行索引

红模式passed表示正确观察到预期失败，不能解读为缺陷版通过。原四红的测试进程退出1；预算红probe退出1；这些模式的wrapper/委托helper均按预期退出0。完整底层命令与退出值见RUN-AUDIT。

| 开始UTC | 检查器 / mode | 门结果 | 五测通过/失败 | 预算矛盾接受数 | 原字节 |
|---|---|---|---|---|---|
| 2026-10-19T04:32:27.745Z | wrapper / resume | passed | — | 12 | [回执](../../acceptance/wave1/w/addendum-01/wrapper/2026-10-19T04-32-27.744Z-30280-resume-result.json) |
| 2026-10-19T04:32:33.550Z | wrapper / red-budget | passed | — | 12 | [回执](../../acceptance/wave1/w/addendum-01/wrapper/2026-10-19T04-32-33.549Z-15672-red-budget-result.json) |
| 2026-10-19T04:34:02.689Z | wrapper / red-budget | passed | — | 12 | [回执](../../acceptance/wave1/w/addendum-01/wrapper/2026-10-19T04-34-02.688Z-29812-red-budget-result.json) |
| 2026-10-19T04:34:05.984Z | wrapper / suite | passed | — | 0 | [回执](../../acceptance/wave1/w/addendum-01/wrapper/2026-10-19T04-34-05.983Z-33184-suite-result.json) |
| 2026-10-19T04:34:08.913Z | original-helper / suite | passed | 5/0 | — | [回执](../../acceptance/wave1/w/addendum-01/original-helper/2026-10-19T04-34-07.327Z-32392-suite-result.json) |
| 2026-10-19T04:35:24.862Z | wrapper / red-budget | passed | — | 12 | [回执](../../acceptance/wave1/w/addendum-01/wrapper/2026-10-19T04-35-24.861Z-22552-red-budget-result.json) |
| 2026-10-19T04:35:28.281Z | wrapper / suite | passed | — | 0 | [回执](../../acceptance/wave1/w/addendum-01/wrapper/2026-10-19T04-35-28.280Z-30332-suite-result.json) |
| 2026-10-19T04:35:30.884Z | original-helper / suite | passed | 5/0 | — | [回执](../../acceptance/wave1/w/addendum-01/original-helper/2026-10-19T04-35-29.734Z-22232-suite-result.json) |
| 2026-10-19T04:36:07.823Z | wrapper / red-behavior | passed | — | — | [回执](../../acceptance/wave1/w/addendum-01/wrapper/2026-10-19T04-36-07.823Z-31948-red-behavior-result.json) |
| 2026-10-19T04:36:10.366Z | original-helper / red-behavior | passed | 2/3 | — | [回执](../../acceptance/wave1/w/addendum-01/original-helper/2026-10-19T04-36-09.220Z-10228-red-behavior-result.json) |
| 2026-10-19T04:37:01.716Z | wrapper / suite | passed | — | 0 | [回执](../../acceptance/wave1/w/addendum-01/wrapper/2026-10-19T04-37-01.715Z-12056-suite-result.json) |
| 2026-10-19T04:37:06.505Z | original-helper / suite | passed | 5/0 | — | [回执](../../acceptance/wave1/w/addendum-01/original-helper/2026-10-19T04-37-03.370Z-5488-suite-result.json) |
| 2026-10-19T04:37:36.797Z | wrapper / red-nc1 | passed | — | — | [回执](../../acceptance/wave1/w/addendum-01/wrapper/2026-10-19T04-37-36.797Z-25856-red-nc1-result.json) |
| 2026-10-19T04:37:39.024Z | original-helper / red-nc1 | passed | 2/3 | — | [回执](../../acceptance/wave1/w/addendum-01/original-helper/2026-10-19T04-37-38.041Z-26884-red-nc1-result.json) |
| 2026-10-19T04:38:37.413Z | wrapper / suite | passed | — | 0 | [回执](../../acceptance/wave1/w/addendum-01/wrapper/2026-10-19T04-38-37.412Z-24264-suite-result.json) |
| 2026-10-19T04:38:41.437Z | original-helper / suite | passed | 5/0 | — | [回执](../../acceptance/wave1/w/addendum-01/original-helper/2026-10-19T04-38-39.805Z-9532-suite-result.json) |
| 2026-10-19T04:39:10.817Z | wrapper / red-nc2 | passed | — | — | [回执](../../acceptance/wave1/w/addendum-01/wrapper/2026-10-19T04-39-10.816Z-27380-red-nc2-result.json) |
| 2026-10-19T04:39:13.215Z | original-helper / red-nc2 | passed | 3/2 | — | [回执](../../acceptance/wave1/w/addendum-01/original-helper/2026-10-19T04-39-12.198Z-7504-red-nc2-result.json) |
| 2026-10-19T04:39:46.557Z | wrapper / suite | passed | — | 0 | [回执](../../acceptance/wave1/w/addendum-01/wrapper/2026-10-19T04-39-46.556Z-32820-suite-result.json) |
| 2026-10-19T04:39:50.607Z | original-helper / suite | passed | 5/0 | — | [回执](../../acceptance/wave1/w/addendum-01/original-helper/2026-10-19T04-39-48.889Z-2400-suite-result.json) |
| 2026-10-19T04:40:18.746Z | wrapper / red-nc3 | passed | — | — | [回执](../../acceptance/wave1/w/addendum-01/wrapper/2026-10-19T04-40-18.745Z-22392-red-nc3-result.json) |
| 2026-10-19T04:40:21.147Z | original-helper / red-nc3 | passed | 4/1 | — | [回执](../../acceptance/wave1/w/addendum-01/original-helper/2026-10-19T04-40-20.093Z-21612-red-nc3-result.json) |
| 2026-10-19T04:40:49.629Z | wrapper / suite | passed | — | 0 | [回执](../../acceptance/wave1/w/addendum-01/wrapper/2026-10-19T04-40-49.628Z-30384-suite-result.json) |
| 2026-10-19T04:40:53.354Z | original-helper / suite | passed | 5/0 | — | [回执](../../acceptance/wave1/w/addendum-01/original-helper/2026-10-19T04-40-51.463Z-33264-suite-result.json) |
| 2026-10-19T04:41:43.725Z | wrapper / check --final | passed | — | 0 | [回执](../../acceptance/wave1/w/addendum-01/wrapper/2026-10-19T04-41-43.724Z-33364-check-result.json) |
| 2026-10-19T04:41:50.406Z | original-helper / check --final | passed | — | — | [回执](../../acceptance/wave1/w/addendum-01/original-helper/2026-10-19T04-41-48.344Z-34652-check-result.json) |
| 2026-10-19T04:42:03.265Z | wrapper / test --final | passed | — | 0 | [回执](../../acceptance/wave1/w/addendum-01/wrapper/2026-10-19T04-42-03.265Z-23936-test-result.json) |
| 2026-10-19T04:42:05.648Z | original-helper / test --final | passed | 3/0 | — | [回执](../../acceptance/wave1/w/addendum-01/original-helper/2026-10-19T04-42-04.636Z-31012-test-result.json) |
| 2026-10-19T04:42:12.634Z | wrapper / browser --final | passed | — | 0 | [回执](../../acceptance/wave1/w/addendum-01/wrapper/2026-10-19T04-42-12.634Z-28668-browser-result.json) |
| 2026-10-19T04:42:14.876Z | original-helper / browser --final | passed | 2/0 | — | [回执](../../acceptance/wave1/w/addendum-01/original-helper/2026-10-19T04-42-13.927Z-18948-browser-result.json) |
