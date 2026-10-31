# Water 总控交接报告（2026-10-31 第 10 份）

项目根 `F:/new/smaltalk/water`，总控 Claude。因用户要压缩上下文而写；本报告取代[第 9 份](CONTROLLER-HANDOFF-20261028-9.md)作为当前入口。

以下仍然有效：
- 第 9 份第 4.1 节（收单通用流程）、第 6、7 节；
- 第 8 份第 1 节（远端、提交身份、离线缓存 `.offline-cache/`）、第 4.1 节；
- 第 5 份第 5 节的验收步骤、第 7 节硬规矩、第 8 节的坑。

**例外**：第 9 份第 5 节的自清理步骤作废，改为 M3 收口后再做，见第 4.4 节；第 9 份关于 Keeper 摄入的说法作废，见第 5 节。

本份只写变化与补充。所有回复用中文（记忆 `water-report-in-chinese`）。

## 0. 一句话现状

- **M1 已达成；M2 功能完成但自清理里程碑没达成；M3 进行中。**
  - 第六波（I1～I3）、第七波（J1～J4）全部验收合入。
  - 第四次整合检查通过，release 版 `water-0.1.0-b62f9c5c` 含第六波。第七波之后主线又有 7 个产品提交，还没出新版。
- **10-29 F 盘清理没用 Water**：用户认为 Water 当时不可靠，由总控照常规清理流程手动做。暴露的五个问题，加上 M3 原计划剩下的两项，一起并入 M3。用户 10-31：“把实战问题融入M3，解决完算M3彻底收口”。
- **第八波（M3 收口）计划已拍板**（“全部按推荐”），**第一批五张已派出**（10-31 约 23:15 JST）：

  | 单号 | 改哪里 | SPEC | 门 | 负控标记 | 执行者 |
  |---|---|---|---|---|---|
  | WATER-W8-K1 进程 | `packages/process-scan` | [PROCESS-M3C](../contracts/m3c-v1/PROCESS-M3C.md) | 轻门，real 计数 | `PROC_M3C_IMAGE`、`PROC_M3C_MEMORY` | sol |
  | WATER-W8-K2 规则 | `packages/junk-rules` | [RULES-M3C](../contracts/m3c-v1/RULES-M3C.md) | 轻门，real | `RULES_M3C_IN_USE`、`RULES_M3C_DRIVE_ROOT` | sol |
  | WATER-W8-K3 扫描 | `packages/junk-scan` | [SCAN-M3C](../contracts/m3c-v1/SCAN-M3C.md) | 轻门，real 只读扫描 | `SCAN_M3C_UNIQUE`、`SCAN_M3C_COMPAT` | sol |
  | WATER-W8-K5 宿主 | `apps/water/host` | [HOST-M3C](../contracts/m3c-v1/HOST-M3C.md) | 重门，native 1 窗 | `HOST_M3C_EXCLUDE`、`HOST_M3C_SKIP` | sol |
  | WATER-W8-K6 界面 | `apps/water/ui` | [UI-M3C](../contracts/m3c-v1/UI-M3C.md) | 轻门，26 张截图 | `UI_M3C_EXCLUDE`、`UI_M3C_DRIVE`、`UI_M3C_FORECAST` | astra |

  - 基线 `912eba100ba342c3eeb21ba555c6d589b91e6b4f`（标签 `water-w8-m3c-base-20261031`）。
  - 单子、清单与派前 baseline 在 `ded479c6`，派出记录在 `750d1918`。
  - 工作树 `.worktrees/w8-k1`、`w8-k2`、`w8-k3`、`w8-k5`、`w8-k6`，分支 `worker/water-w8-k*`。登记派出时都停在基线、干净。
  - 计划与派单句：[wave8/PLAN.md](dispatch/wave8/PLAN.md)。清单：[wave8/manifest.json](dispatch/wave8/manifest.json)。规则：[W8-M3C-WORKER-RULES](dispatch/W8-M3C-WORKER-RULES.md)。
- **第二批 K4 服务单还没写**。SPEC [SERVICE-M3C](../contracts/m3c-v1/SERVICE-M3C.md) 已冻结；K4 在编译时依赖 K1、K3 的新类型，要等 K1～K3 合入后从新主线开出（第 4.2 节）。
- **下一步**：回执到了按第 4 节验收。

## 1. 仓库与远端

同第 8 份第 1 节：
- 五步推送各自执行，不用 `&&` 串；
- 提交身份 `-c user.name="Riku Toto" -c user.email=usr_40dd3b2f69f149f6afc972157278189d@noreply.mirasim.ai`，信息写进 scratchpad 文件再 `-F`。

写本报告时，GitHub、中央仓库、E 盘镜像三处 `main` 一致，都在本报告的提交。注册的工作树除主仓库外还有：
- `.local/w2-accept/d-tree/.worktrees/w2-d`；
- 7 棵检查器自检树（`w2-selftest`、`w3-selftest-f1/f2/f3`、`w4-selftest-g1/g2/g3`），里面有未提交的自检文件，F 盘清理时保留，留给用户决定；
- 第八波的 5 棵。

## 2. 本份覆盖的提交（`166b29fb` 之后）

| 提交 | 内容 |
|---|---|
| `b3fb5f4f`～`b62f9c5c` | 第六波：I1 补单 01（受阻成立，总控疏漏），I1～I3 合入，验收 |
| `d1e6e9f9` | 第四次整合检查与 release `water-0.1.0-b62f9c5c` |
| `28287695`～`f273825c` | 第七波（M3 收尾）：冻结、派出（J1、J3、J4 给 sol，J2 给 astra）、四张合入、验收 |
| `ec1b8f89` | F 盘清理记录与两个维护脚本 |
| `70e7c24c`～`379c3bce` | Mirasim：先不重装 → 只留 A、C 两槽，C 槽从 A 槽复制恢复 → B/D/E 体量更正 |
| `50b2cfde`、`1145a26c` | Kimi Code 对话记录清理实验（不影响使用） |
| `6bd33969`～`774920d5` | Keeper 评估、停用、46 份 git 管的副本先留着 |
| `4b36619f`、`ddbff54a` | 云端 Linux 派单约定草案 → 暂缓 |
| `2dbb49ac` | 第八波计划；路线图更新 |
| `912eba10` | 第八波基线：`contracts/m3c-v1/`、执行者规则、两个检查器认第八波 |
| `ded479c6`、`750d1918` | 第八波第一批单子、清单、派前 baseline、派出记录 |
| 本报告的提交 | 第 10 份交接 |

## 3. 这一段做完的事

### 3.1 第六、七波收单与第四次整合检查

细节见 STATUS 第 13～17 项、[第六波验收](acceptance/wave6/controller/WATER-W6-REVIEW-20261028.md)、[第四次整合](acceptance/wave6/controller/WATER-W6-INTEGRATION4-20261028.md)、[第七波验收](acceptance/wave7/controller/WATER-W7-REVIEW-20261029.md)。

- **合入提交**：J1 `1019b4e3`、J2 `0d4333c2`、J3 `9d0e9833`、J4 `b299b879`。
- **release**：`water-0.1.0-b62f9c5c` 的 sha256 为 `3f4a19c4…`。
- **第七波遗留 `carryOverLater`**：已全部排进第八波 K5、K6，以及之后的 K4。

### 3.2 F 盘清理（10-29，没有用 Water）

见[清理记录与经验](maintenance/F-CLEANUP-20261029.md)。

- **做法**：分级编号表，用户选了“删除1-12”。可用空间 82.6 → 250.0 GB，腾出 167.4 GB。
- **误删**：8 号误删了 Mirasim-B～E 自带的 CLI 安装，当时 Mirasim-C 的 codex 正在运行。教训是删除前必须查有没有进程从目录里运行。
- **维护脚本**：`scripts/maintenance/clean-water-local.ps1`、`delete-listed-dirs.ps1`，都带在用检测。
- **暴露的五个问题**，都进了第八波：
  1. 只认 C 盘；
  2. 通用规则没有在用检测；
  3. 体量不去重硬链接；
  4. 不能组内排除；
  5. 不认旧工作树。

### 3.3 Mirasim、Kimi、Keeper、云端

- **Mirasim**（记忆 `mirasim-slots`）：
  - 用户只留 A、C 两槽。C 槽的三个 CLI 已从 A 槽逐文件镜像恢复，没有下载；A、C 都能启动。
  - B、D、E 三槽还有聊天记录，**删不删等用户**。删 B 之前必须先把 A、C 启动脚本共用的 `F:\Mirasim-B\ensure-port.vbs` 挪出来。
  - 搜索索引与 codex 自带记录是体量的大头，见[清理记录](maintenance/F-CLEANUP-20261029.md)“后续”一节。
- **Kimi Code**（[实验记录](maintenance/KIMI-CODE-SESSIONS-20261029.md)）：
  - 对话记录 350.6 MB 挪到隔离文件夹，没有读内容；用户试用“没有影响”，自己删掉了隔离文件夹。
  - 结论：清掉历史会话可以作为用户自选的一档。
- **Keeper**（[评估与停用记录](research/KEEPER-SALVAGE-20261029.md)）：
  - 已停用：服务停了，5 个 Grok 钩子和两个开机快捷方式已挪进 `.local/keeper-retire-20261029/`。
  - 23 份说明文件里连 Keeper 的段落已删，其中包括 Vault 规则文件（99 个硬链接同时生效）、`F:\new\AGENTS.md`、`F:\new\CLAUDE.md`。
  - 别的项目里被 git 管着的 46 份副本，用户说“先留着”，等各项目自己的总控处理。
  - 可带走的做法、脱敏规则数据和测试用例都列在记录里，供以后做“清、压、炼”时参考。
- **云端派单**：用户说以后可能有一台能连远端仓库的 Linux 云电脑。草案 [CLOUD-LINUX-WORKER-RULES](dispatch/CLOUD-LINUX-WORKER-RULES.md) 写完后用户说“暂时不考虑”，已标暂缓；AGENTS.md 的推送例外已撤回。

### 3.4 会话记录的“清、压、炼”（只讨论，未排期）

- **实测**：
  - 本机各家 agent 记录约 40 GB；Mirasim 搜索索引有 3.1 GB 是多槽重复；
  - 会话文件用 zstd 能压到 20～34%；
  - 只留“人说的话 + agent 正文”的骨架，不到原文件的 1%。
- **已向用户说明的方向**：
  - 清：派生数据；
  - 压：可还原的归档；
  - 炼：本地按固定规则提炼、先脱敏，引用写成“工具 + 会话 ID + 消息锚点”，不写文件路径。提炼稿不进 `index.md` 或 `hot.md`。
- **几条结论**：
  - 读内容要新 ADR，加上用户授权、代码隔离、负控三样配套；
  - 不接云端 API；
  - 模型摘要放在 Water 外面做。
- **现状**：没有排进 M3，等 M3 收口后再议。

## 4. 第八波怎么验收

### 4.1 通用（第一批）

同第 9 份第 4.1 节，换成第八波：

1. **回执审计**：
   ```bash
   WATER_W2_AUDIT_MANIFEST=docs/dispatch/wave8/manifest.json node scripts/acceptance/w2-receipt-audit.mjs WATER-W8-K1
   ```
   其余单换单号。
2. **工具**：复制 `.local/w7-accept/` 为 `.local/w8-accept/`。文件也在 `docs/acceptance/wave7/controller/accept-kit/` 有一份。
   - `make-manifest.mjs`：读 `docs/dispatch/wave8/manifest.json`，任务名 `WATER-W8-ACCEPT-K*`，验收树 `.worktrees/accept-w8-k*`，证据放 `docs/acceptance/wave8/controller/accept-<日期>/<slot>/`；
   - `run.sh`：K5（以及之后的 K4）走桌面检查器，用 `WATER_W3_OVERRIDE_MANIFEST`；K1、K2、K3、K6 走 checkup 检查器，用 `WATER_W2_SELFTEST_MANIFEST`；
   - 两个检查器已接受 `WATER-W8-ACCEPT-` 与 `WATER-W8-SELFTEST` 前缀。
3. **负控**：总控在新树里自选位置做变异，找只有新断言才抓得到的位置。
4. **独立审查**：用只读代理，只给代码、契约与单子，不给回执与结论。
5. **合入**：
   - 按第 4.2 节的顺序；
   - 证据里的 `*.log` 用 `git add -f`；
   - 清单写 `controllerReview` 与 `carryOverLater`；
   - 更新 STATUS。

### 4.2 合入顺序与 K4

1. **K1～K3 一起合入**。旧服务遇到新的在用方式时只是不起作用，不会坏。
2. **K5 可以早合**：宿主只在排除列表非空时多带 `excludeItemIds`，旧服务照常可用。
3. **K1～K3 合入后写 K4**：
   - 单子照第七波 J3 的格式；
   - 清单里在 `plannedTasks` 之外加一个任务：模板取第七波 J3 的服务任务，`kind: service`、`realMode: service-smoke`，`gate` 为 `heavy`；
   - 负控三条 `SERVICE_M3C_EXCLUDE`、`SERVICE_M3C_SKIP`、`SERVICE_M3C_DRIVE_ROOT`；
   - 从合入后的主线开工作树、跑 baseline、给派单句。
4. **K6 最后合入**：它调用的 `skip_add` / `skip_remove` 等新命令要等 K4。

### 4.3 各单专项

- **K1**：
  - 在本机另起一个从夹具目录运行的程序，核对新方式命中；
  - 内存与 `Get-Process` 的工作集同一量级；
  - JSON、Debug 里没有程序路径。
- **K2**：
  - `git-worktrees` 的文案逐字对照 SPEC 第 3 节；
  - `data_version` 为 `2026-10-31.1`；
  - 盘根 custom root 生成的计划含 `hard_guards`。
- **K3**：
  - 自建硬链接夹具，核对 `unique_bytes`；
  - 一次遍历与逐个遍历的结果一致；
  - `real` 的用时与访问条目数和改动前基线对比，不能明显变慢。
- **K5**：
  - 整机检查会开 1 个窗口，**开窗前告诉用户**；
  - 核对不排除时转发的参数与原来逐字节相同。
- **K6**：
  - 26 张截图逐张看，重点看磨砂玻璃、没有渐变堆叠与 emoji（记忆 `water-ui-frosted-glass`）；
  - 残留进程卡没有“结束”按钮；
  - 确认界面永不传路径。

### 4.4 全部合入后：M3 收口

按[第八波计划](dispatch/wave8/PLAN.md)第 3 节：

1. **第五次整合检查**：照 `.local/w6-integ4/`，服务、宿主两棵树。宿主整机检查开窗前告诉用户。
2. **出新 release 版**。
3. **本机逐条复现 10-29 的场景**，合成夹具加只读真实数据：
   - 在用被跳过；
   - 硬链接只算一次；
   - 整盘按盘分组；
   - 排除与“以后都跳过”生效；
   - 工作树标“仅供参考”；
   - 孤儿进程、几天后满与手算一致。
4. **自清理补 M2**：由用户在新 release 版里清这一波新攒的开发垃圾，**用户本人按清理**。总控核对前后可用空间、日志、工作树 `git status`、证据与 `.offline-cache`。
5. **写 M3 收口报告**，同时补记 M2 达成。

## 5. 本段新确认的事实与规矩

### 用户决定与偏好

- 回复与汇报一律中文。
- 清理一律先给分级编号表，用户按编号选，选择要记录（记忆 `water-cleanup-graded-table`）。
- 实战问题并入 M3；第八波计划全部按推荐。
- 云端派单暂缓。

### 删除与外部状态

- **删除**：Kimi 实验以后，总控不做最终的永久删除，改为先挪到隔离文件夹，由用户自己删。删除前必须查有没有进程从目录里运行。
- **Keeper 已停用**：
  - 不要再调用 7890，也不再有“Keeper 摄入”；
  - Water 的 AGENTS.md 已改为“完成摘要保留在本项目（Keeper 已于 2026-10-29 停用，不再有自动摄入）”；
  - 共享 Vault 仍然不由总控写。

### 派前准备的新经验（第八波）

- **契约依赖**：先检查各单之间有没有编译依赖。Rust 的路径依赖意味着下游单拿不到上游单的新类型。
- **清单**：用脚本从前几波的同类任务复制模板，生成器在 `docs/acceptance/wave8/controller/freeze-20261031/make-w8-manifest.mjs`。注意：
  - 已存在的包要写 `outputRootExists: true`，否则 baseline 报“Output root must not exist yet”；
  - 有宿主单时，顶层 `frozenFiles` 必须含 `contracts/desktop-bootstrap-mirror-v1/MIRROR.json`；
  - `allowedFfi` 只在写了才核对，K1、K3 已写上；
  - PowerShell 5.1 的 `ConvertTo-Json` 会改写 JSON 格式，清单最后用 node 规整。
- **界面回放数据增量**：由脚本从 `checkup-v1/ui-fixtures.json` 派生，生成器在同一目录的 `make-m3c-fixtures.mjs`。

## 6. 这一段新踩的坑

- **PowerShell 5.1 调外部程序时会吃掉参数里的 JSON 双引号**；`node -e` 的第一个参数在 `process.argv[1]`。要传 JSON，就先写进文件。
- **Bash 的 `sed` 处理反斜杠路径**会报“unterminated s command”。路径类处理改用 PowerShell 或 node。
- **`Measure-Object -Line` 不数空行**，行数会偏少。
- **`ripgrep` 在 Windows 输出 `F:/new\x\y` 混合分隔符**，比较前先统一。
- **硬链接文件要原地改写**：用 `[IO.File]::WriteAllText` 打开同一个文件截断再写，链接就不会断。先写临时文件再改名会断开。
- **Mirasim 的启动脚本依赖 B 槽里的 `ensure-port.vbs`**，删槽前先查交叉依赖。

## 7. 待办

1. 第八波第一批回执到了，按第 4 节验收。K1～K3 合入后写、派 K4。
2. 全部合入后做 M3 收口（第 4.4 节），包括由用户本人按清理的自清理，以及 M2 达成补记。
3. 等用户决定：
   - Mirasim B、D、E 三槽删不删；
   - 7 棵检查器自检树留不留；
   - “清、压、炼”何时排期。
4. 第七波修复还没进 release 版，在第五次整合检查后一并出。

## 8. 接手粘贴语

```text
交接里写了（F:/new/smaltalk/water/docs/CONTROLLER-HANDOFF-20261031-10.md）：读交接报告，准备接手 Water 总控。
```
