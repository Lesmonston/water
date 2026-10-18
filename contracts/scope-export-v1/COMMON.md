# P/Q共同冻结与执行

总控2026-10-18。旧A–O/五补单、198旧冻结、旧产品/helper/根Cargo/所有旧树和夹具日志保持。P/Q各自独立Rust workspace/锁，只有真实已验收依赖，不依赖另一在途实现。权威票与manifest在主检出，执行树基线早于票面，不merge取票。总控出单、用户分别外贴、总控收单独立验收，没有内部实现者。

scripts/scope-export-check.mjs只约束范围/冻结/资源/证据，不是OS沙箱。每票唯一完整五测试、offline/locked/jobs1、单子命令180秒，一树一次一个门，不跑全仓/watch/coverage。P仅新冻结prepare在p本树.local建一批4空目录+1junction、普通内容0字节；Rust只读元数据/prepare索引。Q无物理fixture权限，.local只构建/日志。禁止真实用户数据/HOME/盘根、清理/删除/移动/ACL、上游运行/依赖安装/联网fetch。

先完整测试和可编译骨架red-behavior，真实测试退出101且含目标；再实现suite五绿。稳定fmt/clippy后逐个实改真生产负控red-nc1/2/3，每次完整五红→立即原字节恢复→suite完整五绿；缺文件/编译/超时/测试后门不算红。helper保存完整stdout/stderr、源码/测试原字节SHA；final核最新四条红均在下一有效红前有当前字节完整恢复suite，不能fmt修改后沿用过期证据。

同一干净实现SHA串行跑fmt/test/clippy/metadata/bridge五final；实现后只追加报告/原字节证据，不夹未复测产品。显式文件名add，log用-f，不批量git add、不reset/clean/合主线/push。本票证据.gitattributes派前已固定raw json/log/txt/png，不能改。报告写完整SHA/需求/实际模型/所有失败/有效负控三哈希/未验证项；Windows不冒充macOS，baseline不是新产品通过，进程内声明不冒充原生用户手势。
