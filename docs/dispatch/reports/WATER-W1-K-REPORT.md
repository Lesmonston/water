WATER-W1-K 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/k/docs/dispatch/reports/WATER-W1-K-REPORT.md

# WATER-W1-K 提交回执

2026-10-18（Asia/Tokyo）；helper 原日志时间戳为 UTC。执行者完成并提交，等待总控独立验收；未更新台账或自行标记 VERIFIED。

- 唯一工作树：`F:/new/smaltalk/water/.worktrees/k`；分支 `worker/water-w1-k`。用户本会话已按正式票明确外贴启动，权威 manifest 的 K 为 READY。
- 精确基线：`bc409f4af8cb2d51b2f67341ad46637cfa5e66f3`；tag `water-w1-session-batch-base-20261018-r1`。接手时精确 HEAD、分支、路径、干净状态均一致。
- 实现/测试受测完整 SHA：`7d0035582db8457a47d6c611ff02427296ba641c`，只新增票面八文件。后续证据提交仅含本报告和 K 证据，产品/测试不再变动。
- 实际引擎：Codex；本会话系统标注 GPT-6，未暴露更细的模型后端标识。没有子代理或外部实现 CLI。参考 minimalist-ui 的排版/配色；按工单使用系统字体、无外部资源与依赖。

## 逐项需求与实际结果

| 要求 | 实现及证据 |
|---|---|
| 独占八文件、零 npm | prototypes/lab-reader 下 index.html/styles.css/app.mjs/model.mjs/server.mjs/README.md/tests/model.test.mjs/tests/browser.test.mjs；无安装、包锁或其它产品修改。 |
| 内存唯一入口 | startServer 必须有 bundle；无默认冻结数据、文件路径/CLI/环境覆盖。同步校验并捕获 UTF-8 JSON 字节，最多 33554432 字节，后续调用方变异不改变响应。 |
| 严格展示契约 | bundle 两字段、1..64 个唯一 scan_id、snapshot 六字段/版本；真实 I.assertReportView；四层状态、scope ID/顺序、entry-N 平铺、路径/大小/问题、H 八字段、四风险十一类别全部零桶/计数/totals 逐项校验。 |
| G 未知保护/sidecar | 全部 unknown/protected；source_facts 作为完整输入捕获，所有大小与来源一致；没有分类、去重或可回收量推算。展示一致性检查不替代 A/J 验证、来源证明或真实 scope 授权。 |
| 真实 I 复用 | model 静态 import/re-export ../report-reader/model.mjs；模型测试验证函数对象相同；/report-reader/model.mjs 原始响应逐字等于原文件，I 源码未复制/改动。 |
| 精确五字段摘要 | finding_count/protected_count/unknown_size_count 按整份 view；issue_count 来自 H 并核对 view；source_totals 独立 JSON 副本。无逐行求和/null→0。 |
| 两份真实调用方输入 | A 四快照（含 caller-alpha），B 三快照且不同顺序（含 caller-beta）；均走真实 startServer/HTTP/Chrome 页面，无拦截或 expected 冒充接线。启动后修改 caller 对象和数组，响应保持原值。 |
| 全快照选择/状态 | 默认首项，选项从 scan_id/case_id/status 来；真实切换 completed/partial/cancelled，重建 scope、清空筛选、更新问题/覆盖/计数/totals。取消仅展示来源状态。 |
| 筛选/排序/空态 | query/scope/tool/category/risk 组合 AND；BigInt 邻值 2^53/2^53+1、u64 最大值、稳定 ties、unknown 尾部；筛选计数与全快照计数分开，空态和重置实际交互通过。 |
| 来源/白名单/注入标签 | logical/allocated/method/recorded/skipped、非本页求和、每 scope 覆盖/相对根；H 三计数/四风险/十一类别全部含零桶。issue code/origin/operation；injected 标为受控注入记录，不冒称真实 ACL 失败。 |
| 完整详情/可访问 | 原生 dialog 显示全部 E finding 字段和所属 E scope、facts 相对根/kind/depth/identity。Enter 打开，Esc/关闭回原按钮焦点，关闭按钮获初始焦点。 |
| 文本安全 | 全动态文本用 textContent，无动态 HTML/URL/内联事件；长 Unicode/HTML 路径换行、路径仅文本。nc3 实改 innerHTML 后真实 DOM 发现 2 个 img/script 元素，目标断言红。 |
| 六固定路由 | 仅 127.0.0.1；未经 URL 规范化的 req.url 精确六路由；Host 错 403，非 GET/HEAD 405，查询串/编码/遍历/反斜杠/其它路径 404 固定 Report resource unavailable.。固定包及文件 realpath 检查，无目录列表。 |
| HTTP 头与关闭 | 严格完整 CSP/nosniff/no-CORS/no-store；六路由 GET/HEAD/POST/Host/查询 raw HTTP 均测。HEAD body 空且长度同 GET。Connection: close 避免服务关闭后复用旧 socket；关闭后 ECONNREFUSED。 |
| 双尺寸/只读范围 | 1440×1000、900×800 无横溢出，常驻受控夹具扫描 · 只读与非真实用户目录，滚动后 badge 仍可见。无文件输入/链接/扫描/取消/上传/导入/下载/删除/执行控件。 |
| 资源/异常 | 一次一个门，最多一个独立 Chrome；finally 关闭服务/浏览器，profiles 保留。没有外部请求、运行时异常或意外资源/安全错误；只排除 Chrome 默认 favicon 的预期本地 404，它仍被六路由拒绝。 |

精度/HTML变体严格同步 File 的 facts relative_path/depth/logical_bytes、report relative_path/size.logical_bytes、view relative_path/title/logical_bytes/size.logical_bytes，保持所有来源 totals 未知。代码注释、README、本报告明确它们是合成内存变体，不冒充物理 F 捕获。四个冻结来源是总控已验收 F/G/A/E/H 捕获加 J wire 封装，未称为 J 实现产物。

## 所有检查、退出码与失败

命令统一为 `node scripts/session-batch-check.mjs --task WATER-W1-K --mode <mode>`，final 行另带 `--final`。原 result 含完整 binary/argv/退出码；原 log 含完整 stdout/stderr。预期红 helper 退出 0，但真实五测试子进程必须退出 1。

| UTC 文件戳 / 模式 | helper 状态/退出 | 实际检查/测试退出 | 原始 result |
|---|---|---|---|
| `2026-10-17T16-02-42.614Z-31328` baseline（派前已有） | passed/0 | 依赖/I/独立 Chrome 空白页 | [2026-10-17T16-02-42.614Z-31328-baseline-result.json](../../acceptance/wave1/k/2026-10-17T16-02-42.614Z-31328-baseline-result.json) |
| `2026-10-17T16-07-56.009Z-25504` baseline（派前已有） | passed/0 | 依赖/I/独立 Chrome 空白页 | [2026-10-17T16-07-56.009Z-25504-baseline-result.json](../../acceptance/wave1/k/2026-10-17T16-07-56.009Z-25504-baseline-result.json) |
| `2026-10-17T16-34-54.684Z-40372` baseline | passed/0 | 依赖/I/独立 Chrome 空白页 | [2026-10-17T16-34-54.684Z-40372-baseline-result.json](../../acceptance/wave1/k/2026-10-17T16-34-54.684Z-40372-baseline-result.json) |
| `2026-10-17T16-38-26.202Z-33384` red-behavior | failed/1 | 未完整退出；子进程 null / ETIMEDOUT | [2026-10-17T16-38-26.202Z-33384-red-behavior-result.json](../../acceptance/wave1/k/2026-10-17T16-38-26.202Z-33384-red-behavior-result.json) |
| `2026-10-17T16-41-22.271Z-41176` red-behavior | passed/0 | 5 测试，0 绿/5 红；子进程 1 | [2026-10-17T16-41-22.271Z-41176-red-behavior-result.json](../../acceptance/wave1/k/2026-10-17T16-41-22.271Z-41176-red-behavior-result.json) |
| `2026-10-17T16-44-54.457Z-26140` suite | passed/0 | 5 测试，5 绿/0 红；子进程 0 | [2026-10-17T16-44-54.457Z-26140-suite-result.json](../../acceptance/wave1/k/2026-10-17T16-44-54.457Z-26140-suite-result.json) |
| `2026-10-17T16-46-06.759Z-22576` suite | passed/0 | 5 测试，5 绿/0 红；子进程 0 | [2026-10-17T16-46-06.759Z-22576-suite-result.json](../../acceptance/wave1/k/2026-10-17T16-46-06.759Z-22576-suite-result.json) |
| `2026-10-17T16-47-08.601Z-6508` red-nc1 | passed/0 | 5 测试，4 绿/1 红；子进程 1 | [2026-10-17T16-47-08.601Z-6508-red-nc1-result.json](../../acceptance/wave1/k/2026-10-17T16-47-08.601Z-6508-red-nc1-result.json) |
| `2026-10-17T16-47-25.284Z-5028` suite | passed/0 | 5 测试，5 绿/0 红；子进程 0 | [2026-10-17T16-47-25.284Z-5028-suite-result.json](../../acceptance/wave1/k/2026-10-17T16-47-25.284Z-5028-suite-result.json) |
| `2026-10-17T16-48-40.839Z-31068` red-nc2 | passed/0 | 5 测试，4 绿/1 红；子进程 1 | [2026-10-17T16-48-40.839Z-31068-red-nc2-result.json](../../acceptance/wave1/k/2026-10-17T16-48-40.839Z-31068-red-nc2-result.json) |
| `2026-10-17T16-48-54.696Z-11172` suite | failed/1 | 5 测试，4 绿/1 红；子进程 1 | [2026-10-17T16-48-54.696Z-11172-suite-result.json](../../acceptance/wave1/k/2026-10-17T16-48-54.696Z-11172-suite-result.json) |
| `2026-10-17T16-50-15.664Z-31696` red-behavior | passed/0 | 5 测试，0 绿/5 红；子进程 1 | [2026-10-17T16-50-15.664Z-31696-red-behavior-result.json](../../acceptance/wave1/k/2026-10-17T16-50-15.664Z-31696-red-behavior-result.json) |
| `2026-10-17T16-50-24.859Z-6972` suite | passed/0 | 5 测试，5 绿/0 红；子进程 0 | [2026-10-17T16-50-24.859Z-6972-suite-result.json](../../acceptance/wave1/k/2026-10-17T16-50-24.859Z-6972-suite-result.json) |
| `2026-10-17T16-50-59.219Z-41532` red-nc1 | passed/0 | 5 测试，4 绿/1 红；子进程 1 | [2026-10-17T16-50-59.219Z-41532-red-nc1-result.json](../../acceptance/wave1/k/2026-10-17T16-50-59.219Z-41532-red-nc1-result.json) |
| `2026-10-17T16-51-10.313Z-11440` suite | passed/0 | 5 测试，5 绿/0 红；子进程 0 | [2026-10-17T16-51-10.313Z-11440-suite-result.json](../../acceptance/wave1/k/2026-10-17T16-51-10.313Z-11440-suite-result.json) |
| `2026-10-17T16-51-32.086Z-38336` red-nc2 | passed/0 | 5 测试，4 绿/1 红；子进程 1 | [2026-10-17T16-51-32.086Z-38336-red-nc2-result.json](../../acceptance/wave1/k/2026-10-17T16-51-32.086Z-38336-red-nc2-result.json) |
| `2026-10-17T16-51-47.760Z-8668` suite | passed/0 | 5 测试，5 绿/0 红；子进程 0 | [2026-10-17T16-51-47.760Z-8668-suite-result.json](../../acceptance/wave1/k/2026-10-17T16-51-47.760Z-8668-suite-result.json) |
| `2026-10-17T16-52-05.868Z-40856` red-nc3 | passed/0 | 5 测试，3 绿/2 红；子进程 1 | [2026-10-17T16-52-05.868Z-40856-red-nc3-result.json](../../acceptance/wave1/k/2026-10-17T16-52-05.868Z-40856-red-nc3-result.json) |
| `2026-10-17T16-52-17.657Z-33860` suite | passed/0 | 5 测试，5 绿/0 红；子进程 0 | [2026-10-17T16-52-17.657Z-33860-suite-result.json](../../acceptance/wave1/k/2026-10-17T16-52-17.657Z-33860-suite-result.json) |
| `2026-10-17T16-53-05.029Z-21184` check --final | passed/0 | 五个模块语法检查 | [2026-10-17T16-53-05.029Z-21184-check-result.json](../../acceptance/wave1/k/2026-10-17T16-53-05.029Z-21184-check-result.json) |
| `2026-10-17T16-53-15.989Z-31588` test --final | passed/0 | 3 测试，3 绿/0 红；子进程 0 | [2026-10-17T16-53-15.989Z-31588-test-result.json](../../acceptance/wave1/k/2026-10-17T16-53-15.989Z-31588-test-result.json) |
| `2026-10-17T16-53-20.321Z-36164` browser --final | passed/0 | 2 测试，2 绿/0 红；子进程 0 | [2026-10-17T16-53-20.321Z-36164-browser-result.json](../../acceptance/wave1/k/2026-10-17T16-53-20.321Z-36164-browser-result.json) |

失败及修正全部保留：

1. `16-38-26.202Z-33384-red-behavior`：初始非法输入断言后没有关闭骨架意外返回的服务器，子进程 ETIMEDOUT（exit=null），helper exit=1，无效红。正式先红之前补齐测试 finally 清理，并仅排除 Chrome 隐式 favicon 的预期本地 404。
2. `16-41-22.271Z-41176-red-behavior`：实现前可运行骨架上五测均红、真实退出 1、K_BEHAVIOR。此条有效先红之后，两个测试文件字节始终保持不变。
3. `16-48-54.696Z-11172-suite`：旧 nc2 后原字节恢复为 4 绿/1 红，exit=1；Node keep-alive 复用旧 socket 导致服务关闭后 ECONNRESET，而断言要求 ECONNREFUSED。保留原断言，真实服务增加 Connection: close。
4. 生产字节改变后，`16-50-15.664Z` 用归档的同一五份骨架字节再跑行为红，恢复最终实现，然后重做 nc1/nc2/nc3 全部红/恢复五测。这次重跑明确发生在实现后，不冒充最初先红；实现前先红由第2项独立证据证明。
5. 资料定位以 PROVENANCE.md 探测失败，实际为 PROVENANCE.json，已读取；无匹配 rg 退出1不当测试结果。回执首次经 PowerShell 管道写入丢失中文，提交前发现，已显式 UTF-8 重写并复读核对。上述均不是产品测试通过证据。
6. 证据暂存后附加的 `git diff --cached --check` 退出2：原始 TAP 失败日志中的缩进空白行含尾随空格（如有效先红 expected-red.log 第14/22行、nc3 expected-red.log 第14/40行）。归档脚本因此退出1；359份原文件及其Git blob逐项哈希此前已经全部通过。按原字节保留规则不改日志，不把这一格式告警称作产品门失败；自写报告/inventory单独空白检查通过。

最终 check/test/browser 在同一干净 SHA `7d0035582db8457a47d6c611ff02427296ba641c` 串行通过，分别为五语法/三模型/两浏览器，全部退出0。每门 proofAudit 核每个最新有效红在下个有效红之前已有最终当前生产字节的五测恢复绿。

## 负控、原/坏/恢复哈希与原日志

最终生产组合 SHA-256：`bca77f115db375a2c4579071953186bec6c2e4e6ec6fc4547a2df0ed665b693f`。

有效红/恢复/final 测试组合 SHA-256：`c25d9522a0e3d9560fefb1efb7a8687a9b5f5405a60e2e816e6a0071af90d3bc`。模型文件 `bce4afc09aa6273994f785819ea1e1b359a74a5525ce4173d9ecfb912b616917`；浏览器文件 `673ad63fe31190469f6b308dce5f985268488b77c4e1c783e7b6f4d7479e5a21`。

| 项 | 实际改坏行为/目标断言 | 完整五测红 / 恢复绿 |
|---|---|---|
| behavior | 归档可运行骨架 / K_BEHAVIOR | [2026-10-17T16-50-15.664Z-31696-red-behavior-result.json](../../acceptance/wave1/k/2026-10-17T16-50-15.664Z-31696-red-behavior-result.json) / [2026-10-17T16-50-24.859Z-6972-suite-result.json](../../acceptance/wave1/k/2026-10-17T16-50-24.859Z-6972-suite-result.json) |
| nc1 | server 捕获 snapshots.slice(0,1) / K_SERVER_INPUT | [2026-10-17T16-50-59.219Z-41532-red-nc1-result.json](../../acceptance/wave1/k/2026-10-17T16-50-59.219Z-41532-red-nc1-result.json) / [2026-10-17T16-51-10.313Z-11440-suite-result.json](../../acceptance/wave1/k/2026-10-17T16-51-10.313Z-11440-suite-result.json) |
| nc2 | 真实 app 显示 logical/allocated null→字符串0 / K_TOTAL_UNKNOWN | [2026-10-17T16-51-32.086Z-38336-red-nc2-result.json](../../acceptance/wave1/k/2026-10-17T16-51-32.086Z-38336-red-nc2-result.json) / [2026-10-17T16-51-47.760Z-8668-suite-result.json](../../acceptance/wave1/k/2026-10-17T16-51-47.760Z-8668-suite-result.json) |
| nc3 | 真实 node 动态构造 textContent→innerHTML / K_TEXT_LITERAL | [2026-10-17T16-52-05.868Z-40856-red-nc3-result.json](../../acceptance/wave1/k/2026-10-17T16-52-05.868Z-40856-red-nc3-result.json) / [2026-10-17T16-52-17.657Z-33860-suite-result.json](../../acceptance/wave1/k/2026-10-17T16-52-17.657Z-33860-suite-result.json) |

nc1 真实 HTTP 丢快照断言红；nc2 真实页面显示来源总量0 B/逻辑0/分配0导致未知断言红；nc3 两浏览器的无 img/script 断言均为2≠0，非仅 CSP 日志或超时。红完整日志为同戳 `-expected-red.log`，恢复为同戳 `-suite-1.log`。

| 目标 | 原 SHA-256 | 坏 SHA-256 | 恢复 SHA-256 |
|---|---|---|---|
| nc1 `prototypes/lab-reader/server.mjs` | `cf92f6af5872020f0ee0e6db85d20b198e5e33c814b2d652fc58db10180567e4` | `1c0aecd0a0a6c24ab886e605113330251bb9d8bef95e2a080cf0afe4edeaa09e` | `cf92f6af5872020f0ee0e6db85d20b198e5e33c814b2d652fc58db10180567e4` |
| nc2 `prototypes/lab-reader/app.mjs` | `b64832f02b98242d358e641fb3639a337e9ebd5f55708ff4cc4b9a6d8e56aba3` | `ed4b5fa4d3f37d0f8edb033a569653de4f76c6aeb94dd0d6c726d2dee57d08ef` | `b64832f02b98242d358e641fb3639a337e9ebd5f55708ff4cc4b9a6d8e56aba3` |
| nc3 `prototypes/lab-reader/app.mjs` | `b64832f02b98242d358e641fb3639a337e9ebd5f55708ff4cc4b9a6d8e56aba3` | `e39bc37e41adebe21f8b2efc967f019918b9d61394c2c7c6300494fb6ab34820` | `b64832f02b98242d358e641fb3639a337e9ebd5f55708ff4cc4b9a6d8e56aba3` |

行为重跑五份骨架/恢复的逐文件哈希及源/测试快照、全部359份文件的长度/哈希，见 [EVIDENCE-INVENTORY.json](../../acceptance/wave1/k/EVIDENCE-INVENTORY.json)；全部 helper 原字节归档，未只留错误摘要。

## 实看最终三张截图

最终 browser 门重新生成三图，helper 核 mtime 并留带戳副本。以下三张已逐张实际查看：

- [2026-10-17T16-53-20.321Z-36164-browser-lab-reader-1440x1000.png](../../acceptance/wave1/k/2026-10-17T16-53-20.321Z-36164-browser-lab-reader-1440x1000.png)：caller-alpha / project-markers / completed，计数6、6、2、0；来源逻辑/分配未知、unavailable、非本页求和、记录6/跳过0；scope-1 complete/相对根scope；桌面筛选和列表可读。15.9 EiB 是明确合成内存极值。
- [2026-10-17T16-53-20.321Z-36164-browser-lab-reader-900x800.png](../../acceptance/wave1/k/2026-10-17T16-53-20.321Z-36164-browser-lab-reader-900x800.png)：会话选择移到标题下，四计数仍可读，来源/覆盖两列保留，筛选区在下方继续纵向滚动；无左右裁切或横向滚动；常驻只读和非真实用户目录可见。
- [2026-10-17T16-53-20.321Z-36164-browser-lab-reader-detail.png](../../acceptance/wave1/k/2026-10-17T16-53-20.321Z-36164-browser-lab-reader-detail.png)：右侧原生对话框，关闭按钮焦点框可见；`html/<img src=x onerror=literal>` 为字面标题；scope JSON、evidence/evidence_items、entry-2、精确9007199254740993可见；背景长Unicode/script路径换行。kind/depth/identity在向下滚动区域，已核DOM内容，未声称顶部截图显示全部字段。

## 范围、归档与未验证项

- 65新冻结/六旧锁共132唯一文件逐文件哈希一致；A–I九产品目录 tree 与基线相同，记录在 inventory。根Cargo/helper/契约/工单/台账/上游未改。
- 原字节复制359份helper文件：22 JSON、180 log、133 txt、24 png，共3341587字节；含两份派前已有baseline，明确不冒称本会话执行。另新增一个EVIDENCE-INVENTORY.json和本报告。
- 显式文件名分批add，log用-f；逐个验证归档及Git暂存blob哈希。没有添加整目录、删除/清理.local、profile或夹具。
- 无F/J物理fixture权限；仅固定静态文件、冻结测试输入、内存bundle及本树日志/独立Chrome状态。没有真实用户数据/凭证读取、npm安装、push/merge/rebase/发布。
- 未验证：真实J→K页面、真实用户scope、分类/工具适配、Tauri/桌面/IPC、macOS、生产竞态及删除。Windows页面通过不代替这些验收。
- 32MiB上限有真实代码检查，当前有界样本未专门造>32MiB；固定包路径检查不构成生产链接竞态保证。仅已验证JSON值，getter/proxy/循环不在契约。
- 本票无已知未处理产品失败。提交后停止；由总控将真实J输出直接传给K.startServer另验页面，本会话不继续其它任务。
