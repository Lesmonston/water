# macOS 原生移植设计输入

2026-10-23，WATER-W1-AE。结论为研究已形成，Mac 系统能力未实现、未验证。本票只读 Windows 源码与官方资料，没有编译、安装 SDK、访问 Mac、创建物理夹具或运行 UI。

当前源码基线为 `4b8a1de2ad49664546547256cd3d55def7c31a49`。本目录 [GAP-MATRIX.json](GAP-MATRIX.json) 的每个 `current_sources` 给出工作区原字节 SHA-256、固定提交和行号；七项组件恰为 N/P/R/S/Z/AA/desktop。[SOURCES.json](SOURCES.json) 给出来源访问方式、版本边界和证据路径。下文“提案”均须以后独立冻结，不改变现行 API。

## 当前可复用部分与平台阻断

| 组件 | 已读代码事实（均为基线行号） | Mac 缺口与保留语义 |
|---|---|---|
| N | `packages/native-root/src/v1.rs:29–44,129–166` 的身份构造为 Windows，打开前先执行 Windows 路径验证；`path.rs:6–28` 要求盘符及保守 UTF-16 规则 | 不能把 POSIX 路径交给现入口；须新增经审阅的平台身份和根能力入口。观察租约不等于 scope 授权 |
| P | `packages/scope-registry/src/v1.rs:124–179,191–249` 使用私有 owner/registration/attempt 绑定、刷新与撤销；prepare 调用 N | 状态机是可复用设计，无法在 Mac 建立可用登记；confirm 仅可信宿主声明，未鉴真自然用户手势 |
| R | `packages/native-scan/src/v1.rs:194–215` 仅 Windows x64 调 walk；`walk.rs:45–105,193–301` 持有 attempt、预算、父句柄、observer | 新 Unix 后端、文件名表示和权限错误映射；保留 unknown/protected、预算及取消语义，普通文件正文读取为零 |
| S | `packages/native-picker/src/v1.rs:13–18,59–89` 有 Windows 初始路径检查及平台门 | NSOpenPanel 适配须重新设计；初始目录不能替代实际选择结果，取消不发能力 |
| Z | `packages/root-marker/src/v1.rs:53–78,103–150` 额外借用许可后读取固定清单；`native_windows.rs:206–224,284–319` 同句柄前后核验、有界读取 | Mac fd 内容读取和一致性威胁分析；不把 OS 目录权限当内容同意，保持独立 sidecar |
| AA | `packages/project-session/src/v1.rs:87–158,178–202` 接真实 P/R/Z；`runtime.rs:194–237,302–307` 在新工作线程选择并捕获 panic | 拆分 AppKit 主线程选择与后台扫描，保留同一次 job/choice/token、attempt 和登记释放 |
| desktop | `contracts/desktop-bootstrap-v1/SPEC.md:3–19` 冻结的是 Windows 静态壳，未接 AA/AB | AE 只评估该契约；不读取或依赖 AC 在途产物，不把 WebView2 配置当 Mac WebView 实现 |

这些是静态可达性事实；P 的内存类型、R 的 CancelToken、AA 的协议/投影可作为迁移输入，当前不能据此宣称它们在 Mac 通过。N 的 POSIX 输入甚至可先得到 InvalidPath，而不是到达 UnsupportedPlatform 分支。

## 来源使用边界

实际读到 Apple 官方 DocC JSON 的正文，并非只读 HTML 标题。普通 [NSOpenPanel 页面](https://developer.apple.com/documentation/appkit/nsopenpanel) 的 JS 壳仍在索引中标 unavailable；可读 [官方数据版本](https://developer.apple.com/tutorials/data/documentation/appkit/nsopenpanel.json) 单列为 read。Apple 旧归档 open(2) 和线程指南有历史边界，不能据此填写最新 SDK 常量、ABI 或最低 OS。Rust 在线页面自报 1.99.1，本项目固定 1.95；本文只采用已稳定 fd/metadata 概念，1.95 的 Mac 编译仍待后票核对。

XNU 仅静态读取官方分发仓库的一份 man 源文件：[open.2，固定 f6217f8](https://github.com/apple-oss-distributions/xnu/blob/f6217f891ac0bb64f3d375211650a4c1ff8ca1ea/bsd/man/man2/open.2#L103)。其原字节 SHA 和完整许可头在来源索引/证据中保留；含 APSL 2.0 与 UC BSD 条款，不作为 Water 发布代码复用。本票没有克隆/运行该仓库。该快照不证明任何具体 Mac 已安装或支持其中全部 flags。

## S：选择、主线程与权限租约（提案）

Apple 说明 NSOpenPanel 返回用户选择的 URL，目录/文件和多选有独立配置项；10.15 起面板由独立进程绘制。这是 API 文档事实，不能证明 Water 的点击来自自然人。[NSOpenPanel](https://developer.apple.com/tutorials/data/documentation/appkit/nsopenpanel.json)

Water 提议只在 AppKit 主线程创建/配置/展示/完成面板；配置候选为只选一个目录、禁止文件/多选/自动解析别名，并显式设受控初始目录。OS 面板可能导航其它位置，未来验收只选择新夹具目录，不承诺已审计面板内部缓存或系统目录展示。主线程事件循环应保持运行，后台 I/O 不阻塞它。历史线程指南说明事件在主线程处理，也记载部分窗口可在辅助线程创建；本设计的主线程政策比该历史描述更保守，不将其误引为所有 AppKit 方法的绝对规则。[Apple 线程指南](https://developer.apple.com/library/archive/documentation/Cocoa/Conceptual/Multithreading/ThreadSafetySummary/ThreadSafetySummary.html)

优先评估 sheet completion 适配，而非直接移植 COM 的阻塞 Show。文档说明回调时面板可能仍在屏幕上；须先正确关闭/撤下自己的面板再发布终态。[beginSheetModal](https://developer.apple.com/tutorials/data/documentation/appkit/nssavepanel/beginsheetmodal(for:completionhandler:).json) 具体响应枚举值、线程注解、retention/autorelease、绑定库 Send/!Send、Swift/ObjC 异常边界和 Tauri 调度 API 要以选定 SDK/库版本逐一核对；本文不声明数值或 FFI 布局。

取消、关闭窗口、重复回调和迟到回调都以当前 job 的一次性状态门处理：取消不得读 URL/注册根/沿用上次选择；确认必须将真实所选 URL 转为后端 lease 后再 P.prepare/confirm。初始位置只用于展示。P.confirm 继续表示 host declaration；自然同意鉴真字段保持 false。前端的 path、bool 或 JSON 不能构造租约、SelectedScope、ScanPermit 或 ManifestReadConsent。

## security-scoped URL、bookmark 与 sandbox（提案）

Apple 区分标准面板返回的隐式 security scope 与持久 bookmark 解析后的显式访问；sandbox 允许仍可能被其它访问控制拒绝。Water 必须记录租约来源，不能对每种 URL 机械重复 start。[访问 sandbox 文件](https://developer.apple.com/tutorials/data/documentation/security/accessing-files-from-the-macos-app-sandbox.json)

对需要显式启动的 scope，成功后由独占 RAII guard 对应 stop；来源为系统隐式启动的 scope 也按其文档生命周期管理。成功启动与释放次数应可审计；失败不造成功能力、不对非拥有的 scope 释放。文档说明未配对释放可能耗尽资源。[startAccessingSecurityScopedResource](https://developer.apple.com/tutorials/data/documentation/foundation/nsurl/startaccessingsecurityscopedresource().json) 与 [withSecurityScope](https://developer.apple.com/tutorials/data/documentation/foundation/nsurl/bookmarkcreationoptions/withsecurityscope.json)

首个实现提案不持久化 bookmark。重启需新选择；未来若需要恢复访问，再独立冻结只读 bookmark、stale 处理、存储位置、撤销/更新和租约续期。bookmark、scope 字节均为能力材料，不进日志/HTTP/导出。sandbox/非 sandbox 两个模式分开验收，不自动申请全盘访问、提升权限或增加写 entitlement；发布 sandbox 策略仍由产品/总控决定。[App Sandbox](https://developer.apple.com/tutorials/data/documentation/security/app-sandbox.json)

## N/P：fd、身份与命名边界（提案）

用拥有的根 fd 和受控的 scope guard 组成后端 lease，内部借用 fd 给遍历/读取；能力不提供 raw fd 序列化或任意路径构造器。Rust OwnedFd 提供 drop 关闭和借用 fd 的模型；这不证明资源取得、线程切换或 AppKit 对象跨线程本身安全。[OwnedFd](https://doc.rust-lang.org/std/os/fd/struct.OwnedFd.html)

fstat 得到的 device/inode 可作为“本次活 fd 上的对象身份候选”；nlink 可作为硬链接观察。Rust MetadataExt 文档提供 dev/ino/nlink/size/blocks 概念，未提供防 inode 复用、跨 mount 永久身份或物理回收保证。[MetadataExt](https://doc.rust-lang.org/std/os/unix/fs/trait.MetadataExt.html) 提议以版本化身份枚举/平台标签承载，不把 dev 硬塞 windows volume_serial、inode 补零冒充 128-bit Windows ID。P 的 owner/registration/attempt 与刷新门保持，重复根只在同一身份域及活租约下判定。

根选择和根 fd 取得之间有时间差，URL 字符串不是稳定能力。候选路径若必须打开，所有祖先逐层受限打开；拒绝 `.`、`..`、NUL、分隔符和绝对子名，禁止偷偷 canonicalize 后重新按路径读取。sandbox 若不允许从 `/` 逐层获取祖先，则先验证选中 URL/descriptor 取得方案；不能失败后退为普通 open。该点是阻断问题，而非本设计已解决的竞态。

初期只考虑明确识别的本地卷；拒绝网络/未知卷，跨 device/mount 边界跳过并报告。仅 dev 相同不足以证明任何 mount 拓扑；卷识别、mount 变更和受控挂载测试能力须另票确认。大小写敏感/不敏感卷、Unicode 组合/分解及非 UTF-8 文件名字节必须分别测试。身份和授权不以 lower-case、NFC 或字符串前缀判定；不能满足当前 RelativePath 的名字显式跳过并保留覆盖缺口，不替换成另一可访问路径。

## R：逐父 fd 遍历与并发局限（提案）

固定 XNU man 的 103–125 行描述相对父 fd 的 openat，220–234 行描述目标 symlink 的 O_NOFOLLOW/O_SYMLINK。它还列出更强 flags，但可用版本未核。历史 [open(2)](https://developer.apple.com/library/archive/documentation/System/Conceptual/ManPages_iPhoneOS/man2/open.2.html) 只作为历史补充。本文不写 flag 数值、struct stat/dirent 布局，不照抄 Linux openat2，也不假设 O_NOFOLLOW_ANY/O_RESOLVE_BENEATH/O_UNIQUE 在目标 SDK/OS 可用。

设计流程为：持有已绑定根 fd；有界枚举一个目录；每个合法单名用该父 fd 的 openat 只读/no-follow 打开，再对返回的同一 fd 做 fstat、类型/身份/卷检查；目录只从已验证的 fd 进入。显示用相对路径不能参与重新打开。每层都执行 no-follow，终项检查不能代替祖先检查；链接可在策略允许下仅记为受保护 link，不能跟随。元数据路径应先辨别特殊对象，避免把 FIFO/设备打开变成阻塞读；非阻塞/目录 flags 的可用性和完整顺序仍需目标 SDK 静态审阅及实测。

不设置 create/truncate/write 权限。元数据只观察名称、类型、逻辑长度和身份，不读普通正文、xattr 内容或 Finder alias 目标。预算沿 AA 的深度 8/10000 条目/每目录 256，且底层枚举缓存也有界；达到边界保留 partial/issues，不无限取完再裁剪。当前通用 R 上限和 decoder 的 Windows UTF-16 结构不能原样当 Unix dirent。

对象消失/权限拒绝/类型替换、父目录被移动、同一名称重建、目录枚举中新增/删除都必须失败跳过或标不完整。父 fd 可绑定对象，但不能保证目录仍在原来的命名祖先下，也不能制造目录快照；前后 ID 一致不能排除中途变化。是否允许“仍持有原已选对象”的读权限与是否要求当前仍位于原根之下，须总控明确并冻结。未能证明的场景保留 race_protection_verified=false，禁止把 canonicalize+前缀或单次 O_NOFOLLOW 称为全部竞态防护。

## Z/AA：内容同意、上限、取消和释放（提案）

只有本次明确的 ReadRootPackageJson 经真实 P 活动 permit 产生额外 consent，才相对同一个根 fd 打开字面 `package.json`。拒绝 symlink、目录、特殊文件和 nlink 非 1；不以 alias、其它大小写拼写或其它配置做 fallback。前后 fstat 根和同一文件 fd，核 ID/类型/长度及可用变更信号；长度超 262144 先拒绝，独立硬 cap 为 262145 字节探测超限。不运行 scripts、不解析依赖路径、不把无效 UTF-8 换成有效正文；原文本直接交 U，重复键等结构语义不被 Value round-trip 抹掉。

这是与现 Z 边界对齐的候选，不是 Mac 一致性证明。POSIX 同 inode、同长度仍可能被并发原地改写；时间戳或 advisory lock 不提供 Windows share READ 的等价排他保证。需后票明确接受的弱一致性与拒绝条件，不能将有限前后核验写成恶意竞态已验证。未知时不输出结构观察；R 元数据与 Z failed sidecar 独立保留。

AA 先等 R 结束自己的 attempt，再决定是否创建 Z attempt。Skip 不调用 Z；R cancelled 或内容前 token 已取消，true 对应 skipped/scan_cancelled。R 最后一条 observer 取消可能得到 completed，仍应跳过内容；已有 partial 也不得丢失。冻结 [AB 补充语义](../../../contracts/project-workspace-addendum-v1/SPEC.md) 的 completed/partial+skipped 必须由真实消费者接收，不将 metadata 改成 cancelled 来迁就 UI。

现 Z API 没有取消参数。移植第一版若保持原 API，只承诺内容前检查和字节 cap，不承诺已开始读取的即时中断；如需逐块 token 检查，须先冻结新版接口/语义，不能偷改 v1。取消到达已读之后不能倒写为“从未读”。强制超时杀进程也不能算正常取消/释放通过。

attempt guard 只在 begin 成功后建立；错误/observer panic/序列化失败只结束自己取得的 attempt，不能取消调用方已有的 active permit。S 注册成功后，AA 正常/错误/unwind 都撤销本次登记，最后关闭 fd 并结束 security scope。panic=abort/进程崩溃没有 Rust unwind 保证，要单列进程级退出/资源观察，不谎称 Drop 一定执行。主线程等待不得和 worker join/stdio writer 形成环路。

## 信息与容量边界

原 Q 仍是默认不含路径的结构化报告，不保证匿名；原 Z 仍只有 U 结构证据，不输出正文、字段名值、内容 hash、绝对路径、dev/inode、bookmark 或原始 errno。对外错误用冻结枚举/固定净化文案；未知的 errno 到契约映射需逐项冻结，内部证据也不得带真实用户数据。metadata ordinary_content_read=false 与 sidecar true 分开，来源平台不得继续硬编码 windows，也不得冒写 synthetic_memory。[AA 契约](../../../contracts/project-session-v1/SPEC.md)

Apple 说明 APFS 有 clone、snapshot、稀疏文件和共享空间；clone 可共享数据块。[About Apple File System](https://developer.apple.com/tutorials/data/documentation/foundation/about-apple-file-system.json) 本方案只输出已观察的逻辑长度；allocated/reclaimable 保持 unknown/null。压缩、共享 extent、snapshot 保留及容器共享空间没有本票测量；dev/inode 去重既不识别 clone 共享块，也不证明删除释放空间。任何后续容量票仍不能将可重下说成可回滚，或将回收站位移说成释放。

## desktop 与后续独立票候选

Tauri 的 Mac 开发前置文档提到 Xcode，桌面可只用 Command Line Tools；这些未安装/验证。能力文档说明权限集可合并、remote 授权需单列，不能推导任意 Rust 文件读取安全。[前置](https://v2.tauri.app/start/prerequisites/)、[capabilities](https://v2.tauri.app/security/capabilities/) 后票须重新验证 Mac 内嵌协议、导航/CSP、主线程桥接、隔离 WebView 数据和正常退出，不能直接放行 file://、任意路径或 shell。

建议顺序如下，全部是 DRAFT 候选，无 READY 声明；总控先冻结接口/资源/验收并建新树后才可派。

1. **Mac 契约与环境单**：总控独占新版身份、路径/文件名字节、错误与线程能力边界，明确 sandbox 发行模式、最低 OS/SDK、两架构范围；唯一环境执行者获单独依赖权限。旧 v1/根 Cargo 不动。
2. **N/P 后端单**：候选文件仅 N 新 platform 后端与经冻结的 P 适配；先验根 fd/identity/租约与 permit 生命周期。它是 S/R/Z 的强前置。
3. **S 与 R 两独立单**：N/P 接受后分别冻结 S 的 AppKit 主线程选择和 R 的逐父 fd 元数据；各自独占文件和合成样本。不能让 S/R 争写共享契约。
4. **Z 内容单**：N/P 接受且一致性/取消语义明确后，冻结固定清单 fd 读取；与 R 可否并行由正式文件/依赖检查决定，不能从本文推定已可派。
5. **AA Mac 宿主单**：S/R/Z 接受后，组合主线程面板、worker、同次内容选择与晚取消；协议平台标识先由总控冻结。
6. **Mac 桌面适配与联合验收单**：桌面基础必须等 AC，合并报告消费者必须等 AD，且 AA Mac 接受；再测真实选中→R/Q/Z→桌面显示/附件。签名、notarization、采购与发布另由用户决定。

最小接口变更候选仅为：平台身份标签、OS-native 名称/根输入、不可伪造 lease 的受限借用、AppKit 调度/selection completion，以及若需即时内容取消的新 token 参数。逐项兼容与私有类型审查完成前，不实现、不改冻结 flags、不扩大内容范围。未来实机的具体证据与停止条件见 [ACCEPTANCE-PLAN.md](ACCEPTANCE-PLAN.md)。
