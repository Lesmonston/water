# Water 总控交接报告（2026-11-01 第 12 份）

项目根 `F:/new/smaltalk/water`，总控 Claude。因用户要压缩上下文而写；本报告取代[第 11 份](CONTROLLER-HANDOFF-20261101-11.md)作为当前入口。

以下仍然有效：
- 第 10 份第 1 节（远端、五步推送、提交身份）、第 4.4 节（M3 收口步骤）、第 5、6 节；
- 第 11 份第 4.1 节（收单通用流程）、第 5、6 节；
- 第 9 份第 4.1 节、第 8 份第 1 节、第 5 份第 7 节硬规矩。

本份只写变化与补充。所有回复用中文。

## 0. 一句话现状

- **第八波六张单全部验收合入**（11-01 晚）：

  | 单 | 合入 |
  |---|---|
  | K1 进程 | `3b79242e`（补单 01） |
  | K2 规则 | `2d2f54d7`（补单 01） |
  | K3 扫描 | `e8976a52` |
  | K4 服务 | `0bb1cf80`（补单 01）、`2a946b30`（补单 02） |
  | K5 宿主 | `311f3a9b`（补单 01） |
  | K6 界面 | `1b79d861`（补单 01～05，最后合入） |

  宿主、服务、界面在主线上接通。记录提交 `bcc0e984`。
- **M3 收口已开始**（用户 11-01 约 21:30 JST：“现在开始”）。第五次整合检查正在跑（第 4.1 节）；之后是 release、复现 10-29 场景、用户自清理、M3 收口报告。
- **主线**在写本报告前是 `bcc0e984`，GitHub、中央仓库、E 盘镜像三处一致。
- **待确认**：K6 补单 05 用户没说派给了谁（清单里 `model: null`）。下次顺口问一句再补记。
- **验收报告**：[WATER-W8-REVIEW-20261101.md](acceptance/wave8/controller/WATER-W8-REVIEW-20261101.md)，共六轮，末尾有“第八波结论”。

## 1. 工作树

| 工作树 | HEAD | 用途 |
|---|---|---|
| `.worktrees/integ-w8a`（分支 `controller/integ-w8a`） | `bcc0e984` | 第五次整合 A 树：D、进程、规则、扫描、服务、界面 |
| `.worktrees/integ-w8b`（分支 `controller/integ-w8b`） | `bcc0e984` | 第五次整合 B 树：宿主（含整机开窗）与 release 构建 |
| `.worktrees/w8-k1`～`w8-k6` | 各自交回 HEAD | 已合入，可删（删前问用户） |
| `.worktrees/accept-w8-k1`～`k6` | 各自验收 HEAD | 已归档，可删（删前问用户）。`accept-w8-k4`、`k6` 的 `.local/prev-archive-r3/` 是挪出来的旧归档，随树一起删 |

旧树仍按第 10 份第 1 节：`.local/w2-accept/d-tree/...`、7 棵检查器自检树，留给用户决定。

标签：`water-w8-m3c-base-20261031`、`water-w8-k4-base-20261101`。

## 2. 本份覆盖的提交（`e4d8378d` 之后，主线）

| 提交 | 内容 |
|---|---|
| `246986a2` | K4 补单 01 派给 sol 的登记 |
| `0bb1cf80`、`b3099b10` | K4 合入；第三轮记录，出 K4 补单 02、K6 补单 03 |
| `56cca2ca` | 两张补单派给 sol |
| `2a946b30`、`03645e62` | K4 补单 02 再合入；第四轮记录，出 K6 补单 04 |
| `d32580b1` | K6 补单 04 派给 sol |
| `553bfe45` | 第五轮记录，出 K6 补单 05 |
| `1b79d861`、`bcc0e984` | K6 最后合入；第六轮记录，第八波完成 |
| 本报告的提交 | 第 12 份交接 |

## 3. 这一段做完的事（要点）

细节在验收报告第三～六轮、清单各单的 `controllerReview`（`round3`～`round6`）与 `carryOverLater`。

- **K4**：
  - 补单 01（跳过只写设置，视图 = 扫描结果 + 当前跳过名单）验收合入；
  - 审查的三条中级出补单 02 修，也验收再合入：旧体检跟随跳过、排除检查用索引、盘根测试。
  - 两次合入后都在主线上跑了宿主 `clippy --all-targets -D warnings`，0 警告。
- **K6**：共五张补单，第三～五张的高级与中级都追到总控自己的规格缺口：
  - **补单 03（高）**：K4 补单 01 把 `skip_remove` 改成立即恢复，没同步界面单，恢复后不重读结果。改为跳过、恢复、切换分类开关后都按同一 `scan_id` 重读。
  - **补单 04（中）**：排空的组会因恢复自己回到清理范围。改为排空就移出选择。另外改正总控补单 03 的错误要求：分类合计跳过后不变。
  - **补单 05（中）**：手工取消的项，跳过再恢复后会回来（总控补单 02 第 3.3 条没区分手工排除与保险排除）。改为单独记 `manualExclusions`。
  - 第六轮：审查没有高级与中级，总控变异 20 条抓到 19 条（剩 1 条等价），合入。
- **证据**：
  - K4 的总控证据进了 `accept-20261101/k4/`；
  - K6 第一～六轮的总控证据进了 `accept-20261101/k6/`：249 MB、5,566 个文件，去重后约 95 MB；
  - 总控日志与审计在 `accept-20261101/controller/`；
  - 变异表与生成脚本在 `accept-kit/`（`mutations.json` 含 `k4r3`、`k6r3`～`k6r5` 各轮）；
  - 记账脚本在 `freeze-20261031/record-w8-round3～6.cjs`。

## 4. M3 收口：进行中与接下来

### 4.1 第五次整合检查（进行中）

工具在 `.local/w8-integ5/`（不进仓库）。做法照第四次（[WATER-W6-INTEGRATION4](acceptance/wave6/controller/WATER-W6-INTEGRATION4-20261028.md)）：
- `make-manifests.mjs <受测提交>`：覆盖清单；
- `run.sh <part> <mode>[:final] ...`：运行，结果追加到 `logs/integ.txt`。

| 部分 | 任务配置来源 | 树 | 计划跑 |
|---|---|---|---|
| d（`packages/junk-clean`） | W5-H1 | A | lock、check、test |
| process | W8-K1 | A | lock、check、test、real:final |
| rules | W8-K2 | A | lock、check、test、real:final |
| scan | W8-K3 | A | lock、check、test、real:final |
| svc | W8-K4 | A | lock、check、test、real:final |
| ui | W8-K6 | A | check、test、browser |
| host | W8-K5 | B | lock、check、test、native:final（1 窗、9 步夹具清理闭环） |

**写本报告时（21:34 JST）**，两条后台命令在跑：
- A 树依次跑 d → process → rules → scan，d 的 lock、check 已过；
- B 树跑 host 的 lock、check、test，lock 已过。

先看 `logs/integ.txt`，确认这两条跑完、各行 `rc=0`；没跑完的部分照上表补跑。

**还没开始的**：
1. **svc**：`bash .local/w8-integ5/run.sh svc lock check test real:final`。**单独跑**：服务测试里有 50 ms 计时断言，机器忙时会偶发失败。失败先看是不是 `SERVICE_RETURN_BUDGET` 或万项 `scale` 计时，是就原样重跑。
2. **ui**：`run.sh ui check test browser`。
3. **host native:final**：**开窗前先告诉用户**（1 个窗口、约 30 秒、只删整合树 `.local` 下的合成夹具），结束后确认窗口和 WebView 子进程都退出。
4. **归档**：各部分 `run.sh <part> archive`。A 树是共用的，每归档一部分就把 `docs/acceptance/wave8/controller/integ5-20261101/<part>/` 移出树（复制到主线同路径），再归档下一部分；否则下一次归档会把它当越界文件。**归档必须在全部 final 之后**：未跟踪的归档会让 final 报“需要干净的已提交树”。
5. **报告**：写 `docs/acceptance/wave8/controller/WATER-W8-INTEGRATION5-20261101.md`，格式照第四次。真实体检的数字与第三、四轮 K4 比（识别约 68 GB；推荐 13.4～17 GB，随 cargo 构建产物变化）。

### 4.2 release

照 `.local/w6-integ4/build-release.sh`，把树改成 `integ-w8b`、日志改到 `.local/w8-integ5/logs/release-build.txt`：
- 在 B 树编译 `--release --locked`，4 个并行任务；
- 输出到 `.local/release/water-0.1.0-bcc0e984/water.exe`，记 sha256；
- 冒烟：夹具数据目录、第二实例、正常关窗。开窗前告诉用户。

旧版 `water-0.1.0-b62f9c5c`、`77f33746` 留着不动。

### 4.3 复现 10-29 场景（还没开始，方法已想好）

第 10 份第 4.4 节第 3 条，逐条要有证据。`service_smoke` 示例只输出汇总，不够，打算这样做：
- 在 A 树归档完以后，往 `packages/water-service/examples/` 加一个**总控专用**示例（例如 `m3_replay.rs`）。只在整合树里用，**不提交、不进主线**，用完删掉或连树一起丢弃。
- 数据目录预先写 `settings.json`：七个分类全关，只加一个整合树 `.local` 下的合成夹具当 custom root。`clean_enabled` 可以为 true 以便调 `clean_prepare` 看计划，但**绝不调 `clean_start`**。
- 夹具：
  - **硬链接**：同一项里一个文件加几个硬链接，组体量只算一次。写法照 `accept-kit/k3-hardlink-fixture.cjs`。
  - **工作树**：一个目录里放 1～4096 字节的 `.git` 文件，内容如 `gitdir: ...`。应出现 `custom:<root_id>:git-worktrees` 组，级别 advisory，显示“仅供参考”。
  - **排除与以后都跳过**：在夹具组里 `skip_add` 一项，看视图扣除；`clean_prepare` 带排除时计划不含它；`skip_remove` 后恢复。
- 真实数据（只读）：
  - **在用被跳过**：`group_detail` 里 Chrome/Edge 的在用项与标签。
  - **整盘按盘分组**：可选加一个非系统、NTFS 盘根当 custom root，看 `by_drive`。整盘扫描可能要几分钟，只读元数据。
  - **孤儿进程**：`trends` 的 `orphans` 与 PowerShell 手查（父进程不在、名字匹配默认清单）对照。
  - **几天后满**：用这个数据目录的记录手算 `bytes_per_day` 对照。点数不够时，核对“不足 3 天 3 次”的说明。
- 结果写进 M3 收口报告。

### 4.4 自清理与 M3 收口报告

- **自清理**：用户本人在新 release 里清这一波新攒的开发垃圾（验收树、构建产物等），**用户本人按清理**。总控核对前后可用空间、清理记录、各工作树 `git status`、证据目录与 `.offline-cache` 都在。
  - 注意：第八波的工作树与验收树要不要删，是用户决定；别让 Water 清掉还要用的树。
- **M3 收口报告**：写完同时补记 M2 达成。
- **整合检查要额外核对的遗留**：
  - 中途停止的扫描：界面载入它的结果、不标过期，服务的操作作用在上一次完成的扫描上；
  - 写盘类调用在本机忙时会偶发超出 50 ms 预算；
  - marker 规则在真实数据上的一次遍历（K3 遗留 6）；
  - 非系统盘根的整盘扫描。

## 5. 本段新确认的事实与规矩

- **改一张单的语义时，先查所有用到它的单**。K4 补单 01 改了 `skip_remove` 没同步 K6，引出 K6 第三轮的高级问题。
- **界面选择规则要单独记用户的意图**：排空的组、手工取消的项，不能从计数推回来。
- **K4 类带 50 ms 计时断言的负控不要与浏览器测试并行**。单独跑时也可能因本机别的负载（node、qemu、Defender）偶发超时；看失败断言是不是计时类，是就从断点续跑（`controls.mjs <slot> <label>`）。
- **变异的期望标记宁宽勿窄**：一处改动常先撞上另一个标记的断言，`controls.mjs` 只认指定标记。等待状态稳定一类的断言失败时日志带超时字样，脚本也不认，要看日志人工判断。
- **验收树里上一轮 `archive` 生成的未跟踪目录会让 final 拒跑**。只把未跟踪部分挪进树内的 `.local/`：K4 分支的起点里本来就跟踪着第一批的验收目录，整目录挪会挪走已跟踪文件。
- **在 Bash 里跑宿主的 cargo** 要用工具链的绝对路径（`/c/Users/37310/.rustup/toolchains/1.95.0-x86_64-pc-windows-msvc/bin/cargo.exe`），加上 `contracts/desktop-bootstrap-mirror-v1/MIRROR.json` 里的 `--config` 镜像参数，再用 `--offline`，否则离线解析会失败。

## 6. 这一段新踩的坑

- `cd` 进别的树后，环境会把主目录切过去。每条命令都以 `cd /f/new/smaltalk/water;` 开头，用相对路径访问各树。
- 审计输出很长，重定向到 scratchpad 文件再用 node 摘要。
- 清单里的状态值沿用已有的：例如 `SUBMITTED_CHANGES_REQUESTED`（第四波用过）。

## 7. 待办

1. **完成第五次整合检查**（第 4.1 节），写整合报告。
2. **release**（第 4.2 节）。
3. **复现 10-29 场景**（第 4.3 节）。
4. **用户自清理**，补 M2；**写 M3 收口报告**（第 4.4 节）。
5. **补记 K6 补单 05 的执行者**（问用户）。
6. **等用户决定**：
   - Mirasim B、D、E 三槽删不删（删 B 前先挪走 `ensure-port.vbs`）；
   - 7 棵检查器自检树留不留；
   - 第八波的执行树、验收树、整合树删不删；
   - “清、压、炼”何时排期。

## 8. 接手粘贴语

```text
交接里写了（F:/new/smaltalk/water/docs/CONTROLLER-HANDOFF-20261101-12.md）：读交接报告，准备接手 Water 总控。
```
