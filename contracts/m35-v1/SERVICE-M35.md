# SERVICE-M35：服务算结论、分两块清理、管隔离区与查重（W10-M7）

2026-11-05，总控（Claude）冻结（11-02 起草，11-05 按通读结果修订）。补充 [SERVICE](../desktop-v1/SERVICE.md)、[SERVICE-HARDENING](../hardening-v1/SERVICE-HARDENING.md)、SERVICE-M2、SERVICE-M3-FIX、[SERVICE-M3C](../m3c-v1/SERVICE-M3C.md)（含 ADD-01）与 [SERVICE-M3D](../m3d-v1/SERVICE-M3D.md)，冲突时以本文为准。只改 `packages/water-service/`。

**第二批**：等 M1 规则、M2 扫描、M3 项目声明、M4 执行器、M8 查重、M9 已安装程序都验收合入后才派，工单给出合入后的首次 HEAD。产出的形状见 [IPC-M35](IPC-M35.md)。依据：[设计 v2](../../docs/design/water-ui-v2/DESIGN.md) 第 3～6 节，[第十波计划](../../docs/dispatch/wave10/PLAN.md)第 2 节，[ADR-019](../../docs/decisions/ADR-019-project-declarations-and-quarantine.md)。

## 1. 原则与边界

- **结论由服务算**：卡片、汇总行、“其它 N 项”、合并行、排序、计划体量都在服务里算好；界面只发 ID 与决定（设计 v2 第 1 节第 5 条、第 3.12 节第 8 条）。
- **只往安全的方向改资格**：服务可以把扫描判为可清的条目改成不可清（加原因），不能反过来；唯一例外是第 6.4 节“上次没清完”的年龄门槛，那是计划第 27 行拍板的。
- `Cargo.toml` 加三个 path 依赖：`water-cleanup-manifest`、`water-dup-finder`、`water-installed-apps`（检查器的依赖白名单为服务加这三个）。不加别的依赖。
- 旧命令、旧形状、旧记录照旧可用（IPC-M35 第 1 节）；第九波以前的扫描与清理记录读得回来。
- 服务对 `MatchSpec`、`InUseMode`、`ItemStatus`、`SkipReason` 的完整匹配照旧编译（前几批没加变体）；新类型用新的匹配。

## 2. `Platform` 新增方法

都带缺省实现，现有的假平台不改也能编译：

```rust
fn recycle_bin(&self, _root: &str) -> Option<u64> { None }          // 盘的回收站字节数；Windows 用 SHQueryRecycleBinW
fn installed_apps(&self) -> Option<water_installed_apps::AppList> { None }  // Windows 调 read_installed
fn quarantine_roots(&self) -> Vec<String> { Vec::new() }            // Windows：每个固定盘的 <盘>:\.water-quarantine
fn quarantine_base(&self, _root: &str) -> Option<String> { None }   // 传给执行器的 QuarantineTarget.base；Windows 为 None
```

- `SHQueryRecycleBinW` 是服务新增的唯一系统函数，只读；检查器的 `allowedFfi` 为服务加它。
- 假平台在测试里把隔离根放到本树 `.local/` 下，真实盘根永远不会被测试写到。

## 3. 设置第三版

`settings_version` 改为 3；读 1、2 版时补缺省值。新增键（都可缺省为空）：

| 键 | 每条 | 上限 | 用途 |
|---|---|---|---|
| `sessions` | `{tool, enabled, days}`，`days` 为 7、30、90 | 每个工具一条 | 会话开关（ADR-019 第 5 节），缺省关 |
| `trusts` | `{path, hash, trusted_at}`，`hash` 为 MANIFEST-M35 的小写十六进制 | 256 | 信任的项目声明 |
| `fixed_marks` | `{group_id, fixed_at}` | 256 | 泄漏簇“标记为已修”（计划第 41 行） |
| `keeps` | `{key, bytes, decided_at}` | 1024 | 卡片选过“保留”的（设计 v2 第 3.12 节第 5 条） |

超上限时按时间丢最旧的。原有的类别、自选位置、跳过名单不变。

## 4. 体检

### 4.1 范围与计划

- `scan_start {locationIds}` 按 IPC-M35 第 2 节定范围。`drive-x` 作为本次的自选位置（`root_id` 为 `drive-x`），不写进设置；这个盘已经加进自选位置时，直接用已有的那一条（`add_root` 给盘根的 ID 也是 `drive-x`，不得重复加，否则规则包报重复 ID）。
- 规则：`resolve_plan_with(rules, folders, custom_roots, PlanOptions{sessions}, …)`，其余参数（含 `created_at`）照原来调用 `resolve_plan` 的传法；`sessions` 取设置里开着的工具，`min_age_days` 为它的天数（RULES-M35 第 4.2 节）。
- 目标照旧按“受保护或类别开着”筛；没选 `common` 时，去掉不属于所选自选位置的目标（含受保护的）。
- **项目声明**：设置里每条信任记录，若声明文件在本次范围内，先 `read_manifest`；哈希与记录相同才 `to_targets(…, true)`，否则这次不用它（`Locations` 里显示 `changed`）。转出的目标这样进计划：把规则计划的 JSON（`plan_to_json`）的 `targets` 末尾追加这些对象，再用规则包的 `ScanPlan::from_json` 读回（RULES-M35 第 7 节接受它们），服务手里的 `plan` 因而含这些目标，清理时按它找条目的 `root`；扫描照旧用这份 JSON 交给扫描包。
- 扫描调用 `scan_full`，三个开关都开（SCAN-M35 第 7 节）。
- 选了 `drive-x` 时，扫描完再对盘根跑 `space_overview`（进度里的阶段写“空间分布”）；失败照实记，不影响体检状态。

### 4.2 扫描后的补充（写进扫描记录的可选键，旧记录没有就当空）

1. `declarations`：`ScanExtras.declarations` 里每个文件 `read_manifest` 一次，记 `{path, hash, size, valid, error_code, manifest}`。
2. 资格调整（只改成不可清，原因用中文，进 `reason_zh` 与 `notes_zh`）：
   - 与任何一份声明（信任与否）的 `protected` 重叠（`protects` 非 None）：“项目声明为不能碰”；
   - `referenced_count > 0`：“被 <第一个联接> 引用，改指别处后可清”，并出一条线索（第 5.4 节）；
   - **推荐**组里 `valuable_count > 0` 的条目：“含签名、密钥等贵重文件：<前三个名字>”；需确认的组里不改资格，卡片证据写出这些名字；
   - 条目**自己的名字**是保留名或结尾是点、空格（`odd_names` 里有它自己的名字）：“名字特殊（如 nul），这一版只能清理它所在的文件夹”——执行器的计划路径校验拒收这种名字，放进计划会让整份计划无效；
   - 规则带 `installed_names`，且 `installed_apps()` 里 `find(list, &name_tokens(名称))` 得到：整组不可清，“<名称> 还装着，这是它的数据”；查不到时卡片写“<名称> 似乎已卸载，这是它留下的数据”；`installed_apps()` 为 None 时整组不可清，“查不到已安装程序列表”。
3. 备注（不改资格）：
   - `installer-files` 组的条目：`find(installer_tokens(文件名))` 非空时“对应的软件已经装好：<名称> <版本>”；
   - `git-worktrees` 组的条目：`read_git_link` 为 `detached` 时“已脱离 git”，为 `valid` 时“仍登记在 <gitdir 的上两级>”；
   - 条目**里面**有怪名（`odd_count > 0`，且不是条目自己的名字）：“里面有名为 <第一个> 的文件，资源管理器删不掉，Water 能删”。
4. `recycle_bins`：每个固定盘 `recycle_bin(root)`，记字节数。
5. `space`：每个 `space_overview` 的结果。

### 4.3 体检进度

`ScanProgress.locations` 一行一个所选位置：常用位置看非自选目标是否都走完，盘与文件夹看对应 root 的目标。

### 4.4 新字段的在用判断与读回旧记录

- **`root_levels`**（RULES-M35 第 2 节）：组的 `in_use` 带 `root_levels: k` 时，判断在用用条目路径往上第 k 级的目录（不足 k 级用盘根以下最高的一级）交给 `Platform::in_use`；`InUseSpec` 只收 `mode` 与 `processes`，`root_levels` 由服务自己剥下来用。体检时与 `clean_prepare` 重取快照时同样处理。
- **读回扫描记录**（`Record::load`，service.rs 约 95～115 行）放宽三处，不再因此丢掉整条记录：
  1. `in_use` 里的 `root_levels` 键；
  2. `leak:` 开头的簇组（它们不在计划目标里，`rule_id` 为 `leak-cluster`）；
  3. `decl:` 开头的声明目标组（记录里存的计划已含它们）。
  别的不认识的组照旧丢弃。
- 这三处在第一批合入后、本单合入前的主线上会出错（RULES-M35 第 2 节“过渡期”），本单合入即修好。

## 5. 结论视图

### 5.1 单位与合并

- **单位**：一个组，或同一 `rule_id` 在两个以上组里出现时合成的一个合并单位，ID 为 `m:<rule_id>`。`leak-cluster` 与 `decl:` 开头的规则不合并（每个簇、每份声明各是一个）。
- 单位的体量、可清项数按成员相加；级别取成员中最高的（推荐 > 需确认）。

### 5.2 计划

- 缺省：推荐级、可清的单位算“清”；其余算“不清”。
- 决定（IPC-M35 第 3 节）按单位、类别、汇总行、条目四层叠加：条目 > 汇总行 > 单位 > 类别。
- `plan.categories`：推荐单位按 `category` 汇总，按体量降序取前 7 个，其余合成“其它”（`category_id` 为 `other`）；`is_new` 为这一类里有比增长基准新出现或变大的组。
- `plan.summary_zh`：最大的两类（“缓存 12.1 GB · 旧版本 3.3 GB”），有增长基准且推荐体量变大时加“比上次多 X”，扫描时判为在用的可清项有体量时加“<产品名> 开着，会跳过约 X”（产品名照现有对照表）。
- `plan.expected_skip`：同上，按扫描时的在用情况。

### 5.3 卡片

1. 候选：级别为需确认、有可清项、没被“以后都跳过”的单位，外加第 6.4 节的“上次没清完”。
2. **上次保留过**：`keeps` 里有 `key`（单位 ID）且现在的可清体量不超过记录的 `bytes` × 1.01 + 1 MiB 的，决定缺省为“保留”，不出卡，合进 `kept_before`。
3. 其余按可清体量降序（同体量按 ID），**前 5 个**出卡；剩下的合进 `more_cards`（`max_bytes` 为其中最大的）。
4. `kind`：`leak-cluster` → `leak`；带 `session_tool` 的规则 → `session`；`decl:` → `declaration`；第 6.4 节 → `unfinished`；其余 `group`。
5. 文案：
   - `title_zh` 一句结论：泄漏卡“<父目录末两级> 里有 N 个同模板目录，还在长 / 已经不长了”；会话卡“<工具> 有 N 个 30 天前的会话”；卸载残留“<名称> 似乎已卸载，这是它留下的数据”；其余用组标题加体量依据。
   - `evidence_zh` 一行：数量、最早与最新时间、所在位置；有贵重件时加“含 <前三个名字>”；
   - `warning_zh`：泄漏卡“清了不修，会再长回来”；会话卡“清掉后这些对话不能再续接或回看；可以先放进隔离区试试”；
   - `menu`：都有 `skip`、`detail`；有线索的加 `copy_clue`。
6. 选“保留”时写进 `keeps`（`bytes` 为当时的可清体量）；改回“清理”或“未决定”时删掉这条。

### 5.4 交给 agent 的线索

按体量降序，最多给 3 条，其余计数：
- **泄漏簇**（需确认与疑似都算）：一句“<父目录> 里有 N 个 `<模板>`，每天新增约 k 个”；`copy_text` 为检查清单：模板、数量、总量、最近 14 天每天新建几个、最新一个的时间、所在仓库根（往上找第一个含 `.git` 的目录，只看在不在）、“先找出生成它们的代码并修好，再清存量；修好后用 Water 标记为已修”。
- **已脱离 git 的工作树**：按父目录合一条，“<父目录> 里 N 棵树已脱离 git，要先查有没有未提交的改动”；清单照第十波计划第 3 节。
- **被联接引用的**：“<联接> 指向 <条目>，改指别处后可清”。
- **保留名文件**：“<目录> 里有名为 nul 的文件，多半是脚本里写了 `> nul`；在 bash 里应写 `/dev/null`”。

### 5.5 收起的几行

按 advisory、protected、space、system 的顺序，有才出现：
- **advisory**：仅供参考的组（不含系统建议），`text_zh` 写总体量与前三个名字，`rows` 前 10 个；
- **protected**：受保护的组，同上；
- **space**：每个整盘的空间分布，“F 盘最大的是 denglou 319 GB、Steam 194 GB…”；`rows` 为前 10 项，`note_zh` 为归属标签：`has_git` → 项目；名字（不分大小写）是 `steamapps`、`Steam`、`SteamLibrary`、`Epic Games`、`WeGameApps`、`Riot Games`、`Games` 之一 → 游戏；`Program Files`、`Program Files (x86)`、`ProgramData`、`Windows` → 系统与程序；`$Recycle.Bin`、`System Volume Information` → 系统；`.water-quarantine` → 隔离区；其余文件夹 → 资料；文件 → 文件；
- **system**：带 `advice_zh` 的组，加上 `recycle_bins` 里大于 0 的盘（“回收站（F 盘）”，`note_zh` 为“在资源管理器里清空回收站”）；`text_zh` 为“N 条系统建议，可以再腾出约 X，要在 Windows 设置里改”。

### 5.6 版本与过期

- `version` 为 `cv-<scan_id 末 8 位>-<序号>`，每次决定序号加一。决定只在内存里；服务重启后回到缺省（`keeps` 除外）。
- `stale` 为真的四种来源（IPC-M35 第 3 节同此）：① 有了更新的体检；② 这次体检已被清理用掉；③ 跳过名单变了；④ 会话开关或项目声明的信任变了。`stale_reason_zh` 写哪一种。过期时 `conclusion_decide` 与 `clean_prepare` 返回 `stale`。

### 5.7 明细与抽屉的汇总行

- `detail_get`：`category` 模式一节一个类别（受保护与仅供参考合成最后一节），`location` 模式一节一个位置；同一节里单位按体量降序；和增长基准相比体量与项数都没变的单位折进 `unchanged`。
- 抽屉的 `rows`：组里不超过 8 项时一项一行（`row_id` 为条目 ID）；否则：
  1. 同 `Item.template` 的条目（≥ 2 个）合成一行，标签把模板里的 `<r6>` 换成 `******`、`<p8>` 换成 `********`、其余尾巴与 `#` 换成 `*`（“`verify-******` × 81”）；
  2. 剩下的按所在的父目录合并（≥ 2 个）；
  3. 按体量取前 7 行，其余合成“其它 N 项”。
  - `row_id`：`r:` 加 16 位小写十六进制，是“组 ID + `\n` + `t`/`d`/`other` + `\n` + 模板或父目录的 ASCII 小写”的 SHA-256 前 16 位。只含合法 ID 字符、不带路径；同一份结论里稳定，服务自己记下它对应哪些条目。
  - 行内全部在用时 `selectable` 为假，`release_zh` 为解除条件（规则的 `in_use_zh`，没有时“<产品名> 正在使用，关掉后可清”）。
- 合并单位（`m:`）的抽屉：一行一个位置，`row_id` 为该位置上的组 ID；`{row: 组 ID, include}` 按 `{group: 组 ID, choice: clean 或 keep}` 处理。
- `CleanResultView.quarantined.quarantine_ids`：这次清理产生的各盘编号，按盘符排序。
- `group_items` 按 IPC-M35 第 4 节，至多 200 项，按体量降序。

## 6. 清理

### 6.1 两块

- 计划按 IPC-M35 第 5 节的形状生成。“你选的”一块：需确认级的单位、`leak-cluster`、`decl:` 开头的组、会话、第 6.4 节中原为需确认的；其余是“直接删除”。
- `chosenMode` 为 `quarantine`：“你选的”用执行器的 `quarantine`，**按盘分批、每个盘一个编号**：`quarantine_id` 为本地时间 `YYYYMMDD-HHMMSS` + `-` + 盘符小写（如 `20261105-163012-f`），同秒再有一次时在盘符前加 `-n`；`base` 取 `quarantine_base`。每个编号各一份记录、一张卡片。为 `delete`：两块都用 `execute`。
- `clean_start` 先跑直接删除，再按盘跑隔离；同一个日志文件；停止时都照执行器的停止规则。
- **解锁对**：凡是目标带 `unlocks_target_ids` 的条目（会话规则，以及 `grok-home-caches` 这类普通规则，RULES-M35 第 4.1 节）都填 `unlocked_paths`：受保护的条目里严格包含它、且目标在它的 `unlocks_target_ids` 里的那个路径。不填时执行器会因保护路径重叠拒收整份计划。
- **泄漏簇的条目**（不在计划目标里）：`root` 为 `ClusterInfo.parent`，`rule_id` 为 `leak-cluster`，`level` 为 confirm，`min_age_hours` 为 24。`clean_prepare` 时用扫描包的 `name_template` 对每个成员的当前名字重算一次，与簇的模板不一致的不进计划（计划第 46 行）；扫描之后新长出来的成员本来就不在计划里。
- **声明目标的条目**：照常按计划里的目标找 `root`（第 4.1 节已把它们放进 `plan`）。
- `clean_prepare` 时重新取进程快照，算 `expected_skip`；会话卡被选时 `chosen.note_zh` 为“清掉后这些对话不能再续接或回看”。

### 6.2 隔离记录

`quarantine/<quarantine_id>.json`：`{record_version:"water.quarantine-record.v1", quarantine_id, created_at, clean_id, root, entries:[{item_id, group_title_zh, original, rel, kind, identity, bytes, valuable_names}], last_purge:null|PurgeReport}`。只记 `moved` 的项。原子写同现有存储。

### 6.3 结果与历史

- `CleanResultView.quarantined` 取隔离报告；`groups[].status` 为 `quarantined` 的组只是移走了。
- 历史清理一行：“清理 N 组，跳过 M 项”，有隔离时加“，K 项进了隔离区”。

### 6.4 上次没清完（计划第 27 行）

上一次清理报告里 `partial`、`failed` 的条目（不含在用与停止），这次扫描里同路径的条目仅因 `too_recent` 不可清时，改为可清，合成一张 `unfinished` 卡“上次没清完的 N 项”，证据写上次的原因；计划里这些项的 `min_age_hours` 为 0，在用检查照旧。

### 6.5 查重的清理

`clean_prepare {dedupeId, dedupeVersion}`：勾上的组里每个可移除的副本一项（`kind` 为 file，`identity` 取查重结果，`root` 为查重位置，`level` 为 confirm，`min_age_hours` 为距查重结束的小时数向上取整、至少 1），全部进隔离区。建议保留的那份 `identity_of` 已变或不在时，这组不进计划，预览写一句。`link_count > 1` 的副本不可移除（移走一条路径腾不出空间，含根外的链接）。

## 7. 隔离区

- **核对**：启动时、每次清理与还原与永久删除之后、每次体检结束时，对 `quarantine_roots()` 逐个 `list_quarantines`，对每个编号 `inspect`，结果缓存；`app_state` 与 `quarantine_list` 用缓存。
- 编号目录有记录：按记录出卡；没有记录（别处来的、记录丢了）：照样出卡，`restorable` 为假，只能永久删除或打开文件夹。
- 记录在、目录没了：用户自己删了，删掉记录，卡片消失；目录只剩一部分：按 `inspect` 的体量更新。
- `QuarantineBar`：总体量、最早一张的天数、删不掉的项数与体量；全空时为 null（设计 v2 第 3.1 节第 0 条）。
- 删不掉的原因文案（`reason_zh`，`retry` 为真表示 Water 能删）：`in_use` “有程序正在用（关掉后再试）”，项是目录时“有程序正占着这个文件夹（可能是打开的终端）”；`odd_name` “名字是系统保留名 <名字>（Water 能删，点再试一次）”；`long_path` “路径太长（Water 能删，点再试一次）”；`read_only` “只读文件（Water 能删，点再试一次）”；`reparse` “云端占位或特殊链接，请在对应程序里处理”；`access_denied` “没有权限”。
- `quarantine_restore`：按记录给 `RestoreRequest{rel, identity, to}`；`beside` 为真时 `to` 为原路径旁边第一个不存在的“<原名>（还原 n）”（n 从 1 起）。还原了的项从记录里删，记录空了删文件。
- `quarantine_delete`：忙时 `busy`；`busy` 为 `purging`；`clean_stop` 也停它（宿主退出时靠这个，HOST-M35 第 4 节）；线程 `water-purge`；日志 `journal/<quarantine_id>-purge.jsonl`；报告写进记录的 `last_purge`；`dir_removed` 时删记录。历史一行“永久删除隔离区 · 腾出 X”，有剩下时加“，还剩 N 项”。
- 7 天提醒：`days ≥ 7` 时 `reminder_zh`，不自动删。
- `QuarantineView.roots[].target_id` 为 `qroot-<盘符小写>`（测试里的隔离根按顺序为 `qroot-t1`、`qroot-t2`…）。
- **内部命令** `quarantine_locate {targetId}` → `{path}`：只给宿主用（HOST-M35 第 3 节），不在 IPC 的命令表里；`path` 必须是 `quarantine_roots()` 里的根或其下的编号目录，否则 `not_found`。

## 8. 查重

- `dedupe_start`：忙时 `busy`；`busy` 为 `deduping`；服务释放时取消它；线程 `water-dedupe`；`DupOptions{roots:[位置路径], min_bytes: 1 MiB, prefer: [], protected: 范围内各声明 protected 模式的字面前缀路径（至多 1024 条）}`。`DedupeProgress.found_bytes` 取 `DupProgress.found_bytes`。
- 结果存 `dedupes/<dedupe_id>.json`，只留最近 5 个。
- `DedupeView`：组的 `name_zh` 为建议保留那份的文件名；`keep.reason_zh` 按 DUP-M35 第 4 节决定它的那一条写：“这份在项目声明保护的位置里”“这份在‘以这里为准’的文件夹里”“这份更早”“这份名字不带副本尾巴”“按位置排在前面”；`extra_bytes` 为各组 `reclaimable_bytes` 之和；`skipped_zh` 由 `skipped` 计数写。
- `dedupe_decide` 在内存里记勾选；版本 `dv-<dedupe_id 末 8 位>-<序号>`。

## 9. 设置命令

- `locations_set_session_cleanup`：写 `sessions`；`Locations.sessions` 一行一个带 `session_tool` 的规则的工具，`retention_zh` 取它受保护的会话规则，`bytes` 与 `largest_bytes` 取最近一次体检里受保护会话组的体量与最大一项。
- `manifest_trust`：`trusted` 为真时记 `{path, hash}`（哈希取最近一次扫描读到的），为假时删；`invalid` 的不能信任。`Locations.manifests` 取最近一次扫描的 `declarations` 与信任记录；`manifest_id` 为 `mf-` 加路径小写的 SHA-256 前 12 位。

## 10. 趋势与增长

- `Trends.clusters`：最近一次体检里的每个 `leak-cluster` 组：
  - 疑似（级别为仅供参考）→ `suspected`；
  - 有 `fixed_at` 且没有成员的最近活动晚于它 → `stopped`；
  - 与增长基准里同 `group_id` 的组相比，成员数或体量变大 → `growing`；
  - 其余 → `stopped`。
  - `rate_zh`：“每天约 +k 个 · +X”；`copy_text` 同第 5.4 节。
- `cluster_mark_fixed`：写或删 `fixed_marks`。标记后卡片证据只数标记日期以后新出现的成员（计划第 41 行）。
- **几天后满**（计划第 30 行）：相邻两点之间，可用空间增加超过 max(1 GiB, 盘容量的 2%)，且这段时间里 Water 自己的清理腾出的不到这次增加的 90% 时，从这一点之后重新起算；用了重新起算时 `note_zh` 为“Water 以外的清理之后重新起算”。点数不够时照旧为 null。
- **增长基准不在了**（计划第 63 行）：重新载入时 `growth_base_scan_id` 指向的记录已被裁掉，洞察写“与更早的一次体检相比”，组详情的 `growth.since` 为 null。补测试：两条记录都满足 24 小时门槛时取较新的一条。

## 11. 测试

`tests/service_v1.rs` 现有的六个测试照旧；在同一个文件里**新增**下面六个测试，共精确 12 个（检查器每张单只跑一个测试目标）：

| 测试 | 标记 | 内容 |
|---|---|---|
| `m35_scope_and_plan` | `SERVICE_M35_SCOPE` | `locationIds` 的各种合法与非法（已加过的盘用原来那条）；`root_levels` 按上级目录判在用；带 `root_levels`、簇组、声明组的扫描记录重启后读得回；只选文件夹时不扫常用位置；会话开关生成目标与 `unlocked_paths`；信任、改过、不信任三种声明对计划的影响；`protects` 让条目不可清；第 4.2 节每种资格调整与备注（含 `installed_names` 装着与没装、列表取不到） |
| `m35_conclusion_cards` | `SERVICE_M35_CONCLUSION` | 7 个需确认单位只出 5 张卡、其余进 `more_cards`；同规则三个位置合成 `m:`；“保留”记进 `keeps`，下次体量没变不出卡、变大了又出卡；类别开关与“其它”；四层决定的叠加；`stale` 的四种来源；收起的四行与线索的上限；一次结论的行数估计不超过 20 |
| `m35_rows_and_detail` | `SERVICE_M35_ROWS` | 8 项以内逐项；模板合并与标签；父目录合并；“其它 N 项”；在用行的解除条件；`detail_get` 两种模式与 `unchanged`；`group_items` 的搜索 |
| `m35_clean_split` | `SERVICE_M35_CLEAN` | 两块的划分；`quarantine` 与 `delete` 两种模式；隔离记录（两个盘各一个编号）；会话项与 `grok-home-caches` 带 `unlocked_paths` 后能移走或删掉；被引用的、声明保护的、推荐组里含贵重件的、名字本身特殊的项不进计划（需确认组里含贵重件的照常进“你选的”一块）；泄漏簇成员名字变了的不进计划；“上次没清完”卡；查重计划与保留那份变了时整组不进 |
| `m35_quarantine` | `SERVICE_M35_QUARANTINE` | 核对与常驻条；还原冲突与“还原到旁边”；永久删除时一个文件被占着 → 卡片变 `leftover`、原因文案、常驻条写“还剩”，放开后再删 → 卡片消失；没有记录的编号目录；用户删掉目录后记录消失；`quarantine_locate` 只认隔离根之下 |
| `m35_trends_history` | `SERVICE_M35_TRENDS` | 簇的三种状态与“标记为已修”；几天后满的重新起算；增长基准被裁掉时的文案；历史的四种新行；设置 1、2 版读成 3 版 |

- 测试里的隔离根都在本树 `.local/` 下（假平台的 `quarantine_roots` 与 `quarantine_base`）；查重、项目声明、`space_overview` 用本树 `.local/` 下的真实夹具。
- 原有断言中与本文必然冲突的，**获准修改**，其余不变：
  1. 设置版本 2 → 3 的期望；
  2. 若有断言 `scan_start` 带参数必为 `invalid`，改为“`{locationIds}` 以外的键为 `invalid`”；
  3. 命令名单若有逐个比对：服务新增 IPC-M35 的 16 个（`quarantine_reveal` 由宿主实现），另有内部命令 `quarantine_locate`；
  4. 测试工具 `age()` 同时设创建时间（`system-temp-old` 等规则改用较晚的时间算年龄后，只设修改时间的夹具会在 2027 年 1 月前后变成“太新”）。
- 假平台的 `windows` 在夹具里时，`system_drive` 推出的是本树所在盘根，以它为基的几条规则（页面文件、`tmp\chrome_*` 等）会只读地看那几个固定名字；测试的断言不得依赖这些组在本机存在或不存在。
- 新增三个 path 依赖是本单唯一获准的依赖改动（规则第 2 节“已有包依赖不变”的例外）。

## 12. 负控与真实冒烟

- **nc1**：“你选的”一块也用 `execute`（删而不移），测试以 `SERVICE_M35_CLEAN` 失败。
- **nc2**：卡片不限 5 张，测试以 `SERVICE_M35_CONCLUSION` 失败。
- **nc3**：不信任的声明也转成目标，测试以 `SERVICE_M35_SCOPE` 失败。
- （检查器每单最多三条负控；“被引用的条目不可清”由 `SERVICE_M35_SCOPE` 与 `SERVICE_M35_CLEAN` 的断言覆盖，不单列负控。）
- 负控只认 `src/` 里的改动。
- **真实冒烟**（`--mode real`，清理关闭）：只读体检常用位置，取一次结论视图与 `quarantine_list`，只输出卡片数、收起行数、线索数、结论行数估计、隔离卡片数；不输出路径与名字。
