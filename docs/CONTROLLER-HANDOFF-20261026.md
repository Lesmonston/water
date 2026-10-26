# Water 总控交接报告（2026-10-26）

项目根：`F:/new/smaltalk/water`。本报告按用户“换总控”要求编写，供新总控接手及后续 Keeper ingest；没有写其他项目或共享 Vault，没有启动新执行者、实现任务、产品测试或窗口。

**当前没有待收单、在途主任务或已准备好的新 READY 票。31 张主任务均为 VERIFIED，但验收范围不同：AC仅Windows静态桌面基础，AE仅研究文档，M1尚未完成。下一步是冻结并推进真实报告联合验收及桌面接线，而不是继续重跑AC补单。**

## 1. 接手先看这几项

1. 阅读本报告，再读 [README](../README.md)、[STATUS](STATUS.md)、[PROJECT-CHARTER](PROJECT-CHARTER.md)、[CONTROLLER-WORKFLOW](CONTROLLER-WORKFLOW.md) 和 [AGENTS](../AGENTS.md)。最新用户指令优先。
2. 核对主线与本报告的来源基线。交接前主线为 `main`、`b2e01a68cfd2481520283fb720a2731366798c9e`，工作区干净；交接提交只追加文档、导航和状态快照，不改变产品、冻结锁或派单状态。
3. 阅读 [AC最终验收](acceptance/wave1/controller/WATER-W1-AC-ADDENDUM-06-REVIEW-20261025.md)、[AD/AE验收](acceptance/wave1/controller/WATER-W1-ADAE-REVIEW-20261024.md)、[AA→AB联合验收](acceptance/wave1/controller/WATER-W1-AB-ADDENDUM-01-REVIEW-20261022.md)。这三处决定最近的真实完成范围。
4. 以 [manifest](dispatch/wave1/manifest.json)、[registry](dispatch/registry.json) 和正式验收报告为准。不要根据旧READY文件、旧产品README或旧聊天重启任务。
5. 先为下一波列依赖和文件冲突，完成契约、独立树、实际baseline与测试预算，再一次给齐可并行外贴的独立票。用户转贴后才由原定执行者开始。

只读核对可从以下命令开始；本报告不要求运行产品或旧验收脚本：

```powershell
Set-Location -LiteralPath F:/new/smaltalk/water
git -c core.hooksPath=NUL -c core.fsmonitor=false status --short
git -c core.hooksPath=NUL -c core.fsmonitor=false log -3 --format="%H %s"
Get-Content -LiteralPath docs/CONTROLLER-HANDOFF-20261026.md -Encoding UTF8
```

本次实际元数据/路径/工作树与冻结核查见 [STATE.json](handoff/20261026/STATE.json)。它记录交接文档写入前的SHA和清洁状态，不自引用本次交接提交。

## 2. 用户已经确定的协作方式

- 总控负责架构、规划、契约、正式外贴票、安全复核、独立验收和主线集成；**产品实现及实质修复由用户转贴给外部执行者**。默认不启动本地worker、内部实现子代理或另一个执行者替代用户流程。
- 用户要求推进速度：已满足前置、无文件争写且可独立验收的任务按同一波一次出齐；单票受阻不阻挡无依赖工作。强依赖尚未验收时不能提前伪造READY。
- 用户不负责逐项调试、拼命令、选SHA或解决合并冲突。给用户的派单内容应是一行已存在的绝对工单路径；范围、分支、基线、验证和回执全部写进票面。
- 新总控不需要向用户重复索取已经授权的只读核查、文档/规划或可逆集成权限。真实用户数据动作、签名采购、发布、支付等仍按具体授权处理，不能从立项推出。
- READY不等于已外贴；“完成”通知只进入SUBMITTED。总控核SHA/diff/范围、复验、隔离集成通过后才记VERIFIED。修复或语义调整须编号补单并同步正式材料。

本报告只做交接，没有新发单、没有修改31任务或31槽位对象，也没有把候选后续任务标READY。

## 3. 项目实际完成到哪里

目标是Windows/macOS开发者的本地存储分析与安全清理助手。当前主要是受控只读底座、原生会话、证据/报告与Windows静态桌面基础；不是可发布的完整清理产品。

| 任务 | 已交付入口 | 验收边界/主报告 |
|---|---|---|
| A/B/C/D | `crates/water-contracts`、`packages/tool-catalog`、`prototypes/readonly-dashboard`、`tools/fs-fixture-kit` | 契约、规则数据、虚构只读原型及有界合成工厂；[A](acceptance/wave1/controller/WATER-W1-AD-REVIEW-20261017.md)、[B/C](acceptance/wave1/controller/WATER-W1-BC-ADDENDUM-01-REVIEW-20261017.md)、[D](acceptance/wave1/controller/WATER-W1-D-ADDENDUM-01-REVIEW-20261017.md) |
| E/F/G/H/I | `packages/report-view`、`fixture-scan`、`scan-report`、`summary-export`，`prototypes/report-reader` | 合成元数据→保守报告/投影/汇总，模型联测通过；[F](acceptance/wave1/controller/WATER-W1-F-REVIEW-20261017.md)、[G/H](acceptance/wave1/controller/WATER-W1-GH-REVIEW-20261018.md)、[I](acceptance/wave1/controller/WATER-W1-I-REVIEW-20261017.md) |
| J/K | `packages/lab-session`、`prototypes/lab-reader` | 受控会话及实际J→K报告页面；[J](acceptance/wave1/controller/WATER-W1-J-REVIEW-20261018.md)、[K补单](acceptance/wave1/controller/WATER-W1-K-ADDENDUM-01-REVIEW-20261018.md) |
| L/M/N/O | `packages/project-evidence`、`size-ledger`、`native-root`，`prototypes/evidence-reader` | 文件名候选、逻辑长度/身份观察与页面；[L/M](acceptance/wave1/controller/WATER-W1-LM-REVIEW-20261018.md)、[N/O](acceptance/wave1/controller/WATER-W1-NO-REVIEW-20261018.md) |
| P/Q/R/S/T/U | `packages/scope-registry`、`redacted-report`、`native-scan`、`native-picker`、`node-manifest`，`prototypes/scan-review` | Windows许可绑定的受控扫描/选择、默认脱敏、内存清单结构和下载；[P/Q](acceptance/wave1/controller/WATER-W1-PQ-REVIEW-20261018.md)、[R补单](acceptance/wave1/controller/WATER-W1-R-ADDENDUM-01-REVIEW-20261019.md)、[S](acceptance/wave1/controller/WATER-W1-S-REVIEW-20261019.md)、[R/T/U](acceptance/wave1/controller/WATER-W1-RTU-REVIEW-20261019.md) |
| V/W/X/Y/Z | `packages/native-session`、`scan-host`、`root-marker`，`prototypes/native-review`、`live-workspace` | 原生宿主、真实合作取消、工作台与显式额外同意的固定根清单读取；[V→W](acceptance/wave1/controller/WATER-W1-W-ADDENDUM-01-REVIEW-20261019.md)、[X/Y/Z](acceptance/wave1/controller/WATER-W1-XYZ-REVIEW-20261019.md) |
| AA/AB | `packages/project-session`、`prototypes/project-workspace` | 同次原生选择、可选内容同意、结构证据、取消、Q/Z独立附件，Windows受控真实联合验收通过；[最终验收](acceptance/wave1/controller/WATER-W1-AB-ADDENDUM-01-REVIEW-20261022.md) |
| AC/补单06 | `apps/desktop-preview` | Windows静态无权限Tauri壳，真实UIA/正常退出通过，**未接扫描、AA/AB/AD或IPC**；[最终验收](acceptance/wave1/controller/WATER-W1-AC-ADDENDUM-06-REVIEW-20261025.md) |
| AD | `prototypes/project-workspace`中的同源项目报告及附件路由 | 真实生产流消费者、内存/HTTP/浏览器回放及原字节下载通过；**未做新的真实AA→AD选择整链**；[验收](acceptance/wave1/controller/WATER-W1-ADAE-REVIEW-20261024.md) |
| AE | `docs/research/macos-port-20261023` | 来源、七组件差异与未来实机计划，**只有文档研究验收，没有Mac实现/编译/实机**；[验收](acceptance/wave1/controller/WATER-W1-ADAE-REVIEW-20261024.md) |

单个模块VERIFIED不代表完整用户闭环。普通文件内容仍默认不读；Z/AA的额外清单读取是专门冻结的窄能力，不能推广成任意正文读取权限。观察逻辑长度不等于可回收空间，身份/项目候选也不等于删除许可。

## 4. 最近三组关键提交与证据

| 项 | 精确提交 |
|---|---|
| 交接前最新主线/验收记录提交 | `b2e01a68cfd2481520283fb720a2731366798c9e` |
| AC接收 | `29a895d7efa7f4a547d23ff74eb92729740d289d` |
| AC产品实现 | `eb7f80178191e233068015bbc26dc9798ac8cb22` |
| AC06真实native受测干净HEAD | `8a3b475918684a18be318415a9f7a54470c916b8` |
| AC旧final check/test受测HEAD | `82d04aaeef73030f65bc0a070b99a5517fd5d6a3` |
| AC总控无UI受测及产品集成 | `b4178355bbb135ca689fa3924ea267e313184941` |
| AD接收/实现 | `753c8018fd7e8effd423db86495079fdc8cd0d08` / `3ad5e7003d9e9720e85113a47d558738bf06231d` |
| AE接收/研究实现 | `07ae41c18459dd2450622944466c20a80856e456` / `3182286f8c2df25ed940f8f0dc8a71507bb24a4e` |
| AD/AE隔离受测及集成 | `5b4d77c3fff3717ac60277fe67e04444477cea77` |

**AC已经收口，不要再处理成下载受阻单。** 依赖由用户授权的中科大镜像准备，现有私有cache/锁保留；用户明确禁止修改其网络配置。最早官方registry/代理故障、后续Clippy转发、PowerShell编码及严格Count失败都已留档，不是现在待解决的阻塞。

AC06原始native证据位于 [native-result.json](acceptance/wave1/ac/addendum-06/raw/2026-10-25T06-21-48.141Z-42780-native-result.json) 与 [UIA明细](acceptance/wave1/ac/addendum-06/raw/2026-10-25T06-21-48.141Z-42780-uia.txt)。真实结果：两次rawRootCount=2、applicationWindowCount=1、固定Tao目标=1、未知/无效=0；同一主PID/HWND/RuntimeId，四文案命中，主进程exit0、私有profile及冻结childClose成功，5510ms，无强制终止。

Count2来自Tauri主窗和锁定tao0.37.2的`Tao Thread Event Target` Pane。06已**明确修订计数语义**并绑定发布包/源码SHA及完整属性；不是泛化忽略Pane/offscreen/handle0，更不是把原始2改写为1。依据见 [window SPEC](../contracts/desktop-bootstrap-window-v1/SPEC.md)、[FRAMEWORK](../contracts/desktop-bootstrap-window-v1/FRAMEWORK.json)。该包声明Git dirty=true，不能把其Git SHA称作精确发布树；UIA也不是像素可见性验证。

AC的03–06共4次worker窗口allocation全部用完，总控0新窗口。旧03–05失败及AC01–05历史BLOCKED保持，**不需要返工、补单07或重跑旧native/resume入口**。后续若确有新的窗口检查需求，先冻结新任务及独立预算，不挪用已用配额。

AC产品14文件未改，worker归档46/189/88/51/51/54共479项、16,293,091字节；[索引/汇总](acceptance/wave1/controller/w1-ac-accepted-20261025/FINAL-AUDIT.json)。总控另172项、5,906,514字节 [归档](acceptance/wave1/controller/w1-ac-accepted-20261025/ARCHIVE.json)。独立Rustc库编译/原三测、137配置拒绝、73导航拒绝、26正向、真实快照复算与5根变体/四文案缺失均实际完成。总控没有在集成路径重新运行Tauri，不能将这些说成新的native或Cargo final。

AD的五单元/三浏览器、8次实际Q/Z下载和两条生产负控/恢复通过；AE只文档通过。它们共491份worker证据。AA→AB受控联合验收与AD后续回放分别是不同证据，**不能拼接成一次未执行的真实AA→AD整链**。

## 5. 现场、冻结与工具注意事项

本次交接只读实查：31个worker树全部干净；AC和AD/AE关键集成树也干净。Git登记共57个工作树，包含保留的历史验收树，不代表57个在途任务。命令行明确带项目绝对路径的常见产品/构建/测试进程匹配为0，手动终止0；查询范围和时间见STATE，不将其说成全系统进程鉴定。

| 保留树 | 当前HEAD/分支 |
|---|---|
| `.worktrees/ac` | `29a895d7efa7f4a547d23ff74eb92729740d289d` / `worker/water-w1-ac` |
| `.worktrees/integration-ac-20261025` | `b4178355bbb135ca689fa3924ea267e313184941` / `controller/water-w1-ac-integration-20261025`；稀疏检出 |
| `.worktrees/ad` | `753c8018fd7e8effd423db86495079fdc8cd0d08` / `worker/water-w1-ad` |
| `.worktrees/ae` | `07ae41c18459dd2450622944466c20a80856e456` / `worker/water-w1-ae` |
| `.worktrees/integration-adae-20261024` | `5b4d77c3fff3717ac60277fe67e04444477cea77` / `controller/water-w1-adae-integration-20261024` |

早期manifest的submittedCommit不全等于后来的补单HEAD：A当前`5e32f51`、B`5b88fd0`、C`d8cc697`、D`711c38c`均在补单/补单证据提交，工作树干净；相应早期回执字段仍保留原提交。已只读核最近提交标题，完整SHA在STATE。不要为“对齐台账”reset这些树、覆盖证据或重新实现。

最新冻结为 [desktop-bootstrap-acceptance-v1/freeze.lock.json](../contracts/desktop-bootstrap-acceptance-v1/freeze.lock.json)，**547唯一约束、25继承锁**，本次再次只读核对通过。锁SHA为`b1399ef0cc8407bb201dbedc1094e4edf78457f8da643863b0f863e5f695e345`。新控制工具只能追加新版本/新锁，不能静默编辑旧冻结文件。AC验收时的索引恢复、回放v2等修正另有执行前源SHA和原始失败记录，不冒称这些都在547内或原失败已经通过。

操作上保留以下约束：

- `.worktrees/`、`.local/`、fixture、cache、target、tmp、profile、reservation和历史日志全部保留；不执行clean、hard reset、批量删除或重新派发已用槽位。稀疏验收树不要随手扩展为全树检出。
- AA排除的native截图/像素不得读取、复制或看图。`.png`存在不构成查看许可；旧归档与当前产品比较时注意历史快照，不把授权演进误判为损坏。
- PS1工作文件通常CRLF、Git blob通常LF；原始`.ps1.txt`/日志按局部`.gitattributes -text`保存物理字节。原始日志空白检查exit2不等于产品失败，不清洗成绿。
- PowerShell5可能把含中文的脚本经管道传Node时转成ASCII。含中文的Node脚本直接以文件执行；不要靠系统编码、代理或证书配置变更解决。
- Node24、Rust1.95/jobs1、每票私有home/target/tmp是既有冻结环境；Tauri/serde exact依赖及Windows许可证/镜像信任边界见AC证据。交接没有重新安装、升级或下载。不得修改系统代理/网络/DNS/证书或全局/持久Cargo配置。
- 多个旧helper硬编码原树、精确HEAD、reservation和原阶段状态，只是历史复现材料。不要把“换总控”当成重跑baseline/check/native/finalize脚本的理由；已经通过且源码未变的窗口/测试复用证据。

## 6. 尚未完成的范围

| 范围 | 当前实际状态 |
|---|---|
| 真实AA→AD原生选择→同源报告→附件 | AD已回放验收，新的系统整链尚未执行；需另冻结fixture、驱动、观察器、窗口预算 |
| Tauri桌面→AA/AD扫描与报告 | AC静态前置已解除；页面、跨进程入口/权限、取消/生命周期和文件归属尚未冻结/实现 |
| 真实用户scope与自然同意鉴真 | 受控fixture与显式布尔选择不等于真实用户权限/手势证明，需具体范围与专门契约 |
| 生产竞态与文件系统全面安全 | 现有句柄/身份/拒绝机制只覆盖验收边界，不声称完全解决恶意并发替换、同长度改写等 |
| macOS产品、SDK/两架构实机 | AE只有研究；实际机器、环境与正式实现票未落实。读 [GAP-MATRIX](research/macos-port-20261023/GAP-MATRIX.json)、[DESIGN](research/macos-port-20261023/DESIGN.md)、[ACCEPTANCE-PLAN](research/macos-port-20261023/ACCEPTANCE-PLAN.md) |
| W2/W3真实工具发现与模型inventory | 规则数据和受控核心不等于本机pip/uv/npm/pnpm/HF/Ollama/LM Studio生产支持，需各自版本/许可/范围验证 |
| M1完整只读Alpha | Windows桌面实际用户闭环与macOS等未完成，不能因31票VERIFIED宣称里程碑完成 |
| M2执行器、删除/回收、M3签名发布、M4收费 | 没有本轮授权或完成证据；真实删除需独立工单、测试与验收，产品许可证/品牌/发布决定仍由用户保留 |

默认保护未知对象、独有数据、凭证、源码、会话/记忆、恢复点、数据库及训练成果；不按目录名/年龄/后缀判可删。不运行上游install/build/clean、git hooks、submodule或额外依赖来做静态研究；不改共享Vault。扫描/计划/执行/结果核验分开，WebView/LLM不接受任意路径或shell。重下载不是可回滚，回收站也不等于释放空间。

## 7. 建议新总控的推进顺序（候选，尚未READY）

1. **先准备真实AA→AD联合验收。** 已有AA/AB/AD实现和受控样本，可复用公开入口；先明确实际选择驱动、同次内容选择、晚取消/partial保留、同源路由与原字节Q/Z附件的观察方式。只写控制验收材料，不顺手改产品。新fixture/窗口需具体冻结预算，不能运行现有耗尽的AA/AC native门来“试一下”。
2. **可并行做桌面接线的契约设计。** 阅读 [ADR-017](decisions/ADR-017-desktop-report-and-macos-readiness.md) 及当前 [后续推进表](dispatch/wave1/AFTER-AC-NATIVE-PLAN-20261024.md)。冻结可信宿主的唯一入口、scope/job/内容同意绑定、流/错误/取消/shutdown生命周期、页面来源/CSP/导航/IPC以及产品文件所有权。AC当前禁JS/IPC不能直接当作已有交互工作台能力；涉及权限变化须明确新断言及理由。
3. 契约稳定后，把后端/页面/平台工作按真实依赖和文件冲突切成可独立验收的外贴票。AB与AD共用`prototypes/project-workspace`，AC在`apps/desktop-preview`；先划清改动归属，不能两票并发覆盖同一文件。尚未实现的运行集成等必要前置验收后再发，不为并行拆出不可验收碎片。
4. macOS环境未具备时只推进不依赖实机的设计/来源整理；不要把AE研究拆成伪READY实现单，或让用户现在提供凭证。真实scope、生产竞态及清理执行后排，并保持单独授权边界。

当前没有AF及以后正式可执行票；以上是接手建议，不是已经派出或正在执行的任务。用户要求同波一次安排所有真正独立项，但也要求前置、路径、基线、检查清单先落地。

## 8. 容易误读的历史材料

- [CONTROLLER-HANDOFF-20261017.md](CONTROLLER-HANDOFF-20261017.md)曾被多轮追加，开头还停在W返修阶段；它仅供历史追溯，本报告替代其当前交接入口。
- [ARCHITECTURE](ARCHITECTURE.md)、[ROADMAP](ROADMAP.md)的一些状态行仍写AC/AD/AE READY；那是派前历史，最新正式验收与manifest优先。技术设计仍可读，勿用旧状态重新派发。
- `apps/desktop-preview/README.md`仍有补单02入口和“唯一一次native”等原阶段说明；不是现在可执行指令。最新06验收已收口，四次allocation用完。
- [PLAN](dispatch/wave1/PLAN.md)、STATUS、dispatch README含多轮历史READY/CHANGES_REQUESTED；只看顶部当前状态会更快，再按需追溯。历史AC01–05 BLOCKED不是当前31主任务存在阻塞。
- 本次没有重验所有历史产品、完整归档或重新运行全部测试。STATE新核的是台账、工作树、547冻结及限定进程；各产品原测试结论依正式验收及原始证据。

## 9. 本次交接的写入与交回

只写本报告、机器可读STATE/文档校验记录及README/STATUS/AGENTS/旧交接入口导航；31任务、槽位、产品、根Cargo、契约冻结、原归档和工作树均未修改。本轮新增窗口/下载/后台任务/产品测试均0，未清理任何现场。

交接文档提交后以`git log -1`定位最终交接SHA；来源基线、全部worker HEAD与关键集成HEAD已在STATE冻结记录。新总控若接手后有新的产品/控制变更，应从当前主线重新选定并记录新票基线，不借用本报告的旧SHA冒充已测结果。

给新总控的一行接手指令：

```text
请读取 F:/new/smaltalk/water/docs/CONTROLLER-HANDOFF-20261026.md，接任 Water 项目总控；先核对当前主线及台账，再按报告中的候选顺序准备下一波，保留原验收与安全边界。
```
