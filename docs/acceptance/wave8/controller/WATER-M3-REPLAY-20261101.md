# 10-29 场景复现（M3 收口，2026-11-01）

总控（Claude）。按[第 12 份交接](../../../CONTROLLER-HANDOFF-20261101-12.md)第 4.3 节，在第五次整合的受测提交 `bcc0e984` 上逐条复现 [10-29 F 盘清理](../../../maintenance/F-CLEANUP-20261029.md)暴露的问题，以及 M3 原计划的孤儿进程、“几天后满”。用户 11-01 约 21:30 JST：“现在开始”。

## 做法

- 在整合树 A 临时加一个总控专用示例 [m3_replay.rs](m3-replay-20261101/tools/m3_replay.rs)（并在该树的 `Cargo.toml` 里登记），用与服务检查相同的工具链与离线缓存编译（[replay.sh](m3-replay-20261101/tools/replay.sh)）。做完后示例删除、`Cargo.toml` 还原，树 A 回到 `bcc0e984`、干净。示例**从不调用 `clean_start`**；只有夹具场景打开清理开关，用来看 `clean_prepare` 给出的计划。
- 四种模式，各用一个新数据目录（都在树 A 的 `.local/m3-replay/20261101T132214Z/` 下）：
  - `fixture`：七个分类全关，只加合成夹具（[m3-fixture.cjs](m3-replay-20261101/tools/m3-fixture.cjs)，时间改到 3 天前）为自选位置；
  - `real`：默认分类，真实只读体检，再开一次体检 3 秒后停止；
  - `orphans`：分类全关，只取进程快照，与 PowerShell 手查（[orphans-manual.ps1](m3-replay-20261101/tools/orphans-manual.ps1)，按契约独立写的同一判定）在前后几秒内对照；
  - `drive`：分类全关，把一个位置（非系统盘根或文件夹）加为自选位置，真实只读扫描。
- 输出在 [out/](m3-replay-20261101/out/)。真实数据的三份（`real`、`drive`、`mirasim`）去掉了每一项的路径再入库，原始输出留在 `.local/w8-integ5/replay/`。

## 结论

| 10-29 问题 / M3 项 | 复现结果 |
|---|---|
| 体量按路径相加会多算（硬链接） | **修好**。夹具：一项内 1 MiB 文件加两个硬链接只算一次（项 1,248,648 字节 = 标记 72 + 1 MiB + 200,000），`logical_bytes` 为累加的 3,645,872。跨两项的硬链接各算一次，组体量等于各项之和，这是契约 SCAN-M3C 第 2 节“只在每一项内部去重，不跨项、不跨组”。真实体检里 `claude-code-scratchpad`、`system-temp-old` 两组的去重体量小于累加体量 |
| 不能组内排除 | **修好**。夹具：`skip_add` 后该组可清理从 2 项 110,000 字节降到 1 项 60,000 字节，该项理由“已设为以后都跳过”；清理计划同时带一个手工排除时只剩缓存组 2 项、`excluded_count` 为 1；`skip_remove` 后回到 2 项、计划回到 4 项 1,658,720 字节 |
| 不认识工作树 | **修好**。夹具：带 `.git` 小文件的目录归入 `custom:fx:git-worktrees`，级别仅供参考、不可选，理由“这一类只统计占用，不清理” |
| 在用检测缺口 | **修好**（按项判断）。真实体检：Chrome、Edge 6 个组带“正在运行，将跳过 N 个占用的项”，逐项看 `chrome-cache` 列出 8 项、7 项标“Chrome 正在使用”。把 `F:\Mirasim-A` 加为位置时，正在运行的 codex 那一项 `isolated-cli\pkg\codex\node_modules` 被跳过（“codex 正在运行，将跳过 1 个占用的项”）。10-29 出事的正是“codex 运行时被删”，这一情形现在能拦住 |
| 只能扫 C 盘固定位置 | **可以整盘**，但暴露两个新问题（下节 F1、F2）。`D:\` 作为 `drive-d` 加入，10.4 秒扫完，6 个组的 `by_drive` 都落在 `D:\`，按盘推荐合计 D 盘 50.2 MB |
| “node_modules 不一定是项目依赖”（10-29 第 1 个问题） | **只修好一半**，见 F2 |
| 孤儿进程 | **与手查一致**。只用真实进程时两边都是 0；再造一个父进程已退出、命令行带 `--headless` 的 `node`（[make-orphan.cjs](m3-replay-20261101/tools/make-orphan.cjs)，查完即结束）后，Water 列出 3 条链，手查前后两次都是同样 3 个根：造的 `node`（1 个进程，40.8 MB），以及本机别的会话正在跑的两组 `bash … vitest`（外壳已退出，6 个进程 378 MB、1 个进程 9.9 MB）。后者是活着的工作，正说明“只列不结束”是对的；总控没有碰 |
| 几天后满 | 新数据目录只有 1 次体检，4 个盘都显示“至少需要 3 天内 3 次体检才能估算”。用户默认数据目录也只有 10-28 的 1 次，无法用真实多点记录手算；算式由 K4 单元测试覆盖 |
| 中途停止的体检（交接第 4.4 节遗留） | 服务行为正确：停下的那次 `status` 为 `cancelled`；`app_state.last_scan` 仍是前一次完成的；`group_detail` 照常可读。界面按“部分完成”载入（`app.mjs` 第 330 行）。低级显示问题见“遗留” |
| 体检提醒 | `checkup_due` 为 `null`（距上次不足 7 天），符合契约 |

**M3 还不能收口**：F1、F2 是“整盘”放开以后才暴露的，属于总控第八波规划的缺口（RULES-M3C 第 1 节只给 `node-modules` 换了在用方式，第 22 行写明 `test-browser-profiles` 不变，第 4 节放开盘根时没有收紧这两条通用规则）。

## 新问题

### F1（高）：“测试用浏览器配置”认错真实应用的浏览器数据

规则 `test-browser-profiles`（需确认，可勾选）只看目录里同时有 `Local State` 与 `Default`。所有 Chromium、WebView2、CEF 内嵌浏览器的数据目录都有这两样。本机实测命中：

| 位置 | 是什么 | 体量 |
|---|---|---|
| `D:` 上一个企业通讯软件的数据目录（目录本身就是内嵌浏览器的数据根） | 聊天软件数据，含登录状态 | 998 MB |
| `D:` 上一个即时通讯软件 `tdata\…\EBWebView` | 该软件内置网页的 WebView2 数据 | 34 MB |
| `D:` 上一个桌面工具备份目录里的 `EBWebView` | 该工具的 WebView2 数据 | 62 MB |
| `F:\Mirasim-A\home\computer-use\chrome` | Mirasim 电脑操控用的 Chrome 配置，可能有用户登录过的账号 | 206 MB |

这些都含 Cookie 与登录数据，是受保护的那一类；规则文案却说“常见于自动化测试”。

### F2（高）：“node_modules”认错工具安装与程序自带的依赖

规则 `node-modules`（需确认，可勾选，一周没动）在自选位置里只看目录名。本机实测命中：

| 位置 | 是什么 | Water 的判断 |
|---|---|---|
| `F:\Mirasim-A\isolated-cli\pkg\{claude,pi}\node_modules` | 命令行工具的安装（10-29 第 1 个问题就是删了它们） | 可勾选（codex 那份因正在运行被跳过） |
| `F:\Mirasim-A\home\npm\node_modules`（519 MB） | npm 全局安装的工具 | 可勾选 |
| `F:\Mirasim-A\home\app\0.0.6xx\node_modules` | Mirasim 程序自带 | 因最近改过暂不可选，一周后变为可勾选 |
| `D:` 上两个桌面软件的 `…\app.asar.unpacked\node_modules` | Electron 程序自带的依赖 | 可勾选 |

在用检测只看“有进程从这个目录里运行”，而这些程序的可执行文件多在 `node_modules` 的上级，没在运行时更拦不住。

### 修法方向（待用户拍板后出单）

Water 只读文件名、大小与时间，不读内容，所以只能用目录结构区分：

- `node-modules`：上级目录有 `package.json`，并且除 `package.json`、锁文件、`node_modules` 之外还有别的条目（像个项目）才算项目依赖；祖先里有 `*.asar.unpacked` 的永远不算。实测 npm 全局目录、Electron 解包目录、Mirasim 程序版本目录都没有 `package.json`；`isolated-cli\pkg\claude` 只有 `package.json`、`package-lock.json`、`node_modules` 三样。不符合的改为“仅供参考”只列不清。
- `test-browser-profiles`：Water 分不出测试配置与真实应用配置，而后者含受保护的登录数据，建议在自选位置里改为“仅供参考”只列不清；或者只在路径里带已知测试工具标记（如 `ms-playwright`、`puppeteer`）时才可勾选。
- 涉及规则数据与契约（`packages/junk-rules`）与扫描引擎的标记判定（`packages/junk-scan`），界面与服务不用改。

## 遗留

1. **历史列表看不出中途停止**（低）：停下的那次在“清理记录”的历史里显示为“识别 1 类位置”、0 字节，没有“已停止”字样（`service.rs` 的 `history` 只按组数拼文案）。
2. 第五次整合记的界面浏览器测试点击时机（见[整合报告](WATER-W8-INTEGRATION5-20261101.md)“遗留”）。

## 没有覆盖的

- 真实工作树目录（如 `.worktrees`）整体作为位置的扫描：体量很大，用夹具代替；
- “几天后满”在真实多点记录上的手算（没有足够的记录）；
- 任何真实删除。真实数据上的应用内清理留给用户自清理，由用户本人按清理。
