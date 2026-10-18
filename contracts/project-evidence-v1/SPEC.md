# Project Evidence v1：项目文件名标记候选

遵从../evidence-batch-v1/COMMON.md。packages/project-evidence，package water-project-evidence，lib water_project_evidence，pub mod v1，唯一tests/evidence_v1.rs。输出类型ProjectEvidence，analyze_json/to_json签名和错误按共同规范。不复制、修改或绕过G。

wire严格字段：evidence_version="water.project-evidence.v1"、rules_version="water.project-marker-rules.v1"、共同头read_only/scan_id/source_run_id/platform/status/source_facts/source_totals、counts、candidates。counts恰为scopes/entries/candidates/non_file_marker_names四个u32：来源scope数、recorded_entries、实际候选数、名字匹配但kind不是file的条目数。

规则只允许下面四条，按相对路径最后一个/段精确、大小写敏感匹配；不做locale/Unicode正规化、substring/startsWith、路径解码或宿主文件系统大小写猜测：

| basename | rule_id | ecosystem |
|---|---|---|
| package.json | node-package-json | node |
| package-lock.json | node-package-lock | node |
| pyproject.toml | python-pyproject | python |
| requirements.txt | python-requirements | python |

仅kind=file产生候选；directory/link/other即使同名也只进入non_file_marker_names。cache名字、扩展名、mtime、大小或工具默认目录不构成候选。一个标记一个候选，不合并同目录多个标记、不跨scope去重；按scope和entry原顺序输出。finding_id须沿G全entry平铺entry-N计数，包含非候选项，不是候选数组下标。

每candidate严格字段：finding_id、scope_id、relative_path（来源原值）、parent_relative_path（删除最后一个/段后的原始父路径，根项为空串）、rule_id、ecosystem、evidence_strength="filename_only"、format_verified=false、tool_version_known=false、project_membership_verified=false、scope_coverage（所属scope原Coverage）、action="display_only"、risk="protected"。字段类型可使用A枚举/ID/RelativePath或严格内部枚举，Serialize值必须一致。

partial/cancelled中已经记录的普通文件标记仍输出候选，覆盖状态照抄，不伪造未枚举项或宣布项目存在/目录为空。没有内容读取，因此不证明JSON/TOML有效、锁文件依赖/版本、工具已安装、父目录项目归属或可恢复。即使候选命中，旧report类别unknown/risk protected保持，不接规则执行器/B路径展开/用户scope。

cases.json提供完整golden输入/context/expected；来源一部分为既有G合成case，一部分为新增有标签的内存合成变体，均非本批物理扫描。raw_inputs.json包含G原raw和附加raw；cases内source_errors为G实测原错误。唯一五顶层：evidence_candidates、evidence_validation、evidence_coverage_and_paths、evidence_preservation_and_purity、evidence_public_wire。

必须逐值比较全部golden和全部wire字段，并从公开analyze_json/to_json至少重复实际G验证往返；覆盖四规则、根/深层/Unicode父路径、a与ab、跨scope同路径不同finding、同名directory/link/other、PACKAGE.JSON/package.json.bak/伪cache、空快照、partial/cancelled及根issue空串完整保留。raw重复键/缺nullable/对象枚举和非法context须返回AnalysisError::Source，原code/field与真实G逐项相等；错误canary不泄漏。输入/context不变、深克隆输出不共享可变入口，O(n+总路径字节)，不全配对扫描。

行为红标记L_BEHAVIOR。三个实改源码负控：nc1将同名非file也当候选，命中L_FILE_ONLY；nc2把filename_only/未核格式提升为已验证（或format_verified=true），命中L_FILENAME_ONLY；nc3篡改输出source_totals.logical_bytes未知为0，命中L_SOURCE_TOTALS。每次完整五测红和恢复suite按COMMON收录。不要为负控改输入、测试或关闭G。
