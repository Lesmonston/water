# L/M外贴纪律

只在本票独立树/分支/白名单实现，权威票面和manifest读主检出，不merge取票。不改A–K、旧helper、旧/新冻结、根Cargo、上游或其他树，不安装依赖/改全局。不得启动实现子代理或另一个CLI写本树。

L/M生产只接内存raw facts和G context，先真实G严格验证；无文件/环境/网络/时钟/进程/CLI/IPC/缓存。测试只读本树固定contracts合成数据，.local仅Cargo构建/日志，没有物理fixture、HOME/真实用户数据或浏览器权限。人工Unix身份只作算法样本。

按COMMON完整五测先红再实现；稳定字节后三负控逐项实际改坏真正逻辑，指定目标红、原字节恢复后suite五测绿。编译/缺文件/超时不算红，不改测试/降断言/skip/测试开关或helper。所有检查走evidence-batch-check，offline/jobs1/每子命令180秒，一次一个门，不跑全仓/watch/coverage。

提交实现/测试后同一干净SHA跑五final门；后加报告/证据不得夹未复测产品。helper保存完整stdout/stderr、当时源码/测试快照和哈希；final要求所有最新红与当前字节完整恢复链。全部helper json/log/txt（不含构建二进制）原字节归档本票证据目录，显式文件名add，日志-f，不批量整个目录。

回执写完整SHA、逐项需求、原/坏/恢复hash、全部失败、具体日志、平台限制和实际模型。起点/范围不符写受阻回执，保留现场，不重置/清理；无push/merge/rebase/清缓存。完成后停止，由总控收单、独立验收再集成；实质修复编号回派。
