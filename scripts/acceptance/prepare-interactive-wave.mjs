// Controller materials only. Does not create or implement X/Y/Z product code.
import assert from 'node:assert/strict';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
const put=(p,s)=>{mkdirSync(dirname(p),{recursive:true});writeFileSync(p,s);};
const json=(p,x)=>put(p,JSON.stringify(x,null,2)+'\n');
put('docs/decisions/ADR-015-interactive-host-and-consented-marker-reader.md',`# ADR-015：一次推进可操作扫描与项目内容证据

2026-10-19。基于A–W及七补单已验收、真实V→W固定启动器通过。本波三票同时准备、用户分别外贴；总控只冻结/基线/验收，不启动实现者。Windows交互开发预览继续零npm，桌面壳不作为本波新增依赖；Tauri与macOS保留后续环境单。

| 线 | 用户可观察进展 | 独占目录 | 已验收前置 | 独立验证 |
|---|---|---|---|---|
| X | 持续运行的真实原生宿主：重复选择、计数进度、合作取消 | packages/scan-host | V/S/P/R/A | 真实V调用+固定stdio协议；单位检查0窗，native最终3窗 |
| Y | 页面里开始、取消、再扫、打开报告，接真实W下载 | prototypes/live-workspace | W及冻结X/Y协议 | 双向真实pipe回放+HTTP权限/生命周期+私有Chrome，不等X实现 |
| Z | 显式额外内容同意后，只读所选根package.json并交真实U分析 | packages/root-marker | N/P/U/A | 新有界合成夹具+原生句柄/真实U，0窗 |

三线共享接口由本ADR及新契约冻结，无产品文件争写。Y不依赖X实现才能测试；X→Y真正固定程序整链待两票收单后总控联合验收。Z不接入V原ordinary_content_read=false协议，不把内容读取冒标成元数据；后续接页面必须另冻用户同意与新来源侧车。

不增加真实用户数据权限。X仅本树原工厂60字面/74逻辑字节fixture；Z仅新factory固定目录/manifest payload；Y无物理fixture。保护/Unknown不因读到package.json或格式合法降低。无删除/移动/ACL/上游执行/任意shell。旧341冻结与A–W任务/槽位保留。

为缩短交付周期，新票不重复旧全套弹窗：先行为目标红，稳定字节下两条真正生产负控→立即恢复；负控跑指定定向文件，final只在干净SHA跑本票完整清单一次。X整单最多6窗，Y/Z系统窗0；baseline全为0窗。通过且字节未变不机械重跑。环境/编译/超时不算红，额外失败全部留档。完成后停测停改。
`);
put('contracts/interactive-host-v1/SPEC.md',`# Interactive Host v1：X/Y共同边界

旧V/W全部只读。X新crate water-scan-host/water_scan_host，edition2024/rust1.95/publish=false，独立workspace resolver3，四auto=false；唯一lib src/lib.rs、bin water-scan-host src/main.rs、tests/host_v1.rs。直接依赖恰water-native-session、water-native-scan、water-native-picker、water-scope-registry、water-contracts、serde =1.0.229 features=[derive]、serde_json =1.0.151，均已有path/根锁checksum；无新registry/dev/build依赖，lib/bin forbid unsafe。

唯一CLI参数initial_directory只用于真实S起始位置，不能作为扫描根。固定scope_id=interactive-scope，session_id=每次job_id；真实V.capture_session_with_observer→真实V.to_json生成bundle，预算8/10000/256。每次在工作线程内创建并持有自己的Registry/PickerOptions，不把路径/原生能力跨线程或交HTTP。输入线程持续读命令，输出由单一writer串行化，不能让JSON行交错。一次只允许一个原生活动任务，最多接受32个不同start ID；旧ID不得复用，不能排队自动再弹窗。

## STDIO

stdin每条恰一个紧凑UTF-8对象+LF，正文<=4096字节；无BOM、空行、CRLF、重复/转义重复键、未知字段、额外对象、非UTF-8。EOF后不足一行拒绝。stdout事件同样紧凑UTF-8+LF，一行<=67109888字节，bundle自身仍遵守V/W的64MiB上限；stderr正常为空，错误只固定Host unavailable.加LF。argv错误退出64且stderr Invalid host arguments.加LF；协议流无法继续退出2，无stdout诊断/栈/路径。无env输入或任意执行路径。

请求恰：{"command":"start","job_id":"OpaqueId"}、{"command":"cancel","job_id":"OpaqueId"}、{"command":"shutdown"}。job_id遵守A.OpaqueId，空/超长/路径/额外键都拒绝。纯内存公开函数 decode_request(raw:&[u8])->Result<HostRequest,HostError>；raw不含LF，用同一解析逻辑服务生产stdin，HostRequest Debug/Clone/PartialEq/Eq，具体内部状态设计由执行者负责。

事件公共键version="water.interactive-host.v1"、kind；除此只允许对应一行列出的键：

| kind | 其余键 |
|---|---|
| ready | 无 |
| accepted | job_id |
| progress | job_id、visited_entries、recorded_entries（0..10000整数，recorded<=visited，单任务各自单调） |
| cancel_ack | job_id、applied（bool） |
| result | job_id、bundle（真实V对象，session_id=job_id） |
| failure | job_id（可为null）、code |
| stopped | 无 |

failure.code只允许InvalidRequest/Busy/ReusedJobId/UnknownJob/JobLimit/NativeFailure。无自由文本或原始错误。ready一次在任何请求前；accepted先于该任务progress/result/NativeFailure，terminal恰一次，之后回idle。Busy等请求错误不终结活动任务；无未知job的progress/result，不丢弃或重写Q。progress仅输出两个计数，不发relative_path/root/原生ID；observer只观察并转发真实R计数，不为了慢样本sleep。结果来源保持native_scope_metadata及Unknown/保护。

cancel必须匹配当前job才对传给真实V的同一个R.CancelToken调用cancel；无活动/过期/其它ID返回UnknownJob，不取消别人。选择器尚开时取消只表示已请求，不能假称已关闭系统窗口；仍由用户取消选择或确认后得到R已取消报告。selection cancelled无snapshot与确认后scan cancelled有snapshot保持区别。shutdown/EOF在idle正常stopped/退出0；活动时请求合作取消，等待选择器/任务结束，再stopped。Y关闭超时可以仅终止自己启动的X进程，不能据此伪造cancelled报告。

库可暴露用于真实生产调用的状态机/事件API，测试须调用同一实际逻辑；不新增生产测试开关、假扫描器、按fixture/job名返回结果或传任意执行闭包替代实际V。无UI单位检查可测真实CancelToken+R/状态机与解析器；native门额外运行真实X.exe，取消选择/完整/选择前cancel后确认各一次。该门按PID固定title操作，不跑旧V全套UI。
`);
put('contracts/live-workspace-v1/SPEC.md',`# Live Workspace v1：Y可操作开发预览

prototypes/live-workspace，零npm；.gitattributes固定*.mjs/*.html/*.css为text eol=lf。不改W或其它页面。沿W暖白/墨色/细线布局，突出一个“选择目录并扫描”按钮、活动计数、取消、最近两份报告、错误/取消空态。1440x1000与900x800键盘可达，无横向溢出；不把技术日志、token或内部程序路径放在产品页面。

公开Node API：startFromStreams({input,output,port=0})，input为主进程读X stdout的Readable，output为写X stdin的Writable，必须逐块复制、严格验证新stdio协议/事件顺序和真实W.assertReviewInput(bundle)，不接受任意路径或命令。只在ready后启动HTTP；返回{url,close()}，close幂等并关闭自有报告server，不关闭调用方不属于本实例的其它资源。stream结束或错误应停用操作，保存明确失败状态，不伪造结果。生产launchWorkspace({initialDirectory,port=0})只经realpath/项目内/普通文件检查固定本树.local/next-target/debug/water-scan-host.exe，args恰[initialDirectory]、shell=false、raw pipe；不能binaryPath/env/PATH/Cargo替代。无X产品时正常固定净化错误，测试使用公开streams接冻结回放，不能放假exe。

HTTP绑定127.0.0.1和精确Host。GET/HEAD固定UI资源与/session.json；POST /actions/start正文恰{}，POST /actions/cancel正文恰{"job_id":"..."}。动作正文UTF-8<=1024字节，严格对象、拒绝重复键/未知字段/无效类型；Content-Type=application/json，Origin必须精确本实例origin，并校验独立每实例crypto.randomBytes(32)生成的X-Water-Action头。token只在本地首页bootstrap受控提供，动作/轮询/错误/日志/下载不回显；GET不触发选择。缺/错误Host/Origin/token不写stdin，403；错误方法405，非法body400，超限413，活动时start409，未知cancel409。固定错误文本Workspace unavailable.，正确CSP/default-src none/self scripts/styles/connect、no-store、nosniff、no-referrer，路径/query不映射文件。

GET /session.json返回{workspace_version:"water.live-workspace.v1",connection:"ready"|"closed"|"failed",active:null|{job_id,phase:"selecting"|"scanning"|"cancelling",visited_entries,recorded_entries},recent:[{job_id,selection,status,report_url}]}。recent最多2，最近在前；selection是confirmed/cancelled，status为completed/partial/cancelled或selection_cancelled/failed；选择取消无report_url/null。只由后端生成OpaqueId请求，不接caller job_id启动；调用方cancel ID必须匹配当前活动任务。未知/陈旧/重复terminal、倒退计数、矛盾bundle、超行/非UTF-8/重复键都使连接failed并停止动作，不用旧结果覆盖新任务。

结果真实交W.startServer({bundle})展示/下载，report_url仅自有W loopback服务url；不复制W模型/下载逻辑，不重算Q，不把W嵌入被其CSP禁止的iframe。页面有正常报告链接，保留工作台以便再次选择；新的start不把旧Q冒充本次结果。超过两份时关旧W server并移出recent；选择取消无假报告、扫描取消有真实报告。关闭本工作台关闭所有自己建立的报告服务。固定launch关闭时先发送shutdown，2秒未退出只终止自己的X，diagnostic stderr不回显；不自动重启/弹窗。

最多一个私有headless Chrome；回放协议必须明确来自保留捕获的测试回放，不称已经运行新X。至少覆盖取消后再扫、完整→选择取消→确认已取消、busy、有效取消、跨origin/缺token/错job不发命令、异步stale result、断管、报告轮换关闭、实际W页面与系统鼠标点击Q下载原字节。新接口请求权限并非自然用户手势鉴真。X/Y整链由总控两票收单后另做有界验证。
`);
put('contracts/root-marker-v1/SPEC.md',`# Root Marker v1：另行同意的根package.json读取

Z packages/root-marker，water-root-marker/water_root_marker/pub mod v1，独立workspace resolver3，edition2024/rust1.95/publish=false，四auto=false；唯一lib和tests/marker_v1.rs，无bin/dev/build/新registry依赖。直接依赖恰A、N(native-root)、P(scope-registry)、U(node-manifest)、serde =1.0.229 features=[derive]、serde_json =1.0.151。lib deny unsafe；仅私有native_windows.rs可局部allow unsafe，逐处SAFETY/ABI/x64大小对齐断言；不得复制/改旧N/P/R权限表或暴露raw handle。

目录选择/扫描许可不自动授权内容读取。可信Rust调用方须额外调用approve_package_json，才产生不可构造/Clone/Default/Deserialize/Serialize的借用同意对象；不从HTTP/JSON/env获得它。类型携带对真实Registry与真实ScanPermit的借用，不能在调用方finish/revoke后持有许可。没有该对象不得进入读内容函数；constructor即调用真实P.check_permit，读前/读后再check。不是原生手势鉴真，用户交互同意另由未来宿主接线。

固定API：

    pub fn approve_package_json<'a>(registry:&'a Registry,permit:&'a ScanPermit)
      ->Result<ManifestReadConsent<'a>,MarkerReadError>;
    pub fn read_package_json(consent:&ManifestReadConsent<'_>,root_path:&str)
      ->Result<Option<MarkerObservation>,MarkerReadError>;
    pub fn to_json(observation:&MarkerObservation)->Result<String,MarkerReadError>;

root_path只供可信本机调用，不提供任意子路径/文件名参数。按N.validate_windows_path及N.open_directory观察，必须与P.check_permit身份一致；私有原生层再开拥有的目录句柄并查class9/18类型/ID，与同一注册根一致，不能只canonicalize/startsWith。只相对该目录句柄以NtCreateFile(FILE_OPEN/同步/no-follow/non-directory)打开唯一字面package.json（OBJ_CASE_INSENSITIVE），share仅FILE_SHARE_READ，access仅READ_DATA/READ_ATTRIBUTES/SYNCHRONIZE，不创建或写文件。读同一File句柄，禁止root_path.join后普通fs::read/to_string、canonicalize后重开、links fallback或目录遍历。根和file都核reparse/目录/设备，class1 NumberOfLinks必须=1，DeletePending=false；拒绝hardlink/reparse/非普通文件。查class18身份及class1 EOF在读前/后保持，根/permit后验同样一致，否则Changed/RootMismatch，失败无证据。

上限262144原始字节：已知EOF超限先拒绝，再以take(262145)/等效读取硬界限防变化，不能read_to_end无界；只严格UTF-8，BOM按U原解析结果拒绝，不替换坏字节。真实调用U.analyze_package_json(raw)并保留其真实结构证据；不得先Value化丢重复键。缺package.json返回Ok(None)；空/无效/重复/深层/错误shape映射InvalidManifest；只读取固定内容，不执行scripts/包管理器、解析引用/glob、读取其它配置或扫描HOME。无manifest不等于不是项目，格式通过不降保护/证明归属。

MarkerReadError固定枚举Source/InvalidPath/RootMismatch/NotRegularFile/ReparsePoint/MultipleLinks/InputTooLarge/Changed/InvalidUtf8/InvalidManifest/NativeIo/UnsupportedPlatform/SerializationFailed，Debug/Clone/PartialEq/Eq/Display/Error；Display只<Variant> at /root_marker，不保存/回显路径、原文、parser/OS消息。非Windows x64明确UnsupportedPlatform，不冒称macOS验证。

MarkerObservation为Debug/Clone/PartialEq/Serialize私有字段，无Deserialize/Default/任意构造器/可变getter。wire恰marker_version="water.root-marker.v1"、source_kind="native_root_package_json"、read_only=true、ordinary_content_read=true、root_binding_verified=true、native_user_gesture_authenticated=false、race_protection_verified=false、project_membership_verified=false、risk="protected"、action="display_only"、bytes_read(u32)、evidence=真实U.ManifestEvidence。nested U保持caller_supplied_text自身标签，外层另述native来源；无原文/内容hash/字段名值/路径/原生ID/错误正文。U.to_json与嵌套证据逐值等价，精确计数/长度不保证匿名。

不改V/W ordinary_content_read=false协议，不接旧报告重新分类。正式实现仅本树冻结工厂夹具验证：good/missing/invalid/exact/oversize/directory/hardlink/junction/other-root；普通payload读取仅该新factory及Z的受限API/总控probe，全部留存。旧N–W夹具/用户真实文件均不读。当前不证明恶意生产竞态、自然用户同意或真实用户scope。

API核对来源（总控2026-10-19实际读取）：[Microsoft NtCreateFile](https://learn.microsoft.com/en-us/windows/win32/api/winternl/nf-winternl-ntcreatefile)、[FILE_STANDARD_INFO](https://learn.microsoft.com/en-us/windows/win32/api/winbase/ns-winbase-file_standard_info)；复用本项目R已审阅ABI与RAII形状，不能改R。
`);
put('docs/dispatch/W1-INTERACTIVE-WORKER-RULES.md',`# X/Y/Z本波执行规则

权威票面/manifest在主检出；三树从相同精确冻结提交开始，首次HEAD必须精确且干净、产品目录不存在。先baseline复核，不能merge主线取票。只在票面唯一树/分支及白名单实现，不改旧A–W/锁/helper/根Cargo/台账。无内部子代理/分包、push/rebase/clean/reset/删除清理。

本波原生窗口上限：X全任务6、Y/Z=0；baseline均0。X仅native门真实3窗，定向负控至多1窗，其余保留额度用于有依据的失败恢复；不得重复跑旧V UI套。不要sleep拖慢扫描制造取消，可在accepted后先发cancel再确认选择，验证真实token已传给V。Y最多一个独立Chrome，私有profile/下载保留；Z只本树新marker工厂，X只本树原R工厂adapter。

目标测试先红→实现→稳定源码后两个真正生产负控，每红立即按保存原字节恢复并跑受影响测试；不改测试/runner/超时/测试开关，不用编译/缺文件/弹窗/CDP/超时造红。允许按新TESTS.json定向只跑对应测试文件，最后完整final一次；不要求再造旧行为红或把每条负控扩成完整原生套。所有历史失败留存。最终源码/测试变动使相关证明失效，须补该证明，不能拿旧hash冒充。

已提交干净实现SHA串行check --final、test --final（Y再browser，X再native）；报告提交仅报告/证据。check核fmt/clippy/精确metadata/锁/当前生产负控源快照。整个产品/测试目录不允许藏额外target、build.rs、npm依赖/脚本、harness=false或skip/ignore/filter。

每子命令180秒，一树一门，Rust jobs1/private offline，Node24。日常仅受影响测试；通过且字节未变不重跑整套。系统UI与启动器只调用冻结driver/固定exe，不运行上游/全盘/HOME/真实项目数据，无删除/ACL/移动。所有输出在.local/checks/<task>，原始日志/失败/好坏恢复快照/实际下载/截图归档本票证据，ARCHIVE逐项source/archive/bytes/SHA，排除target/cache/binary/profile/payload，日志显式-f逐文件add。

报告须写实际模型、精确基线/受测SHA/回执提交定位、逐需求/命令退出、负控和原字节恢复、全部失败与实际看图、窗口计数及结束进程。只完成单票SUBMITTED，不自行合主线或宣称Windows用户scope/macOS/桌面/M1完成。受阻保留现场，固定报告路径写最小补充需求，不向用户索要临时放宽。
`);
const tasks={
 'WATER-W1-X':{tests:['host_request_boundary','host_job_state','host_progress_cancellation','host_wire_privacy'],testFiles:['packages/scan-host/tests/host_v1.rs'],proof_targets:{nc1:'X_JOB_BINDING',nc2:'X_CANCEL_TOKEN'},final_modes:['check','test','native'],native_dialog_budget:6},
 'WATER-W1-Y':{tests:['workspace_protocol_state','workspace_http_authority','workspace_lifecycle_and_reports'],browser_tests:['workspace_actions_and_download','workspace_layout_and_cancel'],testFiles:['prototypes/live-workspace/tests/model.test.mjs','prototypes/live-workspace/tests/browser.test.mjs'],proof_targets:{nc1:'Y_ACTION_AUTH',nc2:'Y_STALE_RESULT'},final_modes:['check','test','browser'],native_dialog_budget:0},
 'WATER-W1-Z':{tests:['marker_consent_and_binding','marker_native_limits_and_links','marker_real_u_and_privacy','marker_public_types'],testFiles:['packages/root-marker/tests/marker_v1.rs'],proof_targets:{nc1:'Z_SCOPE_BINDING',nc2:'Z_SINGLE_LINK'},final_modes:['check','test'],native_dialog_budget:0}
};
json('contracts/interactive-batch-v1/TESTS.json',{batch_version:'water.interactive-batch.v1',tasks,per_command_timeout_ms:180000,node_major:24,rust:'1.95.0',cargo_jobs:1,baseline_native_dialogs:0,chrome_max_Y:1,negative_modes:['red-nc1','red-nc2'],negative_test_scope:'One assigned test file, no browser; exception X nc2 runs exactly one real native pre-cancel confirmation to prove the actual V argument. Restore unit tests immediately, final native three cases prove restored wiring.',unchanged_green_suite_not_repeated:true});
json('contracts/root-marker-v1/FIXTURES.json',{version:'water.root-marker.fixtures.v1',cap:262144,good_raw:'{"name":"FAKE_PRIVATE_MARKER_CANARY","version":"1.2.3","private":true,"dependencies":{"FAKE_DEP":"^1"},"scripts":{"build":"FAKE_NEVER_RUN"}}',invalid_utf8:[255,254],malformed_raw:'{"scripts":',directories:['good','missing','invalid','malformed','exact','oversize','directory','hardlink','link','other','trap'],junction:'link/package.json -> trap',hardlink:'hardlink/package.json -> trap/private.json',payloads_are_synthetic:true,real_user_data_permission:false});
const source=JSON.parse(readFileSync('contracts/native-session-v1/cases.json')).cases;
const bundle=(index,id)=>{const b=structuredClone(source[index].bundle);b.session_id=id;b.policy.limits={max_depth:8,max_entries:10000,max_dir_entries:256};if(b.snapshots.length){const v=b.snapshots[0].view;v.scan_id=id;v.scopes[0].scope_id='interactive-scope';v.findings.forEach(f=>f.scope_id='interactive-scope');v.issues.forEach(i=>i.scope_id='interactive-scope');}return b;};
json('contracts/interactive-host-v1/CASES.json',{version:'water.interactive-host.cases.v1',source:'contracts/native-session-v1/cases.json',source_kind:'retained_actual_native_capture_replay',new_X_product_used:false,mutations:'Memory-only IDs/default policy; Q original string remains unchanged',cases:[{job_id:'live-complete',action:'complete',bundle:bundle(1,'live-complete')},{job_id:'live-selection-cancelled',action:'selection_cancelled',bundle:bundle(0,'live-selection-cancelled')},{job_id:'live-scan-cancelled',action:'scan_cancelled',bundle:bundle(3,'live-scan-cancelled')}]});
for(const lane of ['x','y','z']) put('docs/acceptance/wave1/'+lane+'/.gitattributes','*.json -text\n*.log -text\n*.txt -text\n*.png -text\n*.md -text\n');
console.log(JSON.stringify({status:'DRAFT',contractsWritten:true,productCodeWritten:false,lanes:Object.keys(tasks)}));
