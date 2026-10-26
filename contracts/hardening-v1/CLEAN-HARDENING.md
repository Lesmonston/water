# WATER-W4-G1 清理执行器加固 SPEC（`water-junk-clean` 第 2 版，重门）

2026-10-26 冻结，总控（Claude）。M2 打开清理之前，D 必须从“按路径删除”升级为“按句柄删除”。本文在 [CLEAN](../checkup-v1/CLEAN.md) 之上逐条覆盖；没提到的地方 CLEAN 原文与 D 补单 01 继续有效。CLEAN 文件本身不改。

依据：[第二波收单验收](../../docs/acceptance/wave2/controller/WATER-W2-AE-REVIEW-20261026.md) 第 5 节“遗留到 M2 接线前”，与 [第 2 轮验收](../../docs/acceptance/wave2/controller/WATER-W2-AE-REVIEW-2-20261026.md)。

**执行者的所有删除测试只能作用于本树 `.local/w2-d-fixtures/` 下本次新建的合成夹具。任何真实用户位置都不得出现在测试里。** 本票没有真实模式。

## 1. 不变的东西

- crate、依赖（只有 `serde`、`serde_json`）、edition、lint 规则都不变。
- **公开 API 与 CLEAN 第 2 节完全相同**，不新增、不改签名。
  - `identity_of(path)` 仍按路径打开，用于服务在扫描与计划时取身份；
  - `volume_free_bytes` 不变。
- 计划校验（CLEAN 第 3 节）、报告与日志的格式、skip reason 的取值集合、`execute` 的逐项顺序框架都不变。服务（WATER-W4-G2，同时进行）按原接口编译。

## 2. 为什么要改

1. **条目内部换联接的竞态**：现在用 `remove_file`、`remove_dir` 按路径删除。在枚举一个子目录之后、删除其中文件之前，若有进程把这个子目录换成指向别处的联接，就会删到联接目标里同名的文件。补单 01 只收窄了窗口。
2. **非链接型重解析点**：现在条目里遇到任何重解析点，都当链接删掉。云文件占位符（OneDrive 等）也是重解析点，删掉它等于删掉云端文件。
3. **短名与别名**：硬守卫与保护路径只按文本比较，8.3 短名或经联接的另一种写法能绕过。

## 3. 文件系统访问一律按句柄

- **`src/` 里不得出现任何按路径的文件操作**：`std::fs` 整个模块都不许用（含 `remove_file`、`remove_dir`、`read_dir`、`symlink_metadata`、`metadata`、`set_permissions`、`File`、`OpenOptions`）。检查器会拒绝。
- 所有文件系统访问都在 `src/native_windows.rs`，只用第 8 节列出的系统函数。检查器逐个核对 `extern "system"` 块里声明的函数名。
- 句柄全部用 RAII 关闭。

## 4. 每项执行顺序（覆盖 CLEAN 第 4 节第 2、3、5、7、8 步）

第 1 步（停止信号）、第 4 步（占用判断）、第 6 步（intent 日志落盘）与第 9 步不变。

### 第 2 步：从盘根逐级按句柄打开到条目

1. 文本层先校验 `root` 严格包含 `path`（同 CLEAN）。
2. 按路径打开盘根 `X:\`。
3. 然后对 `path` 的每一段，**相对上一级句柄**打开下一级：
   - 名字只含这一段，不含分隔符；
   - 一律带“打开重解析点本身”的选项，绝不跟随。
4. 每打开一级，从句柄读属性与重解析标签：
   - root 或 root 与条目之间的某一级是重解析点 → `outside_root`；
   - 条目本身是重解析点 → `reparse`；
   - 某一级不存在 → `gone`；
   - 类型不符（中间级不是目录，或条目与计划的 kind 不符）→ `changed`。
5. 条目的句柄一直保留到本项结束，第 3、5、7 步都在它上面做。

### 第 3 步：身份

从条目句柄读卷序列号与 128 位 FileId，与计划的 identity 比较（格式同 CLEAN 与 MODEL），不同 → `changed`。

### 第 5 步：按句柄快照

从条目句柄出发，按句柄枚举整个子树，不进入任何重解析点：
- 目录相对父句柄打开、再按句柄枚举。
- 每一项记下：相对名、FileId、属性、重解析标签、文件长度、最后修改时间。
- `bytes_before` 为非重解析普通文件的长度之和，`newest` 为最新修改时间（含条目本身）。规则同 CLEAN。

在快照上依次判断：
1. **重解析点分类**（第 5 节）：子树里出现任何**非名称代理**的重解析点 → 整项 `reparse`，什么都不删。
2. **保护与守卫按身份比对**（第 6 节）：
   - 子树里任一项（含条目本身）的身份等于某个硬守卫的身份 → `guarded`；
   - 等于某个保护路径的身份 → `protected_overlap`；
   - 第 2 步打开过的任一祖先等于某个保护路径的身份 → `protected_overlap`，即条目位于受保护数据之内。
3. 原有的文本判断（CLEAN 第 3、4 节的包含与重叠）照旧保留，两者任一命中即跳过。
4. `too_recent` 规则不变。

第二次复核（日志落盘后）照旧，快照必须完全相同，包括每一项的 FileId；不同 → `changed`。

### 第 7 步：按句柄删除（后序、不跟随）

- **目录**：
  - 相对父目录句柄打开，带“打开重解析点本身”。
  - 共享方式**不含删除共享**，持有期间别的进程不能改名、删除或替换它。
  - 打开后从句柄确认它仍是非重解析目录，且 FileId 等于快照里的那一项，否则本项停止继续删除，计 1 个 failed_entries。
  - 然后按句柄枚举，逐个处理子项，最后**用同一个句柄**把自己标记删除。
- **名称代理链接**（联接、符号链接等，第 5 节）：相对父句柄打开链接本身，按句柄删除链接，绝不进入。
- **普通文件**：
  - 相对父句柄打开，从句柄确认仍是非重解析文件且 FileId 等于快照里的那一项；
  - 然后按句柄删除，删除用第 7 节的方式。
- 打开子项时不加“只要目录”或“只要文件”的类型选项，打开后从句柄判断类型（联接也被系统视为目录，见第 11 节）。
- 每个子项删除后立即关闭它的句柄；一个目录的子项句柄全部关闭后，才用它自己的句柄设置删除标记（第 11 节）。
- **快照之后才出现的项**：FileId 不在快照里，不删、不进入，也不计入失败。它会作为残余留下，本项按 CLEAN 规则记 `partial`。
- 删除失败计入 failed_entries，继续下一个。
- 每处理完一个子项检查停止信号，规则同 CLEAN。

### 第 8 步：残余与结果

按句柄重新统计残余（条目已不存在则为 0），`bytes_freed = bytes_before − 残余`。`deleted`、`partial`、`failed` 与停止时的 `cancelled` 规则同 CLEAN 与补单 01。

## 5. 重解析点分类

按句柄读到的重解析标签判断：

| 标签 | 处理 |
|---|---|
| 名称代理位（`0x20000000`）为 1，例如联接 `0xA0000003`、符号链接 `0xA000000C` | 链接：只删链接本身，绝不进入 |
| 其它一切，例如云文件 `0x9000xxxA`、AppExecLink、去重、HSM、未知标签 | **不删**；出现在条目子树里时整项 `reparse`；条目本身是重解析点时也是 `reparse` |

条目本身是任何重解析点（含联接）时，仍按 CLEAN 原规则记 `reparse`。

## 6. 守卫与保护路径的身份

- `execute` 开始时，对计划的每个硬守卫与保护路径解析一次身份（卷序列号加 FileId）。
  - 这里**跟随**链接打开，只读属性，因为要比较的是它实际指向的目录或文件。
  - 打不开（不存在、拒绝访问）的忽略，只保留文本判断。
- 身份比较只在同一卷内有意义，卷序列号与 FileId 都相同才算相同。
- 文本判断不删除、不放宽，身份判断只是在它之外再加一道。

## 7. 删除方式

1. 首选“扩展删除标记”：带 DELETE、POSIX_SEMANTICS、IGNORE_READONLY_ATTRIBUTE 三个标志，按句柄设置。只读文件因此**不再需要先改属性**，`set_permissions` 不再使用。
2. 文件系统不支持扩展标记（返回参数无效或不支持）时，退回普通删除标记，同样按句柄设置。退回路径上只读文件删除失败计入 failed_entries，不改属性。

## 8. 允许的系统函数

`src/native_windows.rs` 的 `extern "system"` 块里只能声明下面这些，检查器逐个核对：

| 库 | 函数 | 用途 |
|---|---|---|
| kernel32 | `CreateFileW` | 只用于三处：打开盘根；`identity_of` 按路径取身份；解析守卫与保护路径的身份。只读属性或列目录访问 |
| kernel32 | `GetFileInformationByHandleEx` | 只读：属性与重解析标签、FileId、基本信息与标准信息、按句柄枚举目录 |
| kernel32 | `SetFileInformationByHandle` | 只用于设置删除标记（扩展与普通两种） |
| kernel32 | `GetVolumeInformationByHandleW` | 卷序列号 |
| kernel32 | `GetDiskFreeSpaceExW` | 可用空间 |
| kernel32 | `CloseHandle` | 关闭句柄 |
| ntdll | `NtOpenFile` | 相对父句柄打开下一级，单段名字，不创建任何东西 |
| ntdll | `RtlNtStatusToDosError` | 可选，把状态码换成错误码 |

不得声明：`DeleteFileW`、`RemoveDirectoryW`、任何 `MoveFile*`、`DeviceIoControl`、`NtCreateFile`、`NtSetInformationFile`、`FindFirstFile*`、`CreateDirectory*`，或表外的任何函数。**本节的具体结构体布局与常量见第 11 节附录**（总控已在本机实测）。

## 9. 测试

唯一测试文件仍是 `packages/junk-clean/tests/clean_v1.rs`，测试由 5 个变为**精确 6 个**：原有 5 个不改名、断言继续成立，新增 `clean_handle_hardening`。夹具规则同 CLEAN 与补单 01。

测试可以启动两种进程，只用于在本次夹具里造东西：
- 同第二波，用 `cmd /D /C mklink /J` 造联接；
- 新增 `powershell.exe -NoProfile -NonInteractive -EncodedCommand <…>`，只用于给夹具里的一个文件或空目录设置自定义的非链接重解析标签（第 11 节附录给出可用的 C# 片段）。PowerShell 编译时的临时目录用检查器设置的本树 TEMP。

`clean_handle_hardening` 至少覆盖下面几组，失败信息含对应标记：

| 标记 | 断言 |
|---|---|
| `CLEAN_REPARSE_KIND` | 1. 条目子树里放一个带自定义非链接标签（例如 `0x00007A57`）的文件：整项 `reparse`，一个字节都没删，该文件与其它文件全部完好。<br>2. 条目里只有联接时，照旧只删联接、目标完好、本项 `deleted`。 |
| `CLEAN_GUARD_ID` | 1. 保护路径写成经联接别名的路径，例如 `<fx>\alias\keep`，其中 `alias` 是指向条目的联接：文本判断不命中，按身份命中，整项 `protected_overlap`，一个字节都没删。<br>2. 硬守卫同样写成别名，整项 `guarded`。 |
| `CLEAN_LONG_PATH` | 条目内完整路径超过 300 个字符的文件与目录能被删除，本项 `deleted`。 |
| `CLEAN_READONLY` | 只读文件被删除，且没有被改过属性：测试先在条目外给它建一个硬链接（`std::fs::hard_link`），清理后条目内的名字已删除，经硬链接读回的属性仍带只读。 |

原有 5 个测试里的标记（`CLEAN_IDENTITY`、`CLEAN_NO_FOLLOW`、`CLEAN_ROOT_BOUND` 等）全部保留。

## 10. 负控（检查器只认这 3 条）

每条只改 `src/` 里真正被调用的一处：

| 负控 | 让什么失效 | 标记 |
|---|---|---|
| nc1 | 把任何重解析点都当链接（不看名称代理位） | `CLEAN_REPARSE_KIND` |
| nc2 | 去掉按身份比对守卫与保护路径 | `CLEAN_GUARD_ID` |
| nc3 | 删除时进入名称代理链接而不是只删链接本身 | `CLEAN_NO_FOLLOW` |

总控验收时还会另做变异：去掉目录 FileId 复核、去掉“不含删除共享”、去掉祖先的保护判断、退回路径式删除等。

## 11. 附录：本机实测的系统接口

总控在本机（Windows 11 26200，F 盘 NTFS，8.3 生成关闭，非管理员令牌）用只依赖标准库的 Rust 小程序逐项实测过，全部可行。下列布局与常量照抄即可。

**结构体（x64）**

```rust
#[repr(C)] struct UnicodeString { length: u16, maximum_length: u16, buffer: *mut u16 }   // length 为字节数
#[repr(C)] struct ObjectAttributes { length: u32, root_directory: *mut c_void, object_name: *mut UnicodeString,
                                     attributes: u32, security_descriptor: *mut c_void, security_qos: *mut c_void } // 48 字节
#[repr(C)] struct IoStatusBlock { status_or_pointer: usize, information: usize }          // 16 字节
#[repr(C)] struct FileAttributeTagInfo { file_attributes: u32, reparse_tag: u32 }        // 类 9
#[repr(C)] struct FileIdInfo { volume_serial_number: u64, file_id: [u8; 16] }            // 类 18
#[repr(C)] struct FileDispositionInfo { delete_file: u8 }                                // 类 4
#[repr(C)] struct FileDispositionInfoEx { flags: u32 }                                   // 类 21
```

**`NtOpenFile` 相对打开**
- `attributes = OBJ_CASE_INSENSITIVE (0x40)`；
- `object_name` 只含一段名字；
- 选项 `FILE_OPEN_REPARSE_POINT 0x00200000 | FILE_SYNCHRONOUS_IO_NONALERT 0x20 | FILE_OPEN_FOR_BACKUP_INTENT 0x4000`；
- 目录访问 `FILE_LIST_DIRECTORY 0x1 | DELETE 0x10000 | FILE_READ_ATTRIBUTES 0x80 | SYNCHRONIZE 0x100000`，共享 `FILE_SHARE_READ | FILE_SHARE_WRITE`（3，不含删除共享）；
- 文件与链接访问 `DELETE | FILE_READ_ATTRIBUTES | SYNCHRONIZE`，共享 7。
- 实测：
  - 持有不含删除共享的目录句柄时，别的调用改名这个目录得到错误 32；
  - 它下面没被持有的子目录仍可被改名，所以子目录要在打开后用 FileId 复核。

**注意：联接即使带“打开重解析点本身”打开，也仍被视为目录。**
- 打开时加 `FILE_NON_DIRECTORY_FILE (0x40)` 会失败：`0xC00000BA`，`STATUS_FILE_IS_A_DIRECTORY`。
- 因此打开未知类型的子项**不要加类型选项**，打开后用类 9 判断它是什么。
- `FILE_DIRECTORY_FILE (0x1)` 对联接可用。

**按句柄枚举**
- 先用类 20 `FileIdExtdDirectoryRestartInfo`，再反复用类 19 `FileIdExtdDirectoryInfo`，直到错误 18 `ERROR_NO_MORE_FILES`。
- 跳过 `.` 与 `..`。
- 缓冲区用 `Vec<u64>` 保证 8 字节对齐，字段用 `read_unaligned` 按偏移读取：

| 偏移 | 字段 |
|---|---|
| 0 | NextEntryOffset |
| 8、16、24、32 | CreationTime、LastAccessTime、**LastWriteTime**、ChangeTime（各 8 字节） |
| 40 | EndOfFile |
| 48 | AllocationSize |
| 56 | FileAttributes |
| 60 | FileNameLength（字节） |
| 68 | ReparsePointTag |
| 72 | FileId（16 字节） |
| 88 | FileName |

- 实测：
  - 联接为属性 `0x410`、标签 `0xA0000003`；
  - 自定义标签文件为属性 `0x420`、标签 `0x00007A57`；
  - 枚举父目录得到的 FileId 与打开该项后用类 18 读到的逐字节相同。

**删除**
- 扩展标记：类 21，`flags = DELETE 0x1 | POSIX_SEMANTICS 0x2 | IGNORE_READONLY_ATTRIBUTE 0x10`。只读文件不改属性即可删除。
- 普通标记：类 4，`delete_file = 1`。实测对只读文件返回错误 5，按第 7 节计入失败。
- **名字在设置删除标记的那个句柄关闭时才消失**，不是在调用时。在句柄关闭之前，路径仍然查得到。所以：
  - 每个子项删除后**立即关闭它的句柄**，再处理下一个；
  - 一个目录的所有子项句柄都关闭后，再用这个目录自己的句柄设置删除标记，然后关闭它。
- 用目录自己的枚举句柄删除自己，实测可行。

**守卫身份**
- `CreateFileW` 只带 `FILE_FLAG_BACKUP_SEMANTICS 0x02000000`，不带 `FILE_FLAG_OPEN_REPARSE_POINT`，访问 `FILE_READ_ATTRIBUTES`，共享 7。
- 实测经联接别名打开得到的 FileId 与直接打开目标相同；带 `OPEN_REPARSE_POINT` 打开别名得到的是联接自己的 FileId。

**测试夹具：自定义非链接标签**
- 写法：对用 `GENERIC_WRITE | FILE_READ_ATTRIBUTES | FILE_WRITE_ATTRIBUTES`、`BACKUP_SEMANTICS | OPEN_REPARSE_POINT` 打开的文件或空目录，调用 `DeviceIoControl(FSCTL_SET_REPARSE_POINT = 0x000900A4)`。
- 缓冲区为 `REPARSE_GUID_DATA_BUFFER`：
  - 标签 u32 `0x00007A57`；
  - 数据长度 u16 = 4；
  - 保留 u16 = 0；
  - 16 字节 GUID `{6f0e7a57-1c2d-4e5f-8a9b-0c1d2e3f4a5b}`；
  - 4 字节数据。
- 非管理员令牌实测成功。测试里用 PowerShell 的 `Add-Type` 编译一段 C# 来调用，`DeviceIoControl` 只出现在测试启动的 PowerShell 里，不进入 crate 源码。
- 测试结束用标准库的 `remove_file` 删除它，删的是重解析点本身。
