# water-junk-rules

Windows 设备垃圾体检的规则登记表。规则数据编进库，只做校验和扫描计划解析，不访问磁盘、环境变量、注册表或网络。

真实冒烟示例 `real_smoke` 只检查已知目录和字面路径前缀是否存在，不列目录、不读文件内容。

规则支持可选字段、文件与目录名模式及结构条件，数据版本为 `2026-11-08.1`。`resolve_plan` 默认不生成可清理的会话目标；`resolve_plan_with` 只为显式启用的五种工具追加会话目标。年龄天数与解锁关系严格校验，文案及安装名称留在 `Rule`，不写进计划。

`MatchSpec` 与 `InUseMode` 的变体和原有字段保持兼容。项目声明的 pattern 条件保存在 `Target.pattern_conditions`，序列化时写入 `match.conditions`，只接受 custom 类别的单个 `sibling_without_suffix`。其余新增目标字段取缺省值时不写 JSON；`system_drive` 从 `windows` 推出，已知目录 JSON 仍为原形状。实际扫描、在用判定、已安装应用匹配与清理由后续包负责。
