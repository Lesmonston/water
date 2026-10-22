WATER-W1-AB 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/ab/docs/dispatch/reports/WATER-W1-AB-REPORT.md

状态：**SUBMITTED，待总控独立验收**。本票的实现、指定检查和证据交付已完成；没有标记 VERIFIED，没有合入主线或 push。

执行环境为 Windows x64、Node v24.16.0；执行引擎 Codex，按本会话声明为 GPT-6，更细运行型号及采样参数未暴露，不冒填。未启动子代理、实现 worker、原生选择器或新 AA。界面采用已读取的 `C:/Users/37310/.agents/skills/minimalist-ui/SKILL.md` 的暖白、墨色、细线与排版约定，并沿用 Water 自有 Y 页面布局，无外部字体、资源或依赖。

| 定位 | 值 |
|---|---|
| 权威票 | `F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W1-AB-PROJECT-WORKSPACE-20261019.md` |
| 唯一工作树 / 分支 | `F:/new/smaltalk/water/.worktrees/ab` / `worker/water-w1-ab` |
| 首次干净 HEAD | `f3b87b7a79ff8fa51882705ecef75f1f02d8af15` |
| 实现及测试提交 / 全部 final 受测 SHA | `fa71a82696f123fd33c3514d99ef0b5c681c5780` |
| 实现提交范围 | 恰 11 个票面产品/测试/README 文件，1493 行；根与旧产品、锁、helper、台账不变 |
| final productionHash | `12d5175516c83fdbdd2430b02d7e47456d418bafa48a5bb8d6aca4942f0a423a` |
| final testHash | `700eba78708a391d28cba40fe88ceaf217ca7c71c98ab616c2b0bcab3658ab06` |
| 报告提交定位 | 本报告所在的最后一次路径提交：`git log -1 --format=%H -- docs/dispatch/reports/WATER-W1-AB-REPORT.md`；实现之后仅提交本报告及本票证据 |
| 原字节归档 | [ARCHIVE.json](../../acceptance/wave1/ab/ARCHIVE.json)，410 个原文件，共 1,884,212 字节；逐项 source/archive/bytes/SHA-256 |

需求与实现逐项对应：

| 要求 | 实现和验证 |
|---|---|
| 默认关闭、每次开始复位、活动中禁用 | `index.html/app.mjs` 使用原生 checkbox；开始前捕获本次 bool，立即清为 false；重载和恢复页面时也清空。鼠标、键盘、未勾选扫描、勾选后下一任务不继承均通过。label 明确 package.json、256 KiB、只提取结构统计及不读取其它正文。 |
| 同 job 的选择绑定 | HTTP start 恰 `{read_manifest:bool}`，后端生成 OpaqueId；active/accepted/result 逐次严格匹配，错误 job、过期结果、false+observed 均禁动作，实际证据路由 404。 |
| 原字节流边界 | `transport.mjs/model.mjs` 接真实 Readable/Writable，收到即复制块；ready 后才开 HTTP。严格 UTF-8/紧凑单行/LF/重复及转义重复键/Unicode/字段/次序/单调/32 任务上限，事件 67,125,248 字节含 LF、bundle 64 MiB、observation 8192 字节。断管、重复 terminal、错误连接停用操作，不伪造报告。 |
| Z/U 完整结构校验 | Z 精确 12 字段、固定来源/保护/布尔声明及 bytes_read 0..262144；U 精确 15 字段、九个已识别字段关联、六项计数范围。逐字段缺失、额外正文/名字/canary、重复键、错误计数均拒绝。零计数只约束提供字段数的上下界，不反推未提供；declared_private=false/null 原样保留。 |
| 状态和内容保护 | 显示未请求、选择取消未读、扫描取消未读、未发现、结构证据及固定错误映射。observed 展示 bytes_read、字段存在/private 声明和六计数，并说明仅结构、归属和版本未知、不证明可删。无包名/版本值/脚本/依赖名/路径/内容 hash。 |
| 元数据与内容 sidecar 分离 | 真实委托旧 W.assertReviewInput 和 W.startServer，native_scope_metadata、8/10000/256、ordinary_content_read=false 和 Q 原 string 均保持；Z 的 true 独立保留，未重算 Q、未改分类或保护。 |
| 独立证据附件 | GET/HEAD `/evidence/<job_id>.json` 只服务仍保留的 observed。返回 Z 原 UTF-8 字节、精确 Content-Length、application/json;charset=utf-8 和固定附件名。非 observed/未知/淘汰任务 404，POST 405；不重新 serialize。 |
| 最近两份与资源归属 | 只保留两份 recent；淘汰同时撤销自有 W 和证据。close 幂等，关闭自有服务，不 destroy 调用方 streams；独立调用方 W 服务保持可用。 |
| HTTP 权限与隐私 | 固定 127.0.0.1、精确 Host/Origin、每实例 randomBytes(32) token、重复 header 拒绝、1024 字节动作上限、CSP/no-store/nosniff/no-referrer/无 CORS；静态白名单 realpath。token 仅首页 bootstrap，立即移除 meta，不出轮询、错误、下载或可见文本。 |
| 固定启动器 | `launchProjectWorkspace({initialDirectory,port})` 仅本树固定 `.local/next-target/debug/water-project-session.exe`，realpath/普通文件/项目内，shell=false、参数恰 initialDirectory。缺 AA 时净化拒绝 `Project workspace unavailable.`；无 fake exe、路径注入、env/Cargo/PATH 或测试开关。 |
| 文件、权限与测试范围 | 最先创建精确四行 LF `.gitattributes`；零 npm，无 package.json；唯一三模型/两浏览器测试，无 skip/todo/filter/嵌套计数。未读取物理 fixture、真实用户数据，未改其它树/上游、无删除/ACL/移动。 |

全部定向门均从本工作树串行运行，每子命令由冻结 helper 使用 180 秒上限。下表为 `node scripts/project-wave-check.mjs --task WATER-W1-AB --mode <mode>` 的完整运行记录；final 行额外带 `--final`。每份 receipt 的 commands 包含实际 argv、退出码及原日志文件。所有 helper 外层退出为 0；红门的测试子进程按要求退出 1。

| UTC 开始 | mode | 测试结果 / 目标 | 归档 receipt 文件（raw/.local/checks/WATER-W1-AB/） |
|---|---|---|---|
| 08:03:31 | baseline | 既有依赖/回放/平台下载通过，新产品未测 | `2026-10-20T08-03-29.590Z-11624-baseline-result.json` |
| 08:09:18 | red-behavior | 可运行骨架，完整三测 0 过/3 失败，AB_BEHAVIOR | `2026-10-20T08-09-17.131Z-17060-red-behavior-result.json` |
| 08:12:05 | test | 三测通过 | `2026-10-20T08-12-04.503Z-28064-test-result.json` |
| 08:13:26 | red-nc1 | 完整三测 2 过/1 失败，AB_ACTION_AUTH | `2026-10-20T08-13-25.134Z-35160-red-nc1-result.json` |
| 08:13:41 | test | nc1 原字节恢复后，三测通过 | `2026-10-20T08-13-40.252Z-25000-test-result.json` |
| 08:13:56 | red-nc2 | 完整三测 2 过/1 失败，AB_CONSENT_BINDING | `2026-10-20T08-13-55.044Z-28480-red-nc2-result.json` |
| 08:14:10 | test | nc2 原字节恢复后，三测通过 | `2026-10-20T08-14-09.288Z-22604-test-result.json` |
| 08:14:59 | check --final | 七个 MJS 语法检查、冻结/范围/恢复链审计通过 | `2026-10-20T08-14-56.679Z-2188-check-result.json` |
| 08:15:09 | test --final | 指定三测 3/3，约 2.8 秒 | `2026-10-20T08-15-08.435Z-32956-test-result.json` |
| 08:15:23 | browser --final | 指定两测 2/2，约 9.4 秒；三图均为本次产生 | `2026-10-20T08-15-22.257Z-20700-browser-result.json` |

指定测试名称为 `project_workspace_protocol`、`project_workspace_authority`、`project_workspace_consent_and_exports`、`project_workspace_actions_and_evidence`、`project_workspace_layout_and_privacy`。全部 final 仅在干净 fa71a82 上各运行一次；每门均通过当前 228 文件及继承冻结/Git 对象检查，正式 16 继承锁/479 唯一约束及旧 426 未修改。

行为红发生在实现前：骨架已能响应 HTTP，但仍返回旧工作台版本，三测试均在 AB_BEHAVIOR 断言失败。初始 testHash 为 `5a03b0e36dc983be8031d34668d4f1d98a8f95c052a81701589894e42f0682ed`；之后在稳定负控前增加逐字段缺失、计数上下界及 null 覆盖，得到上述 final testHash。没有把初始和最终测试字节称为相同。

nc1 临时移除生产 `server.mjs` 的精确 Origin 拒绝。真实跨 origin POST 使用有效 body/token，实际写 pipe 的命令数从预期 0 变成 1，命中 AB_ACTION_AUTH。server 好态 SHA `e14c6997d0c0f035aa098912bd6a0b6af07e08e1f2dca1a5c1ab0c910d33e4c6`，坏态 `53fb4ded41ba68264c5dbe8dd9cce2ea7f373cbb71703eae85fc531ecb08c93f`。

nc2 临时使生产 `model.mjs` 的选择检查放过 false+observed。本次真实 HTTP start(false)→accepted(false)→result(false,observed) 经相同生产 transport/W 组装，证据 GET 实际返回 200 而不是 404，命中 AB_CONSENT_BINDING。model 好态 SHA `9c7009f01926ae2f8f0017418e9be2f9c8437998654c7659373b0c3565bdf22e`，坏态 `e90ba4ec9f5182f4e00b4576bd43fc4e7ba2f426baa493f2a74fc447cadd3d7b`。

每项坏态后立即读取保存的原字节恢复、核 SHA，再运行完整三测绿后才进行下一项；两条负控及恢复使用同一 final testHash，未改测试/helper/超时，未启动 Chrome 或 native。好坏源码、测试输出、`nc1/2-restored.json`、final proofAudit 均已归档。不存在编译、缺文件、超时或 CDP 造红。

浏览器实际通过 `Input.dispatchMouseEvent` 点击 checkbox/start/cancel 和下载，键盘 Space/Tab/Enter 及焦点轮廓也通过；跨任务选择和 false/旧 job/正文 canary 拒绝均检查。final 共实际保存四份附件，逐文件比较原字节：

| 附件 | 字节 | SHA-256 |
|---|---|---|
| 默认元数据 Q `water-report-1.json` | 1387 | `688326559e719a0d9099dca6a580d94aaef518d40a4c54872a2b5c7f6ad58550` |
| Z `water-project-evidence.json` | 844 | `3d5ab3ad3916ad49dfe1621ff4e7bbc99dc4103b2ab052884f5571c0bb9b9350` |
| 同意读取后的独立 W/Q `water-report-1.json` | 1387 | `688326559e719a0d9099dca6a580d94aaef518d40a4c54872a2b5c7f6ad58550` |
| 扫描取消的真实 Q `water-report-1.json` | 902 | `e08ba3bc1e83afc94c7dd5d48e6c31c34e7a1b4f5a662c2b5225106b93ac5c57` |

附件及 download receipt 保留在归档 `raw/.local/browser-lab/project-workspace-download-*/`，baseline 的两份实际下载及回执在 `raw/.local/checks/project-platform/`。没有用 fetch 冒充下载；fetch 仅用于 HTTP 状态/头/拒绝验证。

已用 `view_image` 实际查看当次三图：[1440×1000](../../acceptance/wave1/ab/raw/.local/browser-lab/project-workspace-1440x1000.png)、[900×800](../../acceptance/wave1/ab/raw/.local/browser-lab/project-workspace-900x800.png)、[选择取消](../../acceptance/wave1/ab/raw/.local/browser-lab/project-workspace-cancel.png)。复选框、限制说明与操作可读，窄尺寸 label 自然换行，无横向溢出；取消明确为未开始扫描。内容可纵向滚动：1440 图显示结构面板开头，900 图的报告与结构内容在首屏以下，实际点击下载时已滚动可达。没有把首屏截图称为完整证据面板截图。

本次系统原生窗口 **0**；baseline 一个、final browser 一个私有 Chrome 实例依次运行，最多并发一个。final profile 为 `.local/browser-lab/profile-aQDgAm`，没有使用用户 profile，所有 profile/下载/夹具原位保留。7 个本票模型/浏览器回放子进程均记录 code=0、signal=null；final 模型 PID 17040，浏览器回放 PID 6476/33500。08:17:24 UTC 的 [PROCESS-AUDIT](../../acceptance/wave1/ab/raw/.local/checks/WATER-W1-AB/PROCESS-AUDIT.json) 未观察到所列自有 PID 或本树命令行的残留进程。本执行者没有手动终止进程；私有浏览器 helper 已完成 close，其内部是否触发兜底 child.kill 未另作分支遥测，不宣称已手动杀掉任何进程。

全部门的 stdout/stderr/命令退出、先红、好坏源码和恢复链已按 source/archive/bytes/SHA 原字节归档，不含 target/cache/binary/profile/payload。日志将逐路径 `git add -f -- <file>`，其它文件逐路径暂存；不用全树 add/clean/reset。检查过程中四项只读操作问题（首次编码/输出截断、猜错 Y 目录、PowerShell `node -e` 引号丢失、猜错日志后缀）及更正已记录在 [EXECUTION-NOTES](../../acceptance/wave1/ab/raw/.local/checks/WATER-W1-AB/EXECUTION-NOTES.json)，它们不是产品红门。没有产品修复后的意外测试失败，没有申请扩大范围。

CASES 的 R/Z 值来自真实 P 确认后的依赖调用，但 native_directory_dialog envelope 是合成内存声明；保留的取消项来自旧 S 捕获。本票只运行冻结 project-host-replay 真双向 pipe 和真实新 AB→HTTP→Chrome→旧 W/Q/独立 Z 附件，**没有运行新 AA 或本轮 S**。真实 AA 固定程序→AB 同次选择/内容同意整链仍待总控联合验收；自然用户手势鉴真、真实用户 scope、生产竞态、macOS、桌面及 M1 均未验收。完成本报告/证据提交后停改停测，不更新主线状态。

?????412 ????????? Git blob ????????????????????? `git diff --cached --check` ? Git ????? 2?PowerShell ?????? 1????????? Node TAP ???????/??? PowerShell PROCESS-AUDIT ? CRLF????????????????????????????? Git ???????? 1??? 2???????????????????????????????? whitespace check ?????? check ?? 0?????? [STAGING-AUDIT](../../acceptance/wave1/ab/raw/.local/checks/WATER-W1-AB/STAGING-AUDIT.json)?????????? 411 ????????????????????????
