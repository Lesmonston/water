# Project Session v1：AA宿主与AB共用wire

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
