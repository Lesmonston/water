# Water 总控交接报告（2026-11-01 第 11 份）

项目根 `F:/new/smaltalk/water`，总控 Claude。因用户要压缩上下文而写；本报告取代[第 10 份](CONTROLLER-HANDOFF-20261031-10.md)作为当前入口。

以下仍然有效：
- 第 10 份第 1 节（远端、五步推送、提交身份）、第 4.4 节（M3 收口步骤）、第 5、6 节；
- 第 9 份第 4.1 节（收单通用流程）；
- 第 8 份第 1 节、第 5 份第 7 节硬规矩。

本份只写变化与补充。所有回复用中文。

## 0. 一句话现状

- **第八波（M3 收口）六张单：四张已合入，两张在外**。用户 11-01 中午说：“等全部完成之后一起收”。

  | 单 | 状态 | 合入或续做起点 |
  |---|---|---|
  | K1 进程 | VERIFIED，已合入 | `3b79242e`（经补单 01） |
  | K2 规则 | VERIFIED，已合入 | `2d2f54d7`（经补单 01） |
  | K3 扫描 | VERIFIED，已合入 | `e8976a52` |
  | K5 宿主 | VERIFIED，已合入 | `311f3a9b`（经补单 01） |
  | K4 服务 | 受阻成立 → **补单 01 已出** | 从 `e2fbc784` 续做，基线 `232bc298` |
  | K6 界面 | 第二轮后出**补单 02**，执行者已交提交 `1c2e91e6`（12:05），**未验收** | 从 `4746478b` 续做 |

- **派单记录**：
  - K4 原单与 K6 补单 02 都给了 sol（用户“都是sol”，11:24）；
  - **K4 补单 01 用户还没说派给谁**，收活时问一句再记清单。
- **主线** `93a83288`，GitHub、中央仓库、E 盘镜像三处一致（写本报告前）。
- **验收报告**：[WATER-W8-REVIEW-20261101.md](acceptance/wave8/controller/WATER-W8-REVIEW-20261101.md)，含第一轮、第二轮、K4 派前三部分。
- **下一步**：K4 补单 01 与 K6 补单 02 都回来后一起收（第 4 节），K4 先合、K6 最后合，然后做 M3 收口（第 10 份第 4.4 节）。

## 1. 仓库与工作树

第八波相关工作树：

| 工作树 | HEAD | 用途 |
|---|---|---|
| `.worktrees/w8-k1`、`w8-k2`、`w8-k3`、`w8-k5` | 各自交回 HEAD | 已合入，可留可删（删前问用户） |
| `.worktrees/w8-k4` | `e2fbc784` | K4 执行者续做中 |
| `.worktrees/w8-k6` | `1c2e91e6` | K6 补单 02 已交提交 |
| `.worktrees/accept-w8-k1`、`k2`、`k3`、`k5` | 各自验收 HEAD | 已归档，可删（删前问用户） |
| `.worktrees/accept-w8-k6` | `4746478b` | 第三轮收 K6 时快进到新 HEAD 再用 |

另外仍有第 10 份列的旧树：`.local/w2-accept/d-tree/...` 与 7 棵检查器自检树，留给用户决定。

标签：`water-w8-m3c-base-20261031`（第一批基线 `912eba10`）、`water-w8-k4-base-20261101`（K4 基线 `232bc298`）。

## 2. 本份覆盖的提交（`71f2021c` 之后，主线）

| 提交 | 内容 |
|---|---|
| `8563fa56` | K1、K2、K5 受阻成立，出补单 01（都是 SPEC 没授权必然要改的旧断言；K2 另有一处 `rules()[61..]` 由总控补出） |
| `f23a725b` | K6 第一轮验收后出补单 01 |
| `e8976a52`、`1ad60dca` | K3 合入；第一批验收记录 |
| `c7cfbad3` | 四张补单 01 派出记录（K6 给 astra，其余 sol） |
| `13297bd8` | K6 第二轮后出补单 02 |
| `3b79242e`、`2d2f54d7` | K1、K2 合入 |
| `232bc298` | 冻结 [SERVICE-M3C 补充 01](../contracts/m3c-v1/SERVICE-M3C-ADD-01.md)，K4 基线 |
| `311f3a9b` | K5 合入 |
| `3a4633f9` | 第二轮验收记录；K4 就绪（清单、单子、派前回执） |
| `1e3f39b5` | K4 与 K6 补单 02 派出记录（都给 sol） |
| `93a83288` | K4 受阻成立，出 K4 补单 01 |
| 本报告的提交 | 第 11 份交接 |

## 3. 这一段做完的事（要点）

细节都在[验收报告](acceptance/wave8/controller/WATER-W8-REVIEW-20261101.md)与清单的 `controllerReview`、`carryOverLater` 里。

- **第一批回执**：
  - K3 完成，验收合入；
  - K1、K2、K5 受阻，都是总控 SPEC 漏授权旧断言，出补单 01；
  - K6 完成，但审查发现会误删的问题：
    - 未选分组的条目显示为勾上，取消一项会把整组其余项选进删除名单；
    - 按盘筛选时，分类全选作用于看不见的组，操作坞数字与“清理所选”的范围不一致；
    - “以后都跳过”在冻结的服务契约下，本次仍会被清理（总控契约疏漏）。
    
    出 K6 补单 01。
- **第二轮**：
  - K1、K2、K5 验收合入。K5 整机检查开窗前已告知用户：1 窗、9 步约 27 秒、退出码 0。
  - K6 第一轮问题全部修好，但审查又发现两条中级，出 K6 补单 02：
    - 过期结果上点分组没反应（补单 01 引入）；
    - 按级别筛选时分类全选仍选进隐藏组（基线就有）。
- **K4 派前**：只读代理先盘点 `tests/service_v1.rs` 里必然冲突的旧断言，结果写进补充 01 第 5 节预先授权。补充 01 还加了三条新规定：
  - 跳过即时生效；
  - 盘根只收 NTFS/ReFS：用带默认实现的新 `Platform` 方法，**不改 `DriveInfo`**；只放行 `GetVolumeInformationW`；
  - 排除里的已跳过项忽略。
  
  总控在 K4 树跑了 `lock`、`check`（含 `clippy --all-targets`），证明 K1～K3 合入后的主线上服务能编译。
- **K4 受阻**：新增的 64 次 `skip_add` 用例连续两次略超原有 50 ms 返回预算（50.6、51.3 ms）。根子在补充 01 第 1 条要求每次跳过都重写整份扫描记录（克隆、全量重建视图、刷盘写记录）。K4 补单 01 改为：
  - 最新扫描的视图一律 = 扫描结果 + 当前跳过名单；
  - `skip_add` / `skip_remove` 只写设置、只重算受影响的组；
  - `skip_remove` 立即恢复扫描时的状态；
  - 加万项规模用例、重启用例、记录文件字节不变；
  - 三条负控重做。

## 4. 接下来怎么收（K4 补单 01、K6 补单 02）

### 4.1 通用

同第 9 份第 4.1 节，工具在 `.local/w8-accept/`（副本 `docs/acceptance/wave8/controller/accept-kit/`）：

1. **回执审计**：
   - K6：`WATER_W2_AUDIT_MANIFEST=docs/dispatch/wave8/manifest.json node scripts/acceptance/w2-receipt-audit.mjs WATER-W8-K6`；
   - K4：`WATER_W3_AUDIT_MANIFEST=docs/dispatch/wave8/manifest.json node scripts/acceptance/w3-receipt-audit.mjs WATER-W8-K4`（桌面那套）。
2. **验收树**：
   - K4 新建：`git worktree add -b controller/accept-w8-k4 .worktrees/accept-w8-k4 <交回HEAD>`；
   - K6：`git -C .worktrees/accept-w8-k6 merge --ff-only <交回HEAD>`；
   - 然后 `node .local/w8-accept/make-manifest.mjs '{"k4":"<head>","k6":"<head>"}'`（会与已有条目合并）。
3. **复跑**：`bash .local/w8-accept/run.sh k4 lock check:final real:final`、`bash .local/w8-accept/run.sh k6 check:final browser:final`。
4. **总控变异**：
   - 在 `.local/w8-accept/mutations.json` 写 `k4`、`k6` 两组，每组至少各有一条 `red-nc1`、`red-nc2`、`red-nc3`（`test --final` 要求验收树里有红绿成对的负控）；
   - K6 现有的一组是第二轮写的，**锚点要按新代码重新核对唯一性**；
   - 写变异用 Write 工具写 `.cjs` 脚本，见第 6 节；
   - 然后 `node .local/w8-accept/controls.mjs k4`、`k6`。脚本最后会跑 `test --final`。
5. **独立审查**：只读代理，只给代码、契约、单子与补单，不给回执与结论。
6. **归档与合入**：
   - `run.sh <slot> archive`，把验收树的 `docs/acceptance/wave8/controller/accept-20261101/<slot>/` 复制进主线；
   - `git add -f` 证据目录；
   - `git merge --no-ff`，然后核对合并后的包与分支逐字节相同；
   - 更新清单 `controllerReview`、`carryOverLater`、STATUS、ROADMAP、验收报告；
   - 五步推送。

### 4.2 K4 专项

- **K4 要过重门**：三条负控都要被抓到，而且是在补单后的代码上。
- **新增系统函数只有 `GetVolumeInformationW`**：桌面检查器不核对 FFI 清单，要人工 `grep 'extern "system"'` 确认。
- **跳过只写设置**：测里要确认扫描记录文件在跳过前后字节不变；万项规模用例的实际耗时看回执。
- **`Platform` 新方法**都带默认实现、`DriveInfo` 不变，否则宿主测试（`apps/water/host/tests/host_v1.rs` 的 `SyntheticPlatform`）会编译失败。合入后用宿主的 `check` 再确认一次。
- **`real --final`** 的分类汇总与第七波 J3 对比，数值改为去重口径，量级应相近。
- **补充 01 第 5 节获准改的旧断言**：形状比对叠加 m3c 增量加 `SERVICE_M3C_SHAPE`、五处在用文案、测试盘可注入。核对没有多改。

### 4.3 K6 专项（第三轮）

- 逐张看 26 张截图（第二轮只看了 7 张）。
- 补单 02 各条：
  - 过期结果能开详情；
  - 级别筛选下的全选只作用于看得到的组；
  - 全部排除的组在抽屉里按未选显示；
  - 跳过后一定排除；
  - 排除不因列表变化丢失；
  - `by_drive` 可选链；
  - `UI_M3C_INUSE_ITEM` 失败时带标记。
- K6 必须在 K4 合入之后最后合入。合入后宿主、服务、界面才真正连通。

### 4.4 全部合入后

照第 10 份第 4.4 节做 M3 收口：
1. 第五次整合检查。宿主整机开窗前告诉用户。
2. 出新 release 版。
3. 本机复现 10-29 场景。
4. 用户在新版里自清理（用户本人按清理），补 M2。
5. 写 M3 收口报告。

整合检查时额外要看：
- marker 规则在真实数据上的一次遍历（K3 遗留 6）；
- 非系统盘根的整盘扫描；
- 跳过与排除端到端；
- 孤儿进程卡与“几天后满”与手算一致。

## 5. 本段新确认的事实与规矩

- **派单前先盘点旧断言**：冻结 SPEC 时，要列出新行为必然改坏的旧断言并写明授权。第一批三张单因此受阻，K4 派前用只读代理盘点后，旧断言一项没再卡住。
- **带预算的 IPC 调用里不要要求重活**：50 ms 返回预算是硬规矩。补充规定里不要要求在调用里重写大记录或全量重建视图。
- **公共类型不要加字段**：`DriveInfo` 被宿主测试与总控验收脚本直接构造，`Platform` 被宿主测试实现。给它们加字段或无默认实现的方法，会改坏不在白名单里的代码。
- **验收树的 `test --final`** 要求先有红绿成对的负控。总控变异里要指定几条为 `red-ncN` 模式；没抓到的那条不能充当，要补一条能抓到的。
- **变异的期望标记不要定太窄**。一处改动可能先撞上另一个新断言（K1 c2 先失败在 `PROC_M3C_IMAGE`）。看日志确认是被新断言抓到即可。
- **K6 的 `app.css` 在执行者树里曾 CRLF/LF 混用**，审计会报“final source differs from commit”。规整后与提交相同就不算问题；补单已要求统一 LF。
- **K5 整机检查开窗前**照例告诉用户，结束后确认窗口与 WebView 子进程全部退出。

## 6. 这一段新踩的坑

- **Bash 工具的 heredoc 里写 JS**：
  - 含引号与反斜杠的长字符串时，可能被 shell 提前截断（“unexpected EOF”），或吃掉 `\\`；
  - 改用 Write 工具写成 `.cjs` 文件再 `node` 跑。
- **`date` 在 Git Bash 里的时区显示不可靠**（显示 TST，`TZ=Asia/Tokyo` 也不对）。一律用 `date -u` 再加 9 小时换算 JST。本段一度把状态页时间写晚，已改正。
- **不要 `cd` 进工作树后不回来**：环境会把主目录切到那棵树。每条命令开头写 `cd /f/new/smaltalk/water`。
- **`git rev-parse` 一次给多个参数，其中一个不存在时整条失败**，要逐个取。

## 7. 待办

1. **收活**：K4 补单 01 与 K6 补单 02 都回来后一起收（第 4 节）。先问用户 K4 补单 01 派给了谁，记进清单 `addenda[0]`。
2. **全部合入后**做 M3 收口（第 4.4 节），包括用户本人按清理的自清理与 M2 达成补记。
3. **等用户决定**：
   - Mirasim B、D、E 三槽删不删（删 B 前先挪走 `ensure-port.vbs`）；
   - 7 棵检查器自检树留不留；
   - 第八波已合入单的工作树与验收树删不删；
   - “清、压、炼”何时排期。

## 8. 接手粘贴语

```text
交接里写了（F:/new/smaltalk/water/docs/CONTROLLER-HANDOFF-20261101-11.md）：读交接报告，准备接手 Water 总控。
```
