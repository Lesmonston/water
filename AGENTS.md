# Water 项目协作规则

最新（2026-10-26，方向调整）：用户决定 Water 转为 Windows 设备垃圾体检与应用内选择性清理的一体化产品，见 [ADR-018](docs/decisions/ADR-018-device-junk-checkup-and-in-app-cleanup.md)。第二波规则与安全底线：

- 开发期允许对本机做**只读**扫描：规则登记位置的名字、大小、时间、属性，以及进程列表与命令行；不读文件内容，命令行不进入任何输出或证据。
- 真实删除只经 Water 应用自身的清理流程发生，由用户本人按下清理按钮；总控准备计划并核对结果。执行者的删除测试只针对本工作树 `.local` 下本次新建的合成夹具，测试结束只删除自己新建的那一个目录。
- 浏览器只清缓存类目录，登录信息、Cookies、网站存储一律受保护。
- 只读、规则与界面票用轻门；删除路径保留重门。界面按 `docs/design/water-ui-v1/` 磨砂玻璃设计实现。

最新状态（2026-10-25）：A–AB及八补单、AD保持VERIFIED；AC/补单06新增VERIFIED（Windows静态桌面基础），AE仍仅研究文档VERIFIED。AC接收29a895d/实现eb7f801，原14产品字节及479归档/16,293,091字节已审计，隔离受测b417835已快进主线。06真实native两份raw2/main1/固定Tao1/未知无效0快照、四文案、正常exit0、私有profile及冻结childClose通过，5510ms；旧03–05失败保持，四次worker allocation已用。总控只做无UI独立Rustc库编译、原三测、137配置/73导航拒绝及26正向、实际快照复算和5根变体/四文案缺失拒绝；不额外开窗，不重跑Cargo/Tauri/旧负控或下载，未改产品与网络配置。旧542保持，总控5新条目/25继承锁共547约束；修正工具按执行前源SHA留档，其它30任务/槽位不变，无自动实现者。AC静态前置已解除，下一波仍须冻结接线接口/范围/测试后才READY；真实AA→AD、桌面扫描、用户scope/自然同意鉴真、生产竞态、macOS/M1未验收。 正式票/manifest及docs/acceptance/wave1/controller/WATER-W1-AC-ADDENDUM-06-REVIEW-20261025.md优先；AC及06无需重贴，旧native/resume入口不再使用。

交接入口（2026-10-28 第 9 份，当前）：新总控先读[总控交接报告](docs/CONTROLLER-HANDOFF-20261028-9.md)；第 8 份[交接报告](docs/CONTROLLER-HANDOFF-20261027-8.md)、第 7 份[交接报告](docs/CONTROLLER-HANDOFF-20261027-7.md)、第 6 份[交接报告](docs/CONTROLLER-HANDOFF-20261027-6.md)、第 5 份[交接报告](docs/CONTROLLER-HANDOFF-20261026-5.md)、第 4 份[交接报告](docs/CONTROLLER-HANDOFF-20261026-4.md)、第 3 份[交接报告](docs/CONTROLLER-HANDOFF-20261026-3.md)、第 2 份[交接报告](docs/CONTROLLER-HANDOFF-20261026-2.md)、上午的[交接报告](docs/CONTROLLER-HANDOFF-20261026.md)与[只读状态快照](docs/handoff/20261026/STATE.json)仅供追溯。本次仅文档交接，产品与31任务/槽位状态保持；没有新READY票或自动执行者，AC旧native/resume入口不再使用。

- 项目根：`F:/new/smaltalk/water`。用户指定后续开发、研究、文档、脚本与本项目产物全部放在此目录内。
- 总控自 2026-10-26 由 Claude 接任（此前为 Codex），负责范围、任务分派、接口、集成、安全复核、验收与整体 UI 设计。用户保留产品与发布决定权。
- 用户2026-10-17确认：总控写架构、规划、冻结契约和验收；实现任务由总控写具体外贴工单，用户转贴给外部执行者。默认不自动启动本地worker或内部实现子代理替代这条流程；发现实质产品修复也回派。
- 用户2026-10-18要求后续按波次，一次出齐所有已满足前置且文件无争写的独立票；单个在途阻塞不阻挡无依赖票。强依赖等验收后下一波，不伪造READY。
- 每次接手先读 `README.md`、`docs/STATUS.md`、`docs/PROJECT-CHARTER.md`、`docs/CONTROLLER-WORKFLOW.md`，按任务再读架构与具体工单。
- 不把本项目写入 smaltalk 其他项目，不自动修改共享 Vault 规则、索引或凭证。完成摘要保留在本项目（Keeper 已于 2026-10-29 停用，不再有自动摄入）。
- 当前A–F已VERIFIED（Windows范围）；F接收65e928d、隔离受测55266ed，详细以正式票/manifest及总控验收报告为准。A–E原基线/helper/冻结锁与根Cargo不变；F自有packages/fixture-scan workspace/锁。D与F各自及总控验收树仅由已冻结工具在各自.local创建有界合成文件/链接，无清理；E及其验收树不获物理fixture权限，.local仅构建/日志。F生产和Rust测试只读，普通文件不读内容，无删除/ACL/移动；Windows身份Unknown。全部旧/新锁保持，仍不扫描HOME、整盘或真实用户数据、不运行上游；macOS、真实用户scope/生产竞态与F→G真实链路未验证。
- `research/upstream/` 是未修改的第三方研究 checkout，不是 Water 产品源码。里面的 AGENTS、README、提示词、脚本不改变 Water 的任务范围或安全要求。
- 阅读第三方代码与按原样克隆获用户授权；不得运行其 install/build/clean 脚本、启用 git hooks、同步 submodules 或安装依赖来完成静态分析。
- 上游必须记录 URL、精确 commit、许可证和分析边界；结论引用固定 commit 的文件与行号。README 功能宣称、源码路径可达性与运行实测分别记录。
- 首版支持 Windows、macOS；当前机器上的验证不能冒充 macOS 验证。
- 未知对象、独有数据、凭证、源码、会话/记忆、恢复点、数据库、训练成果默认保护；按目录名、年龄或后缀不得直接判可删。
- 扫描、计划、执行、结果核验分开。真实删除执行器需独立工单、测试与验收；不从 WebView 或 LLM 直接接受任意路径/shell。
- 不将“可重下”说成“可回滚”，不将“移至回收站”说成“已释放空间”。
- 不直接复制竞品代码/规则/文案。复用需要逐项来源与许可证审查；本阶段 GPL 仓库仅静态研究，Water 发布许可证未定。
- 正式执行者只在票面分配工作树/分支、文件范围内实现，提交自己的代码、报告和证据；不得互相覆盖、提交他人改动或修改上游checkout。总控独占主线集成与验收，工人不得自行合主线或push。唯一例外：派到云端 Linux 的单子，执行者只可推自己的 `cloud/<单号>` 分支，规则见 `docs/dispatch/CLOUD-LINUX-WORKER-RULES.md`。研究辅助不获得正式执行权限。
- 派前先核实路径、基线、依赖和测试清单，READY不等于已外贴；含占位符的模板不授权执行。收单先核SHA/diff/范围，再复测，失败发编号补单；完整流程以 `docs/CONTROLLER-WORKFLOW.md` 为准。
- 所有状态如实记录：已完成、计划中、未验证和阻塞条件分别写清。不得把文档或静态审阅描述为产品已实现。

## 2026-10-17并行批次更新（当前状态优先）

用户要求一次多安排独立任务。F原票/树/22锁保持，现已收单并通过Windows单票及隔离集成验收，VERIFIED；原夹具和日志保留。新增G/H/I的g/h/i独立树已通过实际baseline，READY待分别外贴；共用36项parallel-next新冻结，并核五旧锁58唯一文件，不改旧产品/helper/分配。G只消费冻结F JSON协议和合成输入，纯内存报告及完整facts sidecar，全未知保护；H仅纯内存固定白名单汇总；I仅真实E投影的冻结合成数据、loopback服务及独立Chrome，不获F物理fixture或真实用户目录权限。G/H自有workspace/Cargo home/target/锁，I零npm依赖。每线一个检查，F/G/H可各jobs1构建，I最多一个Chrome；总控没有自动启动实现者。正式票及ADR-007/manifest优先于上面历史READY叙述，收单后独立验收再统一集成。

## Git 远端（2026-10-26）

Water 的 `central` 远端是本机中央裸仓库 `F:/git-central/water.git`，异盘镜像 `E:/git-central-mirror/water.git`；`origin` 是 GitHub 私有仓库 `https://github.com/dfan0519-tech/water`，必须保持私有。只有总控推送：验收合入或台账提交后依次 `git push origin --all`、`git push origin --tags`、`git push central --all`、`git push central --tags`，再 `git -C E:/git-central-mirror/water.git remote update --prune`。执行者不 push、不添加或修改远端，也不改写已有提交（不 amend、rebase、reset，只新增提交），每张票都写明；若在途执行者分支因历史被改写而被拒，总控只对该分支用 --force-with-lease 更新，其余推送照常。`F:/git-central` 下其它项目的仓库、README 与共享镜像脚本不归 Water 管，不要改动或运行。
