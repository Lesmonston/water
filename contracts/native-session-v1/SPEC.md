# Native Session v1 — S选择到真实P/R/E/H/Q

总控2026-10-19。本文件同时冻结V生产者与W消费者的协议；不代表新产品已实现。

## 精确wire

成功返回的UTF-8紧凑JSON对象恰七键：

- bundle_version = water.native-session-bundle.v1
- session_id：真实A.OpaqueId，等于调用方session_id；确认时也作R scan_id。
- read_only = true
- selection = cancelled 或 confirmed
- confirmation_source = native_directory_dialog（实际S.Show已发生，不是自然手势鉴真）
- policy：恰 platform=windows、traversal=handle_relative_no_follow、ordinary_content_read=false、native_user_gesture_authenticated=false、race_protection_verified=false、coverage_basis=declared_policy、limits；limits恰max_depth/max_entries/max_dir_entries，来自真实R.ScanOptions getter（0..32/1..10000/1..256）。
- snapshots：选择取消恰[]，不得构造虚假的completed空报告或调用R/E/H/Q。确认时恰一项。

snapshot恰 source_kind=native_scope_metadata、view=真实E.project_report结果、summary=真实H.summarize_report结果、redacted_json=真实Q.redact_report+Q.to_json的紧凑原字节string。view.scan_id=session_id，单Windows/user_selected scope，scope_id为本次真实S返回能力；实际R所有固定证据/保护/Unknown/来源totals完整保留。默认导出不把完整NativeScan侧车、root_identity、绝对根路径、P capability/handle带进协议。

report/status/coverage可能completed/partial/cancelled，和selection分别记录；已确认且传给R的token预取消时仍恰一份真实cancelled报告。原生选择取消时没有R报告；两者不能混淆。所有来源声明只说明原生捕获方法，不认证提供者/自然用户手势/新鲜度，测试可明确回放已保留的实际捕获。

envelope UTF-8<=67108864字节，Q string UTF-8<=16777216。没有省略/额外键或自由路径参数，不将Unknown改0，不从条目重算来源总量。紧凑JSON键顺序不作协议约束，数组顺序/原Q string字节严格保持。

## V库、CLI与安全边界

packages/native-session，water-native-session/water_native_session/pub mod v1，0.1.0/edition2024/rust-version1.95/publish=false；独立workspace members=["."]/resolver3，四auto=false。唯一lib、src/main.rs显式bin water-native-session、tests/session_v1.rs显式test session_v1。直接依赖恰A(path ../../crates/water-contracts)、P/S/R/E/H/Q（../scope-registry、native-picker、native-scan、report-view、summary-export、redacted-report），serde =1.0.229 features=[derive]、serde_json =1.0.151。无N直接依赖/dev/build/新registry/其它target；库和bin全部forbid unsafe，无新FFI。

API：

    pub fn capture_session(registry:&mut Registry,scope_id:&OpaqueId,session_id:&OpaqueId,
      picker:&PickerOptions,options:&ScanOptions,cancel:&CancelToken)
      ->Result<SessionCapture,SessionError>;
    pub fn capture_session_with_observer<O:ScanObserver>(registry:&mut Registry,scope_id:&OpaqueId,
      session_id:&OpaqueId,picker:&PickerOptions,options:&ScanOptions,cancel:&CancelToken,observer:&O)
      ->Result<SessionCapture,SessionError>;
    pub fn to_json(capture:&SessionCapture)->Result<String,SessionError>;

全部参数为真实A/P/S/R类型，capture_session委托NoopObserver。SessionCapture及嵌套wire私有字段、Debug/Clone/PartialEq/Serialize，无Default/Deserialize/任意构造器/可变getter。selection/policy由真实调用产生，不接caller任意Value。

真实S.select_scope先发生；V不在picker前解释R cancel token，不因预取消而伪造选择器取消。S返回None则selection cancelled、registry原有项不变；Some后私有RAII登记guard持有本次SelectedScope和registry借用，R只能消费该scope和SelectedScope.root_path，不回用initial_directory。真实R API结束后真实E/H/Q投影。返回前验证同一to_json上限。

成功、R/投影/序列化错误、observer panic/unwind均撤销本次scope并释放所持路径/能力，registry恢复调用前条目数；不得撤销宿主其它项。S.prepare/full/duplicate失败时没有本次已确认scope，不能cleanup别人。R自身attempt guard仍使用真实实现，不复制权限表。若正常路径P.revoke失败返回Registry，错误路径尽力revoke并保留原错误；不能吞掉本次失败改成成功。

SessionError恰Picker(S PickerError)、Scan(R NativeScanError)、Projection(A ContractError)、Summary(A ContractError)、Redaction(Q RedactionError)、Registry(P RegistryError)、OutputTooLarge、SerializationFailed、InvalidArguments。Debug/Clone/PartialEq/Eq/Display/Error；包装Display等原错误，其余恰<Variant> at /native_session，不回显路径/argv/serde/OS原错。

库不读env/fs/时钟/stdin，不起进程/网络/写文件或扫描器fallback；仅委托真实S/P/R原生能力。bin是可信本机CLI，允许读取argv和写stdout/stderr；恰一个initial_directory参数，仅经真实S.PickerOptions::new设置起始位置，绝不直接把该参数交R当扫描根。固定scope_id=native-scope-cli、session_id=native-session-cli、Registry容量4，R默认limits=8/10000/256和fresh CancelToken。没有CLI预算/脚本/输出文件/模拟来源/测试模式/env fallback。

CLI无参数/多参数退出64，stdout空，stderr InvalidArguments at /native_session加LF；其它失败退出2、stdout空、stderr仅SessionError固定Display加LF。正常、选择取消、扫描partial/cancelled退出0，stdout恰to_json原字节加一个LF，stderr空。Rust stdout经W原字节pipe，不使用PowerShell文本管道。

## 五测试与负控

session_selection_cancelled、session_native_capture、session_cancellation_and_cleanup、session_errors_preserve_registry、session_public_wire_and_cli。每个实际库对话框前测试stderr发WATER_PICKER_CASE cancel/select；单线程、真实S系统窗口，选择当前受控起始目录。CLI无效argv可在测试进程直接启动（不弹窗）；真实CLI正常/取消由bridge mode直接驱动CLI本身，禁止伪造probe为新V产品。

覆盖本次登记撤销和宿主既有能力/容量保持、完整真实R→E/H/Q、部分/预取消/observer取消与panic、R scan_id/session_id、policy getter、严格wire与UTF-8上限、私有类型边界、CLI错误/正常协议。无法触发的OS/序列化失败如实标未验证。

行为V_BEHAVIOR；nc1实际scan改用SelectedScope.root_path的父目录等错误root而非实际所选根→V_SELECTED_ROOT（纯路径运算，无fixture匹配；保留R身份门，错误根应在枚举前拒绝，不改S/R）；nc2正常finish错误标记已释放却未revoke，或直接禁用本次登记guard的实际revoke，使调用后真实registry多留一项→V_RELEASED（不能只删一条而由另一个guard仍正确释放）；nc3实际构造/Serialize将source_kind映射为synthetic_memory→V_NATIVE_SOURCE。实际scope_id/scan_id错误也应拒绝。每项完整五测有效红→原字节恢复→完整五绿，编译/无窗口/超时不算红。

nc1将真实扫描调用中的所选根改为其父目录，保持R身份门，应由根不匹配拒绝而使正确会话用例失败；测试断言含V_SELECTED_ROOT。不得为负控读取PickerOptions私有字段、改S/R或硬编码fixture路径。实际目录与起始位置不同的GetResult行为已有S总控独立验收证据；本票仍逐行审阅只消费SelectedScope.root_path，不能改回CLI参数或cwd。全套测试精确五顶层。
