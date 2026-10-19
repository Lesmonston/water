# Project Workspace v1：AB显式勾选与结构证据

新prototypes/project-workspace，零npm，不改Y/W。继承Y交互布局和安全语义：主要开始/取消、计数/最近两份、错误/取消状态，真实W.startServer报告链接，固定127.0.0.1/Host/Origin/每实例32随机字节token/CSP/no-store等。可从已验收Y参考本项目自己的代码，在新目录实现；旧Y不可写。

新增复选框label必须清楚表达“同时读取所选根目录 package.json（最多256 KiB），只提取结构统计，不读取其它文件正文”，默认unchecked；每次start从当时checkbox捕获bool，立即复位false，活动中禁用checkbox；任何旧任务/上一次同意不带到下一次。未勾选仍可元数据扫描，无强迫开关。不把token/内部程序路径/日志置入产品流程。

API startFromStreams({input:Readable,output:Writable,port=0})->{url,close()}只ready后开HTTP，复制每块、strict UTF-8/单行/重复键/顺序/绑定/上限按project-session-v1。start POST /actions/start body恰{read_manifest:bool}，缺键/额外键/非bool400；cancel {job_id}，其余HTTP权限/1024字节/重复header/动作状态码沿Y。GET/session.json返回workspace_version="water.project-workspace.v1"、connection/active/recent沿Y，active增加read_manifest，recent每项增加read_manifest/marker/evidence_url；不回显token。backend生成job_id。输出start命令的选择必须与本次有效HTTP body相同，accepted/result read_manifest必须与pending一致，否则connection failed/禁动作。

metadata bundle真实委托W.assertReviewInput，必须native会话、session_id=job，固定8/10000/256、native_scope_metadata，不改tag/Q。每个observed的observation_json严格compact JSON/无重复/额外键/Unicode坏值；完整校验Z精确12字段及U内层协议（见root-marker-v1/node-manifest-v1），不能只看status。外层Z含true ordinary_content_read、false project_membership_verified/gesture/race、protected/display_only、bytes_read0..262144；内层仍caller_supplied_text/format_verified=true/parsed_structure等，9个recognized字段/六计数范围。精确null/false不丢，字段存在/计数关联检查：recognized_field_count等于has_name+has_version+(declared_private!=null)+实际提供其它字段数量；U未输出提供标志的scripts/依赖/workspaces只知道count，合法0计数不能反推“没提供”，因此只检查min/max一致性，不补造缺失标志。禁止包名/版本值/依赖名/脚本/workspaces正文/hash/路径/原生ID，unknown键拒绝。false或取消结果不得observed；marker状态关系按共同SPEC。

UI展示本次“未请求读取/选择取消未读/扫描取消未读/未发现根清单/结构证据/读取失败”的明确状态。observed展示bytes_read及U声明/字段存在/六计数，醒目标明仅结构/归属和版本未知/不证明可删；不得称已经确认Node安装或项目归属。failed只将固定code映射可读文本，不泄漏原文。新start不能复用上一条marker；最多两份recent，淘汰时同时撤销自有W server和证据路由。

GET/HEAD /evidence/<job_id>.json仅对本实例仍保留的observed提供，Content-Type application/json;charset=utf-8、attachment; filename="water-project-evidence.json"、Content-Length准确；响应body恰AA发送的Z.to_json原UTF-8字节，不重新serialize，不包含原package正文。缺失/false/取消/失败/淘汰/未知ID404。可在面板预览原结构JSON并系统鼠标点击下载；这是结构证据附件，不冒充整份Q或原始package。W报告/Q继续独立原样。

launchProjectWorkspace({initialDirectory,port=0})只固定本树.local/next-target/debug/water-project-session.exe，realpath/普通文件/项目内、args恰[initialDirectory]、shell=false/rawpipe，无binaryPath/env/PATH/Cargo。独立树无AA时固定净化Project workspace unavailable.；不能假exe或生产开关。close沿Y只关闭自己的进程/服务，先shutdown+EOF，2秒后仅自有child；不假称强杀产生了cancelled报告，正常streams close不destroy调用方资源。

model.test.mjs精确project_workspace_protocol、project_workspace_authority、project_workspace_consent_and_exports；browser.test.mjs精确project_workspace_actions_and_evidence、project_workspace_layout_and_privacy。用冻结双向回放/合成反例，无物理fixture/原生窗口，最多一Chrome；真实鼠标切checkbox/start、核复位和跨job、实际W/Q与证据附件原字节、正确拒绝False+observed/旧job/原文canary、两尺寸及取消截图。nc1去真实HTTP授权使跨origin发实际pipe命令→AB_ACTION_AUTH；nc2去真实选择绑定使false可服务observed证据→AB_CONSENT_BINDING。必须真正影响服务路径，定向3测试红/立即恢复绿，不重复整套Chrome。AA→AB整链等收单后总控验收，不以回放冒称新AA实测。
