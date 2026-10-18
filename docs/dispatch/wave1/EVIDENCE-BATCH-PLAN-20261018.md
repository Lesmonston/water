# L项目证据 / M容量观察账本外贴批次

2026-10-18，总控Codex，按用户“你出单吧”准备。正式READY与实际派前证据以[EVIDENCE-BATCH-READY-REPORT](EVIDENCE-BATCH-READY-REPORT.md)和manifest为准；文档存在不表示已派出。

| 线 | 产物 | 已验收依赖 | 独占范围 |
|---|---|---|---|
| K补单01 | 修复合法scope根issue空串与页面展示 | 原K/I及实际J回归输入 | 原k树与prototypes/lab-reader；补单01已VERIFIED，不重贴 |
| L | 四种Node/Python文件名标记候选证据侧车 | A/G和冻结facts JSON | 新l树、packages/project-evidence |
| M | 观察逻辑长度、已知身份分组与Unknown/冲突账本 | A/G和冻结facts JSON | 新m树、packages/size-ledger |

L/M互不依赖，也不依赖K页面；无B数据/默认路径展开、旧报告风险/容量修改或真实用户数据权限。两新树共用r1基线82e158079066bf795fb89fafa933bc2d7fc00bd5，tag water-w1-evidence-batch-base-20261018-r1；新锁38项，继承七旧锁132唯一文件，合计151唯一文件。初始未派基线2e6a742与失败日志保留，r1只修新证据.gitattributes自有LF属性及重冻结，不改变旧132项或helper语义。

各线自有workspace/锁/Cargo home/target/tmp，复用只读旧依赖缓存的副本；L/M各jobs1/一次一门，K最多一个Chrome。L/M无物理fixture或浏览器权限，不跑上游/整仓/安装/清理。总控验收门串行安排，收单核SHA/范围/完整红绿后再集成；新侧车接页面/桌面另票。

外贴入口：[L](PASTE-L.txt)、[M](PASTE-M.txt)。每条只给一个新执行对话，不复用K原槽位，不启动内部实现者；模型由用户安排，回执自报。
