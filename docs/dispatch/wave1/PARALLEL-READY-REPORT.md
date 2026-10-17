# B/C并行派前验收

日期：2026-10-17。总控：Codex。结论：两张READY独立票，可与A并行；没有自动启动B/C执行者。

## 依赖与范围

- 最初观察A工作树写入；派前收尾时已出现完成提交`475c4703be3c455089b8080b53e084d4721b10f7`和完成报告首行、树干净，现记SUBMITTED待验收；未读取/修改其实现、切分支、重置或要求同步基线。
- B交六工具机器可读发现/保护事实包与纯Node校验；C交固定虚构数据的交互原型与Node/浏览器验收。B/C互不依赖，也不依赖A未完成代码。
- A的冻结文件、基线、权限、默认workerRules/helper/contractLock保持原值；仅在权威manifest追加B/C和活动状态。新任务使用任务级Node纪律/helper/冻结锁，ADR-003追加扩展初始A单线排期。
- B/C基线为`e92f39647c91d9ce077d592583c3352626d3402b`，tag `water-w1-parallel-base-20261017`，独立工作树b/c与分支已存在。各自输出包/原型/回执/证据，无共享产品文件写入。

## 实际验证

- 两个工作树分别运行parallel-check baseline：完整HEAD、分支、干净状态、9个B/C冻结文件哈希、Node24通过。证据为controller目录的b/c-initial-baseline.json。
- C树运行冻结browser-lab：既有Chrome在树内新profile启动、CDP空白页设置/读取、截图成功并关闭；不使用用户profile、不下载浏览器。c-browser-probe.json记录结果与图像哈希。
- 尚无B/C实现或行为测试，不宣称5+5+2目标已通过；浏览器探针不是产品UI测试。
- 原始A合同输入校验与研究来源检查仍通过；总控没有修改A的9项冻结内容。截图/模型在后续验收时仍需独立查看与复跑，Windows原型不等于macOS/Tauri验收。

## 发出与回收

用户分别转贴PASTE-B.txt、PASTE-C.txt中的指令给两个执行者。收到启动证据再将B/C从READY改为RUNNING。完成/受阻回执回来，由总控核实SHA/diff/范围/来源、复跑Node/真实DOM和查看原型，再决定集成。扫描器、正式桌面与真实清理仍待前置验收，不随这两票提前开放。
