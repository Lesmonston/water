# WATER-W1-G/H 总控验收与集成

2026-10-18（Asia/Tokyo），总控 Codex。结论：G/H单票及统一隔离集成全部通过，VERIFIED（Windows范围）。没有改worker源码、测试、冻结或旧产品。

## 接收与单票检查

G接收干净HEAD `85c64d5104960a7c2d0613298361a1bbcaf49fd5`，受测实现`4ae559b3c84856994bb09e252834987518982f70`，60新增文件：六产品/测试，54后加证据/报告。H接收干净HEAD `cab41d1ab826a39bdd19bac619dfc2975177eb8b`，受测实现`52748c5895f485aa54f65c6943ab8bf74fd95ddb`，54新增文件：六产品/测试，48后加证据/报告。全部符合原票白名单，045ab4f为共同精确基线祖先；报告提交未夹带产品变化。Grok 4.7为两执行者自报。

两票均在干净接收HEAD串行重跑原fmt/test/clippy/metadata/bridge五final门，全部首次通过，各精确五测试零失败/忽略。G实际G→A JSON往返→E投影为17正例、2raw及10构造拒绝；H两入口为11正例、6raw及6非法DTO拒绝。依赖、锁来源/版本及workspace/目标由原门核对，根Cargo不变；六份新旧锁共83唯一文件一致。

G独立[四项Rust测试](w1-gh-review-20261018/g/2026-10-17T15-18-53.360Z-4120-result.json)通过：

1. 未列入golden的run/case、乱序父子路径、a/ab边界、全未知保护、u64精度与完整sidecar，以及真实A往返。
2. 递归遍历每个对象，逐字段删除/重复、逐对象额外字段/位置数组拒绝，150多条断言。
3. 身份/覆盖/计数错误、Unicode标量label边界、Windows拒Unix与纯合成Mac上下文保留Unix身份。
4. 4000条、原facts不超过8MiB的输入，展开报告超A上限时ReportRejected，不截断。

H独立[三项Rust测试](w1-gh-review-20261018/h/2026-10-17T15-18-53.365Z-27584-result.json)通过：非均匀类别/风险分布与严格键集、来源37及两个u32max保持；8类被剔除字段非法DTO和raw错误精确交回A；所有被剔除文本/标识/工具字段及顺序变化后输出不变，输入和来源totals不受结果修改影响。

静态审阅全部生产源码：G从原始JSON严格对象DTO解析，按路径段查严格后代，完整保留facts；context只是声明。G所有finding未知保护，总容量未知，调用真实A验证及序列化限额。H先A验证，再明确结构计数/克隆来源totals，没有Value删字段或动态键，没有匿名/安全公开承诺。两库生产仅内存，无文件/网络/环境/时钟/进程入口。

## 历史负控与过程限制

G的52份、H的46份worker原始归档与.local原件逐字节一致。G三项、H四项（含计数固定0的行为红）均核对：原/恢复源hash等于提交源码，坏hash不同，完整五测试成功编译并命中目标断言；恢复日志重新编译且五测全绿。原始输出可读，总控不重复变异产品。额外归档receipt引用但worker未复制的日志，保留原始字节。

G报告未提供独立的实现前行为红；H把计数0称为先红，但可读记录已有更早绿测，无法证明历史先红顺序。本次验证当前产品及测试有效性，保留过程证据限制，不把编译/格式/Clippy失败或事后负控当作已证明的实现前红。此限制不改变冻结接口、安全要求和当前验收断言。

总控第一次归档暂存把全部显式文件名放入单次git调用，进程未能启动（status=null）；改为有界分批显式暂存，避免Windows命令行长度限制。此为行政工具失败，没有运行或修改产品。

## 集成与边界

统一隔离树`.worktrees/integration-gh-20261018`、分支`controller/water-w1-gh-20261018`无冲突合并两票；实际受测SHA为`e383ece84f2943fe099106f2e121643417bbe346`，前后干净不变。[集成receipt](w1-gh-integration-20261018/2026-10-17T15-25-29.855Z-18684-result.json)记录新私有缓存/target、离线jobs1下，G/H各五测试、fmt/clippy/metadata、原桥接与七个独立Rust测试首次全过。

真实链路由控制Rust程序调用F公开入口、Serialize真实facts交G、A JSON往返，再调用E两入口与H两入口，最后将真实E输出交既有I模型的assertReportView/selectFindings/summarizeView。原生11 case/12 scope/39 entry由冻结matrix逐项核对；另有预取消及Injected PermissionDenied两个控制样本，共13个链路样本。每项验证完整facts sidecar、全未知保护、计数和来源totals未知。没有用expected代替程序输出；I页面未接此链路。

冻结prepare仅在本树.local新建11正常+6负例有界合成run，内容字节81717，44快照一致；没有ACL/移动/清理。83唯一冻结、A–F及I产品tree和根Cargo保持；G产品tree `0bd0579c6301eaf6ff489a594545a603b11aa92c`、H产品tree `c109f4aca0348d96ee7ce8d4eb2b8619e48bd2f9`与接收提交相同。[114份worker文件](w1-gh-integration-20261018/worker-byte-manifest.json)全部物理字节一致。[原始集成归档](w1-gh-integration-20261018/archive-manifest.json)记录53文件hash。受测SHA后只补文档/台账/证据；main快进推进另存同目录main-promotion.json。只允许冻结prepare在控制树.local新建一批有界合成夹具，库只读，不触真实用户目录；I页面没有扫描结果输入接口，本轮不把库/模型联测称为正式页面接线。A–F及I旧产品/冻结保持，macOS、真实用户scope、生产竞态、分类、去重容量、桌面与删除未验收，M1未完成。没有自动启动实现者、清理、push或发布。
