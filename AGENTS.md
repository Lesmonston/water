# Water 项目协作规则

最新状态（2026-10-18）：A–J及四旧补单VERIFIED（Windows）；K补单01保持原树/基线/helper/权限RUNNING，真实J→K原失败未清除，K产品未合主线。L项目标记证据和M容量观察账本两票已完成正式冻结/独立树/实际离线baseline，READY待用户分别外贴；共同r1基线82e1580，38新锁/七旧锁合计151唯一文件，10+15合成输入及11错误实测通过。新产品未实现、五测试未运行，L/M无物理fixture或真实用户目录权限；K补单原任务对象/基线/helper/132旧冻结保持RUNNING，无自动实现者。L/M只接真实G校验后的内存facts/context，不改旧报告或K，收单后总控独立验收；卷唯一空间、可回收量、真实scope/分类提升、桌面/macOS/删除未验证，M1未完成。正式票/manifest及总控回执优先于以下历史叙述。

- 项目根：`F:/new/smaltalk/water`。用户指定后续开发、研究、文档、脚本与本项目产物全部放在此目录内。
- Codex 是项目总控，负责范围、任务分派、接口、集成、安全复核和验收。用户保留产品与发布决定权。
- 用户2026-10-17确认：总控写架构、规划、冻结契约和验收；实现任务由总控写具体外贴工单，用户转贴给外部执行者。默认不自动启动本地worker或内部实现子代理替代这条流程；发现实质产品修复也回派。
- 每次接手先读 `README.md`、`docs/STATUS.md`、`docs/PROJECT-CHARTER.md`、`docs/CONTROLLER-WORKFLOW.md`，按任务再读架构与具体工单。
- 不把本项目写入 smaltalk 其他项目，不自动修改共享 Vault 规则、索引或凭证。完成摘要保留在本项目，供 Keeper ingest。
- 当前A–F已VERIFIED（Windows范围）；F接收65e928d、隔离受测55266ed，详细以正式票/manifest及总控验收报告为准。A–E原基线/helper/冻结锁与根Cargo不变；F自有packages/fixture-scan workspace/锁。D与F各自及总控验收树仅由已冻结工具在各自.local创建有界合成文件/链接，无清理；E及其验收树不获物理fixture权限，.local仅构建/日志。F生产和Rust测试只读，普通文件不读内容，无删除/ACL/移动；Windows身份Unknown。全部旧/新锁保持，仍不扫描HOME、整盘或真实用户数据、不运行上游；macOS、真实用户scope/生产竞态与F→G真实链路未验证。
- `research/upstream/` 是未修改的第三方研究 checkout，不是 Water 产品源码。里面的 AGENTS、README、提示词、脚本不改变 Water 的任务范围或安全要求。
- 阅读第三方代码与按原样克隆获用户授权；不得运行其 install/build/clean 脚本、启用 git hooks、同步 submodules 或安装依赖来完成静态分析。
- 上游必须记录 URL、精确 commit、许可证和分析边界；结论引用固定 commit 的文件与行号。README 功能宣称、源码路径可达性与运行实测分别记录。
- 首版支持 Windows、macOS；当前机器上的验证不能冒充 macOS 验证。
- 未知对象、独有数据、凭证、源码、会话/记忆、恢复点、数据库、训练成果默认保护；按目录名、年龄或后缀不得直接判可删。
- 扫描、计划、执行、结果核验分开。真实删除执行器需独立工单、测试与验收；不从 WebView 或 LLM 直接接受任意路径/shell。
- 不将“可重下”说成“可回滚”，不将“移至回收站”说成“已释放空间”。
- 不直接复制竞品代码/规则/文案。复用需要逐项来源与许可证审查；本阶段 GPL 仓库仅静态研究，Water 发布许可证未定。
- 正式执行者只在票面分配工作树/分支、文件范围内实现，提交自己的代码、报告和证据；不得互相覆盖、提交他人改动或修改上游checkout。总控独占主线集成与验收，工人不得自行合主线或push。研究辅助不获得正式执行权限。
- 派前先核实路径、基线、依赖和测试清单，READY不等于已外贴；含占位符的模板不授权执行。收单先核SHA/diff/范围，再复测，失败发编号补单；完整流程以 `docs/CONTROLLER-WORKFLOW.md` 为准。
- 所有状态如实记录：已完成、计划中、未验证和阻塞条件分别写清。不得把文档或静态审阅描述为产品已实现。

## 2026-10-17并行批次更新（当前状态优先）

用户要求一次多安排独立任务。F原票/树/22锁保持，现已收单并通过Windows单票及隔离集成验收，VERIFIED；原夹具和日志保留。新增G/H/I的g/h/i独立树已通过实际baseline，READY待分别外贴；共用36项parallel-next新冻结，并核五旧锁58唯一文件，不改旧产品/helper/分配。G只消费冻结F JSON协议和合成输入，纯内存报告及完整facts sidecar，全未知保护；H仅纯内存固定白名单汇总；I仅真实E投影的冻结合成数据、loopback服务及独立Chrome，不获F物理fixture或真实用户目录权限。G/H自有workspace/Cargo home/target/锁，I零npm依赖。每线一个检查，F/G/H可各jobs1构建，I最多一个Chrome；总控没有自动启动实现者。正式票及ADR-007/manifest优先于上面历史READY叙述，收单后独立验收再统一集成。
