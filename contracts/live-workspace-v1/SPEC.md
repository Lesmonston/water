# Live Workspace v1：Y可操作开发预览

prototypes/live-workspace，零npm；.gitattributes固定*.mjs/*.html/*.css为text eol=lf。不改W或其它页面。沿W暖白/墨色/细线布局，突出一个“选择目录并扫描”按钮、活动计数、取消、最近两份报告、错误/取消空态。1440x1000与900x800键盘可达，无横向溢出；不把技术日志、token或内部程序路径放在产品页面。

公开Node API：startFromStreams({input,output,port=0})，input为主进程读X stdout的Readable，output为写X stdin的Writable，必须逐块复制、严格验证新stdio协议/事件顺序和真实W.assertReviewInput(bundle)，不接受任意路径或命令。只在ready后启动HTTP；返回{url,close()}，close幂等并关闭自有报告server，不关闭调用方不属于本实例的其它资源。stream结束或错误应停用操作，保存明确失败状态，不伪造结果。生产launchWorkspace({initialDirectory,port=0})只经realpath/项目内/普通文件检查固定本树.local/next-target/debug/water-scan-host.exe，args恰[initialDirectory]、shell=false、raw pipe；不能binaryPath/env/PATH/Cargo替代。无X产品时正常固定净化错误，测试使用公开streams接冻结回放，不能放假exe。

HTTP绑定127.0.0.1和精确Host。GET/HEAD固定UI资源与/session.json；POST /actions/start正文恰{}，POST /actions/cancel正文恰{"job_id":"..."}。动作正文UTF-8<=1024字节，严格对象、拒绝重复键/未知字段/无效类型；Content-Type=application/json，Origin必须精确本实例origin，并校验独立每实例crypto.randomBytes(32)生成的X-Water-Action头。token只在本地首页bootstrap受控提供，动作/轮询/错误/日志/下载不回显；GET不触发选择。缺/错误Host/Origin/token不写stdin，403；错误方法405，非法body400，超限413，活动时start409，未知cancel409。固定错误文本Workspace unavailable.，正确CSP/default-src none/self scripts/styles/connect、no-store、nosniff、no-referrer，路径/query不映射文件。

GET /session.json返回{workspace_version:"water.live-workspace.v1",connection:"ready"|"closed"|"failed",active:null|{job_id,phase:"selecting"|"scanning"|"cancelling",visited_entries,recorded_entries},recent:[{job_id,selection,status,report_url}]}。recent最多2，最近在前；selection是confirmed/cancelled，status为completed/partial/cancelled或selection_cancelled/failed；选择取消无report_url/null。只由后端生成OpaqueId请求，不接caller job_id启动；调用方cancel ID必须匹配当前活动任务。未知/陈旧/重复terminal、倒退计数、矛盾bundle、超行/非UTF-8/重复键都使连接failed并停止动作，不用旧结果覆盖新任务。

结果真实交W.startServer({bundle})展示/下载，report_url仅自有W loopback服务url；不复制W模型/下载逻辑，不重算Q，不把W嵌入被其CSP禁止的iframe。页面有正常报告链接，保留工作台以便再次选择；新的start不把旧Q冒充本次结果。超过两份时关旧W server并移出recent；选择取消无假报告、扫描取消有真实报告。关闭本工作台关闭所有自己建立的报告服务。固定launch关闭时先发送shutdown，2秒未退出只终止自己的X，diagnostic stderr不回显；不自动重启/弹窗。

最多一个私有headless Chrome；回放协议必须明确来自保留捕获的测试回放，不称已经运行新X。至少覆盖取消后再扫、完整→选择取消→确认已取消、busy、有效取消、跨origin/缺token/错job不发命令、异步stale result、断管、报告轮换关闭、实际W页面与系统鼠标点击Q下载原字节。新接口请求权限并非自然用户手势鉴真。X/Y整链由总控两票收单后另做有界验证。
