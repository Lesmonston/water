# X/Y/Z收单、隔离集成与真实交互链通过

2026-10-19，Windows受控范围。三票完成收单并集成 `a9f64727d89013664805a203f13cb609d301cce2`，主线已快进该受测提交。X/Y/Z均 **VERIFIED**，A–W及七补单保持。没有代修产品、启动实现者或push。真实用户scope、生产竞态、自然手势、macOS/桌面及M1仍未验收；Z到用户页面的额外内容同意接线仍是下一步。

| 票 | 接收SHA | 实现/原final受测SHA | 交付路径 / 原归档 |
|---|---|---|---|
| X | c159297473a8ade534eaf0add9c1063fc0ec79f6 | abbad6ad60beb56ee69b7d7b3ca711b23cb29859 | 511 / 499文件、2510118字节 |
| Y | f1c5260c40c5fab4d797b145e36d1354e4dc2d85 | 657f84d52c02857aec0639af82a7dac59373b47e | 424 / 411文件、2417251字节 |
| Z | 6f1f77550262d017de12fbe9b4c201dbd57809c1 | f853a78560c91cbc3241f61ad5526ff096530948 | 618 / 609文件、2373412字节 |

## 收单与独立复核

三原树干净、共同基线祖先/分支和白名单通过；报告提交均为实现的直接子提交，仅报告/证据。1553路径完整保留，1519原归档/7300781字节与本树来源、提交blob逐项一致。8道原final均绑定各自干净实现，生产/测试快照、6条真正生产负控和当前字节恢复链独立重算通过；X nc2确实改坏传给真实V的CancelToken并用一窗实测，未拿纯状态测试冒充接线。X原4窗、Y/Z原0窗保持票面预算。[原提交审计](w1-xyz-review-20261019/controller/2026-10-19T13-10-32.938Z-31400-submission-audit.json)。

426唯一冻结（旧341、r2的202物理条目+4旧O/T资产Git对象、15继承锁）在主线/集成/三个worker树核对。仅Y新.gitattributes自身存在既定LF/CRLF检出差异，Git内容逐值一致，不改产品或旧锁来统一物理换行；记录见FINAL-AUDIT。所有其他交付字节与原提交一致。

独立集成树使用新私有Rust1.95/MSVC/offline/locked/jobs1，X4、Z4、Y5共13测试通过；Rust fmt/clippy all-targets -D warnings通过。Z测试重新运行真实许可/句柄读取/U分析及1成功+11编译拒绝；同意不可复制/构造/反序列化，借用期间不可finish/revoke。新fixture仅由冻结factory创建X60字面/74逻辑与Z524474字面payload，无清理/真实用户文件。

总控先前两次复测失败是环境准备遗漏：X4通过后，Z类型探针的日志父目录缺失；补齐后Z4通过，Y回放日志父目录同样缺失。两次ENOENT及原输出全部保留，没有修改产品/测试；仅补helper正常负责创建的本地目录，按先前受测提交续跑受影响检查，不重跑已绿X/Z。最终[集成结果](w1-xyz-review-20261019/controller/2026-10-19T13-15-13.552Z-28204-integration-check.json)关联两份原失败回执，失败不能当负控。

另11项独立公开边界通过：真实X.exe闲置输入的转义重复键、shutdown多字段、CRLF、BOM、4097字节、残行EOF/正常EOF；Y两实例token不可互用、动作无任意路径、计数倒退后停用命令、重复ready拒绝。均0窗、真实输出/loopback/公开streams；输入和调用方stream所有权保持。[独立结果](w1-xyz-review-20261019/controller/2026-10-19T13-16-46.060Z-18576-independent-result.json)。

## 真正X→Y固定程序与页面

按[事前有界计划](WATER-W1-XYZ-REVIEW-PLAN-20261019.md)，UTC13:15:57–13:16:05，真实Y.launchWorkspace仅启动集成树固定 `.local/next-target/debug/water-scan-host.exe`，1484800字节，SHA256 `7d794baa4727f635a24cf761c9c42bd5a14ea335ba79619ce36eaa8f5ebad935`。同一X进程PID13244、控制runner24292，经真实stdin/stdout→V/S/P/R→Y→W，窗口总数恰3：

| 系统操作 | 页面/实际结果 |
|---|---|
| 选择取消一次 | selection_cancelled，无snapshot/报告链接；可立即再选 |
| 完整确认一次 | 同一宿主再次扫描，8条真实native_scope_metadata/全部保护，W显示实际完整报告 |
| 页面先请求取消再确认一次 | 原生窗口仍由确认结束，实际shared token让V输出confirmed+cancelled快照；保留旧完整报告并生成本次取消报告 |

开始/取消均为真实Chrome系统鼠标点击；跨Origin动作在发出start之前403。完整与取消的真实W附件分别5096和902字节，与本次bundle Q原字符串逐字节一致；没有重算Q、假exe、生产测试模式或回放冒充新X。Unknown和ordinary_content_read=false保持，Z内容证据没有混入旧扫描协议。

[联合回执](w1-xyz-review-20261019/controller/2026-10-19T13-15-57.401Z-30608-joint-result.json)记录两份实际下载、每次窗口PID/title/action、最近两份报告、cancel先于确认及输出状态。原X native final的8次计数进度已审计，联合检查证明真实动作/terminal/下载，不宣称小fixture的中间进度必能被UI轮询逐次捕获。宿主shutdown正常退出0，工作台及本次W端口关闭，未强杀；[收尾进程观察](w1-xyz-review-20261019/controller/process-close.json)无自有X/私有Chrome残留，实际终止进程0。

## 看图、历史与交回

总控通过图像工具逐张实际查看[1440×1000](w1-xyz-review-20261019/controller/2026-10-19T13-15-57.401Z-30608-xyz-workspace-1440x1000.png)、[900×800](w1-xyz-review-20261019/controller/2026-10-19T13-15-57.401Z-30608-xyz-workspace-900x800.png)、[选择取消](w1-xyz-review-20261019/controller/2026-10-19T13-15-57.401Z-30608-xyz-selection-cancelled.png)：主要动作/取消/最近结果可读，窄屏无水平溢出，取消明确未扫描；完成后计数区为当前无活动任务的“—”，报告内真实数值保持。未把PNG存在当视觉通过。

Y原首次模型失败和约105秒收尾/仅停止自有回放PID25472的记录保留；之后正常退出，不追认该失败为负控。三票原证据整理中的CRLF/空白检查与转录/复现边界均保留，不重写原日志。所有产品来自worker提交，没有总控实现修改。

[总控归档](w1-xyz-review-20261019/ARCHIVE.json)含107文件/1307258字节，包含所有新增成功/失败日志、源码、实际截图/附件、提交报告索引；排除binary/cache/profile/fixture payload，原现场留存。[最终审计](w1-xyz-review-20261019/FINAL-AUDIT.json)记录旧任务/槽位及交付字节。三票无需重贴，当前无新READY或未结外贴票。下一步需将Z额外内容同意和新来源侧车接入用户流程，真实用户scope/分类归属/macOS/桌面/M1不从本次模块验收放行。
