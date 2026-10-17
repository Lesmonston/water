# ADR-005：D修订期间并行准备报告展示投影

2026-10-17，采纳。用户要求继续安排后续任务。A/B/C已VERIFIED；D补单01尚无新回执，正式Rust扫描票继续等待D验收。

增加同一water-wave1内的独立E：`packages/report-view/`为Rust纯内存库，把已验收scan v1报告转换为新的`water.report-view.v1`展示数据。原始JSON入口必须调用A的parse_report，手工DTO入口必须调用A的validate_report，不在JavaScript中重造协议校验。投影保留来源状态与证据，不分类、不修正保护状态、不计算回收量。

E采用自己的Cargo.toml、Cargo.lock与独立[workspace]，通过只读path依赖使用已集成A；不改根Cargo、A/B/C产品、旧helper或旧冻结锁。已用项目内缓存离线验证独立workspace读取A的继承配置可行；正式E实现尚未存在。依赖只使用当前已锁定serde/serde_json与A，不安装或联网下载。

输出行兼容C的model.mjs纯函数，验收用真实Rust投影结果经过JSON序列化，再调用C的筛选/排序/摘要。C页面仍是synthetic演示，不替换demo-data、不接app.mjs、不做Tauri/IPC。新视图不是water.prototype.v1，也不是facts→Finding的分类器或正式water-report导出器。

此票不依赖D、物理fixture或未来扫描接口，因此可和D修订并行。它不满足扫描票的前置，也不开放真实数据、文件写入、扫描、网络、清理、脱敏导出或发布权限。文本可能含私密内容，不能把投影叫作已脱敏。

总控先冻结新视图协议、合成输入/输出、跨语言桥接、定向helper、独立e树与基线。实现仍由用户外贴；总控只做规划/工具/验收材料，不启动实现者。后续顺序见[本批计划](../dispatch/wave1/NEXT-BATCH-20261017.md)。
