# Node Manifest v1 — 仅内存的package.json结构证据

packages/node-manifest，water-node-manifest/water_node_manifest/pub mod v1；独立workspace members=["."]/resolver3，0.1.0/edition2024/rust-version1.95/publish=false，四auto=false，唯一lib/tests/manifest_v1.rs。直接依赖仅serde =1.0.229 features=[derive]、serde_json =1.0.151，沿根锁既有版本/checksum，无A/product path/dev/build/unsafe/bin或新包。生产纯内存，未来授权内容采集另票，本票不读文件/环境/配置/网络/时钟/日志、不执行scripts或解析依赖。

```rust
pub fn analyze_package_json(raw:&str)->Result<ManifestEvidence,ManifestError>;
pub fn to_json(evidence:&ManifestEvidence)->Result<String,ManifestError>;
```

ManifestError恰InputTooLarge、InvalidJson、DuplicateKey、NestingTooDeep、InvalidShape、InvalidField、TooManyEntries、SerializationFailed，Debug/Clone/PartialEq/Eq/Display/Error，Display恰`<Variant> at /manifest`，不回显原文/字段名/serde原错。输入UTF-8<=262144字节，超限先返回InputTooLarge。使用原raw自定义Serde visitor递归严格解析，所有深度的重复键（包括被忽略未知metadata）拒绝DuplicateKey，不能先Value丢重复键。容器根深度1，超过32返回NestingTooDeep；有界结构转换前先语法检查，语法坏InvalidJson优先于重复/深度。JSON数字按serde_json支持精度，无float运算，不修改输入。

根必须object；未知元数据允许但仍完整语法/重复/深度验证且不进入输出。以下已知字段存在必须严格类型（null不当缺失）：name/version为1..256 Unicode字符string且无ASCII控制/DEL；private为bool；scripts为object且<=128项、值string<=4096字符（允许空、控制文本但不输出）；dependencies/devDependencies/peerDependencies/optionalDependencies为object各<=4096项、key为1..256非控制string、value为1..2048 string无ASCII控制/DEL；workspaces只允许array<=128，每项1..256非控制string，不支持{packages:...}，值只作为声明计数，不展开glob/路径，不据此证明本地引用。optionalDependencies和dependencies同名分别计数，不能按总去重推生产依赖。字段类型错InvalidField，超项TooManyEntries；根非object InvalidShape。未知字段不是项目已识别的充分证据。

输出与嵌套Debug/Clone/PartialEq/Eq/Serialize，字段私有，无Deserialize/Default/任意构造器/可变getter。严格wire：manifest_version="water.node-manifest.v1"、source_kind="caller_supplied_text"、read_only=true、format_verified=true、project_membership_verified=false、tool_version_known=false、action="display_only"、risk="protected"、ecosystem="node"、evidence_strength="parsed_structure"、recognized_field_count(u32)、has_name(bool)、has_version(bool)、declared_private(Option<bool>)、counts。counts恰scripts/dependencies/dev_dependencies/peer_dependencies/optional_dependencies/workspace_patterns六u32，缺字段计0。recognized_field_count为上述name/version/private/scripts/四依赖/workspaces共9个被实际提供字段数量；没有已知字段的{}仍格式合法、计0，不宣称已安装npm/项目归属/内容来自磁盘。JSON解析通过不是可删除判断，原分类保持不变。

绝不输出name/version原值、脚本、依赖名/版本/range、workspace字符串、原始文本/hash/路径或未知metadata。精确计数仍可关联，不保证匿名。to_json仅序列化有效私有结构，不接任意Value。顺序、有效自由文本改名和未知metadata变化不改变输出；字段是否提供/类型/计数必须真实，不能按样本id匹配expected。

唯一manifest_structure、manifest_raw_validation、manifest_field_limits、manifest_privacy_and_purity、manifest_public_wire。cases.json正例完整golden和原raw错误、duplicate深层/unknown/数组、depth32/33、256KiB/超限、全9字段/false和null、scripts/依赖/workspace上下限、canary文本变化、真实公开API/Serialize往返。额外动态边界输入在测试内生成，不写物理fixture。

行为U_BEHAVIOR；nc1忽略未知metadata中的重复键→U_DUPLICATE_UNKNOWN；nc2把project_membership_verified提升true→U_NO_OWNERSHIP；nc3输出额外name或脚本文本→U_NO_CONTENT_LEAK。全部完整五红/原字节恢复五绿，不能编译/超时造红或改helper。文件内容获取/Node包规范全部语义校验/项目识别分类提升/引用解析/macOS或真实用户目录不在本票验证。
