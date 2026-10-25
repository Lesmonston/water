# AC补充单06：精确区分应用主窗与固定框架事件根

2026-10-25，总控验收契约修订。补单05接收8a3b475918684a18be318415a9f7a54470c916b8，实际受测干净a333487，产品eb7f801的14文件未变。真实UIA完整记录2根：一个`Tauri Window`主窗和一个`Tao Thread Event Target` Pane；两者offscreen=false、handle非零，旧Count>1规则严格失败。已核主窗正常exit0、无强制终止；四文案检查未到达，冻结childClose成功分支未执行。累计三次窗口allocation已用，原失败不改写。

本补**明确更改验收计数语义**：接受条件从“所有自有UIA根恰好1”改为“恰好1个应用主窗、至多1个固定Tao事件目标、0未知或无效根”。这不是旧05通过或仅修日志。原始rawRootCount和所有元素不删减；applicationWindowCount、frameworkEventTargetCount、unclassifiedRootCount分别保存，不将2改写为1。窗口预算按产品启动次数计算，不代表像素可见性。产品代码、console/subsystem与权限均不改。

精确主窗须同自有PID、name=`Water Desktop Preview`、class=`Tauri Window`、ControlType.Window、WindowPattern=true、非零HWND、offscreen=false、control/content=true、正宽高。框架目标仅接受同自有PID、空name、精确大小写class=`Tao Thread Event Target`、ControlType.Pane、WindowPattern=false、非零且不重复的HWND、offscreen=false、control/content=true，bounds原点(0,0)、宽高各0–64，RuntimeId恰为[42,HWND]且与其它根不同。64是本轮保守容差，不宣称其它尺寸必有害；超界原样记录并失败，不自动扩宽。helper可为0或1，第二主窗、第二helper、其它Pane、offscreen根、handle0或属性缺失/读取错误/重复身份全部拒绝。完整快照最多32根，字符串及数组/数值有界；不完整不得成功。没有通用隐藏窗口或类名白名单。

例外绑定[FRAMEWORK.json](FRAMEWORK.json)的tao0.37.2版本、Cargo.lock、既有crate SHA和发布包内event_loop.rs SHA。resume/preflight/native都先校验锁内包标识、压缩包SHA、内存tar成员与既有源码逐字节一致；native在reservation和启动之前再次核验。observer另核三个物理SHA，pin失败不枚举UIA。只读当前缓存，不下载/解包落盘/运行上游。已锁包声明VCS commit2d9b2ba且dirty=true，不能称为精确远程发布树。发布源码628–687行是事件投递节点依据，offscreen=false/非零HWND仍保留；layered样式是实现意图，不是物理不可见证明，函数未设置可据以要求alpha0的属性。

新ASCII共享window-policy由运行和无UIprobe共同使用。probe解析三个新PS1、绑定十个静态UIA属性但不调用RootElement/枚举窗口；回放05真实已归档2根并同时证明旧policy仍拒绝、新契约精确分类可接受，标明这是历史数据回放；逐项不安全变体和四文案缺失仍拒绝。实际未改HTML的四文案存在不是页面渲染通过。

native先保存原始根明细再执行分类，保存失败的完整现场并仅以唯一明确主窗安全清理。成功页面四文案观察后，**关闭前再取一次完整自有根快照**，两次均须符合新契约，主PID/HWND/RuntimeId保持一致；后现额外根或更换主窗仍失败。finally再次核PID/title/class/type/HWND/RuntimeId再请求主WindowPattern.Close；失败清理不改原失败，未知/歧义不任意关闭。仅两次有界采样，不声称排除全部瞬时窗口/生产竞态。全部原始root、页面文本、子进程/profile、主错误/cleanup/termination分别保留。

验收仍同时要求：页面四文案真实UIA命中、主窗正常exit0、实际私有profile命令行、捕获WebView/conhost的冻结childClose分支无残留、墙钟≤30秒、0目录窗/截图。仅计数回放成功不能记native通过。未改的capture/reuse/rustEnv与全部非计数成功断言保留，复用03同干净82d04aa的final check/test及02先红/两负控/恢复，不重跑。

精确续做干净HEAD为8a3b475，唯一入口主检出scripts/ac-window-check.mjs；首次resume后，原AC对话仅一次native --final。新日志.local/checks/WATER-W1-AC-ADDENDUM-06；新编号明确**另增1次静态窗allocation、≤30秒、0目录窗**，旧三次保持，累计分配4次，单次reservation不循环。总控本轮0窗口/0构建/0下载，不代跑。Rust1.95/jobs1、既有私有home/target/tmp、镜像仅命令参数/offline/locked保持，Cargo build≤600秒、observer≤25秒；实际产品预算不延长。

旧535约束/23继承锁、旧425归档及报告、缓存/现场/profile全部保留；新增7条目、24继承锁共542约束。新永久写仅报告docs/dispatch/reports/WATER-W1-AC-ADDENDUM-06-REPORT.md与证据docs/acceptance/wave1/ac/addendum-06/；14产品只读。不得merge控制提交、清理/reset、push/改台账、自动启动另一个执行者，不接AA/AD/扫描、用户scope或物理fixture，不读AA排除图片/像素。不修改系统网络/代理/证书或持久Cargo配置，不能现场扩宽helper规则。失败交回原字节及实际退出，停测；产品修复必须另编号回派。AC仍BLOCKED待真实验收，macOS/M1等未通过。
