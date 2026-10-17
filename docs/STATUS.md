# Water 状态与交接

更新时间：2026-10-17。

本次总控接手的结果与下一条外贴指令见[接手验收摘要](CONTROLLER-HANDOFF-20261017.md)；当前任务状态仍以本页和registry/manifest为准。

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

A/B/C/D已VERIFIED并集成。[E独立报告展示投影](dispatch/tickets/WATER-W1-E-REPORT-VIEW-20261017.md)继续原票，READY待外贴，产品尚未实现。D扫描前置已满足，但正式Rust扫描器的接口/测试冻结与派前检查尚未完成，没有可外贴扫描票；分类/正式桌面接线另排，没有真实用户扫描或清理。

## D补单01验收集成（2026-10-17，当前）

- 接收HEAD `711c38c9d626c4ceb624a48173356887c913d9c7`，干净；补单三产品/12新记录符合白名单，8冻结及旧证据不变。原check/五测试与独立19边界总控首次全过。
- 隔离受测提交`4e44ee6d3eca2cfd691bc30f298dff3c606e14f9`：两语法、五测试、19独立边界全过，43唯一冻结一致；D产品tree与接收提交相同，A/B/C及E冻结未变。20个合成run仅在集成树.local，未清理。37份源证据原字节一致，Windows三链接能力实际通过，macOS未验证。
- D为VERIFIED，详见[本轮复验/集成报告](acceptance/wave1/controller/WATER-W1-D-ADDENDUM-01-REVIEW-20261017.md)。E未改树、原基线/19锁/READY分配保持；没有自动启动实现者。

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
