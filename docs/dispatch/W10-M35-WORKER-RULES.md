# 第十波（M3.5）执行者规则

2026-11-05，总控（Claude）。适用第一批八张同时进行的单与第二批的服务单：

| 单 | 做什么 | 只改 | 检查入口 | 门 |
|---|---|---|---|---|
| WATER-W10-M1 | 规则 | `packages/junk-rules/` | `checkup-wave-check.mjs` | 轻门 |
| WATER-W10-M2 | 扫描 | `packages/junk-scan/` | `checkup-wave-check.mjs` | 中门 |
| WATER-W10-M3 | 项目声明（新包） | `packages/cleanup-manifest/` | `checkup-wave-check.mjs` | 中门 |
| WATER-W10-M4 | 执行器：隔离区 | `packages/junk-clean/` | `checkup-wave-check.mjs` | 重门 |
| WATER-W10-M5 | 宿主 | `apps/water/host/` | `desktop-wave-check.mjs` | 中门（含整机） |
| WATER-W10-M6 | 界面（界面单） | `apps/water/ui/` | `checkup-wave-check.mjs` | 中门（含浏览器与截图） |
| WATER-W10-M8 | 查重（新包） | `packages/dup-finder/` | `checkup-wave-check.mjs` | 中门 |
| WATER-W10-M9 | 已安装程序（新包） | `packages/installed-apps/` | `checkup-wave-check.mjs` | 轻门 |
| WATER-W10-M7（第二批） | 服务 | `packages/water-service/` | `desktop-wave-check.mjs` | 重门 |

检查入口都在 `F:/new/smaltalk/water/scripts/`。各单改各的目录，编译时互不依赖（M7 除外，它等第一批合入后才派）。来由与已拍板的决定见[第十波计划](wave10/PLAN.md)与 [ADR-019](../decisions/ADR-019-project-declarations-and-quarantine.md)。

## 1. 开工

1. 只认工单里的绝对路径。先读：
   - 本规则与工单；
   - [ADR-018](../decisions/ADR-018-device-junk-checkup-and-in-app-cleanup.md) 与 [ADR-019](../decisions/ADR-019-project-declarations-and-quarantine.md)；
   - [第十波计划](wave10/PLAN.md)第 2 节里工单点到的行；
   - 工单指定的 SPEC（`contracts/m35-v1/*.md`）及其补充的原契约。
2. 在工单指定的工作树根目录运行工单给出的 baseline 命令（不要 cd 到别处）。baseline 只证明环境与输入就绪；失败就停下写受阻回执。
3. 离线依赖由检查器从 `F:/new/smaltalk/water/.offline-cache/` 复制进本树 `.local`，不要自己复制或下载。

## 2. 写代码

- **只改工单白名单里的文件**。别的单正在改的目录一律只读。契约、检查脚本、台账也不能改。契约冲突或缺东西时写受阻回执，不要自行变通。
- **公开接口**只按 SPEC 增加，不改动、不删除原有的；SPEC 点名的结构加字段除外。
- **不给 SPEC 没写的枚举加成员**：服务对 `MatchSpec`、`InUseMode`、`ItemStatus`、`SkipReason` 做了完整匹配，加成员会让主线的服务编译不过。
- Rust 依赖：
  - 已有的包：依赖不变，不改 `Cargo.toml` 的依赖与 `Cargo.lock`（唯一例外：第二批的 M7 照 SERVICE-M35 第 1 节加三个 path 依赖）；
  - **新包**（M3、M8、M9）：自己写 `Cargo.toml`（照 SPEC 第 1 节：独立 workspace、edition 2024、rust-version 1.95、`publish = false`、`autobins`/`autotests`/`autoexamples`/`autobenches = false`、依赖只有 `serde = "=1.0.229"`（`derive`）与 `serde_json = "=1.0.151"`、没有 dev/build 依赖、没有 build 脚本），再跑 `--mode lock` 由检查器离线生成锁文件；`README.md` 写清包的边界。
- **系统函数**只用工单列出的（检查器按 `extern "system"` 块里的名字核对），只放在 `src/native_windows.rs`；`lib.rs` 带 `#![deny(unsafe_code)]`，原生模块带 `#![deny(unsafe_op_in_unsafe_fn)]`；没有原生模块的包 `#![forbid(unsafe_code)]`。
- 生产代码不得启动进程、联网、枚举或读未列出的环境变量。唯一例外：M5 的 `src/opener.rs` 可以启动 `explorer.exe`（HOST-M35 第 3 节）。
- 测试只放在工单指定的测试文件，测试名与工单完全一致，不许 `#[ignore]`、过滤或拆分凑数。测试可以起 `cmd /c mklink`、`fsutil`、`powershell -NoProfile` 等本机命令造夹具或作对照，SPEC 写了的才用。
- **旧断言**：只有 SPEC 写明“获准修改”的才能改，并在回执里逐条写出原值与新值；其余原有断言与标记不变。SPEC 没想到、但因本单改动而必然要改的旧断言：**先写受阻回执**，不要自行改。

## 3. 夹具与真实数据

- 合成夹具只能建在本树 `.local/` 下：每次用随机名新建一个目录；测试结束**只删除本次新建的那一个目录**（校验父目录与名字前缀）；不得递归删除任何别的东西。唯一例外：CLEAN-M35 第 8 节的跨盘一项可以在 `%TEMP%\water-w10-q-<进程号>` 建、用完删这一个目录。
- 联接、硬链接、保留名、结尾点或空格的名字、稀疏文件、只读属性、`Offline` 属性：只在 SPEC 写明的测试里造，造法照 SPEC。
- 测试的隔离根一律是本树 `.local/` 下名为 `.water-quarantine` 的目录，**不得**在任何盘根建 `.water-quarantine`。
- **真实数据**一律只读，输出只有计数或组级汇总，不含路径与名字：
  - M1：已知目录是否存在；
  - M2：一次只读真实扫描（含 `scan_full` 与用户目录的空间分布）；
  - M3：本仓库 `.worktrees\` 的 `.git` 小文件三种状态的个数；仓库根有声明文件时只读一次；
  - M4：各固定盘 `<盘>:\.water-quarantine` 的状态与编号目录个数，**不移入、不复原、不删除**；
  - M8：只对本仓库 `docs/` 查一次重；
  - M9：本机三处卸载登记各几条；
  - M5：整机检查只清理本树夹具，**不点“打开文件夹”**；
  - M7：一次只读真实体检，清理关闭。
- 读文件内容的只有 M3（只读 `.water-cleanup.json` 与 `.git` 小文件）与 M8（只在测试夹具与 `docs/` 上）。

## 4. 检查与负控

| 模式 | 作用 |
|---|---|
| `lock` | 已有包只核对依赖；新包离线生成锁文件 |
| `check` | 依赖与源码政策、`cargo fmt --check`、`cargo clippy -D warnings`（界面单为语法与源码政策） |
| `test` | 跑工单指定的测试，名字与数量必须完全一致 |
| `browser` | 界面单的浏览器测试与截图 |
| `real` | 只读真实冒烟 |
| `native` | 宿主单的整机检查 |
| `red-ncN` | 有效负控 |
| `archive` | 把 `.local/checks/<单号>/` 的回执与日志按原字节复制进证据目录并写索引 |

负控做法：
1. **只改生产代码里真正被调用的那一处**，不改测试、不加开关。检查器只认各自包生产代码的改动。
2. 运行 `--mode red-ncN`，它必须以目标标记失败。
3. **立即**用 `git checkout -- <文件>` 恢复原字节，跑一次 `--mode test`（界面单浏览器负控跑 `--mode browser`）变绿，再做下一条。

检查器会核对源码哈希。用编译错误、超时或改测试造出来的红不算数；别的测试先超时、或先撞上旧标记失败的也不算数，要换更窄的改动位置。

**机器上同时有八张单在编译与测试**，磁盘与 CPU 都会很忙：测试偶发超时可以原样重跑一次；连续两次失败就停下写受阻回执，不要自己调大超时。

## 5. 收尾

1. 实现与测试全部提交，得到干净的实现提交。
2. 在这个干净提交上依次跑工单列出的 final。final 会核对负控记录；产品字节不变时不要重复跑。
3. 跑 `--mode archive`，写回执（路径见工单），把回执与证据目录逐个文件 `git add` 后单独提交。后续提交只能含回执与证据（包括归档器生成的 `.gitattributes`）；证据里的 `.log`、`.png` 若被忽略，用 `git add -f`。
4. 回执第一行与给用户的通知完全一样：`<单号> 任务已完成，任务报告在 <绝对路径>`；受阻则写“任务受阻”。
5. 回执必须写清：实际模型；实现提交 SHA；逐条对照 SPEC；每个检查命令与结果；负控（改了哪一处、失败信息、恢复后的哈希）；改过的旧断言（原值、新值）；真实冒烟的结果；界面单逐张截图与设计稿的差异；没做或没验证的事。

**提交身份**：本机没有配置 git 身份，也不许改配置。只在提交命令的进程里设 `GIT_AUTHOR_NAME`、`GIT_AUTHOR_EMAIL`、`GIT_COMMITTER_NAME`、`GIT_COMMITTER_EMAIL`，用**执行者自己的名字**（如模型名）与 `<名字>@localhost` 这类地址。**不要借用仓库里已有的人类作者身份。**

**远端与历史**：
- 不 push 到任何远端，不添加或修改 git 远端与配置；
- 不改写已有提交（不 amend、reset、squash、rebase 或任何强制操作），只在首次 HEAD 之后新增提交；
- 提交信息写错就在回执里说明，不要改写。

禁止：merge、`git add -A`、`git clean`、`git stash`、改主线台账、提交别人的文件。交回后停止一切测试与后台进程。
