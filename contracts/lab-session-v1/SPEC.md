# Lab Session v1：受控扫描会话快照

独立`packages/lab-session`，package `water-lab-session` 0.1.0，lib `water_lab_session`，`pub mod v1`。edition2024/rust-version1.95/publish=false，[workspace] members=["."]、resolver3，四auto=false，只有lib和显式`tests/session_v1.rs`。依赖恰为本地A/F/G/E/H五库及serde =1.0.229 derive、serde_json =1.0.151；本地路径为同树既有包，不替代registry包，无dev/build/bin/example/bench/unsafe/新包，不改根workspace。离线自有Cargo.lock仅沿用根锁registry版本/source/checksum。

## API与真实装配

```rust
pub fn inspect_fixture(run_id: &str, scan_id: &water_contracts::v1::OpaqueId,
    options: &water_scan::fixture_v1::ScanOptions,
    cancel: &water_scan::fixture_v1::CancelToken)
    -> Result<SessionSnapshot, SessionError>;
pub fn inspect_fixture_with_io<I: water_scan::fixture_v1::ReadOnlyIo,
    O: water_scan::fixture_v1::ScanObserver>(
    run_id: &str, scan_id: &water_contracts::v1::OpaqueId,
    options: &water_scan::fixture_v1::ScanOptions,
    cancel: &water_scan::fixture_v1::CancelToken, io: &I, observer: &O)
    -> Result<SessionSnapshot, SessionError>;
pub fn to_json(snapshot: &SessionSnapshot) -> Result<String, SessionError>;
```

默认入口真正装配NativeIo/NoopObserver并转同一内部路径。先真实F.open_fixture_run，再F.scan_fixture_with_io，使用调用者同一cancel/observer/options，不new替代token、缓存或按case_id模拟。scan_id仅为报告声明。预取消允许F.open的marker/根检查，但随后扫描IO为0，不能宣传整个打开过程零IO。

把真实facts Serialize成JSON交G.assemble_json；ReportContext的平台取当前编译目标windows/macos（不接受调用方伪造platform），每scope按facts顺序、相同ID，label严格`Synthetic `+scope_id，origin=UserSelected（只是合成实验声明，不授真实路径权限）。调用A.to_json/parse_report作真实往返，再E.project_report和H.summarize_report。结果保持G未知保护与来源容量未知，不分类/去重/汇总、不修复不合法状态。自定义IO为可信后端/测试适配器，不可由WebView/LLM提供代码。

## 私有快照与错误

SessionSnapshot提供Debug/Clone/PartialEq/Serialize，全部字段私有，无Default/Deserialize/公开任意值构造器；六字段严格序列化：

- session_version恒`water.lab-session.v1`。
- data_kind恒`controlled_fixture_metadata`。
- source_facts：G的完整source_facts克隆，保留kind/depth/identity与issue origin/operation。
- report：经A验证和往返的ScanReport。
- view：真实E ReportView。
- summary：真实H SummaryExport（只该子字段为白名单汇总，仍不称匿名）。

公开只读getter `source_facts()->&serde_json::Value`、`report()->&water_contracts::v1::ScanReport`、`view()->&water_report_view::v1::ReportView`、`summary()->&water_summary_export::v1::SummaryExport`。不暴露物理绝对路径、任意root、文件句柄、重写API或mutable getter。Debug不得额外输出F私有路径。整个快照含相对标识，不是脱敏导出或可公开数据。

SessionError公开`code:SessionErrorCode, field:&'static str`，实现Debug/Clone/PartialEq/Eq/Display/Error；code同样Debug/Clone/PartialEq/Eq。Display严格`<Debug code> at <field>`。映射固定：OpenRejected /open、ScanRejected /scan、AssemblyRejected /assembly、ProjectionRejected /view、SummaryRejected /summary、SnapshotTooLarge /snapshot、SerializationFailed /snapshot。A往返失败映射AssemblyRejected。没有原输入、ID、绝对路径、原生错误或serde错误文本。真实F的partial/cancelled和issues是成功快照，不能折成Err或清空事实。

返回快照前调用本模块to_json验证可序列化且UTF-8字节<=16777216；to_json也检查同一上限，超限不截断。当前有界fixture未必能触及该分支：普通快照限额实测，超限分支源码核对，未实测不能冒称已测。E/H错误分支在当前合法链路通常不可达，不增加测试专用开关或改冻结库制造覆盖。

## 安全与测试

生产自己的模块不直接读文件/环境/网络/时钟，不创建进程/目录/CLI/IPC；FS仅由F既有公开入口在本J树受控run触及。Rust测试只读helper index/冻结材料/所选run。仅冻结prepare可在本树.local创建11正常+6负例，每批<=24run、<=1MiB内容；复用派前active index，不删除/改marker/ACL/移动/清理。其它工作树不获写入/物理fixture权限。

唯一五顶层测试：session_native_composition、session_cancellation_and_progress、session_errors_and_bounds、session_identity_and_protection、session_snapshot_wire。

必须覆盖11真实D case/12scope/native39entry（unsupported按实际能力扣减，不skip整测试），各snapshot与直接F/G/A/E/H公开入口结果一致；scope根/前缀/链接策略不变。共享token预取消、observer首项取消、平面最后项后取消、跨scope取消及progress累计，真实默认入口和with_io均调用。受控PermissionDenied/RootChanged委托NativeIo，其余调用不得手造facts；默认permission-plan无注入时必须读到普通文件。六个物理负例、非法run_id、无泄露错误；trusted IO提供非法File大小时AssemblyRejected；Windows全部Unknown、硬链接/重叠保留，只有普通File有长度。wire全部六字段、版本/类型/完整一致、输入context/options不变、重复调用稳定、普通输出<=16MiB。

桥接使用冻结lab-session-bridge.rs调用真实J全部13场景（11原生、预取消、注入权限），与另一次现有F/G/A/E/H独立程序结果逐值比较，44快照一致。不是用expected返回值冒充J。

三个真实源码负控，均完整五测试、正确目标断言失败、原字节恢复后suite绿：nc1用fresh CancelToken替代传入共享token，断言消息含J_CANCEL_SHARED；nc2破坏返回source_facts的完整值/issue来源，消息J_FACTS_PRESERVED；nc3把summary.totals.logical_bytes未知改0，消息J_SUMMARY_UNKNOWN。初始可编译行为红消息J_BEHAVIOR。全部使用冻结helper red模式，自动保留完整原始输出及源码快照；最终测试源码与这些记录一致，不靠改测试/缺文件/编译错误/超时造红。
