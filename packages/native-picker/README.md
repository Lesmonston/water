# Native Picker v1

Windows x64 的可信 Rust 宿主调用 `water_native_picker::v1`，通过真实
IFileOpenDialog 选择单个目录，再由现有 N/P 模块检查元数据并登记确认。
本包是独立 Cargo workspace，直接依赖仅 A/N/P，没有新增第三方包。

```rust,ignore
let options = PickerOptions::new(initial_directory)?;
match select_scope(&mut registry, &scope_id, &options)? {
    None => { /* 用户取消，没有占用登记槽 */ }
    Some(selected) => {
        // 仅可信宿主可读路径和已确认能力。
        let permit = registry.begin_scan(selected.scope())?;
        let observation = registry.check_permit(&permit)?;
        registry.finish(&permit)?;
        registry.revoke(selected.scope())?;
    }
}
```

`PickerOptions::new` 只调用 N 的纯路径校验并保存原字符串。
`select_scope` 先通过 N 打开初始目录，之后每次在调用线程初始化 STA，
使用固定标题、按钮标签和 `0x02110868` 选项显示系统窗口。
取消严格返回 `Ok(None)`；成功路径取自 Show 成功后的 GetResult 和
SIGDN_FILESYSPATH，而非初始目录。P.prepare/confirm 使用该实际路径，
确认错误时 decline 本次 pending 并保留原错误。

COM 接口、STA 初始化及任务分配的 UTF-16 路径分别由私有 RAII 对象释放。
unsafe 限于 `src/native_windows.rs`；其余模块和测试禁止 unsafe。
非 Windows x64 的 select_scope 直接返回 UnsupportedPlatform。
错误文本不会加入路径或 HRESULT。SelectedScope 无公开构造器、序列化、
Clone、Debug 或 Default，也不会经 HTTP/IPC 暴露能力。

验证通过本票冻结工具执行：

```powershell
node scripts/parallel-wave-check.mjs --task WATER-W1-S --mode suite
```

五项测试从 WATER_PICKER_INDEX 读取本树固定空目录索引；真实取消、确认、
full/duplicate 失败和 P 生命周期均由冻结驱动操作当前测试 PID 的系统按钮。
测试只用已准备的四空目录/一 junction，普通内容为 0 字节，不创建或清理夹具。
三项生产负控分别破坏取消映射、scope ID 传递和返回前登记存活状态。
完整日志、先红、最终字节重放和恢复哈希在 S 工单回执及证据目录中。

这是 Windows 受控范围验证。COM 分配失败、宿主 apartment 冲突、恶意并发
替换和不同初始目录的人工导航未做故障注入；错误分支和所有权按源码审阅。
不保证自然用户手势鉴真。系统窗口内部导航缓存未逐项审计。
本包没有 R 扫描、普通内容读取、删除、文件保存或桌面壳；macOS、真实用户
scope 和 M1 用户闭环仍未验证。

ABI 依据冻结 [SPEC](../../contracts/native-picker-v1/SPEC.md) 和
[SOURCES](../../contracts/native-picker-v1/SOURCES.md)。本次另核对 Microsoft
[GetResult](https://learn.microsoft.com/en-us/windows/win32/api/shobjidl_core/nf-shobjidl_core-ifiledialog-getresult)、
[FILEOPENDIALOGOPTIONS](https://learn.microsoft.com/en-us/windows/win32/api/shobjidl_core/ne-shobjidl_core-_fileopendialogoptions)、
[CoInitializeEx](https://learn.microsoft.com/en-us/windows/win32/api/combaseapi/nf-combaseapi-coinitializeex) 和
[GetDisplayName](https://learn.microsoft.com/en-us/windows/win32/api/shobjidl_core/nf-shobjidl_core-ishellitem-getdisplayname)。
实现为本票新写的系统 ABI 包装，未复制第三方产品代码。
