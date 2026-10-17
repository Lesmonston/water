# Rust受控扫描：草案已由正式F协议替代

当前并行更新：F已观察到实现中；G/H/I独立接口和预检已完成READY，均不依赖F在途代码。报告组装以冻结F JSON协议先实现，不再等待F后才出票。见[四线计划](PARALLEL-NEXT-PLAN-20261017.md)；本页关于后续顺序的文字属于F原派前历史。

2026-10-17当前：F已完成接口/六测试/四负控及22项冻结，独立f树和Windows基线/夹具探针通过，READY待用户外贴。正式依据为[F票](../tickets/WATER-W1-F-SCAN-LAB-20261017.md)、[ADR-006](../../decisions/ADR-006-controlled-scan-lab.md)与[派前回执](SCAN-LAB-READY-REPORT.md)。F产品尚不存在，六产品测试和实际扫描bridge未运行。

采用独立packages/fixture-scan workspace/锁，保持根Cargo及旧产品不变。下文“独占root Cargo”的原设想已经取消，仅保留历史，不授权执行。F仅面向自有静止合成夹具；Windows身份Unknown，macOS未实测，不提供生产竞态保证。F验收后再冻结分类/报告转换与正式桌面接线。

## 原边界草案（历史）

总控草案，DRAFT，不可外贴执行。A补单01及D夹具资产均已独立验收和集成（Windows范围）；剩余前置为准确接口/测试冻结、独立工作树、工具链基线及派前检查。当前不创建water-scan空壳、不改根Cargo或冻结v1。

2026-10-17验收更新：D原单的数组属性问题已由补单01修复，五测试及19独立边界在单票和集成树均通过。目录创建与校验通过不等于Rust扫描行为通过，本草案继续不可外贴。

E现已验收，其19项冻结包含根Cargo.toml/Cargo.lock与A源码。下文关于扩展root workspace的设想尚未重新冻结；正式F票必须先明确workspace归属及兼容边界，保持既有基线/锁的可复核性，不可直接按草案修改根Cargo或旧冻结材料。

后续拟由一张环境/内核票独占root Cargo与锁：在已验收water-contracts基础增加water-scan；std负责元数据读取，不运行工具、项目脚本或外部命令。首轮只接受本项目拥有的fixture run及其明确scope，不提供默认HOME/全盘入口，也不接Tauri。

扫描facts与报告DTO分离：遍历记录entry种类、相对路径、逻辑字节可空、受支持的文件身份、scope覆盖和issue；分类规则及报告转换在之后的独立票中接入。没有已分配空间依据时保持未知，不把file长度加成可回收量。

待冻结的API点：scope构造/根复核、只读IO适配器、取消token与预算计数、故障注入、路径不可表达处理、平台身份适配与按scope事实顺序。目录排序和fixture plan口径见fixture-lab-v1；消费形式需在正式票前形成准确Rust签名和测试，不由worker临时决定。

首批验收：不跟随symlink/junction，前缀兄弟不越界，重叠scope保持覆盖来源，硬链接身份可识别但不盲加总，Unicode与资源/取消/permission issue如实传播。身份/链接/权限的Windows与macOS证据分开。Node生成目录成功不等于这些扫描行为已经通过。

放行前由总控建立新冻结材料、实际工具链基线和独立树，完整核对前置后才标READY。真实用户目录、执行器、计划、恢复、打包及收费均不在这张后续只读票内。
