WATER-W1-W 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w/docs/dispatch/reports/WATER-W1-W-REPORT.md

状态：SUBMITTED，等待总控独立验收；没有修改主线台账或自行标记 VERIFIED。日期：2026-10-19。以下结果限本机 Windows x64 受控输入及私有浏览器。

## 提交与范围

| 项目 | 实际值 |
|---|---|
| 权威票 | F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W1-W-NATIVE-REVIEW-20261019.md |
| 工作树 / 分支 | F:/new/smaltalk/water/.worktrees/w / worker/water-w1-w |
| 首次基线 / tag | 30a803537602211ed2a11c106c63fd27cefb260f / water-w1-native-host-base-20261019 |
| 实现及全部 final 受测 SHA | 63db62b020efff4601a03da7dc561549dcb1f762 |
| 实现提交 | feat(w): add native session review stream and fixed launcher；11 个白名单文件、1266 行新增 |
| 回执提交定位 | 本文件首次提交，提交题为 docs(w): submit native review evidence and report；用 git log -1 --format=%H -- docs/dispatch/reports/WATER-W1-W-REPORT.md 定位。父提交为上方实现 SHA；仅追加本回执及 w 证据 |
| 实际执行者 | Codex，本会话系统标识为基于 GPT-6；未提供更细模型版本 ID，不推断具体变体。无子代理或再次分包 |
| 工具 | Windows x64、Node v24.16.0、现有 Chrome/冻结 browser-lab；零 npm、无安装构建依赖 |
| 冻结 | 104 新锁条目、13 继承锁、336 唯一冻结文件逐字节通过 |

首次核对分支、精确 HEAD、干净状态、产品目录不存在及主 manifest READY / baseline PASSED 后，于 03:21 UTC 实际重跑 baseline，通过八份原生依赖捕获、旧 T24 输入、原字节/HTTP/浏览器下载探针。02:18 UTC 的既有总控 baseline 也原样归档，但不冒充本轮执行。主线票面直接读取，没有 merge 取票。

## 实现对照

| 要求 | 实现与证据 |
|---|---|
| 新目录自身 LF 属性；旧产品不改 | 先按 ATTRIBUTES.json 创建 .gitattributes，新增 native-review 的 HTML/CSS/MJS、README 和两测试文件。沿用 Water I/T 样式，未改旧 T/I、根 Cargo、契约、helper、锁或其它树 |
| 两族协议 | model.assertReviewInput 对旧 bundle 真实委托 T.assertReviewBundle，原标签保持；原生独立验证，再调用真实 I.assertReportView。没有修改来源 tag 后转交 T |
| 原生保守字段 | 单 Windows/user_selected/Selected directory scope；session/scan 绑定；固定 native-scan-v1、Unknown/Protected、固定 evidence/references、基础原因和实际记录祖先原因、逻辑大小、源 totals；已观察祖先不能声称文件逻辑字节 |
| Windows 名称 | 严格 Unicode、UTF-16 组件长度、非法字符/尾点空格/DOS stem；仅 ASCII 大小写折叠及 ASCII 空格修剪。合法非 ASCII 名称正例、保留名与坏 surrogate 反例均测试 |
| summary/Q 一致及原文本 | 精确键、计数/分布/totals、按序 alias、evidence code+source、references、size；Q 紧凑 canonical 检查。校验投影不作导出来源；exportText/HTTP 仅发送传入 Q string 的 UTF-8 字节 |
| 普通 JSON 边界 | 先检查 descriptors，拒绝 getter/symbol/隐藏属性/空洞/cycle/custom prototype；固定错误，不执行 getter 或回显输入 |
| 流 | readSession 仅 Node Readable 的 Uint8Array/Buffer，逐块复制；严格 UTF-8、无 BOM/重复键/额外行/空白/第二对象；64 MiB JSON 加可选单 LF。合法对象恰 67108864 字节及加 LF 通过，合法多 1 字节拒绝；上游预解码 string 拒绝 |
| 真实组装 / 不可变 | 公开 startFromStream 实际 readSession→startServer；服务器首次 await 前完成验证和 JSON/Q 字节捕获。调用后立即修改原对象，HTTP 仍是原快照。无文件/env/样例 fallback |
| 固定启动器 | 固定本树 .local/next-target/debug/water-native-session.exe，realpath/普通文件/项目内检查；argv 恰一个 initialDirectory、shell=false、windowsHide=false、stdin ignore、stdout/stderr raw pipe。API 拒绝额外程序/env 参数，stderr 留存上限4096字节且不回显；成功退出0及合法 bundle 后才开服务。仅管理自有 child/server，CLI import 不自启 |
| 启动器本票实测边界 | 无效参数在 spawn 前拒绝；import 无副作用；CLI 无/多参数退出64，固定 stderr。真实 V.exe 正常/错误/信号生命周期尚未运行，见未验证项 |
| HTTP | 固定127.0.0.1、精确Host、GET/HEAD、固定静态realpath白名单、无query/fragment/编码/穿越/上传/扫描/路径/进程路由；no-store/nosniff/no-referrer/CSP、无CORS；错误净化。Q附件名和Content-Length逐字节测试 |
| 页面 | 原生 selection/source/policy/no-follow/三预算/普通内容未读/手势和竞态未验证可见；Completed 仅策略内覆盖；可信宿主声明不认证来源或新鲜度。旧输入保持旧标签，不补造原生 policy |
| 两种取消与根路径 | 选择取消无报告/预览/下载，显示“目录选择已取消；未开始扫描”；确认后的 R cancelled 报告仍可下载。scope 根空串显示“scope 根”，None 显示“未指定路径” |
| 保持旧阅读能力 | 旧24份、筛选/排序/详情、HTML字面、键盘Enter/Tab/Escape及焦点、u64十进制/Unknown、源总量均覆盖；筛选不改变整份Q下载 |
| 浏览器与下载 | 八份真实 S/P/R/E/H/Q 保留捕获经冻结 stream-probe 回放；两份合成 session/scope ID 重命名变体不改Q；旧T24份。final共34次系统鼠标事件下载，全部实际落盘文件与当前Q原字节、固定名/headers相符。不是fetch替代下载 |

新实现及调用说明见 [native-review README](../../../prototypes/native-review/README.md)。测试恰五个顶层，无 skip/filter/嵌套测试凑数；每次一个门、最多一个独立 Chrome。后期测试在同一个受控 Chrome 内创建独立 off-the-record context，固定下载到该 context 的新私有目录；每个附件一次鼠标点击，250ms间隔，没有增加超时或重试点击，没有放松目录/文件名/字节断言。冻结 browser-lab 未修改。

## 当前红绿链与 final

所有命令从 W 树运行，形式为 `node scripts/native-host-check.mjs --task WATER-W1-W --mode MODE`，final 追加 `--final`。下表红命令的 helper 退出0表示验证到预期测试退出1，不表示产品缺陷版通过。每次红都立即按保存原字节恢复并核 SHA-256，随后完整五绿。

| 链 | 真实生产改坏点 / 目标 | 当前有效红 | 恢复五绿 |
|---|---|---|---|
| behavior | server下载字节从Q改为view；W_BEHAVIOR | 03:55:03.365Z-34064（2通过/3失败） | 03:55:41.502Z-19684 |
| nc1 | 同一实际下载路由改发view；W_Q_ONLY | 03:56:10.717Z-34864（2通过/3失败） | 03:56:49.522Z-23112 |
| nc2 | app把目录选择取消渲染为完成0条、展示报告并启用预览/下载；W_SELECTION_CANCELLED | 03:57:18.956Z-25712（3通过/2失败） | 03:57:45.475Z-20124 |
| nc3 | host真正TextDecoder去掉fatal UTF-8检查；W_STREAM_BOUNDARY | 03:58:12.468Z-35316（4通过/1失败） | 03:58:39.357Z-29272 |

nc3 坏字节放在合法自由路径及对应 title；测试先确认宽松解码后的对象通过模型，再证明真实 readSession 必须拒绝，因此不是后续模型拒绝冒充 UTF-8 检查。

当前 productionHash=`8fd59dd79d4490b9eae0faf61a9a5e1f4667ef7d9e7a26e46a68f4fde6000fd4`，testHash=`c743d21babae78f5ba360f83baaf944ed6c0d95720d7a83f4df596a7cd3067ac`。三 final 均在同一干净实现 SHA 上，proofAudit 各核同一四条当前字节链：

| 命令 | 退出 / 结果 | 原始回执 |
|---|---|---|
| check --final | 0；语法和四链审计通过 | [check](../../acceptance/wave1/w/checks/2026-10-19T03-59-24.175Z-13324-check-result.json) |
| test --final | 0；3/3通过、0跳过 | [test](../../acceptance/wave1/w/checks/2026-10-19T03-59-37.426Z-34208-test-result.json) |
| browser --final | 0；2/2通过、0跳过、34实际下载 | [browser](../../acceptance/wave1/w/checks/2026-10-19T03-59-43.241Z-3352-browser-result.json) |

## 失败历史与证据限制

首次完整测试/可运行骨架的行为红是 03:28:31.656Z-24716。页面ready、实际下载与三截图已运行，错误Q路由使行为断言真实失败；同轮另有测试自身错误：把流生成器预读次数当停止条件。后者改成验证流销毁，并新增合法64MiB正反边界，不降低边界断言。03:30和03:32完整五绿。后续稳定字节的行为红明确是实现后重放，不冒充首次先红。

03:34:11、03:35:57两轮suite中，默认浏览器context下载目录混入额外 downloads.htm，严格目录断言失败。现场保留，九个额外payload的长度/哈希/首四字节在RUN-AUDIT中；首四字节为43723234，未把它们视为HTML或Q，执行者没有运行/安装它们。因票面禁止归档binary/cache，payload不进入交付，原文件留在本树.local。无法仅凭这些证据断言后台来源或全Chrome进程无外部活动；页面请求审计与该后台现象分别记录。

03:38:01、03:38:45、03:40:47三轮suite在独立context下发生连续下载未触发：最后一轮明确第11、22次没有Browser.downloadWillBegin，而之后的点击可继续。测试加入独立context下载事件记录、失败后继续其余快照、逐次唯一截图存档和250ms点击间隔，保留单次点击与原8秒下载等待。03:41后该问题未再出现；没有将超时当有效负控，也未放松字节/文件断言。

03:46:28的nc2因第二个浏览器会话Page.navigate超时被helper判无效，尽管取消断言已命中；原字节恢复后03:49五绿。03:52:02的nc2有效，但恢复suite 03:52:31又遇独立context首次Page.navigate超时。测试增加导航前Page.bringToFront，不改变10秒CDP超时；03:54五绿后重新完成本报告上方全部四链及final。旧有效/无效记录全部保留，不用后续绿掩盖早期失败。

截图归档限制：03:34、03:35及03:38:01这些早期失败suite执行了当前三图保存，但冻结helper在suite命令失败时未复制它们到checks；当时尚未添加逐次唯一截图存档，公共文件名随后被新轮次覆盖。因此没有这些轮次的独立原始三图，未将邻近通过或重放图片冒充它们。后续测试逐次保留唯一目录，当前四链和final的三图有完整原字节。此历史证据缺口留给总控明确复核。

工具准备阶段另有：首次PowerShell默认编码读取乱码后改UTF-8；两个猜测helper路径不存在；Python不可用，改用已有Node；一次Node命令行引号错误、一次脚本字符串插值错误和一次rg通配符调用错误。均没有改冻结文件或安装环境；不计入产品通过证据。

## 原字节归档与实际看图

[ARCHIVE.json](../../acceptance/wave1/w/ARCHIVE.json)登记1642个原字节文件、25872812字节的来源/目标/长度/SHA-256，复制后逐文件核验。包含全部checks回执/原stdout-stderr/初次及重放源码快照/好坏恢复记录、实际Q下载和可用截图。[RUN-AUDIT.json](../../acceptance/wave1/w/RUN-AUDIT.json)逐次列命令argv/退出/失败/测试与源码哈希，以及排除payload清单；[恢复审计](../../acceptance/wave1/w/checks/MANUAL-RESTORE-AUDIT.json)保留每次真实生产变更、原/坏/恢复哈希和时间。target/cache/binary/profile/fixture payload不入Git，现场未清理。证据预置.gitattributes原样保留，log用显式-f加入。

最终三图已通过图像工具逐一实际查看：

- [1440×1000](../../acceptance/wave1/w/current/native-review-1440x1000.png)：原生策略、8条观察/8受保护/3大小未知、来源总量未知、scope覆盖和筛选布局可读，未见水平溢出。
- [900×800](../../acceptance/wave1/w/current/native-review-900x800.png)：标题和快照选择纵向排列，策略说明正常换行，计数及来源卡片保持可读，未见遮挡或水平溢出；后续列表需要正常纵向滚动。
- [选择取消](../../acceptance/wave1/w/current/native-review-cancel.png)：明确“目录选择已取消；未开始扫描”，快照选择不可用，没有伪造计数/报告/下载/预览；策略与声明保留。

图片观察与浏览器布局/键盘/无脚本异常断言分别记录，不以PNG存在替代正确性。

## 未验证与交回边界

真实 V 程序 → W 固定 launchNative → HTTP/Chrome/Q 下载整条链没有运行。W 树没有V产品，未放假exe、未加binaryPath/生产测试模式；本票真实流组装是保留实际S/P/R/E/H/Q捕获的回放。总控必须在联合树构建真正V.exe后独立复测确认、选择取消、扫描取消、异常退出和关闭生命周期。

没有本票物理扫描fixture或真实用户目录访问，没有读取普通文件内容、删除、ACL、移动、整盘/HOME扫描、安装依赖、运行上游脚本、合主线或push。两个重命名变体以及大字节边界对象都是明确合成内存输入，不冒充新物理捕获。macOS、自然手势鉴真、恶意生产竞态、真实用户scope、桌面壳、发布和M1仍未验证/未完成。历史浏览器失败和早期失败截图缺口如上；当前受测源码和当前四链/final通过不扩大这些结论。

交回后停止修改。任何实质返修或跨边界扩展由总控编号补单处理。

## 完整执行索引

passed 的 red 模式表示符合预期的测试退出1；failed 记录不计入当前通过。全部底层命令退出码见RUN-AUDIT。

| 开始UTC | mode | helper结果 | 测试通过/失败 | 原始回执 |
|---|---|---|---|---|
| 2026-10-19T02:18:02.551Z | baseline | passed | — | [2026-10-19T02-18-01.280Z-26808-baseline-result.json](../../acceptance/wave1/w/checks/2026-10-19T02-18-01.280Z-26808-baseline-result.json) |
| 2026-10-19T03:21:20.192Z | baseline | passed | — | [2026-10-19T03-21-19.273Z-21432-baseline-result.json](../../acceptance/wave1/w/checks/2026-10-19T03-21-19.273Z-21432-baseline-result.json) |
| 2026-10-19T03:28:32.506Z | red-behavior | passed | 1/4 | [2026-10-19T03-28-31.656Z-24716-red-behavior-result.json](../../acceptance/wave1/w/checks/2026-10-19T03-28-31.656Z-24716-red-behavior-result.json) |
| 2026-10-19T03:30:14.584Z | suite | passed | 5/0 | [2026-10-19T03-30-13.610Z-30332-suite-result.json](../../acceptance/wave1/w/checks/2026-10-19T03-30-13.610Z-30332-suite-result.json) |
| 2026-10-19T03:32:15.777Z | suite | passed | 5/0 | [2026-10-19T03-32-14.668Z-29324-suite-result.json](../../acceptance/wave1/w/checks/2026-10-19T03-32-14.668Z-29324-suite-result.json) |
| 2026-10-19T03:33:07.239Z | red-behavior | passed | 2/3 | [2026-10-19T03-33-06.133Z-25840-red-behavior-result.json](../../acceptance/wave1/w/checks/2026-10-19T03-33-06.133Z-25840-red-behavior-result.json) |
| 2026-10-19T03:34:14.499Z | suite | failed | 4/1 | [2026-10-19T03-34-11.239Z-31140-suite-result.json](../../acceptance/wave1/w/checks/2026-10-19T03-34-11.239Z-31140-suite-result.json) |
| 2026-10-19T03:35:58.863Z | suite | failed | 4/1 | [2026-10-19T03-35-57.749Z-1292-suite-result.json](../../acceptance/wave1/w/checks/2026-10-19T03-35-57.749Z-1292-suite-result.json) |
| 2026-10-19T03:38:02.385Z | suite | failed | 4/1 | [2026-10-19T03-38-01.579Z-4220-suite-result.json](../../acceptance/wave1/w/checks/2026-10-19T03-38-01.579Z-4220-suite-result.json) |
| 2026-10-19T03:38:46.802Z | suite | failed | 4/1 | [2026-10-19T03-38-45.900Z-11420-suite-result.json](../../acceptance/wave1/w/checks/2026-10-19T03-38-45.900Z-11420-suite-result.json) |
| 2026-10-19T03:40:48.664Z | suite | failed | 4/1 | [2026-10-19T03-40-47.857Z-34824-suite-result.json](../../acceptance/wave1/w/checks/2026-10-19T03-40-47.857Z-34824-suite-result.json) |
| 2026-10-19T03:41:55.497Z | suite | passed | 5/0 | [2026-10-19T03-41-54.773Z-23356-suite-result.json](../../acceptance/wave1/w/checks/2026-10-19T03-41-54.773Z-23356-suite-result.json) |
| 2026-10-19T03:42:41.218Z | red-behavior | passed | 2/3 | [2026-10-19T03-42-40.440Z-34028-red-behavior-result.json](../../acceptance/wave1/w/checks/2026-10-19T03-42-40.440Z-34028-red-behavior-result.json) |
| 2026-10-19T03:43:51.969Z | suite | passed | 5/0 | [2026-10-19T03-43-50.848Z-17824-suite-result.json](../../acceptance/wave1/w/checks/2026-10-19T03-43-50.848Z-17824-suite-result.json) |
| 2026-10-19T03:44:32.640Z | red-nc1 | passed | 2/3 | [2026-10-19T03-44-30.359Z-21860-red-nc1-result.json](../../acceptance/wave1/w/checks/2026-10-19T03-44-30.359Z-21860-red-nc1-result.json) |
| 2026-10-19T03:45:53.484Z | suite | passed | 5/0 | [2026-10-19T03-45-48.777Z-35296-suite-result.json](../../acceptance/wave1/w/checks/2026-10-19T03-45-48.777Z-35296-suite-result.json) |
| 2026-10-19T03:46:29.483Z | red-nc2 | failed | 3/2 | [2026-10-19T03-46-28.498Z-30060-red-nc2-result.json](../../acceptance/wave1/w/checks/2026-10-19T03-46-28.498Z-30060-red-nc2-result.json) |
| 2026-10-19T03:49:13.822Z | suite | passed | 5/0 | [2026-10-19T03-49-12.982Z-28132-suite-result.json](../../acceptance/wave1/w/checks/2026-10-19T03-49-12.982Z-28132-suite-result.json) |
| 2026-10-19T03:52:03.687Z | red-nc2 | passed | 3/2 | [2026-10-19T03-52-02.800Z-34616-red-nc2-result.json](../../acceptance/wave1/w/checks/2026-10-19T03-52-02.800Z-34616-red-nc2-result.json) |
| 2026-10-19T03:52:32.313Z | suite | failed | 4/1 | [2026-10-19T03-52-31.487Z-34324-suite-result.json](../../acceptance/wave1/w/checks/2026-10-19T03-52-31.487Z-34324-suite-result.json) |
| 2026-10-19T03:54:21.456Z | suite | passed | 5/0 | [2026-10-19T03-54-20.628Z-32288-suite-result.json](../../acceptance/wave1/w/checks/2026-10-19T03-54-20.628Z-32288-suite-result.json) |
| 2026-10-19T03:55:04.088Z | red-behavior | passed | 2/3 | [2026-10-19T03-55-03.365Z-34064-red-behavior-result.json](../../acceptance/wave1/w/checks/2026-10-19T03-55-03.365Z-34064-red-behavior-result.json) |
| 2026-10-19T03:55:42.224Z | suite | passed | 5/0 | [2026-10-19T03-55-41.502Z-19684-suite-result.json](../../acceptance/wave1/w/checks/2026-10-19T03-55-41.502Z-19684-suite-result.json) |
| 2026-10-19T03:56:11.530Z | red-nc1 | passed | 2/3 | [2026-10-19T03-56-10.717Z-34864-red-nc1-result.json](../../acceptance/wave1/w/checks/2026-10-19T03-56-10.717Z-34864-red-nc1-result.json) |
| 2026-10-19T03:56:50.255Z | suite | passed | 5/0 | [2026-10-19T03-56-49.522Z-23112-suite-result.json](../../acceptance/wave1/w/checks/2026-10-19T03-56-49.522Z-23112-suite-result.json) |
| 2026-10-19T03:57:19.727Z | red-nc2 | passed | 3/2 | [2026-10-19T03-57-18.956Z-25712-red-nc2-result.json](../../acceptance/wave1/w/checks/2026-10-19T03-57-18.956Z-25712-red-nc2-result.json) |
| 2026-10-19T03:57:46.207Z | suite | passed | 5/0 | [2026-10-19T03-57-45.475Z-20124-suite-result.json](../../acceptance/wave1/w/checks/2026-10-19T03-57-45.475Z-20124-suite-result.json) |
| 2026-10-19T03:58:13.178Z | red-nc3 | passed | 4/1 | [2026-10-19T03-58-12.468Z-35316-red-nc3-result.json](../../acceptance/wave1/w/checks/2026-10-19T03-58-12.468Z-35316-red-nc3-result.json) |
| 2026-10-19T03:58:40.110Z | suite | passed | 5/0 | [2026-10-19T03-58-39.357Z-29272-suite-result.json](../../acceptance/wave1/w/checks/2026-10-19T03-58-39.357Z-29272-suite-result.json) |
| 2026-10-19T03:59:26.335Z | check --final | passed | — | [2026-10-19T03-59-24.175Z-13324-check-result.json](../../acceptance/wave1/w/checks/2026-10-19T03-59-24.175Z-13324-check-result.json) |
| 2026-10-19T03:59:38.113Z | test --final | passed | 3/0 | [2026-10-19T03-59-37.426Z-34208-test-result.json](../../acceptance/wave1/w/checks/2026-10-19T03-59-37.426Z-34208-test-result.json) |
| 2026-10-19T03:59:43.918Z | browser --final | passed | 2/0 | [2026-10-19T03-59-43.241Z-3352-browser-result.json](../../acceptance/wave1/w/checks/2026-10-19T03-59-43.241Z-3352-browser-result.json) |
