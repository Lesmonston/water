# Water scan v1 冻结契约

维护者：总控。适用阶段：M1只读盘点。格式标识：`water.scan.v1`。

- [JSON Schema](scan-report.schema.json)：结构、必填、枚举、规范字节串与相对路径形状。
- [语义与Rust API](SEMANTICS.md)：跨对象约束、身份与权限边界、错误码。
- [有效示例](examples/valid-report.json)：虚构数据，不引用真实用户目录。
- [一致性用例](conformance-cases.json)：总控指定的独立输入变换与预期结果。

所有对象拒绝未知字段；所有属性均必须出现，即使其值允许null。枚举未知值拒绝，`unknown`必须显式给出；不静默补安全默认值。

JSON Schema只负责结构，不能证明跨scope引用、ID唯一、风险关系或文件系统安全。实现必须在反序列化后调用语义验证；必须分别测试结构错误和语义错误。

该JSON是本地内存/IPC数据形状，不是可以原样上传或默认导出的公开报告。relative_path、label和summary仍可能含私有信息；后续导出器必须独立脱敏。本轮不实现导出、UI、路径访问或清理。

变更仅由总控维护：有兼容性影响时创建新版本或明确迁移，不允许执行者为通过测试修改Schema/示例/语义。本轮票面与契约发生冲突，停止并报告，不选一种自己继续。
