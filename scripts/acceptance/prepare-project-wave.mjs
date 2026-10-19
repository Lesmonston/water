// Controller contracts and dispatch materials only. No AA/AB product implementation.
import {mkdirSync,writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
const put=(p,s)=>{mkdirSync(dirname(p),{recursive:true});writeFileSync(p,s);};
const json=(p,x)=>put(p,JSON.stringify(x,null,2)+'\n');
put('docs/decisions/ADR-016-consented-project-session.md',`# ADR-016：将额外内容同意接入同一次选择

2026-10-19。A–Z及七补单已验收，X→Y真实交互链通过，Z仍只有可信Rust API。下一波AA/AB一起冻结、独立建树并实际baseline后外贴；不启动实现者。

| 线 | 本次可观察结果 | 独占目录 | 已验收前置 | 不依赖在途实现的验收 |
|---|---|---|---|---|
| AA | 持续项目宿主，将同一次S选择的scope留到R及可选Z读取结束 | packages/project-session | X/S/P/R/E/H/Q/Z | 真实P/R/Z无UI API + 新固定程序4窗 |
| AB | 默认不勾选的根清单读取选项、结构证据面板、独立脱敏证据附件 | prototypes/project-workspace | W/Y/Z协议 | 冻结双向回放→HTTP/私有Chrome/真实W及实际下载 |

原X/Y/V/W/Z产品、426约束、原任务/槽位/报告均只读。原V完成就revoke，不能事后按UI给的路径重开scope；AA在自己的工作线程真实调用S并拥有其P登记，整个R/可选Z流程结束或panic才撤销自己。复用X.HostState/NativeJob处理真实任务/token，R负责扫描，Z独占内容读取，不新写reader/FFI或权限表。

AB的显式勾选只表达本次请求，不序列化/构造Z能力。AA只有在真实S确认、同job冻结read_manifest=true且未取消时，才在同一真实P登记上开启短暂permit并调用Z.approve_package_json/read_package_json；不借用上一任务同意、不接受UI路径。默认false不调用Z内容API；选择/扫描取消跳过内容。自然用户手势鉴真仍false。

metadata bundle保持原native-session v1及ordinary_content_read=false，它只描述元数据扫描；额外内容读写意图/来源单列marker sidecar，observed中Z的ordinary_content_read=true原样保留。不更改Q，不把结构解析当项目归属或降低protected。AB导出Z原序列化证据，仅统计/声明，不输出package.json正文/包名/依赖名/脚本/内容hash/路径。

两线无共享产品写入，AB可用冻结回放独立完成；真正AA→AB固定程序整链等收齐后总控验收。仅Windows合成fixture，真实用户scope、生产竞态、macOS、桌面、分类归属/引用、M1未放行。AA全票最多6窗（正常native final4窗，2窗只用于有依据失败恢复），AB系统窗0；派前均0窗。负控定向，无变化不重复完整门。
`);
put('contracts/project-session-v1/SPEC.md',`# Project Session v1：AA宿主与AB共用wire

packages/project-session，water-project-session/water_project_session/pub mod v1，独立workspace members=["."]/resolver3，0.1.0/edition2024/rust1.95/publish=false，四auto=false。唯一lib src/lib.rs、bin water-project-session src/main.rs、test tests/project_v1.rs。直接依赖恰A、P、S、R、E、H、Q、Z、X（water-contracts/scope-registry/native-picker/native-scan/report-view/summary-export/redacted-report/root-marker/scan-host）及serde =1.0.229 features=[derive]、serde_json =1.0.151；无新registry/dev/build依赖。lib/bin forbid unsafe，无新FFI、路径读文件、shell/网络或环境fallback；内容IO只真实Z。

## 可信Rust公共API

    pub enum MarkerChoice { Skip, ReadRootPackageJson }
    pub fn capture_registered<O: water_native_scan::v1::ScanObserver>(
      registry:&mut Registry, scope:&RegisteredScope, root_path:&str, job_id:&OpaqueId,
      choice:MarkerChoice, cancel:&CancelToken, observer:&O)
      ->Result<ConfirmedCapture,ProjectError>;
    pub fn to_json(capture:&ConfirmedCapture)->Result<String,ProjectError>;

MarkerChoice为Debug/Clone/Copy/PartialEq/Eq，无Default/Deserialize；内容选择必须显式，不把HTTP布尔值当成可反序列化的Z.ManifestReadConsent。ConfirmedCapture私有字段Debug/Clone/PartialEq/Serialize，无Default/Deserialize/任意构造器/可变getter；序列化恰capture_version="water.project-capture.v1"、read_manifest(bool)、snapshot(真实R→E/H/Q单项native_scope_metadata)、marker(下述结构)。此可信API接真实P已确认能力，可由宿主直接确认；不声称自身打开S，不输出native_directory_dialog声明。root_path必须让真实R与Z分别对同一P根身份验证，不能仅路径前缀。固定R options=8/10000/256，job_id作真实scan_id，原始Q string保持。调用方拥有scope，API只结束自己创建的attempt，不revoke/取消别人的scope/permit，错误/panic均释放本次短暂内容attempt。

ProjectError恰InvalidArguments、InvalidRequest、NativeFailure、SerializationFailed、OutputTooLarge，Debug/Clone/PartialEq/Eq/Display/Error，Display只Project session unavailable.，不含路径/原错；CLI请求failure code仍用下述固定六值，不将ProjectError原文送UI。

流程：先真实R.scan_registered_with_observer，它自己结束元数据attempt；若choice Skip，marker=not_requested，不调用Z.approve/read。若R报告cancelled或在内容阶段前cancel.is_cancelled，marker=skipped/scan_cancelled，不调用Z。否则由同一registry.begin_scan(scope)获得真实短暂permit，借用它调用Z.approve与Z.read(root_path)，作用域结束前真实finish，任何失败/unwind guard只cancel自己活动attempt；不创建新的根登记或偷换路径。Z读取失败保留真实元数据与独立failed sidecar，不能把整个目录称为空。请求取消到达实际读取之后不能倒推为“未读”，最多262144字节同句柄读取不新增中断承诺。

## CLI与双向stdio

唯一CLI参数initial_directory只供真实S起始位置。缺/多/无效参数64，stderr Invalid project arguments.加LF；正常stderr空。不可恢复wire/输出错误退出2且仅stderr Project session unavailable.加LF。无配置文件/环境/任意程序路径/原文日志。

复用真实X.HostState/NativeJob管任务ID、最多32接受、不复用、不排队、共享CancelToken；不用X.run（它不持有内容选择），自己固定输入线程/单writer/原生工作线程。工作线程真实S.select_scope→拥有SelectedScope→上述capture_registered，root只SelectedScope.root_path，scope固定project-scope，job_id来自本次start。RAII在正常/错误/panic撤销自己确认的P登记，scope不出线程/协议。S取消不调用R/Z。

每请求严格紧凑UTF-8单对象+LF，正文<=4096字节，无BOM/CRLF/重复/转义重复键/未知字段/残行。请求恰start {command:"start",job_id:OpaqueId,read_manifest:bool}、cancel {command:"cancel",job_id:OpaqueId}、shutdown {command:"shutdown"}；start缺read_manifest拒绝，值只bool，绑定job直到terminal，后续消息不能改变。公开decode_request(raw:&[u8])->Result<ProjectRequest,ProjectError>为同一生产解析入口，raw不含LF。

事件version="water.project-host.v1"；kind/其余键恰：ready无；accepted job_id/read_manifest；progress job_id/visited_entries/recorded_entries；cancel_ack job_id/applied；result job_id/read_manifest/bundle/marker；failure job_id(可null)/code；stopped无。事件<=67125248字节含LF，bundle独立<=67108864，marker observation_json UTF-8<=8192。其它顺序/单调/绑定/一次terminal/六个failure.code InvalidRequest/Busy/ReusedJobId/UnknownJob/JobLimit/NativeFailure/合作shutdown与EOF规则沿原interactive-host-v1，不改旧协议或工具；progress不发路径。单writer，不交错stdout。

result.bundle为原native-session v1精确七键、选择与来源保持：只有真实S确认/取消的CLI可声明native_directory_dialog。确认时capture.snapshot原样作为一项，session_id=job_id，固定policy8/10000/256及ordinary_content_read=false；选择取消snapshots=[]。此false只描述元数据，不描述旁边的额外内容sidecar。只有真实S选择后的路径可组此结果，不能用CLI起始位置或其它请求替代。

marker恰status/error_code/observation_json：

| 条件 | status | error_code | observation_json |
|---|---|---|---|
| read_manifest=false，无论取消与否 | not_requested | null | null |
| 请求true但S取消 | skipped | selection_cancelled | null |
| 请求true但扫描取消/内容前取消 | skipped | scan_cancelled | null |
| true且Z返回None | missing | null | null |
| true且Z返回观察 | observed | null | Z.to_json原UTF-8 string |
| true且Z返回错误 | failed | Z固定枚举名（见root-marker-v1） | null |

不得将observed绑定false、错误job或S取消；failed不得伪造成功/输出原始错误。不输出根路径/身份/能力/package正文/内容hash。选择取消和scan_cancelled的marker优先于读；请求true不保证成功。保护、归属未知/未鉴真保持false，不回写旧报告分类。

tests/project_v1.rs精确四测试：project_request_boundary、project_consent_state、project_capture_and_marker、project_wire_and_cleanup。无UI检查通过真实P直接确认本树factory根调用真实新API：Skip、Read、预取消、missing/malformed/oversize/links、scope/attempt保持和observer panic，及私有类型编译拒绝+成功对照；不冒称这些P测试调用S。native final真实新CLI同一进程4窗：默认false确认、true确认、true选择取消、true先cancel再确认。坏态nc1真的忽略choice调用Z产生观察→AA_NO_CONTENT_CONSENT；nc2真的绕过取消前置调用Z，使真实cancelled report仍出现内容证据→AA_CANCEL_NO_READ。定向4测试有效红后立即原字节恢复/test绿；不靠改字段标签造红，不修改Z/R/X或tests/helper。
`);
put('contracts/project-workspace-v1/SPEC.md',`# Project Workspace v1：AB显式勾选与结构证据

新prototypes/project-workspace，零npm，不改Y/W。继承Y交互布局和安全语义：主要开始/取消、计数/最近两份、错误/取消状态，真实W.startServer报告链接，固定127.0.0.1/Host/Origin/每实例32随机字节token/CSP/no-store等。可从已验收Y参考本项目自己的代码，在新目录实现；旧Y不可写。

新增复选框label必须清楚表达“同时读取所选根目录 package.json（最多256 KiB），只提取结构统计，不读取其它文件正文”，默认unchecked；每次start从当时checkbox捕获bool，立即复位false，活动中禁用checkbox；任何旧任务/上一次同意不带到下一次。未勾选仍可元数据扫描，无强迫开关。不把token/内部程序路径/日志置入产品流程。

API startFromStreams({input:Readable,output:Writable,port=0})->{url,close()}只ready后开HTTP，复制每块、strict UTF-8/单行/重复键/顺序/绑定/上限按project-session-v1。start POST /actions/start body恰{read_manifest:bool}，缺键/额外键/非bool400；cancel {job_id}，其余HTTP权限/1024字节/重复header/动作状态码沿Y。GET/session.json返回workspace_version="water.project-workspace.v1"、connection/active/recent沿Y，active增加read_manifest，recent每项增加read_manifest/marker/evidence_url；不回显token。backend生成job_id。输出start命令的选择必须与本次有效HTTP body相同，accepted/result read_manifest必须与pending一致，否则connection failed/禁动作。

metadata bundle真实委托W.assertReviewInput，必须native会话、session_id=job，固定8/10000/256、native_scope_metadata，不改tag/Q。每个observed的observation_json严格compact JSON/无重复/额外键/Unicode坏值；完整校验Z精确12字段及U内层协议（见root-marker-v1/node-manifest-v1），不能只看status。外层Z含true ordinary_content_read、false project_membership_verified/gesture/race、protected/display_only、bytes_read0..262144；内层仍caller_supplied_text/format_verified=true/parsed_structure等，9个recognized字段/六计数范围。精确null/false不丢，字段存在/计数关联检查：recognized_field_count等于has_name+has_version+(declared_private!=null)+实际提供其它字段数量；U未输出提供标志的scripts/依赖/workspaces只知道count，合法0计数不能反推“没提供”，因此只检查min/max一致性，不补造缺失标志。禁止包名/版本值/依赖名/脚本/workspaces正文/hash/路径/原生ID，unknown键拒绝。false或取消结果不得observed；marker状态关系按共同SPEC。

UI展示本次“未请求读取/选择取消未读/扫描取消未读/未发现根清单/结构证据/读取失败”的明确状态。observed展示bytes_read及U声明/字段存在/六计数，醒目标明仅结构/归属和版本未知/不证明可删；不得称已经确认Node安装或项目归属。failed只将固定code映射可读文本，不泄漏原文。新start不能复用上一条marker；最多两份recent，淘汰时同时撤销自有W server和证据路由。

GET/HEAD /evidence/<job_id>.json仅对本实例仍保留的observed提供，Content-Type application/json;charset=utf-8、attachment; filename="water-project-evidence.json"、Content-Length准确；响应body恰AA发送的Z.to_json原UTF-8字节，不重新serialize，不包含原package正文。缺失/false/取消/失败/淘汰/未知ID404。可在面板预览原结构JSON并系统鼠标点击下载；这是结构证据附件，不冒充整份Q或原始package。W报告/Q继续独立原样。

launchProjectWorkspace({initialDirectory,port=0})只固定本树.local/next-target/debug/water-project-session.exe，realpath/普通文件/项目内、args恰[initialDirectory]、shell=false/rawpipe，无binaryPath/env/PATH/Cargo。独立树无AA时固定净化Project workspace unavailable.；不能假exe或生产开关。close沿Y只关闭自己的进程/服务，先shutdown+EOF，2秒后仅自有child；不假称强杀产生了cancelled报告，正常streams close不destroy调用方资源。

model.test.mjs精确project_workspace_protocol、project_workspace_authority、project_workspace_consent_and_exports；browser.test.mjs精确project_workspace_actions_and_evidence、project_workspace_layout_and_privacy。用冻结双向回放/合成反例，无物理fixture/原生窗口，最多一Chrome；真实鼠标切checkbox/start、核复位和跨job、实际W/Q与证据附件原字节、正确拒绝False+observed/旧job/原文canary、两尺寸及取消截图。nc1去真实HTTP授权使跨origin发实际pipe命令→AB_ACTION_AUTH；nc2去真实选择绑定使false可服务observed证据→AB_CONSENT_BINDING。必须真正影响服务路径，定向3测试红/立即恢复绿，不重复整套Chrome。AA→AB整链等收单后总控验收，不以回放冒称新AA实测。
`);
put('docs/M1-PROJECT-CONSENT-PLAN-20261019.md',`# M1下一步：同次选择的额外内容同意与证据

2026-10-19。当前A–Z及七补单已VERIFIED；X/Y真实交互与Z受限reader均已实现。本波AA/AB将Z接入同次选择的用户流程，不改既有X/Y/V/W/Z协议或产品。

AA生产者持有真实S选中能力，真实R元数据结束后只在本次explicit read_manifest=true且未取消时调用Z；AB消费者提供默认关闭的复选框、结构证据和独立脱敏附件。共享wire提前冻结；AA已有依赖均验收，AB可用明确合成的控制器依赖捕获回放独立实现，两票可同时外贴，文件无争写。

派前必须新独立树/共同精确基线/新锁保持旧426/实际baseline。准备不打开系统窗口，不读取真实用户数据。AA只新树原冻结marker factory 524474字面合成payload，AB无物理fixture；生产者native4窗限定本树good根，整单最多6窗。真实AA→AB整链等两票收单后总控有界验收。额外同意自然手势鉴真、真实用户scope、macOS/桌面、项目归属与引用/分类、M1仍未完成。

本波只两张直接推进该缺口的独立票；没有为凑并行新增孤立规则/壳或开放真实文件读取。临时文档和验收工具由总控负责，普通产品实现继续用户外贴。
`);
put('docs/dispatch/W1-PROJECT-WORKER-RULES.md',`# AA/AB执行约束

先核本票唯一树/分支/精确首次干净HEAD与产品不存在，读主检出权威票及manifest，运行本票baseline。不merge取票、复制控制提交或改旧A–Z/426/锁/helper/根Cargo。只票面新产品、报告和本票证据；无实现子代理/分包，无push/reset/clean/删除/ACL/移动/上游运行/真实用户数据。

AA Rust1.95/MSVC/jobs1/private offline，直接依赖/target按SPEC；每命令180秒。AB Node24/零npm/一个私有headless Chrome，原生系统窗0。AA baseline/单位/负控均0窗，只有native --final4窗，整单预算6，失败不循环重开；仅固定PID/title和本树good合成根。factory/read APIs之外不读普通payload；所有fixture/profile/download原位保留。

先完整指定测试+可运行骨架，red-behavior命中本票目标，不用编译/缺文件/超时/CDP造红。稳定源码/测试两条真正生产负控，临时改逻辑→red-nc1/2→立即按保存原字节恢复/hash→test绿，再下一条。定向测试即可，不机械重复浏览器/原生套。final核当前testHash/productionHash恢复链，只在干净实现SHA串行check/test及native或browser一次；后续报告提交仅报告/证据。

所有命令/退出/失败/源码好坏恢复/实际看图/窗口与结束进程纳入回执。原字节归档source/archive/bytes/SHA，排除target/cache/binary/profile/payload，.log显式-f，逐路径暂存，不用整树add。报告写真实模型和未验证；完成仅SUBMITTED，交回停改停测。受阻保存现场，同一路径任务受阻，列最小补充需求，不索要临时放宽。
`);
const tasks={
 'WATER-W1-AA':{tests:['project_request_boundary','project_consent_state','project_capture_and_marker','project_wire_and_cleanup'],testFiles:['packages/project-session/tests/project_v1.rs'],proof_targets:{nc1:'AA_NO_CONTENT_CONSENT',nc2:'AA_CANCEL_NO_READ'},final_modes:['check','test','native'],native_dialog_budget:6},
 'WATER-W1-AB':{tests:['project_workspace_protocol','project_workspace_authority','project_workspace_consent_and_exports'],browser_tests:['project_workspace_actions_and_evidence','project_workspace_layout_and_privacy'],testFiles:['prototypes/project-workspace/tests/model.test.mjs','prototypes/project-workspace/tests/browser.test.mjs'],proof_targets:{nc1:'AB_ACTION_AUTH',nc2:'AB_CONSENT_BINDING'},final_modes:['check','test','browser'],native_dialog_budget:0}
};
json('contracts/project-batch-v1/TESTS.json',{batch_version:'water.project-batch.v1',tasks,node_major:24,rust_version:'1.95.0',cargo_jobs:1,per_command_timeout_ms:180000,baseline_native_dialogs:0,negative_modes:['red-nc1','red-nc2'],negative_scope:'Only assigned unit/HTTP test file; zero native/browser windows. Restore exact bytes and affected tests immediately; final full assigned modes once.'});
for(const lane of['aa','ab'])put('docs/acceptance/wave1/'+lane+'/.gitattributes','.gitattributes text eol=lf\n*.json -text\n*.log -text\n*.txt -text\n*.png -text\n*.md -text\n');
console.log(JSON.stringify({status:'DRAFT',productsImplemented:false,tasks:Object.keys(tasks)}));
