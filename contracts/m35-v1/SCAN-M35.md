# SCAN-M35：体量、年龄、泄漏簇、联接与名字检查（W10-M2）

**草案，未冻结**（2026-11-02，总控 Claude 起草；与 RULES-M35 等一起冻结）。补充 [SCAN](../checkup-v1/SCAN.md)、[SCAN-M3C](../m3c-v1/SCAN-M3C.md)、[SCAN-M3D](../m3d-v1/SCAN-M3D.md)，冲突时以本文为准。只改 `packages/junk-scan/`。

来由：[第十波计划](../../docs/dispatch/wave10/PLAN.md)第 2 节（“行 n”指那里的行号）第 1～3、6～8、10～11、25～26、33、37～39、43、46、62、67 行。计划 JSON 的新键由 [RULES-M35](RULES-M35.md) 第 7 节定义，本包按同一份 JSON 解析，两张单合入时一起合。行 23（读 `.git` 小文件的 `gitdir:`）不在本包，见 MANIFEST-M35。

**总原则**：
- 只看名字、元数据、时间与重解析点数据，**不打开任何文件读内容**（ADR-018）。
- 每个目录在一次扫描里最多列一次（SCAN-M3C），新功能一律用已经列出的清单。
- **`ScanResult` 不加字段**：服务在 `water-service/src/service.rs` 约 829 行构造它的字面量。新的结果放在 `Group`、`Item`、`InUse` 的可选字段里（服务不构造这三个的字面量），或放在新的“附加结果”里（第 7 节）。
- **`ScanOptions` 不加字段**：测试里有它的字面量。新开关放在新的 `ExtrasOptions` 里。
- `scan()` 的签名不变。对不含新键的计划，除第 2、6、8 节明确写出的变化（新的体量字段、名字检查字段、隔离区不扫、兜底组的问题归属、不可清理组的身份问题）外，结果与原来相同。
- 新增的原生调用只有：读同一次目录枚举缓冲里已有的 `creation`、`allocation`、`reparse_tag` 三个字段；对重解析点用只读属性访问打开后 `DeviceIoControl(FSCTL_GET_REPARSE_POINT)`；对单个文件条目必要时用已有的 `GetFileInformationByHandleEx` 读 `FileStandardInfo`。不加依赖。

## 1. 计划 JSON

按 RULES-M35 第 7 节解析全部新键，取缺省值时不出现，序列化回去与输入相同：

| 位置 | 新键 | 本包的类型 |
|---|---|---|
| 目标 | `git_is_copy`（只写 true） | `bool`，缺省 false |
| 目标 | `age_basis`：`"modified"` / `"latest_created_or_modified"` | 本包自己的 `AgeBasis`，缺省 `Modified` |
| 目标 | `keep_by`：`"activity"` / `"version_name"` | 本包自己的 `KeepBy`，缺省 `Activity` |
| 目标 | `unlocks_target_ids`（非空数组） | `Vec<String>` |
| `in_use` | `root_levels`（1～6） | `InUse.root_levels: Option<u8>`，`model.rs` 的 `InUse` 加字段 |
| `match` 的 marker | `{"kind":"dir_name_pattern","patterns":[…]}`、`{"kind":"file_name","patterns":[…]}` | `Marker` 加两个变体 |
| 条件 | `parent_has_other_match`、`parent_has_file_matching{pattern}`、`parent_lacks_file_matching{pattern}`、`sibling_without_suffix{suffixes}` | `Condition` 加四个变体 |

`custom_discovery` 在计划里就是原有的 `discovery`（`root` 为自选位置），`system_drive` 在计划里就是盘根路径，本包都不用认新键。

校验（不通过就是 `InvalidPlan`，原有校验不变）：
- `patterns` 1～8 个，每个照本包现有的段语法（与 `pattern` 的段相同），不分大小写不得重复；`pattern` 1～64 个字符，同样照段语法；`suffixes` 照 SCAN-M3D 的名字数组。
- 条件照 RULES-M35 第 3.2 节：每种最多一项，共 1～4 项。`file_name` 上只允许那一节列出的六种。`parent_has_other_match` 只能用在 `dir_name`、`dir_name_pattern`、`file_name` 三种 marker 上（另两种要列子目录才知道，违反只列一次）。
- `file_name` 的目标，`item_type` 为 `file` 或 `any`。
- `keep_by` 为 `version_name` 时 `keep_newest ≥ 1`。
- `git_is_copy` 只在 `recommended`、`confirm` 目标上。
- `root_levels` 1～6，只和 `runs_from_or_references_item` 一起。
- `unlocks_target_ids`：所在目标可清理（`recommended`、`confirm`）；每个 id 在同一份计划里存在、不是自己、指向的目标是 `protected`；不得重复。
- `pattern` 目标也可以带 `conditions`，但只允许一项 `sibling_without_suffix`，且目标类别为 `custom`。这是给项目声明用的（MANIFEST-M35 第 4 节），规则包不生成这种目标。判断照第 4.3 节，父目录就是列出最后一段的那个目录。
- 不含任何新键的旧计划，解析结果与原来完全相同。

## 2. 体量与年龄（行 25、26）

**分配大小**：
- `Item` 加 `disk_bytes`：条目里普通文件的**分配大小**之和，按文件身份去重（与 `unique_bytes` 同一套去重）；文件条目就是它自己的分配大小。目录项本身不计，与 `total_bytes` 一致。
- 来源是列出这个文件的那次目录枚举里的 `allocation` 字段（`FileIdExtdDirectoryInfo` 已有）。稀疏文件、NTFS 压缩文件因此按实际占用算。
- 只有条目本身是文件、又没有被任何一次枚举列出时（例如目标根就是这个文件），才打开它读 `FileStandardInfo.AllocationSize`（只读属性访问）。读不到就按 0，并记 `access_denied`（与原有 `measure` 读不到自身时相同）。
- `Group` 加 `disk_bytes`、`eligible_disk_bytes`：组内各项与各可清项的 `disk_bytes` 之和。
- 三个字段都是十进制字符串（与 `total_bytes` 同格式），类型 `Option<String>`：本版本输出时总有；解析没有这些键的旧结果时为 None。

**年龄**：
- 目标的 `age_basis` 为 `latest_created_or_modified` 时，条目里每一项的活动时间取“修改时间与创建时间中较晚者”（创建时间来自同一次枚举的 `creation` 字段；条目自身来自它的元数据）。
- 这个时间用于该目标条目的 `newest_activity`、组的 `oldest_activity` / `newest_activity`、`too_recent` 判断与按活动的 `keep_newest`。
- 缺省 `modified` 时与原来完全相同。增长与快照不变（仍用输出里的 `newest_activity`）。

## 3. 规则新字段在扫描里的效果

### 3.1 `git_is_copy`（行 4）
这个目标的条目不判 `repository`。`has_git` 照常测量，其余原因照旧。

### 3.2 `unlocks_target_ids`（行 7、56）
判 `inside_protected` 时：如果包住它的那个受保护命中，所属目标的 `target_id` 在本条目目标的 `unlocks_target_ids` 里，这一对**不算**；被别的受保护目标包住仍算。`hard_guard`、`contains_protected`、`repository`、`too_recent`、`keep_newest` 都不变。

### 3.3 `keep_by: version_name`（行 8）
- 保留的候选集合、原因写法（`keep_newest`）与原来相同，只是**分组**改为“同一目标、同一个父目录（不分大小写）”，**排序**改为按名字里的版本号从大到小：
  - 版本键：名字里所有连续的 ASCII 数字段，依次按数值比较（去掉前导零后先比位数、再逐位比）；前面都相等时，段数多的大。
  - 版本键完全相同，按名字（ASCII 不分大小写）从大到小。
- 每组留最前面的 `keep_newest` 个。“正在运行的那个版本”由服务按 `in_use` 判断，本包不管。

### 3.4 `root_levels`
只带进组的 `in_use`，本包不判断在用。

## 4. 新 marker 与新条件

### 4.1 `dir_name_pattern`
与 `dir_name` 相同，只是目录名按段语法匹配任一模式（ASCII 不分大小写）。

### 4.2 `file_name`
- 遍历这个 root 时，深度为 d 的目录被列出后（d < `max_depth`），其中每个**普通文件**（不是目录、不是重解析点），名字匹配任一模式的，是一个深度 d+1 的文件命中。
- 不为此多列任何目录；文件的体量、时间、分配大小、身份都来自这次枚举。
- 与目录型 marker 同一次遍历、同一套规则：这个目标在别的目标的命中里面是否继续找，与原有 marker 目标之间的关系相同。

### 4.3 新条件（D 为命中的目录或文件）
都用 D 的父目录**已经列出的**清单判断（SCAN-M3D 第 2 节），不分大小写：
- `parent_has_other_match`：父目录里还有另一个子项按同一个 marker 的名字命中（`dir_name`、`dir_name_pattern` 看子目录，`file_name` 看普通文件），不看条件。
- `parent_has_file_matching`：父目录里有普通文件的名字匹配 `pattern`。
- `parent_lacks_file_matching`：父目录里没有这样的普通文件。
- `sibling_without_suffix`：D 的名字以某个后缀结尾，去掉后缀的名字在父目录里是普通文件，并且该文件的长度 ≥ D 的 `total_bytes`。长度比较在**测量 D 之后**做；不满足时，D 按 SCAN-M3D 第 3 节归兜底目标（没有兜底就不算命中），不重新测量。
- D 是目标根本身（深度 0）时，父目录不在这次遍历里，以上四条都视为**不满足**（与 SCAN-M3D 相同，`parent_lacks_file_matching` 也不例外）。
- 文件命中的 `path_has_any` 看各级上级目录名加文件名本身；`no_ancestor_suffix` 看各级上级目录。

### 4.4 自选位置的临时文件夹与盘根
- `discovery` 的 `root` 是自选位置时，行为与系统临时目录完全相同（直接子项、去掉被其它目标命中的、年龄与级别照目标）。同一 root 还有 marker 遍历时，仍只列一次。
- `pattern` 的 `base` 可以是盘根（`C:\`），盘根只列一次。

## 5. 泄漏簇（行 1～3、11、46、67）

只在 `scan_full` 且 `ExtrasOptions.leak_clusters` 为 true 时产生（第 7 节）；`scan()` 不产生。

### 5.1 名字模板
导出 `pub fn name_template(name: &str, is_file: bool) -> Option<String>`，算法固定：
1. 文件去掉扩展名：最后一个 `.` 不在开头、其后 1～8 个 ASCII 字母数字，这部分是扩展名，其余是主干。目录不去扩展名。
2. 在主干**末尾**按顺序找第一个成立的尾巴：

| 尾巴 | 写成 | 条件 |
|---|---|---|
| UUID | `<u>` | 主干以 `8-4-4-4-12` 十六进制结尾，前面是分隔符（`-`、`_`、`.`、空格）或什么都没有 |
| 数字串 | `<d>` | 主干末尾由数字与分隔符组成的最长一段（去掉开头的分隔符）里，数字共 ≥ 8 个 |
| Python 临时名 | `<p8>` | 整个主干是 `tmp` 加 8 个 `[a-z0-9_]`，其中至少一个数字或 `_` |
| 十六进制 | `<h>` | 最后一个分隔符之后的段，长度 ≥ 7，全是十六进制，至少一个数字且至少一个 `a`～`f` |
| 6 位随机 | `<r6>` | 最后一个分隔符之后的段，正好 6 个 ASCII 字母数字，至少一个数字，或大小写字母都有 |

3. 尾巴之前的部分是前缀，**前缀里至少两个 ASCII 字母**，否则没有模板（光秃秃的 UUID、日期、哈希名不算）。
4. 模板 = 前缀里每段连续数字换成 `#`，再接尾巴记号，文件再接 `.` 加扩展名；整体 ASCII 小写。
5. 都不成立返回 None。

本轮真实名字（夹具必须逐条覆盖）：

| 名字 | 文件？ | 模板 |
|---|---|---|
| `verify-7mzKFP`、`verify-bjVTM3`、`verify-Nig1h3` | 否 | `verify-<r6>` |
| `marketplace-upgrade-0gAvKc` | 否 | `marketplace-upgrade-<r6>` |
| `pgtest-20261006-055219-104832` | 否 | `pgtest-<d>` |
| `apk_43181b86.apk` | 是 | `apk_<h>.apk` |
| `build-3f907897` | 否 | `build-<h>` |
| `rb123-x-chrome-AbC123` | 否 | `rb#-x-chrome-<r6>` |
| `scoped_dir12345_678901234` | 否 | `scoped_dir<d>` |
| `tmpk3j_9x2a` | 否 | `tmp<p8>` |
| `session-550e8400-e29b-41d4-a716-446655440000` | 否 | `session-<u>` |
| `IMG_20261102_123456.jpg` | 是 | `img_<d>.jpg`（有模板，但不成文件簇，见 5.2） |
| `verify-s8-revisions.cjs`、`.tmp_w35b`、`apk_backup`、`apk_F1.apk`、`climbmao-1.5.2-vc24-emu.apk.parts`、`verify-abcdef`、`7mzKFP`、`550e8400-e29b-41d4-a716-446655440000`、`Release-2026`、`v1.2.3`、`node_modules` | — | None |

`Item` 加 `template: Option<String>`：**每个**条目（不只是簇成员）都按自己的名字算一次，供服务把同模板的条目合成一行（行 67）、清理前按模板重新核对（行 46）。

### 5.2 在哪里找、谁算成员
- 只在两处找（用户 11-02 拍板“只在你加的位置与临时目录里找”）：
  - 带 `custom` 类别 marker 目标的 root（用户加的位置）的遍历里，**正在搜索**（不是正在测量某个命中）的每个目录；
  - 每个 `discovery` 目标的 root 的直接子项。
- 候选：这一层清单里不是重解析点、不是任何目标命中（discovery 处即“会成为 discovery 条目”的那些）、名字有模板的子项。目录与文件分开算。
- **文件簇只认 `<h>`、`<u>`、`<r6>`、`<p8>` 四种尾巴**；`<d>` 的文件不成簇（照片、截图、日志按日期命名，不是泄漏）。目录簇五种都认。
- 同一层里同一（种类，模板）的候选 **≥ 10 个**就成簇（S1），这些候选就是成员。
- `<h>` 文件簇另外把同一层里**同扩展名、同前缀**（模板记号之前的部分）、自己没有模板或模板不同的普通文件也收为成员（行 11：`apk_F1.apk`、`apk_diag.apk` 一并列出）；它们的 `template` 照 5.1 算，不计入 S1、S2、S4。
- 目录成员按命中测量；**测量它时任何目标都不再在它里面搜索**，它里面不会再出现别的条目。discovery 处的成员从 discovery 组移到簇组，不重复出现。

### 5.3 信号与级别
- **S2 大小相近**：成员中至少 80% 的 `disk_bytes` 落在 `[m/4, m×4]`，m 是成员 `disk_bytes` 的中位数（偶数个取较小的那个）；m 为 0 时，`disk_bytes` 为 0 的成员算落在里面。
- **S4 成团出现**：存在一个 UTC 日历日，当天创建的成员 ≥ 5 个（成员自己的创建时间，来自父目录的枚举）。
- S1 且（S2 或 S4）：级别 `confirm`；只有 S1：`advisory`（“疑似”）。S3（只增不减）、S5（没人在用）由服务用快照与进程判断，本包不管。

### 5.4 簇组与成员
- `group_id`：`leak:` + 父目录路径（ASCII 小写）+ `|` + `dir` 或 `file` + `|` + 模板。同一个目录、同一模板，每次扫描相同（增长按它对比）。
- `rule_id` 为 `leak-cluster`；`category`：自选位置里为 `custom`，discovery 处为该 discovery 目标的类别；`in_use` 为 `{"mode":"runs_from_or_references_item","processes":[]}`；`top_keys` 照 discovery 组的算法。
- `Group` 加 `cluster: Option<ClusterInfo>`，只有簇组有：

```rust
pub struct ClusterInfo {
    pub parent: String,        // 父目录
    pub kind: String,          // "dir" 或 "file"
    pub template: String,
    pub member_count: u64,     // 符合模板的成员数（不含 5.2 收进来的同前缀文件）
    pub similar_size: bool,    // S2
    pub burst: bool,           // S4
    pub burst_day: Option<String>, // S4 成立时最早的那一天，YYYY-MM-DD
    pub keep_newest: u64,
}
```

- 成员的资格：`min_age_hours` 24，年龄按 `latest_created_or_modified`；`keep_newest` 为 1（`<h>` 尾巴，按活动留最新的一个）或 0（其余）；判定顺序与原因照原有（`hard_guard`、`contains_protected`、`inside_protected`、`repository`、`too_recent`、`keep_newest`）。
- 结果里簇组排在计划的全部组之后，按 `group_id` 升序；成员条目排在原有条目之后，按组、再按路径（ASCII 不分大小写）。

## 6. 名字检查、隔离区、兜底与身份（行 38、39、43、62）

### 6.1 贵重件（行 38）
测量条目时，按文件名（ASCII 不分大小写）认出：`*.jks`、`*.keystore`、`*.p12`、`*.pfx`、`*.p8`、`*.pem`、`*.key`、`*.mobileprovision`、`.env*`、`credentials*`、`google-services.json`、`*.db`、`*.sqlite*`。
- 不认 `Thumbs.db`、`ehthumbs.db`；不在名为 `node_modules`、`site-packages`、`dist-packages` 的目录之内认（那是下载的包，自带测试证书）。
- 只看名字，不打开。
- `Item` 加 `valuable_count: u64` 与 `valuable_names: Vec<String>`：最多 8 个，条目内的相对路径（`\` 分隔；文件条目就是它的名字），按 ASCII 不分大小写升序取前 8 个。
- 本包**不改**级别与资格；“有贵重件就不能是推荐”由服务做（M7）。

### 6.2 难删的名字（行 39）
- 认出：Windows 保留设备名（`CON`、`PRN`、`AUX`、`NUL`、`COM1`～`COM9`、`LPT1`～`LPT9`，不分大小写，带不带扩展名都算，如 `nul.txt`），以及以 `.` 或空格结尾的名字。
- `Item` 加 `odd_count: u64` 与 `odd_names: Vec<String>`（取法同 6.1，条目自己的名字也算）。不改资格。

### 6.3 不扫 Water 自己的隔离区（行 43）
- 名为 `.water-quarantine`（不分大小写）的目录，在任何深度都**不列、不命中、不进 discovery、不当簇候选**；它所在的那次枚举仍把它算一项 `visited_entries`。
- 目标的根或 base 位于这样的目录之内时，这个目标没有命中，不记问题。
- 空间概览（第 8 节）不跳过它：它确实占着空间。

### 6.4 兜底目录里的问题记到兜底组（行 62）
测量一个命中时产生的列目录问题（`access_denied`、`unrepresentable_name`）与 `budget_exhausted`，记在这个命中**最终归属**的组上。条件在测量之后才定（`sibling_without_suffix`）的，先暂存，归属定了再记。命中归兜底目标时，问题记在兜底组，不再记在主组。

### 6.5 不可清理组的身份
`advisory`、`protected` 级别的条目取不到身份时，不再记 `identity_unavailable` 问题（例：`pagefile.sys` 打不开）。可清理级别照旧。

### 6.6 `.git` 本身永远不是条目
名为 `.git`（不分大小写）的目录或文件，不成为任何目标的命中，也不当簇候选（项目声明的 `*` 不会匹配到它）。现有规则没有以 `.git` 本身为条目的（`git-worktrees` 的条目是含 `.git` 文件的目录），所以对现有规则没有影响。

## 7. 附加结果：`scan_full`

```rust
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct ExtrasOptions {
    pub leak_clusters: bool,
    pub junctions: bool,
    pub declarations: bool,
}

pub fn scan_full(
    plan: &ScanPlan,
    scan_id: &str,
    options: &ScanOptions,
    extras: &ExtrasOptions,
    cancel: &CancelToken,
    observer: &dyn ScanObserver,
    now: SystemTime,
) -> Result<(ScanResult, ScanExtras), ScanError>;

pub struct ScanExtras {
    pub extras_version: String,      // "water.scan-extras.v1"
    pub scan_id: String,
    pub junctions: Vec<Junction>,
    pub junctions_truncated: bool,
    pub declarations: Vec<String>,   // 找到的 .water-cleanup.json 路径
}

pub struct Junction {
    pub path: String,                // 联接本身
    pub tag: String,                 // "junction" 或 "symlink"
    pub target: Option<String>,
    pub final_target: Option<String>,
}

pub fn extras_to_json(extras: &ScanExtras) -> String;
pub fn extras_from_json(text: &str) -> Result<ScanExtras, ScanError>;
```

- `scan(...)` 与 `scan_full(..., &ExtrasOptions::default(), ...).0` 结果相同；开关都关时 `ScanExtras` 只有版本与 `scan_id`，列表为空。
- JSON 键按字段顺序；`extras_from_json` 版本不对或有未知键时 `InvalidResult`。三个结构都导出，派生 `Debug, Clone, PartialEq, Serialize, Deserialize`。

### 7.1 联接索引（行 37）
- `junctions` 为 true 时，遍历中**任何一次枚举**（搜索或测量）列出的重解析点，`reparse_tag` 为 `IO_REPARSE_TAG_MOUNT_POINT`（0xA0000003）或 `IO_REPARSE_TAG_SYMLINK`（0xA000000C）的，以及本身是这两种重解析点的目标根，读出它指向哪里。别的标签（云文件占位、AppExecLink 等）不读。
- 读法：只读属性访问、`FILE_FLAG_OPEN_REPARSE_POINT | FILE_FLAG_BACKUP_SEMANTICS` 打开，`FSCTL_GET_REPARSE_POINT`。不跟进去，不列它。
- `target`：替代名去掉 `\??\`；相对符号链接按链接所在目录拼出绝对路径（按文本处理 `.`、`..`）；结果不是 `X:\…` 形式（如卷 GUID）时为 None。去掉结尾的 `\`（盘根除外）。
- `final_target`：`target` 等于或位于索引里另一个联接之内时，换成那个联接的目标，最多 8 次；成环或超过 8 次为 None。
- 最多记 10 000 个，超过就停止再读，`junctions_truncated` 为 true。
- `Item` 加 `referenced_count: u64` 与 `referenced_by: Vec<String>`（最多 8 个联接路径，升序）：索引里 `final_target` 等于条目路径、位于条目之内或包住条目的联接；联接本身位于条目之内的不算。本包**不改**资格，“被 X 引用、不可勾选”由服务做（M7）。`junctions` 为 false 时为空。

### 7.2 泄漏簇
见第 5 节。打开后每个目录仍最多列一次。

### 7.3 项目声明的位置（行 57）
`declarations` 为 true 时，在带 `custom` 类别 marker 目标的 root 的遍历里，深度 0～4 的被搜索目录的清单中，名为 `.water-cleanup.json` 的**普通文件**（不是重解析点）记下路径，按路径升序，最多 256 个。只看名字，**不读**；读与解析由 `packages/cleanup-manifest` 做（MANIFEST-M35）。

## 8. 空间概览（行 33）

```rust
pub fn space_overview(
    root: &str,
    scan_id: &str,
    options: &ScanOptions,
    cancel: &CancelToken,
    observer: &dyn ScanObserver,
    now: SystemTime,
) -> Result<SpaceOverview, ScanError>;

pub struct SpaceOverview {
    pub overview_version: String,    // "water.space-overview.v1"
    pub scan_id: String,
    pub root: String,
    pub started_at: String,
    pub ended_at: String,
    pub status: String,              // completed / partial / cancelled，含义同扫描
    pub visited_entries: u64,
    pub disk_bytes: String,
    pub total_bytes: String,
    pub file_count: u64,
    pub top: Vec<SpaceEntry>,        // 最多 10 个
    pub others_count: u64,
    pub others_disk_bytes: String,
    pub issues: Vec<Issue>,          // group_id 为 "space_overview"
}

pub struct SpaceEntry {
    pub name: String,
    pub path: String,
    pub kind: String,                // "dir"、"file"、"reparse"
    pub disk_bytes: String,
    pub total_bytes: String,
    pub file_count: u64,
    pub newest_activity: Option<String>,
    pub has_git: bool,               // 它的直接子项里有 .git
}

pub fn overview_to_json(overview: &SpaceOverview) -> String;
pub fn overview_from_json(text: &str) -> Result<SpaceOverview, ScanError>;
```

- `root` 是绝对路径的目录，可以是盘根。与 `scan` 分开调用，自己一次遍历，每个目录列一次，不跟重解析点（`kind` 为 `reparse`，体量 0）。
- 测量 `root` 的每个直接子项（目录与文件）；`top` 按 `disk_bytes` 从大到小，相同按名字升序；其余合成 `others_*`。只给直接子项的名字，不给更深的路径。
- 预算、取消、进度（`group_id` 为 `space_overview`、`category` 为 `space`）照 `ScanOptions` 与原有规则；`.water-quarantine` 照常统计。
- 归属标签（项目、游戏、资料）由服务按名字与 `has_git` 定，本包不管。

## 9. 测试

`tests/scan_v1.rs` 仍是精确五个测试，名字不变。新断言加在已有测试里，失败信息带标记：

| 标记 | 放在 | 内容 |
|---|---|---|
| `SCAN_M35_PLAN` | `scan_plan_contract` | 第 1 节全部新键（含 `pattern` 目标带 `sibling_without_suffix`）能解析、往返不变；每条校验各一个被拒的反例；旧计划解析结果不变 |
| `SCAN_M35_TEMPLATE` | `scan_plan_contract` | 第 5.1 节表格逐条（正例与反例） |
| `SCAN_M35_MARKERS` | `scan_pattern_marker_discovery` | `dir_name_pattern`、`file_name`（含 `item_type`）、四个新条件各自的满足与不满足、深度 0 不满足；`sibling_without_suffix` 完整文件小于分段时归兜底；自选位置做 discovery root |
| `SCAN_M35_CLUSTERS` | `scan_pattern_marker_discovery` | 见下表 |
| `SCAN_M35_RULES` | `scan_overlap_and_guards` | `git_is_copy` 不判 `repository`；`unlocks_target_ids` 只放过列出的那一对，被别的受保护目标包住仍拦；`keep_by` 按父目录与版本号（`7.1.0.949` 与 `7.10.0.1`、`10.0` 与 `9.9.9`）；`age_basis` 让“修改时间很早、刚创建”的条目算新；`pattern` 段为 `*` 时不命中 `.git` |
| `SCAN_M35_NAMES` | `scan_overlap_and_guards` | 贵重件（含 `node_modules` 里的 `*.pem` 不算、`Thumbs.db` 不算、超过 8 个时计数正确）；保留名与结尾带点或空格的名字（测试里用 `\\?\` 前缀建） |
| `SCAN_M35_QUARANTINE` | `scan_overlap_and_guards` | 位置里的 `.water-quarantine` 不出现在任何组、不成簇；`visited_entries` 只多它自己一项 |
| `SCAN_M35_JUNCTIONS` | `scan_reparse_budget_cancel` | 联接指向某条目、位于条目之内、包住条目三种都记进 `referenced_by`；联接指向联接时 `final_target` 解到底；成环为 None；`scan()` 与 `junctions` 关时为空；只用目录联接（不需要管理员）；`declarations` 找到深度 4 的 `.water-cleanup.json`、找不到深度 5 的、不读内容 |
| `SCAN_M35_FALLBACK_ISSUES` | `scan_reparse_budget_cancel` | 兜底命中里的预算用完（或无法表示的名字，与已有测试同法）记在兜底组，主组没有 |
| `SCAN_M35_OVERVIEW` | `scan_reparse_budget_cancel` | 12 个大小不同的子目录、一个联接、一个文件：`top` 10 个且顺序对，`others_*` 对，联接为 `reparse` 且没被跟进 |
| `SCAN_M35_SIZES` | `scan_snapshot_growth_keys` | 稀疏文件（`fsutil sparse setflag` 后 `set_len` 64 MiB）`disk_bytes` 远小于 `total_bytes`；硬链接只算一次；组的两个新和；`advisory` 条目取不到身份时没有 `identity_unavailable` 问题 |
| `SCAN_M35_COMPAT` | `scan_snapshot_growth_keys` | `scan` 与默认 `scan_full` 结果相同；`ScanExtras`、`SpaceOverview` JSON 往返；没有新键的旧结果 JSON 能读回 |

`SCAN_M35_CLUSTERS` 的夹具（只建在本树 `.local/` 下，用本轮真实名字的形状；修改时间照已有的 `set_mtime`，创建时间用同样的打开方式加标准库的 `FileTimesExt::set_created`，不加依赖）：

| 夹具（自选位置 `loc\`） | 预期 |
|---|---|
| `.tmp_w35b\` 下 12 个 `verify-XXXXXX`（各一个大小相近的文件，同一天创建），另有 `verify-s8-revisions.cjs`、`report.md` | 一个 `confirm` 簇，12 个成员；两个文件不是成员、不出现 |
| `out\` 下 11 个 `apk_<8 位十六进制>.apk`、`apk_F1.apk`、目录 `apk_backup\` | `<h>` 文件簇，最新一个原因为 `keep_newest`；`apk_F1.apk` 是成员，`template` 为 None；`apk_backup` 不是 |
| 9 个 `pgtest-<日期>` 目录 | 不成簇 |
| 10 个 `run-XXXXXX` 目录，大小交替 1 B 与 64 KiB，创建时间分散在 10 天 | `advisory` 簇（S2、S4 都不成立） |
| 12 个 `IMG_<日期>_<时间>.jpg` | 不成簇 |
| 某个成员里有 `node_modules\` | 不单独出现 |
| 某个成员里有 `.git\` | 该成员原因为 `repository` |
| 成员最近 24 小时内有改动 | 原因为 `too_recent` |
| discovery root 下 10 个 `pgtest-<日期>` 与 3 个别的目录 | 10 个进簇组，discovery 组只剩 3 个 |
| 关掉 `leak_clusters` | 没有簇组，结果与 `scan()` 相同 |
| 同一夹具扫两次 | 簇的 `group_id` 相同 |

原有断言中，以下几处与本文必然冲突，**获准修改**，其余不变：
1. 构造或比对 `Match::Marker`、`Target`、`InUse`、`Group`、`Item` 全部字段的地方，补上新字段的缺省值。
2. 比对结果、组、条目完整 JSON 文本或键集合的地方，加上 `disk_bytes`、`eligible_disk_bytes` 等新键与它们按本文算出的值。
3. `advisory`、`protected` 条目取不到身份时原来断言有 `identity_unavailable` 问题的，改为没有。

回执逐条写出原值与新值。上面没有覆盖、却必然要改的旧断言：先写受阻回执。

## 10. 负控与真实冒烟

- **nc1**：成簇门槛改成 2（第 5.2 节），测试以 `SCAN_M35_CLUSTERS` 失败。
- **nc2**：忽略 `unlocks_target_ids`（照旧判 `inside_protected`），测试以 `SCAN_M35_RULES` 失败。
- **nc3**：`disk_bytes` 改用逻辑长度，测试以 `SCAN_M35_SIZES` 失败。
- 负控只认 `src/` 里的改动。
- **真实冒烟**（`--mode real`）：原有的一次只读真实扫描照旧；再跑一次三个开关都开的 `scan_full`，与对用户目录的 `space_overview`。只输出组级汇总、簇的个数与级别、联接与声明的个数、概览的总量与条数，**不输出路径与名字**。
