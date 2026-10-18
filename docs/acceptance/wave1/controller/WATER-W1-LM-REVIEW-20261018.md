# L/M总控单票复验与隔离集成

2026-10-18（Asia/Tokyo）。结论两票VERIFIED，仅Windows受控合成内存范围；原门、隔离新target、六项独立负控、独立边界及实际J保留捕获链路均通过。没有改产品实现。

| 票 | 干净接收HEAD | 受测实现 |
|---|---|---|
| L | d821b11017b2362296e7bc9f62d8adee28003ddb | 7a545fd1a00d17116d435604233a8a4bd9d08651 |
| M | 88c7bd3aa8c1edbe3acfef0571bbd9320caacd9a | 03f60aec13facf0e2b2c4c14e2b560608cc9fe72 |

共同r1基线82e158079066bf795fb89fafa933bc2d7fc00bd5。M报告已在原票约定的.worktrees/m/docs/dispatch/reports/WATER-W1-M-REPORT.md定位，无需变更目录。两执行者均自报Codex/GPT-6，细分后端未提供，无内部实现子代理。

[收单审计](w1-lm-review-20261018/intake-audit.json)核L377/M394新增文件全部白名单内，各六产品/测试/README/锁，后续只追加报告和证据。两票151冻结与主树一致，旧产品与根Cargo不改。L368份/12436836字节、M384份/2592832字节原始helper档与现场一致；合计576完整命令日志、129源码/测试快照核hash。两票共771个变化文件用binary-safe Git批读取核Git blob/工作树原字节一致。

总控在各干净接收HEAD原样复跑fmt/test/clippy/metadata/bridge五final全部通过，各完整五测试；实际L10/M15完整golden与各11个G原错误通过。原helper重新核当前生产/测试字节的行为红及三项负控、逐项suite恢复链，未改冻结helper。各新门的完整stdout/stderr和原helper副本见本目录l/m子目录。

源码审阅：L先真实G解析原JSON，按全entry平铺编号和普通File精确basename产候选，保留filename_only/未验证/保护及全facts/totals；M先G验证，仅File参与u128 checked累加，按同输入(device,inode)稳定分组，长度/link_count冲突与Unknown保持未知，不推断卷唯一分配或回收量。私有字段、无任意构造器、无FS/网络/环境/进程/缓存均与票面一致。

历史证据：L首次额外ReportRejected样本路径过短导致意外接受，在实现前加长并完整重录有效行为红；最终测试字节的有效红早于首次记录中的完整绿。格式及Copy类型clone的clippy失败均保留。M曾用Copy-Item恢复字节却保留mtime，Cargo重用了坏产物，恢复suite失败真实保留；后以原字节写回并更新时间，重新完整nc1红/恢复绿形成最终链。两票先红次序依据保留的实际源码、测试hash及回执时间，未当作外部时间见证。M交回曾提前commit撞index.lock，未删锁/重置，等待原暂存进程结束后正常提交。

隔离验收计划只消费内存/固定JSON：新私有Cargo home/target串行重建L/M，复现六项原生产坏态和完整五测恢复；独立Rust检查文件名/类型/编号、u128精度/身份冲突/跨调用隔离和原始错误透传，再将已验收95704fe的J保留实际13快照直接传真实L/M公开入口。本轮不重新扫描或访问物理fixture，不能把捕获回放说成本轮F/J重扫；不接K页面或桌面。

32MiB OutputTooLarge、SerializationFailed未专门触达；L实际测试G的ReportRejected，M该透传分支仅源码审阅。人工Unix样本只证明算法，macOS采集/真实用户scope、分类提升、卷容量/回收量、L/M页面/桌面接线及删除未验收，M1未完成。

## 通过的隔离集成与主线推进

隔离树.worktrees/integration-lm-20261018，分支controller/water-w1-lm-20261018，实际受测提交 `df17e0ae9ca54d77e66a0b38e6e98d81bcbfadab`。从已核主线9f6cea4分别无冲突合入两接收SHA；新私有Cargo home/target/tmp、离线jobs1串行重建L/M。各五原测试、fmt/clippy/metadata/真实桥接通过，L10/M15完整golden及各11个G来源错误均通过。

[完整成功回执](w1-lm-integration-20261018/2026-10-18T05-02-47.039Z-37000-result.json)保存所有命令stdout/stderr、六份坏态源码及原/坏/恢复hash和实际恢复mtime。六项均完整五测命中对应目标红、原字节写回并完整五测绿，未用Copy-Item保留旧mtime；最后工作树干净。没有修改产品实现、测试或冻结helper。

四项独立Rust检查通过：文件类型/Unicode父路径/全entry编号/跨scope候选；超过u64的整数和、不同device与长度/link_count冲突；跨调用身份域及空观察集合/覆盖分离；原始重复键、未知字段、超8MiB及G错误透传。该独立Rust文件又编译为真实公开入口程序，将已验收95704fe的13份J保留捕获逐份交G→L/M，输出完整侧车并核来源report/facts/totals保留，完整JSON见原始pipeline命令日志。明确没有本轮F/J重扫、物理fixture/身份IO或L/M→K页面接线，不能把人工Unix算法样本称macOS实测。

[主线推进记录](w1-lm-integration-20261018/main-promotion.json)及[字节清单](w1-lm-integration-20261018/worker-byte-manifest.json)核771份worker文件在原树/隔离树/main原字节一致、151冻结及A–K任务/旧产品/根Cargo保持。main先快进至实际受测df17e0a，后续仅文档、证据和台账收尾。

当前A–M及五补单均VERIFIED，未结外贴单为0。L是文件名候选，M是观察集合逻辑长度/身份分组提示；它们不构成真实项目/分类或卷唯一/可回收量证明。32MiB输出超限与SerializationFailed仍未专门触发；真实用户scope、身份IO、侧车展示/桌面、macOS及删除未验证，M1未完成。

收尾核验：141份Markdown、626处本地链接、13任务状态、151冻结及771份交付字节通过；A–K任务对象逐值不变，旧产品及根Cargo保持。80份隔离验收归档核原字节，受测后只有文档/台账/证据变化。上游仅查固定来源和Git元数据，没有运行其程序。
