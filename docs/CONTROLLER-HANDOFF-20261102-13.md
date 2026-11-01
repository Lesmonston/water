# Water 总控交接报告（2026-11-02 第 13 份）

项目根 `F:/new/smaltalk/water`，总控 Claude。因用户要压缩上下文而写；本报告取代[第 12 份](CONTROLLER-HANDOFF-20261101-12.md)作为当前入口。

以下仍然有效：
- 第 12 份第 5、6 节；
- 第 10 份第 1 节（远端、五步推送、提交身份）、第 5、6 节；
- 第 11 份第 4.1 节（收单通用流程）；
- 第 9 份第 4.1 节、第 8 份第 1 节、第 5 份第 7 节硬规矩。

本份只写变化与补充。所有回复用中文。**汇报里的 GB 一律按 1024 换算**（与资源管理器、Water 一致，用户 11-02 起）。

## 0. 一句话现状

- **第五次整合检查通过**，release `water-0.1.0-bcc0e984` 编好（`9555003f`），见[整合报告](acceptance/wave8/controller/WATER-W8-INTEGRATION5-20261101.md)。
- **10-29 场景复现**：五条修好，但整盘放开后暴露两个高级问题 F1、F2（`e4cad761`，[复现报告](acceptance/wave8/controller/WATER-M3-REPLAY-20261101.md)）。**M3 不能收口**，等用户拍板修法（第 3 节）。
- **四个盘按盘清理**（用户 11-01 晚要求），C、D、E 完成，F 进行中（第 2 节），记录在 [CLEANUP-20261101.md](maintenance/CLEANUP-20261101.md)。
- **M2 自清理达成（11-02 01:13 JST）**：用户本人在 Water 里清掉 Water 工作树 `.local` 里的构建产物与测试浏览器（63 项、14.6 GB），总控事先核对计划、事后核对清理记录与可用空间。
- K6 补单 05 已登记为 sol（`695af088`）。
- **主线**写本报告前是 `c5b36dfd`，三处一致；本报告的提交见第 6 节。

## 1. 这一段的提交（`3438b237` 之后）

| 提交 | 内容 |
|---|---|
| `9555003f` | 第五次整合检查与 release；冒烟脚本改为 `PrintWindow` |
| `e4cad761` | 10-29 场景复现 |
| `695af088` | K6 补单 05 派给 sol 的登记 |
| `8ca2423a` | C 盘清理记录、[quarantine-listed.ps1](../scripts/maintenance/quarantine-listed.ps1) |
| `42697680` | 会话记录（H 表）一轮、[denglou 会话组成报告](maintenance/DENGLOU-SESSION-COMPOSITION-20261102.md) |
| `b9651a53` | D 盘 |
| `0290bfee` | E 盘 |
| `c5b36dfd` | F 盘进度、[denglou 磁盘占用报告](maintenance/DENGLOU-DISK-USAGE-20261102.md)、用户对“扫描位置”的意见 |
| 本报告的提交 | 第 13 份交接、M2 达成、结果页意见 |

## 2. 四个盘的清理

**做法（用户定的）**：逐盘深度普查 → 编号 A～E 分级表 → 用户按编号选 → 执行 → 记录（含用户原话）→ 再报下一盘。删除的执行权在用户：
- **Water 认得的**：用户本人在 Water 里按清理。总控在用户点“清理所选”、停在确认框时，读 `%LOCALAPPDATA%\Water\plans\` 里最新的计划逐组核对，用户再按永久删除；清完读 `cleans\` 核对结果。
- **其余**：总控用 `quarantine-listed.ps1` 移到同盘的 `<盘>:\_water-quarantine-20261102`（先预览，逐项查在用进程、联接、跨盘），用户核对后自己删。

| 盘 | 结果 | 隔离目录（等用户删） |
|---|---|---|
| C | 可用 31.6 → 71.0 GB；隔离 28.4 GB 已由用户删除；Water 清 12.0 GB（浏览器开着，6 组 0 字节）；第 26 项 a1：`.codex2\config.toml` 去掉 `claude-plugins-official` 市场与 Expo 插件（备份 `config.toml.bak-20261102`） | `C:\_water-quarantine-20261101` 已删（含一个结尾带空格的文件夹，用户用 `\\?\` 命令删掉） |
| C（会话 H 表） | H4、H5、H6、H8 隔离 7.78 GB；H2 写了报告，`denglou` 总控已回分析 | `C:\_water-quarantine-20261102`（7.78 GB） |
| D | D1～D8、D10，实际约 7.3 GB；D6 Steam 日志在用跳过；D9 旧 `claude-config` 保留 | `D:\_water-quarantine-20261102` |
| E | E1～E5，31.7 GB；E1 收窄为工程没引用的转换副本与 `.pkf`；E4 每组移一份 | `E:\_water-quarantine-20261102` |
| F | 见下 | `F:\_water-quarantine-20261102`（F4～F10 已在里面） |

**F 盘进度**（用户选“F1到F10”，并要 `denglou` 报告）：
- **F1 完成**：用户在 Water 加位置 `F:\new\smaltalk\water\.worktrees`，清 4 组 63 项 14.6 GB，F 可用 135.9 → 150.6 GB。注意：总控核对的是第一份计划（3 组 30 项），用户随后补勾“测试用浏览器配置”重出计划直接删了，总控事后核对第二份（`plan-20261101T161240Z-3922`、`clean-20261101T161241Z-a709`）：63 项全在各树 `.local` 里，删除 63、跳过 0、失败 0。
- **F4～F10 完成**：217 个路径隔离，去重后约 29.7 GB。
- **F2、F3 进行中（下一步）**：
  - F2：第八波 12 棵树 `w8-k1～k6`、`accept-w8-k1～k6`。已查：分支与 origin 一致；执行树 0 改动；验收树各有 1 个未跟踪的 `docs/acceptance/wave8/controller/accept-20261101/`（最后一轮归档，应已复制进主线）。**已逐文件与主线比对**：6 棵共 7,043 个未跟踪文件（k1 122、k2 183、k3 381、k4 878、k5 220、k6 5,259），主线都有、内容相同，可以移。
  - F3：7 棵自检树 `w2-selftest`、`w3-selftest-f1～f3`、`w4-selftest-g1～g3`，各有 1～2 个未跟踪的自检证据目录，分支与 origin 一致；用户已选清理。
  - 做法：把树目录作为路径交给隔离脚本移到 `F:\_water-quarantine-20261102`，再 `git worktree prune` 去掉登记；分支保留（都在 origin）。整合树 `integ-w8a`、`integ-w8b` 保留到 M3 收口。
- **F11**：`denglou` 磁盘报告已写（用户是否已转交未确认）。
- **F16 待用户决定**：Mirasim A、C 的 `start.vbs` 第一步调用 `F:\Mirasim-B\ensure-port.vbs`，B 槽已删、回收站已清、脚本内容找不回。建议备份后删掉这一行（要用户点头）。
- F12～F15 只建议，未动（模拟器、Gradle、NBA 2K23 136 GB 与帝国时代 2、达芬奇支持文件、`short1` 渲染）。

**F 盘做完后**：给用户一份四盘总结（各盘前后可用空间、各隔离目录待删、开发启发要点），更新记录，提交推送。

## 3. 等用户决定 / 还没做的

1. **M3 新问题 F1、F2 的修法**（复现报告“修法方向”），总控问过“按复现报告里的修法出单吗？”，用户还没答，转去清理了。
2. **清理中积累的产品问题**，排进下一波（与 F1、F2 一起规划）：
   - 用户原话：“扫描位置”不能指定某个盘、入口应放首页、那一页大部分是扫描项而非位置；
   - 用户原话：结果页太长、选项太多，“还不如让aget去扫描了，没有减少人的工作量”——默认只给结论、只把要人判断的几项拿出来、细节收起、新加位置单独清理；
   - 增长提示：负增长被标“疑似泄漏”；几小时的增量外推成“每天约 +9.3 GB”；
   - 规则缺口：Codex 插件市场残留被“代码仓库”保护拦下、Chromium 分区缓存、软件更新包与旧版本与安装包、创作软件缓存（要读工程引用）、“工具给每个账号做的用户主目录”、随机名临时目录泄漏、已脱离 git 的工作树；
   - 体量口径：稀疏文件（夸克 34 GB 账面、0.1 GB 实际）要按分配大小；清理记录摘要“清理 26 组”实为 20 组、失败项没写；确认前应按在用情况给预计可释放量；
   - 来自 `denglou` 总控：对已结束的 agent 会话“瘦身”（剥离图片与重复副本），一个会话约可回收 1.8 GB。
   全部在 [CLEANUP-20261101.md](maintenance/CLEANUP-20261101.md) 末尾“对 Water 开发的启发”（共 24 条）。
3. 各盘隔离目录由用户核对后删除（C、D、E、F 各一个 `_water-quarantine-20261102`）。
4. F16 Mirasim 启动脚本。
5. M3 收口报告：等 F1、F2 修好、复验后写。
6. 仍待用户决定的旧事：“清、压、炼”何时排期。Mirasim B、D、E 已不在（了结）；7 棵自检树随 F3 清理（了结）。

## 4. 这一段新确认的事实与规矩

- **汇报口径按 1024**，表里写 GB。总控之前用十进制，与 Water、资源管理器差约 7%，用户以为数字不对。
- **“最近 7 天改动过的文件体量”不是“7 天新增”**：一直追加写入的大文件整份计入。说增长要按两次测量的差。
- **核对 Water 计划的办法**：用户点“清理所选”后计划已落盘（`clean.rs` 第 162 行），未删除；读它逐组比对。用户改勾选后会出新计划，要以最新的为准，必要时事后核对清理记录。
- **隔离前先读引用**：Audition 工程直接引用 `Conformed Files` 里的转换副本，按目录名当缓存会弄坏工程（E1 汇报时说错，执行前读 `.sesx` 才发现）。
- **工具安装不是依赖**：`isolated-cli\pkg\*\node_modules`、`npm\node_modules`、`app.asar.unpacked\node_modules`、应用自带的 `opencode\node_modules` 都不清（C 盘第 13 项清单里剔除过一次）。
- **真窗口截图只用 `PrintWindow`**，入库前看一眼（第五次整合冒烟截到了用户的浏览器，已删图、改脚本）。
- 删除执行权：Water 认得的由用户在 Water 里按；其余隔离后用户删。总控不硬删。

## 5. 这一段新踩的坑

- Bash 环境会吃掉 heredoc 与 `node -e` 里的双反斜杠：带 Windows 路径的脚本一律用 Write 工具写成文件再跑；路径用 `cygpath -w` 生成。
- Windows 上 `du` 很慢，大目录的体量用深度普查结果（`.local/cleanup-20261101/deep-<盘>.json`）查，不要现场 `du`。
- `powershell -File` 传不了数组参数，中文路径参数会乱码：一个路径调一次，或把路径放进 UTF-8（带 BOM）的 JSON 计划里。
- PowerShell 的 `-match` 是正则，Windows 路径里的反斜杠会出错：用 `IndexOf(..., OrdinalIgnoreCase)`。
- 隔离脚本按文件长度累加，硬链接重复计算（Rust 构建目录显示偏大近一倍），稀疏文件也虚高；实际腾出的以深度普查的去重数为准。
- 名字结尾带空格的目录（剪映 `DeflickerCache `）资源管理器删不掉，要 `rd /s /q "\\?\<路径>"`。
- `cd` 进别的树仍会切走主目录：每条命令先 `cd /f/new/smaltalk/water`。

## 6. 本地文件

- 普查、计划、日志、选择记录：`.local/cleanup-20261101/`（`deep-C/D/E/F.json`、`water-survey.json`、`plan-*.json`、`quarantine-*.jsonl`、`choice-*.json`、`composition-*.json`、`dup-E-podcast.json`、`denglou-*.json`），不进 git，含真实路径。
- 入库的脚本：[cleanup-20261101/](acceptance/wave8/controller/cleanup-20261101/)（深度普查、计划、核对、查重、工程引用、会话组成、`denglou` 工作树等）。
- 总控示例 `m3_replay.rs`（含 `survey` 模式）只存在证据目录里；整合树 A 已还原，干净。
- release：`.local/release/water-0.1.0-bcc0e984/water.exe`，sha256 `712b1291edf8c910354fbd09ccdeccce1e10395b585053cf884e358d3e173f3d`。

## 7. 接手粘贴语

```text
交接里写了（F:/new/smaltalk/water/docs/CONTROLLER-HANDOFF-20261102-13.md）：读交接报告，准备接手 Water 总控。
```
