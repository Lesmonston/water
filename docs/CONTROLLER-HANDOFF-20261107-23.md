# Water 总控交接报告（2026-11-07 第 23 份）

2026-11-07 约 15:00 JST，总控（Claude）。上一份：[第 22 份](CONTROLLER-HANDOFF-20261107-22.md)（`1750f0ad`）。用户要压缩上下文，**接手先读本份**。

## 0. 一句话现状

- **M3.5 已收口**（用户：“收口”）。
  - 第十波 M1～M14 全部合入。
  - [第八次整合](acceptance/wave10/controller/WATER-W10-INTEGRATION8-20261107.md)通过。
  - release `water-0.1.0-63a500ae` 编好；同位置真实复验通过（[收口报告](acceptance/wave10/controller/WATER-M35-CLOSE-20261107.md)第 2.5 节）。
- **软件改名 Flick**（用户：“然后软件名改成Flick，你再设计一下logo”）。
  - 标志选 D“一笔弹出”，见 [Flick 品牌](design/flick-brand/BRAND.md)。
  - 改名范围选“看得见的全改”。
- **[第十一波计划](dispatch/wave11/PLAN.md)已批**（用户：“按计划出单”）：收尾小修与改名合成一波，八张单。
- **下一步**：做出单前的准备，见第 3 节。准备到“预列旧断言”时用户要求先写交接。

## 1. 这一段做了什么（第 22 份 `1750f0ad` 之后）

| 提交 | 内容 |
|---|---|
| `98f9678e` | M3.5 收口报告初稿：用 release 版做真实只读复验，查出“安装包”与泄漏簇两类认错，建议先修 |
| `5d6d7217`、`4a9f6974` | 用户“先修再收口”：出 M12 规则、M13 扫描、M14 服务三张单。M12 受阻一次——工单让负控只改数据，检查器却要求改 `src/`。已改检查器，按任务的 `negativeControlPaths` 判断 |
| `de1bf0e5`、`0886186c`、`467f9e43`、`b93e8442` | 三张验收通过并合入（验收报告第 16 节）；变异 M12 3/3、M13 6/7（c3 等价）、M14 8/8 |
| `fd7cfb0e`、`63a500ae` | 第八次整合时，M14 测试与 M12 新规则对不上。用户：“总控直接改”。总控改测试，再按 rustfmt 格式化 |
| `d18429a3` | 第八次整合通过；release `water-0.1.0-63a500ae` 冒烟通过；复验 R1～R4 都消失 |
| `4d157d2f`、`4e83f3e5` | 用户：“收口”。路线图加 M3.5 一行，第十波清单标为 CLOSED |
| `391c4a94` | 改名 Flick：品牌说明、标志 SVG、应用图标 SVG 与 ICO；图标导出脚本改为可带参数 |
| `abaca8d1` | 第十一波计划草案；订正收口报告第 11 行（按提交号命名的构建产物其实由 M2 泄漏簇认出） |
| 本份 | 订正下午几处估写的时间；写本交接 |

### 1.1 收口复验前后对比（D 盘与 `F:\Mirasim-A`，只读）

| | 第一次（`c1dd420c`） | 修完（`63a500ae`） |
|---|---|---|
| 安装包卡 | 可清 28 项，只有 1 个是真安装包 | 不出现，3 项都不可清 |
| 泄漏簇 | 58 组，多是会话、备份、程序资源 | 4 组，都在 Mirasim 自己的目录 |
| 线索 | 786 条 | 5 条 |
| 卡片 | 原始时间、标题带 UUID | 只写日期，同名折叠行标出位置 |

- **工具**：总控的 `docs/acceptance/wave10/controller/m35-close-20261107/tools/`，有 `m35-close-observe.ps1`、`steps-real.json` 与脱敏用的 `summarize.cjs`。
- **原始数据**：在 `.local/m35-close/`，不入库。

### 1.2 Flick

- **画布**：https://claude.ai/artifact/QaQwhvVUTZTZQPiLtsJAKS，四个方向，用户选 D。
- **标志**：48 网格单一路径，左下圆头、往右上收尖，没有点；界面里用墨色，应用图标是黑底白标。
- **改名范围**：
  - 窗口与产品名 Flick，程序 `flick.exe`；
  - 隔离区 `.flick-quarantine`，旧的 `.water-quarantine` 照旧能列出、还原、删除；
  - 数据目录 `%LOCALAPPDATA%\Flick`，第一次启动搬旧目录。搬失败时这次照旧用旧目录、下次再试——这是计划第 5 节的推荐，用户“按计划出单”即采纳；
  - 声明文件 `.flick-cleanup.json` 与旧名都认，同目录两个都有时用新的；
  - 包名、crate、仓库、`WATER_DATA_DIR`、数据目录里的文件名、IPC 命令名都不变。

## 2. 用户这一段的要求与决定

- “先修再收口” → M12～M14。
- 整合中的测试小修：“总控直接改”（只这一处）。
  - 记忆 `water-controller-small-fixes.md`：下次同类先推荐“总控直接改”，但仍要问。
  - 效率复盘第 4 节“单点小修一律总控改”仍未正式写进工作流。
- “收口” → M3.5 收口。
- “按推荐排” → 第十一波先收尾，“以后都跳过”放第十二波，然后 M4。
- 改名 Flick、标志 D、范围“看得见的全改”。
- “按计划出单” → 第十一波按 [PLAN](dispatch/wave11/PLAN.md) 出八张单。

## 3. 下一步（按顺序）

照第十一波计划第 3、4 节：

1. **预列旧断言**：逐包 grep 测试里的 `Water`、`.water-quarantine`、`.water-cleanup`、`water.exe`、`berg`、`<1 MB`、`自定义`、`已经不长了`、`scale add`，列进各单的“获准修改”。
   - 上一次 grep 被中断了：在 Git Bash 里对八个测试目录一起跑，太慢。改成逐个目录，或用 Grep 工具。
   - 目录：`apps/water/ui/tests`、`apps/water/host/tests`、`packages/{junk-clean,junk-rules,junk-scan,cleanup-manifest,dup-finder,water-service}/tests`。
2. **写冻结契约** `contracts/w11-v1/RENAME-FLICK.md`（计划第 1 节的表与兼容规则）。
3. **写第十一波执行者规则**：以 `docs/dispatch/WORKER-RULES.md` 为底，只补单号表、检查入口、门与真实数据范围。
4. **检查器认第十一波**：`scripts/checkup-wave-check.mjs` 与 `scripts/desktop-wave-check.mjs` 的第 21 行左右按单号前缀选清单，现在只认到 `WATER-W10-`，要加 `WATER-W11-` → `wave11`；覆盖清单的白名单也要加 `WATER-W11-SELFTEST`、`WATER-W11-ACCEPT-`。
5. **提交上面这些，作为基线**；在基线上建七棵工作树：
   - N1 `w11-n1`（界面）、N2 `w11-n2`（宿主）、N3 `w11-n3`（执行器）；
   - N4～N7：`w11-n4` 规则、`w11-n5` 扫描、`w11-n6` 项目声明、`w11-n7` 查重；
   - N8 服务先 HOLD，等 N3、N5、N6 合入后再从主线建。
6. **写八张工单**与 `docs/dispatch/wave11/manifest.json`。任务配置从第十波克隆：

   | 新单 | 克隆自 |
   |---|---|
   | N1 | M11 |
   | N2 | M5 |
   | N3 | M10 |
   | N4 | M12 |
   | N5 | M13 |
   | N6 | M3 |
   | N7 | M8 |
   | N8 | M14 |

   冻结哈希从工作树重算；工单本身不放进 `mustRead`（检查器要求它在工作树里）；票面写默认执行者：界面 astra，后端 sol，N4～N7 同一个执行者按顺序。
   - N2 宿主的整机步骤：窗口标题改 Flick 后，观察脚本找的标题、`binName`（flick）要跟着改。
   - N2 的应用图标必须与 `docs/design/flick-brand/flick-app-icon.ico` 逐字节相同。
7. **跑派前 baseline**（一次一棵），回执归档到 `docs/acceptance/wave11/controller/preflight-…`。
8. **提交、五步推送**，给派单句。每张一个代码块；界面单单列；N4～N7 合成一句，按顺序做。
9. **派单期间，总控自己做**：给 Water 仓库写 `.water-cleanup.json`（计划第 2 节第 60、61 行，MANIFEST-M35 第一版字段）。
   - 可清：`.worktrees\*\.local` 下的构建产物、测试浏览器、回执；
   - 不能碰：`.offline-cache` 与 `docs`。

## 4. 这一段的教训

- **工单里与检查器默认不同的做法，出票前先对照检查器**（M12 受阻）。已写进[工作流](CONTROLLER-WORKFLOW.md)第 3 节第 10 条。
- **变异要能编译**：删掉一行导致类型推断失败，就不算证据（M14 c5）。
- **改完 Rust 代码先跑 `cargo fmt`**：整合的 check 会拦（`fd7cfb0e` → `63a500ae`）。
- **两张各自绿的单合在一起可能撞上**：M14 的测试按旧规则写死了 `unins000.exe`。工单里“两种规则下都成立”的写法要在审计时逐条核对。
- **工具用法**：
  - 冒烟脚本 `w4-g6-second-instance.ps1` 要绝对路径，而且 `-DataDir` 事先不能存在；
  - 在 PowerShell 里 `bash` 指向 WSL，跑 sh 脚本用 Bash 工具；
  - PowerShell 会把中文弯引号和反引号当成语法，带这类字符的改动用 Edit 工具或脚本文件。
- **时间要用 `Get-Date` 取**：这一段有几处时间是估写的，本份已订正。

## 5. 现场

- **主线**：主线、GitHub、本机中央仓库与 E 盘镜像应一致（本份提交后核对）。
- **工作树**：
  - 整合树：`.worktrees/integ-w8a`、`integ-w8b`，停在 `63a500ae`（分支 `controller/integ8-a`、`-b`）；
  - 第十波的执行者树与验收树：`w10-m12/13/14`、`accept-w10-m12/13/14`，都已合入，留着不动。
- **release**：`.local/release/water-0.1.0-63a500ae/water.exe`，sha256 `95ea0d10…a820d`。
- **用户方面**：没有后台任务在跑；没有待用户回复的问题。

## 6. 粘贴语

```text
交接里写了（F:/new/smaltalk/water/docs/CONTROLLER-HANDOFF-20261107-23.md）：读交接报告，准备接手 Water 总控，从第 3 节继续。
```
