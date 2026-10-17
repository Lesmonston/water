# Water 状态与交接

更新时间：2026-10-17。

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
- 暂定独立Rust内核 + Tauri 2 + TypeScript/React。尚未实现产品代码，尚未运行竞品或真实清理。

## 下一步

三票原交付均已独立验收，CHANGES_REQUESTED未集成。分别交回原执行者做[A补充单01](dispatch/tickets/WATER-W1-A-ADDENDUM-01-20261017.md)、[B补充单01](dispatch/tickets/WATER-W1-B-ADDENDUM-01-20261017.md)、[C补充单01](dispatch/tickets/WATER-W1-C-ADDENDUM-01-20261017.md)，互不依赖。扫描器、分类器与正式集成仍等前置验收；总控未代修产品。

## B/C独立验收（2026-10-17，当前）

- B提交`d05eae7b5a0fe5c952744336a776a8c5ee1b2873`：check/test总控复跑通过，六工具17页官方来源独立审查未发现具体数据错误；构造数组可用继承方法跳过来源/固定顺序校验，两例真实失败，开B补单01。
- C提交`93e2509882f3090883c8ccaedf2fb30e83dba49a`：check/五模型测试通过，浏览器首次Page.navigate超时，同提交未改代码重跑两测试通过；截图已实际查看。多个未知容量项在name_asc下没有按名称排序，开C补单01。八个固定详情滚动时只读提示文字仍可见，不列该候选缺陷。
- B的30处文件差异、C的39处文件差异均在白名单；各9项并行冻结哈希一致。后加报告未夹带产品变更，两树保持原提交和干净状态。报告、日志、截图、独立边界与历史哈希核对见[BC验收报告](acceptance/wave1/controller/WATER-W1-BC-REVIEW-20261017.md)。
- 各补单续做SHA/新回执已写进主manifest，新增报告白名单，其余原基线/helper/冻结锁不变。补单已准备不等于已外贴或开工；没有合入A/B/C产品、真实扫描/清理或macOS验收。

## A独立验收（2026-10-17）

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

## 最新协作约定（2026-10-17）

- 用户指定总控写架构、规划和验收；实现单由总控写外贴指令、用户转贴，不自动启动实现worker替代人工外贴。
- 已只读学习car op的契约/工单/manifest/检查入口及denglou的独立槽位/行为与反向验收方法，未修改或运行这些项目。
- 已落地 [CONTROLLER-WORKFLOW.md](CONTROLLER-WORKFLOW.md)、工单/回执模板和空登记；完整依据见 [学习记录](../research/CONTROLLER-WORKFLOW-STUDY.md)。
- 最初的空台账阶段已结束；当前唯一活动波次water-wave1、槽位a已准备、WATER-W1-A为READY。依赖它的后置实现票未派；READY不表示执行中。
- 本轮校验通过：25份Markdown、42处本地链接、182处固定本地源码引用、5个上游checkout；外贴登记0任务、工作流来源14份。只验证文档/来源元数据，不是产品行为测试。

## 未完成与验证限制

- 已核实PATH没有cargo/rustc，但默认cargo目录中的代理与精确Rust 1.95.0、rustfmt/clippy及MSVC工具可用；无需先安装或修改全局环境。A树Rust编译与原合同测试已独立通过，补充枚举边界失败待回派；不是已集成或macOS验证。
- 当前机器为Windows；macOS行为、签名、安装包、真实容量及恢复能力均未验证。
- 产品许可证、定价、品牌与远程仓库尚未冻结；没有公开发布、推送、收款或联系上游。
- 各上游的静态风险均不是已复现漏洞；Water也没有因此获得安全认证或独有功能证明。
- 会话平台的目录切换接口尚未将新仓库识别为observed worktree，切换未成功；当前会话环境根仍是smaltalk。所有项目命令必须显式设置workdir为water，所有文件仍只写water；不要声称平台会话目录已经切换。

本轮完成记录见 [COMPLETION-SUMMARY.md](COMPLETION-SUMMARY.md)。全部后续项目工作继续在water内，由总控统一分派与验收。
