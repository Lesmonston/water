# WATER-W1-T：实际报告预览与默认Q脱敏JSON下载

总控2026-10-18。正式可执行票；状态以主manifest的本票记录为准，只有READY且baselineStatus=PASSED才开工。用户手动外贴，不自动启动实现者。本波R补单/S/T/U可以并行。

| 项 | 唯一值 |
|---|---|
| 权威票面 | F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W1-T-SCAN-REVIEW-20261018.md |
| 唯一工作树 | F:/new/smaltalk/water/.worktrees/t |
| 分支 | worker/water-w1-t |
| 精确首次基线 | 3d0faefa97267a6aa57f880a315a2cde7fe06e98 |
| 固定tag | water-w1-parallel-wave-base-20261018 |
| manifest | F:/new/smaltalk/water/docs/dispatch/wave1/manifest.json |
| 冻结锁 | contracts/parallel-wave-v1/freeze.lock.json（继承12旧锁，291唯一冻结） |
| 实现目录 | prototypes/scan-review |
| 回执 | F:/new/smaltalk/water/.worktrees/t/docs/dispatch/reports/WATER-W1-T-REPORT.md |
| 证据 | F:/new/smaltalk/water/.worktrees/t/docs/acceptance/wave1/t/ |

先读主检出README、STATUS、AGENTS、CONTROLLER-WORKFLOW、ADR-013、本波PLAN/READY-REPORT、本票、W1-PARALLEL-WAVE-WORKER-RULES、contracts/parallel-wave-v1/COMMON.md及TESTS.json、contracts/scan-review-v1/SPEC.md。S再读SOURCES/N/P API；T再读PROVENANCE/bundle和真实I/H/Q规格；U再读cases。票面在主检出，直接读权威绝对路径；执行树早于正式票，不merge取票。

首次必须精确HEAD/分支、干净、实现目录不存在。baseline已由总控在此树实际运行，执行者仍先复核一次；不符保留现场回受阻，不自行换树/reset。只在本票树运行：

```powershell
node scripts/parallel-wave-check.mjs --task WATER-W1-T --mode baseline
```

baseline只验证已验收依赖/冻结输入/实际工具，不表示新产品或五测试通过。无物理fixture或真实用户数据权限。

## 实现要求

冻结bundle含24份实际A/E/H/Q输出并已过真实I：11份H合成输入仅scan_id改为唯一review-h-N，13份保留J捕获不改source ID；每份Q仍逐值等于原golden。来源与哈希见 contracts/scan-review-v1/PROVENANCE.json；不读取J/R物理fixture、不重新扫描。生产仅caller内存bundle，不能加载此文件兜底或按case/ID返回golden。

零npm，沿用I/K/O已有样式与安全做法，只复用真实I公开模型；不改旧模块。模型三测覆盖全部24份、输入不变、额外Q键/错误alias/计数/Unknown拒绝、当前snapshot选择及原Q文本精确返回；浏览器两测覆盖两份不同caller bundle（含重命名ID）、实际startServer/HTTP/Chrome/点击下载及启动后caller突变隔离，双尺寸、完整u64、HTML字面、键盘dialog/Escape/焦点返回、所有快照和过滤不改变完整导出。

导出按钮固定“下载脱敏报告”，显式点击下载整份当前Q原字节，不下载view/summary/raw。严格固定/exports/序号路由、attachment文件名与精确UTF-8长度，HEAD/Host/遍历/编码/query/CSP测试。新私有下载目录只在本树.local/browser-lab，通过实际磁盘下载文件核bytes和无原ID/路径/证据canary，不能用fetch冒充点击下载。使用冻结browser-lab和Page.setDownloadBehavior即可，baseline已有实际能力证明。

浏览器测试在断言失败时仍完成其余独立用例并保存三张当前截图（1440x1000、900x800、export），使有效行为红保留完整五测和可检视证据；基础设施/语法/下载超时不能算有效红。实看截图核内容再报告，不因存在png就宣称验收。完整Q预览必须同步当前snapshot；Unknown仍未知，来源总量不可按过滤重算。不引入原始导出、上传、扫描、目录选择或删除入口。

## 独占改动白名单

- `prototypes/scan-review/index.html`
- `prototypes/scan-review/styles.css`
- `prototypes/scan-review/app.mjs`
- `prototypes/scan-review/model.mjs`
- `prototypes/scan-review/server.mjs`
- `prototypes/scan-review/tests/model.test.mjs`
- `prototypes/scan-review/tests/browser.test.mjs`
- `prototypes/scan-review/README.md`
- `docs/dispatch/reports/WATER-W1-T-REPORT.md`
- `docs/acceptance/wave1/t/` 内新文件（src仅Rust；证据只文本/json/log/png）

此外所有文件只读：根Cargo、旧产品、冻结SPEC/输入/helper/锁、台账、其它树、上游checkout。依赖/接口/文件范围不符写受阻回执，不扩面/安装/fetch/改全局配置。不得创建package.json/npm依赖。

## 五测试、负控与最终门

精确五顶层测试：review_bundle_validation、review_selection_and_privacy、review_export_bytes、review_live_input_and_download、review_layout_and_safety。不得skip/过滤/嵌套凑数/修改runner。最多单子命令180秒，一树一次一门；最多一个独立Chrome，profiles和下载保留。

先完整写测试和可运行骨架；完整测试的目标行为断言消息必须含 T_BEHAVIOR，再运行 red-behavior 留有效完整五红，随后实现并 suite 五绿。编译/缺文件/窗口/CDP/超时不是有效行为红。稳定最终代码与测试字节后，逐项按SPEC暂时改坏真实生产逻辑，red-nc1、red-nc2、red-nc3（目标 T_REDACTED_ONLY/T_SELECTED_EXPORT/T_UNKNOWN_PRESERVED），每红之后立即原字节恢复、核哈希并 suite 完整五绿。不能改测试或加测试专用开关造红。

统一命令形态（mode分别取red-behavior、suite、red-nc1、red-nc2、red-nc3；Rust另有lock）：

```powershell
node scripts/parallel-wave-check.mjs --task WATER-W1-T --mode suite
```

final会核四条当前源码/测试字节的有效红与逐次恢复。首次行为红保留；若后续测试/源码改变导致它不能绑定当前字节，最终版上暂时恢复相同行为缺陷，red-behavior重放→原字节恢复suite绿，明确标注为实现后负控重放。不要把重放冒称首次先红。格式/样式变化也影响源码哈希，先稳定再完整留链。所有失败日志和源码原/坏/恢复快照保留。

提交实现/测试得到干净SHA，同一SHA串行跑全部final：

```powershell
node scripts/parallel-wave-check.mjs --task WATER-W1-T --mode check --final
node scripts/parallel-wave-check.mjs --task WATER-W1-T --mode test --final
node scripts/parallel-wave-check.mjs --task WATER-W1-T --mode browser --final
```

全部helper输出在本树.local/checks/WATER-W1-T/。按原字节归档json/log/txt/png及ARCHIVE.json（来源/长度/SHA）到本票证据目录；不纳入target/cache/profile/下载文件或fixture。预置.gitattributes不可改。显式文件名git add（log用-f），仅提交自己的实现/测试/报告/证据，不批量全树add，不clean/reset/merge/rebase/push。最终证据/报告提交不得夹未复测产品修改。

回执逐需求说明、完整基线与受测SHA/报告SHA、实际改动、全部命令/退出码/日志、先红/三负控与恢复、全部失败、边界和未验证、实际引擎/模型。完成只到SUBMITTED，总控另做独立验收集成；Windows不冒充macOS/M1完成。交回后停止修改。

报告首行及通知：

```text
WATER-W1-T 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/t/docs/dispatch/reports/WATER-W1-T-REPORT.md
```

受阻把“已完成”改为“受阻”，说明最小补充需求，不要求用户临时放宽权限。
