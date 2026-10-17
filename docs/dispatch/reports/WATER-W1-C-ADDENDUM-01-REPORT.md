WATER-W1-C 补充单01 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/c/docs/dispatch/reports/WATER-W1-C-ADDENDUM-01-REPORT.md

## 提交与范围

本单修复公开 `selectFindings` 在 `name_asc` 下未排序未知容量组的问题。执行者交回状态为 **SUBMITTED，等待总控独立验收**；未集成主线或发布。

| 项 | 实际值 |
|---|---|
| 权威补单 | `F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W1-C-ADDENDUM-01-20261017.md` |
| 工作树 / 分支 | `F:/new/smaltalk/water/.worktrees/c` / `worker/water-w1-c` |
| 原基线 | `e92f39647c91d9ce077d592583c3352626d3402b`，未改变 |
| 首次续做起点 | `93e2509882f3090883c8ccaedf2fb30e83dba49a`，启动时精确匹配且干净 |
| 本单受测实现 SHA | **`973020e3027e99085be514d38523a5a88954df3e`** |
| 实际环境 | Windows，Node `v24.16.0`，冻结 `openBrowser` 启动既有浏览器的新隔离 profile |
| 实际引擎 / 模型 | Codex / 系统标识为基于 GPT-6；精确模型 ID / 快照未暴露，不猜测细分型号 |
| 子代理 / 安装依赖 | 无 |

开工已读取项目必读、主检出 AGENTS、原票及补单、总控验收报告、manifest、并行纪律、ADR-003 和冻结 SPEC；核对分支、绝对目录、起点、洁净、祖先关系、Node24 及 9 项冻结哈希。按补单要求**未重跑 baseline**。证据见 [start.json](../../acceptance/wave1/c/addendum-01/start.json)。

实现提交仅改 `prototypes/readonly-dashboard/model.mjs` 和现有 `tests/model.test.mjs`。README 无需修改。HTML/CSS/app/server/browser 测试、冻结 fixture、旧报告及旧证据没有变化；本单的新证据与报告单独提交。见 [source-audit.json](../../acceptance/wave1/c/addendum-01/source-audit.json)。

## 修复与新增断言

旧比较器在双方容量均为 null 时直接返回 0，后面的名称比较无法运行。修复后仅在一方未知时将未知项放末尾；双方已知或双方未知时，`name_asc` 均按 `title.toLowerCase()` 的普通 JS 字符串顺序比较。名称相等返回 0，稳定保留输入顺序。大小排序中双方未知仍返回 0，已知大小继续使用 BigInt；没有引入 locale、Number 或浮点转换。

新增回归全部位于原 `prototype_bigint_order`，使用同形 finding 辅助函数，不修改演示 fixture：

- 总控三项输入 `unknown-z(z/null), unknown-a(a/null), known(m/1)`，名称排序必须得到 `known, unknown-a, unknown-z`。
- 七项混合输入同时覆盖已知组和未知组名称升序：已知组 `B,b,m`、未知组 `a,A,z,Z`；大小写不敏感的同名项在两组内均稳定。
- 同一七项输入的 `size_asc` 与 `size_desc`：已知值双向正确、等值稳定，四项未知均在末尾并保持原输入顺序 `z,a,A,Z`。
- 三种排序后构造输入与原深拷贝一致。

原五个模型顶层测试名不变：`prototype_bigint_order`、`prototype_filters`、`prototype_format_and_unknown`、`prototype_no_mutation`、`prototype_no_false_reclaim`。原两个浏览器顶层测试及其源码不变。原 BigInt 双向边界、筛选、格式、深冻结输入和两个空间字段为 null 的断言全部保留并通过。

## 先红、修复与 NC-04

在未修复的旧 model 上先加入回归，执行：

`node scripts/parallel-check.mjs --task WATER-W1-C --mode test`

结果退出 1，**4 passed / 1 failed**，唯一失败为 `prototype_bigint_order` 的新断言 `name_asc must sort titles within the unknown-size group`。实际 `known,unknown-z,unknown-a`，预期 `known,unknown-a,unknown-z`。是合法输入产生的目标 AssertionError，非缺文件、语法或超时。见 [red-model.json](../../acceptance/wave1/c/addendum-01/red-model.json) 和 [red-model.txt](../../acceptance/wave1/c/addendum-01/red-model.txt)。

修复后同命令退出 0、5 passed。见 [fixed-model.json](../../acceptance/wave1/c/addendum-01/fixed-model.json) 和 [fixed-model.txt](../../acceptance/wave1/c/addendum-01/fixed-model.txt)。

随后新增 **NC-04**：在真正比较器中、未知标识赋值之后临时插入 `if (aUnknown && bUnknown) return 0;`，恢复缺陷行为；执行完整五项测试：

`node --test --test-concurrency=1 --test-reporter=tap prototypes/readonly-dashboard/tests/model.test.mjs`

退出 1、4 passed / 1 failed，唯一失败为上述新名称断言；0 skipped / todo / cancelled。不是 TypeError、缺模块或超时，没有测试开关。finally 用原 Buffer 按原字节恢复，逐字节比较为 true，并核对三个 SHA-256：

| 状态 | SHA-256 |
|---|---|
| 变异前 | `ca2cb39e5ccf3e50172a67c8d5d7e5f060c1e59b9db48b9f469040207922c085` |
| NC-04 变异 | `1d568ed9bb1d9c5957abd33bd7b120f9012560837074ec1c6019ef320d363084` |
| 原字节恢复后 | `ca2cb39e5ccf3e50172a67c8d5d7e5f060c1e59b9db48b9f469040207922c085` |

变异位置、命令、断言、三哈希及恢复标识见 [nc-04.json](../../acceptance/wave1/c/addendum-01/nc-04.json)，完整失败输出见 [nc-04.txt](../../acceptance/wave1/c/addendum-01/nc-04.txt)。恢复后再次跑完整 helper test，退出 0、5 passed；见 [restored-model.json](../../acceptance/wave1/c/addendum-01/restored-model.json) 和 [restored-model.txt](../../acceptance/wave1/c/addendum-01/restored-model.txt)。按补单要求未重做原三项负控。

## 三个最终门

实现与测试提交后，在同一干净 SHA **`973020e3027e99085be514d38523a5a88954df3e`** 上依次运行，下列回执的 before/after HEAD 一致且 status 均为空：

| 命令 | 结果 | 回执及日志 |
|---|---|---|
| `node scripts/parallel-check.mjs --task WATER-W1-C --mode check --final` | 退出 0，五个点名模块语法通过 | [final-check.json](../../acceptance/wave1/c/addendum-01/final-check.json)，同目录 `final-check-0.txt` 至 `final-check-4.txt` |
| `node scripts/parallel-check.mjs --task WATER-W1-C --mode test --final` | 退出 0，5 passed；0 failed / skipped / todo / cancelled | [final-model.json](../../acceptance/wave1/c/addendum-01/final-model.json)、[final-model.txt](../../acceptance/wave1/c/addendum-01/final-model.txt) |
| `node scripts/parallel-check.mjs --task WATER-W1-C --mode browser --final` | 退出 0，2 passed；0 failed / skipped / todo / cancelled | [final-browser.json](../../acceptance/wave1/c/addendum-01/final-browser.json)、[final-browser.txt](../../acceptance/wave1/c/addendum-01/final-browser.txt) |

本轮三个最终门均首次通过，没有导航超时、手动重跑、静默重试或其他非预期失败。全部失败尝试只有上述有效先红与 NC-04，均已保留。原先曾出现的浏览器导航超时属于历史记录，不能因本轮通过推断其根因已解决。未修改冻结工具、超时或断言，未跳过测试。

## 真实浏览器与截图

原浏览器测试在该实现 SHA 上真实操作搜索、组合筛选、双向大小排序及名称排序、详情键盘开启、Esc 回焦、空态及重置、partial/cancelled 状态；同时检查本地请求、CSP、文件入口、HTTP 目录边界、关闭临时服务及两种宽度的布局。测试结束关闭自己的浏览器与临时服务，没有使用用户 profile 或后台常驻服务。

[live-dom.json](../../acceptance/wave1/c/addendum-01/live-dom.json) 记录 `focusReturned=true`、正确的大数升降序、未知行文字与状态提示。[layout-dom.json](../../acceptance/wave1/c/addendum-01/layout-dom.json) 中，1440×1000 的文档/body/clientWidth 为 1425；900×800 为 885，差值为纵向滚动条，逐元素 overflow 均为空。两个 viewport 的外部资产、运行时异常与 CSP 违规数组均为空，网络请求仅同源 127.0.0.1；17 项原始路径拒绝检查均为 404。

最终门后才复制本次新截图与日志到本单目录；旧报告/旧证据不覆盖。下列三个 PNG **已实际通过图像查看工具打开并目视检查**：

- [dashboard-1440x1000.png](../../acceptance/wave1/c/addendum-01/dashboard-1440x1000.png)：白色页头和只读标识；四格概览为 8、6、待去重、未估算；partial 与权限不足提示清楚；筛选横排、五列列表对齐，当前视口显示前部条目，余项需纵向滚动。
- [dashboard-900x800.png](../../acceptance/wave1/c/addendum-01/dashboard-900x800.png)：四格概览保留；搜索/重置与三项筛选分两行；列表无横向裁切；视口显示首行及第二行顶部，余项需纵向滚动。
- [detail-1440x1000.png](../../acceptance/wave1/c/addendum-01/detail-1440x1000.png)：右侧知识库详情白色面板；内部只读标识、虚构路径、未知容量、识别依据、恢复未知及 `incomplete_evidence` 可读；背景列表遮罩与关闭/Esc 提示可见。

本单没有改变界面布局。固定八条数据只有一个未知项，因此这些页面截图用于验证既有交互与展示没有回退，**多未知项名称排序修复由新增公开 model 回归证明**；没有改 fixture 让截图伪装展示新增边界。

## 证据与未验证范围

新证据根为 `F:/new/smaltalk/water/.worktrees/c/docs/acceptance/wave1/c/addendum-01/`；[evidence-manifest.json](../../acceptance/wave1/c/addendum-01/evidence-manifest.json) 记录 25 个复制文件的原路径、字节数与 SHA-256，包含全部本轮测试尝试、NC-04、三份最终回执、真实 DOM 与 PNG。原日志在本树 `.local/checks/WATER-W1-C/`，NC-04/start/source-audit 在其 `addendum-01/`；截图原路径为 `.local/browser-lab/` 下同名文件。证据保留原始 TAP 输出空白，不为消除格式提示改写失败日志。

没有越界申请或新增依赖。未改主线登记、其他工作树、上游、全局配置、冻结材料、旧回执或旧证据；未接真实扫描、Rust/Tauri 或模型/API 服务，也未读取 HOME、整盘或真实用户数据。后加本单报告/证据提交不包含新的产品修改。

验证限于当前 Windows 本机浏览器及 Node；**macOS 未验证**。真实扫描、正式报告接线、容量去重/分配空间/回收/恢复、Tauri/WebView、打包和发布均不在本单验证范围。无阻止本单提交的已知问题；交回后停止修改，等待总控独立验收。
