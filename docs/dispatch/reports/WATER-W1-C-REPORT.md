WATER-W1-C 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/c/docs/dispatch/reports/WATER-W1-C-REPORT.md

## 交付定位

本次按用户明确转贴的 WATER-W1-C 票执行，只交付固定虚构数据的只读浏览器原型。执行者完成状态为 **SUBMITTED，等待总控源码、交互及视觉独立验收**，不代表产品集成或发布通过。未编辑主线台账，未 push、merge、rebase 或启动其他实现者。

| 项目 | 实际值 |
|---|---|
| 权威票 | `F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W1-C-PROTOTYPE-20261017.md` |
| 工作树 | `F:/new/smaltalk/water/.worktrees/c` |
| 分支 | `worker/water-w1-c` |
| 精确基线 | `e92f39647c91d9ce077d592583c3352626d3402b` |
| 受测实现提交 | **`5b16904000e5102227a4b8ff166c284227688310`** |
| 最终门环境 | Windows；Node `v24.16.0`；冻结 `openBrowser` 启动本机既有 Chromium 浏览器的新隔离 profile |
| 实际执行引擎 / 模型 | 本会话 Codex；系统标识为基于 GPT-6，精确模型 ID / 快照未向会话暴露，未猜测细分型号 |
| 子代理 / 依赖安装 | 均无 |

实现提交只含 `prototypes/readonly-dashboard/` 下票面允许的 9 个文件。后续提交只含本报告及 `docs/acceptance/wave1/c/` 证据，不夹带产品变更；最终门均绑定上方完整实现 SHA。

## 实现与需求逐项对照

| 要求 | 实际实现及验证 |
|---|---|
| 单页桌面工具界面 | `index.html`、`styles.css`：示例概览、筛选区、列表、详情；系统字体、中性色、少量蓝色强调与文字风险，无营销区或外部视觉资源 |
| 固定 8 条虚构 finding | `demo-data.json` 从冻结 fixture 逐字节复制；SHA-256 为 `e9520eae39d95ac9ac998862c11b382369e35384e305d7db746ea0d9bf92481c`；包含包缓存、模型、历史、向量库、未知容量和大数边界 |
| 持续的演示标识 | 页头固定显示“示例数据 · 只读演示”；滚动后仍可见；打开详情时面板内另有同文标识，避免面板遮住页头标识 |
| 搜索 | 对名称和相对路径做不区分大小写的普通子串匹配；不去掉字面空格，不使用 regex 或 HTML；实际浏览器输入 `QWEN`、`DEMO-PROJECT/HISTORY`、`[`、`^.*$` 和 HTML 字符串验证 |
| 工具 / 类别 / 风险组合筛选 | 三项精确匹配并与搜索同时生效；工具、类别选项从固定数据产生；纯测试枚举全部组合，浏览器组合筛出 `hf-qwen` 后改风险产生空结果 |
| 大小与名称排序 | `selectFindings` 用 BigInt 比较大小；升降序均测；等值稳定；名称按 `title.toLowerCase()` 普通 JS 顺序，不依赖 locale；null 在所有排序中末尾 |
| 未知与容量口径 | null 显示“未知”；列表列头、工具提示及详情标明逻辑大小；详情给出精确字节值；不把未知当 0 B |
| 字节格式 | `formatBytes` 全程整数算术，二进制 B 到 EiB，截断至最多一位小数并省略 `.0`；例如 1126 B → 1 KiB、1127 B → 1.1 KiB；大数 A/B 均显示 8 PiB，但详情保留相差 1 B 的原值 |
| 无虚假空间汇总 | `summarize` 返回 count=8、protected_count=6、unknown_size_count=1；`logical_total_bytes`、`reclaimable_bytes` 恒为 null；UI 为“待去重 / 未估算”，不累加可能重叠数据 |
| 纯函数不修改输入 | 返回新数组；排序复制输入；深比较与递归冻结输入测试通过；不读取环境或文件系统 |
| 空结果及重置 | 有实际空态文案和重置按钮；空态重置及筛选区重置均真实操作；恢复 8 项、清空筛选和默认降序，保留当前示例状态 |
| partial / cancelled | 从冻结 scenarios 选择；partial 显示 `permission_denied` 和容量未知，cancelled 显示结果不完整；切换不会伪装新扫描或改变固定 finding |
| 详情及键盘 | 原生 modal dialog 展示用途、路径、工具、容量、识别依据、活跃状态、恢复前提和保护原因；Enter 打开，Esc 与关闭按钮关闭；Esc 回焦原按钮；表单有 label、控件有可见焦点样式 |
| 安全文本渲染 | `createElement`、`textContent`、`replaceChildren`；无 innerHTML、eval、任意路径输入或 shell 桥接 |
| 本地资源与 CSP | CSP 默认拒绝，脚本 / 样式 / fetch 仅同源；图片、字体、对象、表单和 frame 嵌入禁用；真实网络事件只见本地 HTML/CSS/JS/JSON；无外部资源和 CSP 违规事件 |
| 服务接口及边界 | `startServer({port:0})` 返回 `{url,close}`；绑定 127.0.0.1；close 可 await、可重复调用；只提供精确资源白名单，详见下节 |
| 无文件操作入口 | 控件仅浏览、筛选、排序、重置及示例状态切换；无清理、删除、迁移、扫描、上传、下载或用户目录选择入口 |
| 启动与停止说明 | 原型 `README` 给出 Node 启动、终端 Ctrl+C 停止、定向检查和容量口径；不自动打开普通浏览器、不后台常驻 |

## 定向验证与有效行为红

开工前已读项目必读文件、AGENTS、工作流、ADR-003、权威票、并行纪律、冻结 SPEC / fixture / lock、控制面 manifest；未读取 A/B 在途实现。baseline 对精确 SHA、分支、洁净、Node24 及冻结哈希通过；既有浏览器隔离空白探针通过。见 [baseline.json](../../acceptance/wave1/c/baseline.json)。

先写 5 个模型测试并运行合法但未实现需求的初始模型，得到 **1 passed / 4 failed**。失败为 BigInt 升序边界、组合筛选、null 格式与汇总字段的 AssertionError；不是缺文件或编译错误。见 [red-model.txt](../../acceptance/wave1/c/red-model.txt)。

随后先写 2 个真实浏览器测试，静态控件尚未接线时得到 **0 passed / 2 failed**，均为实际页面 finding 数量 `0 !== 8`。见 [red-browser.txt](../../acceptance/wave1/c/red-browser.txt)。之后完成 `app.mjs` 接线。

自编浏览器驱动开发中还修正了两处测量 / 输入错误，失败日志保留于 [browser-driver-corrections.txt](../../acceptance/wave1/c/browser-driver-corrections.txt)：

- 原 Enter 驱动仅发 keyDown / keyUp，未发字符，原生按钮不激活；补充 CDP 的 `text: '\r'` 和 `unmodifiedText: '\r'`。实际调试确认焦点原在详情按钮，补齐后原生 dialog 打开并聚焦关闭按钮。未为产品添加测试行为分支。
- 原“`scrollWidth === innerWidth`”会把 Windows 15px 纵向滚动条误判为失败（1425 != 1440）。改为同时确认请求的 viewport 尺寸正确、文档及 body 宽度不超出 `clientWidth`，并逐元素检查边界；详情打开时也检查实际可用宽度。没有放弃无横向溢出的要求，没有更改冻结工具、超时或测试清单。

## 最终门：同一干净实现 SHA

以下命令均在分配的 C 树串行执行，前后 HEAD 均为 `5b16904000e5102227a4b8ff166c284227688310`、status 均为空。证据复制发生在全部最终门通过之后。

| 命令 | 退出码 / 结果 | 回执 / 日志 |
|---|---|---|
| `node scripts/parallel-check.mjs --task WATER-W1-C --mode check --final` | 0；5 个点名模块语法通过 | [final-check.json](../../acceptance/wave1/c/final-check.json)，`final-check-0.txt` 至 `final-check-4.txt` |
| `node scripts/parallel-check.mjs --task WATER-W1-C --mode test --final` | 0；5 passed，0 failed / skipped / todo / cancelled | [final-model.json](../../acceptance/wave1/c/final-model.json)、[final-model.txt](../../acceptance/wave1/c/final-model.txt) |
| `node scripts/parallel-check.mjs --task WATER-W1-C --mode browser --final`，首次 | 1；1 passed / 1 failed；第一例 `Page.navigate` CDP 超时，第二例通过 | [首次回执](../../acceptance/wave1/c/final-browser-first-attempt.json)、[首次日志](../../acceptance/wave1/c/final-browser-first-attempt.txt) |
| 同一浏览器命令，未修改任何文件后重跑 | 0；2 passed，0 failed / skipped / todo / cancelled | [final-browser.json](../../acceptance/wave1/c/final-browser.json)、[final-browser.txt](../../acceptance/wave1/c/final-browser.txt) |

首次最终浏览器失败为冻结工具的 10 秒 `Page.navigate` 超时，未作为有效行为红或负控。保留失败原始记录，未放宽超时、重写检查器或添加自动重试。相同干净 SHA 的手动重跑通过；超时根因未确定，不能据此宣称浏览器验证毫无偶发性。

5 个模型顶层测试精确为 `prototype_bigint_order`、`prototype_filters`、`prototype_format_and_unknown`、`prototype_no_mutation`、`prototype_no_false_reclaim`。2 个浏览器顶层测试精确为 `prototype_live_interactions`、`prototype_scope_and_layout`。全部测试经过公开函数或实际页面接线；浏览器测试未通过直接调用 model 代替 UI。

## 三项负控与恢复

对真正的 `model.mjs` 逻辑逐项变异；每次执行完整 5 项模型测试，确认指定 AssertionError 后，在 finally 内用原 Buffer 恢复，逐字节比较并核对 SHA-256。没有测试专用开关，变异未提交。

原文件及每次恢复后的 SHA-256 均为：

`dab662d8ab374092fe6c28947b11b95d1cbb090c6d74059f2bf72d2fa29da6b9`

| 真实变异 | 实际指定失败 | 变异文件 SHA-256 | 日志 |
|---|---|---|---|
| BigInt 比较改 Number | `prototype_bigint_order`，升序 B 必须在 A 前；退出 1 | `3eaff808c6ee31f7cd8a42c82cd4b875ecc135d30181a5d73dc8a36aa1d24913` | [negative-bigint-number.txt](../../acceptance/wave1/c/negative-bigint-number.txt) |
| `[...findings].sort` 改 `findings.sort` | `prototype_no_mutation`，输入深比较失败；退出 1 | `da2feb6472aea750e75ba088bd0f2fe2f08c0b88e55912b2116d6ab47b26e05a` | [negative-in-place-sort.txt](../../acceptance/wave1/c/negative-in-place-sort.txt) |
| summary 回收量从 null 改 `'123'` | `prototype_no_false_reclaim`，null 字段深比较失败；退出 1 | `8480fe31826445b4aa1c608cf9aecad3e36ae643bcf117d5bed4667d1f5873e3` | [negative-false-reclaim.txt](../../acceptance/wave1/c/negative-false-reclaim.txt) |

完整变异位置、命令、断言、恢复布尔值及哈希见 [negative-controls.json](../../acceptance/wave1/c/negative-controls.json)。三次失败均非语法错误、缺模块、TypeError 或超时；恢复后提交实现并重新执行最终门。

## 真实 DOM、截图与视觉结论

最终真实 DOM 观测见 [live-dom.json](../../acceptance/wave1/c/live-dom.json) 及 [layout-dom.json](../../acceptance/wave1/c/layout-dom.json)。

- 升序为 `agent-history, uv-build, pip-wheels, hf-qwen, ollama-local, large-b, large-a, vector-data`；降序 A/B 在前、未知项最后。
- `QWEN + huggingface + model + protected` 得到 1 项；风险改 review 后空结果；两个重置入口都恢复全部 8 项。路径搜索大小写不敏感，特殊搜索串不产生正则或图片元素。
- 会话详情显示精确 `268435456 B`、近期活跃、恢复未知、`unique_asset`；Esc 关闭后 `focusReturned=true`。知识库行与详情显示“未知”和 `incomplete_evidence`。
- cancelled 提示“结果不完整”，partial 提示 `permission_denied`；切换状态后仍为 8 条固定数据。
- 1440×1000：文档 / body / clientWidth 均 1425；900×800：三者均 885；差值为纵向滚动条。逐元素 overflow 数组均为空；详情打开后也未超宽。
- 两种 viewport 的真实页面请求均只有同一 127.0.0.1 临时 origin 的 HTML、CSS、app、model 和 JSON；运行时异常、CSP 安全违规事件与外部资产数组均为空；file input 数量为 0。

以下 **最终门生成的 PNG 已实际用图像查看工具打开并目视检查**，不是仅根据 DOM 推测：

| 截图 | 实际看到的画面 |
|---|---|
| [dashboard-1440x1000.png](../../acceptance/wave1/c/dashboard-1440x1000.png) | 白色页头与蓝色只读标识；灰底四格总览为 8、6、待去重、未估算；琥珀色 partial 提示；横排搜索 / 筛选与清晰列头；A/B、Ollama、HF、pip 等前部条目可见，下方条目需纵向滚动 |
| [dashboard-900x800.png](../../acceptance/wave1/c/dashboard-900x800.png) | 同一页头与总览保留；搜索与重置一行、三项筛选下一行；列表保持五列且无横向裁切；首行及第二行顶部可见，查看其余条目需要纵向滚动，没有伪称一屏展示全部 |
| [detail-1440x1000.png](../../acceptance/wave1/c/detail-1440x1000.png) | 右侧白色知识库详情面板、背后列表遮罩；面板内只读标识可见；路径、未知大小、容量口径、权限证据、恢复未知及保护原因均可阅读；顶部关闭按钮、底部 Esc 提示可见 |

截图原路径为本树 `.local/browser-lab/` 下同名文件，最终通过后才逐字节复制进证据目录。三张是当前 Windows Chromium 原型画面，不是 macOS、Tauri 或真实磁盘结果。900px 下仍有可读性与密度进一步评审的空间，本票没有承诺无需纵向滚动。

## 静态服务与数据边界

`server.mjs` 仅使用 Node 内置模块；只绑定 `127.0.0.1` 和指定端口 / 自动端口，不绑定全网地址。仅允许 GET/HEAD 的 `/`、`/index.html`、`/styles.css`、`/app.mjs`、`/model.mjs`、`/demo-data.json`；校验 Host、精确原始请求路径及文件 realpath，不做目录枚举、不接受路径参数、不返回环境信息。

真实 HTTP 原始路径请求验证 17 项拒绝条件，含父目录、普通 / 编码 / 双编码穿越、反斜杠、NUL、仓库契约路径、`.git`、`.env`、tests、server 源码、查询参数，均返回 404 和固定通用正文；POST 返回 405，外部 Host 返回 403，HEAD 返回 200 且正文为空。源 fixture 与服务 JSON 同值。

所有测试都用自己的临时服务和冻结 `openBrowser`；try/finally 关闭二者，关闭后请求验证 `ECONNREFUSED`。没有使用用户浏览器 profile、`--no-sandbox`、下载浏览器、后台常驻服务或杀用户进程。隔离 profile 仅保留在被忽略的 `.local` 内，未执行通用递归清理。

## 证据、假设与未验证范围

证据根：`F:/new/smaltalk/water/.worktrees/c/docs/acceptance/wave1/c/`。原始检查日志根：本树 `.local/checks/WATER-W1-C/`。原始截图与浏览器 profile 根：本树 `.local/browser-lab/`。[evidence-manifest.json](../../acceptance/wave1/c/evidence-manifest.json) 逐项记录 28 个复制文件的来源、大小与 SHA-256，含最终回执、失败记录、负控及 PNG。

证据日志保留 Node TAP 断言输出的原始空白，整份证据的 `git diff --check` 会提示这些空白行；没有为去除格式告警改写日志。产品代码与本报告单独通过空白检查。

未改冻结协议、检查器、根 Cargo/锁/package.json、其他工作树、上游或全局配置。未增加额外包、vendor 依赖或超出票面文件。没有越界申请，没有调用扫描、清理、模型/API 服务，没有读取 HOME 或选择用户目录。

风险判断、用途与恢复说明仅为固定示例的展示解释；不构成真实适配器或删除授权。model 输入假设遵守冻结展示 fixture，未开发任意外部报告的通用验证器；本地资源白名单与 CSP 是原型边界，不冒充正式产品安全认证。

尚未验证：macOS、Tauri/WebView、Rust/真实 ScanReport、B catalog 接线、真实扫描 / 分类 / 逻辑及分配空间测量 / 释放空间、恢复能力、打包和发布。首次最终浏览器导航超时的具体根因未查明；同一提交重跑通过，原始失败保留供总控复核。

当前无阻止本票提交的已知问题；剩余为总控独立验收及后续另立集成任务。本回执提交完成后停止修改。
