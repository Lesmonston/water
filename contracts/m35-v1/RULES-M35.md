# RULES-M35：新字段、新定位与按清理经验补的规则（W10-M1）

**草案，未冻结**（2026-11-02，总控 Claude 起草，同日按代码审过一遍，审定的改动见第 11 节；与 SCAN-M35 等一起冻结）。补充 [RULES](../checkup-v1/RULES.md)、[RULES-M3C](../m3c-v1/RULES-M3C.md)、[RULES-M3D](../m3d-v1/RULES-M3D.md)，冲突时以本文为准。只改 `packages/junk-rules/`。

来由：[第十波计划](../../docs/dispatch/wave10/PLAN.md)第 2 节（“行 n”指那里的行号）、[ADR-019](../../docs/decisions/ADR-019-project-declarations-and-quarantine.md)第 5 节。扫描侧按同一份计划 JSON 解析，见 [SCAN-M35](SCAN-M35.md) 第 1 节；两张单经这份 JSON 对接，合入时一起合。

**总原则**：
- 所有新字段都可选。不用新字段的规则，生成的目标与计划 JSON 与改动前**逐字节相同**（不出现新键）。
- 只看名字、结构、时间与进程，不读内容（ADR-018）。
- **不给服务做了完整匹配的枚举加变体**：`MatchSpec`（`water-service/src/clean.rs` 约 121 行）与 `InUseMode`（`views.rs` 约 102 行）不加变体。`Marker`、`Condition`、`Locator`、`KnownFolder` 服务没有匹配，可以加。服务不构造 `Rule`、`Target`、`InUse`、`KnownFolders` 的字面量，可以加字段。

## 1. 规则的新字段

| 字段 | 取值 | 含义 | 校验 |
|---|---|---|---|
| `git_is_copy` | `true`（缺省 false，false 不写） | 这类条目里名为 `.git` 的子项是下载副本，不是用户仓库：扫描对它的条目不判 `repository`（行 4） | 只能出现在 `recommended`、`confirm` 规则上 |
| `age_basis` | `"latest_created_or_modified"`（缺省 `"modified"`，缺省不写） | 年龄按“修改时间与创建时间中较晚者”算（行 26：解压出的文件修改时间常很早） | 无 |
| `keep_by` | `"version_name"`（缺省 `"activity"`，缺省不写） | `keep_newest` 改为：**同一个父目录里**的条目按名字里的版本号排序，留最大的（行 8）。原来是同一目标内按最近活动 | 只能和 `keep_newest ≥ 1` 一起出现 |
| `advice_zh` | 8～160 字符（缺省不写） | 这条是**系统建议**：界面放进“系统建议”，这段文字是“怎么做”（行 55） | 只能出现在 `advisory` 规则上 |
| `in_use_zh` | 4～40 字符（缺省不写） | 条目因在用跳过时的解除条件，如“关掉 Chrome 后可清”（行 53）。没写时服务用通用说法 | `in_use.mode` 为 `none` 时不得出现 |
| `retention_zh` | 4～80 字符（缺省不写） | 工具自己的会话保留规则，如“Claude Code 默认删除 30 天前的会话”（行 56） | 只能出现在 `agent_tool` 规则上 |
| `unlocks` | 另一条规则的 `rule_id`（缺省不写） | 这条规则的条目位于那条受保护规则的条目之内，扫描与执行器对这一对不按“位于受保护的数据之内”拦（行 7、56） | 见第 4 节 |
| `session_tool` | 工具 ID（缺省不写） | 这条是**会话可选清理**规则，只在用户打开该工具的开关时生成目标（ADR-019 第 5 节，行 56） | 见第 4 节 |
| `installed_names` | 1～4 个字符串，每个 2～60 字符（缺省不写） | 这条规则的条目是某个程序的数据目录，这些是它在“已安装程序”里的显示名称。服务（SERVICE-M35）用 APPS-M35 的 `find` 查：**查得到**（程序还装着）时整组不可清，原因“<名称> 还装着，这是它的数据”；**查不到**时照规则级别出现，卡片写“<名称> 似乎已卸载，这是它留下的数据”（行 9、H8）。只往不可清的方向改，不升级别 | 只能出现在 `app_leftover` 分类的 `confirm` 规则上；不分大小写不得重复 |

`Rule` 加对应字段：`git_is_copy: bool`、`age_basis: AgeBasis`、`keep_by: KeepBy`、`advice_zh`、`in_use_zh`、`retention_zh`、`unlocks`、`session_tool`（这五个为 `Option<String>`）、`installed_names: Option<Vec<String>>`。`AgeBasis { Modified, LatestCreatedOrModified }`、`KeepBy { Activity, VersionName }` 从 crate 根导出。文案字段不进计划 JSON，服务从 `RuleSet` 取。

## 2. 在用：看应用的数据根目录（`root_levels`）

`in_use` 增加可选字段 `root_levels`，只能和 `runs_from_or_references_item` 一起用（行 5、6、15、17、36）：

```json
{"mode":"runs_from_or_references_item","processes":[],"root_levels":3}
```

- 含义：判断在用时，把条目路径换成它往上第 `root_levels` 级的目录（应用的数据根目录或程序目录），再按 PROCESS-M3C 第 2 节判断：有进程从那里面运行，或命令行提到那里面的任何路径，条目就算在用。`processes` 为空表示任何进程。判定由服务做，本包只定义、校验、带进计划。
- 例：`…\Roaming\QQ\Partitions\qqnt_9210\Cache` 往上第 3 级是 `…\Roaming\QQ`；Electron 程序的子进程命令行里带 `--user-data-dir=…\Roaming\<程序>`，所以 `…\Roaming\<程序>\Cache` 用 1 级。
- 校验：1～6；别的 `mode` 带它就拒收。
- `InUse` 加字段 `root_levels: Option<u8>`，为 None 时不序列化。服务还没跟上时只按条目本身判断，不会坏。

文中“在用 `root N`”即 `{"mode":"runs_from_or_references_item","processes":[],"root_levels":N}`；“在用 `runs`”即同样的写法但不带 `root_levels`。

## 3. 新的定位

### 3.1 marker 的两个新种类

| 种类 | 形状 | 命中 |
|---|---|---|
| `dir_name_pattern` | `{"kind":"dir_name_pattern","patterns":["#.#*"]}` | **目录**名按 MODEL 段语法匹配任一模式 |
| `file_name` | `{"kind":"file_name","patterns":["*.pkf"]}` | **普通文件**名匹配任一模式；命中的是文件本身，每个文件为一项 |

- 模式 1～8 个，每个照段语法校验（`valid_segment`），不分大小写不得重复。
- 带 `file_name` 定位器的规则，`item_type` 为 `file` 或 `any`；`item_type` 为 `file` 的 `custom` 规则，定位器只能是 `file_name`。
- `locator_key` 新增 `marker:dir_name_pattern:<模式>:<深度>`、`marker:file_name:<模式>:<深度>`，模式按原来的方式小写后用 `\u{1f}` 连接。
- 文中“文件 `…`”即 `file_name`，“目录名 `…`”即 `dir_name_pattern`。

### 3.2 四个新条件

RULES-M3D 第 1 节的表加四行，其余校验照旧（每种最多一项，共 1～4 项，只有 `custom` 规则的 marker 定位器可以带）：

| `kind` | 其余字段 | 含义（D 为命中的目录或文件；“父目录”是 D 所在的目录） |
|---|---|---|
| `parent_has_other_match` | 无 | 父目录里还有**另一个**子项也按同一个 marker 命中（不看条件） |
| `parent_has_file_matching` | `pattern` | 父目录里有一个**普通文件**的名字匹配 `pattern` |
| `parent_lacks_file_matching` | `pattern` | 父目录里**没有**名字匹配 `pattern` 的普通文件 |
| `sibling_without_suffix` | `suffixes`（数组） | D 的名字以某个后缀结尾（不分大小写），去掉这个后缀后的名字在父目录里是一个**普通文件**，并且它的长度不小于 D 的体量（扫描测量 D 之后比较） |

- `pattern` 照段语法校验，1～64 个字符；`suffixes` 照 RULES-M3D 的名字数组校验。
- `parent_has_other_match` 只能用在 `dir_name`、`dir_name_pattern`、`file_name` 三种 marker 上（另两种要列子目录才知道，扫描只列一次；SCAN-M35 第 1 节同样拒收）。
- 用在 `file_name` 上时，只允许 `parent_has_file`、`parent_has_file_matching`、`parent_lacks_file_matching`、`path_has_any`、`no_ancestor_suffix`、`sibling_without_suffix`。`path_has_any` 对文件看的是它的各级上级目录名加文件名本身。

### 3.3 自选位置里的临时文件夹：定位器 `custom_discovery`

```json
{"kind":"custom_discovery","root_names":["tmp","temp"]}
```

- 新的 `Locator::CustomDiscovery { root_names }`。只为最后一级名字（不分大小写）等于 `root_names` 之一的 custom root 生成目标；目标的 `match` 是原有的 `discovery`，`root` 是这个 custom root，`target_id` 与 `group_id` 照 marker 的写法（`custom:<root_id>:<rule_id>#<n>`、`custom:<root_id>:<rule_id>`）。
- 只能用在 `custom` 规则上；`custom` 规则的定位器从“只能是 marker”放宽为“marker 或 `custom_discovery`”。`root_names` 1～8 个，每个 1～32 个可打印 ASCII 字符，不分大小写不得重复。
- RULES 第 3 节第 2 条（discovery 规则必须可清理且年龄 ≥ 24 小时）同样适用。
- 服务里按 marker 的 `root` 找自选位置的几处（`views.rs` 的 `custom_path`、`service.rs` 约 1073、1124、1277 行）由 M7 补上；在那之前这个组照常出现，只是不显示属于哪个位置。

### 3.4 系统盘根：已知目录 `system_drive`

- `KnownFolder` 加变体 `SystemDrive`（`"system_drive"`），值**由 `windows` 推出**：它所在的盘根（`C:\Windows` → `C:\`）。`KnownFolders` 的字段、JSON 与 `known_folders_version` **都不变**，扫描包、服务、宿主、检查器都不用改。
- `KnownFolders::get(SystemDrive)` 返回 `windows` 的前三个字符。`KNOWN_FOLDER_ORDER` 不变（盘根本来就在 `hard_guards` 里）。
- 计划里 `pattern` 的 `base` 允许是盘根（本包的 `ScanPlan::from_json` 原来不允许，要放开；扫描包原来就允许）。

## 4. 解锁与会话可选清理

### 4.1 `unlocks`

- 带 `unlocks` 的规则：`level` 为 `recommended` 或 `confirm`；被指向的规则存在、`level` 为 `protected`、`category` 相同；不能指向自己。
- 它的每个定位器都是 `pattern`，并且**位于**被指向规则的某个定位器之内：同一个 `base`，段数更多，前面的段逐段“可能重叠”（RULES 第 3 节第 1 条的判定反过来用）。不满足就拒收。
- RULES 第 3 节第 1 条的保护重叠检查不变（它只拦“可清理的包住受保护的”，位于其内的本来就不拦）。
- 计划里，这条规则的每个目标多一个键 `unlocks_target_ids`：被指向规则生成的全部目标的 `target_id`。扫描对这一对不判 `inside_protected`（SCAN-M35 第 4 节），服务把它带进清理计划，执行器对这一对不判 `protected_overlap`（CLEAN-M35）。

### 4.2 `session_tool`

- 工具 ID 是固定的五个：`claude-code`、`codex`、`cursor`、`grok`、`kimi-code`。
- 带 `session_tool` 的规则：`category` 为 `agent_tool`，`level` 为 `confirm`，必须带 `unlocks`（指向同一工具受保护的会话规则），`growth` 为 `slow`，`min_age_hours` 写 720（只是缺省值）。同一工具最多一条。
- `resolve_plan` **不为**带 `session_tool` 的规则生成目标。新增：

```rust
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct PlanOptions { pub sessions: Vec<SessionSwitch> }
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SessionSwitch { pub tool: String, pub min_age_days: u16 } // 1～365
pub fn resolve_plan_with(rules: &RuleSet, folders: &KnownFolders, custom_roots: &[CustomRoot],
                         created_at: &str, options: &PlanOptions) -> Result<ScanPlan, RulesError>;
```

  - `resolve_plan(…)` 等于 `resolve_plan_with(…, &PlanOptions::default())`，输出逐字节不变。
  - 打开的工具，按规则文件顺序把它的会话规则的目标**追加在计划末尾**，其余目标的位置与顺序不变；`min_age_hours` 为 `min_age_days × 24`。
  - 未知工具、重复工具、天数越界返回 `RULES_INVALID_SESSIONS`，路径为 `/sessions/<下标>`，不回显输入。

## 5. 改动的已有规则

只改下表列出的字段，其余字段与文案不变（为配合字段变化可以改的文案已写在表里）。

| 规则 | 改什么 | 行 |
|---|---|---|
| `codex-marketplace-staging` | 加 `git_is_copy: true` | 4 |
| `codex-runtimes` | `in_use` 改为在用 `runs`；加 `in_use_zh`：`关掉 Codex 后可清` | 16 |
| `electron-app-cache`、`electron-gpu-caches` | `in_use` 改为在用 `root 1`；加 `in_use_zh`：`关掉对应的程序后可清` | 15 |
| `agent-tool-logs` | `in_use` 改为在用 `root 2`；加 `in_use_zh`：`关掉对应的工具后可清` | 17 |
| `headless-browser-profiles` | system_temp 与 user_temp 各加两个定位器 `scoped_dir*`、`*chrome_profile*`（共 12 个）；加 `in_use_zh`：`测试结束、浏览器关掉后可清` | 14 |
| `test-browser-profiles` | `path_has_any` 的名单末尾加 `tmp`、`temp`（C 盘 `C:\tmp\chrome_*`）；加 `in_use_zh` 同上 | 14 |
| `jest-cache` | 定位器改为 `system_temp`、`user_temp` 各三个：`jest *`、`haste-map-*`、`metro-*`；`item_type` 改为 `any`；`min_age_hours` 168；`in_use` 改为 `cmdline_references_item` `["node.exe"]`；`in_use_zh`：`测试跑完后可清`；`why_zh` 末尾加“缓存有时是源码的唯一副本，一周内用过的不清。” | 13 |
| `system-temp-old`、`user-temp-old` | 加 `age_basis: "latest_created_or_modified"` | 26 |
| `chrome-cache`、`chrome-code-gpu-cache`、`chrome-service-worker-cache` | 加 `in_use_zh`：`关掉 Chrome 后可清` | 53 |
| `edge-` 与 `brave-` 的同名三条、`firefox-cache` | 加 `in_use_zh`：`关掉 Edge 后可清`、`关掉 Brave 后可清`、`关掉 Firefox 后可清` | 53 |
| `claude-desktop-old-versions`、`claude-code-old-versions` | 加 `in_use_zh`：`关掉 Claude 后可清` | 53 |
| `chrome-on-device-model` | 加 `advice_zh`：`Chrome 设置 › 系统 › 关掉“设备端 AI”，Chrome 会自己删掉它。` | 55 |
| `windows-delivery-optimization` | 加 `advice_zh`：`设置 › 系统 › 存储 › 临时文件，勾选“传递优化文件”后删除。` | 55 |
| `claude-code-sessions` | 加 `retention_zh`：`Claude Code 默认删除 30 天前的会话` | 56 |

## 6. 新规则

追加在规则文件**末尾**（`other-agent-sessions` 之后），按下表顺序。没写的字段：`growth` 为 `slow`，`fix_hint_zh` 为 null，`sources` 至少一条 `local_observation`、`ref` 写“来源”一列，`owner_zh` 写程序名。文案（`what_zh`、`why_zh`、`after_zh`，以及有在用检测时的 `in_use_zh`）按 RULES 第 2 节的语气写，含“来源”与“说明”点出的事实；总控验收时逐条审。

R、L、P、U、S 分别指 `roaming_app_data`、`local_app_data`、`program_data`、`user_profile`、`system_drive`；定位里的空格分隔段。

| # | rule_id | title_zh | 分类 / 级别 | 定位 | 类型 | 年龄 h | 保留 | 在用 | 来源 |
|---|---|---|---|---|---|---:|---:|---|---|
| 1 | `chromium-partition-cache` | 桌面程序的分区网页缓存 | app_leftover / recommended | R 与 L 各三个：`* Partitions * Cache`、`* Partitions * Code Cache`、`* Partitions * GPUCache` | dir | 1 | 0 | `root 3` | C7、C13（微信开发者工具 68 个 4.12 GB，QQ） |
| 2 | `steam-html-cache` | Steam 内置网页缓存 | app_leftover / recommended | L：`Steam htmlcache Default Cache`、`… Code Cache`、`… GPUCache` | dir | 1 | 0 | process_running `steam.exe`、`steamwebhelper.exe` | C13 |
| 3 | `wegame-browser-cache` | WeGame 内置网页缓存 | app_leftover / recommended | R：`Tencent WeGame qbcore* cache` | dir | 1 | 0 | process_running `wegame.exe` | C13 |
| 4 | `jianying-cache` | 剪映缓存 | app_leftover / recommended | L：`JianyingPro User Data Cache`、`JianyingPro User Data CEF Cache` | dir | 1 | 0 | process_running `jianyingpro.exe` | C13 |
| 5 | `jianying-update-download` | 剪映旧更新包 | app_leftover / recommended | L：`JianyingPro User Data Download *.exe` | file | 168 | 0 | process_running `jianyingpro.exe` | C14 |
| 6 | `ubisoft-patch-staging` | Ubisoft 补丁暂存 | app_leftover / recommended | P：`Ubisoft Ubisoft Game Launcher patch` | dir | 24 | 0 | process_running `upc.exe`、`ubisoftconnect.exe` | C21 |
| 7 | `app-backups` | 程序留下的旧备份 | app_leftover / confirm | R：`* *.bak-########` | any | 168 | 0 | none | C17（`@mirasim\desktop.bak-20261009`） |
| 8 | `custom-app-backups` | 程序留下的旧备份 | custom / confirm | 目录名 `*.bak-########`、`*-backup-########`、`*_backup_########`，max_depth 3 | dir | 168 | 0 | none | D10（`claude-full-backup-20260820` 等） |
| 9 | `android-avd-snapshots` | 安卓模拟器快照 | dev_cache / confirm | U：`.android avd *.avd snapshots` | dir | 24 | 0 | process_running `emulator.exe`、`qemu-system-x86_64.exe` | denglou A4、回执 3.6 |
| 10 | `custom-avd-snapshots` | 安卓模拟器快照 | custom / confirm | marker `dir_name` `snapshots`，max_depth 8，conditions `path_has_any` `[".avd"]` | dir | 24 | 0 | 同上 | 同上（`F:\cdisk-cache\android-avd`） |
| 11 | `embedded-browser-cache` | 内置浏览器的网页缓存 | custom / recommended | marker `dir_name` `Cache`、`Code Cache`、`GPUCache`，max_depth 10，conditions `parent_has_file` `Preferences` | dir | 1 | 0 | `root 2` | D5（企业微信 12 个） |
| 12 | `quark-video-cache` | 夸克视频缓存 | custom / recommended | marker `dir_name` `videoCache`，max_depth 6，conditions `path_has_any` `["quark"]` | dir | 24 | 0 | process_running `quark.exe` | D2（`D:\ProgramData\Quark\videoCache`） |
| 13 | `app-old-versions` | 软件旧版本 | custom / confirm | 目录名 `#.#*`，max_depth 4，conditions `parent_has_other_match`、`parent_has_file_matching` `*.exe` | dir | 168 | 1（`keep_by` version_name） | `runs` | D4（`D:\quark\7.1.0.949`） |
| 14 | `app-update-archives` | 没装上的更新包 | custom / confirm | 文件 `#.#*.zip`，max_depth 6，conditions `path_has_any` `["versions"]` | file | 720 | 0 | none | D3（QQ `versions\9.9.33-51802.zip`） |
| 15 | `game-logs` | 游戏日志 | custom / recommended | marker `dir_name` `Logs`，max_depth 6，conditions `parent_has_file_matching` `League*Legends.exe` | dir | 24 | 0 | `root 1` | F10（`F:\WeGameApps\lol\Game\Logs`） |
| 16 | `steam-logs` | Steam 日志 | custom / recommended | marker `dir_name` `logs`，max_depth 4，conditions `parent_has_file` `steam.exe` | dir | 24 | 0 | `root 1` | D6（`D:\steam\logs`，`steamwebhelper.exe` 引用时跳过） |
| 17 | `partial-downloads` | 已下载完的分段文件 | custom / recommended | 两个定位器：文件 `*.part`、`*.crdownload`、`*.temp`，max_depth 8，conditions `sibling_without_suffix` `[".part",".crdownload",".temp"]`；目录名 `*.parts`，max_depth 8，conditions `sibling_without_suffix` `[".parts"]` | any | 24 | 0 | none | denglou A2 |
| 18 | `unfinished-downloads` | 没下载完的文件 | custom / advisory | 与 17 一一对应的两个定位器，不带条件，各带 `fallback_for: "partial-downloads"` | any | 0 | 0 | none | E2（3 个 `.temp`） |
| 19 | `installer-files` | 安装包 | custom / confirm | 两个定位器：文件 `*.msi`、`*.msix`、`*.msixbundle`、`*.appx`、`*setup*.zip`、`*setup*.rar`、`*setup*.7z`，max_depth 3；文件 `*#*.exe`、`*setup*.exe`、`*install*.exe`，max_depth 3，conditions `parent_lacks_file_matching` `*.dll` | file | 168 | 0 | none | E2（WorkBuddy、CC-Switch、marvis）、D7、D8 |
| 20 | `audition-peak-files` | Audition 波形缓存 | custom / recommended | 文件 `*.pkf`，max_depth 12 | file | 24 | 0 | none | E1 |
| 21 | `audition-conformed` | Audition 转换副本 | custom / advisory | marker `dir_name` `Conformed Files`，max_depth 12 | dir | 0 | 0 | none | E1（工程直接引用其中 5 个） |
| 22 | `media-render-caches` | 视频软件的缓存与代理 | custom / advisory | marker `dir_name` `CacheClip`、`ProxyMedia`、`OptimizedMedia`，max_depth 8 | dir | 0 | 0 | none | 10-29 第 22～27 项（达芬奇） |
| 23 | `custom-temp-old` | 临时文件夹里的旧东西 | custom / confirm | `custom_discovery` `root_names` `["tmp","temp"]`；`age_basis` `latest_created_or_modified` | any | 168 | 0 | none | F8（`F:\tmp`） |
| 24 | `pagefile` | 页面文件 | gpu_system / advisory | S：`pagefile.sys`；`advice_zh`：`设置 › 系统 › 关于 › 高级系统设置 › 虚拟内存，按实际用量设上限；要重启。` | file | 0 | 0 | none | C22 |
| 25 | `grok-home-caches` | Grok 账号目录里的 npm 缓存 | agent_tool / recommended | U：`.grok# AppData Local npm-cache _cacache`；`unlocks` `grok-other-homes` | dir | 1 | 0 | none | H5（`~\.grok2\AppData\Local\npm-cache`，四个账号 1.46 GB） |
| 26 | `claude-code-old-sessions` | Claude Code 旧会话 | agent_tool / confirm | U：`.claude projects * *.jsonl`（file）、`.claude projects * ????????-????-????-????-????????????`（会话附带的目录）；`session_tool` `claude-code`，`unlocks` `claude-code-sessions`，`retention_zh` 同第 5 节 | any | 720 | 0 | `runs` | ADR-019 第 5 节、H1 |
| 27 | `codex-old-sessions` | Codex 旧会话 | agent_tool / confirm | U：`.codex* sessions # # # rollout-*`；`session_tool` `codex`，`unlocks` `codex-sessions` | file | 720 | 0 | `runs` | 同上 |
| 28 | `cursor-old-chats` | Cursor 旧聊天 | agent_tool / confirm | U：`.cursor chats *`；`session_tool` `cursor`，`unlocks` `cursor-chats` | dir | 720 | 0 | `runs` | H4 |
| 29 | `grok-old-sessions` | Grok 旧会话 | agent_tool / confirm | U：`.grok sessions * *`；`session_tool` `grok`，`unlocks` `grok-sessions` | dir | 720 | 0 | `runs` | H6 |
| 30 | `kimi-code-old-sessions` | Kimi Code 旧会话 | agent_tool / confirm | U：`.kimi-code sessions wd_*`；`session_tool` `kimi-code`，`unlocks` `kimi-code-sessions` | dir | 720 | 0 | `runs` | Kimi 试验 |
| 31 | `minimax-hub-leftover` | 卸载后留下的应用数据 | app_leftover / confirm | R：`@hilo`；`installed_names` `["MiniMax Hub"]` | dir | 720 | 0 | none | H8（`%APPDATA%\@hilo`，内有 `MiniMax Hub Global`，1.21 GB；11-01 注册表里已没有它的安装记录） |

说明：
- 第 6、2、3、4、5、9、12 行的进程名只有 `steam.exe`、`emulator.exe` 等通用名，本机没有逐个核实；名字不对只会让在用检测不起作用，执行器碰到被占用的文件照旧跳过并报原因。
- 第 7、8 行：同一系列往往只有一份（本轮四份备份各自一个系列），所以不留最新，全部“需要确认”，清理时先进隔离区。用户目录第一层的 `.mirasim.bak-20261009` 不能用 `U：*.bak-########` 认：第一层的通配定位与受保护的 `.grok#`、`.codex*` 等“可能重叠”，会被 RULES 第 3 节第 1 条拒收；用户把用户目录加为位置时由第 8 行认出。
- 第 11 行：Chromium 的配置目录里总有 `Preferences` 文件（本机企业微信的 `qtCef`、`WXWorkCefCache`、`Default` 与 QQ 的分区都有）；登录数据、`Local Storage` 等不在这三个名字里，不受影响。
- 第 13、14 行只能“需要确认”：名字排序判断不了在用的是哪个版本（QQ 的在用版本写在 `config.json` 里，最新的那个包反而没装上），Water 不读内容。
- 第 15 行：`League of Legends.exe` 带空格，条件名字不允许空格，所以用 `parent_has_file_matching`；进程名也带空格，所以在用用 `root 1`（游戏目录里有程序在跑就算在用）。
- 第 19 行第二个定位器：旁边没有 `.dll` 的 `.exe` 多半是下载下来的安装程序或单文件工具，名字里要有数字或 setup/install，避开 `cargo.exe` 这类工具；只看 3 层。
- 第 20 行：Audition 的进程名带空格，不能写进名单，在用为 none；被它占着的文件执行器照旧跳过。
- 第 25～30 行都带 `unlocks`，位于受保护的规则之内（第 4.1 节）；26～30 只经第 4.2 节的开关生成目标。第 26 行的第二个定位器只认 UUID 形状的目录，`.claude\projects\<项目>\memory` 等不在其中。
- 第 17、18 行：RULES-M3D 第 3 节要求被兜底的规则恰好 1 个定位器，本文放宽为“主规则与兜底规则的定位器个数相同，按下标一一对应，每对的 marker 与 `max_depth` 相同；主规则每个定位器都带条件，兜底规则都不带”。计划里兜底目标的 `fallback_for` 写同 root 下**同一下标**的主目标（`custom:<root_id>:partial-downloads#2`）。原有两对照旧成立。

## 7. 计划 JSON

`plan_version` 仍是 `water.scan-plan.v1`。目标在原有键之后，按下面的顺序多出可选键，取缺省值时不出现：
1. `in_use` 里 `processes` 之后的 `root_levels`；
2. `in_use` 之后依次是 `git_is_copy`（true）、`age_basis`、`keep_by`、`unlocks_target_ids`（非空数组）。

`match` 里 marker 的两个新种类：`{"kind":"dir_name_pattern","patterns":[…]}`、`{"kind":"file_name","patterns":[…]}`；新条件对象的键依次为 `kind` 再加表里它自己的字段（`parent_has_other_match` 只有 `kind`）。本包的 `ScanPlan::from_json` 读得回全部新键，往返不变。

## 8. 数据版本

`data_version` 改为 `2026-11-02.2`。

## 9. 测试

`tests/rules_v1.rs` 仍是精确四个测试，名字不变。新断言加在已有测试里，失败信息带标记：

| 标记 | 内容 |
|---|---|
| `RULES_M35_FIELDS` | 第 1～3 节每个新字段、新方式、新种类、新条件、新定位：合法写法通过，每条校验各有一个被拒的反例；不用新字段时计划 JSON 与改动前逐字节相同；`file_name`、`dir_name_pattern` 的目标；`custom_discovery` 对名为 `tmp` 与 `Temp` 的两个 custom root 各生成目标、对别的 root 不生成；`system_drive` 的目标 `base` 是 `windows` 的盘根，计划 JSON 能读回；第 7 节的键顺序 |
| `RULES_M35_SEEDS` | 第 5 节每行改动、第 6 节每条新规则的分类、级别、定位、类型、年龄、保留、在用与表一致；第 17、18 行的一一对应与 `fallback_for` 下标；第 4.1 节的解锁校验对全部新规则成立；新文案不含“垃圾”与英文枚举 |
| `RULES_M35_SESSIONS` | `resolve_plan` 不生成会话目标且输出不变；`resolve_plan_with` 打开 `claude-code`（30 天）时，在计划末尾生成它的两个目标、`min_age_hours` 为 720、`unlocks_target_ids` 等于 `claude-code-sessions` 的全部目标 ID，其余目标逐个不变；未知、重复工具与 0 天、366 天被拒；`unlocks` 指向非受保护规则、跨分类、定位不在其内的规则被拒 |
| `RULES_M35_VERSION` | `data_version` 为 `2026-11-02.2` |

原有断言中，以下几处与本文必然冲突，**获准修改**，其余不变：
1. 规则总数 78 → 109；custom 规则个数与 custom 目标总数、custom root 的目标顺序表，只因第 6 节在末尾追加规则而改变的，按新值更新。
2. 所有比对 `data_version` 的断言改为 `2026-11-02.2`。
3. 第 5 节改动的规则，原来逐字段比对的断言按新值更新（含 `jest-cache` 与 `headless-browser-profiles` 的定位器个数、`test-browser-profiles` 的条件）。
4. 列出全部字段构造或比对 `Rule`、`Target`、`InUse`、`Locator`、`Marker`、`Condition` 的地方补上新字段的缺省值。
5. 原来断言“盘根不能作为 pattern 的 base”的，按第 3.4 节改为接受。

回执逐条写出原值与新值。上面没有覆盖、却必然要改的旧断言：先写受阻回执。

## 10. 负控与真实冒烟

- **nc1**：`resolve_plan` 也为带 `session_tool` 的规则生成目标，测试以 `RULES_M35_SESSIONS` 失败。
- **nc2**：`custom_discovery` 对任何 custom root 都生成目标，测试以 `RULES_M35_FIELDS` 失败。
- 负控只认 `src/` 里的改动，只改规则数据不算。
- **真实冒烟**（`--mode real`）与原来相同，只核对已知目录是否存在；另输出 `system_drive` 推出的盘根是否存在（只输出是或否）。

## 11. 审定时相对计划与第一稿的改动（11-02）

| 改动 | 原因 |
|---|---|
| `system_drive` 从“`KnownFolders` 加可选键”改为“由 `windows` 推出” | 系统盘根就是 `windows` 所在的盘，不需要新数据；扫描、服务、宿主、检查器都不用跟着改 |
| 删掉“会话规则与它解锁的规则之间不做重叠检查” | 现有检查只拦“可清理的包住受保护的”，会话规则位于受保护规则之内，本来就不拦；真正要放行的是扫描的 `inside_protected` 与执行器的 `protected_overlap`，改由 `unlocks_target_ids` 带过去 |
| `unlocks` 不再只给会话规则用 | Grok 账号目录里的 npm 缓存（行 7、H5）同样位于受保护目录之内 |
| 回收站两条规则删掉，改由服务用系统接口查回收站大小（SERVICE-M35，见本表末行） | 回收站里别的账号的文件夹没有权限，按目录扫描每次都会记“没有权限”、整次体检变成“部分完成” |
| 进程名带空格的两处（英雄联盟、Audition）、`cmdline_references_item` 配空名单的几处改写 | 现有校验不允许：进程名只能是小写字母数字与 `-_.`，这种方式名单不能为空 |
| 会话规则的在用从“命令行提到它”改为 `runs` | 会话工具的命令行不会提到会话文件；“还在写入”由年龄门槛挡住 |
| 旧备份不留最新（计划行 19） | 见第 6 节说明；基准表 C17 同步改 |
| 软件旧版本、没装上的更新包只能“需要确认”（基准表 D3、D4 原写“推”） | 见第 6 节说明 |
| 内嵌浏览器缓存的识别从“含 `index`、`data_0`、`data_1`”改为“名字是 `Cache` 等、旁边有 `Preferences`” | 本机核实过企业微信与 QQ 的目录 |
| 新加 `custom-app-backups`、`app-update-archives`、`grok-home-caches`，`installer-files` 拆成两个定位器、去掉“所有 `.rar`、`.7z`” | 对照本轮真实路径补漏；所有压缩包都当安装包会把用户自己的压缩包也列进来 |
| `test-browser-profiles` 的路径名单加 `tmp`、`temp` | C 盘 `C:\tmp\chrome_*`（基准表 C18） |
| `agent-tool-logs`、`jest-cache` 加在用检测，`jest-cache` 类型改为 `any` | 计划行 13、17；`haste-map-*` 是文件 |
| 新条件 `parent_lacks_file_matching` | 安装包定位要排除程序目录 |
| 贵重件与保留名的名单放在扫描包里（SCAN-M35），不进规则 | 它们在遍历时逐个文件看名字，与哪条规则无关 |
| 补字段 `installed_names` 与第 31 条 `minimax-hub-leftover`（写 SERVICE-M35 时补，11-02 晚） | 计划第 9 行与基准表 H8 要认出卸载残留，第一稿漏了；只让“还装着”的变成不可清，不升级别 |
| 回收站大小由服务经 `Platform` 查（SERVICE-M35），不是宿主 | 宿主只做转发；服务已有 `Platform` 抽象，假平台好测 |
