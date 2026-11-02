# Water 总控交接报告（2026-11-02 第 15 份）

项目根 `F:/new/smaltalk/water`，总控 Claude。因用户要压缩上下文而写（11-02 20:45 JST）。本报告取代[第 14 份](CONTROLLER-HANDOFF-20261102-14.md)作为当前入口。

以下仍然有效：
- 第 14 份第 2.1、2.2 节（第 2.2 节第 3 条与第 2.3 节第 4 条有改动，见本份第 2 节）、第 3～6 节；
- 第 13 份第 4、5 节；
- 第 12 份第 5、6 节；
- 第 10 份第 1 节（远端、五步推送、提交身份）、第 5、6 节；
- 第 11 份第 4.1 节（收单通用流程）；
- 第 9 份第 4.1 节、第 8 份第 1 节、第 5 份第 7 节硬规矩。

本份只写变化与补充。所有回复用中文；汇报里的 GB 一律按 1024 换算。

## 0. 一句话现状

- 第十波（M3.5）仍在派前准备，**还没有派任何单**。
- `contracts/m35-v1/` 已起草六份，**都未冻结**（文件头写着“草案，未冻结”），提交 `70980037`，三处与 E 盘镜像一致：

  | 契约 | 单 | 要点 |
  |---|---|---|
  | [RULES-M35](../contracts/m35-v1/RULES-M35.md) | M1 规则 | 已审完；第 11 节是审定改动表 |
  | [SCAN-M35](../contracts/m35-v1/SCAN-M35.md) | M2 扫描 | 新 marker 与条件、分配大小、年龄、按版本号留最新、解锁对、泄漏簇、贵重件与怪名、不扫隔离区、`scan_full`（联接索引、声明文件）、空间分布 |
  | [MANIFEST-M35](../contracts/m35-v1/MANIFEST-M35.md) | M3 项目声明（新包） | `.water-cleanup.json` 第一版、转扫描目标、`protects`、`read_git_link` |
  | [CLEAN-M35](../contracts/m35-v1/CLEAN-M35.md) | M4 执行器 | `unlocked_paths`、移入隔离区、复原、彻底删除、列出与查看；第 7 节“删了还剩”成因表 |
  | [DUP-M35](../contracts/m35-v1/DUP-M35.md) | M8 查重（新包） | 同大小 → 开头 64 KiB → 完整 SHA-256；硬链接算一份；不读云占位 |
  | [APPS-M35](../contracts/m35-v1/APPS-M35.md) | M9 已安装程序（新包） | 三处卸载登记只读三个值；安装包与卸载残留按名字匹配 |

- [基准表](dispatch/wave10/BENCHMARK.md) C17、C18、C20、D3、D4、D7/D8、E2、F15 按审定规则改了；[计划](dispatch/wave10/PLAN.md)第 19 行（旧备份不留最新）与第 5 节第 4 条（契约进度）已改。

## 1. 这一段的提交（第 14 份 `0cca47af` 之后）

| 提交 | 内容 |
|---|---|
| `70980037` | 六份契约草案；基准表与计划回填 |
| 本报告的提交 | 第 15 份交接；STATUS 指向本份 |

## 2. 与第 14 份计划不同的地方（已写进草案，派前不必再议）

1. **建目录不用标准库**：执行器 `src/` 里一直没有 `std::fs`，CLEAN-M35 改为只在一个函数 `create_dir_at` 里用 `NtCreateFile`（只许 `FILE_CREATE`、单段名、相对父句柄）。改名用已有的 `SetFileInformationByHandle` 类 3，`ReplaceIfExists` 恒为 0。检查器的 `allowedFfi` 要加 `NtCreateFile`，并核对它只出现一处。
2. **彻底删除不复用 `execute`**：计划项的路径要过 `path::validate`，保留名、结尾点或空格的名字过不了；所以单独写 `purge`，按句柄后序删，名字取自目录列表。
3. **`gitdir:` 读取放在 MANIFEST 包**（`read_git_link`），扫描包仍然不读内容。
4. **隔离记录由服务保存**：执行器不在隔离区里写任何文件；隔离区的目录结构就是原路径，没有记录也能 `purge`，复原要服务给 `rel` 与身份。
5. **扫描结果不加字段**：新东西放在 `Group`、`Item`、`InUse` 的可选字段与 `scan_full` 返回的 `ScanExtras` 里（服务 `service.rs` 约 829 行构造 `ScanResult` 字面量）。
6. **`PlanItem` 加了 `unlocked_paths`**：历史验收脚本 `scripts/acceptance/w2-d-controller-cases.rs` 用字面量构造 `PlanItem`，从此不再随新源码编译；它是第二波的存档证据，不再跑。

## 3. 下一步（按顺序）

### 3.1 剩下四份契约：IPC、SERVICE、HOST、UI

前六份把下面这些明确留给了服务（M7）、宿主（M5）、界面（M6），写这四份时逐条接住：

- **服务（M7）**：
  - 会话开关：RULES-M35 第 4.2 节的 `resolve_plan_with` / `PlanOptions` / `SessionSwitch`，开关存在服务的设置里，每个工具一个，缺省关；清理时“直接删除 / 先进隔离区”二选一。
  - 解锁对：把 `unlocks_target_ids` 指定的那一对带进清理计划的 `unlocked_paths`（CLEAN-M35 第 2 节）。
  - 项目声明：调用 `read_manifest`；信任记录（路径 + 哈希，文件一改就要重新信任）；`protects` 永远生效，重叠的条目不进清理计划；只有信任的声明经 `to_targets` 进扫描计划。
  - 工作树：`git-worktrees` 组的条目用 `read_git_link` 分成“登记有效 / 已脱离”，都仍是仅供参考。
  - 泄漏簇：S3（只增不减，靠快照）、S5（没人在用，靠进程）；“标记为已修”记日期，之后只数新长出的成员（计划第 41 行）；清理前按 `Item.template` 重新核对（第 46 行）。
  - 贵重件：`valuable_count > 0` 的条目不能是推荐（SCAN-M35 第 6.1 节）。
  - 联接：被联接引用的条目（`referenced_count > 0`）不移入隔离区、不删，写“被 X 引用”。
  - 隔离区：哪些组先进隔离区（需确认的组、泄漏簇、项目声明的组），推荐的缓存照旧直接删；调用 `quarantine`、`restore`（含“还原到旁边”的 `to`）、`purge`、`list_quarantines`、`inspect`；启动与体检时核对各隔离目录（常驻隔离栏，计划第 64 行）；7 天提醒，不自动删；删了还剩时按 `inspect` 的提示与 `purge` 的遗留原因写卡片（第 65 行）。
  - 已安装程序：安装包“已经装好”、应用数据“似乎已卸载”（APPS-M35 第 4 节）。
  - 查重：用户发起；`prefer` 与 `protected` 由服务给；多出来的清理时先进隔离区。
  - 空间分布的归属标签（项目、游戏、资料），按名字与 `has_git`。
  - 自选位置的 marker 目标归属（RULES-M35 第 3 节说明：`views.rs` 的 `custom_path`、`service.rs` 约 1073、1124、1277 行）。
  - 结论视图与汇总行（计划第 67 行、设计 v2 第 3.12 节），界面不自己算。
  - “几天后满”在外部大扫除后重新起算（第 30 行）；增长基准日期修正（第 63 行）。
- **IPC / 宿主（M5）**：上面每件事的命令；回收站大小用系统接口查（RULES-M35 删了两条回收站规则，基准表 C20、F15）；`quarantine_reveal` 用资源管理器打开隔离目录（界面只发隔离编号）；查重的开始、进度、取消；复制线索。
- **界面（M6）**：设计 v2 全部；常驻隔离栏；界面测试的精确个数在契约里重新授权；配套假宿主夹具。

### 3.2 之后

1. 六份草案连同四份新契约一起再读一遍，改掉互相对不上的地方，然后冻结（文件头去掉“草案”，记冻结提交）。
2. 执行者规则 `W10-…-WORKER-RULES.md`、第一批六张单（M1、M2、M3、M4、M8、M9）、`docs/dispatch/wave10/manifest.json`；两个检查器加 `WATER-W10-*` 的 wave 识别与 override 前缀；检查器 `allowedFfi` 加第 2 节第 1 条与 DUP、APPS 的系统函数；基线提交加轻量标签；建工作树 `.worktrees/w10-m1` 等；派前 baseline；派单句（每张一个代码块，界面单单列）。
3. 派单后：复盘“删了还剩”（第 14 份第 2.1 节；CLEAN-M35 第 7 节是按记录先写的表，复盘要逐个复现）；按基准表做合成夹具生成器；Water 自己的 `.water-cleanup.json`，并请 `denglou` 总控写一份。

## 4. 等用户 / 悬而未决

同第 14 份第 3 节，没有变化（两个隔离目录等用户删、`yb-release` 签名备份、“清、压、炼”排期、旧工作树清理要同意）。

## 5. 接手粘贴语

```text
交接里写了（F:/new/smaltalk/water/docs/CONTROLLER-HANDOFF-20261102-15.md）：读交接报告，准备接手 Water 总控，从第 6 节继续第十波（十份契约已起草，下一步是通读与冻结）。
```

## 6. 补记（11-02 21:00，压缩取消后接着写完四份）

- 用户取消了压缩、贴了第 5 节的旧粘贴语，于是在同一个对话里接着写完第 3.1 节：[IPC-M35](../contracts/m35-v1/IPC-M35.md)、[SERVICE-M35](../contracts/m35-v1/SERVICE-M35.md)、[HOST-M35](../contracts/m35-v1/HOST-M35.md)、[UI-M35](../contracts/m35-v1/UI-M35.md)。**十份契约都已起草，都未冻结**。
- 写这四份时顺带改的：
  - RULES-M35：补字段 `installed_names` 与第 31 条 `minimax-hub-leftover`（`%APPDATA%\@hilo`，H8）；规则总数 78 → 109；回收站改由服务经 `Platform` 查（基准表 C20、F15 同步）。
  - CLEAN-M35：`list_quarantines` 改收隔离根路径（测试的隔离根在 `.local/` 下）。
  - DUP-M35：结果加 `same_name_different`（设计 v2 第 3.13 节第 4 条）。
- 命令 19 → 36（新增 17 个，IPC-M35 第 1 节）。宿主唯一的新能力是 `quarantine_reveal`：经服务内部命令 `quarantine_locate` 取路径、自己再核、用 `explorer.exe` 打开；界面拿不到路径。退出时 `busy` 为 `purging` 也先停。
- 现状探查（服务、宿主、界面的代码面）的结论已写进四份契约；界面的硬约束见 UI-M35 第 1 节（没有 npm、测试个数按清单名字精确核对、`tokens.css` 逐字节相同）。
- **下一步**：
  1. 十份通读一遍，改掉对不上的地方；
  2. 写 `contracts/m35-v1/ui-fixtures-m35.json`（UI-M35 第 6 节的场景；能用服务在合成夹具上的输出就用，手写的要逐字段对照 IPC-M35）；
  3. 冻结（文件头去掉“草案”，记冻结提交与标签）；
  4. 第一批是 **八张**：M1～M6、M8、M9（M5、M6 按假后端做，第 14 份第 2.1 节表格）；M7 第二批；
  5. 检查器要加的：`WATER-W10-*` 的识别与 override 前缀；`allowedFfi`：执行器 `NtCreateFile`、扫描 `DeviceIoControl`（只 `FSCTL_GET_REPARSE_POINT`，SCAN-M35 原则）、查重 `GetFileInformationByHandleEx`、已安装程序四个 `Reg*`、服务 `SHQueryRecycleBinW`、宿主 `GetWindowsDirectoryW`；服务的三个新 path 依赖；新包 `cleanup-manifest`、`dup-finder`、`installed-apps` 的登记；UI 的 `tokensSource` 改指 v2；`nativeSteps` 按 UI-M35 第 5 节重写；
  6. 然后照第 3.2 节第 2、3 条。
