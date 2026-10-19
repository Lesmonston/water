# ADR-016：将额外内容同意接入同一次选择

2026-10-19。A–Z及七补单已验收，X→Y真实交互链通过，Z仍只有可信Rust API。下一波AA/AB一起冻结、独立建树并实际baseline后外贴；不启动实现者。

| 线 | 本次可观察结果 | 独占目录 | 已验收前置 | 不依赖在途实现的验收 |
|---|---|---|---|---|
| AA | 持续项目宿主，将同一次S选择的scope留到R及可选Z读取结束 | packages/project-session | X/S/P/R/E/H/Q/Z | 真实P/R/Z无UI API + 新固定程序4窗 |
| AB | 默认不勾选的根清单读取选项、结构证据面板、独立脱敏证据附件 | prototypes/project-workspace | W/Y/Z协议 | 冻结双向回放→HTTP/私有Chrome/真实W及实际下载 |

原X/Y/V/W/Z产品、426约束、原任务/槽位/报告均只读。原V完成就revoke，不能事后按UI给的路径重开scope；AA在自己的工作线程真实调用S并拥有其P登记，整个R/可选Z流程结束或panic才撤销自己。复用X.HostState/NativeJob处理真实任务/token，R负责扫描，Z独占内容读取，不新写reader/FFI或权限表。

AB的显式勾选只表达本次请求，不序列化/构造Z能力。AA只有在真实S确认、同job冻结read_manifest=true且未取消时，才在同一真实P登记上开启短暂permit并调用Z.approve_package_json/read_package_json；不借用上一任务同意、不接受UI路径。默认false不调用Z内容API；选择/扫描取消跳过内容。自然用户手势鉴真仍false。

metadata bundle保持原native-session v1及ordinary_content_read=false，它只描述元数据扫描；额外内容读写意图/来源单列marker sidecar，observed中Z的ordinary_content_read=true原样保留。不更改Q，不把结构解析当项目归属或降低protected。AB导出Z原序列化证据，仅统计/声明，不输出package.json正文/包名/依赖名/脚本/内容hash/路径。

两线无共享产品写入，AB可用冻结回放独立完成；真正AA→AB固定程序整链等收齐后总控验收。仅Windows合成fixture，真实用户scope、生产竞态、macOS、桌面、分类归属/引用、M1未放行。AA全票最多8窗（正常native final4窗，额外4窗只用于有依据失败后的单次完整恢复），AB系统窗0；派前均0窗。负控定向，无变化不重复完整门。
