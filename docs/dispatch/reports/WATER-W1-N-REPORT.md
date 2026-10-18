WATER-W1-N 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/n/docs/dispatch/reports/WATER-W1-N-REPORT.md

## 交付与提交

- 票号：WATER-W1-N；执行日期：2026-10-18。执行者交回状态为 SUBMITTED，等待总控独立验收与集成，不自标 VERIFIED。
- 工作树：`F:/new/smaltalk/water/.worktrees/n`；分支：`worker/water-w1-n`。
- 精确基线：`75cf4db7607a382673a2146ca69732a5110c1579`；tag：`water-w1-next-core-base-20261018`。
- 实现、测试及 README 提交、五个 final 门共同受测 SHA：`f894d64f88f69efda1ddfa78cb9dc31255a8b5e3`。后续提交仅增加本回执与原始证据；交回 HEAD 可由该分支查询。
- 实际执行引擎：OpenAI Codex；会话说明标注基于 GPT-6，具体部署模型 ID 未提供，不猜测更细型号。没有启动子代理、其它 CLI 实现者或外部模型。
- 主检出权威 manifest 开工为 READY；n 树初次 HEAD 精确等于基线、干净，`packages/native-root` 不存在。直接读取主检出正式票、规则与契约，没有 merge 取票，没有修改主线台账。
- 仅新增产品目录八文件：Cargo.toml、Cargo.lock、README.md、src/lib.rs、src/v1.rs、src/path.rs、src/native_windows.rs、tests/native_root_v1.rs。证据与报告均位于票面白名单；没有合主线、push、安装依赖或运行上游。

## 需求对照

| 冻结要求 | 实现与证据 |
|---|---|
| 独立 workspace、固定三依赖、唯一 lib/test | `packages/native-root/Cargo.toml`；锁只经 helper `lock` 离线生成。metadata 检查根锁中既有版本/source/checksum与目标、依赖限制。根 Cargo 未改。 |
| 纯词法先拒绝 | [path.rs](../../../packages/native-root/src/path.rs) 不做 IO/环境读取，检查 ASCII 盘符、非根绝对路径、240 UTF-16 单元、控制字符/ADS/保留字符、空段/dot段/尾点尾空格、DOS stem（含 trim 空格和上标数字）。混合分隔符、普通 Unicode 不正规化。 |
| 固定本地盘、祖先和终项不跟随检查 | [native_windows.rs](../../../packages/native-root/src/native_windows.rs) 先 GetDriveTypeW，仅允许值 3；逐个指定前缀 symlink_metadata，按 0x400 拒绝所有 reparse tag，再检查 0x10 directory 位。不枚举目录，不仅判断 symlink。 |
| 元数据权限及真正句柄身份 | OpenOptions 只设 access_mode(0x80)、share_mode(7)、custom_flags(0x02000000 \| 0x00200000)、security_qos_flags(0x10000)。句柄 class 9 再检属性，class 18 获取卷序列号和 128 位 ID；失败映射冻结枚举，不回传 OS 错误。 |
| Lease 私有寿命和原句柄 refresh | [v1.rs](../../../packages/native-root/src/v1.rs) 的 DirectoryLease 仅持有私有 File 和观察值；不保存路径，不提供 File/HANDLE 出口，没有 Clone/Debug/Serialize/Deserialize/Default 或公开构造器。refresh 直接借用 self.file 查询，不重新打开路径。File RAII 负责关闭，不写 CloseHandle。 |
| 输出不可伪造、精确 wire | RootObservation/RootIdentity 字段私有，只有不可变 getter，派生 Debug/Clone/PartialEq/Eq/Serialize，无 Deserialize/Default/公开任意构造器。JSON 恰十顶层键，identity 恰三键；scope_id 原样，u64 为规范十进制字符串、ID 为 32 位小写 hex。 |
| 无授权、遍历或竞态保证 | 唯一生产观察构造器内 authorization_granted/traversal_allowed/race_protection_verified 全为 false；公共入口和 refresh 都经过该构造器。没有遍历/token/UI/全局状态。祖先检查仍有替换竞态窗口。 |
| 净化错误 | 九个 RootError 枚举、Debug/Clone/PartialEq/Eq/Display/Error；Display 恰枚举名，Error::source 为 None，不携路径/ID/OS/serde 错误或句柄。 |

## 五测试与公开接线

唯一测试文件 [native_root_v1.rs](../../../packages/native-root/tests/native_root_v1.rs)，恰五顶层、单线程，未过滤/忽略/跳过：

| 测试 | 实际覆盖 |
|---|---|
| root_path_validation | 正常/混合分隔符与 Unicode；UTF-16 240/241 边界及代理对；全部 U+0000–001F/DEL；盘根/相对/UNC/设备命名空间/ADS/双分隔/dot段/尾空格尾点；所有冻结保留 DOS 名及扩展名、stem 空格、¹²³。非法值经公开 open 仍先返回 InvalidPath。 |
| root_native_identity | A 重复 open 身份相同，A/B/nested 两两不同；每个 lease 原句柄 refresh 相同；字符串格式、混合分隔、同目录不同 scope_id，且三个保护标记都 false。 |
| root_reparse_boundaries | final-junction、ancestor-junction 及其 child 均 ReparsePoint；普通文件 NotDirectory，missing 为 MetadataUnavailable；普通文件祖先提前拒绝。file/child 词法输入在 index 指定的既有普通文件处停止，未对该 child 做 IO。 |
| root_observation_wire | 公开 open→observation/refresh→to_json；精确十键/三键、getter/Serialize/Clone 一致、数值字符串、不输出路径或句柄；全部 authority/race 字段 false。 |
| root_lifetime_and_errors | 64 次 open/refresh/drop；观察克隆可在 lease 释放后读取；needs_drop 与九枚举 Debug/Display/Error；实际 file/missing/reparse 错误净化。没有把重复打开当作句柄计数或竞态实测。 |

总控冻结的 `scripts/acceptance/native-root-bridge.rs` 已通过 helper final bridge 真正链接本库，验证两正常目录不同 ID、同句柄 refresh、三 reparse 输入、file/missing、词法反例与精确 wire。实际输出卷序列号 `13601514066450889474`（超过 JS 安全整数，保持字符串），A ID `049c2300000002000000000000000000`，B ID `079c2300000002000000000000000000`。身份只描述观察时对象，不作永久唯一或授权声明。

## 命令与结果

所有验证均经冻结入口：`node scripts/next-core-check.mjs --task WATER-W1-N --mode <mode>`。离线、locked、jobs1、每个子命令 180 秒；一树仅一门运行。格式编辑仅对本票 Rust 文件使用既有 Rust 1.95.0 rustfmt，不修改 helper。

- 开工 baseline：退出 0，Node v24.16.0/Rust 1.95.0/MSVC、私有离线 A/serde 构建、Win32 ABI、稳定/不同目录身份与有界 junction 能力通过；这次不算产品测试。
- lock、非 final fmt/clippy：均退出 0。首次实现 suite 与每项恢复 suite 均五绿，0 ignored/filtered。
- 行为红和三个负控：helper 均退出 0，表示成功观察到实际测试退出 101；细节见下一节。
- final 顺序 fmt → test → clippy → metadata → bridge，全部退出 0，before/after 均为同一干净实现 SHA `f894d64f88f69efda1ddfa78cb9dc31255a8b5e3`；每门均核通过四组当前源码/测试字节的红→恢复证据链。

| final 模式 | 原始结果文件（位于证据目录） |
|---|---|
| fmt | `2026-10-18T06-27-57.188Z-43068-fmt-result.json` |
| test（5 passed） | `2026-10-18T06-28-06.778Z-17284-test-result.json` |
| clippy（-D warnings） | `2026-10-18T06-28-21.444Z-30956-clippy-result.json` |
| metadata | `2026-10-18T06-28-42.387Z-37336-metadata-result.json` |
| bridge | `2026-10-18T06-28-50.939Z-4712-bridge-result.json` |

## 真实行为红与三个负控

先完整五测试及可编译拒绝骨架，`red-behavior` 命中 N_BEHAVIOR，实际 0 passed/5 failed/退出 101；之后实现、稳定 fmt/clippy，完整 suite 五绿。测试文件从行为红到全部 final 原字节未变，SHA-256 为 `c441985a79316e665c16d250dae23068924b648a03e422141530247776aae067`，helper testHash 为 `265b643ecacc78ee55201d276a53fa7c32fe61048c1cb4e2135fdd8326cf401d`。

| 阶段 | 有效红与随后的当前源码五绿 |
|---|---|
| behavior | `2026-10-18T06-21-53.700Z-30008-red-behavior-result.json` → `2026-10-18T06-24-20.709Z-19552-suite-result.json` |
| nc1 | 实际将通用属性检查的 ReparsePoint 错误改为 Ok，保留 OPEN_REPARSE_POINT 打开标志；N_REPARSE_ROOT，3 passed/2 failed/101。`2026-10-18T06-25-30.616Z-38948-red-nc1-result.json` → `2026-10-18T06-25-52.880Z-20784-suite-result.json` |
| nc2 | 实际 FileIdInfo 查询保留，但将输出 ID 改为 [0;16]，A/B 碰撞；N_IDENTITY_HANDLE，4 passed/1 failed/101。`2026-10-18T06-26-13.350Z-7428-red-nc2-result.json` → `2026-10-18T06-26-31.813Z-16676-suite-result.json` |
| nc3 | 将真实观察构造器 authorization_granted 改 true；N_NO_AUTHORITY，3 passed/2 failed/101。`2026-10-18T06-26-47.418Z-37756-red-nc3-result.json` → `2026-10-18T06-27-02.442Z-18808-suite-result.json` |

每项均执行完整五测试，随后立即原字节恢复，再完整五绿；不是要求无关的五条断言全部失败。没有测试专用开关、过滤、跳过、模拟句柄、编译错误或超时代替行为红。临时修改使用内存保存原文件并以 finally 恢复；原/坏/恢复文件 SHA-256 如下，更多元数据见 [negative-controls.json](../../acceptance/wave1/n/negative-controls.json)。

| 项 / 文件 | 原 | 坏 | 恢复 |
|---|---|---|---|
| nc1 native_windows.rs | `c6c3e296a7d2ec4ca8cc5f308442b0d04fbf8aa746118ec749c7e42d69f529b7` | `d3f82203f5f9aebe3c8216b55fd3b749fd308aae4d768dbaa27409e0300dcd42` | `c6c3e296a7d2ec4ca8cc5f308442b0d04fbf8aa746118ec749c7e42d69f529b7` |
| nc2 native_windows.rs | `c6c3e296a7d2ec4ca8cc5f308442b0d04fbf8aa746118ec749c7e42d69f529b7` | `9b91c2e5ef43998c6a748e93403c231c92c10fc7ff7de0854d68aff8cf60fde9` | `c6c3e296a7d2ec4ca8cc5f308442b0d04fbf8aa746118ec749c7e42d69f529b7` |
| nc3 v1.rs | `7e6aeebb32f77a7534ea4c98da4f3a84f178b6fbca287c74846fe446d6aac3fc` | `41ee35edb8d98e59bac05cf88cc4be55caeced67289081c87b5240b55bf4c276` | `7e6aeebb32f77a7534ea4c98da4f3a84f178b6fbca287c74846fe446d6aac3fc` |

行为红骨架 productionHash：`1aec112a3fc3e3dfcb96e08e0b881c64e12f23e36afc655c311c688986793532`；最终生产及每次恢复 productionHash：`c5ffc558056d9f8136d678c472b260f15a5782cf1fd626a4deba50ab02758a46`。完整坏源码、测试和恢复快照均由 helper 原样归档。

## 窄 unsafe 与权限复核

仅 native_windows.rs 允许 unsafe；lib/path/v1/测试均 deny unsafe_code。恰两个 extern 声明：GetDriveTypeW 与 GetFileInformationByHandleEx；调用位置恰三处（驱动、class 9、class 18）。声明及每处调用均有 SAFETY，固定 Win32 ABI、NUL 终止的本地根 UTF-16、借用 File 的活句柄、可写缓冲与长度、对齐及非零成功后才使用输出。没有额外 FFI。

两个 repr(C) 布局以编译期断言固定：AttributeTagInfo 8 字节/4 对齐，FileIdInfo 24 字节/8 对齐。输出缓冲在调用前按字段初始化；返回 0 即丢弃，不读取失败输出。File 自有 RAII，refresh 借用期间不会由本 API 释放句柄。安全 API 不暴露路径/句柄或能构造观察值的入口。

参照冻结 [SOURCES](../../../contracts/native-root-v1/SOURCES.md)，并在线核对 [GetFileInformationByHandleEx](https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-getfileinformationbyhandleex)、[FILE_ID_INFO](https://learn.microsoft.com/en-us/windows/win32/api/winbase/ns-winbase-file_id_info)、[Rust OpenOptionsExt](https://doc.rust-lang.org/std/os/windows/fs/trait.OpenOptionsExt.html)。在线文档可能对应新 Rust 版本，本机 ABI/编译与检查实际使用 1.95.0；文档、能力 probe、N 产品验证分别记录。

## 证据、保留与失败

- 原始证据：[n 目录](../../acceptance/wave1/n/)，350 份 helper json/log/txt，共 1,814,477 字节；含原有 05:36 派前 baseline、此次开工 baseline、所有检查/红绿/最终门及源码快照，未将旧派前记录冒称本次产品验证。全部原字节复制，清单和 SHA 见 [archive-index.json](../../acceptance/wave1/n/archive-index.json)。另有本次恢复账本与 [SUBMISSION-AUDIT.json](../../acceptance/wave1/n/SUBMISSION-AUDIT.json)。
- archive 不含二进制、缓存或普通 fixture 正文；baseline fixture index 仅为冻结工具生成的路径/长度/哈希元数据。私有 `.local` 构建、原日志、夹具与 index 全部保留，没有清理或重造。
- 本树固定批两普通文件共 35 字节、两 junction。所有门前后 index SHA 一致：`8cbadee8cd3048ec1c509338c2f58fd33713eda2550f04546b7cbed0e7d3cfb7`。Rust 只读取该 index 和指定元数据，不读普通文件正文，不写 fixture。
- 98 新冻结条目及八旧锁合计 198 唯一文件全部核对一致。根 Cargo 与 13 个旧产品/工具目录的 Git 对象与基线相同（完整清单见 SUBMISSION-AUDIT）；没有改其它工作树、A–M协议、helper、冻结、台账或上游。
- 全部 18 份 helper 结果状态 passed，其中一份是既有派前 baseline，17 份为本次执行。预期失败为行为红与三个负控的真实测试退出 101；没有未解决的构建/检查失败。读材料时曾误用不存在的 TESTS.md 路径，已改读冻结的 TESTS.json；第一次 PowerShell 中文显示编码不正确，已用 UTF8 重读。未因此修改材料或放宽检查。

## 未验证与交回边界

本次仅当前 Windows x64、F 盘固定本地卷及冻结合成样本验证。macOS、非 Windows 分支编译/运行、其它 Windows/文件系统、真实用户 scope、选择授权、范围注册、目录遍历、生产竞态、桌面、删除/移动/ACL、卷唯一占用与回收量均未验证。非固定卷、权限失败、打开失败、句柄查询失败与序列化失败的原生失败分支没有通过新物理故障或伪造句柄强制触发；对应错误 API 及净化有静态和枚举测试证据，不能称全部 native 故障已实测。

反复 open/drop 与 File 私有所有权证明来自测试和源码复核；没有做句柄计数、并发替换或 TOCTOU 保证实验。N 不放行真实用户数据扫描，不代表 M1 用户闭环或 macOS 完成。无范围扩大申请、无待修产品问题；请总控按正式流程独立复测、决定接收与集成。回执与证据提交完成后停止本票修改。
