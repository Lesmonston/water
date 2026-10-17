# ADR-006：独立workspace中的受控只读扫描事实库

2026-10-17，采纳。用户要求推进后续任务；A/B/C/D/E已验收（Windows范围）。F承担首次真实文件系统元数据遍历，实现由用户外贴，不由总控或内部实现代理完成。

采用`packages/fixture-scan/`独立workspace，crate=water-scan，公开模块fixture_v1。保持根Cargo、A–E源码/锁/helper及既有43冻结不变。依赖只用本地A和现有serde/serde_json版本；std负责元数据与目录项，不新增平台包、nightly或unsafe。

F只消费本工作树`.local/fixture-lab/run-*`中D生成的静止合成夹具，路径根从编译时包位置派生。公开入口不接任意根路径、HOME、shell、WebView或LLM路径。Marker只是合成实验室校验材料，不是对真实数据的授权；路径来自冻结case的scope，不使用marker里的绝对展示路径做IO。

元数据读取与遍历分离：私有路径token只由已检查的run/scope派生；NativeIo只提供末端no-follow元数据和有上限的目录名称批次。自定义IO/observer用于真实故障传播与取消路径验收，不能按case id伪造扫描结果。输出facts与ScanReport/Finding及E投影分离，没有分类、汇总回收、内容识别、导出或执行器。

Windows稳定Rust1.95的file_index/volume_serial_number仍为不稳定API，F固定记录identity未知；不按路径、大小、时间戳伪造身份。macOS设计使用稳定dev/ino/nlink，但本机不冒充macOS实测。没有分配空间依据时allocated_bytes保持null，不累加重叠scope/硬链接。

根/祖先逐组件no-follow检查与扫描前复核只服务于无恶意并发修改的合成实验室；Windows未知身份无法可靠识别所有同路径对象替换。生产TOCTOU与真实用户scope授权需要后续独立设计，不能把本票叫作生产安全扫描器。平台依据见[静态核对](../../research/platform/SCAN-STD-20261017.md)。

F获得单独、有限的物理夹具准备权限：仅总控冻结的prepare工具在F自己的.local新建D夹具及六个负例；不改ACL、不移动、不删除、不清理、不写其他树。生产库只有读取权限；E的权限不扩张。先冻结协议/矩阵/脚本、核工具链/原生链接，再建立F树并标READY。
