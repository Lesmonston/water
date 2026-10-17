# WATER-W1-K：调用方供数的受控会话页面

总控Codex，2026-10-18。正式状态以主检出manifest为准；没有READY前不执行。与J独立并行，只依赖VERIFIED的I模型和冻结会话wire/输入，不能把J未来实现当已验收依赖。

| 项 | 唯一值 |
|---|---|
| 权威票 | `F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W1-K-LAB-READER-20261018.md` |
| 唯一树 / 分支 | `F:/new/smaltalk/water/.worktrees/k` / `worker/water-w1-k` |
| 精确基线 | `bc409f4af8cb2d51b2f67341ad46637cfa5e66f3` |
| tag | `water-w1-session-batch-base-20261018-r1` |
| 权威manifest | `F:/new/smaltalk/water/docs/dispatch/wave1/manifest.json` |
| 冻结 | `contracts/session-batch-v1/freeze.lock.json`，65新项/六旧锁83唯一文件，合计132唯一文件 |
| helper / 纪律 | `scripts/session-batch-check.mjs` / `docs/dispatch/W1-SESSION-BATCH-WORKER-RULES.md` |
| 回执 | `F:/new/smaltalk/water/.worktrees/k/docs/dispatch/reports/WATER-W1-K-REPORT.md` |
| 证据 / 临时 | 本树`docs/acceptance/wave1/k/`、`.local/checks/WATER-W1-K/`、`.local/browser-lab/` |

先读主检出README/STATUS/AGENTS/工作流、本票、ADR-008、本批纪律、lab-reader-v1全部材料和lab-session-v1 SPEC、PROVENANCE及I SPEC。执行树早于本票/登记，直接读主检出，不merge取票。核路径/分支/精确HEAD/干净/冻结，不符保留现场回受阻，不重置/切树。

首次仅运行：

```powershell
node scripts/session-batch-check.mjs --task WATER-W1-K --mode baseline
```

baseline只核Node24、固定实际链路资产/I模型和独立现有Chrome空白页，不是K产品页面。四快照由总控从已验收真实F/G/A/E/H执行日志封装，J尚未实现。只有测试可读contracts输入；生产startServer必须由调用方传bundle，不得自动读冻结文件或其它树结果兜底。

按SPEC实现内存bundle接口、I模型复用、实际供数页面、完整快照/状态切换、source totals/保护计数/metadata详情及可访问交互。server只127.0.0.1、六固定路由、正确Host、GET/HEAD、CSP/nosniff/no-CORS；sessions.json仅捕获内存输入。不得增加JSON文件路径/CLI/环境覆盖/上传/目录选择/扫描或取消扫描按钮/删除/IPC/任意shell；不读真实数据或J/F物理fixture。K不获任何物理fixture权限，.local仅日志与独立浏览器状态，不清理profile，不安装npm。

唯一可改prototypes/lab-reader下八文件：index.html、styles.css、app.mjs、model.mjs、server.mjs、README.md、tests/model.test.mjs、tests/browser.test.mjs；本票REPORT及docs/acceptance/wave1/k内证据（冻结属性不改）。I.model只读复用，model import `../report-reader/model.mjs`；browser固定路由`/report-reader/model.mjs`由服务映射其原文件。不得复制修改I模型、改J或旧产品/helper/冻结/台账/上游，无外部字体/图片/依赖。

精确三模型reader_session_contract、reader_session_selection、reader_session_summary；精确两浏览器reader_session_live_input、reader_session_scope_and_layout。两个不同合法bundle/新scan_id都必须走真实startServer和页面，输入后变异不改变服务；不能只用默认四数据。内存BigInt/HTML变体按cases说明同步修改关联字段，标为合成变体，不冒充物理F捕获。原生dialog/键盘/焦点、无img/script字面解析、六路由raw HTTP/Host/POST/HEAD、双尺寸无横溢出/常驻只读/无外部请求和异常都要验。

先可运行骨架及完整唯一测试文件，运行red-behavior，完整五测真实失败消息含K_BEHAVIOR，再实现。模型/浏览器均要完整执行，语法/缺文件/CDP/等待超时不算。实现稳定后先suite五测绿，再逐项真实源码负控：red-nc1服务截断只保留首快照(K_SERVER_INPUT)、red-nc2未知总量变0(K_TOTAL_UNKNOWN)、red-nc3动态textContent改innerHTML(K_TEXT_LITERAL)。每次立即原字节恢复后suite五测绿；测试文件字节保持一致。helper自动保留完整stdout/stderr及当时源码/测试快照，不得只存错误摘要。

普通定向门check、test、browser、suite；模型30秒/浏览器120秒/完整suite150秒。一次一个门、最多一个Chrome、无整仓/watch/coverage。browser和suite每次生成.local/browser-lab/lab-reader-1440x1000.png、lab-reader-900x800.png、lab-reader-detail.png，helper核mtime并复制带戳副本。必须实看三图，记录读到的内容和布局，不只称DOM通过。

实现/测试提交后，在同一干净SHA串行：

```powershell
node scripts/session-batch-check.mjs --task WATER-W1-K --mode check --final
node scripts/session-batch-check.mjs --task WATER-W1-K --mode test --final
node scripts/session-batch-check.mjs --task WATER-W1-K --mode browser --final
```

final核对行为红/三负控各自在下一有效红前已经当前生产字节恢复suite，测试hash一致；因此格式和逻辑稳定后再做负控。后加报告/证据不能夹未复测产品。原字节复制全部本任务helper的json/log/txt/png（红/恢复/源码快照/final截图），明确文件名分批add，log用-f，禁批量add整个目录。REPORT写受测完整SHA、逐项需求、全部失败/退出码、三hash和原日志、实看截图、实际模型、macOS/桌面/真实数据及J真正页面接线未验证。无push/merge/rebase/发布/清理权限；完成后停止，J→K实测由总控另验，不用拦截响应/expected假装接线。

报告首行和通知：

```text
WATER-W1-K 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/k/docs/dispatch/reports/WATER-W1-K-REPORT.md
```

受阻保留现场，最小缺口交总控，不申请真实数据或额外权限。
