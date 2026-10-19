# V/W原生会话同波计划

用户要求后续按波次一次出齐独立票。本波两条：V packages/native-session 真实选择/扫描/报告API和CLI；W prototypes/native-review 原生/旧报告页面、原字节流和固定程序启动器。权限、wire、五测及来源约束见ADR-014和三个新契约目录。状态/精确SHA/分支与实际证据以manifest和NATIVE-HOST-READY-REPORT为准，计划本身不授权执行。

| 线 | 已有依赖 | 独占写入 | 不依赖在途实现的验证 |
|---|---|---|---|
| V | A/P/S/R/E/H/Q | 新native-session crate、bin、测试、v证据 | 同树受控实际S→P→R→E/H/Q；V真实API/CLI随后独立测 |
| W | I/T、冻结协议和保留的实际原生捕获 | 新native-review及w证据 | startFromStream→HTTP→Chrome→实际Q下载；旧T24份原输入兼容 |

W没有V产品，不放假exe或加测试binary入口；正常固定launchNative整条链等双方收单后总控真正组装V.exe再测。W公共流/页面入口在本票即可完整独立验证，V不是该核心实现的代码依赖。旧T保持，不用synthetic_memory冒充原生来源。

总控输入是八份实际原生捕获：选择取消、完整、深度partial、预取消、observer取消、全局预算partial、深度0根issue、根预算空串issue；每份保留真实A source_report和实际E/H/Q，无root身份/绝对路径进bundle。Controller复用旧夹具；V本树只由冻结adapter调用旧R工厂建固定60字面/74逻辑字节batch；W无物理扫描fixture。所有旧291冻结/21任务对象/基线/helper/旧产品/根Cargo/原树日志保持。

新V/W实现由用户外贴，不自动启动worker/子代理。先实际baseline，READY仍不等于已外贴；每树一次一门，V jobs1，W最多一个私有Chrome。发生独立阻塞不拖住其它线，产品缺陷编号回派，总控独占集成。

本波联合验收必须运行真实固定V程序→W.launchNative→原生来源页面/取消/下载，并保持普通内容未读、no-follow/预算、真实Unknown与“Completed仅策略内覆盖”。这仍是Windows受控开发预览；真实用户scope/生产竞态/macOS/桌面壳/删除不从本票放行。内容读取没有额外同意，不因U已实现或目录已选择而开放。
