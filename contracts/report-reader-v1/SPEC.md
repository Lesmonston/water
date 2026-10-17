# Report Reader v1：E报告视图阅读界面

I与F/G/H并行，只消费已验证E的water.report-view.v1。独占prototypes/report-reader，零npm依赖，不改C/E、不改根Cargo；不是Tauri/IPC接线，不读取本机数据。reports.json由总控Rust工具调用真实E project_json四个合成报告并逐值核对原golden后生成，包含base/composite_partial/cancelled/empty_completed。来源仍为合成，不冒充F实测。

## 模型API与边界

model.mjs导出assertReportView(view)、selectFindings(view,filters={})、formatBytes(decimalOrNull)、summarizeView(view)。assertReportView成功返回undefined，失败固定Error("Unsupported report view.")，不回显输入。检查对象版本water.report-view.v1、source_schema_version=water.scan.v1、read_only=true、status三枚举、scopes/findings/issues数组及显示所需字段；字段集合和合法值遵从E SPEC，ByteCount为规范0..u64max字符串/null，枚举必须为A对应wire值，ID/相对路径语法沿用A。所有E字段必须存在，包括nullable；使用完整合成E输出测试。此显示防线不取代A报告语义验证，输入契约只支持已通过E公开入口的JSON数据；无任意JSON文件导入/API。

filters严格query=''、scope/tool/category/risk='all'、sort='size_desc'；query按小写字面includes匹配title/relative_path，不用正则或HTML；其它四项精确匹配，相互AND。tool的all仅不限筛选，保留tool:all/no_tool/tool:no_tool；scope以scope_id精确筛选。sort仅size_asc/size_desc/name_asc；未知大小所有排序都放尾，名称排序也在未知组内按小写字符串码点比较，等值稳定保原序。大小用BigInt，不经Number/parseInt/float。结果新数组，不修改输入。

formatBytes(null)='未知'；其它用纯BigInt的1024进位B/KiB/MiB/GiB/TiB/PiB/EiB，截断一位小数、.0省略，格式同已验收C，无locale/浮点。非法字节抛同一固定Error。summarizeView返回严格{count,protected_count,unknown_size_count,source_totals}，前三项计整份报告，source_totals完整来源totals副本；不逐finding加总、不制造可回收/已释放字段。筛选结果数在UI另显示，不改来源总量。

## 页面与服务

index.html/styles.css/app.mjs/model.mjs/server.mjs/README.md及tests/model.test.mjs、tests/browser.test.mjs为唯一产品文件。app从固定/reports.json加载四份合成bundle；切换整份报告，findings/scopes/status/issues/totals全部更新，不能只切状态。默认composite_partial。常驻明确“合成报告 · 只读”，没有扫描/删除/执行/上传/下载/导入/目录选择/场景伪造状态按钮。

页面至少包含报告选择、状态/覆盖/问题、来源汇总（标明来源方法、非本页求和）、query/scope/tool/category/risk/sort、结果数/空态/重置、行详情。low/review/high/protected及四activity/五recoverability分别如实呈现，不把low/high合并成review。详情完整呈现path、所属scope、source_tool、size、evidence_items、references、保护原因及来源rule_version；所有动态文本用textContent，禁止innerHTML/outerHTML/insertAdjacentHTML、内联事件、动态HTML或URL。路径仅文本，不做链接和动作目标。

使用语义label/button/table或list、原生dialog；Enter可开详情，Esc/关闭返回触发按钮焦点。1440x1000与900x800无横向溢出，详情长Unicode/HTML文本可换行，常驻只读提示滚动可见；不引入外部字体/图片/网络资源。允许使用已有C作本项目视觉参考，但不覆盖或依赖C产品文件。

server.mjs导出async startServer({port=0}={})→{url,close:async()=>void}；仅127.0.0.1，Host严格当前loopback+端口，GET/HEAD，POST等405，错误Host403。按未经URL正规化的req.url精确白名单：/、/styles.css、/app.mjs、/model.mjs、/reports.json；任何查询串、编码/重复斜杠/遍历/反斜杠/其它路径404固定"Report resource unavailable."。/reports.json固定映射本树contracts/report-reader-v1/reports.json，不另建产品数据副本；只能读取这些包文件及冻结资产，不能动态文件路径/目录列表。CSP default-src 'none';script-src 'self';style-src 'self';connect-src 'self';form-action 'none';frame-ancestors 'none';base-uri 'none'，nosniff、无CORS。import不自动开server，浏览器/测试显式启动并close；不对外监听，不用用户profile。

## 五测试、三负控及实际浏览器

model.test.mjs精确三个顶层测试：reader_input_and_preservation、reader_bigint_filters、reader_totals_and_unknown。browser.test.mjs精确两个：reader_live_interactions、reader_scope_layout_and_readonly。全部五个，不skip/filter。模型覆盖四报告、版本/read_only/字节/字段拒绝、输入不变、跨scope同路径、BigInt邻值/极值/unknown、组合筛选、未知组名称排序/稳定ties、来源37/null与枚举。

浏览器使用冻结scripts/browser-lab.mjs的openBrowser；真实页面加载、切报告、筛选/重置、排序、键盘dialog/Esc/焦点、HTML字面无DOM元素；另一测试raw HTTP遍历/Host/POST、双尺寸布局/只读标记、无file input/外部请求/异常。截图固定本I树.local/browser-lab/reader-1440x1000.png、reader-900x800.png、reader-detail.png；每次browser门重新生成，helper检查mtime并在.local/checks/WATER-W1-I留带时间戳的原字节副本。全部final门完成后执行者将副本复制到docs/acceptance/wave1/i提交并实看截图；不改旧browser helper。真实E输出来源是合成资产预检，I通过不代表真实扫描或桌面壳完成。

三个可运行有效负控：①排序改Number比较，2^53+1/2^53断言红；②摘要把来源totals替为逐行和或null→0，来源37/未知断言红；③真实DOM文本构造改innerHTML，HTML字面无img/script元素的浏览器断言红。分别完整模型+浏览器五测试、目标断言红、原/坏/恢复三hash与原字节恢复后五测绿。缺文件/语法/超时不算目标红，不能改测试造红。最后check/test/browser在同一干净实现SHA串行跑--final；固定报告来源不改、不降断言。
