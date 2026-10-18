# L/M总控单票复验与隔离集成

2026-10-18（Asia/Tokyo）。当前两票单票ACCEPTED；隔离新target、六项独立负控、独立边界及实际J保留捕获链路仍待完成，未标VERIFIED。没有改产品实现。

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
