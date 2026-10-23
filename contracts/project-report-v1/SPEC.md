# Project Report v1 — AD

2026-10-23。在现有AB同一工作台增加一份同源项目报告，将真实元数据与当次可选结构证据并列。只修改本票AB文件；不等待AC，不用Tauri，不改AA/P/R/Q/Z/W、AB model/launch或旧五测试。旧API、水位/确认/同意、安全和取消语义原样，原5测试继续全绿。

## 路由与内存捕获

公开startFromStreams/launchProjectWorkspace API、workspace v1/session.json精确字段和report_url/evidence_url保持；原W报告链接与原结构附件继续存在。主页面每个confirmed最近结果另加class project-report-link、label“查看项目报告”，href精确/reports/<job_id>/；选择取消无新链接。新增assets为project-report.html/css/mjs，另有Node侧project-report-model.mjs，只从固定本目录加载，无iframe或跨源fetch。

project-report-model.mjs公开captureProjectReport(result)，输入为原WorkspaceState.receive返回的六字段job_id/read_manifest/marker/selection/status/bundle；只允许confirmed、同job单项native metadata及合法marker，实际委托旧assertReviewInput/assertMarker并检查关联。输出为本次独立捕获{session:Buffer,metadata:Buffer,evidence:Buffer|null}，session恰下述五字段packet，metadata/evidence为原字符串UTF-8副本，不保存输入对象/Buffer引用。该函数实际用于transport的生产路径，非测试替代实现；不向浏览器暴露Node模块或Buffer。

transport在原严格WorkspaceState.receive已经验证同job/选择/元数据/marker的真实result后，同步复制一份独立内存捕获，必须在随后首个await之前取得原值，不能保存调用者可变引用。内部传给server的projectReports Map只属于本实例。不得新增入站HTTP上传/路径/程序参数或重新读取package.json。只对confirmed结果建立报告，最大仍最近两结果；原selection_cancelled也占最近槽，淘汰/close同时删除该job报告路由/元数据附件并保持原W/evidence清理。

GET/HEAD /reports/<job_id>/返回固定HTML；/reports/<job_id>/session.json恰{report_version:"water.project-report.v1",job_id,read_manifest,bundle,marker}。bundle/marker恰该次已验证原内容；只从捕获生成响应，禁止根据URL索引到另一job或调用方对象。confirmed的snapshot一项，bundle.session_id和snapshot.view.scan_id与job_id绑定。新路由精确匹配，不接受query、额外斜杠、percent绕过、相对穿越、其它方法、未知job/选择取消/淘汰；相应404/405，固定净化错误沿原server。

GET/HEAD /reports/<job_id>/metadata.json：application/json;charset=utf-8、attachment; filename="water-report-1.json"、准确length，正文恰当次snapshots[0].redacted_json的UTF-8原字节，不重新serialize、不捆绑marker。结构证据仍链接/evidence/<job_id>.json，仅observed可见/可下载，恰原observation_json；其它状态包括late completed/partial skipped都404且页面无结构附件。session JSON不是默认脱敏导出，不得称匿名。新固定资产可用根下/project-report.css、/project-report.mjs、可选/project-report-model.mjs，无任意文件服务。

保留精确Host、Origin/token动作校验、CSP/no-store/nosniff、大小预算、严格UTF-8/重复键/模式/旧job拒绝、队列序列化和借用streams生命周期。server只读固定自有静态资源、内存捕获和下载；新UI没有启动/取消/上传/删除或原生权限。不得引入npm/package.json、env、动态文件路径、网络来源或logger泄漏。

## 页面

同一报告页同时展示metadata完成/partial/取消与覆盖边界、protected原因、观察逻辑长度以及allocated/reclaimable未知，保留原E/H真实值及来源；不把结构统计当项目归属/依赖已装/缓存可删，不按名称改risk/category，不展示未提供的统计。Z observed展示原bytes_read和U声明/存在标志/六计数，零值与false/null不丢，醒目“仅结构统计；归属和版本未知，不证明可删”。

未请求/选择取消/扫描取消/内容前取消/未发现/读取失败分别表达。late metadata completed/partial必须保留“扫描完成/保留部分结果”，独立说明“已取消内容读取 · 未读取清单”；真metadata cancelled仍扫描取消。默认false不出现结构面板或附件。只用textContent等安全DOM，不拼接来自报告的HTML/脚本；报告下载metadata/evidence必须分开，label明确。

视觉沿现有AB字体/颜色/限制说明，1440x1000和900x800无横向溢出，可滚动查看全部元数据/结构/未知说明。回到工作台链接固定“/”；新报告不让旧job链接指向新job内容。主工作台默认复选框复位/禁用和现有W链接不变。

## 定向验证

旧tests/model.test.mjs与browser.test.mjs原字节冻结。新增tests/project-report.test.mjs恰project_report_capture_and_routes、project_report_privacy_and_eviction；新增tests/project-report-browser.test.mjs恰project_report_layout_and_downloads。test模式运行旧3+新2=5顶层，browser模式旧2+新1=3顶层，串行并最多同时一个私有Chrome。用冻结原7case与真实AA late捕获+明确partial内存变体；可以冻结回放实际pipe，但不得构造/运行新AA或物理fixture。dialog envelope始终是合成适配，不冒称新原生选择。

至少走真实公开streams→server→新路由→报告页；覆盖default false、observed、真cancel、late completed/partial、missing/failed、选择取消、错误job/false+observed/正文canary拒绝、两结果淘汰与close。在输入事件后首await前修改调用方对象/Buffer，已捕获输出和Q/Z不得变化。新/旧report与evidence错误路由/Host/方法/动作Origin拒绝；一实例不能提供另一实例内容。

新浏览器测试通过系统鼠标点击主页面“查看项目报告”进入同源报告、实际鼠标下载metadata和evidence并按当次原字符串比字节。default/observed/late complete/late partial/cancel Q均核，observed原Z附件核；fetch不冒充下载。两尺寸及late/取消/结构可见性留本次新截图实际view_image看图，原AB便利文件只会被旧测试写其.local，所有唯一截图/下载目录保留。

先完整可运行骨架/全部测试red-behavior→AD_BEHAVIOR。稳定nc1真正移除新路由job键绑定或淘汰删除，让旧job可读取其它/已淘汰内容→AD_REPORT_BINDING，立即原字节恢复/test五绿；nc2真正绕过结构附件选择/marker授权，使false/late结果可取结构内容→AD_REPORT_CONSENT，立即原字节恢复/test五绿。只改本票真正被调用的生产分支，原model拒绝不可改，不靠重写测试/未执行helper/静态开关造红。final同一干净实现SHA check/test/browser一次，产品字节不变不重复浏览器。系统原生窗口0，无物理fixture/普通内容权限。真实AA→AD与桌面接线由总控收单后另验。
