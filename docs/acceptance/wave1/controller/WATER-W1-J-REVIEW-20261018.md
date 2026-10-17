# WATER-W1-J 总控验收与集成

2026-10-18（Asia/Tokyo）。结论：VERIFIED，仅Windows受控合成夹具范围。J产品未改；原bridge final工具失败保留，不能记成原五门全绿。K仍在原单，实际J→K页面尚未验收。

| 项 | 证据 |
|---|---|
| 原基线 | bc409f4af8cb2d51b2f67341ad46637cfa5e66f3 |
| 接收HEAD | 1dfa82c014cbdb99024b0da48dd4b6bff9f9e3d8，干净 |
| 受测实现 | b6fd1fe6566ad79dbcca6c420988c9bb40c47d80 |
| 隔离受测提交 | d14e1f11129919700b6b7d92df187b44b66fae83 |
| 验收树/分支 | .worktrees/integration-j-20261018 / controller/water-w1-j-20261018 |
| 实际执行者模型 | Codex / GPT-6，自报会话标识，细分build未知 |

## 收单与原门

[接收审计](w1-j-review-20261018/intake-audit.json)核359新增文件均在原白名单：六产品、352证据、一报告；后续只加报告/证据，产品tree与实现提交相同。350份原始归档逐文件与来源比字节，263完整命令日志、54源码快照及final proofAudit核验通过。132唯一冻结在主树与worker均一致。

[原门复跑](w1-j-review-20261018/original-gates.json)：总控在干净接收HEAD串行复跑原fmt/test/clippy/metadata四个final，全过，五测试完整运行，行为红/三负控与恢复字节再次被原helper核对。原worker bridge final仍为失败：J构建成功后在water_scan同名rlib目录计数2≠1处退出，比较程序未编译/运行；并非已证明产品失败。原[受阻回执](../../../dispatch/reports/WATER-W1-J-REPORT.md)及其完整失败日志不改。

## 总控工具勘误与隔离真实联测

[勘误01](WATER-W1-J-CONTROLLER-ERRATUM-01-20261018.md)仅调整独立总控工具：按成功的Cargo JSON输出、实际metadata可达package_id和lib目标选择唯一产物，核固定私有target路径；保留重复产物，缺失/歧义/失败/越界拒绝。原session-batch-check、七份旧/本批冻结和K任务对象均不变。后续J→K总控runner也复用此选择器。没有为了总控工具缺陷再派产品实现单。

[成功回执](w1-j-review-20261018/2026-10-17T17-27-41.557Z-27768-result.json)绑定上述干净隔离提交：

- 私有target先构建原四workspace，再构建真实J；water_scan、water_scan_report、water_report_view、water_summary_export各保留两份rlib，旧选择器仍会拒绝。新选择器三测试通过，包含实际Cargo根库位置、旧产物共存、缺失/多解/失败/越界拒绝。
- 离线jobs1重跑J五Rust测试、fmt/clippy/metadata通过。真实lab-session-bridge调用J，独立scan-report-summary-pipeline仅通过旧F/G/A/E/H计算；13快照全部六字段逐值一致，未读expected替代结果。原生11case/12scope/39entry，两控制为预取消与注入权限。实际J输出和所有编译/运行stdout/stderr原字节归档。
- 44内容快照通过，132冻结、A–I产品tree与根Cargo未改。[集成字节审计](w1-j-review-20261018/integration-audit.json)核359份worker文件在验收树及main与接收现场原字节一致，主线快进到实际受测提交；之后仅文档/证据/台账收尾。
- 本验收树仅未改的冻结prepare新建一批11+6有界合成run，81687内容字节；第二次工具试跑复用。Rust只读，不读普通payload，无ACL/移动/删除或清理。worker原81057字节夹具未动，K没有物理fixture权限。

## 历史红绿和工具失败边界

初次行为红成功编译并完整五测失败，之后lint修复改变平台选择测试字节；最终测试字节的行为红在lint修复后重录，不能声称它早于首次实现。三项真实生产负控依次破坏共享取消、完整facts、未知totals，目标断言命中，逐次原字节恢复完整五测绿，最终测试字节未变。历史两次clippy/bridge失败和worker列出的操作失败均保留，未用编译/缺文件/超时造红。

总控第一次隔离试跑在根库产物路径检查处失败：Cargo实际把根库放在target/debug/libwater_lab_session.rlib，依赖在debug/deps；当时尚未编译运行桥接。失败receipt与全部日志一并归档，修订固定根库位置后在新干净提交完整重测通过，未改产品或放宽快照比较。另一次检出尚未完成即发起merge，被Git index.lock拒绝；等原检出进程完成且树干净后重试成功，没有清锁/重置/清理。一次Windows字面glob只读查询失败后改为rg -g查询，非产品失败。

总控收尾scratch脚本首次将RegExp传给String.includes触发TypeError，已写台账而尚未改文档；修正匹配并核对既有状态后完成全部同步，未触及产品/夹具。文档检查已通过119份Markdown与468处本地链接，冻结、任务范围和K对象另核原值；不将该操作错误计作产品负控。

## 未验证范围

macOS、真实用户scope/ACL/ReadDir迭代故障、恶意并发、工具适配/分类、去重/回收容量、桌面及删除均未验证。不可达错误和SnapshotTooLarge分支仅源码/类型审阅，不冒称分支实测。J快照仍含相对标识，不是匿名导出。K收单并独立通过后，才将真实J输出直接供K服务验页面。M1未完成。
