# Windows ABI来源与边界

总控2026-10-18核对Microsoft官方接口文档。仅使用系统接口，不复制竞品实现。

- [IFileOpenDialog](https://learn.microsoft.com/en-us/windows/win32/api/shobjidl_core/nn-shobjidl_core-ifileopendialog)
- [FILEOPENDIALOGOPTIONS](https://learn.microsoft.com/en-us/windows/win32/api/shobjidl_core/ne-shobjidl_core-_fileopendialogoptions)
- [SetFolder](https://learn.microsoft.com/en-us/windows/win32/api/shobjidl_core/nf-shobjidl_core-ifiledialog-setfolder)
- [GetResult](https://learn.microsoft.com/en-us/windows/win32/api/shobjidl_core/nf-shobjidl_core-ifiledialog-getresult)
- [GetDisplayName与CoTaskMemFree](https://learn.microsoft.com/en-us/windows/win32/api/shobjidl_core/nf-shobjidl_core-ishellitem-getdisplayname)
- [CoCreateInstance](https://learn.microsoft.com/en-us/windows/win32/api/combaseapi/nf-combaseapi-cocreateinstance)

实际controller baseline用同一受控路径验证真实模态取消和GetResult路径→N/P。自动化动作按测试PID与固定title限定；不是自然用户手势鉴真、R扫描或跨平台证明。
