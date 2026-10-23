# AB补充单01：内容前取消不丢元数据

2026-10-22。原project-session-v1/SPEC已明确：R报告cancelled **或**内容阶段前token取消时，read_manifest=true返回marker skipped/scan_cancelled。R可在最后一个observer之后仍保留completed；已取得的partial元数据同样不应因内容取消被丢弃。AA真实capture_registered受控实测输出completed+skipped，原AB拒绝，属于消费者漏项。旧协议/479冻结不改，本补追加解释及回归。

对同一job、同意选择read_manifest=true、selection=confirmed的合法completed/partial native bundle，允许marker恰{status:"skipped",error_code:"scan_cancelled",observation_json:null}，仅表示额外内容阶段已请求取消/未读。metadata状态、summary/totals/Q均保持原值；仍建立真实W报告，无结构证据/附件，连接继续ready，active清空且可发起下一次默认false任务。不能将metadata强改cancelled/partial、删snapshot、伪造Z observed或把此次内容同意继承给下一次。

selection cancelled仍只接受skipped/selection_cancelled（true）；read_manifest=false仍只not_requested；metadata cancelled仍只skipped/scan_cancelled（true）；其它矛盾marker、正文/额外键、错误job和accepted/result选择不一致仍拒绝。允许范围不能扩成任意skipped/error_code或false+observed。旧7正例/原所有负例、Q/附件原字节/HTTP权限与生命周期/恰五测试顶层保持。

页面明确区分完成或部分元数据与“已取消内容读取/未读取清单”；不能把已完成元数据写成扫描取消。保留真实W报告链接，不出现结构证据下载/旧job证据。原始Q通过实际系统鼠标下载、与当次bundle原字符串比对。补单browser可在原两个顶层追加场景，新完整/partial合成输入须标明内存适配来源，不冒称新AA/S运行。

CASES的complete来自总控真正AA.capture_registered+末条observer取消，原public capture和哈希在本目录保存；native dialog envelope是控制器合成适配，没有本轮S。partial是明确的内存status/summary/Q同步变体。probe的原7正例及3个取消/选择负对照保持，2个合法late场景×3入口应通过；原缺陷实际6次拒绝作为resume已知回归，不代表产品绿。

稳定生产/测试字节后，真正撤去新增late分支的接收（恢复旧错误拒绝）跑red-late-cancel，必须使至少完成场景命中AB_LATE_CANCELLED_CONTENT；不要改测试/probe/输入或只改错误文本。立即原字节恢复、核hash并test绿/regression绿，再按原定义完成nc1/nc2两个真实生产负控与即时test恢复。最后同一干净SHA check/test/browser final，wrapper仍原样委托旧helper的proofAudit，不放宽原证明。

无原生窗口、无物理fixture访问/新AA构建/执行；仅冻结JSON/Node内存/loopback/一个私有headless Chrome，所有原报告与原归档索引/原411证据不变。新控制从主检出绝对wrapper路径读取，不能merge/复制控制提交到原AB树。最终新报告解释原报告末尾问号乱码对应的STAGING-AUDIT真实结果，注明是补充澄清，原报告不改写。真实AA→AB程序联合验收仍由总控收补单后另做，当前Windows受控不等于真实用户scope/macOS/桌面/M1。
