# macOS Port Readiness v1 — AE

2026-10-23。设计/研究票，无产品实现、依赖安装、SDK/工具链下载、远程登录或macOS运行权限。Windows上形成可核验移植清单，不把Unix内存例/交叉编译/文档阅读当macOS验证。和AC/AD无产品写入冲突，无前置在途依赖。

在docs/research/macos-port-20261023/生成SOURCES.json、GAP-MATRIX.json、DESIGN.md、ACCEPTANCE-PLAN.md。只读现有N/P/R/S/Z/AA和桌面公开契约；不改其代码/错误/flags、根Cargo或旧契约，不运行research/upstream脚本/子模块/依赖，不访问真实数据。

SOURCES.json version=water.macos-sources.v1，checked_at、sources数组；每项id/url/accessed_at/access/title/summary，access只read或unavailable。只主要一手Apple、Rust、Tauri资料，官方apple-oss-distributions可作固定commit源码来源。至少6条实际阅读来源，无法读取明确标unavailable且不能用于支持事实；JS空页不算已读API内容。Archive manpage注明历史版本边界，不能当最新SDK实测。保留来源/公开定义固定文件行与SHA；页面引用和实现推断分开，不大段复制文档/代码。

GAP-MATRIX.json version=water.macos-gap-matrix.v1、implemented=false、real_macos_executed=false、entries恰N/P/R/S/Z/AA/desktop七项。每项component、current_sources[{path,sha256}]、macos_status固定not_implemented_not_tested、proposed_api（设计文字）、unresolved_questions非空、source_ids非空且对应read来源、acceptance_cases至少2项{name,expected}。源路径只当前分配的本项目packages/或冻结contracts/，不扫描其他目录。哪些通用内存API已可用与哪些Mac系统API未实现分别说明；不得将当前Windows公开类型已实现说成Mac实现。

DESIGN至少覆盖NSOpenPanel和AppKit主线程/用户取消、host声明与自然手势证明区别、security-scoped URL/bookmark/sandbox对选中能力的影响；dev/inode身份和mount/case/Unicode边界；逐父fd openat/fstat/O_NOFOLLOW、祖先symlink、hardlink、权限/消失/替换/目录并发变化、同句柄内容读cap与取消、生命周期/错误净化和原Q/Z信息边界。逐处指明未经证实的SDK常量/ABI/OS版本，不猜FFI布局；不得以canonicalize+前缀或O_NOFOLLOW终项检查宣称解决全部竞态。

APFS clone/snapshot/稀疏/压缩/allocated与reclaimable保持未知，不能拿inode去重冒充物理回收量。提出最小文件归属/后续接口变更候选与独立票顺序，但不改冻契约或把强依赖新实现标READY。普通metadata默认不读正文，Z额外内容同意独立、取消和partial不得丢失。

ACCEPTANCE-PLAN列必须在真实macOS的OS/架构/文件系统/SDK信息和独立新树.local合成样本，GUI窗口/墙钟预算、权限不足、symlink/hardlink、大小限制、精确late取消、panic/attempt释放和整链条件；mock/纯内存与真实实机分开。至少写明签名/notarization/采购/发布另行决定，不要求用户此时提供Mac、Apple账户或凭证。本票不宣称macOS、桌面扫描或M1验收。

helper check做三项文档一致性/来源索引/验收计划检查，非产品测试，无机械负控；最终干净报告前提交四材料，同SHA check --final。必须人工核对每个来源确实支持结论、每个current_sources路径和行号可读且SHA精确，报告记录未解决问题。受阻保留成果，本路径交回，不擅自扩大系统/真实用户权限。
