# Root marker

额外同意后，只读已注册根的固定 `package.json`，将未经改写的严格 UTF-8 原文交给已验收的 `water-node-manifest::v1::analyze_package_json`。这是独立来源侧车，未接入旧 V/W 元数据协议、页面或分类。

可信 Rust 宿主先调用 `approve_package_json(&registry, &permit)`，再调用 `read_package_json(&consent, root_path)`。同意对象借用真实 P 注册表和本次扫描许可，不能直接构造、克隆、默认构造或序列化/反序列化；借用存续时无法结束、撤销注册或丢弃许可。此 API 记录宿主额外同意声明，不鉴真用户手势。

Windows x64 实现先核对真实 P/N 身份，再独立打开并核对拥有的原生根句柄。唯一子对象通过 `NtCreateFile` 相对该句柄打开：`package.json`、`OBJ_CASE_INSENSITIVE`、`FILE_OPEN`、`FILE_OPEN_REPARSE_POINT`、同步非目录、只读访问且仅共享读取。无拼接路径读内容、重开子路径、遍历或链接回退。class 9/18/1 检查类型、重解析、设备、身份、EOF、DeletePending 和单硬链接；在同一文件句柄有界读取后复核文件/根及真实 P/N。目录型 junction 可能在原生打开阶段作为 `NotRegularFile` 被拒绝，否则按 `ReparsePoint` 拒绝。

原始字节上限 262144；已知超限在读取前拒绝，实际读取另限 262145 字节并检查 EOF/身份变化。缺文件返回 `Ok(None)`，不代表根不是项目。无效 UTF-8、JSON/重复键/深层/错误 shape 不产生证据；不执行脚本、包管理器或引用解析。公开错误仅枚举及 `<Variant> at /root_marker`，不含路径、原文或系统/parser 消息。

输出仅含冻结的来源/保护字段、字节数和真实 U 结构证据；U 内层保持 `caller_supplied_text`，外层是 `native_root_package_json`。无内容 hash、包字段名值、路径或原生 ID，仍为 `protected` / `display_only`，精确长度/计数不保证匿名。观察对象只能从成功读取产生；支持只读序列化，没有反序列化、任意构造器或可变 getter。

本票仅验证本树冻结新工厂合成输入，0 系统窗口。非 Windows x64 返回 `UnsupportedPlatform`；真实用户 scope、恶意生产竞态、自然用户同意、macOS、桌面与 M1 未验收。

独立 workspace、Rust 1.95、固定六项直接依赖，无新增 registry 包。唯一测试文件 `tests/marker_v1.rs` 含票面四测试；类型测试编译真实公开调用方的成功/拒绝对照，不运行 probe 程序。通过项目冻结入口运行，使用私有 offline Cargo home/target 和 jobs1：

```powershell
node scripts/interactive-wave-check-r2.mjs --task WATER-W1-Z --mode test
```

原生布局以本项目已审阅 R 实现和冻结 root-marker ABI probe 为依据，不修改旧模块。接口背景见 [NtCreateFile](https://learn.microsoft.com/en-us/windows/win32/api/winternl/nf-winternl-ntcreatefile) 与 [FILE_STANDARD_INFO](https://learn.microsoft.com/en-us/windows/win32/api/winbase/ns-winbase-file_standard_info)。
