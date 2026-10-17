# 只读桌面交互原型 v1

总控冻结的交互与验收边界；不依赖A的Rust实现。C负责独立原型，不实现Tauri或真实扫描集成，不改变产品总体架构。

## 范围与目录

独立目录`prototypes/readonly-dashboard/`。使用原生HTML/CSS/浏览器JS、Node内置模块，不安装依赖，不创建根package.json或修改Cargo。允许index.html、styles.css、app.mjs、model.mjs、server.mjs、tests/model.test.mjs、tests/browser.test.mjs、README。

读取/复制本契约的`demo-data.json`为演示输入，禁止修改源fixture；浏览器运行时用同值本地JSON或构建进演示资源，不能请求文件选择器、HOME、扫描API或外部网络。全部数据虚构，页面持续可见“示例数据 · 只读演示”，不能将点击显示成真实扫描。

本fixture是`water.prototype.v1`的展示模型，不是A的ScanReport序列化输出；不得据此改动contracts/v1。scenario选择器切换partial/cancelled演示，不能改写为真实扫描状态。

## 信息与交互

单页工具界面：概览、工具/类别/风险筛选、搜索、排序、占用项列表、详情面板、空结果和部分读取状态。不要做营销页、定价页或大hero。

- 显示的空间是`logical_bytes`（逻辑大小），不是可释放量；null显示“未知”，总览不相加有重叠/共享可能的finding，默认“总占用待去重”。
- 用ByteCount字符串转BigInt比较，禁止Number/f64排序或累加；null排序始终在末尾。按大小降序时稳定保留等值项原顺序。
- 筛选同时组合：tool_id、category、risk均为精确值；搜索对title和relative_path做普通大小写不敏感子串匹配，不把输入当regex/HTML。
- 点列表项打开详情：用途、路径提示、工具、识别依据、活跃状态、恢复前提、保护原因、容量口径；Esc关闭并回焦触发按钮。详情使用textContent或安全DOM，不能innerHTML注入输入。
- 清空筛选后恢复全部；找不到时有空状态及重置入口；展示partial与permission_denied提示，不把它写成0B。
- 不出现可执行的删除/清理/迁移按钮；主要操作是“查看详情”。不假装“安全可一键清空”，不生成下载、上传或网络授权流程。

## model.mjs 公开纯函数

`selectFindings(findings, {query,tool,category,risk,sort})`返回新数组，sort为`size_desc|size_asc|name_asc`，`all`表示某筛选不限。finding来自demo-data，文本title与tool_name已给，size字段为`logical_bytes`。空query不过滤；unknown字节为null且始终最后。name_asc按title.toLowerCase()普通JS字符串顺序比较，不依赖系统locale；等值稳定。输入不得原地排序/修改。

`formatBytes(value)`：null→“未知”，字符串按BigInt显示二进制单位（B/KiB/MiB/GiB/TiB/PiB/EiB），最多1位小数且不通过浮点值转换；自定四舍五入或截断，但必须说明、测试且一致。不能把逻辑值叫“可释放”。

`summarize(findings)`返回`{count,protected_count,unknown_size_count,logical_total_bytes:null,reclaimable_bytes:null}`，不对潜在重叠数据求和。

## 浏览器与视觉验收

在本机已装Chrome的新隔离profile运行，只访问127.0.0.1临时静态server。server仅暴露原型目录，禁止目录穿越与仓库根暴露；测试后关闭自己的浏览器/server，不杀用户进程、不用用户profile。

`server.mjs`导出`startServer({port:0})`，绑定127.0.0.1，返回`{url,close}`，close可await。直接运行可提供演示入口，但自动测试必须主动关闭。browser.test.mjs可使用冻结的`openBrowser`验收工具，不需自写协议或下载浏览器。

必须真实浏览器验证搜索、组合筛选、排序、详情开关与Esc回焦、空状态、partial/cancelled提示和无横向溢出；1440×1000与900×800截图先写`.local/browser-lab/`，最终门后复制到本票证据目录并提交，避免测试改脏源码树。实际查看截图。截图只是原型，不是macOS/Tauri实机验收。

冻结的scripts/browser-lab.mjs导出`openBrowser({width,height})`；返回`goto(url)`（仅127.0.0.1 HTTP）、`evaluate(expression)`、`waitFor(expression,timeout)`、`send(CDPmethod,params)`、`screenshot(relativePath)`、`onEvent(callback)`、`close()`。测试用try/finally关闭浏览器和server，禁止改该工具或用用户profile。浏览器检查使用真实控件的DOM事件/键盘输入，不直接调用model替代界面。

视觉方向：开发工具、清晰可信、适度密度。中性色与单个强调色、明确字号/对齐/间距、语义风险文字；无模板化hero、光效背景、炫技水波或大面积玻璃。用系统字体，不外载字体/图标/CDN。表单有标签、可见焦点、文字对比合适，风险不只靠颜色，控件可键盘操作。

供真实DOM验收的稳定data-testid：demo-badge、search-input、tool-filter、category-filter、risk-filter、sort-select、reset-filters、finding-list、finding-row（含data-finding-id）、empty-state、detail-panel、detail-close、detail-path、scenario-select、status-banner、summary-count。这些只标识实际控件，不是测试专用行为分支。

## 定向测试名

Node纯模型测试：`prototype_bigint_order`、`prototype_filters`、`prototype_format_and_unknown`、`prototype_no_mutation`、`prototype_no_false_reclaim`。

浏览器测试：`prototype_live_interactions`、`prototype_scope_and_layout`。通过截图与真实DOM交互验证，不让测试单独调用model替代界面接线。不能靠给DOM预置“passed”标志或测试专用分支来换绿。
