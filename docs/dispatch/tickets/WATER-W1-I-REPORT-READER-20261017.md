# WATER-W1-I：E报告视图阅读界面

总控Codex，2026-10-17。只依赖VERIFIED的E，与F/G/H同时实现，不等待扫描器。此界面消费正式E协议，当前数据仍为明确标注的合成报告；不接Tauri/IPC或真实数据。状态以主检出manifest为准。

| 项 | 唯一值 |
|---|---|
| 权威票 | `F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W1-I-REPORT-READER-20261017.md` |
| 工作树 / 分支 | `F:/new/smaltalk/water/.worktrees/i` / `worker/water-w1-i` |
| 精确基线 / tag | `045ab4f0d01edd573828fbc8cca988e1ad37efee` / `water-w1-parallel-next-base-20261017` |
| 权威manifest | `F:/new/smaltalk/water/docs/dispatch/wave1/manifest.json` |
| 协议 / 锁 | `contracts/report-reader-v1/` / `contracts/parallel-next-v1/freeze.lock.json`（36项新冻结，五旧锁58唯一文件） |
| helper | `scripts/parallel-next-reader-check.mjs` |
| 回执 | `F:/new/smaltalk/water/.worktrees/i/docs/dispatch/reports/WATER-W1-I-REPORT.md` |
| 证据 / 临时目录 | `docs/acceptance/wave1/i/` / 本树`.local/checks/WATER-W1-I`、`.local/browser-lab` |

先读主检出README/STATUS/AGENTS/工作流、本票、ADR-007、W1-PARALLEL-NEXT-WORKER-RULES、I完整SPEC/reports及E SPEC；C只作本项目参考，不依赖/修改C。票面/登记晚于基线，直接读主检出，不merge取票。核路径/分支/精确HEAD/干净/冻结，不符保留现场报告，不重置/切树。

首次只运行：

```powershell
node scripts/parallel-next-reader-check.mjs --task WATER-W1-I --mode baseline
```

baseline使用已安装Node24和Chrome独立profile的空白页，非I页面测试；不安装npm或浏览器。四报告是总控调用真实E project_json并逐值核对golden生成：base、composite_partial、cancelled、empty_completed，不从expected伪称实测。/reports.json只映射本树contracts/report-reader-v1/reports.json，不新造数据副本。

唯一可改prototypes/report-reader/下index.html、styles.css、app.mjs、model.mjs、server.mjs、README.md、tests/model.test.mjs、tests/browser.test.mjs；本票REPORT及docs/acceptance/wave1/i证据（冻结.gitattributes不改）。禁止其它文件/npm依赖/包锁，禁止改A–H/根Cargo/旧helper/冻结/上游或主线登记。

按SPEC实现四模型API、整份报告切换、状态/覆盖/问题/来源总量、五项组合筛选、BigInt排序和可访问详情。HTML/Unicode/path全部文本，无dynamic HTML/URL或文件输入。精确工具键与scope不能混淆；来源37原样显示且不逐行相加。low/high不得合并review，取消报告不清空已有事实。视觉沿用本项目清晰、安静的只读工具基调；1440x1000/900x800能读、无横溢出。

server仅127.0.0.1/五固定路由/正确Host/GET或HEAD/CSP，无用户目录/任意路径/对外监听/上传或进程入口。import不自动启动，测试finally关闭。禁止扫描、删除、执行、导入/导出/上传、IPC、F接线及真实用户数据。浏览器使用冻结browser-lab，独立I profile，不读用户profile。

定向命令串行：

```powershell
node scripts/parallel-next-reader-check.mjs --task WATER-W1-I --mode check
node scripts/parallel-next-reader-check.mjs --task WATER-W1-I --mode test
node scripts/parallel-next-reader-check.mjs --task WATER-W1-I --mode browser
```

模型精确三测试reader_input_and_preservation、reader_bigint_filters、reader_totals_and_unknown；浏览器精确两测试reader_live_interactions、reader_scope_layout_and_readonly。真实页面加载/切换/过滤/键盘详情/Esc焦点/HTML无元素、raw HTTP越界、两个尺寸/只读标识/无外部请求与异常。每次browser门重新截图到本树.local/browser-lab/reader-1440x1000.png、reader-900x800.png、reader-detail.png；helper按mtime核新证据并复制至.local/checks/WATER-W1-I带时间戳副本。必须实看截图，不以DOM通过代替视觉核对。

先可运行的目标行为红，三负控：Number排序损失2^53邻值、错误逐行求和或null→0、真实DOM文本改innerHTML。每项完整三个模型+两个浏览器测试命中目标断言，原/坏/恢复三hash，原字节恢复后五测绿；语法/缺文件/超时不算，不改测试/冻结资产造红。

一次一个门、最多一个Chrome，模型30秒/浏览器120秒，不跑整仓/watch/coverage。实现/测试提交干净后，同一SHA将check/test/browser各加`--final`串行执行。全部完成后将日志和上述截图副本原字节复制到I证据目录，报告/证据独立提交，不夹未复测产品。禁批量add/push/merge/rebase/发布或清理profile；.log需显式-f点名。

REPORT写受测SHA、逐项需求、全部失败、三个final receipt、实看截图结果、五测试/三负控/恢复、实际模型、macOS及桌面/真实数据未验证。只读辅助记回执，不再分派实现；受阻保存现场交总控。完成提交本分支后停止。报告第一行和通知：

```text
WATER-W1-I 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/i/docs/dispatch/reports/WATER-W1-I-REPORT.md
```
