# D夹具单执行纪律

仅适用WATER-W1-D，原A/B/C规则与helper不变。用户人工外贴，实现者单独写自己的d树，不启动额外实现子代理；只读辅助如用需记录。

- 首次核对精确基线/分支/干净状态/Node24/冻结锁，运行fixture-check baseline与probe。不得merge主线取票、改冻结输入、改helper或安装依赖。
- 只改票面三项产品文件、新报告与d证据；根Cargo/锁/package.json、B/C产品、其他工作树、上游和共享Vault均禁止。
- fs仅用于本树.local合成夹具与固定repo契约；不遍历HOME/盘符或真实工具目录，不执行脚本/CLI/模型API，不提权、不改ACL，不删除/rename/unlink/清缓存，不实现cleanup入口。
- links只指向同run拥有的目标。unsupported单列并保留error_code；不能复制代替硬链接、用普通目录代替junction或靠skip伪装支持。
- 一次一个本票检查；固定5个顶层测试，0 skip/todo/cancelled；不跑watch/coverage/全仓。上限60秒，测试最多24 run/1MiB；夹具保留.local，不自行清理。
- 真实断言先红和三项有效负控逐一原字节恢复，不能改fixture/测试造绿或把编译错当目标红；负控不能实际写越界路径。
- final命令绑定同一干净实现SHA；之后报告/证据提交不能夹带产品改动。只显式git add；证据目录已设raw字节属性，保留日志哈希，.local永不提交。
- 不push/merge/rebase/发布、不自动动用户普通浏览器。无Git身份用单命令Water Worker (external)/water-worker@localhost，禁改global。
- 完成只记SUBMITTED，写明精确受测SHA、case覆盖、五测试、能力支持/不支持、有效负控/恢复、未验证平台与实际引擎。总控负责独立验收/集成。
