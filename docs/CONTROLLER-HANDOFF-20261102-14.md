# Water 总控交接报告（2026-11-02 第 14 份）

项目根 `F:/new/smaltalk/water`，总控 Claude。因用户要压缩上下文而写（11-02 19:45 JST）。本报告取代[第 13 份](CONTROLLER-HANDOFF-20261102-13.md)作为当前入口。

以下仍然有效：
- 第 13 份第 4、5 节；
- 第 12 份第 5、6 节；
- 第 10 份第 1 节（远端、五步推送、提交身份）、第 5、6 节；
- 第 11 份第 4.1 节（收单通用流程）；
- 第 9 份第 4.1 节、第 8 份第 1 节、第 5 份第 7 节硬规矩。

本份只写变化与补充。所有回复用中文；汇报里的 GB 一律按 1024 换算。

## 0. 一句话现状

- **M3 达成（11-02 约 17:10）**：
  - 第九波 L1～L4 全部验收合入（`b1596da6`）；
  - 第六次整合检查通过，release `water-0.1.0-bb92c87e` 编好；
  - F1、F2 在 D 盘与 `F:\Mirasim-A` 只读复验通过，“几天后满”与手算一致；
  - 见 [M3 收口报告](acceptance/wave9/controller/WATER-M3-CLOSE-20261102.md)（`dfe86d5a`）。
- **第十波（M3.5）在派前准备中**：
  - 界面设计 v2 用户已认可（“可以”）；
  - [第十波计划](dispatch/wave10/PLAN.md)把 67 条清理经验逐条对到功能，五件新事全部拍板；
  - [ADR-019](decisions/ADR-019-project-declarations-and-quarantine.md) 七节全部拍板；
  - [基准表](dispatch/wave10/BENCHMARK.md)已写；
  - **契约只起草了第一份**（规则 [RULES-M35](../contracts/m35-v1/RULES-M35.md)，草案，未冻结）。
  - 还没有派任何单。下一步见第 2 节。
- **主线**：写本报告前是 `f8484357`，三处与 E 盘镜像一致；本报告连同基准表、规则契约草案一起提交，见第 6 节。

## 1. 这一段的提交（第 13 份 `7b25d3d0` 之后）

| 提交 | 内容 |
|---|---|
| `5e367fd9`、`b3b1d11f` | F 盘收尾、四盘总结；下一轮计划草案（[第九波计划](dispatch/wave9/PLAN.md)） |
| `e556445f`、`62c9522e`、`234ed74d` | `denglou` 清理：执行单、总控执行（隔离 167.52 GB）、用户删除后的记录（剩一个 `nul`） |
| `6d19bba0`、`3ece7ef5` | `denglou` 收尾回执并入[固定做法](maintenance/CLEANUP-METHOD.md)与 `precheck-plan.cjs` |
| `57ecd7ce`、`2bf46464`、`ed1f990c` | 第九波冻结（`contracts/m3d-v1`，标签 `water-w9-m3d-base-20261102`）、单子与派前 baseline、派单登记 |
| `d2e84c5a` | L2 补单 01（我写错了夹具限制） |
| `28736089`、`37fa96f1`、`b39bfcdf`、`bc433e6c`、`b1596da6` | 第九波 L1～L4 合入与[验收报告](acceptance/wave9/controller/WATER-W9-REVIEW-20261102.md) |
| `bb92c87e` | Mirasim A、C 的 `start.vbs` 删掉调用已删 B 槽脚本的一行（用户“删掉，留备份”，备份 `start.vbs.bak-20261102`） |
| `dfe86d5a` | M3 收口：[第六次整合报告](acceptance/wave9/controller/WATER-W9-INTEGRATION6-20261102.md)、收口报告、release |
| `b20ba23e` | [界面设计 v2](design/water-ui-v2/DESIGN.md) 与可点的[设计稿](design/water-ui-v2/mockup.html) |
| `8376c286` | 第十波计划（经验对照）与 ADR-019 草案 |
| `f8484357` | 五件事拍板；设计 v2 加 3.12 长列表、3.13 查重、常驻隔离区条；设计稿 22 个画面 |
| 本报告的提交 | 第 14 份交接、[基准表](dispatch/wave10/BENCHMARK.md)、`contracts/m35-v1/RULES-M35.md`（草案） |

## 2. 第十波：做到哪了、下一步怎么接

### 2.1 已定的事（用户原话都在计划与 ADR 里）

- **界面**：设计 v2 全部（导航 体检·隔离区·趋势·记录 + 底部设置；首页选位置；结论页一个主按钮、≤5 张判断卡；“⋯”菜单；复选框只在明细与抽屉；3.12 长列表规则；常驻隔离区条；确认框“先放进隔离区 / 直接删除”）。
- **功能**：计划第 2 节第 1～67 行。第 3 节列出了不进软件的项及原因。
- **ADR-019**：
  - 读 `.water-cleanup.json`；
  - 读 `.git` 小文件的 `gitdir:` 一行；
  - 先隔离再删（入口常驻，删了还剩照实显示）；
  - 界面 v2；
  - 会话可选清理（按工具开关，二选一）；
  - 读已安装程序列表；
  - 用户发起的逐字节查重（第二个读内容的例外）。
- **单子九张**：

  | 单 | 目录 | 门 | 批 |
  |---|---|---|---|
  | M1 规则 | `packages/junk-rules` | 轻门 | 一 |
  | M2 扫描 | `packages/junk-scan` | 中门 | 一 |
  | M3 项目声明（新包） | `packages/cleanup-manifest` | 中门 | 一 |
  | M4 执行器 | `packages/junk-clean` | 重门 | 一 |
  | M8 查重（新包） | `packages/dup-finder` | 中门 | 一 |
  | M9 已安装程序（新包） | `packages/installed-apps` | 轻门 | 一 |
  | M5 宿主 | `apps/water/host` | 中门 | 契约冻结后即可派，按假宿主做 |
  | M6 界面 | `apps/water/ui` | 中门，界面单 | 同 M5 |
  | M7 服务 | `packages/water-service` | 重门 | 二：等第一批合入 |

  - 合入顺序：M1～M4、M8、M9 → M7 → M5 → M6。
  - M1 与 M2 经计划 JSON 对接，要一起合（与第九波 L1、L2 相同）。
- **用户要求的派单后任务**：复盘“删了还剩”。把上轮的 `nul`、结尾空格文件夹、被占用的日志、`D3DSCache`、只读、超深路径、隔离区联接、被资源管理器或终端打开的目录逐个复现，比较资源管理器、`cmd rd`、PowerShell、Water 执行器的结果。影响 M4 的出补单（计划第 5 节第 7 条）。

### 2.2 写契约时已查清的约束（直接决定契约怎么写）

1. **不能给服务完整匹配的枚举加变体**，否则第一批合入后、M7 合入前主线的服务编译不过：
   - `water-service/src/clean.rs` 约 121 行完整匹配 `water_junk_rules::MatchSpec`；
   - `views.rs` 约 102 行把规则的 `InUseMode` 完整映射到进程包的 `InUseMode`；
   - `clean.rs` 约 357～363 行用到执行器的 `ItemStatus`、`SkipReason`（`use clean::SkipReason::*`）。
   - 所以：
     - 新的“按文件名找”做成 marker 的新种类 `file_name`，不加 `MatchSpec` 变体；
     - “看应用数据根目录的在用”做成 `InUse` 上的可选字段 `root_levels`，配 `runs_from_or_references_item`，不加 `InUseMode` 变体；
     - 隔离用**单独的函数与报告类型**，不给 `ItemStatus`、`SkipReason` 加变体。
   - 服务不直接构造 `Target`、`InUse`、`Group`、`Item`、`KnownFolders` 结构体，所以加字段安全；扫描包的 `InUse.mode` 是字符串。
2. **新包**：
   - 检查器支持新建 crate：执行者自己写 `Cargo.toml`，`lock` 模式离线生成锁文件。
   - 依赖政策只许 serde 与 serde_json，**不许 path 依赖**（`checkup-wave-check.mjs` 约 62～75 行）。
   - 因此查重要自己实现 SHA-256、自己遍历；文件 ID 用系统函数。已安装程序要读注册表，用系统函数（`RegOpenKeyExW`、`RegEnumKeyExW`、`RegQueryValueExW`、`RegCloseKey`），写进 `allowedFfi`。
3. **执行器的系统函数**现有 8 个，含 `SetFileInformationByHandle`。同盘改名（`FileRenameInfo`）不需要新函数；建目录用标准库。
4. **`system_drive`**：
   - 规则包的 `KnownFolders` 加成可选键（缺省时以它为基础的规则不生成目标），先后合入不会坏；
   - 扫描包的 `known_folders()` 要补上；
   - 检查器的 `realEnvFolders()` 已经给出 `system_drive`。
5. **主宿主检查要冻结镜像契约**：哪一波的清单若没有宿主单、顶层冻结文件里就没有 `contracts/desktop-bootstrap-mirror-v1/MIRROR.json`，宿主检查器会拒收。整合时从第八波清单带上（`.local/w9-integ6/make-manifests.mjs` 已这样做）。
6. **真实路径模式**（写规则用，来自 `.local/cleanup-20261101/plan-*.json`，用 `.local/w10-prep/plan-shapes.cjs`、`plan-items.cjs` 读）：
   - 微信开发者工具：`Roaming\微信开发者工具\Partitions\<分区>\Cache`；
   - QQ：`Roaming\QQ\Partitions\{qq-browser-*,qqnt_*}\{Cache,Code Cache,GPUCache}`；
   - Steam：`Local\Steam\htmlcache\Default\{Cache,Code Cache,GPUCache}`；
   - WeGame：`Roaming\Tencent\WeGame\qbcore109\cache`；
   - 剪映：`Local\JianyingPro\User Data\{Cache,CEF\Cache,Download\update.exe}`；
   - 企业微信：`WXWork\{qtCef,<id>\WXWorkCefCache,<id>,Default}\{Cache,Code Cache,GPUCache}`；
   - Codex 运行时：`.cache\codex-runtimes\codex-runtime-install-<随机>`；
   - 会话：
     - Claude `.claude\projects\<项目>\<uuid>.jsonl`；
     - Codex `.codex*\sessions\YYYY\MM\DD\rollout-*.jsonl(.zst)`；
     - Kimi `.kimi-code\sessions\wd_<名>_<哈希>`；
     - Grok `.grok\sessions\<编码后的目录>\<uuid>\`；
     - Cursor `.cursor\chats\<哈希>`；
   - 本机能确认在跑的进程名只有 `claude`、`codex`、`Cursor`、`Mirasim`、`opencode-cli`、`WeChatAppEx`、`Weixin`；其它应用的进程名没核实，规则里尽量用 `root_levels` 方式。

### 2.3 下一步（按顺序）

1. **审完 RULES-M35 草案**：第 6 节新规则表（29 条）、第 16 行兜底放宽、第 4 节会话开关的 `resolve_plan_with`、`system_drive` 可选。
2. **SCAN-M35**（M2）：
   - 解析新字段与新 marker、新条件；
   - 会话目标的 `unlocks_target_ids`：对它解锁的受保护目标不判 `inside_protected`；
   - 按分配大小算体量：目录枚举信息类 19 已带 `AllocationSize`；
   - `age_basis`：同一结构里有 `CreationTime`；
   - `keep_by` 按版本号；
   - 泄漏簇的数据（S1 模板严格、S2、S4，文件序列如 `apk_<提交号>` 留最新）；
   - 联接索引：记下各位置里的联接与目标，供服务判“被 X 引用”。读联接目标可能要新系统函数，要在契约里定；
   - 贵重件名与保留名标记（只看名字）；
   - 整盘的最大 10 个文件夹；
   - 不扫自己的 `.water-quarantine`；
   - 兜底目录的问题记到兜底组（计划第 62 行）；
   - `system_drive`。
3. **MANIFEST-M35**（M3 新包）：
   - 找、读（≤ 64 KB，自选位置往下 4 层）、校验 `.water-cleanup.json`；
   - 哈希（供信任）；
   - 转成计划目标与保护名单；
   - 建议把 `gitdir:` 一行的读取也放在这个包里，让扫描包保持不读内容（待契约定）。
4. **CLEAN-M35**（M4）：
   - 同盘移到 `<盘>:\.water-quarantine\<清理编号>\<原路径>`（复核同删除，另验同卷）；
   - 还原不覆盖；
   - 永久删除复用 `execute`（计划根设为隔离目录），另报每项剩下的条目与原因；
   - `inspect(路径)` 供核对隔离目录还在不在、剩多少；
   - 测试：保留名、结尾点或空格、隔离区里的联接、还原冲突、被占用的文件。
5. **DUP-M35**（M8）、**APPS-M35**（M9）：见 2.2 第 2 条。
6. **执行者规则** `W10-…-WORKER-RULES.md`、第一批六张单、`docs/dispatch/wave10/manifest.json`；两个检查器加 `WATER-W10-*` 的 wave 识别与 override 前缀；基线提交加轻量标签；建工作树 `.worktrees/w10-m1` 等；派前 baseline；派单句（每张一个代码块）。
7. **IPC/SERVICE/HOST/UI-M35**（M5、M6、M7）：
   - 结论视图与决定命令（设计 v2 第 6 节与 3.12 的汇总行），界面不自己算；
   - 隔离区命令（含 `quarantine_reveal`）、查重命令、会话开关；
   - 系统建议、空间分布、卸载残留（M9 + 服务）、已脱离工作树、被联接引用、贵重件；
   - “上次没清完”卡；
   - 外部大扫除后“几天后满”重新起算（第 30 行）；增长基准日期的修正（第 63 行）；
   - 界面测试的精确个数在契约里重新授权；配套假宿主夹具。
8. 派单后：复盘“删了还剩”（2.1）；按基准表做合成夹具生成器（M3.5 验收用）；Water 自己的 `.water-cleanup.json`，并请 `denglou` 总控写一份。

## 3. 等用户 / 悬而未决

1. 两个隔离目录等用户删：
   - `F:\_water-quarantine-20261102-dl`（只剩 `nul`）：`cmd /c 'rd /s /q "\\?\F:\_water-quarantine-20261102-dl"'`；
   - `F:\_denglou-quarantine-20261102`（5.72 GB，0 个联接）。
2. `yb-release` 的正式签名离线备份：要不要从 EAS 再下一份，由用户自己定、自己操作。
3. “清、压、炼”的排期（压缩归档、会话瘦身都不在第十波）。
4. 旧工作树可清：`accept-w9-l1～l4`、`w9-l1～l4`、`.local\w2-accept` 里的 `w2-d`。整合树 `integ-w8a`、`integ-w8b` 现在在 `controller/integ-w9a`、`controller/integ-w9b` 分支上，第七次整合可以接着用。清之前照固定做法核对，要用户同意。

## 4. 这一段新确认的事实与规矩

- **界面**：用户嫌现有界面“太复杂了”“不知道怎么用”，结论优先、少看（记忆 `water-ui-simplicity`）。设计稿出图：`node scripts/design/render-mockup-previews.mjs <画面,…> docs/design/water-ui-v2`；地址带 `?s=<画面>` 时隐藏设计稿的切换条。
- **复验工具的做法**：在整合树里临时加总控示例，装、编、跑、还原（`.local/w9-integ6/replay.sh install|build|restore`），树回到干净；示例从不调用 `clean_start`。真实数据的输出脱敏后才入库（`redact.cjs`）。
- **“几天后满”只扣 Water 自己的清理**：外部大扫除会让它显示“没有减少”，第十波改（第 30 行）。
- **时间**：Git Bash 的 `TZ=Asia/Tokyo` 不生效，取当地时间用 `PowerShell Get-Date`。
- 整合检查分开跑：树 A 逐部分顺序跑，服务单独跑，真窗口最后跑；第九波验收时四棵树同时跑出过进程中止。

## 5. 这一段新踩的坑

- Git Bash 会吞 `node -e`、`sed` 参数里的反斜杠（`F:\Mirasim-A` 变成 `F:Mirasim-A`，STATUS 里出现过一次，已修）。带 Windows 路径的一律用 Write 写成脚本文件再跑，或用 Edit 改文档。
- release 冒烟脚本 `scripts/acceptance/w4-g6-second-instance.ps1` 不是 DPI 感知的，截图只截到窗口左边约 80%（遗留，以后改）。
- 第九波 L2 受阻是我写单时把“夹具只建普通文件”写死了，原有测试本来就建联接与硬链接：写夹具限制前先 grep 原测试。

## 6. 本地文件

- 第六次整合与复验：`.local/w9-integ6/`。含覆盖清单、运行脚本、`replay/` 原始输出，原始输出带真实路径、不进 git。
- release：`.local/release/water-0.1.0-bb92c87e/water.exe`，sha256 `ddc0644cdff7f74e32c715bd1c57c9fefedad7b38889f16ccde4fb90ece02f3c`。
- 清理普查与计划：`.local/cleanup-20261101/`（真实路径，不进 git）。
- 写规则用的两个小脚本：`.local/w10-prep/plan-shapes.cjs`、`plan-items.cjs`（只读，打印计划里的路径形状）。

## 7. 接手粘贴语

```text
交接里写了（F:/new/smaltalk/water/docs/CONTROLLER-HANDOFF-20261102-14.md）：读交接报告，准备接手 Water 总控，从第 2.3 节第 1 步继续第十波的契约。
```
