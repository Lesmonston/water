# Water 状态与交接

更新时间：2026-10-18（Asia/Tokyo）。

本次总控接手结果与后续事项见[接手验收摘要](CONTROLLER-HANDOFF-20261017.md)；当前任务状态仍以本页和registry/manifest为准。

## 已确认

- 用户授权正式立项，项目根为 `F:/new/smaltalk/water`，总控为 Codex。
- 首版服务 Windows、macOS AI 开发者，覆盖 AI 编程、包管理器、本地模型与开发基础设施。
- 本阶段完成目录与版本管理、范围定义、开源源码静态分析和下一阶段工单；不启用真实清理。

## 已完成：M0 / W0

- 建立独立本地Git、AGENTS协作规则、立项书、首版需求、安全架构、ADR、里程碑及W0/W1工单。
- 克隆并锁定Jharu、Developer Machine Cleaner、Mole main、Kondo、npkill；四份静态审阅与总控汇总已完成。
- 原始调研已复制到research/sources；第三方checkout在research/upstream，未修改、未跟踪进Water Git。
- 首轮校验通过：19份Markdown、26处本地文档链接、182处固定commit源码引用；5个checkout的HEAD、origin、许可证哈希及洁净状态一致。
- 另有4处Mole Windows固定commit文档引用没有本地checkout，只做了网络核对；未把它们算作本地实现验证。
- M0当时暂定独立Rust内核 + Tauri 2 + TypeScript/React。当前已实现的B/C和A契约状态见下文，尚未运行竞品或真实清理。

## 下一步

A–M及五补单均VERIFIED（Windows受控合成范围），未结外贴单为0。L/M已通过[独立复验和隔离集成](acceptance/wave1/controller/WATER-W1-LM-REVIEW-20261018.md)，原票不重贴。真实scope安全、分类提升、侧车展示/Tauri/macOS与删除另排，M1尚未完成。

## L/M复验及隔离集成完成（2026-10-18，最新）

L接收d821b11/受测7a545fd，M接收88c7bd3/受测03f60ae，隔离受测df17e0a。两票原各五final/五测试通过，新私有target重复通过各五测试/格式/clippy/metadata/桥接；六项真实生产负控逐次完整五测红/原字节恢复绿，四项独立Rust边界与保留的真实J13快照→G→L/M公开入口回放通过。151冻结、A–K任务对象/旧产品/根Cargo及771份worker交付字节保持。A–M及五补单均VERIFIED（Windows受控合成范围），未结外贴单为0；L仅文件名候选、M仅观察逻辑长度与身份提示，不代表分类提升/卷唯一或回收量。未重新扫描或访问物理fixture；真实用户scope、身份IO、L/M页面/桌面接线、macOS和删除未验证，M1未完成。见[总控验收报告](acceptance/wave1/controller/WATER-W1-LM-REVIEW-20261018.md)。

## K补单复验与真实J→K页面通过（2026-10-18，历史收口）

K补单01接收886db33、受测e283d77，隔离95704fe完成原三门/五测试、133独立API/HTTP检查、根路径及三原负控的完整五测红/逐次恢复绿。真实J13快照与独立F/G/A/E/H逐值一致，直接供K服务并在1440×1000和900×800真实选择全部13份会话、核scope根issue与取消空态。仅复用原11+6/81717字节夹具，44内容快照通过，151冻结、1085份K及359份J交付字节保持。A–K及五补单均VERIFIED（Windows受控合成范围），原f16972f失败保留；L/M原任务对象、分配、基线/helper不变，真实用户scope、分类提升、桌面/macOS、卷唯一/回收量和删除未验证，M1未完成。见[总控复验报告](acceptance/wave1/controller/WATER-W1-K-ADDENDUM-01-REVIEW-20261018.md)。没有重造/清理夹具、修改L/M或接触真实用户数据。

## L/M派前完成（2026-10-18，历史派前）

L项目标记证据和M容量观察账本两票已完成正式冻结/独立树/实际离线baseline，READY待用户分别外贴；共同r1基线82e1580，38新锁/七旧锁合计151唯一文件，10+15合成输入及11错误实测通过。新产品未实现、五测试未运行，L/M无物理fixture或真实用户目录权限；K补单原任务对象/基线/helper/132旧冻结保持RUNNING，无自动实现者。见[正式批次](dispatch/wave1/EVIDENCE-BATCH-PLAN-20261018.md)、[派前回执](dispatch/wave1/EVIDENCE-BATCH-READY-REPORT.md)及票面。两个新执行对话各接一票；READY不等于已转贴。真实J→K、真实scope、桌面/macOS及删除仍未验收，M1未完成。

## 并行评估与K补单启动（2026-10-18，历史）

K原k树已出现补单01的START-AUDIT及169500字节回归bundle，HEAD/分支/来源hash正确，按启动证据记RUNNING；原失败未清除，真实J→K页面仍未验收。启动审计自报2026-10-18T03:41:50.355Z，精确转贴时刻未证实。见[启动观察](acceptance/wave1/controller/w1-parallel-assessment-20261018/k-start-observation.json)。

[并行任务评估](dispatch/wave1/PARALLEL-ASSESSMENT-20261018.md)建议另拆项目标记证据侧车和容量观察账本两条纯内存模块线，均只依赖已验收协议，不碰K文件或真实用户数据。当前只是DRAFT，未准备新树/helper/冻结/正式票，未派出；总控没有自动启动实现者。

## K收单与集成退回（2026-10-18，历史）

K接收e717519、实现7d00355，原三门/五测试、104独立边界及隔离三负控/逐次完整五测恢复通过；隔离f16972f真实J13快照与独立链路逐值一致，但K拒绝entry-budget合法根issue空串，整个bundle未能启动服务，真实J→K页面未验收。K为CHANGES_REQUESTED，补充单01已准备待用户外贴给原执行者；原树干净，主线未纳入K产品，A–J及四旧补单保持VERIFIED（Windows）。132冻结、369份K和359份J交付字节保持；44内容快照通过，仅总控新树由冻结prepare创建11+6/81717字节合成run并全部保留。真实用户scope、分类、桌面/macOS及删除未验证，M1未完成。见[K总控验收报告](acceptance/wave1/controller/WATER-W1-K-REVIEW-20261018.md)。补单修复由原执行者完成，总控不代修；后续验收复用原总控集成树夹具，不清理或重造。

## J验收集成（2026-10-18，历史收口）

- 接收干净HEAD `1dfa82c014cbdb99024b0da48dd4b6bff9f9e3d8`、实现b6fd1fe，359新增文件均在白名单，六产品文件实现后未改，350原始证据核来源字节一致。原前四final总控复跑通过；原bridge final失败永久保留。
- [工具勘误01](acceptance/wave1/controller/WATER-W1-J-CONTROLLER-ERRATUM-01-20261018.md)仅调整独立总控Cargo图产物选择，不改原helper/锁或K任务。隔离受测d14e1f1在实际四组重复rlib共存时通过五测试/格式/clippy/metadata、选择器三测试及真实13快照全值比较；Native11/12/39、44快照通过。
- 132冻结、A–I及根Cargo不变，359份交付文件在验收树和main原字节一致。仅冻结prepare在此验收树.local新建一批11+6、81687内容字节，后续复用，无清理。J为VERIFIED；详见[J验收报告](acceptance/wave1/controller/WATER-W1-J-REVIEW-20261018.md)。
- K原单继续，真实J→K页面未运行。macOS、不可达错误/快照超限分支、真实用户scope和桌面未验证；初次行为红与最终测试字节的补录区别保留。

## J/K已外贴与验收准备（2026-10-18，历史）

- 用户确认“我刚贴出去”；东京01:40:31审计已见J六个、K八个未提交实现文件。J新增锁检查、K东京01:34:58–01:35:04新增启动baseline与总控派前记录不同，原字节已归档。没有完成报告，实际开工/转贴时刻和执行模型仍未知。
- 当前J/K均RUNNING，分配/基线/132冻结不变，勿重复派同槽位。旧九单仍已验收，其他未结外贴单为0。
- [本轮核对记录](acceptance/wave1/controller/w1-session-page-plan-20261018/DISPATCH-AUDIT-20261018.md)及[后续真实页面验收方案](acceptance/wave1/controller/SESSION-PAGE-INTEGRATION-PLAN-20261018.md)已准备；仅plan模式通过，总控未运行J/K产品或真实页面验收。

## J/K派前完成（2026-10-18，历史派前）

- 两树j/k独立，基线`bc409f4af8cb2d51b2f67341ad46637cfa5e66f3`、tag water-w1-session-batch-base-20261018-r1。65项新锁、六旧锁83唯一文件（合计132）一致，旧产品/任务/槽位/根Cargo不变。
- J实际Node24/Rust1.95/MSVC、现有13场景链路/11原生12scope39entry通过，44快照一致；仅冻结prepare在j.local新建一批11+6、81057字节合成run，r1复用。K四份实际捕获/I模型和独立Chrome空白页通过，无物理fixture权限。
- J/K均READY待用户分别外贴，新产品/五测试/负控/实际J→K页面尚未运行。见[本批计划](dispatch/wave1/SESSION-BATCH-PLAN-20261018.md)、[派前回执](dispatch/wave1/SESSION-BATCH-READY-REPORT.md)。旧历史票上返工文字已加归档提示，不重做旧单。

## G/H验收集成（2026-10-18，已完成）

- G接收85c64d5、受测实现4ae559b；H接收cab41d1、受测实现52748c5，两树干净。60/54新增文件均在原票白名单，各六产品文件，后续只补报告/证据。原各五final门及五测试、G四/H三项总控独立测试全过；历史七项负控完整红绿与恢复hash核对通过，历史实现前先红次序仍未证实。
- 统一隔离受测`e383ece84f2943fe099106f2e121643417bbe346`新target离线复测通过G/H各五测试、原桥接及七独立测试。实际F原生11case/12scope/39entry，加两控制样本，经G/A/E/H与I模型全链路通过；44快照一致。83唯一冻结、A–F及I产品tree和根Cargo不变，114份worker文件物理字节一致。
- G/H均VERIFIED（Windows范围），[验收报告](acceptance/wave1/controller/WATER-W1-GH-REVIEW-20261018.md)及main推进记录为准。仅总控冻结prepare在本集成树.local新建一批有界合成run；没有真实用户数据、I页面扫描接线、生产竞态保证、分类/去重回收量或删除，macOS未验证。

## I验收集成（2026-10-18，已完成）

- 接收干净HEAD da0fa3e、受测实现8888c26，43新增文件均在白名单，后加35文件只为报告/证据。总控check/test/browser三个final门、模型三/浏览器二测试与87项独立模型/HTTP边界全部通过，三张实际截图已看。
- 隔离受测`0f855cfd68a086e79658a05b2e86803998f2add0`原五测试、三个独立完整红/绿负控、最终check/五测试与87独立检查通过，83唯一冻结与A–F产品tree不变，43份文件Git内容保持，41份字节一致，HTML/CSS仅checkout换行差异。历史先红次序与worker完整负控输出缺失如实保留限制；总控独立复验的完整日志和坏态源码已归档。
- I为VERIFIED（Windows范围），见[I验收报告](acceptance/wave1/controller/WATER-W1-I-REVIEW-20261017.md)。仅冻结E投影合成报告、loopback和隔离Chrome，无真实数据/扫描器/桌面/IPC接线，macOS未验证。

## F验收集成（2026-10-17，已完成）

- 接收干净HEAD `65e928d3c193e58db758eaf8f0022c975c3ca24d`，受测实现3f3acbd；353新增文件均在白名单，后加76文件只为报告/证据，九个产品/测试文件不变。总控原五final门、真实扫描11 case/12 scope/39 entry、五项独立边界全部通过；327份worker原始日志/receipt与现场一致，四负控目标红与恢复记录核对通过。
- 隔离受测SHA `55266ed9a1fc79d4b3a2bedaa8c09f06f1f3e40d`：新target离线六Rust测试、fmt/clippy/metadata、真实桥接及五独立测试首次通过，六锁83唯一文件与A–E产品tree不变；353份worker文件原字节保持。冻结prepare仅在集成树.local新建一批11+6有界合成run，44快照一致，无清理。
- F为VERIFIED（Windows范围），[验收报告](acceptance/wave1/controller/WATER-W1-F-REVIEW-20261017.md)及集成证据已归档。普通文件不读内容、Windows identity恒Unknown；macOS、真实ACL/ReadDir迭代失败、生产竞态、真实用户授权及F→G/E/UI链路未验证，没有分类/回收量汇总/删除。

## G/H/I并行派前完成（2026-10-17，历史派前，READY分配保持）

- 三树g/h/i、各自worker/water-w1-*，共同架构基线`045ab4f0d01edd573828fbc8cca988e1ad37efee`、tag water-w1-parallel-next-base-20261017。36项新冻结和五旧锁58唯一文件一致，A–F原基线/helper/锁保持。
- G/H的Node24/Rust1.95/MSVC离线基线及真实A/E资产核对通过：17份G预期报告、11份H来源报告均经A校验，4份I资产由真实E投影生成。I的Node24/隔离Chrome空白页探针通过。G/H/I生产目录尚不存在，未运行新产品测试/bridge/UI；macOS未验证。
- G全未知保护报告+完整facts sidecar，H固定白名单汇总且不承诺匿名不可关联，I只读合成报告阅读。三票独占目录/构建状态，无物理fixture/真实数据权限。原派前时均READY未确认外贴，总控未自动启动实现者；当时F继续原票。F最新验收结果见上节。

## F派前完成（2026-10-17，历史派前）

- 独立f树/worker/water-w1-f，精确基线`fc114eb81125cef7d374deddc95144bcd9aee748`，tag water-w1-scan-lab-base-20261017；22项新冻结及四份旧锁43唯一文件一致。A–E产品、原基线/helper/锁及根Cargo不变。
- Node24.16/Rust1.95/MSVC基线通过，Windows身份API编译探针按预期拒绝不稳定API；Windows身份约定Unknown。prepare工具在f树.local准备11正常run/6负例，实际均创建，81057内容字节，44快照一致；std探针确认硬链接文件长度及两种目录链接reparse属性。
- READY待用户外贴，不代表已启动。F仅冻结prepare工具可新建合成文件/链接，Rust生产/测试只读；没有普通文件内容读取、真实用户scope授权、生产竞态保证、分类/报告组装、UI、删除或macOS验收。没有自动启动实现代理。

## E验收集成（2026-10-17，当前）

- 接收HEAD `b285a0e15f6e514b0e90e793ab83f63f85db05d9`，干净；受测实现5b23f9c。42新增文件全部在白名单，19冻结及根Cargo/旧产品不变，实现后只有证据/报告。总控五final门、实际Rust→JSON→C九断言与四项独立内存边界首次全过。
- 隔离受测提交`d5f08d8f36b12db29a210ddb6b53fa413b20584f`在离线新target重复通过五Rust测试、fmt/clippy/metadata、真实桥接九断言与四独立测试；43唯一冻结一致，43份worker文件原字节保持，A/B/C/D产品tree未变。
- E为VERIFIED（Windows范围），详见[E复验/集成报告](acceptance/wave1/controller/WATER-W1-E-REVIEW-20261017.md)。没有物理fixture、正式UI/IPC、扫描/清理或macOS验收；现有票已收口不等于M1完成，下一张扫描票仍为DRAFT。

## D补单01验收集成（2026-10-17，当前）

- 接收HEAD `711c38c9d626c4ceb624a48173356887c913d9c7`，干净；补单三产品/12新记录符合白名单，8冻结及旧证据不变。原check/五测试与独立19边界总控首次全过。
- 隔离受测提交`4e44ee6d3eca2cfd691bc30f298dff3c606e14f9`：两语法、五测试、19独立边界全过，43唯一冻结一致；D产品tree与接收提交相同，A/B/C及E冻结未变。20个合成run仅在集成树.local，未清理。37份源证据原字节一致，Windows三链接能力实际通过，macOS未验证。
- D为VERIFIED，详见[本轮复验/集成报告](acceptance/wave1/controller/WATER-W1-D-ADDENDUM-01-REVIEW-20261017.md)。该轮未改E树或分配；E后续状态见本页最新验收段，没有自动启动实现者。

## D修订/E展示投影安排（2026-10-17，历史派前）

- D仍为干净b92d5b8，无补单新提交/回执；原补单01、起点、helper和8锁保持，不重复派原单或由总控代修。
- E仅依赖已验收A/C，独立`.worktrees/e`、worker/water-w1-e、基线`1fce65323daf79c9f74ff84d86883692e4cb1b3e`。19冻结、Node24/Rust1.95/MSVC链接baseline实际通过，READY待用户外贴；未运行五产品测试或实际E桥接。
- E使用独立packages/report-view workspace/锁，生产逻辑纯内存，不修改根Cargo、A/B/C/D、旧helper或旧锁，不接C页面/IPC。四合法/六非法输入经实际A校验，C对预期数据兼容检查通过，不等于E实现通过。
- [本批安排与后续顺序](dispatch/wave1/NEXT-BATCH-20261017.md)、[E派前回执](dispatch/wave1/REPORT-VIEW-READY-REPORT.md)及registry/manifest为当前依据。总控未自动启动实现者；READY不等于已经外贴。

## 总控接手与A验收/D原单退回（2026-10-17，历史）

- 用户指定接手失效对话`codex:f62e8a21-24f9-488a-904d-a3050525a155`，随后明确A/D已完成、直接验收。以项目材料和实际Git为准，未恢复旧聊天内容。
- A接收HEAD `5e32f51cc2fe5be6c3516a492a7a75f7a63a2015`干净，9冻结一致；补单只改两个产品文件。总控四门及独立wire三测试首次全过。隔离受测提交`74fa13b23729405fc11069e04d6c50b015c6a138`离线五契约/三wire测试及fmt/clippy/metadata全部通过，26冻结与B/C目录tree一致，已VERIFIED并纳入主线。
- D接收HEAD `b92d5b8dff8802d1e403e59c08eb1cd4fb175f5f`干净，8冻结一致；check及五测试首次全过，但纯校验的六类数组/18个非索引属性变体错误接受，CHANGES_REQUESTED，补单01已准备。未集成D。
- B/C产品tree与接收提交完全一致，保留VERIFIED；两个只读辅助仅审计材料，没有实现或发单权限。
- 详见[本轮验收报告](acceptance/wave1/controller/WATER-W1-AD-REVIEW-20261017.md)。本会话环境cwd已是water，仍对每条项目命令显式指定工作目录；旧会话目录切换失败不套用于本会话。

## 下一批派前完成（2026-10-17，历史）

- A仍为干净原提交475c470，9项冻结一致，未见补单新提交/回执；原补单01及续做起点保持，不由总控代修。
- D树`.worktrees/d`、分支worker/water-w1-d，基线`7007c65d5845c3fe5938d920e930c8bcb7ffc4e0`，tag water-w1-fixture-base-20261017-r1。独立8项冻结、Node24、干净baseline及3种链接probe实际通过；11case/57node/575内容字节/18负例已准备。产品工厂未实现，五产品测试尚未运行，macOS未验证。
- [下一批计划](dispatch/wave1/NEXT-BATCH-20261017.md)与[派前回执](dispatch/wave1/FIXTURE-READY-REPORT.md)给出实际证据。D只在自己的.local创建合成夹具，不扫描/分类/删除；权限/取消计划仅为未来验收输入。
- B/C状态和原A/B/C工具/冻结锁不改；总控只读复核、架构与验收，未自动启动实现者。正式核心边界在NEXT-CORE-DRAFT，尚非可派票。

## B/C补充单01复验（2026-10-17，当前）

- B接收提交`5b88fd0c5f306df5586e8c8445d45f39940e8597`，C接收提交`d8cc6979813ecf2ff03898d40b8ae217b1df29f8`，两树干净，后加报告无产品变更。原事实数据/fixture/旧证据及冻结工具均保留。
- 总控独立B语法+五测试、C语法+五模型+两浏览器全部通过，本轮首次通过；原六个独立边界也全部通过，已查看三张实际截图。B继承调用数0、C未知名称顺序正确。
- 独立集成树实际受测提交`d002c0c1d91db47fb8a685a07e0115ac9ad189c9`：7语法、B5/C5/浏览器2、4项独立入口断言、18冻结哈希与文档元数据全部首次通过。B/C目录Git tree与接收提交完全相同，后续只补文档/证据并推进main。
- [复验与集成报告](acceptance/wave1/controller/WATER-W1-BC-ADDENDUM-01-REVIEW-20261017.md)记录真实SHA、receipt与限制。B/C尚未互相接线，也未接A或真实扫描，macOS未验证。以下原交付退回记录为历史。

## B/C原交付独立验收（2026-10-17，历史）

- B提交`d05eae7b5a0fe5c952744336a776a8c5ee1b2873`：check/test总控复跑通过，六工具17页官方来源独立审查未发现具体数据错误；构造数组可用继承方法跳过来源/固定顺序校验，两例真实失败，开B补单01。
- C提交`93e2509882f3090883c8ccaedf2fb30e83dba49a`：check/五模型测试通过，浏览器首次Page.navigate超时，同提交未改代码重跑两测试通过；截图已实际查看。多个未知容量项在name_asc下没有按名称排序，开C补单01。八个固定详情滚动时只读提示文字仍可见，不列该候选缺陷。
- B的30处文件差异、C的39处文件差异均在白名单；各9项并行冻结哈希一致。后加报告未夹带产品变更，两树保持原提交和干净状态。报告、日志、截图、独立边界与历史哈希核对见[BC验收报告](acceptance/wave1/controller/WATER-W1-BC-REVIEW-20261017.md)。
- 各补单续做SHA/新回执已写进主manifest，新增报告白名单，其余原基线/helper/冻结锁不变。补单已准备不等于已外贴或开工；没有合入A/B/C产品、真实扫描/清理或macOS验收。

## A原单独立验收（2026-10-17，历史退回）

- 对干净提交`475c4703be3c455089b8080b53e084d4721b10f7`复跑fmt/test/clippy/metadata全部通过，五个测试真实执行。239文件均在原票范围，9项冻结哈希不变，报告提交未夹带产品变更。
- 总控独立harness链接原库，正例通过；20种wire枚举的93种对象形式、报告20个枚举位置均错误接受，违反字符串Schema，两个目标断言失败。因此不验收合入，发补充单01，不修改worker产品代码。
- [验收报告及证据](acceptance/wave1/controller/WATER-W1-A-REVIEW-20261017.md)已归档。补单起点仍是原提交，基线/helper/冻结锁不变，B/C独立。补单已准备不代表用户已转贴；B/C则于06:20Z观察到各自未提交实现文件，按启动证据记RUNNING，实际开始时间未知。
- Windows Rust契约检查已实际运行；macOS未验证。main仅有架构/调度/验收材料，没有集成A库或真实扫描/清理能力。以下原派前记录为历史事实，最新状态以本节与manifest为准。

## 并行追加与旧观察（2026-10-17，历史）

- ADR-003追加两条独立交付线：B六工具发现/保护元数据与Node纯校验，C固定虚构数据的只读交互原型。它们互不依赖，也不依赖A的在途Rust产物。
- B/C分别在`.worktrees/b`、`.worktrees/c`，分支worker/water-w1-b与worker/water-w1-c，精确基线`e92f39647c91d9ce077d592583c3352626d3402b`，tag water-w1-parallel-base-20261017。各自Node24/冻结哈希/分支/洁净baseline通过；C隔离Chrome空白页探针通过，不是原型UI已验收。
- A树未被修改/同步/切分支；原契约锁、权限、默认Rust helper/rules不变。现观察A HEAD=`475c4703be3c455089b8080b53e084d4721b10f7`且有完成报告、工作树干净，已记SUBMITTED，尚未读实现或复测，不宣称验收通过。
- B/C任务级helper/rules/lock与A不同；用户分别转贴，dispatchedAt/startedAt仍null，没有自动启动B/C。见[本轮计划](dispatch/wave1/PLAN.md)与[并行派前回执](dispatch/wave1/PARALLEL-READY-REPORT.md)。

## 第一轮派前完成（2026-10-17）

- 已冻结 [scan v1契约](../contracts/v1/README.md)、完整Rust API和9项文件哈希；准备66组报告输入、6组raw JSON、6组手工DTO、2组资源边界及基础值材料。
- 架构基线为`a1e68364d47e137f8b66543eb95d35bb04424c78`，tag `water-w1-base-20261017`。
- 槽位a：`F:/new/smaltalk/water/.worktrees/a`，`worker/water-w1-a`，HEAD精确为基线，状态干净。baseline实际运行通过（冻结哈希、分支、Rust1.95.0与MSVC链接探针），未运行产品测试。
- [正式票](dispatch/tickets/WATER-W1-A-CONTRACTS-20261017.md)、权威manifest、工作树、报告与证据父目录均存在；[派前回执](dispatch/wave1/CONTROLLER-READY-REPORT.md)记录已做/未做检查。
- 初次仅A的READY记录现已被后续提交观察及B/C追加更新；该节保留初次派前证据，最新状态以本页“下一步”、独立验收及registry为准。

## 协作约定及初次登记（2026-10-17，初次状态为历史）

- 用户指定总控写架构、规划和验收；实现单由总控写外贴指令、用户转贴，不自动启动实现worker替代人工外贴。
- 已只读学习car op的契约/工单/manifest/检查入口及denglou的独立槽位/行为与反向验收方法，未修改或运行这些项目。
- 已落地 [CONTROLLER-WORKFLOW.md](CONTROLLER-WORKFLOW.md)、工单/回执模板和空登记；完整依据见 [学习记录](../research/CONTROLLER-WORKFLOW-STUDY.md)。
- 最初的空台账阶段已结束；当前唯一活动波次water-wave1、槽位a已准备、WATER-W1-A为READY。依赖它的后置实现票未派；READY不表示执行中。
- 本轮校验通过：25份Markdown、42处本地链接、182处固定本地源码引用、5个上游checkout；外贴登记0任务、工作流来源14份。只验证文档/来源元数据，不是产品行为测试。

## 未完成与验证限制

- 已核实PATH没有cargo/rustc，但默认cargo目录中的代理与精确Rust 1.95.0、rustfmt/clippy及MSVC工具可用；无需先安装或修改全局环境。A补单的原门与独立枚举边界已通过；单票与集成状态分开记录，macOS未验证。
- 当前机器为Windows；macOS行为、签名、安装包、真实容量及恢复能力均未验证。
- 产品许可证、定价、品牌与远程仓库尚未冻结；没有公开发布、推送、收款或联系上游。
- 各上游的静态风险均不是已复现漏洞；Water也没有因此获得安全认证或独有功能证明。
- 旧会话曾遇到目录切换接口未识别observed worktree；此为历史限制。本次接手环境cwd为`F:/new/smaltalk/water`，所有项目产物仍只写Water。

本轮完成记录见 [COMPLETION-SUMMARY.md](COMPLETION-SUMMARY.md)。全部后续项目工作继续在water内，由总控统一分派与验收。
