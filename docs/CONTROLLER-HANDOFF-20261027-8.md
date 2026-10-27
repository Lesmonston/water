# Water 总控交接报告（2026-10-27 第 8 份）

项目根 `F:/new/smaltalk/water`，总控 Claude。因用户要压缩上下文而写；本报告取代[第 7 份](CONTROLLER-HANDOFF-20261027-7.md)作为当前入口。

以下仍然有效：
- 第 5 份第 5 节的验收步骤、第 7 节硬规矩、第 8 节的坑；
- 第 6 份第 6、7 节；
- 第 7 份第 6、7 节（第 7 节关于服务与宿主缓存的建议已在那里更正）。

本份只写变化与补充。

> **10-28 凌晨补记**：五张回执都已交回，收单验收做了一半后用户叫停。先读[第五波验收进度](acceptance/wave5/controller/WATER-W5-ACCEPT-PROGRESS-20261028.md)第 5 节“明天接着做”：H1 要出补单 01；H2、H3 验收树检查未跑；H4 截图未看；没有合入任何一票。

## 0. 一句话现状

- **M1 体检 Alpha 已达成**；第四波 G1～G7 全部验收合入。
- **M2 准备三票**都已 VERIFIED 并合入：
  - G5 清理结果报告修正 `fc1f0dd5`；
  - G6 宿主收尾 `c7159029`；
  - G7 界面收尾 `acee890f`。
  - 收单验收见 [G5G6G7 验收报告](acceptance/wave4/controller/WATER-W4-G5G6G7-REVIEW-20261027.md)；不影响删除安全的问题记在第四波清单各票的 `carryOverM2`。
- **第二次主线整合检查通过**（主线 `49d0b4d2`，[报告](acceptance/wave4/controller/WATER-W4-INTEGRATION2-20261027.md)）：
  - 四个包的检查与测试全绿；
  - 整机窗口只读体检 11 步全过，完整结果，没有删除任何东西。
- **日常使用的 release 版已编好**：`F:/new/smaltalk/water/.local/release/water-0.1.0-d64aa399/water.exe`（sha256 `7c6ecada…`，本地构建，`.local` 不进仓库），冒烟通过。
- **M2 计划已拍板**：用户 10-27 四条都按推荐，见 [M2 计划](M2-PLAN-20261027.md)。
- **第五波（M2）五张票已派出**（10-27 约 22:36 用户告知），基点 `3f907897`（标签 `water-w5-m2-base-20261027`）：

  | 单号 | 执行者 | 改哪里 | SPEC | 门 | 负控标记 |
  |---|---|---|---|---|---|
  | WATER-W5-H1 清理执行器收尾 | Cursor | `packages/junk-clean` | [CLEAN-M2](../contracts/m2-v1/CLEAN-M2.md) | 重门 | `CLEAN_FREED_EXACT`、`CLEAN_UNPAIRED_NAME`、`CLEAN_DEEP_TREE` |
  | WATER-W5-H2 服务收尾 | Cursor | `packages/water-service` | [SERVICE-M2](../contracts/m2-v1/SERVICE-M2.md) | 重门，final 含 real | `SERVICE_PANIC_IDLE`、`SERVICE_SCAN_RECORD`、`SERVICE_CUSTOM_ROOT` |
  | WATER-W5-H3 宿主打开清理 | Cursor | `apps/water/host` | [HOST-M2](../contracts/m2-v1/HOST-M2.md) | 重门，native 夹具清理闭环（1 窗） | `HOST_BACKEND_RELEASE`、`HOST_CLOSE_DURING_CLEAN`、`HOST_CLEAN_ENABLED` |
  | WATER-W5-H4 界面 M2 | opus | `apps/water/ui` | 票内“要做的” | 轻门，截图 20 张 | `UI_CLEAN_SCOPE`、`UI_NOTICE_SCOPE`、`UI_STOP_FEEDBACK` |
  | WATER-W5-H5 Rust 构建目录规则 | sol | `packages/junk-rules` | [RULES-M2](../contracts/m2-v1/RULES-M2.md) | 轻门，final 含 real | `RULES_RUST_BUILD` |

  - 票：`dispatch/tickets/WATER-W5-H*-20261027.md`；
  - 清单：[wave5/manifest.json](dispatch/wave5/manifest.json)；
  - 计划与派单句：[wave5/PLAN.md](dispatch/wave5/PLAN.md)；
  - 规则：[W5-M2-WORKER-RULES](dispatch/W5-M2-WORKER-RULES.md)；
  - 工作树 `.worktrees/w5-h1`～`w5-h5`，分支 `worker/water-w5-h1`～`h5`。
  - 记录派单时五棵树都还停在基点、干净，只有总控的派前 baseline 回执。
- **下一步**：用户转告回执 → 逐张验收（第 4 节）→ 第三次主线整合检查 → 新 release 版 → 自清理（用户按按钮）→ M2 达成。

## 1. 仓库与远端

同前：
- 五步推送各自执行，不用 `&&` 串；
- 提交身份 `-c user.name="Riku Toto" -c user.email=usr_40dd3b2f69f149f6afc972157278189d@noreply.mirasim.ai`，提交信息写进 scratchpad 文件再 `-F`；
- 强制更新只给用户命令，完整提交号先查出来。

写本报告时 GitHub、中央仓库、E 盘镜像三处 `main` 一致，都在本报告的提交。

**新目录 `.offline-cache/`**（已加进 `.gitignore`）：
- `core/registry` 复制自 `.worktrees/a/.local/cargo-home/registry`，供 D、服务、规则使用；
- `desktop/registry` 复制自 `.worktrees/ac/.local/desktop-cargo-home/registry`，供宿主使用；
- 两份都逐字节核对过（共 11159 个文件）；
- 第五波清单的 `cargoCacheSource` 指向这里；旧波次清单不改。

## 2. 本份覆盖的提交

| 提交 | 内容 |
|---|---|
| `fc1f0dd5` / `c7159029` / `acee890f` | G5、G6、G7 合入 |
| `49d0b4d2` | G5～G7 验收、台账、证据 |
| `d64aa399` | 第二次主线整合检查（并更正第 7 份关于缓存的建议） |
| `634887cd` | release 构建记录 |
| `e287306f` | M2 计划草案 |
| `3f907897` | 第五波基点：`contracts/m2-v1/` 四份契约、执行者规则、波次计划、两个检查器支持第五波与夹具清理闭环、自检证据、`.gitignore` |
| `e40eb643` | 五张票、第五波清单、派前 baseline |
| `6a9540f5` | 派单句写进波次计划 |
| `b78d5769` | M2 计划写入自清理体量实数（58.5 GB） |
| 本报告的提交 | 记录派单、第 8 份交接 |

## 3. 这一段做完的事

### 3.1 G5～G7 收单验收

- **G5**：
  - 总控另写 7 个“先快照、再改磁盘、再删除”用例 [`w4-g5-controller-unit.rs`](../scripts/acceptance/w4-g5-controller-unit.rs)：作为 `#[cfg(test)]` 模块临时放进验收树，直接调 crate 的 `snapshot` 与 `delete`，不靠时序；
  - 这 7 个用例在 G5 上全过、在旧源码上全败；G5 新逻辑 5 处变异都被抓到；
  - 第四波竞态用例按 CLEAN-REPORT §3 改了计数，12 项全过。
- **G6**：
  - 整机窗口检查通过；
  - 真窗口第二实例测试：脚本 [`w4-g6-second-instance.ps1`](../scripts/acceptance/w4-g6-second-instance.ps1)，第二实例 176 ms 退出，最小化的窗口 316 ms 内回到前台。
- **G7**：负控与截图通过。
- **验收工具**：`.local/w4-accept-m2/`（`run.sh`、`controls.mjs`、`mutations.json`、`g5-unit.sh`、`g5-cases.sh`、`g5-case-proofs.sh`）。

### 3.2 第二次整合检查与 release

- 整合树 `.worktrees/integ-w4b`，工具 `.local/w4-integ2/`（`run.sh`、`make-manifests.mjs`、`build-release.sh`）。
- release 用 `build-release.sh` 编：同一工具链、离线缓存与镜像参数，4 个并行任务，2 分 49 秒。
  - 图形界面子系统（没有控制台窗口）；
  - 冒烟用第二实例脚本跑过。

### 3.3 M2 计划与第五波准备

- **自清理范围**（拍板第 3 条）：
  - 只添加 `F:\new\smaltalk\water\.worktrees`；
  - 离线依赖源先复制到 `.offline-cache`（已做）；
  - 工作树本身不删，回执与临时目录不在 M2。
- **体量**（总控只读全量统计）：可清约 58.5 GB。
  - Rust 构建目录 44.5 GB（推荐清理）；
  - 测试浏览器配置 9.3 GB（需要确认）；
  - 私有 Cargo 目录 4.7 GB（推荐清理）。
- **夹具清理闭环**：
  - 桌面检查器 native 模式新增 `task.nativeFixture`：生成合成夹具并调成 72 小时前，预置设置（七个分类关闭、加夹具文件夹），结束后核对删留、清理记录与日志；
  - 配置在 `.local/w5-prep/native-clean-loop.json`，清单 H3 用同一份；
  - 自检树 `.worktrees/w5-selftest-h3`（分支 `selftest/water-w5-h3`，只把 `CLEAN_ENABLED` 改成 true，**永不合入**）跑通：真窗口第一次走完应用内清理，3,145,815 字节夹具删除、失败 0、17 秒、退出码 0。证据在 [wave5 selftest](acceptance/wave5/controller/selftest/)。
- **检查器**：`WATER-W5-*` 读 `docs/dispatch/wave5/manifest.json`；覆盖清单允许 `WATER-W5-SELFTEST`、`WATER-W5-ACCEPT-` 前缀。
- **清单生成**：[`make-wave5.mjs`](acceptance/wave5/controller/make-wave5.mjs)。各票的任务配置取自最近一次验收的同包任务（G5、G2、G6、G7、第二波 A），冻结哈希取自新工作树。

## 4. 五张票怎么验收

### 4.1 通用流程

同第 5 份第 5 节：
1. **审计**：
   ```bash
   WATER_W2_AUDIT_MANIFEST=docs/dispatch/wave5/manifest.json node scripts/acceptance/w2-receipt-audit.mjs WATER-W5-H1
   ```
   其余换单号；并核对首次 HEAD `3f907897` 是祖先、没有改写历史。
2. **验收工具**：复制 `.local/w4-accept-m2/` 为 `.local/w5-accept/`，改动：
   - `make-manifest.mjs` 读 `docs/dispatch/wave5/manifest.json`，任务名 `WATER-W5-ACCEPT-H*`，证据目录 `docs/acceptance/wave5/controller/accept-<日期>/<slot>/`；
   - `run.sh` 与 `controls.mjs`：H2、H3 走桌面检查器（`WATER_W3_OVERRIDE_MANIFEST`），H1、H4、H5 走 checkup（`WATER_W2_SELFTEST_MANIFEST`）；
   - `controls.mjs` 的 `failedRun`：只有 H4 按 `# fail`，其余按 `test result: FAILED`。
3. **重跑 final**；总控负控，位置与执行者的不同。
   - 检查器只认带票上标记、且没有超时的失败。若变异让别的测试先超时，或先撞上旧标记，就换更窄的位置（第四波 G6 nc3、G7 nc2 的教训）。
4. **独立审查**：只读代理，只给代码、契约与票，不给回执与结论。
5. **合入**：
   - `--no-ff` 合入；
   - 证据复制进 `docs/acceptance/wave5/controller/accept-…/`，`*.log` 用 `git add -f`；
   - 清单写 `controllerReview`；
   - 更新 STATUS。

### 4.2 各票专项

- **H1**：
  - 跑 `w4-g5-controller-unit.rs`（`g5-unit.sh` 改指验收树）与第四波竞态用例，计数应不变；
  - 再加用例：
    - **重建同名**：竞态，`aaa\f00000.bin` 删掉后由另一线程重建同名文件，`aaa` 删不掉，失败 0；
    - **上级被移走**：快照后把条目的上级改名，`delete` → `skipped/gone`；
    - **释放精确**：硬链接文件不计入；
  - 十万文件重新计时，改成循环后不能明显变慢；
  - 在 G5 源码上跑 `CLEAN_DEEP_TREE` 的深树：递归版应栈溢出崩溃，要单独起进程看退出码。
- **H2**：
  - 核对第 1、2 条的做法；
  - 第 3 条（锁中毒恢复）只能读代码；
  - `real` 冒烟摘要。
- **H3**：
  - 验收树跑 `native --final`（夹具清理闭环，会开 1 个窗口，**先告诉用户**）；
  - 可另试“清理进行中关窗”：需要一个大夹具、自定义观察步骤，**另开窗口先问用户**；
  - 第二实例脚本可以复用。
- **H4**：看 20 张截图，重点是 `stop-failed`、`confirm`、`stale`、`paused`、`reconnecting` 与清理记录；确认 11 处文字没变。
- **H5**：核对新规则 JSON 与来源；`real` 冒烟。

### 4.3 五张都合入后

1. **第三次主线整合检查**：
   - 照 `.local/w4-integ2/` 新建整合树与覆盖清单，配置取 H1、H4、H2、H3；
   - 宿主的整机检查就是夹具清理闭环，会开窗，先告诉用户；
   - 服务与宿主的离线缓存互不包含：分两棵树，或在两者之间把 `.local/w3-cargo-home` 改名换用。
2. **新的 release 版**：用 `build-release.sh`，放到 `.local/release/` 新的版本目录。
3. **自清理**：按 [M2 计划](M2-PLAN-20261027.md)第 3.2 节：
   1. 用户运行新版，添加 `.worktrees`，做一次体检；
   2. 总控只读核对，给勾选建议；
   3. **用户本人按清理**；
   4. 总控核对：日志、释放量、各工作树 `git status`、证据，并从 `.offline-cache` 新建树离线跑一遍检查。
4. 写 M2 达成报告与交接。

## 5. 之后

- **M2 之后**：M3（定时快照与泄漏提醒、原生工具命令、会话归档、孤儿进程、macOS、签名分发）。
- **仍记着、没排票**：
  - 宿主：选择框父窗口、WebView2 环境变量；
  - D：`set_delete` 回退条件（低级）；
  - 第四波 `carryOverM2` 中没进第五波的项，如 G5 的 `$UpCase` 差异（保守方向）、G7 的清理结束时详情读取失败被丢弃；
  - 第一波遗留：真实用户 scope 的自然同意鉴真、生产竞态、macOS。

## 6. 本段新确认的事实与规矩

- **派单记录**：H1～H3 交 Cursor，H5 交 sol，H4 交 opus（10-27 约 22:36 用户告知）。
- **受保护位置总会被扫描**：服务按设计，七个分类开关只管非受保护的规则；受保护位置照样只读统计占用（`plan.targets.retain` 里 `Protected` 总保留），永远不可勾选。夹具清理闭环里也一样。
- **`CARGO_TARGET_DIR` 构建目录没有 `CACHEDIR.TAG`**，所以 H5 加了按 `.rustc_info.json` 识别的规则；Cargo 的 `registry` 目录有 `CACHEDIR.TAG`。
- **用户的设计选择是最终的**（冰山原版、脉搏线）；总控推荐只是选项。

## 7. 这一段新踩的坑

- **服务与宿主的离线缓存互不包含**：同一棵树里先跑哪个都不行；分树，或在两者之间改名换用（不删）。
- **`powershell -ExecutionPolicy Bypass` 会被自动权限判定拒绝**：照检查器的写法 `powershell.exe -NoProfile -NonInteractive -File …` 即可。
- **整合树里 `archive` 只能给一个任务用**：第一个任务的归档写进树里之后，其它任务会报 “Out of scope”。整合检查的证据直接复制各任务 `.local/checks/<任务>/`。
- **负控被检查器拒收的两种情况**：
  - 别的测试因无标记等待而超时（G7 nc2、nc2b）；
  - 先撞上旧标记（G6 nc3 先报 `HOST_DATA_DIRECTORY`）。
  - 换更窄的变异位置。
- **对一百多棵工作树做 `du` 要一个多小时**：放后台，期间别的磁盘操作会变慢。
- **`git worktree add` 一棵约 1～2 分钟**（检出文件多）：放后台。
- **Bash 的 `cd` 会保留到后续命令**：命令以 `cd /f/new/smaltalk/water &&` 开头，或用子 shell。

## 8. 待办

1. 用户转告 H1～H5 回执后，按第 4 节验收、合入。
2. 五张合入后：第三次整合检查（开窗先告诉用户）→ release → 自清理（用户按按钮）→ M2 达成报告。
3. 自检树 `.worktrees/w5-selftest-h3` 与分支 `selftest/water-w5-h3` 保留作证据，**不要合入**。
4. 共享 Vault 还没有 Water 项目页；按项目规则由 Keeper 从交接报告与 ADR 摄入，总控不写共享 Vault。

## 9. 接手粘贴语

```text
交接里写了（F:/new/smaltalk/water/docs/CONTROLLER-HANDOFF-20261027-8.md）：读交接报告，准备接手 Water 总控。
```
