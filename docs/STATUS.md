# Water 状态与交接

更新时间：2026-11-02 19:45 JST（第 14 份交接；第十波：五件新事项已拍板，长列表与常驻隔离区入口进了设计 v2，见第 47 条；下一步基准表、夹具与契约；此前用户 18:05 认可界面设计 v2，并要求把每一轮清理的经验全部做进 Water，[第十波计划](dispatch/wave10/PLAN.md)逐条对照 67 条经验，[ADR-019 草案](decisions/ADR-019-project-declarations-and-quarantine.md)；设计稿：[设计 v2](design/water-ui-v2/DESIGN.md)、[可点的设计稿](design/water-ui-v2/mockup.html)；此前 **M3 达成**：第六次整合检查通过，release `water-0.1.0-bb92c87e` 编好，F1/F2 在 D 盘与 `F:\Mirasim-A` 只读复验通过，“几天后满”与手算一致，见[收口报告](acceptance/wave9/controller/WATER-M3-CLOSE-20261102.md)；下一步第十波，先按收口结果重看计划第 4、5 节；此前第九波四张单全部验收合入（L1 `28736089`、L2 `37fa96f1`、L4 `b39bfcdf`、L3 `bc433e6c`，[验收报告](acceptance/wave9/controller/WATER-W9-REVIEW-20261102.md)）；L2 开工检查后受阻（`5431e812`，单子里“夹具只建普通文件与目录”与原有测试的联接、硬链接夹具冲突，总控疏漏），补单 01 已出，待外贴；第九波已拍板“全部按推荐”：契约冻结 `contracts/m3d-v1/`，基线 `57ecd7ce`，L1～L4 四张单 11-02 派出（L1、L2、L4 给 sol，L3 给 grok），见[计划](dispatch/wave9/PLAN.md)第 8 节；第十波等第九波收口后再做；denglou 收尾回执已并入[总控清理的固定做法](maintenance/CLEANUP-METHOD.md)；`yb-release` 里的正式签名本机副本已随隔离区删除，EAS 仍有，要不要再下一份离线备份由用户定；denglou 隔离目录用户 12:00 已删，F 盘可用 372.72 GB，四盘合计 532.5 GB；剩一个 3.3 MB 的 `nul` 文件待用 `\\?\` 命令删，`F:\_denglou-quarantine-20261102`（5.72 GB）可删；下一轮计划草案待拍板：[第九波 M3 收口、第十波 M3.5“结论优先”](dispatch/wave9/PLAN.md)；四个盘清理结束，用户删完隔离目录，四盘可用 205.7 → 368.2 GB；M2 自清理 01:13 达成；见[清理记录](maintenance/CLEANUP-20261101.md)；M3 等用户拍板 F1、F2 修法；第 13 份交接）。

更换总控请先读[最新交接报告（2026-11-05 第 17 份）](CONTROLLER-HANDOFF-20261105-17.md)；[第 16 份](CONTROLLER-HANDOFF-20261105-16.md)、[第 15 份](CONTROLLER-HANDOFF-20261102-15.md)、[第 14 份](CONTROLLER-HANDOFF-20261102-14.md)、[第 13 份](CONTROLLER-HANDOFF-20261102-13.md)、[第 12 份](CONTROLLER-HANDOFF-20261101-12.md)、[第 11 份](CONTROLLER-HANDOFF-20261101-11.md)、[第 10 份](CONTROLLER-HANDOFF-20261031-10.md)、[第 9 份](CONTROLLER-HANDOFF-20261028-9.md)、[第 8 份](CONTROLLER-HANDOFF-20261027-8.md)、[第 7 份](CONTROLLER-HANDOFF-20261027-7.md)、[第 6 份](CONTROLLER-HANDOFF-20261027-6.md)、[第 5 份](CONTROLLER-HANDOFF-20261026-5.md)、[第 4 份](CONTROLLER-HANDOFF-20261026-4.md)、[第 3 份](CONTROLLER-HANDOFF-20261026-3.md)、[第 2 份](CONTROLLER-HANDOFF-20261026-2.md)、[上午那份](CONTROLLER-HANDOFF-20261026.md)及其只读状态快照仅供追溯。M1 已达成；第四、五波已全部验收合入，打开清理的 release 版已编好，M2 只差自清理；M3 第六波三张已全部验收合入，第四次整合检查通过，含第六波的 release 版 `water-0.1.0-b62f9c5c` 已编好；第七波（M3 收尾）四张已全部验收合入（见下文）。此前[接手验收摘要](CONTROLLER-HANDOFF-20261017.md)仅供历史追溯；当前任务状态以本页、registry/manifest及最新正式验收为准。

## 已确认

- 用户授权正式立项，项目根为 `F:/new/smaltalk/water`，总控为 Codex。
- 首版服务 Windows、macOS AI 开发者，覆盖 AI 编程、包管理器、本地模型与开发基础设施。
- 本阶段完成目录与版本管理、范围定义、开源源码静态分析和下一阶段工单；不启用真实清理。

## 已完成：M0 / W0

- 建立独立本地Git、AGENTS协作规则、立项书、首版需求、安全架构、ADR、里程碑及W0/W1工单。
- 克隆并锁定Jharu、Developer Machine Cleaner、Mole main、Kondo、npkill；四份静态审阅与总控汇总已完成。
- 原始调研已复制到research/sources；第三方checkout在research/upstream，未修改、未跟踪进Water Git。
- 首轮校验通过：19份Markdown、26处本地文档链接、182处固定commit源码引用；5个checkout的HEAD、origin、许可证哈希及洁净状态一致。
- 另有4处Mole Windows固定commit文档引用没有本地checkout，只做了网络核对；未把它们算作本地实现验证。
- M0当时暂定独立Rust内核 + Tauri 2 + TypeScript/React。当前已实现的B/C和A契约状态见下文，尚未运行竞品或真实清理。

## 下一步

A–AB及八补单、AD保持VERIFIED；AC/补单06新增VERIFIED（Windows静态桌面基础），AE仍仅研究文档VERIFIED。AC接收29a895d/实现eb7f801，原14产品字节及479归档/16,293,091字节已审计，隔离受测b417835已快进主线。06真实native两份raw2/main1/固定Tao1/未知无效0快照、四文案、正常exit0、私有profile及冻结childClose通过，5510ms；旧03–05失败保持，四次worker allocation已用。总控只做无UI独立Rustc库编译、原三测、137配置/73导航拒绝及26正向、实际快照复算和5根变体/四文案缺失拒绝；不额外开窗，不重跑Cargo/Tauri/旧负控或下载，未改产品与网络配置。旧542保持，总控5新条目/25继承锁共547约束；修正工具按执行前源SHA留档，其它30任务/槽位不变，无自动实现者。AC静态前置已解除，下一波仍须冻结接线接口/范围/测试后才READY；真实AA→AD、桌面扫描、用户scope/自然同意鉴真、生产竞态、macOS/M1未验收。 [AC/AD/AE派前回执](dispatch/wave1/DELIVERY-WAVE-READY-REPORT-20261023.md)。

## 方向调整与第二波派前（2026-10-26，最新）

用户同日五项决定：改方向；开发期用本机真实垃圾做只读测试；应用内一体化清理，界面由总控设计（淡蓝、磨砂玻璃）；扫描范围扩到全设备垃圾并分级；用 Water 清掉 Water 自身开发垃圾作为里程碑。记录见[ADR-018](decisions/ADR-018-device-junk-checkup-and-in-app-cleanup.md)，路线图已重写。第二波 A 规则、B 扫描、C 进程、D 清理执行器与 E 桌面界面五票 READY，见[派前回执](dispatch/wave2/READY-REPORT-20261026.md)；界面按用户第二次审稿定为[白色磨砂设计稿](design/water-ui-v1/mockup.html)。新产品代码尚未开始。

**派出（2026-10-26 14:05 JST 用户告知）**：A、B 交 Cursor，C 交 Grok，D、E 交 Astra（E 为界面票）。当时 B 已提交实现 35c94d2，D 已开始写产品文件，E 已自跑 baseline；A、C 树里尚无动静。具体模型以执行者回执自报为准，记录在 [manifest](dispatch/wave2/manifest.json)。

**E 受阻与补单 01（14:07 JST）**：E 在实现前交回冲突：UI SPEC 要求截图写进 `docs/`，而 final 要求树干净，两者不能同时满足。这是总控设计漏洞，已在自测树复现。检查入口改为截图先写 `.local`，再由 archive 按哈希归档，并规定 12 张必备截图；已自测正反路径。[补单 01](dispatch/tickets/WATER-W2-E-ADDENDUM-01-20261026.md) 让 E 从 `e06d24a` 续做，贴回原 E 对话。E 自报引擎为 Codex GPT-6（通过 Astra）。

**第二波收单（2026-10-26 下午）**：五票都交回完成。总控逐票做了机械核对、新私有树重跑、自己的负控、独立代码审查、真实交叉核对、D 的合成用例和 E 看图，[验收报告](acceptance/wave2/controller/WATER-W2-AE-REVIEW-20261026.md)。机械层全部通过，但五票本轮都不进 VERIFIED，各发一张补单：A 保护优先判定（根源是 RULES 契约写错）、B discovery 排除方向反与非 ASCII 路径崩溃（高危）、C 测试清理可能误杀无关进程、D 测试夹具绑死树名与删除前复核父目录、E 行为修正与四处视觉偏差。补单都在原树从交回提交续做。

**补单派出（16:15 JST 用户告知）**：A-01、B-01、C-01、D-01 交 grokbot，E-02 交 Astra，均为新开对话。E-02 按原文派出，即“网站离线数据”保持需要确认、默认不选。派出时五个工作树都停在续做起点、干净。

**第二波 A–E 全部 VERIFIED 并集成（2026-10-26 17:12 JST）**：补单复验通过，见[第 2 轮验收报告](acceptance/wave2/controller/WATER-W2-AE-REVIEW-2-20261026.md)。B 的真实体量与总控独立测量 8 组相差都在 0.03% 以内；D 的测试已不依赖树名，总控合成用例全过；E 的四处视觉偏差已修好。五个执行者分支以 `--no-ff` 合入主线。下一步是设计第三波 F（桌面接线）。

**第三波 F1、F2 READY（2026-10-26 晚）**：[计划](dispatch/wave3/PLAN.md)把桌面接线拆成两张可同时做的票，F3 待两票验收后再出。
- F1 服务核心 `packages/water-service`：把 A–D 接成 IPC 的 17 个命令，重门。
- F2 桌面宿主 `apps/water/host`：Tauri 窗口加 Mica，命令转发，一次原生窗口检查。
- 两个产品取舍：这一版只做体检，清理先关闭（D 加固后再开）；窗口保留系统标题栏。
- 新检查入口 `scripts/desktop-wave-check.mjs` 已在两棵自测树走通，见[派前回执](dispatch/wave3/READY-REPORT-20261026.md)。
- **已派出（17:51 JST）**：F1、F2 都交 Astra，新开对话；记录时两棵树都停在基点、干净。
- **F2 受阻与补单 01（18:07 JST）**：
  - F2 在实现前交回受阻（`99766f6`，自报 Codex GPT-6）：选择框 `select_scope` 要 `Registry` 与 `OpaqueId`，picker 没有转出这两个类型，HOST 又只许依赖 picker。属实，是总控契约漏洞，桩宿主没真正调用它。
  - [补单 01](dispatch/tickets/WATER-W3-F2-ADDENDUM-01-20261026.md)：只加两个路径依赖用来构造参数；`pick_folder` 改为由调用方传初始目录；六种错误逐个映射并测试，测试不弹框。
  - 总控已在自测树走通 lock、check、test，锁没有新增任何包。manifest 里 F2 的依赖白名单已同步。HOST.md 不改。
  - F1 未受影响，仍在进行（已跑 baseline 与 lock）。
- **F2 补单 01 已派出（18:10 JST）**：交 Astra，新开对话；记录时 F2 树停在续做起点 `99766f6`、干净。

**第三波收单验收（19:20 JST）**：见[验收报告](acceptance/wave3/controller/WATER-W3-F1F2-REVIEW-20261026.md)。
- **F2 桌面宿主 VERIFIED，已合入主线**（`7633c4e`）：
  - 收单审计、新树重跑、原生窗口都通过；总控 5 条负控里 4 条打红，存活的那条是低级测试缺口；
  - 审查无高危；
  - 6 条事项移交 F3，最要紧的是启动失败会 panic，而不是打印固定中文并以 1 退出。
- **F1 服务核心需要补单**：
  - 主线扎实：清理关闭时没有任何路径会删文件；
  - 总控合成验证在清理打开时只删计划内条目，释放字节数完全对上；
  - 真实冒烟与总控实测同口径相差不到 0.1%。
  - [补单 01](dispatch/tickets/WATER-W3-F1-ADDENDUM-01-20261026.md) 要改四处：
    1. 一个自定义位置失效，整份设置就被重置；
    2. 记录清理会删掉读不进来的文件，删不掉时服务每次都起不来；
    3. 重启后占用提示拼错；
    4. 开关关闭时参数校验在前。
  - 另补两处测试缺口。
- **F1 补单 01 已派出（19:22 JST）**：交 grokbot，新开对话；记录时 F1 树停在续做起点 `06182d6`、干净。

**第三波 F1、F2 全部 VERIFIED 并合入主线（20:05 JST）**：F1 补单复验通过，合入 `7d8715d`，见[验收报告第 2 轮](acceptance/wave3/controller/WATER-W3-F1F2-REVIEW-20261026.md)。
- 补单四处修改逐条落实；总控 8 条负控 7 条打红，存活那条由总控重启用例抓住。
- 两个总控合成用例都通过：清理打开时的全流程，以及重启后的设置、记录和占用提示。
- 下一步出 F3（接线与整机体检，完成即 M1）。要带上 F2 的 6 条与 F1 的 3 条移交事项，见 manifest 的 `carryOverToF3`。

**第三波 F3 READY（21:00 JST）**：[契约 WIRING](../contracts/desktop-v1/WIRING.md)、[工单](dispatch/tickets/WATER-W3-F3-WIRING-20261026.md)、[派前回执](dispatch/wave3/READY-REPORT-F3-20261026.md)。基点 `d56ebc6`（标签 `water-w3-f3-base-20261026`）。
- 宿主接上服务核心与选择框，清理保持关闭。
- 启动不再用 Tauri 的 `setup`，每种失败都打印固定中文并以 1 退出。
- 加单实例锁；测试增至 5 个，负控 3 条。
- 检查入口加了整机观察器：一个窗口里用界面完成一次真实只读体检，点“清理所选”只得到“这一版只做体检…”，再翻三个页面，共 6 张截图。关窗后核对数据目录里没有任何清理计划或记录。
- 自测树一次走通：真实扫描 69.5 秒，识别 43.0 GB，可放心清理 8.6 GB。
- M1 已知限制见 WIRING 第 7 节（默认数据目录不能在联接后面、占用提示显示进程名、release 启动失败时用户看不到提示等）。
- **已派出（20:47 JST 用户告知）**：F3 交 sol 并已贴出；记录时 `.worktrees/w3-f3` 停在基点 `d56ebc6`、干净。交接见[第 4 份交接报告](CONTROLLER-HANDOFF-20261026-4.md)。

**F3 VERIFIED，M1 体检 Alpha 达成（22:25 JST）**：见[F3 验收报告](acceptance/wave3/controller/WATER-W3-F3-REVIEW-20261026.md)，合入 `206a2cf`。
- **交回情况**：sol 交回时写“受阻”。实现、测试、三条负控、三个 final 都通过，只是整机检查 6 张截图里后 5 张是最小化窗口的标题栏（199×34）。
- **原因与修复**：这是总控观察器的缺口，已修（`9f9aab05`）：截图前恢复被最小化的窗口，并记录恢复次数；观察器、检查入口、收单审计都核对截图像素尺寸。不发补单。
- **总控验收**：新验收树重跑全部 final，做了 5 条总控负控，用自己那 1 次窗口补拍了 5 页，截图都是完整页面。
- **窗口被最小化**：对照实验显示现象是间歇性的，Water 没有任何把窗口最小化的途径。记录在[对照实验](acceptance/wave3/controller/accept2-20261026/controller/f3-window-probes/RESULTS.md)，留待用户试用时观察。
- **独立审查**：无高、中级问题；4 条低级观察移交宿主收尾票。

## 第四波 M2 前加固 READY（2026-10-26 晚，与 F3 并行设计）

用户要求不要每次只派一单。第四波三张票各改一个目录，可以同时派出：
- G1 D 加固（按句柄删除，重门，特殊票）；
- G2 服务加固；
- G3 界面修补（界面票）。

文档：[计划](dispatch/wave4/PLAN.md)、[派前回执](dispatch/wave4/READY-REPORT-20261026.md)、[第四波规则](dispatch/W4-HARDENING-WORKER-RULES.md)、契约在 `contracts/hardening-v1/`。基点 `0ca42f8`（标签 `water-w4-hardening-base-20261026`）。总控派前做了：
- 在本机实测了 G1 要用的全部 NT 系统调用；
- 三张票都用桩走通了全部检查与负控；
- 自测中发现并写进契约：现有 D 处理不了超过 260 个字符的路径；“操作坞盖住最后一行”实测不成立，改为回归锁定。

**已派出（22:25 JST 用户告知）**：三张都在新对话里贴出。G1、G2 交 grokbot，G3 交 Astra。记录时三棵树都停在基点 `0ca42f8`、干净；G3 已自跑 baseline 并通过（13:24:34Z）。具体模型以执行者回执自报为准。F3 无需补单，sol 的对话可以归档。

**G2、G3 收单（23:50 JST）**，见[收单验收](acceptance/wave4/controller/WATER-W4-G2G3-REVIEW-20261026.md)：
- **G2 VERIFIED**，合入 `7f01d71f`：
  - 新树重跑三个 final 都通过；
  - 总控 10 条变异抓到 9 条，存活的一条是 SPEC 未要求测的预算用尽分支；
  - 联接合成用例通过；
  - 真实冒烟的占用提示显示 Chrome、Edge；
  - 审查无高、中级问题，7 条低级观察记入清单。
- **G3 发[补单 01](dispatch/tickets/WATER-W4-G3-ADDENDUM-01-20261026.md)**，23:57 JST 用户已贴给 Astra（新对话），记录时工作树干净、停在 `27f44862`：
  - 进度查询暂停时，切换页面后提示条的文字从服务原因退回兜底句，与 SPEC 第 3 节“连接类提示不受影响”不符；
  - 测试注入的正是兜底句，所以没测出来；
  - 其余（11 处文字、tokens、折行、操作坞、4 条总控负控、23 张截图）都通过。
- **G1** 仍在进行。

**G3 第二轮（10-27 00:45 JST）VERIFIED**，合入 `aeb49ed3`，见同一份收单验收的“G3 第二轮”一节：
- 暂停时的提示切换页面后逐字保留；
- 总控负控有两条只被等待超时挡住、没有标记，记入后续，随标志小票改测试。

**标志改为冰山（10-27 用户选定）**：
- 水滴被认为像缴费类应用；看过彩色、黑白两轮方案后，用户选了黑白方案里的“冰山”原版，不用总控的改稿。
- 已写进[设计说明第 10 节](design/water-ui-v1/DESIGN.md)，资产与真实界面预览在 `design/water-ui-v1/brand/`。
- 实施：G3 补单合入后另派一张界面小票，内容是：
  - 侧栏、关于页、空状态三处换成冰山；
  - 宿主应用图标换成新图标；
  - 侧栏“体检”导航的水滴换成细线图标，先给用户看截图。

**G1 收单（10-27）：发[补单 01](dispatch/tickets/WATER-W4-G1-ADDENDUM-01-20261027.md)**，见[收单验收](acceptance/wave4/controller/WATER-W4-G1-REVIEW-20261027.md)：
- 机械检查、两个 final、总控负控都通过；总控 6 项合成用例全部通过（长路径、只读、联接、硬链接、目录符号链接的组合）。
- 独立审查经总控核实，删除路径上有：
  - **一处高级**：删除链接前不复核 FileId 与标签，删除过程中若联接被换成云占位文件会被删掉；
  - **四处中级**：
    - 身份不从条目句柄比对；
    - 枚举把错误当结束，可能误报已删除；
    - 残余按 ASCII 名字找；
    - 目录变了不停止本项。
- 补单还收了几条低级，最要紧的是快照查找是平方复杂度，M2 清十万级文件的 `target` 目录会卡住。
- 补单从 `b593f0be` 续做，可以新开对话。

**G1 第二轮（10-27）：发[补单 02](dispatch/tickets/WATER-W4-G1-ADDENDUM-02-20261027.md)**，见[收单验收](acceptance/wave4/controller/WATER-W4-G1-REVIEW-20261027.md)“第二轮”一节：
- 补单 01 的高级与中级 1～3 已解决：链接删除前从句柄复核、身份从条目句柄比对、枚举只认错误 18、残余按句柄。十万文件删除 23 秒（第一轮源码 155 秒）。
- 总控新增竞态用例：删除开始后再替换后面的对象，不需要生产代码挂点。第一轮源码在这些用例下删掉了被改成非链接标签的重解析点、把还剩文件的条目报成 `deleted`；本轮都正确。
- 仍不符：计划里的目录在删除中被换成文件或链接时，没有停止本项、继续删兄弟项（SPEC 第 4 节第 7 步），总控用例复现，没有误删。另有三处结果报告不准，其中一处是补单 01 自己的残余规则漏洞。
- 补单 02 只改 `native_windows.rs`，从 `23a6434d` 续做，可以新开对话。

**G1 第三轮（10-27）：VERIFIED，`--no-ff` 合入 `0cd9db7e`**，见[收单验收](acceptance/wave4/controller/WATER-W4-G1-REVIEW-20261027.md)“第三轮”：
- 补单 02 的 5 条都做到；“子目录被换成文件”用例转为通过（停止本项，后面的兄弟项没动）；总控负控、11 项用例、4 条用例变异、独立审查都通过。
- 剩下 5 条只是竞态下的结果报告不准，不会误删，记在清单 `carryOverBeforeM2`，M2 打开清理前一并处理（其中一条要先改 SPEC 第 8 步）。

**待办**：
1. **G1**：已完成。
2. **标志小票 [WATER-W4-G4](dispatch/tickets/WATER-W4-G4-BRAND-20261027.md)：VERIFIED，`--no-ff` 合入 `bc93d567`**，见[收单验收](acceptance/wave4/controller/WATER-W4-G4-REVIEW-20261027.md)。三处冰山、脉搏线导航、新应用图标（与设计导出件逐字节相同，宿主 fmt 与 clippy 通过）都已上；四条测试小缺口记在清单 `carryOverLater`。
   - 用户 10-27 看了四个候选的真实截图，“体检”导航选定 A 脉搏线；已写进[设计说明第 10 节](design/water-ui-v1/DESIGN.md)，候选对比在 `brand/nav-candidates-board.png`。
   - 应用图标导出件 `brand/water-app-icon.ico` 由总控用 `scripts/design/export-app-icon.cjs` 生成（16～256，重复运行字节相同）；执行者只原样复制到宿主。
   - 票面内容：三处换冰山、导航换脉搏线、删 `i-drop`、复制图标、测试第 448 行改带 `UI_NOTICE_SCOPE` 标记的断言；不 push、不改写提交。
   - 工作树 `.worktrees/w4-g4`，基点 `e5b90db1`，总控 baseline 已通过。验收时总控另编译宿主并核对图标哈希。
3. **主线整合检查：通过**（10-27，主线 `8af6229c`），见[整合报告](acceptance/wave4/controller/WATER-W4-INTEGRATION-20261027.md)。D 6/6、服务 6/6（G2 清理测试在新 D 上通过）、界面 3/3 与 5/5、宿主 5/5；整机窗口只读体检 11 步全过，1 个窗口、101 秒、没有删除任何东西，标题栏已是新图标。
4. **M2 准备三票：全部 VERIFIED，`--no-ff` 合入**（10-27 晚），见[收单验收](acceptance/wave4/controller/WATER-W4-G5G6G7-REVIEW-20261027.md)：
   - **G5 `fc1f0dd5`**：
     - 总控另写 7 个“先快照、再改磁盘、再删除”用例，在 G5 上全过、在旧源码上全败；
     - 12 项竞态用例按新计数全过；十万文件 20.4 秒。
   - **G6 `c7159029`**：
     - 整机窗口只读体检通过，退出码 0；
     - 真窗口里第二个实例 176 毫秒退出、最小化的第一个窗口 316 毫秒内回到前台。
   - **G7 `acee890f`**：负控与截图通过。
   - 审查发现的问题都不影响删除安全，记在清单各票 `carryOverM2`，其中两条中级：宿主后端退出时没真正释放；暂停期间读页面失败会停在“正在读取…”。

   派出时的记录（10-27 约 18:50 用户告知：G5、G6 交 sol，G7 交 astra；基点 `4f35c52f`），三票各改各的目录：
   - [WATER-W4-G5 清理结果报告修正](dispatch/tickets/WATER-W4-G5-CLEAN-REPORT-20261027.md)（删除路径特殊票）：按新契约 [CLEAN-REPORT](../contracts/m2-prep-v1/CLEAN-REPORT.md) 修 G1 剩下的结果报告问题；
   - [WATER-W4-G6 宿主收尾](dispatch/tickets/WATER-W4-G6-HOST-FINISHING-20261027.md)：按 [HOST-FINISHING](../contracts/m2-prep-v1/HOST-FINISHING.md) 做正常退出、第二个实例唤起窗口、服务起不来也有窗口、数据目录在联接后面、三处测试问题；`native --final` 会弹 1 个窗口；
   - [WATER-W4-G7 界面收尾](dispatch/tickets/WATER-W4-G7-UI-FINISHING-20261027.md)（界面票）：旧页面命令错误不落到新页面、暂停原因不被覆盖、G3/G4 留下的测试缺口。
   - G6 合入后由总控做日常使用的 release 构建。
5. **第二次主线整合检查：通过**（10-27 晚，主线 `49d0b4d2`），见[整合报告](acceptance/wave4/controller/WATER-W4-INTEGRATION2-20261027.md)：
   - 四个包都用最新的票配置（D 取自 G5、界面取自 G7、服务取自 G2、宿主取自 G6），检查与测试全绿：D 6/6、服务 6/6、界面 3/3 与 5/5、宿主 5/5；
   - 整机窗口只读体检 11 步全过：1 个窗口，75 秒，退出码 0，完整结果，没有删除任何东西；
   - 服务与宿主的离线缓存互不包含，同一棵树里哪个顺序都不行，要分树或中间换目录（第 7 份交接第 7 节已更正）。
6. **release 构建：已完成**（10-27 21:08）：
   - exe 在 `F:/new/smaltalk/water/.local/release/water-0.1.0-d64aa399/water.exe`（sha256 `7c6ecada…`，本地构建，`.local` 不进仓库）。
   - 用主线源码离线编译，带镜像参数，没有警告。
   - 图形界面程序（没有控制台窗口），界面已内嵌，需要 WebView2 运行时（Windows 11 自带）；数据目录默认 `%LOCALAPPDATA%\Water`；清理仍关闭。
   - 在夹具数据目录上冒烟：窗口正常；第二个实例 43 毫秒退出，最小化的窗口 122 毫秒内回到前台；关窗退出码 0。
   - 构建脚本与日志在 [integ2 controller](acceptance/wave4/controller/integ2-20261027/controller/)。
7. **M2 计划已拍板**（10-27，四条都按推荐），见 [M2 计划](M2-PLAN-20261027.md)。
8. **第五波（M2）五张票 READY**，基点 `3f907897`（标签 `water-w5-m2-base-20261027`），见[第五波计划](dispatch/wave5/PLAN.md)与[清单](dispatch/wave5/manifest.json)：

   | 单号 | 改哪里 | 门 |
   |---|---|---|
   | [WATER-W5-H1 清理执行器收尾](dispatch/tickets/WATER-W5-H1-CLEAN-M2-20261027.md) | `packages/junk-clean` | 重门 |
   | [WATER-W5-H2 服务收尾](dispatch/tickets/WATER-W5-H2-SERVICE-M2-20261027.md) | `packages/water-service` | 重门 |
   | [WATER-W5-H3 宿主打开清理](dispatch/tickets/WATER-W5-H3-HOST-M2-20261027.md) | `apps/water/host` | 重门，夹具清理闭环 1 个窗口 |
   | [WATER-W5-H4 界面 M2](dispatch/tickets/WATER-W5-H4-UI-M2-20261027.md) | `apps/water/ui` | 轻门，界面票 |
   | [WATER-W5-H5 Rust 构建目录规则](dispatch/tickets/WATER-W5-H5-RULES-M2-20261027.md) | `packages/junk-rules` | 轻门 |

   派前准备：
   - 两个检查器认第五波清单；
   - 离线依赖源复制到 `.offline-cache\`；
   - 夹具清理闭环自检通过：真窗口里第一次走完应用内清理，只删合成夹具；
   - 五棵树派前 baseline 都通过。

   **已派出**（10-27 约 22:36 用户告知）：H1、H2、H3 交 Cursor，H5 交 sol，H4 交 opus。记录时五棵树都还停在基点、干净。

   **H5 受阻 → 补单 01 READY**（10-27 约 22:48）：
   - 原票写了“原有标记与断言不变”，但新增一条规则必然改变测试里两个写死的数量（规则数 60→61、目标数 214→216）。执行者没有自行变通，交回受阻回执（`d6c83ea9`）。总控只读核对属实，是票面疏漏。
   - [补单 01](dispatch/tickets/WATER-W5-H5-ADDENDUM-01-20261027.md) 只授权改这两处和数据版本断言，`windows.json` 数据版本加一为 `2026-10-27.1`；其它包不受影响。
   - 执行者自报 Codex GPT-6（用户安排为 sol）。
9. **第五波（M2）五张全部验收合入**（10-28），见[第五波收单验收](acceptance/wave5/controller/WATER-W5-REVIEW-20261028.md)：

   | 单号 | 结论 |
   |---|---|
   | WATER-W5-H2 服务收尾 | VERIFIED，合入 `f58eeb2c` |
   | WATER-W5-H3 宿主打开清理 | VERIFIED，合入 `a9f97325`；真窗口夹具清理闭环通过（3,145,815 字节，失败 0） |
   | WATER-W5-H4 界面 M2 | VERIFIED，合入 `de472412` |
   | WATER-W5-H5 Rust 构建目录规则 | VERIFIED，合入 `38d240d0` |
   | WATER-W5-H1 清理执行器收尾 | 第一轮要求修改，[补单 01](dispatch/tickets/WATER-W5-H1-ADDENDUM-01-20261028.md)（sol）后 VERIFIED，合入 `b3168cb7` |

   - 每票都在新树重跑 final，总控负控（位置与执行者不同）全部抓到，四张代码票都有只读代理的独立审查，没有阻断级问题。
   - H1 第一轮的问题：名字不是合法 UTF-16 的目录在快照里不展开，整项的安全否决看不到它里面。补单后这种目录让整项跳过为 `changed`，总控复现用例转为通过；H1 总控用例全部通过（新 11 个、集成 3 个、第四波 19 个、十万文件、4000 层深树）。
   - 主线现在已经打开清理（`CLEAN_ENABLED = true`）；还没有编新的 release 版。
10. **第三次主线整合检查通过**（10-28，主线 `77f33746`），见[整合报告](acceptance/wave5/controller/WATER-W5-INTEGRATION3-20261028.md)：
    - 五个包的检查与测试全绿：D 6/6、规则 4/4、服务 6/6、界面单元 3/3 与浏览器 5/5、宿主 5/5；服务的真实只读体检 62 秒完成；
    - 真窗口夹具清理闭环一次通过：1 个窗口、9 步、10.5 秒，只删合成夹具 3,145,815 字节，失败 0。
11. **新 release 版已编好，打开了清理**：`F:/new/smaltalk/water/.local/release/water-0.1.0-77f33746/water.exe`（sha256 `c5b72e0e…`，本地构建）。冒烟通过：第二个实例 48 毫秒退出，最小化的窗口 372 毫秒回到前台，关窗退出码 0。
12. **M3 已拍板，第六波三张票 READY**（10-28）：[M3 计划](M3-PLAN-20261028.md)，用户“可以，出单吧”，五条全按推荐；macOS 暂不移植。基点 `d79fb096`（标签 `water-w6-m3-base-20261028`），见[第六波计划](dispatch/wave6/PLAN.md)与[清单](dispatch/wave6/manifest.json)：

    | 单号 | 改哪里 | 门 |
    |---|---|---|
    | [WATER-W6-I1 Agent 工具规则](dispatch/tickets/WATER-W6-I1-RULES-AGENT-20261028.md) | `packages/junk-rules` | 轻门 |
    | [WATER-W6-I2 宿主收尾](dispatch/tickets/WATER-W6-I2-HOST-M3-20261028.md) | `apps/water/host` | 重门，夹具清理闭环 1 个窗口 |
    | [WATER-W6-I3 界面收尾](dispatch/tickets/WATER-W6-I3-UI-M3-20261028.md) | `apps/water/ui` | 轻门，界面票 |

    派前：两个检查器认第六波清单，三棵树派前 baseline 都通过。本机摸底与 Grok 调研见 [agent-tools-20261028](research/agent-tools-20261028/)。

    **10-28 傍晚已派出**（用户没说派给谁，三棵树的提交作者都是 Codex GPT-6）：
    - **I1 受阻**（回执提交 `f0f7243a`）：SPEC 第 4 节漏授权两处“最后一条是 Rust 规则”的旧断言，追加 14 条规则后必然失败；另外执行者的网页工具打不开官方出处。受阻成立，是总控疏漏。已出[补单 01](dispatch/tickets/WATER-W6-I1-ADDENDUM-01-20261028.md)：授权两组断言改为按 ID 查找并加新顺序断言；官方出处由总控先核对（[source-check](acceptance/wave6/controller/source-check-20261028.md)，7 个网址都能打开、标题对得上）。
    - I2、I3：一次交回。
13. **第六波三张全部验收合入**（10-28 晚，用户“收活”），见[第六波收单验收](acceptance/wave6/controller/WATER-W6-REVIEW-20261028.md)：I1 `db3a73cd`（补单 01 后）、I3 `9841eb5e`、I2 `3fc27f31`。
    - I1：新树重跑全绿；总控负控被 `RULES_AGENT_TOOLS` 抓到；含 I1 的服务真实只读体检 105 秒，Agent 工具组 12→24、应用残留组 6→8，新组命中与本机摸底一致，受保护组不可勾选。
    - I3：总控七条变异全被抓到；“正在重新连接”不出现时只有带标记的失败，没有超时，连锁超时消除。
    - I2：整机夹具闭环通过；总控新写的“清理进行中关窗”真窗口检查通过：在 64,000 个文件的夹具清理到第 10 项时请求关窗，清理被停下（`stopped`），窗口 451 ms 后才消失，退出码 0，日志完整。
    - 三份独立审查都没有高级问题；中级三条（宿主一条是总控契约缺口、界面两条边角情形）与若干低级问题记进清单 `carryOverLater`，建议整合检查后合成一张“M3 收尾”票。真窗口检查顺带发现清理页显示“第 0 / 1 组”（服务从 0 数）。
14. **第四次主线整合检查通过**（10-28 晚，主线 `b62f9c5c`，用户“Start integration”），见[整合报告](acceptance/wave6/controller/WATER-W6-INTEGRATION4-20261028.md)：
    - 五个包全绿：D 6/6、规则 4/4、服务 6/6（真实只读体检 120 秒，识别 61.6 GB）、界面单元 3/3 与浏览器 5/5、宿主 5/5；
    - 真窗口夹具清理闭环一次通过：1 个窗口、9 步、28.6 秒、只删合成夹具 3,145,815 字节、退出码 0。
15. **新 release 版**：`F:/new/smaltalk/water/.local/release/water-0.1.0-b62f9c5c/water.exe`（sha256 `3f4a19c4…`，本地构建），含第六波。冒烟通过：第二个实例 39 毫秒退出，最小化的窗口 124 毫秒回到前台，关窗退出码 0。
16. **第七波（M3 收尾）四张票已派出**（10-28 晚，用户“先做M3的收尾吧”；约 23:30 派出：J1、J3、J4 给 sol，界面票 J2 给 astra），见[第七波计划](dispatch/wave7/PLAN.md)与[清单](dispatch/wave7/manifest.json)。基点 `28287695`（标签 `water-w7-m3-fix-base-20261028`）：

    | 单号 | 改哪里 | 门 |
    |---|---|---|
    | [WATER-W7-J1 宿主补遗](dispatch/tickets/WATER-W7-J1-HOST-FIX-20261028.md) | `apps/water/host` | 重门，夹具清理闭环 1 个窗口 |
    | [WATER-W7-J2 界面补遗](dispatch/tickets/WATER-W7-J2-UI-FIX-20261028.md) | `apps/water/ui` | 轻门，界面票 |
    | [WATER-W7-J3 服务补遗](dispatch/tickets/WATER-W7-J3-SERVICE-FIX-20261028.md) | `packages/water-service` | 轻门，final 含只读真实体检 |
    | [WATER-W7-J4 规则措辞与出处](dispatch/tickets/WATER-W7-J4-RULES-FIX-20261028.md) | `packages/junk-rules` | 轻门 |

    契约 `contracts/m3-v1/*-M3-FIX.md`；执行者规则 [W7-M3-FIX-WORKER-RULES](dispatch/W7-M3-FIX-WORKER-RULES.md)。派前：两个检查器认第七波清单，四棵树派前 baseline 都通过。清理执行器的几条低级遗留不在这一波（计划里写了理由）。孤儿进程顺延到第八波。
17. **第七波四张全部验收合入**（10-29 凌晨，用户“收活”），见[第七波收单验收](acceptance/wave7/controller/WATER-W7-REVIEW-20261029.md)：J1 `1019b4e3`、J2 `0d4333c2`、J3 `9d0e9833`、J4 `b299b879`；四个合并后主线目录树与验收用的合并版相同。
    - 四份回执的执行者自报都是 Codex GPT-6；新树重跑全绿，总控变异共 21 条，20 条被抓到（J2 一条选得弱，换一条补上）；J1 另做两条探针，确认审查指出的两处测试缺口。
    - J1 抓到了第六波漏网的两种（`ExitRequested`、累计计时）；J4 的 12 处改动与契约表逐字相符。
    - 合并版真窗口“清理进行中关窗”：关窗请求后 457 ms 窗口才消失，清理 `stopped`，日志 160/160，退出码 0；清理页显示“第 1 / 1 组”和新的停止说明。
    - J1、J2 独立审查都没有高级、中级问题；低级若干记进清单 `carryOverLater`。
18. **F 盘清理**（10-29 凌晨，用户“删除1-12”；没有用 Water，用户认为它现在不可靠），见[清理记录与经验](maintenance/F-CLEANUP-20261029.md)：F 盘可用 82.6 GB → 250.0 GB（腾出 167.4 GB）。删了 Water 各工作树 `.local` 的构建、Cargo、浏览器配置、临时、夹具、回执，几个项目里 7 天没动的 `node_modules` 与 Python 缓存，以及 130 棵已合并的旧工作树（分支都在本地与 origin）。离线依赖源、release 版、7 棵自检树不变，离线编译验证通过。8 号误删了 Mirasim-B～E 自带的 CLI 安装（Mirasim-C 的 codex 当时在运行），用户 10-29 先选“先不装”。上午又要求只留 A、C 两个槽：C 槽已用 A 槽的同版本安装恢复，A、C 都能启动；B、D、E 没有恢复，删不删等用户决定。
19. **Kimi Code 对话记录清理实验**（10-29，用户要求“不要读内容，记录一下大小”），见[实验记录](maintenance/KIMI-CODE-SESSIONS-20261029.md)：`~\.kimi-code` 的 `sessions` 和 `session_index.jsonl`（2,062 个文件，350.6 MB）同盘挪到隔离文件夹，没有读内容；程序和配置原样保留，`kimi --version` 正常。用户试用后回复“没有影响”，隔离文件夹已由用户自己删除；Kimi 照常新建对话记录。
20. **Keeper 评估**（10-29，用户打算放弃 Keeper），见[可并入部分与停用清单](research/KEEPER-SALVAGE-20261029.md)：代码不搬；会话提炼、归档恢复、在用检测三块各有可带走的做法、脱敏规则数据和测试用例。同日用户说“全部停用”，已执行：
    - 服务已停，5 个 Grok 钩子和两个开机快捷方式已挪进备份；
    - Vault 规则文件（99 个硬链接同时生效）、`F:\new\AGENTS.md`、`F:\new\CLAUDE.md` 和 20 份项目说明文件里连 Keeper 的段落已删；
    - Water 的 AGENTS.md 已改。
    
    被别的项目 git 管着的 46 份说明文件没动，用户说“先留着”，由各项目自己的总控顺手删。
21. **云端 Linux 派单约定（草案）**（10-29；用户说以后可能有一台能连远端仓库的 Linux 云电脑），见[云端执行者规则](dispatch/CLOUD-LINUX-WORKER-RULES.md)：
    - 云端执行者只可推自己的 `cloud/<单号>` 分支，依赖按锁文件联网下载；
    - 总控拉回本机，用离线依赖源重跑完整检查门再合入；
    - 真实数据、真窗口、原生对话框和清理执行器的复核仍只在本机。
    
    能派哪些库是静态核查的初步结论，要等第一张“Linux 可行性探针”单在云端实测后定稿。该单尚未派。
    
    用户看完后说“那暂时不考虑先”：草案标为暂缓，只留作参考；AGENTS.md 的推送例外已撤回。
22. **第八波（M3 收口）计划**（10-31）：用户说“把实战问题融入M3，解决完算M3彻底收口”。[计划](dispatch/wave8/PLAN.md)把 10-29 暴露的五个问题（在用检测、硬链接去重、分盘、组内排除、工作树识别），与孤儿进程只列、体检提醒与“几天后满”、第七波遗留，排成六张目录互不相交的单（K1 进程、K2 规则、K3 扫描、K4 服务、K5 宿主、K6 界面）。合入后做第五次整合检查、出新 release 版、在本机逐条复现实战场景，再由用户在 Water 里自清理（补 M2 里程碑）。第 4 节七条待用户拍板。
23. **第八波计划拍板，第一批已派出**（10-31，用户“全部按推荐”；约 23:15 JST 用户告知“除了界面单是astra，都是sol”：K1、K2、K3、K5 给 sol，界面单 K6 给 astra）。
    - 写契约时发现 K4（服务）在编译时依赖 K1、K3 的新类型，所以分两批：
      - 第一批 K1、K2、K3、K5、K6 同时派；
      - K4 等 K1～K3 合入后再派；
      - K6 最后合入。
    - 契约冻结在 `contracts/m3c-v1/`（七份加界面回放数据增量）；执行者规则 [W8-M3C-WORKER-RULES](dispatch/W8-M3C-WORKER-RULES.md)。
    - 两个检查器已认第八波。
    - 基线 `912eba10`（标签 `water-w8-m3c-base-20261031`），五棵树派前 baseline 都通过。
    - 派单句见[第八波计划](dispatch/wave8/PLAN.md)。

    | 单号 | 改哪里 | 门 |
    |---|---|---|
    | [WATER-W8-K1 进程](dispatch/tickets/WATER-W8-K1-PROCESS-20261031.md) | `packages/process-scan` | 轻门，真实计数 |
    | [WATER-W8-K2 规则](dispatch/tickets/WATER-W8-K2-RULES-20261031.md) | `packages/junk-rules` | 轻门 |
    | [WATER-W8-K3 扫描](dispatch/tickets/WATER-W8-K3-SCAN-20261031.md) | `packages/junk-scan` | 轻门，只读真实扫描 |
    | [WATER-W8-K5 宿主](dispatch/tickets/WATER-W8-K5-HOST-20261031.md) | `apps/water/host` | 重门，1 个真窗口 |
    | [WATER-W8-K6 界面](dispatch/tickets/WATER-W8-K6-UI-20261031.md) | `apps/water/ui` | 轻门，界面单，26 张截图 |
24. **第一批回执（11-01 凌晨，用户“外派的任务都结束了，你收活”）**：
    - K3、K6 交回完成回执（K3 实现 `5b4136a3`、回执 `bc740bd9`；K6 实现 `53f1e467`、回执 `208be441`），进入验收；
    - K1、K2、K5 交回受阻回执（`6273d4d7`、`f67309fa`、`ba3a39b9`），总控只读核对后都成立：SPEC 没授权必然要改的旧断言（K1 issue code 白名单；K2 目标总数、Agent 尾段、“只列出”措辞，另有一处 `rules()[61..]` 执行者没列到；K5 `clean_prepare` 签名键）。已出补单 01 三张，派单句见[第八波计划](dispatch/wave8/PLAN.md)。
    - 四张补单 01 于 11-01 约 00:40 JST 前派出（用户“都已派出，界面是astra，其他的都是sol”）。
    - K6 验收第一轮（独立审查加总控核对）：未选分组的条目显示为勾上、取消一项反把整组其余项选进删除名单；按盘筛选时分类全选作用于看不见的组、操作坞数字与“清理所选”范围不一致；“以后都跳过”在冻结的服务契约下本次仍会被清理（总控契约疏漏，K4 补规定）。已出 K6 补单 01，派单句见[第八波计划](dispatch/wave8/PLAN.md)。
    - **K3 验收通过并合入**（合并提交 `e8976a52`），见[第八波第一批收单验收](acceptance/wave8/controller/WATER-W8-REVIEW-20261101.md)：审计 0 问题；新树重跑 final 通过，真实只读扫描 418,655 项、28.4 秒，没有变慢；总控 11 条变异抓到 9 条（2 条是测试缺口）；自建硬链接夹具与“一次遍历 = 逐个遍历”逐项手算对上；独立审查可合入，中级一条（大小与时间取自目录项）与清理执行器复核同口径，记为遗留。
25. **第二轮收单（11-01 上午，用户“收活”）**，见[收单验收](acceptance/wave8/controller/WATER-W8-REVIEW-20261101.md)第二轮：
    - **K1、K2、K5 验收合入**：K1 `3b79242e`、K2 `2d2f54d7`、K5 `311f3a9b`。三张都是审计 0 问题，新树重跑 final 通过（K5 整机 1 窗、9 步、退出码 0）；总控变异 K1 七条抓到六条（程序路径整段边界是测试缺口，代码正确），K2 六条、K5 五条全部抓到；K1 独立审查可合入。
    - **K6 第二轮**：第一轮四类问题都修好；审查新发现过期结果上点分组没反应（补单 01 引入）、按级别筛选时分类全选仍选进隐藏组（基线就有），已出补单 02（`13297bd8`）。
    - **K4 已就绪**：派单前用只读代理盘点服务测试里必然冲突的旧断言，连同跳过即时生效、盘根只收 NTFS/ReFS、排除里的已跳过项三条新规定，冻结为 [SERVICE-M3C 补充 01](../contracts/m3c-v1/SERVICE-M3C-ADD-01.md)；基线 `232bc298`（标签 `water-w8-k4-base-20261101`），派前 baseline 通过。
26. **K4 与 K6 补单 02 已派出**（11-01 约 11:24 JST，用户“都是sol”：两张都给 sol，这次界面单也是 sol）。
27. **K4 受阻**（12:00 JST 回执 `e2fbc784`）：新增的 64 次 `skip_add` 用例连续两次略超原有 50 ms 返回预算。总控核实根子在补充 01 第 1 条（要求跳过时重写整份扫描记录），已出 K4 补单 01：视图一律按“扫描结果 + 当前跳过名单”算，跳过只写设置，加万项规模用例。补单 01 也给了 sol（用户 12:48 告知）；登记时执行者已有实现提交 `9f7b6efe`，回执还没改写。
28. **第三轮收单（11-01 下午，用户“收活”）**，见[收单验收](acceptance/wave8/controller/WATER-W8-REVIEW-20261101.md)第三轮：
    - **K4 验收合入**（合并提交 `0bb1cf80`）：
      - 审计 0 问题；新树重跑 `lock`、`check --final`、`real --final` 通过，真实体检识别 67.4 GB（J3 那次 62.1 GB）；
      - 总控变异 13 条抓到 12 条，`test --final` 通过。漏掉的是投影层面大小写不同的用例，代码正确；
      - 独立审查没有高级问题。三条中级只影响显示或极端输入下的返回预算：旧体检的数字不跟随跳过、含已知文件夹的盘根没有单独测试、排除检查随“排除数 × 条目数”增长。已出 [K4 补单 02](dispatch/tickets/WATER-W8-K4-ADDENDUM-02-20261101.md)，与 K6 并行。
      - 负控复跑时，机器上别的程序占约一半 CPU，几次 50 ms 预算断言偶发超时，基线就有的 `scan_start` 也在内，续跑后全部完成。
    - **K6 第三轮**：补单 02 各条做到，21 条总控变异全部抓到，26 张截图看过。但独立审查发现高级一条：总控在 K4 补单 01 里把 `skip_remove` 改成立即恢复可清理，没有同步界面单，界面“恢复”后不重读结果，被恢复的项会在没显示为已选的情况下进入清理计划（总控疏漏）。已出 [K6 补单 03](dispatch/tickets/WATER-W8-K6-ADDENDUM-03-20261101.md)。
29. **K6 补单 03 与 K4 补单 02 已派出**（11-01 约 15:40 JST，用户“都已派给 sol”）。登记时两棵执行者树都干净，停在续做起点（K6 `1c2e91e6`、K4 `fc36140d`）。
30. **第四轮收单（11-01 傍晚，用户“收活”）**，见[收单验收](acceptance/wave8/controller/WATER-W8-REVIEW-20261101.md)第四轮：
    - **K4 补单 02 验收，再次合入**（`2a946b30`）：
      - 审计 0 问题；新树 `lock`、`check --final`、`real --final`、`test --final` 通过；
      - 总控变异 11 条抓到 9 条，漏掉的两条是对冗余保护与未测的正确代码的探针；
      - 独立审查没有高级与中级；合入后宿主编译检查 0 警告。
      - 在调用里落盘的命令在本机忙时会偶发超出 50 ms 预算，记为遗留。
    - **K6 第四轮**：补单 03 的高级问题已修好，跳过、恢复后操作坞与实际清理一致。审查有一条中级：用户排空的组会因恢复跳过而自己回到清理范围，违反补单 02 第 3.1 条。另外总控补单 03 写错一处（分类合计跳过后不变）。已出 [K6 补单 04](dispatch/tickets/WATER-W8-K6-ADDENDUM-04-20261101.md)。
31. **K6 补单 04 已派出**（11-01 约 18:00 JST，用户“已派给 sol”）。登记时执行者树干净，停在续做起点 `9722649a`。
32. **第五轮收单（11-01 晚，用户“收活”）**：K6 补单 04 各条做到，排空的组不再回到清理范围，删除安全再次核对无误。总控变异 21 条抓到 19 条，没抓到的两条是互为冗余的一对修复。审查有一条中级：手工取消的项，跳过再恢复后会回到清理范围，根子是总控补单 02 第 3.3 条。另有键盘焦点会落到“以后都跳过”等低级。已出 [K6 补单 05](dispatch/tickets/WATER-W8-K6-ADDENDUM-05-20261101.md)。
33. **第六轮收单（11-01 晚，用户“收活”），第八波全部合入**：
    - K6 补单 05 验收通过，最后合入（`1b79d861`）：
      - 审计 0 问题；新树 `check --final`、`browser --final`、`test --final` 通过；
      - 总控变异 20 条抓到 19 条，剩下 1 条在新规则下等价；
      - 独立审查没有高级与中级；手工排除与跳过保险排除分开记，操作坞与实际清理一致。
    - 第八波六张单全部 VERIFIED：K1 `3b79242e`、K2 `2d2f54d7`、K3 `e8976a52`、K4 `0bb1cf80` 与 `2a946b30`、K5 `311f3a9b`、K6 `1b79d861`。宿主、服务、界面在主线上接通。
    - 补单 05 派给了 sol（用户 22:40 JST 补告：“K6是sol”）。
34. **M3 收口已开始**（用户 21:30 JST “现在开始”）：第五次整合检查在 `.worktrees/integ-w8a`、`integ-w8b` 进行中，工具在 `.local/w8-integ5/`，进度与接下来的步骤见[第 12 份交接](CONTROLLER-HANDOFF-20261101-12.md)第 4 节。之后 release、复现 10-29 场景、用户自清理补 M2、M3 收口报告。Mirasim B、D、E 三个槽、7 棵自检树、“清、压、炼”排期仍等用户决定。
35. **第五次主线整合检查通过，release 编好**（11-01 约 22:15 JST，主线 `bcc0e984`），见[整合报告](acceptance/wave8/controller/WATER-W8-INTEGRATION5-20261101.md)：七个部分（D、进程、规则、扫描、服务、界面、宿主）检查与测试全绿；真实只读体检识别 68.5 GB、推荐 13.4 GB，与 K4 验收一致；真窗口夹具清理闭环 9/9；release `water-0.1.0-bcc0e984`（sha256 `712b1291…3f3d`）冒烟通过。界面浏览器测试第一次有 1 项因点击时机失败、原样重跑通过，记为遗留。release 冒烟脚本原来按屏幕区域截图，第一次截到了用户正在用的浏览器，总控当场删图，脚本改为 `PrintWindow` 后重跑通过。下一步：复现 10-29 场景（第 12 份交接第 4.3 节）、用户自清理补 M2、M3 收口报告。
36. **10-29 场景复现：五条修好，两个新问题**（11-01 约 22:30 JST），见[复现报告](acceptance/wave8/controller/WATER-M3-REPLAY-20261101.md)：硬链接去重、组内排除与“以后都跳过”、工作树只列、按项在用检测、整盘扫描都按契约走通；孤儿进程与 PowerShell 手查一致（含一个造的孤儿）；“几天后满”只能核对“不足 3 天 3 次”的说明；中途停止的体检不顶替上一次。**新问题**（整盘放开后才暴露，总控第八波规划的缺口）：F1 “测试用浏览器配置”认错真实应用的浏览器数据（含登录状态）；F2 “node_modules”认错工具安装与程序自带的依赖（10-29 第 1 个问题对没在运行的工具仍会发生）。两条都是“需确认、可勾选”。**M3 暂不能收口**，等用户拍板修法后出单；自清理建议放在修好之后。
37. **四个盘按盘清理（执行完，隔离目录等用户删）**（用户 11-01 晚要求，逐盘汇报、逐盘决定），见[清理记录](maintenance/CLEANUP-20261101.md)：C 盘完成，可用 31.6 → 71.0 GiB（隔离 28.4 GB 由用户删除，Water 清 12.0 GB，浏览器开着的 6 组全部跳过）；第 26 项按用户 a1 去掉 `.codex2` 的 claude-plugins-official 市场与 Expo 插件（备份 `config.toml.bak-20261102`）。会话记录一轮（H 表）清 7.78 GB，并给 denglou 总控写了会话组成分析；D 盘清 D1～D8、D10（实际约 7.3 GB，D6 Steam 日志在用跳过）；E 盘清 E1～E5（31.7 GB，E1 收窄为工程没引用的转换副本与波形缓存）。F 盘：F4～F10 已隔离（约 29.7 GB）；F1 用户在 Water 里清掉 Water 工作树 .local 的构建产物与测试浏览器（63 项、14.6 GB，总控事先核对计划、事后核对清理记录与空间），**M2 自清理里程碑达成（11-02 01:13 JST）**；F2、F3（第八波 12 棵树与 7 棵自检树，26.6 GB）11-02 01:50 移入隔离并注销工作树登记、分支保留；移前按内容哈希核对未跟踪证据，`w2-selftest` 的 144 个只此一份，先复制进主线 `docs/acceptance/wave2/controller/preflight-20261026/selftest/`。四盘总结：可用 205.7 → 270.1 GB，D、E、F 隔离目录（7.26、31.72、57.68 GB）删后约 367 GB；C 盘两个隔离目录用户已删。给 denglou 总控写了磁盘占用报告。用户提出“扫描位置”交互要优化（记录在清理记录启发第 18 条）。开发启发累积在记录末尾。
38. **用户对结果页的意见**（11-02）：页面太长、选项太多，“还不如让aget去扫描了，没有减少人的工作量”。与“扫描位置”交互意见、增长提示错误、清理中发现的规则缺口一起排进下一波，见清理记录启发第 18～24 条与[第 13 份交接](CONTROLLER-HANDOFF-20261102-13.md)第 3 节。
39. **四个盘清理结束；下一轮计划草案**（11-02 约 02:05 JST）：用户约 01:50～01:58 删完 D、E、F 的隔离目录（第一次在 PowerShell 里直接打 `rd /s /q` 报错，改用 `cmd /c rd /s /q`），四盘可用实测 368.15 GB，比开始多 162.4 GB，其中 Water 自己清掉 26.6 GB。用户要求结合 `denglou` 总控的[泄漏手册](../../../denglou/worktrees/ui-v2/docs/ops/WATER-LEAK-PLAYBOOK-20261102.md)与分级回执、这一轮的经验和 M3 的 F1、F2，出下一轮整体计划：[草案](dispatch/wave9/PLAN.md)分两段，第九波四张小单（规则、扫描、服务、进程）修 F1、F2、增长提示与在用检测缺口后 M3 收口；第十波为新里程碑 M3.5“结论优先”（泄漏簇、规则补缺、分配大小、`.water-cleanup.json` 第一版、可选隔离区、首页与结果页重做），七个拍板项，拍板前不出单。
40. **denglou 清理执行单**（11-02 约 02:40 JST）：用户看了 F 盘仍满的原因后选定 denglou 分级：“A/B都清理，然后C1/C2你查一下有没有重复的，只留一份，如果有我曾经的压缩文档也可以删除，C3压缩归档。C4测评音频应该也没用了可以删除。C5/C6不要动。”总控只读查重（逐字节重复 361 个、4.71 GB；10 个 zip 里 9 个内容唯一，建议不删），写成[执行单](maintenance/DENGLOU-CLEANUP-ORDER-20261102.md)。用户随后让总控自己执行并总结经验：约 02:45～03:00 全部移到 `F:\_water-quarantine-20261102-dl`（去重 167.52 GB，C3 压缩归档 52.3 → 3.7 GB），B2 四棵工作树 prune；移后全盘查联接，发现整合树 `audit-b57a` 经 `grok2` 联接到 `ui-v2`，把 `grok2` 移回；隔离区里 23 个联接已拆除。经验记在清理记录启发第 26～34 条，其中“认不出 Git Bash 写法的路径”排进第九波 L4，“被别处联接引用的目录算在用”和“子项是保留名”的测试排进第十波。用户 11:58～12:00 删除隔离目录，F 盘实测 372.72 GB，只剩一个 3.3 MB 的 `nul` 文件（总控起初误记为 0 字节，见启发第 34 条）要用 `\\?\` 前缀再删；`denglou` 总控收到知会后改好了 `audit-b57a` 的联接，并把 `grok2`、`climbmao_a35` 的快照移进它自己的隔离目录（5.72 GB，0 个联接）。
41. **denglou 收尾回执并入固定做法**（11-02 约 12:45 JST）：用户转来 `denglou` 总控的[收尾回执](../../../denglou/worktrees/ui-v2/docs/ops/WATER-CLEANUP-RECEIPT-20261102.md)。
    - **回执指出的损失**：B1 的 `yb-release\.tmp_local_build` 是被 git 忽略的正式签名本机副本，总控移前没查出来，已随隔离区删除。总控按文件名核对，本机已无正式签名的 keystore。商店签名在 EAS，要不要再下一份离线备份由用户定。
    - **回执第 3 节六条**已并入新写的[总控清理的固定做法](maintenance/CLEANUP-METHOD.md)。挪前的闸和交付前的检查做成 [precheck-plan.cjs](acceptance/wave8/controller/cleanup-20261101/precheck-plan.cjs)：查入向联接、贵重件名、保留名、候选内联接，夹具和真实现场都试过。
    - 对产品的部分并入[计划](dispatch/wave9/PLAN.md) 4.2 的 W6、W11～W13 与 4.3；经验为清理记录启发第 35～37 条。七个拍板项不变，仍待用户定。
42. **第九波（M3 收口修复）冻结与派前准备**（11-02 约 12:50 JST）：用户对[下一轮计划](dispatch/wave9/PLAN.md)第 7 节七条说“全部按推荐”。
    - **契约**：冻结在 `contracts/m3d-v1/`，冻结提交 `57ecd7ce`（标签 `water-w9-m3d-base-20261102`）。
      - RULES-M3D（L1）：标记的附加条件，以及两条兜底的仅供参考规则 `bundled-node-modules`、`browser-data-dirs`；
      - SCAN-M3D（L2）：同一份计划 JSON，一次遍历把命中分给主规则或兜底；增长要求间隔满 24 小时、体量增加；
      - SERVICE-M3D（L3）：增长改与早至少 24 小时的完成体检比，停下的体检与清理摘要在历史里写对；
      - PROCESS-M3D（L4）：命令行里的 `/f/new/x` 认作 `F:\new\x`。
    - **为什么不新增匹配类型**：服务里对 `MatchSpec` 有穷举匹配，加新类型就得等 L1 合入后再派 L3。
    - **派前准备**：四棵工作树、单子、[清单](dispatch/wave9/manifest.json)已备好，派前 baseline 全部通过（`docs/acceptance/wave9/controller/preflight-20261102/`）。派单句在计划第 8 节，等用户外贴。
    - **派出**（约 12:52 JST）：用户：“第三单是grok，其他的都是sol”。总控记录时四棵树都在 `57ecd7ce`，L2 已有 2 处未提交改动。
    - **第十波延后**：用户：“第10波等第九波收口再做，因为可能会有变化。”ADR-019、设计稿、契约都等 M3 收口后再开始。
    - **L2 受阻与补单 01**：L2 开工检查后交回受阻回执（`5431e812`），成立：原票与规则第 3 节写了“L2 的夹具只建普通文件与目录”，本意只管新增夹具，但原有测试本来就建联接与硬链接。[补单 01](dispatch/tickets/WATER-W9-L2-ADDENDUM-01-20261102.md) 澄清旧夹具原样运行，从 `5431e812` 续做。
    - **下一步**：等四张单的回执，按单验收；L1、L2 一起合。
43. **第九波收单验收、全部合入**（11-02 约 13:35～15:10 JST）：用户说“收活”。[验收报告](acceptance/wave9/controller/WATER-W9-REVIEW-20261102.md)。
    - **结论**：四张都 VERIFIED。回执审计都是 0 个问题，四棵新开的验收树重跑 lock、check、real、test 的 final 全部通过。
    - **总控变异负控**：L1 4/4、L2 5/5、L3 4/5、L4 3/3 抓住。L3 存活的那处说明缺少“两条记录都满足门槛”的测试，记为测试缺口。
    - **独立审查**：四张都没有发现缺陷或偏离 SPEC。L2 有两处规格空白（兜底目录里的列目录问题、预算用完记在哪组），放到第十波定。
    - **合入**：L1 `28736089`、L2 `37fa96f1`、L4 `b39bfcdf`、L3 `bc433e6c`。
    - **遗留**：服务测试的耗时上限断言在机器忙时不稳定（四棵树同时跑时出现过进程中止和超时）。
    - **Mirasim 弹框（清理记录 F16）**：用户启动 Mirasim 时弹出“找不到 `F:\Mirasim-B\ensure-port.vbs`”，原因是 A、C 的 `start.vbs` 仍调用 10-29 已删的 B 槽脚本，与第九波和 denglou 清理无关。用户：“删掉，留备份”，总控删掉了这一行，备份 `start.vbs.bak-20261102`。
    - **下一步**：M3 收口——第六次整合、出 release、在 D 盘与 `F:\Mirasim-A` 只读复验 F1/F2、写收口报告。
44. **M3 收口**（11-02 约 16:20～17:10 JST）：用户说“开始收口”。**M3 达成**，见[收口报告](acceptance/wave9/controller/WATER-M3-CLOSE-20261102.md)。
    - **第六次整合**（[整合报告](acceptance/wave9/controller/WATER-W9-INTEGRATION6-20261102.md)）：
      - 主线 `bb92c87e`，沿用两棵整合树并切到新分支 `controller/integ-w9a`、`controller/integ-w9b`。
      - 七个部分全绿，一次通过：D 6/6、进程 4/4、规则 4/4、扫描 5/5、服务 6/6、界面 3/3 加浏览器 5/5、宿主 5/5。
      - 四个真实只读冒烟都过；真窗口夹具清理 9/9 步，只删了合成夹具。
      - 宿主第一次被检查器拒收：第九波清单没冻结镜像契约，总控在覆盖清单里补上后重跑通过。
    - **release**：`water-0.1.0-bb92c87e`（`.local/release/`，sha256 `ddc0644c…`），冒烟通过。冒烟脚本截图截不全（没设 DPI 感知），记为遗留。
    - **F1、F2 复验**（只读，路径脱敏后入库）：
      - D 盘、`F:\Mirasim-A` 上复现报告列的每一处都变成“仅供参考”、不可勾选；两地“需确认”的这两组都是 0 项。
      - Mirasim 的 1.47 GB 整体从需确认换到仅供参考，字节数不变。
      - 合成夹具七处全部符合；服务拒绝为“仅供参考”组生成清理计划。
    - **“几天后满”**：用默认数据目录的副本（原目录没被打开），服务结果与手算四个盘完全一致。C、F 显示“没有减少”，因为这几天有 Water 以外的清理，按契约是对的，放到第十波考虑。
    - **遗留**：第十波要定三条（兜底组的列目录问题记在哪组、Water 自己的测试浏览器靠 `.water-cleanup.json`、“几天后满”遇到外部清理）；其余测试缺口见收口报告。
    - **下一步**：第十波。按用户 11-02 的说法，M3 收口后先按收口结果重看计划第 4、5 节，再出 ADR-019、设计稿、契约与夹具。
45. **第十波：界面整体重构的设计稿**（11-02 约 17:20～18:05 JST）：用户：“第十波要把界面布局，交互，按键设计，菜单设计都要重构，优化一下，目前的简直不知道怎么用，太复杂了，包括我之前提到的交互逻辑等都要进行优化。开始吧。”
    - 总控按第六次整合的 31 张界面截图逐页列出难用之处（[界面设计 v2](design/water-ui-v2/DESIGN.md)第 0 节），写了 v2 草案并做了可点的[设计稿](design/water-ui-v2/mockup.html)，16 个画面的截图在 `docs/design/water-ui-v2/previews/`。
    - 要点：导航改为 体检 · 隔离区 · 趋势 · 记录 + 底部设置；首页直接选位置；结论页一个主按钮、最多 5 张判断卡（保留 / 清理）、少用操作收进“⋯”菜单、复选框只在明细与抽屉；确认框分直接删除与移到隔离区。材质、颜色、品牌沿用 v1。
    - [第十波计划](dispatch/wave9/PLAN.md) 4.6 节与第 5 节的 M5、M6、M7 已按此改写。
    - **下一步**：用户审设计稿；拍板后写 ADR-019、冻结界面与“结论视图”契约、做基准夹具，再出派单。
46. **第十波计划：把每一轮清理的经验做进 Water**（11-02 约 18:05～18:15 JST）：用户看过设计稿：“可以，然后功能方面，上一轮本设备的清理，包括你也参与了其他项目的垃圾文件清理，所有的经验都要应用到我们的软件中去。”
    - 总控读了全部记录：三次 C 盘告急、10-29 F 盘、Kimi 试验、四个盘（启发 1～37 与 C、H、D、E、F 各表）、`denglou` 执行单与报告，以及 `denglou` 总控的分级回执、泄漏手册、收尾回执。
    - [第十波计划](dispatch/wave10/PLAN.md)第 2 节逐条对照 63 条经验：Water 现在怎样、第十波怎么做、落在哪张单；第 3 节列出不进软件的及原因（要读内容、跑 git、改写会话等）；第 4 节七张单 M1～M7。
    - [ADR-019 草案](decisions/ADR-019-project-declarations-and-quarantine.md)：项目声明、`gitdir:` 一行、先隔离再删除、界面 v2（已拍板）；会话记录可选清理、读已安装程序列表（待拍板）。
    - **待你拍板**（计划第 6 节）：会话记录能不能清、逐字节查重、读已安装程序列表、系统建议卡、空间分布。
    - **下一步**：拍板后写定 ADR-019，做基准表与合成夹具，冻结 `contracts/m35-v1/`，出派单句。
47. **第十波五件事拍板，长列表与隔离区入口进设计**（11-02 约 18:15～18:35 JST）：用户：“1.可以清，加开关。扫描出来后给用户两个选择……隔离区如果没有清理的话，要一直保留快捷打开隔离区的路径按钮……这波单出去之后，你尝试复盘一下）2.需要做。3.可以。4.可以。5.可以。然后目前每次扫描之后列表都太多了……”
    - [第十波计划](dispatch/wave10/PLAN.md)第 2.7 节加第 64～67 行；新增 M8 查重（`packages/dup-finder`）、M9 已安装程序（`packages/installed-apps`）；第 5 节第 7 条为派单后复盘“删了还剩”；第 6 节改为拍板结果。
    - [ADR-019](decisions/ADR-019-project-declarations-and-quarantine.md)七节全部拍板：会话可选清理（直接删除或先隔离）、读已安装程序列表、用户发起的查重（第二个读内容的例外）、隔离区入口常驻与“删了还剩”。
    - [设计 v2](design/water-ui-v2/DESIGN.md)加 3.12 长列表（人最多看三层、同规则多位置合一行、同模板条目合一行、小的不出卡、记住决定、只突出变化）与 3.13 查重；首页与结论页顶部常驻隔离区条；确认框“先放进隔离区 / 直接删除”二选一；设置里按工具的会话开关。设计稿 22 个画面，截图在 `docs/design/water-ui-v2/previews/`。
    - **下一步**：基准表与合成夹具，冻结 `contracts/m35-v1/`，派前 baseline，派单句。
48. **第 14 份交接**（11-02 19:45 JST）：用户要压缩上下文。[交接报告](CONTROLLER-HANDOFF-20261102-14.md)写清第十波做到哪：[基准表](dispatch/wave10/BENCHMARK.md)已写；契约只起草了 [RULES-M35](../contracts/m35-v1/RULES-M35.md)（草案，未冻结）；写契约时查清的约束（服务对 `MatchSpec`、在用方式、执行器状态做了完整匹配，所以只加 marker 种类与字段、隔离用单独的类型；新包只许 serde 与 serde_json）；下一步从交接第 2.3 节第 1 步继续。
49. **第十波六份契约草案与第 15 份交接**（11-02 20:45 JST）：`contracts/m35-v1/` 起草了 RULES（已审完）、SCAN、MANIFEST、CLEAN、DUP、APPS 六份，都未冻结（`70980037`）；[基准表](dispatch/wave10/BENCHMARK.md)与[计划](dispatch/wave10/PLAN.md)按审定规则回填。用户要压缩上下文，[第 15 份交接](CONTROLLER-HANDOFF-20261102-15.md)写清与第 14 份计划不同的六处，以及剩下四份契约（IPC、SERVICE、HOST、UI）要接住的事；下一步从交接第 3.1 节继续。
50. **第十波十份契约全部起草**（11-02 21:00 JST）：压缩取消后接着写完 [IPC-M35](../contracts/m35-v1/IPC-M35.md)（命令 19 → 36）、[SERVICE-M35](../contracts/m35-v1/SERVICE-M35.md)、[HOST-M35](../contracts/m35-v1/HOST-M35.md)、[UI-M35](../contracts/m35-v1/UI-M35.md)；RULES 补卸载残留（`installed_names`，H8），回收站改由服务查，CLEAN、DUP 各补一处。都未冻结。第 15 份交接加第 6 节，下一步：通读、界面样例、冻结、第一批八张。
51. **第十波冻结，后端七张就绪，界面单暂缓**（11-05 JST）：十份契约通读（5 处高危全部修好：ID 合法化、声明目标进计划、旧记录读回、解锁对、每盘一个隔离编号）后冻结在 `f93afb8e`（标签 `water-w10-m35-base-20261105`），含 50 个界面样例、执行者规则与两个检查器的第十波支持。M1～M5、M8、M9 的单与清单已出，派前 baseline 全部通过，派单句在[第十波计划](dispatch/wave10/PLAN.md)第 7 节。用户 11-05 要求界面整体做可视化优化，M6 暂缓：方案见 [viz-proposal.html](design/water-ui-v2/viz-proposal.html)，等用户定。
52. **后端三组派给 sol，拟物冰山方案进行中，第 16 份交接**（11-05 18:30 JST）：用户嫌一次十单太多，后端七张合成三组顺序派（A 规则→扫描、B 已安装程序→声明→查重、C 执行器→宿主），都给 sol。M1 两次受阻（补单 01、02，含尾段类断言通则）、M4 与 M8 各受阻一次（补单 01），都是契约疏漏；M9、M3 报完成待验收。平面可视化被否，改做拟物“一座冰山、水线按盘分区、冰山一角居中随体检长大、分类深色、文字全在左栏”，样稿 `design/water-ui-v2/viz-skeuo.html` 制作中。[第 16 份交接](CONTROLLER-HANDOFF-20261105-16.md)是入口。
53. **M9、M3 验收合入，M4 补单 02，拟物样稿第二版**（11-05 19:00 JST）：M9 已安装程序（`c701d029`）、M3 项目声明（`2def1796`）验收合入：审计 0 问题，新树重跑 final 全过，总控变异 11 条全部被抓住，独立审查无高危，较低的发现记入清单 `carryOverLater`（M3 的 `protects` 只认 `X:\` 写法、路径是声明目录的上级时不算重叠，M7 写单时交代），见[验收报告](acceptance/wave10/controller/WATER-W10-REVIEW-20261105.md)。M4 补单 01 后再次受阻（`12c6c556`），成立：`SetFileInformationByHandle` 带目录句柄改名在本机一律 87，总控用合成文件核对后改用 `NtSetInformationFile` 类 10（[补单 02](dispatch/tickets/WATER-W10-M4-ADDENDUM-02-20261105.md)，核对脚本在 `acceptance/wave10/controller/m4-rename-probe-20261105/`）。拟物样稿第二版完成并提交（`dc07cf12`，15 张预览），已发给用户，待定冰山一角按真实比例还是放大画。
54. **M8 验收合入，B 组完成**（11-05 19:10 JST）：M8 查重（`a9053407`）补单 01 后完成：审计 0 问题，新树重跑 final 全过，总控变异七条抓住六条（同名同内容算进“同名不同内容”那条漏掉，属测试偏弱），独立审查无高危；真实冒烟找仓库根的写法与 M3 同一个毛病，记入遗留。B 组 M9、M3、M8 全部合入，见[验收报告](acceptance/wave10/controller/WATER-W10-REVIEW-20261105.md)第 5 节。
55. **M4 合入；M5 补单 01；M1、M2 验收未通过续做**（11-05 晚 JST）：
    - **M4**：补单 02 后完成，验收合入（`e3c1b1c1`）。独立审查无高危；“子文件夹被占用时整块留下”“编号目录被完全独占时报入口错误”两条，建议 M3.5 发布前另出执行器小单。
    - **M5**：受阻，成立（`scan_start` 新参数与几处整表比较的旧断言不在豁免里），[补单 01](dispatch/tickets/WATER-W10-M5-ADDENDUM-01-20261105.md)一并授权。
    - **M1、M2**：复跑与变异通过，但独立审查查出 M1 的 `jest-cache` 定位实现成单段（契约写法含糊，总控责任），以及 M2 四处与契约不符或开销无界，[M1 补单 03](dispatch/tickets/WATER-W10-M1-ADDENDUM-03-20261105.md)、[M2 补单 01](dispatch/tickets/WATER-W10-M2-ADDENDUM-01-20261105.md)续做。
    - **界面**：用户先后否定动漫风与水彩参考方向，改为参考《潜水员戴夫》的像素风海底（只借画风，不用其角色与素材），新样稿 `design/water-ui-v2/viz-iceberg.html`。
56. **第 17 份交接**（11-05 21:30 JST）：用户说“先到这儿吧，记录一下状态”。
    - **界面**：像素风被否（“留白太少了，画面看起来太脏了，不干净”）。按用户给的两张平静的立体手绘解谜游戏截图重画为圆角厚石板拼成的冰山、大片安静水面（`3894ed18`），等用户意见。
    - **后端**：M1 补单 03 已交回（`2fd789d8`）待验收；M2 补单 01 在做；M5 补单 01 已出。
    - [第 17 份交接](CONTROLLER-HANDOFF-20261105-17.md)是入口，从第 6 节继续。

## 真实AA→AD联合验收通过（2026-10-26）

新总控（Claude）接任后按事先冻结的[计划](acceptance/wave1/controller/WATER-W1-AAAD-JOINT-PLAN-20261026.md)执行一次：真实固定AA宿主→原生目录选择→R/Z→AB传输→AD同源报告页，四场景全部通过，4窗/9.993秒/无重试/手动终止0。报告页鼠标下载的Q与Z与当次原字符串逐字节一致，淘汰与正常关闭通过。见[联合验收报告](acceptance/wave1/controller/WATER-W1-AAAD-JOINT-REVIEW-20261026.md)。31任务/槽位不变，没有新READY票；桌面接入扫描、真实用户scope、自然同意鉴真、生产竞态、macOS与M1仍未验收。用户同日要求先暂停安排后续任务，结合本机清理经验重订计划；总控草案见[计划重订（待拍板）](REPLAN-20261026-AGENT-ERA-CHECKUP.md)，拍板前不出新票。

## AC补单06验收与隔离集成完成（2026-10-25）

[总控验收](acceptance/wave1/controller/WATER-W1-AC-ADDENDUM-06-REVIEW-20261025.md)：06真实四文案、双快照同主身份、正常退出与冻结子进程收尾通过；隔离无UI原三测及独立输入矩阵通过，b417835已快进主线。AC/06为Windows静态桌面基础VERIFIED，无需重贴；其它30任务/槽位和旧失败保持，总控0新窗口。真实AA→AD/桌面扫描/macOS/M1仍未通过。

## AC补单05收单与应用窗口计数修订（2026-10-25，历史）

[总控复核](acceptance/wave1/controller/WATER-W1-AC-ADDENDUM-05-REVIEW-20261025.md)：两个根完整记录，一个精确主窗和一个固定Tao事件节点；旧严格失败保留，主窗正常退出。新契约保留原始数量并分开计数，未知根仍失败，关闭前再核快照。[补单06 READY](dispatch/wave1/AC-DESKTOP-ADDENDUM-06-READY-REPORT-20261025.md)只回原AC，另增1有界静态窗，不重跑旧票/check/test/下载。本轮仅无UI Parser/41边界/主身份/回放/文案/来源及resume通过，0窗口；AC仍BLOCKED。

## AC补单04收单与根元素取证准备（2026-10-24，历史）

[总控复核](acceptance/wave1/controller/WATER-W1-AC-ADDENDUM-04-REVIEW-20261024.md)：实际数量/元素未保存，无法判定产品多窗或隐藏根原因；原14文件/证明保持，两次窗已用。[补单05 READY](dispatch/wave1/AC-DESKTOP-ADDENDUM-05-READY-REPORT-20261024.md)先保存根快照再执行同一Count>1拒绝，并安全清理已核主窗；本轮只测无UI共享策略/Parser，0窗口。仅另增1次取证allocation，不复用旧预算或重跑check/test。

## AC补单03收单与无UI编码修订（2026-10-24，历史）

[总控复核](acceptance/wave1/controller/WATER-W1-AC-ADDENDUM-03-REVIEW-20261024.md)：原check/test有效通过，native错误与强制终止保留；新共享文案policy/Parser无UI预检和原树resume通过。[补单04 READY](dispatch/wave1/AC-DESKTOP-ADDENDUM-04-READY-REPORT-20261024.md)只回原AC对话，额外1次静态窗预算独立记录，非旧预算重置。[下一步依赖安排](dispatch/wave1/AFTER-AC-NATIVE-PLAN-20261024.md)。本轮0窗口。

## AC补单02受阻复核与控制入口修订（2026-10-24，历史）

[总控复核](acceptance/wave1/controller/WATER-W1-AC-ADDENDUM-02-REVIEW-20261024.md)：依赖完整，阻塞来自总控Clippy参数转发；修订后原策略/fmt/clippy离线通过，未改产品代码。[补单03 READY](dispatch/wave1/AC-DESKTOP-ADDENDUM-03-READY-REPORT-20261024.md)仅回原AC对话，不重跑先红/负控/下载；当前源码不变时复用旧证明，再同干净SHA完成check/test/native。总控本轮系统窗0。

## AC国内镜像依赖准备完成（2026-10-24，历史）

[总控准备复核](acceptance/wave1/controller/WATER-W1-AC-MIRROR-PREPARATION-20261024.md)与[补单02 READY](dispatch/wave1/AC-DESKTOP-ADDENDUM-02-READY-REPORT-20261024.md)：238包及锁/许可证/离线完整性已通过，网络设置未改。仅回原AC对话继续真正实现及产品门，未启动实现者。

## AD/AE收单与独立集成完成（2026-10-24，已收口）

[总控验收](acceptance/wave1/controller/WATER-W1-ADAE-REVIEW-20261024.md)：AD同源报告的实际页面/原字节附件和两条负控复验通过；AE仅研究文档通过，非Mac实现。隔离受测5b4d77c已快进主线，原两树/491归档/514约束保持，系统窗0。AC不重试网络；强依赖桌面单尚未READY。

## AC受阻收单与环境续做（2026-10-23，历史）

[总控复核](acceptance/wave1/controller/WATER-W1-AC-BLOCKED-REVIEW-20261023.md)记录原受阻ef0b7c4、静态骨架/失败日志与原字节审计；[补单01回执](dispatch/wave1/AC-DESKTOP-ADDENDUM-01-READY-REPORT-20261023.md)记录实际依赖恢复结果和原树续做方式。AC未集成或产品验收；AD/AE不受AC阻塞。

## AC/AD/AE派前READY（2026-10-23，历史）

[派前回执与三条指令](dispatch/wave1/DELIVERY-WAVE-READY-REPORT-20261023.md)记录同基线/各自干净树/509冻结/真实baseline。AC环境与最小壳、AD实际AB同源合并报告、AE研究设计互无依赖和文件争写；没有启动实现者，新产品和Mac实机未测试。桌面真正接AA/AB要等必要前置验收后下一波；当前无需重贴旧A–AB。

## AB补单01及真实AA→AB联合验收（2026-10-22，已收口）

[总控复验](acceptance/wave1/controller/WATER-W1-AB-ADDENDUM-01-REVIEW-20261022.md)：补单三final/三负控及隔离五测、晚取消六入口通过；真实固定AA宿主与AB同次选择/同意/取消、W/Q和结构附件通过，4次有界窗口。4b4d6a3已纳主线，AA/AB及补单VERIFIED（Windows受控），下列原返修状态为历史，无需外贴。真实用户scope/macOS/桌面/M1继续后排。

## AA收单集成、AB回归返修（2026-10-22，历史）

[总控收单](acceptance/wave1/controller/WATER-W1-AAAB-REVIEW-20261022.md)：AA单票合格已集成0f1e5d7，AB原证据/五测通过但拒绝真实AA末条observer取消的合法completed+skipped结果；[补充单01 READY](dispatch/wave1/AB-PROJECT-WORKSPACE-ADDENDUM-01-READY-REPORT-20261022.md)，贴回原AB对话。主检出绝对wrapper/新增6条目保持旧479，实际resume六失败按预期复现，不表示已修复。总控系统窗口0，真实AA→AB整链尚未验收，AA/AB不记VERIFIED。

## AA/AB额外同意接线已派前READY（2026-10-19，历史）

[正式READY回执](dispatch/wave1/PROJECT-CONSENT-READY-REPORT-20261019.md)：同一精确f3b87b7基线、两树干净/新产品目录不存在。AA真实P/R/E/H/Q/Z与X共享token、AB双向回放和真实W/Q及结构证据实际下载通过；479约束/旧426保持，原生窗口0。两票独立可同时外贴；实现后真实AA→AB及同次选择内容同意由总控联合验收。控制输入的dialog envelope明确是合成声明，不能冒称已运行新AA或S。

## X/Y/Z收单与真实交互联合验收完成（2026-10-19，已收口）

[总控验收](acceptance/wave1/controller/WATER-W1-XYZ-REVIEW-20261019.md)：三票原字节归档/8道final/6条负控审计通过；隔离新离线环境X4/Y5/Z4及11项独立边界通过。同一真实X经Y固定启动器和真实浏览器开始、选择取消、完整、合作取消及W/Q下载通过；3次系统窗口，宿主正常退出/端口关闭。a9f6472已纳主线，X/Y/Z均VERIFIED（Windows受控范围）。Z尚未接用户页面额外内容同意，真实用户scope/macOS/桌面/M1未验收。

## X/Y/Z三票派前完成（2026-10-19，历史）

[正式READY回执](dispatch/wave1/INTERACTIVE-READY-REPORT-20261019.md)：三票共同精确1c152a1基线，各自干净且产品目录不存在；X既有P/R/A/V与共享token、Y双向回放/W模型/平台实际Q下载、Z P/N/U与原生单名句柄读取通过。0原生窗口，所有新产品仍未实现/未测试。按用户要求一次外贴三条独立线，不等待X实现才让Y开工，Z同波独立推进；实现后真实X→Y整链由总控验收。派前换行失败与r2纠正均归档，旧锁/产品未改。

## W补单01与真实V→W联合验收完成（2026-10-19，已收口）

[总控验收](acceptance/wave1/controller/WATER-W1-W-ADDENDUM-01-REVIEW-20261019.md)：接收df9255b/实现020cd89，集成e38b81c已纳主线；旧1642及新1148份worker归档保持，三final/五条稳定负控链审计、独立完整五测与56项公开入口检查通过。集成新私有离线V构建、完整五测及真实V→W两窗/HTTP/浏览器/实际Q下载通过；两原生PID退出、端口关闭，无强制终止。受控Windows验收通过，M1及真实用户scope/macOS/桌面仍未完成，下一波须先明确范围与权限。

## W正式收单返修，补单01 READY（2026-10-19，历史）

[W总控验收](acceptance/wave1/controller/WATER-W1-W-REVIEW-20261019.md)：1656交付路径/1642归档/25872812字节、原三final与四稳定红绿通过；隔离树一次新完整五测5/5和三图通过。但原完整报告根有7直接子项，将每目录上限降到1仍在模型/stream/HTTP接受且completed，独立回归失败，W不集成。

[补充单01](dispatch/tickets/WATER-W1-W-ADDENDUM-01-20261019.md)已冻结并实际resume通过，12次矛盾接受按预期观察，表示派前已知回归复现，不表示产品已修好；[READY回执](dispatch/wave1/W-NATIVE-REVIEW-ADDENDUM-01-READY-REPORT.md)。原树首个续做HEAD b65902d，干净；新控制从主检出绝对路径读，旧报告/证据/原336保持，合计341主线冻结。贴回原W对话，不新开执行者，无系统原生窗口/物理fixture。

## V已收单集成，W当时继续原对话（2026-10-19，历史）

[V总控收单](acceptance/wave1/controller/WATER-W1-V-REVIEW-20261019.md)：403交付路径/394原字节归档、五final及四条完整红绿链审计通过；新私有树格式/clippy/build、9编译证明/3无窗口CLI错误通过。20次进程观察未见残留原生进程，本次总控未启动原生窗口。W此前下载断言失败后恢复完整五绿，仍须完成负控/final/提交与正式报告。两个“完成”通知不替代实际提交，W不重复派出。

## V/W原同波READY（2026-10-19，历史）

共同精确基线30a803537602211ed2a11c106c63fd27cefb260f，water-w1-native-host-base-20261019；v/w两独立干净树，104新锁条目/13继承锁/336唯一冻结在三树通过，旧21任务及槽位保持。V实际八次原生依赖捕获/旧T24份通过；W实际原字节流与浏览器点击下载5096字节通过。69份准备和基线原字节证据已归档，含准备失败及旧六case。新产品不存在，不以探针代替实现。

分别外贴[V工单](dispatch/tickets/WATER-W1-V-NATIVE-SESSION-20261019.md)和[W工单](dispatch/tickets/WATER-W1-W-NATIVE-REVIEW-20261019.md)，无需等待另一条实现；真实固定V→W启动器整链等两票收单后总控联合验收。两票dispatchedAt/startedAt仍null，无自动worker。marker内容采集尚未冻结，不额外派未定义权限的读文件任务。

## R补单01/T/U验收集成通过（2026-10-19，历史收口）

R接收a8386d8/受测a7cbe2b，T接收df00405/受测f26f727，U接收545df67/受测39ea9ff；隔离受测ae5d34a已合入主线。原最终门13项复跑；私有离线原五测/真实桥接及T浏览器五测、九生产负控逐次完整五红/恢复五绿、九独立测试、21编译拒绝/成功对照通过。1487交付路径、1403原helper归档、291冻结保持，原R受阻24文件不变。T真实下载与切换/筛选原字节一致，U未获内容采集权限。

该次收口时没有未结外贴票；宿主/原生来源页面现已完成前置，按上方V/W正式READY单执行。尤其T当前source_kind不含native_scope_metadata，未把新R扫描标成synthetic_memory来冒称纵向用户闭环。[总控验收](acceptance/wave1/controller/WATER-W1-RTU-REVIEW-20261019.md)、[下一波前置](dispatch/wave1/AFTER-RTU-NEXT-WAVE-PLAN-20261019.md)。

## S独立验收及集成通过（2026-10-19，历史收口）

S接收fcf422a/原受测ececf1c，隔离受测9586a75已快进合入主线。五final复跑、私有离线构建和五测/格式/clippy/metadata/公开桥接、三个真实生产负控的完整五红→原字节恢复→五绿、三独立原生选择/COM用例、13编译拒绝与成功对照通过。385交付文件和291冻结保持。实际选择root/nested与初始root不同，真实GetResult路径和N/P身份逐项一致；MTA冲突保持宿主、STA嵌套初始化/释放按类型与限定符验证。

原R补单/T/U及A–Q任务对象未改，无新派单/自动实现者。下一波纵向宿主接线等R/T验收，S不重贴；详[S总控验收](acceptance/wave1/controller/WATER-W1-S-REVIEW-20261019.md)。

## 本波原派前通过（2026-10-18，历史，S已收口）

R原受阻报告提交acefcf1，原基线/helper/255冻结保持；补单01正确修订为按实际已记录后代追加protected_descendant，controller-only c0e2025追加材料后resume通过。S/T/U同基线3d0faef、三独立干净树、94新锁/12继承锁/291唯一冻结及实际各自baseline通过。S真实窗口取消/结果→N/P；T实际24报告/9错误/点击下载；U现有serde离线和11golden/19raw输入，仅表示具备开工条件。四份外贴入口和原始证据见[本波正式回执](dispatch/wave1/PARALLEL-WAVE-READY-REPORT.md)。

用户要求今后按波次出齐独立任务，已写入工作流。没有自动实现者或新产品/五测试，R仍CHANGES_REQUESTED而补单READY，S/T/U READY未外贴；下一波纵向宿主集成等待R/S/T交付。M1、真实用户scope、生产竞态、macOS、桌面与删除未验收。

## R原生遍历原派前通过（2026-10-18，历史）

独立r树/worker分支共同精确基线dd09c3b8801b86a0059f3fb73fe8a250acb1d89e，61新锁条目/十旧锁合计255唯一冻结、初始干净/产品目录不存在与实际offline baseline通过。真实P/N许可根ID→原生枚举句柄ID、父句柄单名Nt打开、硬链接ID相同/14字节逻辑长度、junction自身打开及根一层7个名称通过；真实已验收Q/A/H桥接24报告/9错误通过。详[派前回执](dispatch/wave1/NATIVE-SCAN-READY-REPORT.md)。

R新产品未实现、递归和五测试未运行，无自动实现者，READY不等于已外贴/RUNNING。R将许可、原生有界元数据、A保守报告与Q脱敏接为纵向单；原生选择器另单。仅本次controller与r新固定fixture，旧227冻结/旧产品/任务对象/根Cargo和旧现场保持；无普通内容读取/真实用户数据、删除或cleanup。M1用户闭环、恶意竞态、macOS和桌面保存仍未完成。

## P/Q独立验收及隔离集成通过（2026-10-18，历史收口）

P接收39dfdfd/原受测2e963bb，Q接收d6e135d/原受测d46b93d，隔离受测c88c557。两票原各五final复跑、新私有离线target各五测试/格式/clippy/metadata/真实公开桥接通过；各三真实生产负控逐次完整五红/恢复五绿，六个独立生命周期/脱敏关联与来源校验测试、P 24/Q 3编译拒绝及两个成功对照通过。227唯一冻结和755份worker交付原字节保持，详[P/Q验收报告](acceptance/wave1/controller/WATER-W1-PQ-REVIEW-20261018.md)。

只读复用p树原4合成目录/1junction/index，普通内容0字节，没有新建/清理fixture或真实数据扫描。P确认仅宿主声明，无原生手势鉴真/遍历；Q为默认脱敏内存JSON，未接文件保存/UI、未保证匿名。当前无未结外贴票，无新READY票或自动实现者，原生选择到有界遍历/桌面/macOS/M1仍待后续。

## P/Q派前通过（2026-10-18，历史）

共同精确基线34badd897b8983cffbb57e03a9df9e6af52f7b8f，独立p/q树/分支及初始干净状态、51新锁条目/九旧锁合计227唯一冻结实核通过。P在本树仅创建4个合成目录/1junction、普通内容0字节，私有离线真实A/N和原生身份/别名/重解析检查通过；Q私有离线真实A/H、24份报告和9原raw错误/来源hash通过。详[正式派前回执](dispatch/wave1/SCOPE-EXPORT-READY-REPORT.md)。

P/Q产品未实现、各五测试未运行；READY不等于已外贴/RUNNING。P只支持待实现的可信进程内许可状态机，不提供原生picker/IPC或遍历；Q只返回默认脱敏内存报告，不写文件/上传/UI，也不保证匿名。旧A–O及五补单/分配/基线/helper/198旧冻结/旧产品/根Cargo和所有旧现场保持，无自动实现者。后续须接原生用户选择、permit到句柄边界有界遍历和桌面导出，M1未完成。

## N/O复验及隔离集成通过（2026-10-18，历史收口）

N接收d3fd65f/原受测f894d64，O接收5a4ad20/原受测62a8ef1，隔离受测3c604ec。原N五final/O三final复跑通过；新私有离线target重跑N五测/格式/clippy/metadata/bridge，O完整五测/语法通过，两票各三项真实源码负控逐次完整五红/原字节恢复五绿。独立native三测试/四项编译拒绝和实际内存服务→HTTP→Chrome检查通过，详情见[N/O总控验收](acceptance/wave1/controller/WATER-W1-NO-REVIEW-20261018.md)。

198唯一冻结和657份worker交付原字节保持。只读复用n原35字节/两个junction/index，无新建/清理fixture或真实用户数据动作；O展示13保留J捕获及5内存变体，没有新扫描。LF/CRLF检出及索引缓存失败/恢复记录保留，未改产品。当前无未结外贴票，M1用户闭环仍未完成。

## N/O派前通过（2026-10-18，历史）

两独立树/分支共同精确基线75cf4db7607a382673a2146ca69732a5110c1579，98新锁条目及八旧锁合计198唯一文件实际核验。N在本树.local由冻结工具准备35字节/两个junction，私有离线A/serde及Win32 ABI/同目录稳定ID、不同目录不同ID通过；O的13真实保留J捕获与5内存变体经真实G/A/E/H/L/M和K模型，隔离Chrome空白页通过。详[正式派前回执](dispatch/wave1/NEXT-CORE-READY-REPORT.md)。

N/O产品未实现，各五产品测试未运行；状态READY只表示准备完毕，待用户外贴。N不是选择授权或安全遍历，O只读调用方内存、没有新扫描；真实scope、分类提升、桌面/macOS/卷唯一与回收量/删除仍未验收。旧任务对象、所有冻结/helper/产品/根Cargo不改，旧树/夹具/日志保留。下一步收N/O后推进选择授权/范围注册与句柄边界有界遍历的纵向工单。

## L/M复验及隔离集成完成（2026-10-18，历史收口）

L接收d821b11/受测7a545fd，M接收88c7bd3/受测03f60ae，隔离受测df17e0a。两票原各五final/五测试通过，新私有target重复通过各五测试/格式/clippy/metadata/桥接；六项真实生产负控逐次完整五测红/原字节恢复绿，四项独立Rust边界与保留的真实J13快照→G→L/M公开入口回放通过。151冻结、A–K任务对象/旧产品/根Cargo及771份worker交付字节保持。A–M及五补单均VERIFIED（Windows受控合成范围），未结外贴单为0；L仅文件名候选、M仅观察逻辑长度与身份提示，不代表分类提升/卷唯一或回收量。未重新扫描或访问物理fixture；真实用户scope、身份IO、L/M页面/桌面接线、macOS和删除未验证，M1未完成。见[总控验收报告](acceptance/wave1/controller/WATER-W1-LM-REVIEW-20261018.md)。

## K补单复验与真实J→K页面通过（2026-10-18，历史收口）

K补单01接收886db33、受测e283d77，隔离95704fe完成原三门/五测试、133独立API/HTTP检查、根路径及三原负控的完整五测红/逐次恢复绿。真实J13快照与独立F/G/A/E/H逐值一致，直接供K服务并在1440×1000和900×800真实选择全部13份会话、核scope根issue与取消空态。仅复用原11+6/81717字节夹具，44内容快照通过，151冻结、1085份K及359份J交付字节保持。A–K及五补单均VERIFIED（Windows受控合成范围），原f16972f失败保留；L/M原任务对象、分配、基线/helper不变，真实用户scope、分类提升、桌面/macOS、卷唯一/回收量和删除未验证，M1未完成。见[总控复验报告](acceptance/wave1/controller/WATER-W1-K-ADDENDUM-01-REVIEW-20261018.md)。没有重造/清理夹具、修改L/M或接触真实用户数据。

## L/M派前完成（2026-10-18，历史派前）

L项目标记证据和M容量观察账本两票已完成正式冻结/独立树/实际离线baseline，READY待用户分别外贴；共同r1基线82e1580，38新锁/七旧锁合计151唯一文件，10+15合成输入及11错误实测通过。新产品未实现、五测试未运行，L/M无物理fixture或真实用户目录权限；K补单原任务对象/基线/helper/132旧冻结保持RUNNING，无自动实现者。见[正式批次](dispatch/wave1/EVIDENCE-BATCH-PLAN-20261018.md)、[派前回执](dispatch/wave1/EVIDENCE-BATCH-READY-REPORT.md)及票面。两个新执行对话各接一票；READY不等于已转贴。真实J→K、真实scope、桌面/macOS及删除仍未验收，M1未完成。

## 并行评估与K补单启动（2026-10-18，历史）

K原k树已出现补单01的START-AUDIT及169500字节回归bundle，HEAD/分支/来源hash正确，按启动证据记RUNNING；原失败未清除，真实J→K页面仍未验收。启动审计自报2026-10-18T03:41:50.355Z，精确转贴时刻未证实。见[启动观察](acceptance/wave1/controller/w1-parallel-assessment-20261018/k-start-observation.json)。

[并行任务评估](dispatch/wave1/PARALLEL-ASSESSMENT-20261018.md)建议另拆项目标记证据侧车和容量观察账本两条纯内存模块线，均只依赖已验收协议，不碰K文件或真实用户数据。当前只是DRAFT，未准备新树/helper/冻结/正式票，未派出；总控没有自动启动实现者。

## K收单与集成退回（2026-10-18，历史）

K接收e717519、实现7d00355，原三门/五测试、104独立边界及隔离三负控/逐次完整五测恢复通过；隔离f16972f真实J13快照与独立链路逐值一致，但K拒绝entry-budget合法根issue空串，整个bundle未能启动服务，真实J→K页面未验收。K为CHANGES_REQUESTED，补充单01已准备待用户外贴给原执行者；原树干净，主线未纳入K产品，A–J及四旧补单保持VERIFIED（Windows）。132冻结、369份K和359份J交付字节保持；44内容快照通过，仅总控新树由冻结prepare创建11+6/81717字节合成run并全部保留。真实用户scope、分类、桌面/macOS及删除未验证，M1未完成。见[K总控验收报告](acceptance/wave1/controller/WATER-W1-K-REVIEW-20261018.md)。补单修复由原执行者完成，总控不代修；后续验收复用原总控集成树夹具，不清理或重造。

## J验收集成（2026-10-18，历史收口）

- 接收干净HEAD `1dfa82c014cbdb99024b0da48dd4b6bff9f9e3d8`、实现b6fd1fe，359新增文件均在白名单，六产品文件实现后未改，350原始证据核来源字节一致。原前四final总控复跑通过；原bridge final失败永久保留。
- [工具勘误01](acceptance/wave1/controller/WATER-W1-J-CONTROLLER-ERRATUM-01-20261018.md)仅调整独立总控Cargo图产物选择，不改原helper/锁或K任务。隔离受测d14e1f1在实际四组重复rlib共存时通过五测试/格式/clippy/metadata、选择器三测试及真实13快照全值比较；Native11/12/39、44快照通过。
- 132冻结、A–I及根Cargo不变，359份交付文件在验收树和main原字节一致。仅冻结prepare在此验收树.local新建一批11+6、81687内容字节，后续复用，无清理。J为VERIFIED；详见[J验收报告](acceptance/wave1/controller/WATER-W1-J-REVIEW-20261018.md)。
- K原单继续，真实J→K页面未运行。macOS、不可达错误/快照超限分支、真实用户scope和桌面未验证；初次行为红与最终测试字节的补录区别保留。

## J/K已外贴与验收准备（2026-10-18，历史）

- 用户确认“我刚贴出去”；东京01:40:31审计已见J六个、K八个未提交实现文件。J新增锁检查、K东京01:34:58–01:35:04新增启动baseline与总控派前记录不同，原字节已归档。没有完成报告，实际开工/转贴时刻和执行模型仍未知。
- 当前J/K均RUNNING，分配/基线/132冻结不变，勿重复派同槽位。旧九单仍已验收，其他未结外贴单为0。
- [本轮核对记录](acceptance/wave1/controller/w1-session-page-plan-20261018/DISPATCH-AUDIT-20261018.md)及[后续真实页面验收方案](acceptance/wave1/controller/SESSION-PAGE-INTEGRATION-PLAN-20261018.md)已准备；仅plan模式通过，总控未运行J/K产品或真实页面验收。

## J/K派前完成（2026-10-18，历史派前）

- 两树j/k独立，基线`bc409f4af8cb2d51b2f67341ad46637cfa5e66f3`、tag water-w1-session-batch-base-20261018-r1。65项新锁、六旧锁83唯一文件（合计132）一致，旧产品/任务/槽位/根Cargo不变。
- J实际Node24/Rust1.95/MSVC、现有13场景链路/11原生12scope39entry通过，44快照一致；仅冻结prepare在j.local新建一批11+6、81057字节合成run，r1复用。K四份实际捕获/I模型和独立Chrome空白页通过，无物理fixture权限。
- J/K均READY待用户分别外贴，新产品/五测试/负控/实际J→K页面尚未运行。见[本批计划](dispatch/wave1/SESSION-BATCH-PLAN-20261018.md)、[派前回执](dispatch/wave1/SESSION-BATCH-READY-REPORT.md)。旧历史票上返工文字已加归档提示，不重做旧单。

## G/H验收集成（2026-10-18，已完成）

- G接收85c64d5、受测实现4ae559b；H接收cab41d1、受测实现52748c5，两树干净。60/54新增文件均在原票白名单，各六产品文件，后续只补报告/证据。原各五final门及五测试、G四/H三项总控独立测试全过；历史七项负控完整红绿与恢复hash核对通过，历史实现前先红次序仍未证实。
- 统一隔离受测`e383ece84f2943fe099106f2e121643417bbe346`新target离线复测通过G/H各五测试、原桥接及七独立测试。实际F原生11case/12scope/39entry，加两控制样本，经G/A/E/H与I模型全链路通过；44快照一致。83唯一冻结、A–F及I产品tree和根Cargo不变，114份worker文件物理字节一致。
- G/H均VERIFIED（Windows范围），[验收报告](acceptance/wave1/controller/WATER-W1-GH-REVIEW-20261018.md)及main推进记录为准。仅总控冻结prepare在本集成树.local新建一批有界合成run；没有真实用户数据、I页面扫描接线、生产竞态保证、分类/去重回收量或删除，macOS未验证。

## I验收集成（2026-10-18，已完成）

- 接收干净HEAD da0fa3e、受测实现8888c26，43新增文件均在白名单，后加35文件只为报告/证据。总控check/test/browser三个final门、模型三/浏览器二测试与87项独立模型/HTTP边界全部通过，三张实际截图已看。
- 隔离受测`0f855cfd68a086e79658a05b2e86803998f2add0`原五测试、三个独立完整红/绿负控、最终check/五测试与87独立检查通过，83唯一冻结与A–F产品tree不变，43份文件Git内容保持，41份字节一致，HTML/CSS仅checkout换行差异。历史先红次序与worker完整负控输出缺失如实保留限制；总控独立复验的完整日志和坏态源码已归档。
- I为VERIFIED（Windows范围），见[I验收报告](acceptance/wave1/controller/WATER-W1-I-REVIEW-20261017.md)。仅冻结E投影合成报告、loopback和隔离Chrome，无真实数据/扫描器/桌面/IPC接线，macOS未验证。

## F验收集成（2026-10-17，已完成）

- 接收干净HEAD `65e928d3c193e58db758eaf8f0022c975c3ca24d`，受测实现3f3acbd；353新增文件均在白名单，后加76文件只为报告/证据，九个产品/测试文件不变。总控原五final门、真实扫描11 case/12 scope/39 entry、五项独立边界全部通过；327份worker原始日志/receipt与现场一致，四负控目标红与恢复记录核对通过。
- 隔离受测SHA `55266ed9a1fc79d4b3a2bedaa8c09f06f1f3e40d`：新target离线六Rust测试、fmt/clippy/metadata、真实桥接及五独立测试首次通过，六锁83唯一文件与A–E产品tree不变；353份worker文件原字节保持。冻结prepare仅在集成树.local新建一批11+6有界合成run，44快照一致，无清理。
- F为VERIFIED（Windows范围），[验收报告](acceptance/wave1/controller/WATER-W1-F-REVIEW-20261017.md)及集成证据已归档。普通文件不读内容、Windows identity恒Unknown；macOS、真实ACL/ReadDir迭代失败、生产竞态、真实用户授权及F→G/E/UI链路未验证，没有分类/回收量汇总/删除。

## G/H/I并行派前完成（2026-10-17，历史派前，READY分配保持）

- 三树g/h/i、各自worker/water-w1-*，共同架构基线`045ab4f0d01edd573828fbc8cca988e1ad37efee`、tag water-w1-parallel-next-base-20261017。36项新冻结和五旧锁58唯一文件一致，A–F原基线/helper/锁保持。
- G/H的Node24/Rust1.95/MSVC离线基线及真实A/E资产核对通过：17份G预期报告、11份H来源报告均经A校验，4份I资产由真实E投影生成。I的Node24/隔离Chrome空白页探针通过。G/H/I生产目录尚不存在，未运行新产品测试/bridge/UI；macOS未验证。
- G全未知保护报告+完整facts sidecar，H固定白名单汇总且不承诺匿名不可关联，I只读合成报告阅读。三票独占目录/构建状态，无物理fixture/真实数据权限。原派前时均READY未确认外贴，总控未自动启动实现者；当时F继续原票。F最新验收结果见上节。

## F派前完成（2026-10-17，历史派前）

- 独立f树/worker/water-w1-f，精确基线`fc114eb81125cef7d374deddc95144bcd9aee748`，tag water-w1-scan-lab-base-20261017；22项新冻结及四份旧锁43唯一文件一致。A–E产品、原基线/helper/锁及根Cargo不变。
- Node24.16/Rust1.95/MSVC基线通过，Windows身份API编译探针按预期拒绝不稳定API；Windows身份约定Unknown。prepare工具在f树.local准备11正常run/6负例，实际均创建，81057内容字节，44快照一致；std探针确认硬链接文件长度及两种目录链接reparse属性。
- READY待用户外贴，不代表已启动。F仅冻结prepare工具可新建合成文件/链接，Rust生产/测试只读；没有普通文件内容读取、真实用户scope授权、生产竞态保证、分类/报告组装、UI、删除或macOS验收。没有自动启动实现代理。

## E验收集成（2026-10-17，当前）

- 接收HEAD `b285a0e15f6e514b0e90e793ab83f63f85db05d9`，干净；受测实现5b23f9c。42新增文件全部在白名单，19冻结及根Cargo/旧产品不变，实现后只有证据/报告。总控五final门、实际Rust→JSON→C九断言与四项独立内存边界首次全过。
- 隔离受测提交`d5f08d8f36b12db29a210ddb6b53fa413b20584f`在离线新target重复通过五Rust测试、fmt/clippy/metadata、真实桥接九断言与四独立测试；43唯一冻结一致，43份worker文件原字节保持，A/B/C/D产品tree未变。
- E为VERIFIED（Windows范围），详见[E复验/集成报告](acceptance/wave1/controller/WATER-W1-E-REVIEW-20261017.md)。没有物理fixture、正式UI/IPC、扫描/清理或macOS验收；现有票已收口不等于M1完成，下一张扫描票仍为DRAFT。

## D补单01验收集成（2026-10-17，当前）

- 接收HEAD `711c38c9d626c4ceb624a48173356887c913d9c7`，干净；补单三产品/12新记录符合白名单，8冻结及旧证据不变。原check/五测试与独立19边界总控首次全过。
- 隔离受测提交`4e44ee6d3eca2cfd691bc30f298dff3c606e14f9`：两语法、五测试、19独立边界全过，43唯一冻结一致；D产品tree与接收提交相同，A/B/C及E冻结未变。20个合成run仅在集成树.local，未清理。37份源证据原字节一致，Windows三链接能力实际通过，macOS未验证。
- D为VERIFIED，详见[本轮复验/集成报告](acceptance/wave1/controller/WATER-W1-D-ADDENDUM-01-REVIEW-20261017.md)。该轮未改E树或分配；E后续状态见本页最新验收段，没有自动启动实现者。

## D修订/E展示投影安排（2026-10-17，历史派前）

- D仍为干净b92d5b8，无补单新提交/回执；原补单01、起点、helper和8锁保持，不重复派原单或由总控代修。
- E仅依赖已验收A/C，独立`.worktrees/e`、worker/water-w1-e、基线`1fce65323daf79c9f74ff84d86883692e4cb1b3e`。19冻结、Node24/Rust1.95/MSVC链接baseline实际通过，READY待用户外贴；未运行五产品测试或实际E桥接。
- E使用独立packages/report-view workspace/锁，生产逻辑纯内存，不修改根Cargo、A/B/C/D、旧helper或旧锁，不接C页面/IPC。四合法/六非法输入经实际A校验，C对预期数据兼容检查通过，不等于E实现通过。
- [本批安排与后续顺序](dispatch/wave1/NEXT-BATCH-20261017.md)、[E派前回执](dispatch/wave1/REPORT-VIEW-READY-REPORT.md)及registry/manifest为当前依据。总控未自动启动实现者；READY不等于已经外贴。

## 总控接手与A验收/D原单退回（2026-10-17，历史）

- 用户指定接手失效对话`codex:f62e8a21-24f9-488a-904d-a3050525a155`，随后明确A/D已完成、直接验收。以项目材料和实际Git为准，未恢复旧聊天内容。
- A接收HEAD `5e32f51cc2fe5be6c3516a492a7a75f7a63a2015`干净，9冻结一致；补单只改两个产品文件。总控四门及独立wire三测试首次全过。隔离受测提交`74fa13b23729405fc11069e04d6c50b015c6a138`离线五契约/三wire测试及fmt/clippy/metadata全部通过，26冻结与B/C目录tree一致，已VERIFIED并纳入主线。
- D接收HEAD `b92d5b8dff8802d1e403e59c08eb1cd4fb175f5f`干净，8冻结一致；check及五测试首次全过，但纯校验的六类数组/18个非索引属性变体错误接受，CHANGES_REQUESTED，补单01已准备。未集成D。
- B/C产品tree与接收提交完全一致，保留VERIFIED；两个只读辅助仅审计材料，没有实现或发单权限。
- 详见[本轮验收报告](acceptance/wave1/controller/WATER-W1-AD-REVIEW-20261017.md)。本会话环境cwd已是water，仍对每条项目命令显式指定工作目录；旧会话目录切换失败不套用于本会话。

## 下一批派前完成（2026-10-17，历史）

- A仍为干净原提交475c470，9项冻结一致，未见补单新提交/回执；原补单01及续做起点保持，不由总控代修。
- D树`.worktrees/d`、分支worker/water-w1-d，基线`7007c65d5845c3fe5938d920e930c8bcb7ffc4e0`，tag water-w1-fixture-base-20261017-r1。独立8项冻结、Node24、干净baseline及3种链接probe实际通过；11case/57node/575内容字节/18负例已准备。产品工厂未实现，五产品测试尚未运行，macOS未验证。
- [下一批计划](dispatch/wave1/NEXT-BATCH-20261017.md)与[派前回执](dispatch/wave1/FIXTURE-READY-REPORT.md)给出实际证据。D只在自己的.local创建合成夹具，不扫描/分类/删除；权限/取消计划仅为未来验收输入。
- B/C状态和原A/B/C工具/冻结锁不改；总控只读复核、架构与验收，未自动启动实现者。正式核心边界在NEXT-CORE-DRAFT，尚非可派票。

## B/C补充单01复验（2026-10-17，当前）

- B接收提交`5b88fd0c5f306df5586e8c8445d45f39940e8597`，C接收提交`d8cc6979813ecf2ff03898d40b8ae217b1df29f8`，两树干净，后加报告无产品变更。原事实数据/fixture/旧证据及冻结工具均保留。
- 总控独立B语法+五测试、C语法+五模型+两浏览器全部通过，本轮首次通过；原六个独立边界也全部通过，已查看三张实际截图。B继承调用数0、C未知名称顺序正确。
- 独立集成树实际受测提交`d002c0c1d91db47fb8a685a07e0115ac9ad189c9`：7语法、B5/C5/浏览器2、4项独立入口断言、18冻结哈希与文档元数据全部首次通过。B/C目录Git tree与接收提交完全相同，后续只补文档/证据并推进main。
- [复验与集成报告](acceptance/wave1/controller/WATER-W1-BC-ADDENDUM-01-REVIEW-20261017.md)记录真实SHA、receipt与限制。B/C尚未互相接线，也未接A或真实扫描，macOS未验证。以下原交付退回记录为历史。

## B/C原交付独立验收（2026-10-17，历史）

- B提交`d05eae7b5a0fe5c952744336a776a8c5ee1b2873`：check/test总控复跑通过，六工具17页官方来源独立审查未发现具体数据错误；构造数组可用继承方法跳过来源/固定顺序校验，两例真实失败，开B补单01。
- C提交`93e2509882f3090883c8ccaedf2fb30e83dba49a`：check/五模型测试通过，浏览器首次Page.navigate超时，同提交未改代码重跑两测试通过；截图已实际查看。多个未知容量项在name_asc下没有按名称排序，开C补单01。八个固定详情滚动时只读提示文字仍可见，不列该候选缺陷。
- B的30处文件差异、C的39处文件差异均在白名单；各9项并行冻结哈希一致。后加报告未夹带产品变更，两树保持原提交和干净状态。报告、日志、截图、独立边界与历史哈希核对见[BC验收报告](acceptance/wave1/controller/WATER-W1-BC-REVIEW-20261017.md)。
- 各补单续做SHA/新回执已写进主manifest，新增报告白名单，其余原基线/helper/冻结锁不变。补单已准备不等于已外贴或开工；没有合入A/B/C产品、真实扫描/清理或macOS验收。

## A原单独立验收（2026-10-17，历史退回）

- 对干净提交`475c4703be3c455089b8080b53e084d4721b10f7`复跑fmt/test/clippy/metadata全部通过，五个测试真实执行。239文件均在原票范围，9项冻结哈希不变，报告提交未夹带产品变更。
- 总控独立harness链接原库，正例通过；20种wire枚举的93种对象形式、报告20个枚举位置均错误接受，违反字符串Schema，两个目标断言失败。因此不验收合入，发补充单01，不修改worker产品代码。
- [验收报告及证据](acceptance/wave1/controller/WATER-W1-A-REVIEW-20261017.md)已归档。补单起点仍是原提交，基线/helper/冻结锁不变，B/C独立。补单已准备不代表用户已转贴；B/C则于06:20Z观察到各自未提交实现文件，按启动证据记RUNNING，实际开始时间未知。
- Windows Rust契约检查已实际运行；macOS未验证。main仅有架构/调度/验收材料，没有集成A库或真实扫描/清理能力。以下原派前记录为历史事实，最新状态以本节与manifest为准。

## 并行追加与旧观察（2026-10-17，历史）

- ADR-003追加两条独立交付线：B六工具发现/保护元数据与Node纯校验，C固定虚构数据的只读交互原型。它们互不依赖，也不依赖A的在途Rust产物。
- B/C分别在`.worktrees/b`、`.worktrees/c`，分支worker/water-w1-b与worker/water-w1-c，精确基线`e92f39647c91d9ce077d592583c3352626d3402b`，tag water-w1-parallel-base-20261017。各自Node24/冻结哈希/分支/洁净baseline通过；C隔离Chrome空白页探针通过，不是原型UI已验收。
- A树未被修改/同步/切分支；原契约锁、权限、默认Rust helper/rules不变。现观察A HEAD=`475c4703be3c455089b8080b53e084d4721b10f7`且有完成报告、工作树干净，已记SUBMITTED，尚未读实现或复测，不宣称验收通过。
- B/C任务级helper/rules/lock与A不同；用户分别转贴，dispatchedAt/startedAt仍null，没有自动启动B/C。见[本轮计划](dispatch/wave1/PLAN.md)与[并行派前回执](dispatch/wave1/PARALLEL-READY-REPORT.md)。

## 第一轮派前完成（2026-10-17）

- 已冻结 [scan v1契约](../contracts/v1/README.md)、完整Rust API和9项文件哈希；准备66组报告输入、6组raw JSON、6组手工DTO、2组资源边界及基础值材料。
- 架构基线为`a1e68364d47e137f8b66543eb95d35bb04424c78`，tag `water-w1-base-20261017`。
- 槽位a：`F:/new/smaltalk/water/.worktrees/a`，`worker/water-w1-a`，HEAD精确为基线，状态干净。baseline实际运行通过（冻结哈希、分支、Rust1.95.0与MSVC链接探针），未运行产品测试。
- [正式票](dispatch/tickets/WATER-W1-A-CONTRACTS-20261017.md)、权威manifest、工作树、报告与证据父目录均存在；[派前回执](dispatch/wave1/CONTROLLER-READY-REPORT.md)记录已做/未做检查。
- 初次仅A的READY记录现已被后续提交观察及B/C追加更新；该节保留初次派前证据，最新状态以本页“下一步”、独立验收及registry为准。

## 协作约定及初次登记（2026-10-17，初次状态为历史）

- 用户指定总控写架构、规划和验收；实现单由总控写外贴指令、用户转贴，不自动启动实现worker替代人工外贴。
- 已只读学习car op的契约/工单/manifest/检查入口及denglou的独立槽位/行为与反向验收方法，未修改或运行这些项目。
- 已落地 [CONTROLLER-WORKFLOW.md](CONTROLLER-WORKFLOW.md)、工单/回执模板和空登记；完整依据见 [学习记录](../research/CONTROLLER-WORKFLOW-STUDY.md)。
- 最初的空台账阶段已结束；当前唯一活动波次water-wave1、槽位a已准备、WATER-W1-A为READY。依赖它的后置实现票未派；READY不表示执行中。
- 本轮校验通过：25份Markdown、42处本地链接、182处固定本地源码引用、5个上游checkout；外贴登记0任务、工作流来源14份。只验证文档/来源元数据，不是产品行为测试。

## 未完成与验证限制

- 已核实PATH没有cargo/rustc，但默认cargo目录中的代理与精确Rust 1.95.0、rustfmt/clippy及MSVC工具可用；无需先安装或修改全局环境。A补单的原门与独立枚举边界已通过；单票与集成状态分开记录，macOS未验证。
- 当前机器为Windows；macOS行为、签名、安装包、真实容量及恢复能力均未验证。
- 产品许可证、定价、品牌与远程仓库尚未冻结；没有公开发布、推送、收款或联系上游。
- 各上游的静态风险均不是已复现漏洞；Water也没有因此获得安全认证或独有功能证明。
- 旧会话曾遇到目录切换接口未识别observed worktree；此为历史限制。本次接手环境cwd为`F:/new/smaltalk/water`，所有项目产物仍只写Water。

本轮完成记录见 [COMPLETION-SUMMARY.md](COMPLETION-SUMMARY.md)。全部后续项目工作继续在water内，由总控统一分派与验收。
