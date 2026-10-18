# Native Root v1来源与边界

核对日期2026-10-18。仅使用下列官方技术资料；新N实现不复制竞品代码。网页说明、ABI探针、N产品测试分别记录。

- [GetFileInformationByHandleEx](https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-getfileinformationbyhandleex)：class9取属性/tag，class18取File ID信息；失败返回值必须检查，不能读取未初始化输出。
- [FILE_ID_INFO](https://learn.microsoft.com/en-us/windows/win32/api/winbase/ns-winbase-file_id_info)：volume serial与128位File ID一起比较开放句柄的对象身份，不能把ID当全局永不复用ID或范围授权。
- [FILE_ATTRIBUTE_TAG_INFO](https://learn.microsoft.com/en-us/windows/win32/api/winbase/ns-winbase-file_attribute_tag_info)：两个DWORD字段，属性中的重解析标记必须拒绝，不能只识别symlink一种tag。
- [CreateFileW](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-createfilew)：目录句柄需BACKUP_SEMANTICS，OPEN_REPARSE_POINT使最终重解析对象以自身打开；不会自动约束所有祖先或并发替换。共享标志不应被缩减来阻塞用户操作，不启用备份/恢复权限。
- [Rust OpenOptionsExt](https://doc.rust-lang.org/std/os/windows/fs/trait.OpenOptionsExt.html)：access_mode覆盖普通read/write参数，share_mode与custom_flags控制原生打开，security_qos_flags用于约束身份模拟。实际1.95可编译性以本机探针为准。
- [Windows路径命名](https://learn.microsoft.com/en-us/windows/win32/fileio/naming-a-file)：保留设备名、尾点/空格及设备/UNC命名空间不能仅靠Path::components正规化处理。
- [GetDriveTypeW](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-getdrivetypew)：N本版仅允许DRIVE_FIXED，拒绝网络映射/未知/其它驱动类型；这是有意收窄的产品边界，不宣称Windows只支持一种盘。

没有从文档推断当前所有Windows/文件系统可用：实际ABI探针须成功，Unsupported仍拒绝。探针只核固定项目内目录，未遍历、未读取普通内容，不能称N已实现或真实用户scope已验收。目录身份与文件长度/硬链接回收也不是同一件事；旧G/M协议不因此扩展。
