# Scope Registry v1

可信 Rust 宿主进程内的目录范围生命周期。独立 workspace，仅直接依赖已冻结的 `water-contracts` 和 `water-native-root`。公开接口及错误遵循 [冻结 SPEC](../../contracts/scope-registry-v1/SPEC.md)。

`Registry::new(1..=16)` 限制登记数，pending、confirmed、active 均占一个槽位。`prepare` 先检查容量和重复 scope ID，再由真实 N 打开只读目录 lease；同卷序列号和文件 ID 的根（包括别名）不能重复登记。不同祖先和后代根可以同时登记，本版不检测 scope 重叠，也不汇总容量。

生命周期为 `prepare → preview → confirm → begin_scan → check_permit → finish`。`decline` 移除 pending；`cancel` 使当前 attempt 失效并回到 confirmed；`revoke` 移除登记并释放 lease。`preview`、`confirm`、`begin_scan`、`check_permit` 和 `finish` 经原生句柄刷新、核对初始身份后才成功；native 失败或身份变化保留原状态。

每个 Registry、每条 registration、每次 attempt 分别持有独立 `Arc<()>`，入口使用 `Arc::ptr_eq` 验证对象身份。能力字段私有，没有公开构造、Clone、Debug、Default 或序列化。`scope_id()` 只供关联观察；ID 字符串、路径或观察 JSON 均不能构造权限。重复 active、跨 Registry、完成或取消后的旧 permit、撤销后同 ID 重建的旧能力都被拒绝。

`confirm` 仅表示可信 Rust 宿主在进程内作出了明确声明，**没有认证真实用户手势**。本模块没有原生选择器、IPC、HTTP、CLI、WebView、LLM 或 JSON 恢复入口。所有原生 IO 均在 N 内，本模块只持私有 lease，不保留路径、不打开 File、不枚举目录、不读普通内容或配置、不写文件。N 的 `authorization_granted`、`traversal_allowed`、`race_protection_verified` 原样保持 false；P 的能力不提供遍历操作。

后续原生扫描器须持有效 ScanPermit 并调用 `Registry::check_permit`，重新打开原生根后比对许可身份，按子段在句柄边界内有界遍历。这条链路本票未接入，不能仅凭序列化观察或任意路径授权。

测试前先在仓库根目录运行 `node scripts/ci/prepare-test-fixtures.mjs`：它在 `.local/` 下建好空目录与 junction，并给出 `WATER_SCOPE_FIXTURE_INDEX`；设好这个环境变量后运行 `cargo test --locked --manifest-path packages/scope-registry/Cargo.toml`。五项测试只读这些空目录、junction 与索引，不写普通内容，也不清理夹具。验证范围为当前 Windows 受控合成场景；原生用户选择、强制 native refresh 失败、RootChanged 实触、生产竞态、macOS、桌面和删除未验证。
