# Native Review v1 — 原生会话流到只读页面

prototypes/native-review，零npm，独占index.html/styles.css/model.mjs/app.mjs/server.mjs/host.mjs/launch.mjs/README.md及tests/model.test.mjs、tests/browser.test.mjs。开工先按ATTRIBUTES.json原content创建本目录.gitattributes（同属白名单），明确新HTML/CSS/MJS为LF，不能改根/旧属性或规范化旧T来消除差异。不改旧T/I/其它产品和根Cargo。沿用本项目页面风格，不加载外部字体/脚本/资源。

model公开assertReviewInput(input)、selectSnapshot(input,scanId)、exportText(input,scanId)，以及真实T的selectFindings/formatBytes重导出。有效返回原input；错误恰Error('Unsupported native review.')。未知snapshot返回null，export未知/取消无快照抛固定错误。不修改输入、按ID硬编码或自己生成脱敏输出。

输入有两族：旧water.scan-review-bundle.v1必须真实委托T.assertReviewBundle，原retained_j_capture/synthetic_memory标签原样保留；新water.native-session-bundle.v1按native-session SPEC精确白名单/类型/selection/limits验证。绝不改native tag后交旧T验证或把它当synthetic_memory。

native确认只有一个snapshot且view.scan_id=session_id，真实I.assertReportView必须通过；Windows/user_selected/Selected directory单scope，所有finding按R固定native-scan-v1、unknown/protected、无source_tool、固定native evidence/reference unknown/[]、基础两原因及实际已记录后代第三原因，未知/逻辑长度/来源totals按R契约。native finding的title等于非空relative_path，每组件遵守R的1..255 UTF-16、合法Unicode/字符/尾点空格/DOS stem规则（ASCII大小写折叠和仅ASCII空格修剪，不用locale或Unicode全量toUpperCase/trim）；实际R报告不能带不合法Windows名字。HTML字面测试可用原本允许该文本的legacy输入，不放宽原生来源规则。summary和Q全键/分布/值/按序alias/evidence code+source/references/size与view一致，Q只作为校验对照，导出必须保留传入原string；Q compact/canonical检查拒绝重复/空白/额外字段。校验普通JSON数据，拒绝getter/symbol/空洞/cycle/custom proto等，错误不回显输入或绝对路径；JS不替代真实A/Q或认证来源。

server公开async startServer({bundle,port=0}={})→{server,url,close}，import不自启。同步严格验证并在首次await前捕获不可变JSON/每份Q字节，整个JSON UTF-8<=64MiB。固定127.0.0.1/精确Host/GET/HEAD/no-store/nosniff/无CORS/Referrer no-referrer、CSP同T；静态realpath固定白名单，拒绝链接逃逸，错误净化Native review unavailable.。路由仅/、/styles.css、/app.mjs、/model.mjs、/scan-review/model.mjs、/report-reader/model.mjs、/session.json和/exports/1.json..N。导出attachment filename="water-report-1.json"等固定序号，Content-Length精确Q UTF-8 bytes，HEAD无正文；拒绝query/fragment/编码/穿越/原始/上传/扫描/路径接口。

native页显示实际selection、来源native_scope_metadata、no-follow策略/三个limits/普通内容未读/手势及竞态未验证，并说明Completed仅该策略内覆盖。选择取消显示“目录选择已取消；未开始扫描”，不伪造0条completed报告或调用selectFindings(null)，无可用下载/预览；已确认但R取消保留真实cancelled报告，两种状态分明。来源说明保留“可信宿主声明，页面不认证来源或捕获新鲜度”，回放原生捕获不冒称本页发起扫描。旧T输入保持旧标签和全部24份数据、筛选/详情/键盘/精度/Unknown/总量含义，不给旧输入补造原生policy或手势信息。

host公开async readSession(stream)和async startFromStream({stream,port=0}={})，后者真实readSession→startServer。仅接Readable的Uint8Array/Buffer原始byte块，拒绝已解码string块，避免上游已丢失UTF-8错误；每块收到即复制，累计<=67108865 bytes（JSON最多64MiB+可选单LF），strict UTF-8 TextDecoder fatal，除可选单LF外恰一个紧凑JSON对象，拒绝BOM/空白/额外行/重复key/不完整或坏UTF-8。流只允许native-session协议，旧T仅内存API兼容；无文件/env/样例fallback。错误固定Unsupported native review.，不输出原输入。

launch公开async launchNative({initialDirectory,port=0}={})；初始目录仅可信本机Node/CLI参数，不来自HTTP/浏览器。程序固定为本项目.local/next-target/debug/water-native-session.exe，realpath/普通文件/项目内限制（不接受binaryPath/env/PATH/任意命令）；spawn参数恰[initialDirectory]，shell=false、windowsHide=false让真实系统窗口可见，stdin ignore、stdout/stderr pipe。初始参数须非空string、无NUL且长度<=4096，port整型0..65535；无效参数在spawn前以Error('Native session unavailable.')拒绝。具体Windows路径由V/S验证，不在W解析或授权扫描。stderr最多4096 bytes只作退出诊断，不向用户回显，stdout直接交readSession，不经文本shell。等待producer正常退出0和合法完整bundle才开server；错误/超限杀本次自有child（不操作其它进程），固定Native session unavailable.，不得以fallback页面掩盖失败。

launch.mjs import不自启；CLI恰一个initialDirectory，否则退出64并仅stderr Invalid native launcher arguments.加LF。正常调用launchNative并stdout打印url加LF、保持server至SIGINT/SIGTERM；退出时只close自有服务/子进程，无文件清理。CLI错误退出2、stderr仅Native session unavailable.加LF，不泄漏argv/path/stack。Node程序只固定调用V；没有浏览器触发的进程入口、自动安装/构建/Cargo/shell。

W独立树没有V产品，五测试关键真实组装入口为startFromStream：冻结实际S/P/R/E/H/Q捕获的原字节stream→真实HTTP→私有Chrome→点击下载；还测公开launcher无效参数在spawn前拒绝及import无副作用。不能放置假water-native-session.exe、增加测试binary路径/模式或把probe当V产品。真实V.exe→launchNative→页面/下载是总控联合验收必做项，W回执明确尚未验证该整条链。

唯一五测试：model.test.mjs三项native_review_protocol、native_review_stream_and_launcher、native_review_http_and_privacy；browser.test.mjs两项native_review_live_inputs_and_download、native_review_layout_cancel_and_safety。覆盖八实际原生捕获和旧T24份、两不同caller原生bundle同步改ID/引用不改变Q、immutable stream/server、64MiB/UTF-8/单对象边界、路由攻击/Host/HEAD、两种取消、scope根空串/None、双尺寸、HTML字面/键盘/dialog/Escape/焦点/Unknown/u64。动态变体标明合成修改，不声称重新物理捕获。至少三次真实点击保存下载至本树.local/browser-lab新私有目录，逐文件核字节/固定名/headers；不能fetch冒充下载。当前三图native-review-1440x1000.png、native-review-900x800.png、native-review-cancel.png；失败仍保留截图并执行其余独立用例。

行为W_BEHAVIOR；nc1真实下载route改发view→W_Q_ONLY；nc2实际渲染把选择取消显示成“完成0条”等错误状态并启用下载/预览→W_SELECTION_CANCELLED（保持load/ready，不用JS崩溃造红）；nc3真实host省去严格UTF-8检查→W_STREAM_BOUNDARY（坏bytes放在合法自由路径/对应title中，宽松解码后仍能过模型，使测试真正观察UTF-8边界）。全部完整五测有效红→原字节恢复五绿，无skip/filter/降断言/测试后门。
