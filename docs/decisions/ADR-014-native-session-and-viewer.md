# ADR-014：真实原生会话生产者与页面消费者同波

2026-10-19，总控。A–U及六补单已验收；本波以冻结字节协议把S/P/R和报告页接起来。实现继续用户外贴，总控不自动启动实现者。

| 票 | 独占实现 | 已验收前置 | 独立验收方式 |
|---|---|---|---|
| V | packages/native-session：可信Rust会话API与开发预览CLI | A/P/S/R/E/H/Q | 实际系统选择/取消→P→R→真实E/H/Q，CLI原字节输出、许可回收 |
| W | prototypes/native-review：原生/旧报告页面、流入口与固定程序启动器 | I/T及冻结native-session协议/实际S/R捕获 | 原生真实捕获回放→流入口→loopback→Chrome→实际Q下载；旧T24样本兼容 |

V/W不争写旧产品或共享文件。W在独立树没有V实现，核心流/页面入口无需V代码即可验证；固定启动器的真实V.exe→W链路由总控收两单后联合验收，不能拿回放冒充V产品。W只允许固定项目内原生程序路径、结构化argv/shell=false，HTTP/WebView不接受路径、命令或扫描请求。

新协议将native_scope_metadata作为实际原生捕获来源，不把新R改成synthetic_memory。选择器取消没有扫描快照；确认后即便R预取消也有真实cancelled报告。policy说明no-follow、有界预算、不读普通内容及手势/竞态未鉴真。Completed仅表示该策略内覆盖。

V库无新FFI/任意路径扫描/内容采集，使用真实S/P/R和E/H/Q；成功、错误、observer unwind都撤销本次登记，不影响宿主既有scope。CLI只接可信本机初始目录，该参数仅设置选择器起始位置，实际扫描路径来自S结果。stdout仅UTF-8协议，不经PowerShell文本管道；W固定子进程raw pipe接收。

W新目录保留旧T/I源文件不变，旧bundle仍委托真实T模型。原生bundle按独立来源/策略严格验证，不能靠临时改tag调用T。页面只读，下载仅真实Q文本；完整NativeScan侧车、绝对路径与root/file ID不进新会话协议。页面不做来源真实性或自然手势鉴真。

V只能由新冻结adapter调用原R夹具工厂，在v本树.local创建同样的4目录/6文件条目含硬链接/1junction（60字面、74逻辑字节）；controller生成输入复用原controller夹具。W无物理扫描夹具权限，只内存回放、loopback、私有Chrome/下载。

U内容采集、版本/引用识别不由目录选择自动授权，暂不派权限未定义的reader；macOS/桌面壳/发布另排。V/W需精确基线、独立树、实际baseline才READY。旧21任务对象、基线、helper、13旧锁/291冻结、旧产品/根Cargo及所有现场保持。
