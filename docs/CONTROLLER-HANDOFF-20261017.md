# 总控接手与A/D验收摘要

2026-10-17。项目：`F:/new/smaltalk/water`。供后续总控接手与Keeper ingest；未写共享Vault或其他项目。

用户要求接手失效对话`codex:f62e8a21-24f9-488a-904d-a3050525a155`，随后确认A/D已完成，要求直接验收。未恢复旧聊天；依据项目材料、Git、原回执与本轮实测。

## 已完成

- A补单01接收`5e32f51cc2fe5be6c3516a492a7a75f7a63a2015`。原四门与独立wire三测试通过；隔离集成受测提交`74fa13b23729405fc11069e04d6c50b015c6a138`离线五契约测试、三wire测试、metadata/fmt/clippy通过。26冻结一致，B/C产品tree未变。
- 仅文档/证据收尾后，main从89ba273快进至`d8b79747ae1d20ebaf7d749643e15470fef92977`。A为VERIFIED（Windows范围）。328份worker证据原字节及31项集成归档已复核；新增字节保留属性解决checkout自动换行，不改历史内容或产品代码。
- D接收`b92d5b8dff8802d1e403e59c08eb1cd4fb175f5f`。check和原五测试通过，8冻结一致；独立纯校验19项中18项失败，六类数组上的非索引数字属性被忽略，CHANGES_REQUESTED，产品未集成。
- B/C保留既有VERIFIED，main目录tree与原接收提交一致。本轮未重复其浏览器测试。

证据、限制、精确receipt见[A/D验收报告](acceptance/wave1/controller/WATER-W1-AD-REVIEW-20261017.md)及[主线推进记录](acceptance/wave1/controller/w1-a-integration-20261017/main-promotion.json)。本摘要之后的主线提交仅保存交接/推进记录，不改变受测产品。

## 在途与下一步

D补单01已具备起点、白名单、18回归、NC-04、原五测试和回执规则，等待用户外贴。未自动启动执行者；不要重复外贴A或D原单。

```text
请读取 F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W1-D-ADDENDUM-01-20261017.md，开始执行任务。
```

A/D树保持各自接收HEAD且干净；不重置、复用或清理。模型由用户安排，原执行者Cursor / Grok 4.7为自报。两个内部辅助仅只读审计，没有实现、发单或写文件权限。

正式Rust扫描票仍[DRAFT](dispatch/wave1/NEXT-CORE-DRAFT.md)，待D修订验收及新接口/测试/环境冻结。当前没有真实扫描、删除、Tauri接线或macOS验收，没有push或发布。

NC-07坏态源码未归档、其坏态hash不能独立重建的证据限制已在验收报告列出；不把历史负控叙述等同本轮独立实测。

## 后续安排更新

用户随后要求继续安排任务：D补单01保持原起点；新增E独立内存报告展示投影，与D并行、仅依赖已验收A/C。E的独立树、1fce653基线、19项冻结、Node/Rust版本与MSVC链接预检已通过，READY待用户外贴，产品和实际E→C桥接尚未实现/运行。准确依据见[本批计划与两条外贴入口](dispatch/wave1/NEXT-BATCH-20261017.md)及[E派前回执](dispatch/wave1/REPORT-VIEW-READY-REPORT.md)；正式扫描票仍等D及新接口冻结。

## D补单收口更新

D补单01已交回，接收711c38c、受测实现ff99fb2。总控check/五测试及原19项独立边界全部通过；隔离集成受测`4e44ee6d3eca2cfd691bc30f298dff3c606e14f9`也全部通过，43唯一冻结一致、37份源证据字节保持。D为VERIFIED（Windows范围），A/B/C和E分配不变。20个集成合成run仅在自己的.local，无清理、真实扫描或macOS验收。详见[D复验/集成报告](acceptance/wave1/controller/WATER-W1-D-ADDENDUM-01-REVIEW-20261017.md)。D不再外贴；E继续原票，扫描新接口/测试/派前检查尚未完成，F仍DRAFT。
