# water-native-root

Windows 目录元数据与句柄身份观察，冻结接口见 [SPEC](../../contracts/native-root-v1/SPEC.md)。独立 workspace；旧 F/G 的 Windows Unknown 和 M 容量协议保持原义。

`v1::validate_windows_path` 是跨平台纯词法检查。`open_directory(&OpaqueId, path)` 先校验词法，再限制固定本地盘，对指定祖先和终项做非跟随重解析/目录检查；只请求 `FILE_READ_ATTRIBUTES`，返回私有 `DirectoryLease`。`observation()` 和 `to_json()` 只读观察值；`refresh()` 对原 `File` 句柄重新查询属性及 FileIdInfo，既不保存也不重新打开路径。`File` 随 lease RAII 释放；输出只能由成功的原生观察产生。

原生模块只声明 `GetDriveTypeW` 和 `GetFileInformationByHandleEx`，后者只使用 class 9/18。FFI 的布局、借用句柄与缓冲区安全说明逐处在 [native_windows.rs](src/native_windows.rs)；其它模块禁用 unsafe。参照 [Microsoft 句柄查询文档](https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-getfileinformationbyhandleex)、[FILE_ID_INFO](https://learn.microsoft.com/en-us/windows/win32/api/winbase/ns-winbase-file_id_info) 和 [Rust OpenOptionsExt](https://doc.rust-lang.org/std/os/windows/fs/trait.OpenOptionsExt.html)。不请求内容、目录列表、写入或删除权限。

身份是观察时的卷序列号及 128 位文件 ID，不能当作永久唯一标识。祖先预检仍有并发替换窗口；`authorization_granted`、`traversal_allowed`、`race_protection_verified` 始终为 false。此库不授权选择、不遍历、不扫描或删除。

测试前先在仓库根目录运行 `node scripts/ci/prepare-test-fixtures.mjs`：它在 `.local/` 下建好夹具，并给出 `WATER_NATIVE_ROOT_FIXTURE_INDEX`；设好这个环境变量后运行 `cargo test --locked --manifest-path packages/native-root/Cargo.toml`。五个测试只读夹具索引与有界的夹具元数据，不读取普通文件正文。真实用户范围、生产竞态与 macOS 未验证。
