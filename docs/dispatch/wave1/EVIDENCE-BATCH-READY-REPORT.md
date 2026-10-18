# L/M实际派前回执

后续状态（2026-10-18）：K补单01已完成[独立复验和真实J→K页面集成](../../acceptance/wave1/controller/WATER-W1-K-ADDENDUM-01-REVIEW-20261018.md)，VERIFIED（Windows受控范围）；L/M原任务对象与分配保持。以下为派前时的原记录，不把其中K的RUNNING描述当作当前状态。

2026-10-18，结论READY，待用户分别外贴。总控没有启动实现者；K补单仍在原k树RUNNING，未改变其任务对象、helper、基线、文件范围或权限。

| 票 | 精确基线 / 分支 | 实际基线 |
|---|---|---|
| L 项目标记证据 | 82e158079066bf795fb89fafa933bc2d7fc00bd5 / worker/water-w1-l | PASSED，Node24.16/Rust1.95/MSVC，独立私有离线G/A构建 |
| M 容量观察账本 | 同一基线 / worker/water-w1-m | PASSED，同环境，独立私有Cargo home/target/tmp |

两树HEAD精确、干净，tag water-w1-evidence-batch-base-20261018-r1。分别实际调用已验收G/A，接受10份L输入和15份M输入，11个原始/语义错误返回冻结原code/field。完整输入和输出golden在contracts中；新产品目录不存在，新五测试/final/bridge未运行，不能把预检当产品实现。无物理fixture、真实用户数据、浏览器或上游运行。

[派前审计](../../acceptance/wave1/controller/w1-evidence-batch-preflight-20261018/readiness-audit.json)核38项新锁、七旧锁132唯一文件，合计151唯一文件在主检出及两树逐项一致。旧产品、根Cargo及A–K任务对象在新增前均保持。票面/回执父目录/helper/五测试清单/五最终门/冻结和外贴句均真实存在；模型由用户安排，尚未确认派出。

[完整原始归档](../../acceptance/wave1/controller/w1-evidence-batch-preflight-20261018/archive-manifest.json)保存资产生成失败/成功、两树baseline完整JSON/log及检出失败复现。Cargo产物按真实成功JSON构建图选择，允许无关旧产物共存，不按deps目录同名数量断言。

派前失败和修订均保留：

1. 初版附加duplicate-top-key预期误写InvalidJson，真实G严格DTO报InvalidFacts；未发单前修正预期，原失败日志和旧seeds字节保留。修订后25份输入/11个错误全部实测通过，旧G未改。
2. 生成冻结清单时误列A包内Cargo.lock，实际A属于根workspace，生成前ENOENT停止；修为根Cargo.lock，未创建伪锁或改旧文件。
3. 初版2e6a742在两树启动baseline时，新证据.gitattributes被Windows检出换行转换，冻结hash拒绝，尚未进入构建；另存一份完整复现。r1只为两份新.gitattributes加入自身LF属性并重冻结，旧132项不变。原基线/tag和日志不删除、不重置。
4. 总控一度在快进命令尚未退出时提前启动两个baseline，祖先校验拒绝，未进入构建；等待原快进真正完成后核精确SHA/干净状态，再执行本回执的两份成功baseline。无删锁/强制还原/清理或产品变化。
5. 收尾审计曾把历史manifest和registry中结构不同的旧A对象直接全值比较而失败；改为分别与各自旧版本比较不变、跨表核状态，新L/M则全值一致。未修改旧对象去迁就检查。票面错误样本数量按实际11条核准，未沿用草案误计的15条。

L/M各一次jobs1定向检查、每子命令180秒，可与K一次单Chrome门并行；不跑整仓/watch/coverage。每票先完整可运行行为红，稳定字节后三次真实逻辑负控和逐次suite五测恢复，final核完整源码/测试/红绿字节；收单由总控分别复测，后续侧车接K/桌面另票。人工Unix身份是算法样本，不是macOS文件系统实测。

外贴：[L](PASTE-L.txt)、[M](PASTE-M.txt)，各给一个新执行对话。K补单原执行者继续，无需重贴K原票。真实用户scope、分类策略提升、卷分配/可回收量、macOS、桌面与删除未验收，M1未完成。
