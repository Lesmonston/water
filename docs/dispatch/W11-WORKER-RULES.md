# 第十一波执行者规则（收尾小修与改名 Flick）

2026-11-07，总控（Claude）。**以[通用规则](WORKER-RULES.md)为准**，本文件只补第十一波特有的：单号与目录、检查入口、门、真实数据范围。冲突时以工单为准，其次本文件，再次通用规则。

来由与已拍板的决定见[第十一波计划](wave11/PLAN.md)；改名的精确规则见冻结契约 [RENAME-FLICK](../../contracts/w11-v1/RENAME-FLICK.md)。

## 1. 单号与目录

| 单 | 做什么 | 只改 | 检查入口 | 门 | 批 |
|---|---|---|---|---|---|
| WATER-W11-N1 | 界面（界面单） | `apps/water/ui/` | `checkup-wave-check.mjs` | 轻门（含浏览器与截图） | 一 |
| WATER-W11-N2 | 宿主 | `apps/water/host/` | `desktop-wave-check.mjs` | 中门（含整机） | 一 |
| WATER-W11-N3 | 执行器 | `packages/junk-clean/` | `checkup-wave-check.mjs` | 重门 | 一 |
| WATER-W11-N4 | 规则 | `packages/junk-rules/` | `checkup-wave-check.mjs` | 轻门 | 一 |
| WATER-W11-N5 | 扫描 | `packages/junk-scan/` | `checkup-wave-check.mjs` | 中门 | 一 |
| WATER-W11-N6 | 项目声明 | `packages/cleanup-manifest/` | `checkup-wave-check.mjs` | 轻门 | 一 |
| WATER-W11-N7 | 查重 | `packages/dup-finder/` | `checkup-wave-check.mjs` | 轻门 | 一 |
| WATER-W11-N8 | 服务 | `packages/water-service/` | `desktop-wave-check.mjs` | 中门 | 二（N3、N5、N6 合入后） |

- 检查入口都在 `F:/new/smaltalk/water/scripts/`，用法：`node <入口> --task <单号> --mode <模式> [--final]`，在工单指定的工作树根目录执行。
- 各单改各的目录，编译时互不依赖。N4～N7 由同一个执行者按顺序做，一张交回再做下一张。
- 模式与负控做法照通用规则第 6 节；`lock`、`check`、`test`、`browser`、`real`、`native`、`archive` 的含义与第十波相同。

## 2. 第十一波共同的

- **改名照契约**：看得见的 “Water” 改为 “Flick”；契约第 2 节列出的不改。只改本单目录里的。
- **旧断言**：工单预列了“获准修改”的，照预列迁移；没预列但因本单必然要变的，照通用规则第 3 节第 1 条直接迁移，不得变弱，回执逐条写原值 → 新值 → 为什么。
- **依赖**：不改任何 `Cargo.toml` 的依赖与 `Cargo.lock`。唯一例外：N2 照契约第 6 节改 `[[bin]] name`。
- **系统函数**：不新增，照各包现有的。
- **计时**：测试里不加新的墙钟时限断言。只因计时失败的照通用规则第 3 节第 2 条处理。
- **隔离根**：测试的隔离根一律在本树 `.local/` 下，新旧两个名字都**不得**建在任何盘根。

## 3. 真实数据（一律只读，输出只有计数或组级汇总）

| 单 | 真实冒烟读什么 |
|---|---|
| N1 | 不读真实数据（浏览器只用契约夹具） |
| N2 | 整机检查只清理本树夹具，**不点“打开文件夹”**；数据目录用检查器给的 `WATER_DATA_DIR`，不碰 `%LOCALAPPDATA%` 下的真实 Water 或 Flick 目录 |
| N3 | 各固定盘 `<盘>:\.flick-quarantine` 与 `<盘>:\.water-quarantine` 的状态与编号目录个数；**不移入、不复原、不删除** |
| N4 | 已知目录是否存在（照 M1） |
| N5 | 一次只读真实扫描（照 M2/M13） |
| N6 | 本仓库 `.worktrees\` 的 `.git` 小文件三种状态的个数；仓库根有声明文件（两个名字）时各只读一次 |
| N7 | 只对本仓库 `docs/` 查一次重 |
| N8 | 一次只读真实体检，清理关闭（照 M14） |

## 4. 机器负载

- 同一时间机器上可能有三四张单在编译与测试。跑 cargo 前按进程名看一眼；别的单在跑测试时，计时类断言偶尔会超，照通用规则第 3 节第 2 条重跑。
- 交回后停止一切测试与后台进程（包括无头浏览器）。
