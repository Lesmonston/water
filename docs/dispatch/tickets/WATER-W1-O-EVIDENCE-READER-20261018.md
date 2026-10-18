# WATER-W1-O：项目证据与容量观察页面

归档状态（2026-10-18）：VERIFIED（Windows受控范围），原票不再外贴或从基线重做。以下为原执行票，当前以manifest及[总控验收报告](../../acceptance/wave1/controller/WATER-W1-NO-REVIEW-20261018.md)为准。

总控2026-10-18。执行前主manifest必须为READY；用户转贴后一个新执行对话独占本票。只依赖已验收A/G/E/H/I/J/K/L/M及冻结供数，与N完全独立。

| 项 | 唯一值 |
|---|---|
| 权威票 | F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W1-O-EVIDENCE-READER-20261018.md |
| 工作树 / 分支 | F:/new/smaltalk/water/.worktrees/o / worker/water-w1-o |
| 精确基线 | 75cf4db7607a382673a2146ca69732a5110c1579 |
| tag | water-w1-next-core-base-20261018 |
| 权威manifest | F:/new/smaltalk/water/docs/dispatch/wave1/manifest.json |
| 冻结 | contracts/next-core-v1/freeze.lock.json，98项+八旧锁，合计198唯一文件 |
| helper / 纪律 | scripts/next-core-check.mjs / docs/dispatch/W1-NEXT-CORE-WORKER-RULES.md |
| 回执 | F:/new/smaltalk/water/.worktrees/o/docs/dispatch/reports/WATER-W1-O-REPORT.md |
| 证据 / 临时 | 本树docs/acceptance/wave1/o/、.local/checks/WATER-W1-O/、.local/browser-lab/ |

必读主检出README/STATUS/AGENTS/工作流、本票、M1-DELIVERY-PLAN、ADR-010、本批纪律、next-core-v1 COMMON/TESTS、evidence-reader-v1 SPEC/PROVENANCE/sessions、L/M SPEC、真实K/I模型和K server。执行树早于票面/登记，直接读主检出权威票，不merge取票。首次核绝对路径、分支、精确HEAD、干净状态、198冻结及prototypes/evidence-reader尚不存在；不符保留现场写受阻回执，不重置。

首次仅运行：

```powershell
node scripts/next-core-check.mjs --task WATER-W1-O --mode baseline
```

baseline已由总控实跑，执行者开工重复确认；只验证Node24、18份冻结输入/来源hash、真实旧K模型和隔离Chrome空白页，不代表O产品/五测试已通过。不运行prepare-next-core-assets，不建物理fixture、不读真实数据；.local只允许日志和私有browser profile，最多一个Chrome，无npm/install。

## 实现

仅prototypes/evidence-reader，沿用现有页面设计系统。必须真实复用K.assertSessionBundle及I模型，不复制/改旧模型。新bundle外包source_kind+session+真实L/M侧车，校验精确头/版本/来源/全部candidate和identity关联，API/错误/u128规范按SPEC。

startServer仅调用方内存，先验证再捕获不可变JSON<=64MiB；无fixture/文件/CLI/env fallback。精确7路由、127.0.0.1、Host/GET/HEAD、CSP/错误/realpath按SPEC/K。import不自启；不能为演示添加默认读取静态JSON的产品入口。

页面可实际选择18份snapshot，保留来源声明/受控只读提示、scope根issue/取消/未知/覆盖。L为文件名弱候选和三个false，保持display_only/protected；M观察字节/Unknown/冲突/u128原值、身份完整性和scope覆盖分开。null不是0、无文件观察不是磁盘空、硬链接组不是卷唯一分配或可回收量；不重算source_totals或因筛选改总量。完整详情+可访问dialog/焦点/Escape、文本字面安全、两个视口无水平溢出。无选目录、扫描、上传、导出、删除或shell入口；这些另票。

白名单仅本树：prototypes/evidence-reader/README.md、index.html、styles.css、app.mjs、model.mjs、server.mjs、tests/model.test.mjs、tests/browser.test.mjs；docs/dispatch/reports/WATER-W1-O-REPORT.md和docs/acceptance/wave1/o/新证据。不得增package.json/依赖、修改K/L/M/helper/冻结/台账/根Cargo/上游/别树。

## 五测试、真实服务和红绿

model.test.mjs三个顶层evidence_reader_bundle、evidence_reader_selection、evidence_reader_annotations；browser.test.mjs两个顶层evidence_reader_live_input、evidence_reader_layout_and_safety。精确五顶层，无子测试/skip。覆盖冻结18份、来源伪改/非法关联/漏ref、四规则候选、Unknown/冲突和超过u64值。

至少两个不同caller bundle及重命名scan ID经过实际startServer→HTTP→真实Chrome，启动后调用方突变不影响服务捕获。检查7路由/HEAD/Host/非法方法与raw攻击、精确CSP、18份真实选择、身份组/大整数/根issue/empty/source_kind及恶意HTML字面；不能仅model内切换冒充服务接线。使用scripts/browser-lab.mjs；1440×1000、900×800和详情新截图保存为SPEC规定三名。

先完整五测试和可运行骨架`red-behavior`，命中O_BEHAVIOR/退出1；再实现、suite五绿。稳定代码后逐个实改真逻辑：

1. red-nc1：真实服务JSON捕获截短snapshots，命中O_SERVER_CAPTURE。
2. red-nc2：UI把null去重字节显示为0，命中O_LEDGER_UNKNOWN。
3. red-nc3：真实动态textContent改innerHTML，命中O_TEXT_LITERAL。

每项完整五红→立即原字节恢复→suite五绿，原/坏/恢复哈希及测试不变。SyntaxError/超时/缺文件不算；不得改helper/弱化断言/测试开关。final核当前字节恢复证据，变化重录。命令统一`node scripts/next-core-check.mjs --task WATER-W1-O --mode <mode>`；允许baseline/check/test/browser/suite/red-behavior/red-nc1/2/3，一次一个门、一个Chrome、单子命令180秒，无全仓/watch。

实现/测试提交后同一干净SHA串行：

```powershell
node scripts/next-core-check.mjs --task WATER-W1-O --mode check --final
node scripts/next-core-check.mjs --task WATER-W1-O --mode test --final
node scripts/next-core-check.mjs --task WATER-W1-O --mode browser --final
```

归档helper全部json/log/txt/png原字节至本票证据目录，不纳profile/缓存；显式文件名add，log用-f。回执绑定完整受测SHA、18份/两个实际服务输入/两个视口/五测试/三final/完整红恢复/来源标记/实际模型，列全部失败及真实用户scope/新物理扫描/macOS/授权遍历/桌面/删除未验证。报告提交不夹未复测产品，不merge/push，交回后停止。

通知与报告首行：

```text
WATER-W1-O 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/o/docs/dispatch/reports/WATER-W1-O-REPORT.md
```
