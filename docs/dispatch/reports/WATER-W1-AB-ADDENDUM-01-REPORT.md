WATER-W1-AB 补充单01 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/ab/docs/dispatch/reports/WATER-W1-AB-ADDENDUM-01-REPORT.md

状态：**SUBMITTED，待总控独立验收**。已修复消费者丢弃“元数据完成或部分完成、内容前取消”的问题；本回执不宣称 VERIFIED、真实 AA→AB 联合链或 M1 通过。没有合主线、push 或修改台账。

执行者为原 AB 对话中的 Codex；本会话声明模型 GPT-6，具体运行变体及采样参数未暴露。Windows x64、Node v24.16.0，无子代理、无新依赖或环境配置变更。所有产品修改均在原树 `F:/new/smaltalk/water/.worktrees/ab`、分支 `worker/water-w1-ab`。

| 定位 | 实际值 |
|---|---|
| 权威补单 | `F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W1-AB-ADDENDUM-01-20261022.md` |
| 首次续做精确干净 HEAD | `7b5bdec2fd1af1bf988443d22eb91f504e5bba55` |
| 原受测实现 / 共同基线 | `fa71a82696f123fd33c3514d99ef0b5c681c5780` / `f3b87b7a79ff8fa51882705ecef75f1f02d8af15`，均保持祖先关系 |
| 补单实现及三道 final 受测 SHA | `95fee90ff52b61b2b2891359451d2bc5262b9af3` |
| 实现提交范围 | 恰 model.mjs、app.mjs、原 model.test.mjs、browser.test.mjs 四文件，136 行新增、4 行替换；原五个顶层及原断言保留 |
| 稳定 productionHash | `dcbb0bec55581f110c3faff0035ec148fa370b74c6e6dbdc4e487988ec7ca21c` |
| 稳定 testHash | `8bc3eef763f34b55f4e389435491ca12d235ca11ef7b00356d9d7f55d27813e8` |
| 新报告提交定位 | `git log -1 --format=%H -- docs/dispatch/reports/WATER-W1-AB-ADDENDUM-01-REPORT.md`；在实现后独立提交，仅含本报告及 addendum-01 证据 |
| 新归档 | [ARCHIVE.json](../../acceptance/wave1/ab/addendum-01/ARCHIVE.json)：1046 份原文件、5,366,980 字节，每项 source/archive/bytes/SHA-256 |

主检出补单、SPEC/CASES/锁、正式原票、原报告、最新接手文档及总控收单报告均已读取；新 wrapper 只从主检出绝对路径执行，未复制或合入任何控制提交。没有运行要求产品不存在的原 baseline。resume 在精确干净 7b5bdec 上通过，观察到 completed/partial × assertMarker/WorkspaceState/公开 streams→HTTP 共六次合法结果被拒绝；该通过仅表示已知回归复现。

| 补单要求 | 实现与验证 |
|---|---|
| 只接收合法 late 内容取消 | model 在既有默认 false 和选择/扫描取消校验之后，新增精确分支：confirmed、metadata completed/partial、marker 恰 skipped/scan_cancelled/null。false 仍只接受 not_requested，选择取消仍要求 selection_cancelled，真扫描取消行为不变。 |
| 同 job / 同意绑定不变 | 沿用原 WorkspaceState 的 job、accepted/result read_manifest 和 W bundle 校验；补充错误 job、选择值、错误 code、额外字段、非 null 证据的拒绝。默认 false+observed 和 late skipped、选择取消错误 code 均通过原/新负例验证。 |
| 保留真实元数据和 Q | 新模型测试走直接 assertMarker、WorkspaceState、公开 startFromStreams→实际 HTTP。completed/partial 的完整 bundle、status、summary、totals 及 Q 原字符串逐值/逐字节保持，真实旧 W 服务继续提供报告；active 清空、连接 ready、下一任务默认 false。未改 AA、R 或旧协议。 |
| 无额外内容证据 | 当前 late 任务 evidence_url=null；GET/HEAD 证据路由 404，无 observed/正文/附件。下一次默认 false 任务也只有 not_requested。旧 observed 附件及淘汰生命周期断言保留。 |
| 界面区分两阶段 | app 对 late completed/partial 显示“已取消内容读取 · 未读取清单”，主状态仍为“扫描完成”或“保留部分结果”；报告链接保留。选择取消和真扫描取消原文字不变。 |
| 原有行为保持 | 原七正例、原所有测试断言、HTTP 授权、UTF-8/行/字段/上限、Z/U 完整校验、原 Q/Z 附件、取消和资源归属测试完整执行。测试仍恰三个模型顶层、两个浏览器顶层，无删断言/skip/filter/增加计数。 |
| 浏览器真实接线 | 保留原冻结双向回放测试；追加冻结 late 内存事件到真实 AB HTTP/旧 W。实际鼠标 checkbox/start/下载，完成和部分完成各在两尺寸核状态/报告/无证据，并分别保存 Q 原字节；下一任务默认 false。 |
| 范围与权限 | 只四份永久产品/测试修改、新报告与本补证据。server 仅 nc1 临时修改后原字节恢复，无永久 diff。原报告、README、原 ARCHIVE/411 归档、旧产品/helper/锁/输入/根 Cargo/其它树均未改。系统原生窗 0，未构建或执行 AA、S，未访问或创建物理 fixture。 |

以下命令均从原 AB 树串行执行，前缀为 `node F:/new/smaltalk/water/scripts/project-workspace-addendum-check.mjs --task WATER-W1-AB --mode`。冻结 wrapper 每子命令 180 秒，旧 helper 原样委托；下表所有 wrapper 退出 0。红门的实际 probe 或测试子进程退出 1，为目标行为红。每条实际 argv、stdout/stderr、退出码和源码快照均在归档。

| UTC（2026-10-22） | mode | 结果 | wrapper receipt（raw/.local/checks/WATER-W1-AB-ADDENDUM-01/） |
|---|---|---|---|
| 07:58:12 | resume | 精确 clean HEAD，原 7 正例/3 对照保持，已知 6 次拒绝复现 | `2026-10-22T07-58-12.190Z-27664-resume-result.json` |
| 07:58:29 | red-late-cancel | 修改前同一回归六红，AB_LATE_CANCELLED_CONTENT | `2026-10-22T07-58-29.323Z-33392-red-late-cancel-result.json` |
| 08:01:19 | test | 完整三测 3/3 + 六入口 probe 绿 | `2026-10-22T08-01-19.101Z-17000-test-result.json` |
| 08:01:51 | browser | 完整两测 2/2 + probe 绿 | `2026-10-22T08-01-51.942Z-21596-browser-result.json` |
| 08:02:40 | red-late-cancel | 稳定字节撤去新增接收分支，真实六红 | `2026-10-22T08-02-40.307Z-31568-red-late-cancel-result.json` |
| 08:02:58 | test | 立即恢复后完整三测 + 六入口 probe 绿 | `2026-10-22T08-02-58.119Z-2880-test-result.json` |
| 08:03:56 | red-nc1 | 完整三测 2 过/1 红，AB_ACTION_AUTH | `2026-10-22T08-03-56.507Z-28200-red-nc1-result.json` |
| 08:04:28 | test | 立即恢复后完整三测 + 六入口 probe 绿 | `2026-10-22T08-04-28.479Z-25080-test-result.json` |
| 08:05:05 | red-nc2 | 完整三测 2 过/1 红，AB_CONSENT_BINDING | `2026-10-22T08-05-05.826Z-33568-red-nc2-result.json` |
| 08:05:27 | test | 立即恢复后完整三测 + 六入口 probe 绿 | `2026-10-22T08-05-27.193Z-3788-test-result.json` |
| 08:06:50 | check --final | 干净 95fee90；七 MJS 语法、原证明链、新 late 证明、probe 通过 | `2026-10-22T08-06-50.187Z-2852-check-result.json` |
| 08:07:15 | test --final | 同一干净 SHA；完整三测及 probe 通过 | `2026-10-22T08-07-15.398Z-22432-test-result.json` |
| 08:07:48 | browser --final | 同一干净 SHA；完整两测及 probe 通过，约 10.8 秒浏览器测试 | `2026-10-22T08-07-48.582Z-29560-browser-result.json` |

每道 final 只运行一次。修复后按补单先 test/browser，再稳定负控及立即恢复，最后提交干净实现运行三 final；没有机械重跑其余浏览器门或重造原骨架。原 AB_BEHAVIOR 历史证明保留；修改前 late 红沿用原 testHash，稳定 late/nc1/nc2 均绑定上述新 testHash。旧 proofAudit 没有替换或放宽，新 late 证明独立追加。

三条负控均真正改变生产路径，恢复使用工具保存的完整原字节，核对 SHA 后才跑完整 test/probe，再进行下一条：

| 负控 | 真实观察 | 好态 / 坏态 SHA-256 | 原字节恢复 UTC |
|---|---|---|---|
| late | 去掉新增接收分支，模型/状态/streams HTTP 对两种合法结果共六次拒绝；未改输入/测试/probe | model 好 `8fa7f9661cace122bcfd6cdf6e115774732687c0c9c6b75b8cd442f6c6d99d31`；坏 `9c7009f01926ae2f8f0017418e9be2f9c8437998654c7659373b0c3565bdf22e` | 08:02:47.978 |
| nc1 | 真实 HTTP Origin 拒绝被移除，跨 origin 有效请求实际向 pipe 写出 1 条命令，预期 0 | server 好 `e14c6997d0c0f035aa098912bd6a0b6af07e08e1f2dca1a5c1ab0c910d33e4c6`；坏 `53fb4ded41ba68264c5dbe8dd9cce2ea7f373cbb71703eae85fc531ecb08c93f` | 08:04:11.771 |
| nc2 | 同意绑定放过 false+observed，实际证据路由返回 200，预期 404 | model 好同上；坏 `bcca83624388e706f80b9ebe45b0f96ebb0edc5d27c457249705fbf0ed71a9ba` | 08:05:14.900 |

对应 `*-late-restored.json`、`*-nc1-restored.json`、`*-nc2-restored.json`、保存的好态 txt、坏态 source 快照和每次恢复 test/probe 归档齐全。负控未运行 Chrome/native，没有编译、缺文件、超时、CDP 或错误文字造红。全部产品门均按预期通过，没有额外的修复后产品失败。一个只读 CASES 摘要脚本最初误用 `cases` 而非 `accept`，TypeError 后改正，未触碰产品且不计行为红；大批文档工具输出截断后按较小范围重读。首次收尾记录按 CreationTimeUtc 筛回放未取得条目，已按实际 TAP 日志中的精确路径更正。这些操作问题记录在 [EXECUTION-NOTES](../../acceptance/wave1/ab/addendum-01/raw/.local/checks/WATER-W1-AB-ADDENDUM-01/EXECUTION-NOTES.json)。

final 浏览器实际保存六份附件，均通过系统鼠标事件点击链接后检查文件名及原字节；其中 late 两份为本补新增要求。对应原文件及 receipt 都在新归档 `raw/.local/browser-lab/project-workspace-download-*/`，fetch 仅用来检查状态/HTTP 拒绝，没有冒充下载。

| final 附件 | 字节 | SHA-256 |
|---|---|---|
| 默认 Q / observed 后独立 W/Q / late completed Q（各一份） | 各 1387 | `688326559e719a0d9099dca6a580d94aaef518d40a4c54872a2b5c7f6ad58550` |
| 原 Z 结构附件 | 844 | `3d5ab3ad3916ad49dfe1621ff4e7bbc99dc4103b2ab052884f5571c0bb9b9350` |
| 真扫描取消 Q | 902 | `e08ba3bc1e83afc94c7dd5d48e6c31c34e7a1b4f5a662c2b5225106b93ac5c57` |
| late partial Q（同步 status/summary/Q 的明确内存变体） | 1385 | `2dd932a5178613af2113ba02dee4393c620b869c825e715f99927e5f0d9bef60` |

已用 view_image 实际查看本次 final 五张图：[原宽屏](../../acceptance/wave1/ab/addendum-01/raw/.local/browser-lab/project-workspace-1440x1000.png)、[原窄屏](../../acceptance/wave1/ab/addendum-01/raw/.local/browser-lab/project-workspace-900x800.png)、[选择取消](../../acceptance/wave1/ab/addendum-01/raw/.local/browser-lab/project-workspace-cancel.png)、[late completed](../../acceptance/wave1/ab/addendum-01/raw/.local/browser-lab/project-workspace-late-completed-1440x1000.png)、[late partial](../../acceptance/wave1/ab/addendum-01/raw/.local/browser-lab/project-workspace-late-partial-900x800.png)。标准两尺寸无横向溢出；选择取消明确未开始扫描。新增宽屏完成和窄屏部分结果图同时可见真实状态、内容取消说明、报告链接，且没有结构面板/附件。窄屏 late 图为滚动到报告后的视口，不冒充整页图；原标准图的结构面板仍会在首屏以下延伸。两种 late 场景都实际核过两种尺寸。

本次系统原生窗口 **0**。开发验证和 final 各一个私有 headless Chrome，依次运行、最多同时一个；final profile `.local/browser-lab/profile-U3SqwQ` 保留原位，未用用户 profile。10 个本补新回放进程均实际记录 code=0/signal=null，final 回放 PID 27208/21960；[PROCESS-CLOSE](../../acceptance/wave1/ab/addendum-01/raw/.local/checks/WATER-W1-AB-ADDENDUM-01/PROCESS-CLOSE.json) 的 checkedAtUtc 记录实际观察时间，未见本树命令行或已知自有 PID 残留，实际手动终止 0。冻结浏览器 helper 的 close 已返回，未另记录其兜底 child.kill 分支，故不声称它从未触发。没有 cleanup，profile、下载、原现场均保留。

原提交与空白检查的补充澄清：原 `STAGING-AUDIT.json` 实际记录显式暂存 412 路径、412 个索引 blob 与源字节一致，`git diff --cached --check` 的 **Git 子进程退出 2**，手写原报告定向检查退出 0。原始 Node TAP 日志含断言空白/末尾空行，PowerShell PROCESS-AUDIT 含 CRLF，按原字节证据要求保留；原审计脚本曾把非零码误断言成必须 1，后按实际 2 更正。原报告末尾问号乱码不作为完整可读说明，本段是新回执的补充澄清，**不改写原报告或任何原证据**。原归档的权威实际总数为 411 文件/1,902,891 字节，已全部逐项核原 archive 哈希保持；原报告表格较早的 410 数字也保持原样，不以旧文字替代实际索引。

主检出新六条目、17 继承锁合计 485 唯一约束及旧 479 在 wrapper 各次前后审计保持。原报告 SHA `e86b3e80b4afefe25ebe6d30910d0080c187baeb3fabc01d48434b8d0eed433c`、原 ARCHIVE SHA `e8755a96f7bef7fda2abfdfd98b274fae3246f2d2a2a020d715f59faf15ac8b9` 未变。新 [RUN-INVENTORY](../../acceptance/wave1/ab/addendum-01/raw/.local/checks/WATER-W1-AB-ADDENDUM-01/RUN-INVENTORY.json) 绑定命令、源路径、10 个退出及受保护原件核对；新归档排除 profile/cache/binary/payload，原 ARCHIVE 不更新。暂存按逐一列出的文件路径、日志显式 `-f`，不使用全树 add/reset/clean。

提交前 [DOCUMENT-AUDIT](../../acceptance/wave1/ab/addendum-01/raw/.local/checks/WATER-W1-AB-ADDENDUM-01/DOCUMENT-AUDIT.json) 核对新归档与源字节、全部原 411 归档哈希、永久四文件范围、产品无未提交更改、同一 SHA 三 final/哈希，以及报告链接和 UTF-8 文字可读。产品补单 diff 和暂存后手写报告的定向空白检查均退出 0；1048 条明确列出的报告/证据路径全部核对 Git 索引与工作区原字节相同，没有暂存产品更改，原始日志保持原字节。

冻结 completed 输入来自总控真实 AA.capture_registered 的末条 observer 取消捕获；dialog envelope 是合成内存适配。partial 是明确同步修改 status/summary/Q 的内存变体。本执行者仅消费冻结 JSON 和原双向回放，**没有运行新 AA/S 或读取物理 fixture**。真实 AA 固定程序→AB 联合链、自然内容同意鉴真、真实用户 scope、生产竞态、macOS、桌面/打包及 M1 仍待总控后续验收。报告和证据提交后停改停测。
