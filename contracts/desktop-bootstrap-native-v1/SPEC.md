# AC补充单04：无编码歧义的单窗验收

2026-10-24，总控。补单03接收b7dc83085a5edd9f38c12e70a53658ba6ae9cfa2，产品eb7f80178191e233068015bbc26dc9798ac8cb22未改。旧523、旧报告与46/189/88原件保持。原native一次失败/强制终止已发生，不改洗为通过；没有实际UIA文本或正常exit0证据。

新控制仅解决Windows PowerShell5.1以Windows-1252读取无BOM UTF-8中文常量的错误。新增ASCII-only policy/probe/observer，运行时与无UI预检调用同一Test-WaterDesktopPageText。预检实际解析三PS1，核所有字节ASCII、四文案与原HTML一致、完整文本通过、逐项缺失失败；重现旧helper误解码。不运行产品或窗口。

原helper仅断言两中文文案，新observer按原产品SPEC实际观察四文案（Water、桌面壳已启动、尚未接入扫描、只读开发预览），这是明确加强的验收，不放宽旧断言。仍只从自有PID/固定title窗口观察，顶层恰1、树≤1500、文本≤65536字符，不截像素。实际采集文本在断言前持久化，错误也保留。关闭自有窗口并核正常exit0，保存有界父PID链的子WebView参数/私有profile路径，再核子进程结束；失败不能写成正常关闭。

补单04只给原AC对话额外一次静态桌面窗口，最多30秒、0目录窗；原已用一次保持累计历史，不删除旧reservation。新allocation只在新目录保留一次reservation，失败不循环、不自动再开。总控派前0窗，真正使用额外窗口由用户转贴此编号单后的原执行者执行。没有产品扫描、用户数据/物理fixture/AA/AD或其它UI权限增加。

原树/分支不变，首次精确干净b7dc830。产品/测试/锁14文件必须与eb7f801一致；source/test哈希分别38c7a927cb30fd79f91e5e52e875a81dcb1585b359390dca50af5b24a2d2139d/211ba3014991309b2bda94cd422f4496c2ac552fa57507c3bb35283ae2acefe7。复用已审计旧先红/两负控/恢复、补单03同干净82d04aa的final check/test；不重跑下载、产品测试或clippy。只新增resume/preflight/native入口scripts/ac-native-check.mjs，主检出绝对只读。原freeze/helper/mirror定义不变，新529约束。

本补产品文件只读，不允许借验收修产品；若发现产品实质问题，停止并交总控编号回派。额外native仅用已有私有缓存Rust1.95/jobs1/offline/locked构建原bin；600秒构建上限保持，禁止配置/网络/证书/代理修改或cache别名复制。profile/缓存/旧日志保留，不纳Git、不清理。

新报告docs/dispatch/reports/WATER-W1-AC-ADDENDUM-04-REPORT.md，新证据docs/acceptance/wave1/ac/addendum-04/。执行者后加提交仅这两类；实际SHA、复用证明、真实UIA/关闭/子进程/失败及source/archive/bytes/SHA完整记录。完成仅SUBMITTED，独立集成/产品VERIFIED由总控另验；实际桌面扫描、用户scope、生产竞态、macOS/M1未验收。
