# WATER-W2-E 桌面界面 SPEC

2026-10-26 冻结。按 [设计说明](../../docs/design/water-ui-v1/DESIGN.md)（白色磨砂第 2 版）、[tokens.css](../../docs/design/water-ui-v1/tokens.css)、[静态稿](../../docs/design/water-ui-v1/mockup.html) 与 [预览图](../../docs/design/water-ui-v1/previews/) 实现 Water 的全部界面，数据只经 [IPC](IPC.md)。本票只做 WebView 里的前端，不写 Tauri/Rust；下一波接线票把它装进 `apps/water`。

## 1. 交付目录 `apps/water/ui/`

| 文件 | 作用 |
|---|---|
| `index.html` | 唯一页面骨架；SVG 图标 sprite 内嵌于此；只引用 `styles/tokens.css`、`styles/app.css` 和 `<script type="module" src="app.mjs">` |
| `styles/tokens.css` | 与 `docs/design/water-ui-v1/tokens.css` **逐字节相同**（检查器核对哈希） |
| `styles/app.css` | 全部组件样式；颜色、阴影、圆角、字体只引用 `var(--w-*)` |
| `app.mjs` | 启动、hash 路由（`#/home`、`#/results`、`#/trends`、`#/history`、`#/locations`、`#/about`）、全局状态与轮询 |
| `ipc.mjs` | **唯一**接触 `window.__TAURI__` 的模块；每个 IPC 命令一个导出函数 |
| `format.mjs`、`model.mjs` | 纯函数：体量 / 时间格式化、选择规则、合计计算 |
| `views/*.mjs` | 每个页面、抽屉、对话框一个模块 |
| `README.md` | 结构、运行方式、已知限制 |
| `tests/unit.test.mjs`、`tests/browser.test.mjs` | 本票测试 |

零 npm：不得出现 `package.json`、`node_modules`、打包器或框架；只用浏览器原生 ES 模块。

## 2. 安全与实现约束（检查器会核对）

- `index.html` 不得有内联 `<script>`、`on*=` 事件属性、`style=` 属性；只允许上面那一个模块脚本。
- 产品代码（tests 目录以外）不得出现 `innerHTML`、`outerHTML`、`insertAdjacentHTML`、`document.write`、`eval`、`new Function`、`http://`、`https://`。所有文本用 `textContent`，图标用 `<svg><use href="#id">` 引用 sprite。动态尺寸用 CSSOM（`el.style.setProperty('--x', …)`）。
- 只有 `ipc.mjs` 可以出现 `__TAURI__`。`window.__TAURI__` 不存在时，所有调用以 `{code:"unavailable"}` 拒绝，界面显示“无法连接 Water 服务”，不崩溃。
- 发往 IPC 的参数只能是 IPC.md 列出的键，值只能是 ID 字符串、布尔或 ID 数组；**界面从不发送路径**。
- 字节一律用 `BigInt` 解析十进制字符串再格式化，不用 `Number(bytes)` 做运算。
- 不读写 localStorage 以外的任何存储；localStorage 只可记住“上次打开的页面”，读写包在 try/catch 里。

## 3. 行为

- 页面与组件严格按 DESIGN 第 3～8 节；视觉以静态稿和 `previews/*.png` 为准，允许像素级小差异，不允许换风格、加渐变、加光晕、用 emoji。DESIGN 第 5.9 清理记录、5.11 关于与隐私在静态稿里没有画，按同一视觉语言实现。
- 选择规则（`model.mjs`）：初始选中 = `default_selected`；`selectable` 为假的组永远不能被选中（复选框不可用，代码层也拒绝）；分类全选只作用于可选组；已选体量 = 已选组 `eligible_bytes` 之和；新扫描结果到来时重置选择。
- 轮询：扫描或清理进行中每 250ms 调一次对应 progress，结束即停；空闲不轮询。
- 清理流程：“清理所选” → `clean_prepare` → 确认框（按钮文案含体量，红色提示“不进入回收站，无法恢复”）→ `clean_start` → 清理中 → 完成页。确认框打开期间焦点锁在框内，Esc 取消。
- 错误：显示 `message_zh`；未知错误显示“Water 服务暂时不可用”。忙碌时开始类按钮禁用。

## 4. 测试

`tests/unit.test.mjs` 精确三项：`ui_format_bytes_time`、`ui_selection_rules`、`ui_ipc_boundary`。

- format：DESIGN 第 7 节全部规则（GB 一位小数、MB 整数、<1 MB、相对时间、千分位、超过 2^53 的字节数）。
- selection：默认选中、不可选组无法选中（含直接调用模型函数）、分类全选、合计、重置。失败信息含 `UI_LEVEL_GUARD`。
- ipc boundary：在测试里给 `globalThis.__TAURI__` 装一个记录调用的假实现，逐个调用 `ipc.mjs` 的全部导出，核对命令名、参数键与值类型；参数中出现盘符或反斜杠即失败；`__TAURI__` 缺失时拒绝为 unavailable。

`tests/browser.test.mjs` 精确四项：`ui_home_and_scan`、`ui_results_detail_confirm`、`ui_clean_done_and_pages`、`ui_layout_states_a11y`。

- 测试内起一个只服务 `apps/water/ui/` 的 127.0.0.1 静态服务器；用**本工作树内**的 `scripts/acceptance/native-vw-private-browser.mjs`（从测试文件按相对路径导入，profile 因此落在本树 `.local/browser-lab/`）打开一个私有 headless Chrome；用 `Page.addScriptToEvaluateOnNewDocument` 注入**仅存在于测试文件中**的假宿主，按 [ui-fixtures.json](ui-fixtures.json) 实现 IPC（包括进度序列与错误）。
- 用真实鼠标点击（`browser.click`）走完：首页 → 开始体检 → 扫描进度 → 结果页 → 打开分组详情 → 勾选与取消 → 清理所选 → 确认框 → 清理中 → 完成页 → 趋势、记录、位置、关于各页。核对页面上的数字与回放数据一致，假宿主收到的参数里没有路径。
- layout/states/a11y：1240×820 与 1040×720 两种尺寸无横向溢出；空态（首次未体检）、unavailable、busy、stale 四种状态文案；Tab 顺序可达所有可操作控件、Esc 关闭抽屉与确认框、对话框焦点锁定；`prefers-reduced-motion` 下无动画。
- 每个页面与浮层在 1240×820 截图，结果页另截 1040×720，存入 `docs/acceptance/wave2/e/screenshots/`（每次运行一个带时间戳的子目录，不覆盖旧图），随回执一起提交。**执行者必须逐张看图，并与 `docs/design/water-ui-v1/previews/` 对照，在回执里逐屏写差异。**

有效负控 nc1：真实去掉 `model.mjs` 中“不可选组不能选中”的判断，`ui_selection_rules` 失败且信息含 `UI_LEVEL_GUARD`；立即原字节恢复后全绿。

## 5. 预算

一个私有 headless Chrome；原生窗口 0；不联网、不下载字体或图标（系统字体即可）；不读取任何真实用户位置。
