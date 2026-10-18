# R补单01、T、U总控独立验收与隔离集成

2026-10-19。本波R补单01/S/T/U全部收口，A–U及六补单VERIFIED（Windows受控范围）。无未结外贴票、新READY票或自动实现者。M1尚未完成。

| 票 | 接收提交 | 原受测实现 | 原最终门复跑 |
|---|---|---|---|
| WATER-W1-R | a8386d81302433d95cbd8d6f229383382352d272 | a7cbe2bf6311282bc33f291122a31fb907577b41 | fmt/test/clippy/metadata/bridge 全通过 |
| WATER-W1-T | df00405c029e81d3b7e93b5a6d24e95d185099fd | f26f727b715f06d97bd8a5c13e6e40225a2f6d68 | check/test/browser 全通过 |
| WATER-W1-U | 545df673885fae0a90922261cbae14f694ebfe62 | 39ea9ff30426d4c211f0eada6d85f3d3a87dd43d | fmt/test/clippy/metadata/bridge 全通过 |

隔离与主线受测提交 ae5d34a9eda43ec8908f8115fe1456b23f2fb90f，controller/water-w1-rtu-20261019。R748/T334/U405，共1487原交付路径在worker、隔离树和主线当前字节逐一相同；R702/T311/U390，共1403原helper证据与源哈希/长度一致。R原受阻24文件及六个控制材料保持；追加控制材料c0e2025已在主线3d0faef存在，未重复改写。291冻结、A–Q/S任务对象、旧产品/根Cargo及全部原fixture保持。

## 独立实测

新私有offline/locked/jobs1 target/home/tmp；R/U各原五测试、fmt/clippy -D warnings/metadata与真实公开桥接通过，T完整五测（模型3/浏览器2）与语法通过。R真实P→R→A→Q和附加祖先桥接，U11正例/19错误及动态限值桥接均实跑。原门R5/T3/U5共13项在各自接收HEAD复跑，产品树与原受测实现相同。

九项真实生产负控逐项使用worker原坏源码快照重建：R根身份/no-follow/取消；T导出route泄漏view/错误当前ordinal/Unknown改0；U深层重复遗漏/误提归属/名称泄露。每项完整五测实际运行并命中目标红，立即原字节恢复后完整五绿；没有修改测试或用编译/缺文件/超时造红。所有stdout/stderr、好/坏源码和T截图保留。

R三个独立用例：81组深度/全局/单目录预算矩阵与实际后代祖先保护、8个观察取消前缀及panic回收、宿主已有active不被失败调用取消/错根与预取消missing路径。均真实A校验和Q对照。13项编译拒绝及成功对照检查私有scan/record/options字段、禁止Deserialize/Default等和不可变report getter。

U三个独立用例：65组动态声明改名隐私/计数等价、4096层合法/损坏语法优先与转义重复/256KiB边界、五种映射/Unicode scalar/workspaces边界。8项编译拒绝及成功对照核私有Evidence/Counts与禁止Default/Deserialize。纯内存，不获取真实package.json或提升分类。

T三个独立用例：动态ID关联与原Q文本/额外字段/getter拒绝；两份caller同步捕获隔离、精确routes/Host/HEAD/attachment；独立Chrome真实点击下载三份当前快照，换快照及筛选无条目后仍与整份原Q逐字节一致。双尺寸截图/Unknown保持；原浏览器测试另有28次实际下载。总控实际查看1440、900与导出预览截图，布局和字面HTML/未知含义符合受控报告要求。

## 范围、失败与未验证

仅复用r树原固定4目录/6文件条目含1硬链接/1junction，60字面payload/74逻辑字节；只有原冻结prepare有限读合成payload作校验，Rust产品/探针只读index和元数据。隔离树没有新造物理fixture，无删除/移动/ACL/真实用户数据扫描，日志/缓存/profile/下载全部保留。

T的HTML/CSS在Git checkout与worker原件存在自动换行差异，其中CSS原件是混合换行。确认仅CRLF/LF不同后复用worker原字节，Git规范内容未变；早期干净状态断言遇到旧stat cache而失败，随后限定路径刷新/状态检查恢复干净，没有改产品语义或旧锁。该控制操作及原SHA记录保存。原worker报告中的clippy、诊断标签、键盘驱动、暂存锁竞争等历史均保留，不冒称没有发生失败；本次最终检查和独立验收没有产品失败。

R原生失败/其它卷/ACL拒绝/恶意生产竞态、U所有资源耗尽分支、T合法64MiB临界/资源替换竞态及macOS/真实用户scope/桌面保存/删除仍未验收。R保守标记继续false，Q精确数量/大小仍可关联，不保证匿名。

特别边界：T当前冻结source_kind只接受retained_j_capture和synthetic_memory；本次未把新R原生捕获冒标为内存样本来宣称完整宿主闭环。R→A/Q与T的既有实际A/E/H/Q供数分别验收，S也已独立验收；下一波必须先冻结原生来源/宿主会话协议，再并行宿主生产者和页面消费者。U内容授权采集也需独立契约。

[原收单/门复跑](w1-rtu-review-20261019/submission-review/2026-10-18T15-51-17.861Z-35976-audit-result.json)、[隔离受测](w1-rtu-review-20261019/integration/2026-10-18T16-03-36.856Z-40524-result.json)、[原字节归档](w1-rtu-review-20261019/ARCHIVE.json)。
