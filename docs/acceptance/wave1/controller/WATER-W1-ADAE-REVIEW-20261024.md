# AD同源报告与AE研究材料收单验收

2026-10-24。**AD VERIFIED（Windows受控回放）；AE VERIFIED（研究文档范围）**。隔离受测 `5b4d77c3fff3717ac60277fe67e04444477cea77` 已快进主线，无产品修补或冲突。AC及补单01仍BLOCKED，不再下载、不外贴；本次没有新实现者。

## 接收与原字节

AD接收 `753c8018fd7e8effd423db86495079fdc8cd0d08`，受测实现 `3ad5e7003d9e9720e85113a47d558738bf06231d`，11个获分配实现文件；[原报告](../../../dispatch/reports/WATER-W1-AD-REPORT.md)、[420份原归档/7031120字节](../ad/ARCHIVE.json)逐项source/archive/Git blob一致。原三final、有效404→200行为红、两稳定生产负控及各自完整五绿/源码恢复均核实。早期paused-chunk错误red和两次失败门保留，不作有效行为证明。

AE接收 `07ae41c18459dd2450622944466c20a80856e456`，受测材料 `3182286f8c2df25ed940f8f0dc8a71507bb24a4e`；[原报告](../../../dispatch/reports/WATER-W1-AE-REPORT.md)、[71份索引材料/561978字节](../ae/ARCHIVE.json)字节核对通过。实现提交允许同时包含四材料和50份本票证据，后续只报告/证据，无产品/冻结改动。其一次final包含三项文档检查。

[收单审计](w1-adae-20261024/controller/2026-10-24T01-08-06.064Z-14692-submission-audit.json)及[集成准备](w1-adae-20261024/controller/2026-10-24T01-11-48.069Z-38376-prepare-result.json)绑定基线/分支、范围、13/4捕获文件、完整原证据和514约束。总控最初将AE实现提交中的证据误计为产品文件，审计失败原JSON也归档；修正总控分类后通过，未改任何AE材料。

## AD独立行为与页面

[实际复测](w1-adae-20261024/controller/2026-10-24T01-13-08.617Z-27092-check-result.json)在全新私有树执行语法检查、旧3+新2完整五测、旧2+新1完整三浏览器测试，无skip/cancelled/todo。生产流→严格状态机→同步捕获→原W→同源新报告均为真实已交付实现；输入来自冻结七case和真实AA晚取消捕获的回放，partial明确为内存变体，dialog envelope为合成声明。未重新运行AA/S或访问物理夹具，不把这次回放描述为新的真实AA→AD系统整链。

检查同job原字节、事件后首await前修改输入、confirmed/选择取消、default/observed/scan cancelled/late completed/partial/missing/failed、最近两项淘汰、实例隔离、路由/Host/方法与动作权限、借用streams和close。8次实际鼠标下载：7份Q为1387/1387/1387/1385/902/858/1386字节，1份Z为844字节，均与当次原字符串UTF-8一致；fetch没有冒充下载。旧W链接/API和默认false保持。

[独立生产负控](w1-adae-20261024/controller/2026-10-24T01-14-21.250Z-40544-negative-result.json)在验收树逐条使用已提交坏态字节：移除淘汰删除命中AD_REPORT_BINDING；绕过本job内容授权命中AD_REPORT_CONSENT。每次完整五测实际失败，立即原字节/hash恢复并完整五绿，测试文件不改、无生产开关；最终树干净且SHA未变。

[实际看图记录](w1-adae-20261024/controller/VISUAL-REVIEW.json)：新project-report共28图，本次view_image查看8图，覆盖1440×1000/900×800、结构零值/未知保护、late completed/partial、取消及失败页面；余20图仅保留，不冒称看过。页面可滚动、无横向溢出，元数据结果与内容取消分开，无结构时不展示结构附件。

## AE研究审阅

[独立检查](w1-adae-20261024/controller/2026-10-24T01-13-08.617Z-27092-check-result.json)核四材料、恰七组件、14条read/7条unavailable、15唯一当前文件的固定提交/原字节SHA/行号、19矩阵用例与计划对应。已读每条归档证据的性质：Apple DocC为明确投影，HTML为有界摘取；它们不冒充原HTTP body。XNU man保留固定commit与完整许可头，仅静态研究。

[一手来源复核](w1-adae-20261024/controller/PRIMARY-SOURCE-RECHECK.json)本次8个地址中5个读到正文、3个工具不可达，未把不可达记成功。抽查[Apple文件访问](https://developer.apple.com/tutorials/data/documentation/security/accessing-files-from-the-macos-app-sandbox.json)、[scope释放](https://developer.apple.com/tutorials/data/documentation/foundation/nsurl/startaccessingsecurityscopedresource%28%29.json)、[APFS](https://developer.apple.com/tutorials/data/documentation/foundation/about-apple-file-system.json)、[固定XNU手册](https://github.com/apple-oss-distributions/xnu/blob/f6217f891ac0bb64f3d375211650a4c1ff8ca1ea/bsd/man/man2/open.2)、[Tauri权限边界](https://v2.tauri.app/security/capabilities/)与材料所述边界一致。Rust1.95版本页仍不可达；材料已明确在线1.99.1与项目1.95不等价，不能代替Mac编译/运行。

设计将主线程选择、URL/sandbox租约、父fd/no-follow、身份域、mount/Unicode、并发变化、同句柄cap、内容独立同意、late取消、attempt释放和容量未知分别列为提案/阻断问题。未猜SDK常量或声称解决全部竞态；后续六类候选均DRAFT。未来OS/两架构/APFS/SDK/GUI和签名发布计划不授予现在的执行权限。

## 关闭、集成与剩余边界

[进程/端口核查](w1-adae-20261024/controller/PROCESS-CLOSE.json)没有残留本验收树Node/Chrome，8个workspace端口无监听；定向Node已退出。总控手动强制终止0，系统窗/目录窗0；冻结Chrome helper的kill兜底未单独计数，不据此声称所有Chrome都自然退出。profile/日志/下载保留，无清理。

[快进记录](w1-adae-20261024/controller/MAIN-INTEGRATION.json)及[最终审计](w1-adae-20261024/FINAL-AUDIT.json)：491份worker归档已随原提交集成；本轮另存231份总控证据/2728827字节，[索引](w1-adae-20261024/ARCHIVE.json)逐项原字节核对。514冻结、原两树和其它29任务/槽位（含AC）保持。源码/测试没有总控修补。原始材料空白非零保留，作者材料与日志分别检查。

AD/AE无需重贴；AC网络条件未变化，本次没有重新尝试或发READY。新真实AA→AD、桌面扫描/打包、用户scope、自然同意鉴真、生产竞态、macOS产品/实机与M1未验收；强依赖桌面单继续等AC。
