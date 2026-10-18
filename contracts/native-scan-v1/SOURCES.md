# R原生接口来源与限制

2026-10-18核对，仅官方文档；未复制第三方产品代码。

- [NtCreateFile](https://learn.microsoft.com/en-us/windows/win32/api/winternl/nf-winternl-ntcreatefile)：RootDirectory非空时ObjectName相对该目录；FILE_OPEN只打开既有对象；FILE_OPEN_REPARSE_POINT针对终项；同步打开与SYNCHRONIZE配套。文档未承诺所有并发重命名下的根路径包含。
- [GetFileInformationByHandleEx](https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-getfileinformationbyhandleex)：class1/9/18为固定结构，class10/11为目录批次/重启枚举，失败须检查；不把文件名提示中的64位ID当128位FileIdInfo。
- [FILE_STANDARD_INFO](https://learn.microsoft.com/en-us/windows/win32/api/winbase/ns-winbase-file_standard_info)：两个LARGE_INTEGER、DWORD、两个BOOLEAN；本机实测24字节/8对齐，只采用非负EndOfFile，不宣称AllocationSize是可回收量。
- [FILE_ID_BOTH_DIR_INFO](https://learn.microsoft.com/en-us/windows/win32/api/winbase/ns-winbase-file_id_both_dir_info)：NextEntryOffset按8字节对齐、FileName变长UTF-16。x64受测FileName偏移104；名称长度/下个偏移必须独立边界检查，不能信任未初始化尾部。
- [FILE_ID_INFO](https://learn.microsoft.com/en-us/windows/win32/api/winbase/ns-winbase-file_id_info)、[FILE_ATTRIBUTE_TAG_INFO](https://learn.microsoft.com/en-us/windows/win32/api/winbase/ns-winbase-file_attribute_tag_info)：结合卷序列/128位ID比较打开对象，拒绝所有reparse属性，不只is_symlink。
- [Rust OpenOptionsExt](https://doc.rust-lang.org/std/os/windows/fs/trait.OpenOptionsExt.html)、[FromRawHandle](https://doc.rust-lang.org/std/os/windows/io/trait.FromRawHandle.html)：显式访问/共享/SQOS，只有成功返回且确认有效的新拥有HANDLE才转成File，RAII关闭；无自写CloseHandle。

本机ABI探针只在固定项目内合成根做一层枚举和三已知名字的相对打开，没有递归或普通内容读取。NTFS/当前Windows结果不能替代其它文件系统、macOS或生产竞态验证。原生选择器仍无实际调用/用户确认验证。
