# J/K外贴执行纪律

2026-10-18，总控冻结。只在本票树/分支/白名单内实现，权威票面和manifest读主检出，不merge取票。不改A–I产品/六旧锁/helper/上游/根Cargo/其它树，不安装依赖或改全局。无内部实现子代理；只读辅助可用并记回执，无独立写入/发单权限。

J只通过未修改prepare工具在自己的.local新建一批受控D文件/链接，生产与Rust测试只读，普通文件内容不读，无marker改写/ACL/移动/删除/清理。K不获任何物理fixture或真实数据权限，仅固定静态产品文件、内存bundle和自己的.local构建/浏览器状态。禁HOME/整盘/真实用户目录、任意path/shell、UI/IPC、上传/执行器/发布。

所有检查走新session-batch-check；J offline/jobs1/180秒，K模型30秒、浏览器120秒、完整suite150秒。每线一个门，K最多一个Chrome，禁整仓/watch/coverage。派前baseline不测试新产品。复用J active index，不反复造批次；所有夹具/profile保留。

先完成唯一完整测试文件/清单和可编译骨架，red-behavior记录真正目标行为红，再实现。fmt/clippy及逻辑稳定后完成red-nc1/2/3，每次只暂时改真正生产逻辑，完整suite命中指定标记断言；原字节恢复/更新mtime后普通suite五测绿。禁止改测试/skip/降断言/放宽超时/坏依赖/测试开关造红。helper保存完整stdout/stderr、源码和测试快照/哈希；最终门要求每个红及之后当前生产字节的恢复suite证据，测试字节保持一致。

所有证据以helper原字节为准。提交前显式点名add（log用-f；可分批明确文件名，禁git add .等）；提交实现/测试，干净同一SHA跑所有final门，再独立追加回执/证据，不夹未复测产品。报告记录全部失败和局限，不把编译/超时当行为红、不伪造历史顺序；实际模型自报，不预填。无push/merge/rebase/全树还原/git clean/清缓存；受阻保留现场，列具体最小缺口，由总控修票或发补单。
