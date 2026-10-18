# ADR-011：进程内目录范围许可与默认脱敏报告

2026-10-18，总控采纳。A–O及五补单已验收。P推进W-F01的后端范围生命周期，Q推进W-F07的详细脱敏报告；两者只依赖已验收模块，可独立实现和验收，用户分别外贴，不自动启动实现者。

P独占packages/scope-registry，持有真实N DirectoryLease，以私有、不可序列化的Rust对象区分pending/confirmed/active；每注册对象、每扫描尝试用独立Arc<()>身份绑定registry和当前实例，不能从ID/路径/JSON构造能力。不需随机字符串或新FFI。prepare不确认，confirm是可信进程内宿主的显式声明；重放、跨registry、重复活动permit、取消/完成后重用和撤销后使用均拒绝。观察身份来自真实N；只查句柄，不枚举/读内容。P不保存或导出原路径，不接HTTP/WebView/LLM/原生选择器，因此不声称验证了真实用户手势。后续遍历器须持有效permit，重新取得native根句柄后比对许可绑定身份，逐个子段相对打开；单靠ID串或路径不能授权。

Q独占packages/redacted-report，只接A报告，调用真实A校验和H汇总；输出固定白名单逐项结构、局部顺序alias、固定枚举和容量/覆盖原值。源ID、路径、label、工具名/版本、rule_version、项目ID、evidence.summary和issue.message全部移除，不保留hash/字典/路径片段。它不重分类、不重算来源总量，不把Unknown变0，也不承诺匿名不可关联。生产纯内存，无文件下载/上传/磁盘写入/UI入口；桌面导出接线后续独立验收。Q当前不导出L/M全文，因为完整facts和相对路径含直接标识；后续若需要，另冻脱敏侧车协议。

新scope-export-v1继承九旧锁/198唯一文件，冻结P/Q契约、五测试、真实公开API桥接、helper和已验收依赖。旧产品/N/O/API/根Cargo/旧helper/锁不改。P只获新冻结工具在p树.local创建一批四个空目录、一个junction的权限，普通文件内容0字节；Rust只读元数据。Q无物理fixture权限。总控实际baseline成功后才分配READY。

M1剩余纵向门：原生选择器到P可信宿主、permit到句柄边界有界元数据遍历、实际会话/覆盖/取消与页面、详细脱敏报告到桌面文件交互。当前P/Q不放行真实用户数据扫描，不接清理。Windows和macOS分别验收；源码/官方资料不等于遍历实测。
