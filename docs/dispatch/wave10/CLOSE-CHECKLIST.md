# 第十波收尾与 M3.5 收口清单

2026-11-06 21:55 JST，总控（Claude）。用户同意“按推荐做”：在 M7 还在做的时候，先把收尾步骤写好，到时照着跑。做法沿用[第六次整合](../../acceptance/wave9/controller/WATER-W9-INTEGRATION6-20261102.md)与 [M3 收口](../../acceptance/wave9/controller/WATER-M3-CLOSE-20261102.md)。

## 1. 现状（写清单时）

- 已合入：M1、M2、M3、M4、M5、M8、M9。
- M6 界面：补单 03 已验收通过，按 UI-M35 最后合入（[验收报告](../../acceptance/wave10/controller/WATER-W10-REVIEW-20261105.md)第 13.1 节）。合入记录已预填进 `.local/w10-accept/record-verified.cjs`。
- M7 服务：补单 05 待交回。
- M10 执行器补修：[工单](../tickets/WATER-W10-M10-CLEAN-FIX-20261106.md)已写好，HOLD，等 M7 合入再派。
- **合并预检**（`git merge-tree`，只算不写）：M6 合进主线 `51d85191`、M7 合进主线、在“主线加 M7”上再合 M6，三种都没有冲突。两边改的目录不重叠：M6 只动 `apps/water/ui`，M7 只动 `packages/water-service`。

## 2. 顺序

1. **M7 交回 → 验收。** 照验收报告第 3 节的做法：审计、新验收树、lock、check、real、test final、变异、独立只读审查，并人工确认只新增 `SHQueryRecycleBinW`。M7 的变异要另写：SERVICE-M35 的三条负控、总控补充六条，加上“选”与“推荐”两块的划分。**跑 M7 测试时机器上不跑别的重活。**
2. **合入 M7**（`--no-ff`），然后合入 M6（最后一张界面单）。之后 `record-verified.cjs '{"m7":"<合入>","m6":"<合入>"}'`。M7 的审查摘要与遗留到时补进脚本。
3. **派 M10**（基线到时可改为合入后的主线；总控先建工作树 `.worktrees/w10-m10`，从工作树重算冻结哈希，跑 baseline，再给粘贴语）。
   - M10 跑 cargo 期间，可以并行一张不跑 cargo 的界面小单给 astra：M6 的四条低等级遗留（热力格子夏令时、“体检”点击被吞、拦截不看当前页、打开文件夹偶尔没反应）。界面测试不是计时类。
   - 11-07 用户“出界面小单”：已出 [M11](../tickets/WATER-W10-M11-UI-FIX-20261107.md)，基线 `32d7b642`，与 M10 一同 READY。M10、M11 改的目录不重叠，合入顺序不限；按 UI-M35 的惯例，界面单后合。
4. **M10 交回 → 验收 → 合入**（界面小单同理）。
5. **第七次整合检查**（见第 3 节）。
6. **编 release 版并冒烟。**
7. **写 M3.5 收口报告**（见第 4 节），问用户收不收口。

## 3. 第七次整合检查

整合工具从 `.local/w9-integ6/` 复制到 `.local/w10-integ7/`。`make-manifests.mjs` 改成从第十波清单取各部分的任务配置，宿主那份带上镜像契约 `contracts/desktop-bootstrap-mirror-v1/MIRROR.json`（第六次的教训）。

| 部分 | 检查入口 | 任务配置来源 | 树 | 跑什么 |
|---|---|---|---|---|
| 执行器 `packages/junk-clean` | `checkup-wave-check.mjs` | W10-M10（没派则用 M4） | A | lock、check、test、real --final |
| 进程 `packages/process-scan` | `checkup-wave-check.mjs` | 第九波 L4 | A | lock、check、test、real --final |
| 规则 `packages/junk-rules` | `checkup-wave-check.mjs` | W10-M1 | A | lock、check、test、real --final |
| 扫描 `packages/junk-scan` | `checkup-wave-check.mjs` | W10-M2 | A | lock、check、test、real --final |
| 项目声明 `packages/cleanup-manifest` | `checkup-wave-check.mjs` | W10-M3 | A | lock、check、test、real --final |
| 查重 `packages/dup-finder` | `checkup-wave-check.mjs` | W10-M8 | A | lock、check、test、real --final |
| 已安装程序 `packages/installed-apps` | `checkup-wave-check.mjs` | W10-M9 | A | lock、check、test、real --final |
| 服务 `packages/water-service` | `desktop-wave-check.mjs` | W10-M7 | A | lock、check、test、real --final |
| 界面 `apps/water/ui` | `checkup-wave-check.mjs` | W10-M6 | A | check、test、browser |
| 宿主 `apps/water/host` | `desktop-wave-check.mjs` | W10-M5 | B | lock、check、test、native --final |

- **顺序**（一次只跑一棵树的 cargo）：
  1. 树 A 逐个部分顺序跑；
  2. 树 A 停了以后，树 B 跑宿主的 lock、check、test；
  3. 服务单独跑（它带计时断言），这时机器上不跑别的；
  4. 整机检查最后单独跑。
- **计时失败**：照用户 11-06 的要求，不再硬卡。只因计时失败的，原样重跑，最多 3 次，记进报告；别的失败照常处理。
- **真窗口**（`native --final`）：**开窗前先告诉用户**。用 M5 的整机步骤，只用合成夹具；看清理是否默认先进隔离区，以及隔离区页能否看到这一批、能否永久删除。现有步骤如果不覆盖隔离区，总控先改整机脚本（总控自己的脚本），再跑。截图只用 `PrintWindow`，只截 Water 自己的窗口。
- 报告写成 `docs/acceptance/wave10/controller/WATER-W10-INTEGRATION7-<日期>.md`，格式照第六次：做法、结果、真窗口、release、遗留、没有覆盖的、证据。

## 4. release 与 M3.5 收口

- **release**：在树 B 用同一工具链、离线缓存与镜像参数编 `--release --locked`，输出 `.local/release/water-0.1.0-<sha>/water.exe`，记 sha256 与大小。冒烟：第二个实例退出、最小化的窗口回到前台、正常关窗。冒烟脚本的截图不全（第六次遗留 1），截图前先修成按 DPI 取窗口大小。
- **M3.5 收口报告**（`WATER-M35-CLOSE-<日期>.md`）：
  - 第十波各单做了什么，一页。
  - 真实只读体检复验：
    - 一个整盘（照 M3 收口用 D 盘）、一个文件夹；
    - 记下结论页的判断卡、折叠、线索与隔离区卡的计数和用时；
    - 只读，不清理。
  - 用户 11-02 要求“所有清理经验都进 Water”：对照[第十波计划](PLAN.md)第 2 节的 63 条，逐条写去向（做了 / 留到以后 / 不做与原因）。
  - 遗留汇总：各单的 `carryOverLater`。整组、整行“以后都跳过”留到下一波，要另定接口。
  - 没有覆盖的：macOS、真实关机与注销、默认数据目录等。
- 问用户：M3.5 收不收口；下一波先做什么（整组跳过、写日志失败时保留报告、计划项互相包含时拒绝等）。
- 11-07 已写成 [M3.5 收口报告](../../acceptance/wave10/controller/WATER-M35-CLOSE-20261107.md)：真实复验查出“安装包”与泄漏簇两类认错，建议先出一张小单修好、同一位置复验后再收口（报告第 6 节）。用户“先修再收口”：拆成 M12、M13、M14 三张（见[计划](PLAN.md)“M12～M14 收口前补修”）。合入后：第八次整合（工具从 `.local/w10-integ7/` 复制，规则、扫描、服务三部分改用 M12～M14 的任务配置）→ 编 release → 用 `m35-close-observe.ps1` 在 D 盘与 `F:\Mirasim-A` 复验（开窗前先告诉用户）→ 补写收口报告的复验结论 → 问用户收口。11-07 14:45 都已做完：[第八次整合](../../acceptance/wave10/controller/WATER-W10-INTEGRATION8-20261107.md)通过，release `water-0.1.0-63a500ae`，复验见收口报告第 2.5 节；等用户定收不收口。

## 5. 记着的教训

- 总控在执行者跑计时测试时不跑重活；用完的无头浏览器确认已退出。
- 契约里只对纯计算、纯读取的路径定严格时限，写盘的命令给宽松上限（用户 11-06：“记录一下这种无效的硬卡，后续可以放松一点”）。
- 回执交回先查编码（有没有连续问号、`U+FFFD`）。
- 同一工作树同时只能有一个执行者；派单前确认上一个对话已经停下。
- 11-07 效率复盘（[验收报告](../../acceptance/wave10/controller/WATER-W10-REVIEW-20261105.md)第 15 节）：验收按风险分重、中、轻三档，写在[总控工作流](../../CONTROLLER-WORKFLOW.md)第 7 节第 10 条；下一波执行者规则以[通用规则](../WORKER-RULES.md)为底。
