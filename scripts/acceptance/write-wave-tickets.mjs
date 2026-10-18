// Controller ticket writer; concrete paths/SHA from authoritative manifest.
import {readFileSync,writeFileSync} from 'node:fs';
const root='F:/new/smaltalk/water',manifest=JSON.parse(readFileSync('docs/dispatch/wave1/manifest.json','utf8'));
for(const id of ['WATER-W1-S','WATER-W1-T','WATER-W1-U']){const t=manifest.tasks.find(t=>t.id===id),lane=id.slice(-1),slot=t.slot,tests=[...t.expectedTests,...t.expectedBrowserTests];const extra=lane==='S'?`
实现必须是真实 IFileOpenDialog 的 Show/GetResult，不把初始目录当所选结果。先纯词法/真实N初始目录检查，STA/COM/CoTaskMemFree全路径RAII；取消无登记，成功使用所选实际路径真实P.prepare/confirm，确认失败decline本次pending。没有R扫描、HTTP/IPC或任意路径SelectedScope构造器。

五测试职责依次：纯构造/错误和初始非法/junction无弹窗；实际取消无槽占用；实际选择返回scope_id/root身份；实际full/duplicate失败无额外槽泄漏；公开SelectedScope到P.begin/check/finish/revoke链。GUI用本票固定index（WATER_PICKER_INDEX），stderr逐窗口标记 WATER_PICKER_CASE cancel/select，冻结driver只点击当前测试PID固定title按钮，真实root来源不得硬编码expected。baseline控制工具本身不是产品实现。

初次行为红也必须走实际模态交互的可运行骨架，不能因无窗口/无marker/驱动失败造红；全部suite至少包含真实cancel和select动作。S三负控按SPEC分别改坏真实取消映射、scope ID传递、返回前错误撤销。unsafe仅native_windows.rs并逐处SAFETY，其余模块禁止unsafe。只有冻结prepare可建本树4空目录/1junction，普通内容0字节，无清理。实际模态窗口短暂可见为本票验证所需，不浏览真实用户目录。
`:lane==='T'?`
冻结bundle含24份实际A/E/H/Q输出并已过真实I：11份H合成输入仅scan_id改为唯一review-h-N，13份保留J捕获不改source ID；每份Q仍逐值等于原golden。来源与哈希见 contracts/scan-review-v1/PROVENANCE.json；不读取J/R物理fixture、不重新扫描。生产仅caller内存bundle，不能加载此文件兜底或按case/ID返回golden。

零npm，沿用I/K/O已有样式与安全做法，只复用真实I公开模型；不改旧模块。模型三测覆盖全部24份、输入不变、额外Q键/错误alias/计数/Unknown拒绝、当前snapshot选择及原Q文本精确返回；浏览器两测覆盖两份不同caller bundle（含重命名ID）、实际startServer/HTTP/Chrome/点击下载及启动后caller突变隔离，双尺寸、完整u64、HTML字面、键盘dialog/Escape/焦点返回、所有快照和过滤不改变完整导出。

导出按钮固定“下载脱敏报告”，显式点击下载整份当前Q原字节，不下载view/summary/raw。严格固定/exports/序号路由、attachment文件名与精确UTF-8长度，HEAD/Host/遍历/编码/query/CSP测试。新私有下载目录只在本树.local/browser-lab，通过实际磁盘下载文件核bytes和无原ID/路径/证据canary，不能用fetch冒充点击下载。使用冻结browser-lab和Page.setDownloadBehavior即可，baseline已有实际能力证明。

浏览器测试在断言失败时仍完成其余独立用例并保存三张当前截图（1440x1000、900x800、export），使有效行为红保留完整五测和可检视证据；基础设施/语法/下载超时不能算有效红。实看截图核内容再报告，不因存在png就宣称验收。完整Q预览必须同步当前snapshot；Unknown仍未知，来源总量不可按过滤重算。不引入原始导出、上传、扫描、目录选择或删除入口。
`:`
只提供 analyze_package_json(raw)/to_json 私有有效证据。生产不读磁盘/环境/时钟/配置、无unsafe/进程/网络/脚本执行；本票完全不获取真实package.json。固定输出只含结构标记/声明计数，无名称/版本/依赖/range/scripts/workspace原文、hash或路径；project_membership_verified/tool_version_known保持false、risk protected、display_only，格式有效不提升分类。

五测试职责依次：11完整golden/九字段结构及顺序不变；19原raw错误（含unknown深层/数组/转义重复和语法优先）；动态depth32/33、256KiB边界、每个条目和Unicode字符/字段上限；canary改名/未知元数据变化的相同输出和纯内存边界；真实公开入口/Serialize与to_json一致及严格wire。测试额外动态边界全部在内存生成，不能读项目其它清单或执行scripts。重复键必须在原raw每层检查，不能先Value丢信息；语法坏优先InvalidJson，已知null不是缺失。

先写完整测试和可编译骨架留 U_BEHAVIOR 红，再实现。三负控分别改坏未知metadata重复键检查、真实归属输出标记、真实输出白名单（泄漏输入名称/脚本文本），每次完整五测红后原字节恢复五绿。SPEC中的限值和错误不自行折中，遇到语义冲突先回总控。
`;
const allowed=t.allowedFiles.map(p=>'- `'+p+'`').join('\n')+'\n'+t.allowedPrefixes.map(p=>'- `'+p+'` 内新文件（src仅Rust；证据只文本/json/log/png）').join('\n');const finals=t.expectedFinalModes.map(mode=>'node scripts/parallel-wave-check.mjs --task '+id+' --mode '+mode+' --final').join('\n');
const text=`# ${id}：${t.title}

总控2026-10-18。正式可执行票；状态以主manifest的本票记录为准，只有READY且baselineStatus=PASSED才开工。用户手动外贴，不自动启动实现者。本波R补单/S/T/U可以并行。

| 项 | 唯一值 |
|---|---|
| 权威票面 | ${root}/${t.ticket} |
| 唯一工作树 | ${t.worktree} |
| 分支 | ${t.branch} |
| 精确首次基线 | ${t.baseCommit} |
| 固定tag | water-w1-parallel-wave-base-20261018 |
| manifest | ${root}/docs/dispatch/wave1/manifest.json |
| 冻结锁 | ${t.contractLock}（继承12旧锁，291唯一冻结） |
| 实现目录 | ${t.outputRoot} |
| 回执 | ${t.worktree}/${t.report} |
| 证据 | ${t.worktree}/docs/acceptance/wave1/${slot}/ |

先读主检出README、STATUS、AGENTS、CONTROLLER-WORKFLOW、ADR-013、本波PLAN/READY-REPORT、本票、W1-PARALLEL-WAVE-WORKER-RULES、contracts/parallel-wave-v1/COMMON.md及TESTS.json、${t.spec}。S再读SOURCES/N/P API；T再读PROVENANCE/bundle和真实I/H/Q规格；U再读cases。票面在主检出，直接读权威绝对路径；执行树早于正式票，不merge取票。

首次必须精确HEAD/分支、干净、实现目录不存在。baseline已由总控在此树实际运行，执行者仍先复核一次；不符保留现场回受阻，不自行换树/reset。只在本票树运行：

\`\`\`powershell
node scripts/parallel-wave-check.mjs --task ${id} --mode baseline
\`\`\`

baseline只验证已验收依赖/冻结输入/实际工具，不表示新产品或五测试通过。${lane==='S'?'本树受控fixture索引已由冻结工具创建，保留并复用。':'无物理fixture或真实用户数据权限。'}

## 实现要求
${extra}
## 独占改动白名单

${allowed}

此外所有文件只读：根Cargo、旧产品、冻结SPEC/输入/helper/锁、台账、其它树、上游checkout。依赖/接口/文件范围不符写受阻回执，不扩面/安装/fetch/改全局配置。${lane==='T'?'不得创建package.json/npm依赖。':'独立workspace及私有Cargo.lock，仅helper lock模式可离线生成；依赖/version/checksum精确按SPEC，不改根锁。'}

## 五测试、负控与最终门

精确五顶层测试：${tests.join('、')}。不得skip/过滤/嵌套凑数/修改runner。最多单子命令180秒，一树一次一门；${lane==='T'?'最多一个独立Chrome，profiles和下载保留。':'Rust1.95/MSVC、私有offline/locked/jobs1，不运行上游或整仓全量检查。'}

${lane==='T'?'先完整写测试和可运行骨架；':'先完整写测试及可编译骨架，使用lock模式离线生成本票锁；'}完整测试的目标行为断言消息必须含 ${t.proofTargets.behavior}，再运行 red-behavior 留有效完整五红，随后实现并 suite 五绿。编译/缺文件/窗口/CDP/超时不是有效行为红。稳定最终代码与测试字节后，逐项按SPEC暂时改坏真实生产逻辑，red-nc1、red-nc2、red-nc3（目标 ${t.proofTargets.nc1}/${t.proofTargets.nc2}/${t.proofTargets.nc3}），每红之后立即原字节恢复、核哈希并 suite 完整五绿。不能改测试或加测试专用开关造红。

统一命令形态（mode分别取red-behavior、suite、red-nc1、red-nc2、red-nc3；Rust另有lock）：

\`\`\`powershell
node scripts/parallel-wave-check.mjs --task ${id} --mode suite
\`\`\`

final会核四条当前源码/测试字节的有效红与逐次恢复。首次行为红保留；若后续测试/源码改变导致它不能绑定当前字节，最终版上暂时恢复相同行为缺陷，red-behavior重放→原字节恢复suite绿，明确标注为实现后负控重放。不要把重放冒称首次先红。格式/样式变化也影响源码哈希，先稳定再完整留链。所有失败日志和源码原/坏/恢复快照保留。

提交实现/测试得到干净SHA，同一SHA串行跑全部final：

\`\`\`powershell
${finals}
\`\`\`

全部helper输出在本树.local/checks/${id}/。按原字节归档json/log/txt/png及ARCHIVE.json（来源/长度/SHA）到本票证据目录；不纳入target/cache/profile/下载文件或fixture。预置.gitattributes不可改。显式文件名git add（log用-f），仅提交自己的实现/测试/报告/证据，不批量全树add，不clean/reset/merge/rebase/push。最终证据/报告提交不得夹未复测产品修改。

回执逐需求说明、完整基线与受测SHA/报告SHA、实际改动、全部命令/退出码/日志、先红/三负控与恢复、全部失败、边界和未验证、实际引擎/模型。完成只到SUBMITTED，总控另做独立验收集成；Windows不冒充macOS/M1完成。交回后停止修改。

报告首行及通知：

\`\`\`text
${id} 任务已完成，任务报告在 ${t.worktree}/${t.report}
\`\`\`

受阻把“已完成”改为“受阻”，说明最小补充需求，不要求用户临时放宽权限。
`;
writeFileSync(t.ticket,text);writeFileSync('docs/dispatch/wave1/PASTE-'+lane+'.txt','请读取 '+root+'/'+t.ticket+'，开始执行任务。\n');}
const r=manifest.tasks.find(t=>t.id==='WATER-W1-R'),a=r.addendum01;
writeFileSync(a.ticket,`# WATER-W1-R 补充单01：祖先保护契约冲突修订

总控2026-10-18。绑定原票 WATER-W1-R、原基线 ${r.baseCommit}。原R任务CHANGES_REQUESTED；本补单是否READY以主manifest addendum01为准。由原r执行对话续做，不再派另一个执行者。

| 项 | 唯一值 |
|---|---|
| 权威补单 | ${root}/${a.ticket} |
| 原树 / 分支 | ${r.worktree} / ${r.branch} |
| 原受阻报告提交 | ${r.blockedReportCommit} |
| 总控追加材料后首次续做HEAD | ${a.resumeCommit}，必须精确且干净 |
| 原基线 | ${r.baseCommit}，保持，不重置 |
| 新契约 / 锁 | contracts/native-scan-addendum-v1/SPEC.md / freeze.lock.json |
| 新定向wrapper | scripts/native-scan-addendum-check.mjs |
| 新报告 | ${r.worktree}/${a.report} |
| 新证据 | 本树 docs/acceptance/wave1/r/addendum-01/ |

先读主检出README/STATUS/AGENTS/工作流、原R票/纪律、原受阻报告及本补单、附加SPEC/锁。原票SPEC的固定两原因规则仅由本编号补单替代，其余原票要求保持。主检出票面权威，执行树已由总控追加六个新控制材料文件及独立提交；原受阻提交/报告/证据、255旧冻结、原61锁/helper/夹具与产品原字节保持。不merge获取票、不reset/重建原fixture。起点不符保留现场回受阻。

总控已用真实A.parse_report复现内存两finding报告：UnsafeClassification at /findings/0/protection_reasons；仅给dir追加第三原因后真实A/Q通过，去掉后代且恢复两原因的叶子对照也通过。完整fixture dir是findings[2]，对应冲突位置从源码与冻结顺序推得，尚无R产品或R测试执行，不把该位置推导当R实测失败。原执行者停止报告冲突符合工作流，无产品缺陷结论。

正确规则：所有finding先保留 unknown_ownership、incomplete_evidence；当且仅当同scope的实际已记录findings存在受保护后代，再按第三项追加 protected_descendant。分段前缀与真实A一致；不根据未记录磁盘/目录名/issue猜后代。完整八项dir三原因，其余两；max_depth=1缺少inner时dir两原因；partial/cancelled按实际记录集合计算并仍真实A校验，Q照旧委托。禁止修改A/Q、跳过校验/丢后代/降保护/重写旧冻结。

现有 native_report_and_redaction 测试补完整/深度1/partial/取消祖先对照，保持原五测试名、全部原断言和原 R_BEHAVIOR/R_ROOT_BINDING/R_NO_FOLLOW/R_CANCELLED 目标。仍从原任务尚未实施处开始：全部实现、原生安全/生命周期、五测试、四条完整红/恢复链和final均需交付，补单probe不是产品实现或放宽权限。

首先只运行新resume，沿用既有R fixture和原helper fixtures模式，另核本次实际A/Q内存冲突对照：

\`\`\`powershell
node scripts/native-scan-addendum-check.mjs --task WATER-W1-R --mode resume
\`\`\`

不要再跑首次baseline（原helper要求精确原基线）。后续所有原lock/fmt/test/suite/clippy/metadata/bridge/red-behavior/red-nc1/2/3模式均通过同一新wrapper调用；wrapper原样委托原helper，bridge再追加完整/深度1保护原因公开R→A→Q校验，原helper不改。资源、依赖、unsafe/NativeIo/P guard/decoder/取消/预算和普通内容禁止读取等原要求全部保持，单子命令180秒。

原实现白名单不扩面；仅允许新增本补单报告及r/addendum-01/证据。六个总控追加控制文件已提交、只读，manifest只是允许它们存在于原基线后的diff，不授权执行者修改。原WATER-W1-R-REPORT.md和blocked-r001证据原字节保持。临时改坏真实生产逻辑留红后立即原字节恢复suite绿，最终源码/测试字节四链完整；不以编译、缺文件、native失败或超时造红。

同一干净实现SHA依次运行：

\`\`\`powershell
${r.expectedFinalModes.map(mode=>'node scripts/native-scan-addendum-check.mjs --task WATER-W1-R --mode '+mode+' --final').join('\n')}
\`\`\`

归档本次wrapper与原helper所有新json/log/txt原字节至addendum-01（含ARCHIVE.json）。新报告绑定受测完整SHA，逐项列新规则与原需求、实际模型/失败/红绿/五final/未验证；后加报告/证据不得夹未复测产品变更。不清理/删/移/ACL/扫描真实用户数据，不合主线或push，不启动其它实现者。总控独立验收仍另做，M1未完成。

报告首行及通知：

\`\`\`text
WATER-W1-R 补充单01 任务已完成，任务报告在 ${r.worktree}/${a.report}
\`\`\`
`);
writeFileSync('docs/dispatch/wave1/PASTE-R-01.txt','请读取 '+root+'/'+a.ticket+'，继续执行 WATER-W1-R 补充单01。\n');
console.log(JSON.stringify({tickets:4,placeholders:false}));
