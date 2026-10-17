# 下一张Rust只读扫描票的边界草案

总控草案，DRAFT，不可外贴执行。前置：A补单01独立验收及主线集成；D夹具资产验收。当前不创建water-scan空壳、不改根Cargo或冻结v1。

后续拟由一张环境/内核票独占root Cargo与锁：在已验收water-contracts基础增加water-scan；std负责元数据读取，不运行工具、项目脚本或外部命令。首轮只接受本项目拥有的fixture run及其明确scope，不提供默认HOME/全盘入口，也不接Tauri。

扫描facts与报告DTO分离：遍历记录entry种类、相对路径、逻辑字节可空、受支持的文件身份、scope覆盖和issue；分类规则及报告转换在之后的独立票中接入。没有已分配空间依据时保持未知，不把file长度加成可回收量。

待冻结的API点：scope构造/根复核、只读IO适配器、取消token与预算计数、故障注入、路径不可表达处理、平台身份适配与按scope事实顺序。目录排序和fixture plan口径见fixture-lab-v1；消费形式需在正式票前形成准确Rust签名和测试，不由worker临时决定。

首批验收：不跟随symlink/junction，前缀兄弟不越界，重叠scope保持覆盖来源，硬链接身份可识别但不盲加总，Unicode与资源/取消/permission issue如实传播。身份/链接/权限的Windows与macOS证据分开。Node生成目录成功不等于这些扫描行为已经通过。

放行时由总控建立新冻结材料、实际工具链基线和独立树；不在A未通过时给一个依赖在途实现的READY假票。真实用户目录、执行器、计划、恢复、打包及收费均不在这张后续只读票内。
