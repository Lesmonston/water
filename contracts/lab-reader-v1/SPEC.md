# Lab Reader v1：调用方供数的会话阅读界面

独占`prototypes/lab-reader/`八文件：index.html/styles.css/app.mjs/model.mjs/server.mjs/README.md/tests/model.test.mjs/tests/browser.test.mjs。零npm依赖/包锁，不改I或Rust模块。消费冻结会话协议，无J编译依赖；本票通过不等于J已实现或正式扫描页面已接线。

## 内存入口与展示防线

```js
// server.mjs；import不监听，不读contracts内数据当生产来源。
export async function startServer({ bundle, port = 0 } = {}) // -> {url, close:async()=>void}
// model.mjs
export function assertSessionBundle(bundle) // undefined，否则固定Error("Unsupported lab session.")
export function selectSnapshot(bundle, scanId) // 返回对应快照；未知ID固定错误
export function summarizeSnapshot(snapshot) // 严格五字段见下
export { selectFindings, formatBytes } // 复用真实I模块
```

bundle严格`{bundle_version:"water.lab-reader-bundle.v1",snapshots:[SessionSnapshot...]}`，1..64个、view.scan_id唯一。每snapshot严格J六字段、版本/data_kind正确。输入契约只支持已经J/A验证的JSON值（无getter/proxy/循环/任意文件），展示校验不替代A语义或J来源证明。

校验真实I.assertReportView(view)，source_facts/report/summary为对象且状态/数组/显示所需字段完整。核对report.scan_id=view.scan_id；四处status一致；scope ID/顺序、finding ID/相对路径/大小与facts按scope/entry平铺的entry-N映射一致；view/source report/issues与summary.counts一致；summary固定H八字段/四风险/十一类别/零桶、read_only/version、counts、totals值与report/view逐项一致。G的全部finding仍unknown/protected，sidecar保持，错误不回显输入。不要把此展示检查叫作真实scope授权或文件系统核验。

summarizeSnapshot严格返回`{finding_count,protected_count,unknown_size_count,issue_count,source_totals}`。前三项按整份view，issue_count来自summary.counts.issues并已与view核对，source_totals深克隆来源totals；不逐行求和/null→0。筛选单独显示结果数。selectFindings/formatBytes沿用I原函数及BigInt语义，不复制/修改I代码。model静态import/re-export使用`../report-reader/model.mjs`，浏览器请求对应固定`/report-reader/model.mjs`路由。

startServer先验证bundle，以JSON语义副本捕获输入，序列化UTF-8 body<=33554432；不借用调用方后续可变对象。错误固定Unsupported lab session.，非法port单独RangeError固定Invalid local port。bundle后续被调用者改写不得改变HTTP结果。无bundle时拒绝，不能自动读冻结数据兜底；没有路径参数/CLI/环境覆盖/上传/文件选择器。

## 页面与HTTP

从固定/sessions.json加载调用方快照，默认数组首项；选项来自view.scan_id及source_facts.case_id/status，可选择任意合法scan_id，不硬编码四报告名或fixture ID。切换整份snapshot、重置筛选、状态/覆盖/问题、来源totals和方法/未知/非本页求和、H白名单计数、query/scope/tool/category/risk/sort、空态/重置/详情。常驻“受控夹具扫描 · 只读”和“非真实用户目录”，不是本机全盘结果。无扫描/取消扫描/删除/执行/上传/下载/导入按钮；取消snapshot只反映来源状态。

详情显示E全部可见字段及对应source_facts entry的kind/depth/identity，scope根来自facts相对root而非物理路径；issues显示code/origin/operation，Injected不得写成真实ACL失败。路径/HTML/Unicode一律textContent，无innerHTML/动态URL/内联事件；路径不是链接或操作目标。原生dialog、Enter打开、Esc/关闭回触发按钮焦点。1440x1000/900x800可读无横溢出，长文本换行，滚动时只读提示可见。界面延续I安静清晰的工具风格，不新增外部资源或依赖。

仅监听127.0.0.1，Host严格当前127.0.0.1:port，GET/HEAD，其它405，错Host403。req.url未经正规化严格六路由：/、/styles.css、/app.mjs、/model.mjs、/report-reader/model.mjs、/sessions.json。前五固定映射K四文件及I.model；sessions仅捕获的内存JSON，绝不读取contracts数据。任何查询串/编码/双斜杠/遍历/反斜杠/其它路由404固定Report resource unavailable.。CSP严格`default-src 'none';script-src 'self';style-src 'self';connect-src 'self';form-action 'none';frame-ancestors 'none';base-uri 'none'`，nosniff、无CORS。固定静态路径做包内真实路径检查，无目录列表或用户数据访问；tests finally关闭server和独立Chrome，不清理profile。

## 五测试与证据

模型精确三个顶层：reader_session_contract、reader_session_selection、reader_session_summary；浏览器精确两个：reader_session_live_input、reader_session_scope_and_layout。

三模型：冻结四份实际链路快照全值接受及输入不变；版本/缺nullable/不一致ID/status/count/path/totals/重复scan_id拒绝；两个合法不同bundle/任意新scan_id的选择；组合筛选、BigInt/unknown/稳定排序；来源未知不0，summary副本。精度/HTML变体按cases.json在内存同步修改facts/report/view的关联字段，清楚记为内存合成变体，不能冒充物理F捕获。

两浏览器：startServer真实传入两个不同有效bundle，HTTP与页面都必须反映调用方全部输入，调用方之后变异不影响HTTP；不能只测默认四份资产。实际切会话、筛选/重置、source status/覆盖/issues/注入标签、metadata详情、键盘/焦点及HTML无img/script、两个尺寸/截图/只读标记/无外部请求异常；raw HTTP六路由、Host/POST/HEAD、遍历和查询串。截图固定.local/browser-lab/lab-reader-1440x1000.png、lab-reader-900x800.png、lab-reader-detail.png，helper核mtime并留时间戳原字节副本，执行者实看。

初始可运行五测行为红消息K_BEHAVIOR。三个负控每次完整suite五测：nc1服务器只保留传入bundle第一snapshot（合法但截断），消息K_SERVER_INPUT；nc2摘要/显示把未知来源totals变0，消息K_TOTAL_UNKNOWN；nc3真实动态DOM textContent改innerHTML，消息K_TEXT_LITERAL。必须目标断言红，不能把CSP错误/超时或模型替身当DOM负控。红和恢复均冻结helper记录完整日志和实际源码；最终test hash与红/恢复一致，不改测试造红。

派前资产是已验收F/G/A/E/H真实受控执行的四个捕获结果加J协议封装，不是J已实现。K独立实现用这些值；J/K双票验收后总控直接把真实J JSON解析为bundle传入K.startServer，再验真实页面。不得以拦截响应、expected文件或私自读其它树fixture替代该接线。
