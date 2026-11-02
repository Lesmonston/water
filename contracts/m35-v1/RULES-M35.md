# RULES-M35：新字段、新定位与按清理经验补的规则（W10-M1）

**草案，未冻结**（2026-11-02，总控 Claude 起草；与 SCAN-M35 等一起审定后才冻结，冻结前可改）。补充 [RULES](../checkup-v1/RULES.md)、[RULES-M3C](../m3c-v1/RULES-M3C.md)、[RULES-M3D](../m3d-v1/RULES-M3D.md)，冲突时以本文为准。只改 `packages/junk-rules/`。

来由：[第十波计划](../../docs/dispatch/wave10/PLAN.md)第 2 节（行号见各条）、[ADR-019](../../docs/decisions/ADR-019-project-declarations-and-quarantine.md)第 5 节。扫描侧按同一份计划 JSON 解析，见 [SCAN-M35](SCAN-M35.md) 第 1 节；两张单经这份 JSON 对接，合入时一起合。

**总原则**：
- 所有新字段都可选。缺省时规则、目标与计划 JSON 与改动前**逐字节相同**（不出现新键）。
- 只看名字、结构、时间与进程，不读内容（ADR-018）。

## 1. 规则的新字段

| 字段 | 取值 | 含义 | 校验 |
|---|---|---|---|
| `git_is_copy` | `true`（缺省 false，false 不写） | 这类目录里名为 `.git` 的子项是下载副本，不是用户仓库：扫描对它的条目不判 `repository`（行 4） | 只能出现在 `recommended`、`confirm` 规则上 |
| `age_basis` | `"latest_created_or_modified"`（缺省 `"modified"`，缺省不写） | 年龄按“修改时间与创建时间中较晚者”算（行 26：解压出的文件修改时间常很早） | 无 |
| `keep_by` | `"version_name"`（缺省 `"activity"`，缺省不写） | `keep_newest` 按名字里的版本号排序保留最新的，而不是按最近活动（行 8） | 只能和 `keep_newest ≥ 1` 一起出现 |
| `advice_zh` | 8～160 字符（缺省 null，null 不写） | 这条是**系统建议**：界面放进“系统建议”而不是“仅供参考”，这段文字是“怎么做”（行 55） | 只能出现在 `advisory` 规则上 |
| `session_tool` | 工具 ID `[a-z0-9-]{2,24}`（缺省不写） | 这条是**会话可选清理**规则，只在用户打开该工具的开关时生成目标（ADR-019 第 5 节，行 56） | 见第 4 节 |
| `unlocks` | 另一条规则的 `rule_id`（缺省不写） | 与 `session_tool` 成对：这条规则的条目可以位于那条受保护规则的条目之内 | 见第 4 节 |
| `retention_zh` | 4～80 字符（缺省 null） | 工具自己的会话保留规则，例如“Claude Code 默认删除 30 天前的会话”（行 56） | 只能出现在受保护的会话规则或 `session_tool` 规则上 |

## 2. 在用：看应用的数据根目录（`root_levels`）

`in_use` 增加可选字段 `root_levels`，只能和 `runs_from_or_references_item` 一起用（行 5、6、15）：

```json
{"mode":"runs_from_or_references_item","processes":[],"root_levels":3}
```

- 含义：把“条目”换成条目往上第 `root_levels` 级的目录（应用的数据根目录），再按 PROCESS-M3C 第 2 节判断：有进程从那里运行、或命令行提到它，条目就算在用。`processes` 为空表示任何进程。判定由服务做，本包只定义与校验。
- 例：`…\Roaming\QQ\Partitions\qqnt_9210\Cache` 的第 3 级上级是 `…\Roaming\QQ`。
- 校验：`root_levels` 为 1～6；别的 `mode` 带它就拒收。
- **不加新的 `InUseMode` 变体**：服务对它做了完整匹配（`water-service/src/views.rs` 约 102 行），加变体会让服务在第二批的服务单合入前编译不过。`InUse` 加字段 `root_levels: Option<u8>`，为 None 时不序列化。服务还没跟上时只是按条目本身判断，不会坏。

文中“在用 `root N`”即 `{"mode":"runs_from_or_references_item","processes":[…],"root_levels":N}`。

## 3. 新的定位

### 3.1 marker 的新种类与新条件

- marker 种类 `dir_name_pattern`：`{"kind":"dir_name_pattern","patterns":["#.#*"]}`。目录名按 MODEL 段语法匹配任一模式即命中；1～8 个模式，每个照段语法校验。
- 新条件（RULES-M3D 第 1 节的表加三行，校验规则相同）：

| `kind` | 其余字段 | 含义（D 为命中的目录） |
|---|---|---|
| `parent_has_other_match` | 无 | D 的父目录里还有**另一个**子目录也命中同一个 marker |
| `parent_has_file_matching` | `pattern`（段语法） | D 的父目录里有一个**文件**的名字匹配 `pattern` |
| `sibling_without_suffix` | `suffixes`（数组） | D 的名字以某个后缀结尾，去掉后缀后的名字在父目录里是一个**文件**，并且它的大小不小于 D 的体量（扫描在测量 D 之后比较） |

`sibling_without_suffix` 也可以用在第 3.2 节的 `file_name` 上，这时比较的是同目录里去掉后缀的文件与这个文件。

### 3.2 自选位置里按文件名找：marker 种类 `file_name`

```json
{"kind":"marker","marker":{"kind":"file_name","patterns":["*.pkf"]},"max_depth":12}
```

- 与其它 marker 不同，命中的是**普通文件本身**：每个名字匹配任一模式的文件为一项。用这种 marker 的规则 `item_type` 必须是 `file`（其它 marker 的规则不得用 `file`）。
- 模式 1～8 个，照段语法校验。可以带 `conditions`，只允许 `parent_has_file`、`path_has_any`、`no_ancestor_suffix`、`sibling_without_suffix` 四种；“D”这时指这个文件，“父目录”指它所在的目录。
- **不加新的 `MatchSpec` 变体**：服务对 `MatchSpec` 做了完整匹配（`water-service/src/clean.rs` 约 121 行）。只在 marker 的种类里加，服务不受影响。新的 `dir_name_pattern` 同理。
- 文中“文件 `…`”即这种 marker。

### 3.3 自选位置里的临时文件夹：`custom_discovery`

```json
{"kind":"custom_discovery","root_names":["tmp","temp"]}
```

- 只为最后一级名字（不分大小写）等于 `root_names` 之一的 custom root 生成目标，`match` 为原有的 `discovery`，`root` 是这个 custom root（行 26 的 `F:\tmp`）。
- 只能用在 `category` 为 `custom` 的规则上；`root_names` 1～8 个，每个 1～32 个可打印 ASCII 字符。
- 原有 `discovery` 的排除规则不变。

## 4. 会话可选清理规则

- 带 `session_tool` 的规则：`category` 为 `agent_tool`，`level` 为 `confirm`，必须带 `unlocks`，`growth` 为 `slow`，`min_age_hours` 写 720（30 天，只是缺省值）。
- `unlocks` 指向的规则必须存在、`level` 为 `protected`，并且是同一个工具的会话规则。
- 保护重叠检查（RULES 第 3 节第 1 条）对“这条规则的定位器”与“它 `unlocks` 的那条规则的定位器”这一对**不检查**；对其它受保护规则照旧检查。
- `resolve_plan` 不变：**不为**带 `session_tool` 的规则生成任何目标。新增：

```rust
pub struct PlanOptions { pub sessions: Vec<SessionSwitch> }        // 缺省为空
pub struct SessionSwitch { pub tool: String, pub min_age_days: u16 } // 1～3650
pub fn resolve_plan_with(rules: &RuleSet, folders: &KnownFolders, custom_roots: &[CustomRoot],
                         created_at: &str, options: &PlanOptions) -> Result<ScanPlan, RulesError>;
```

  - `resolve_plan(…)` 等于 `resolve_plan_with(…, &PlanOptions::default())`，输出逐字节不变。
  - 对 `sessions` 里每个开关，按规则文件顺序为该工具的 `session_tool` 规则生成目标，位置在它 `unlocks` 的规则的目标之后；`min_age_hours` 为 `min_age_days × 24`。
  - 这些目标多一个键 `unlocks_target_ids`：它 `unlocks` 的那条规则生成的全部目标的 `target_id`。
  - 未知的工具 ID 返回错误（固定枚举，不回显输入）。

## 5. 改动的已有规则

只改下表列出的字段，其余字段与文案不变（`what_zh` 等文案为配合字段变化可以改，见每行）。

| 规则 | 改什么 | 行 |
|---|---|---|
| `codex-marketplace-staging` | 加 `git_is_copy: true` | 4 |
| `codex-runtimes` | `in_use` 改为 `{"mode":"runs_from_or_references_item","processes":[]}` | 16 |
| `electron-app-cache` | `in_use` 改为在用 `root 1`（名单空） | 15 |
| `electron-gpu-caches` | 同上，`root_levels` 1 | 15 |
| `headless-browser-profiles` | system_temp 与 user_temp 各加两个定位器：`scoped_dir*`、`*chrome_profile*`（共 12 个定位器） | 14 |
| `jest-cache` | 定位器改为 `system_temp: jest *`、`user_temp: jest *`，再各加 `haste-map-*`、`metro-*`（共 6 个）；`min_age_hours` 168；`why_zh` 末尾加“缓存有时是源码的唯一副本，一周内用过的不清。” | 13 |
| `system-temp-old`、`user-temp-old` | 加 `age_basis: "latest_created_or_modified"` | 26 |
| `chrome-on-device-model` | 加 `advice_zh`：`Chrome 设置 › 系统 › 关掉“设备端 AI”，Chrome 会自己删掉它。` | 55 |
| `windows-delivery-optimization` | 加 `advice_zh`：`设置 › 系统 › 存储 › 临时文件，勾选“传递优化文件”后删除。` | 55 |
| `claude-code-sessions` | 加 `retention_zh`：`Claude Code 默认删除 30 天前的会话` | 56 |

## 6. 新规则

追加在规则文件**末尾**（`other-agent-sessions` 之后），按下表顺序。表里没写的字段：`min_age_hours`、`keep_newest` 见表，`growth` 为 `slow`，`fix_hint_zh` 为 null，`sources` 至少一条 `local_observation`，`ref` 写本表“来源”一列。文案（`what_zh`、`why_zh`、`after_zh`）按 RULES 第 2 节的语气写，含“来源”一列点出的事实；总控验收时逐条审。

UD 指 `roaming_app_data`（R）或 `local_app_data`（L）。

| # | rule_id | title_zh | 分类 / 级别 | 定位 | 类型 | 年龄 h | 保留 | 在用 | 来源 |
|---|---|---|---|---|---|---:|---:|---|---|
| 1 | `chromium-partition-cache` | 桌面应用分区网页缓存 | app_leftover / recommended | R 与 L 各三个：`* Partitions * Cache`、`* Partitions * Code Cache`、`* Partitions * GPUCache` | dir | 1 | 0 | 在用 `root 3`，名单空 | 清理记录 C7、C13（微信开发者工具 68 个 4.12 GB，QQ） |
| 2 | `steam-html-cache` | Steam 内置网页缓存 | app_leftover / recommended | L：`Steam htmlcache Default Cache`、`… Code Cache`、`… GPUCache` | dir | 1 | 0 | process_running `steam.exe`、`steamwebhelper.exe` | C13 |
| 3 | `wegame-browser-cache` | WeGame 内置网页缓存 | app_leftover / recommended | R：`Tencent WeGame qbcore* cache` | dir | 1 | 0 | process_running `wegame.exe` | C13 |
| 4 | `jianying-cache` | 剪映缓存 | app_leftover / recommended | L：`JianyingPro User Data Cache`、`JianyingPro User Data CEF Cache` | dir | 1 | 0 | process_running `jianyingpro.exe` | C13 |
| 5 | `jianying-update-download` | 剪映旧更新包 | app_leftover / recommended | L：`JianyingPro User Data Download *.exe` | file | 168 | 0 | process_running `jianyingpro.exe` | C14 |
| 6 | `ubisoft-patch-staging` | Ubisoft 补丁暂存 | app_leftover / recommended | program_data：`Ubisoft Ubisoft Game Launcher patch` | dir | 24 | 0 | process_running `upc.exe` | C21 |
| 7 | `app-backups` | 应用留下的旧备份 | app_leftover / confirm | user_profile：`*.bak-########`；R：`* *.bak-########` | any | 168 | 0 | none | C17（Mirasim 两份） |
| 8 | `android-avd-snapshots` | 安卓模拟器快照 | dev_cache / confirm | user_profile：`.android avd *.avd snapshots` | dir | 24 | 0 | process_running `emulator.exe`、`qemu-system-x86_64.exe` | denglou A4、回执 3.6 |
| 9 | `custom-avd-snapshots` | 安卓模拟器快照 | custom / confirm | marker `dir_name` `snapshots`，max_depth 8，conditions `path_has_any` `[".avd"]` | dir | 24 | 0 | process_running 同上 | 同上（`F:\cdisk-cache\android-avd`） |
| 10 | `embedded-browser-cache` | 内置浏览器的网页缓存 | custom / recommended | marker `children_all` `index`、`data_0`、`data_1`，max_depth 10 | dir | 1 | 0 | 在用 `root 2`，名单空 | D5（企业微信 12 个） |
| 11 | `quark-video-cache` | 夸克视频缓存 | custom / recommended | marker `dir_name` `videoCache`，max_depth 6，conditions `path_has_any` `["quark"]` | dir | 24 | 0 | process_running `quark.exe` | D2 |
| 12 | `app-old-versions` | 软件旧版本 | custom / confirm | marker `dir_name_pattern` `#.#*`，max_depth 4，conditions：`parent_has_other_match`、`parent_has_file_matching` `*.exe` | dir | 168 | 1（`keep_by` version_name） | runs_from_or_references_item，名单空 | D4（夸克 `7.1.0.949`） |
| 13 | `game-logs` | 游戏日志 | custom / recommended | marker `dir_name` `Logs`，max_depth 6，conditions `parent_has_file` `League of Legends.exe` | dir | 24 | 0 | process_running `league of legends.exe`、`leagueclient.exe` | F10 |
| 14 | `steam-logs` | Steam 日志 | custom / recommended | marker `dir_name` `logs`，max_depth 4，conditions `parent_has_file` `steam.exe` | dir | 24 | 0 | cmdline_references_item，名单空 | D6（`steamwebhelper.exe` 引用时跳过） |
| 15 | `partial-downloads` | 已下载完的分段文件 | custom / recommended | 文件 `*.part`、`*.crdownload`，max_depth 8，conditions `sibling_without_suffix` `[".part",".crdownload"]`；再加 marker `dir_name_pattern` `*.parts`，conditions `sibling_without_suffix` `[".parts"]` | any | 24 | 0 | none | denglou A2 |
| 16 | `unfinished-downloads` | 没下载完的文件 | custom / advisory | 同 15 的两个定位器，各带 `fallback_for: "partial-downloads"`（RULES-M3D 第 3 节的兜底，放宽为：主规则可以有两个定位器，兜底规则逐个对应） | any | 0 | 0 | none | E2 |
| 17 | `installer-files` | 安装包 | custom / confirm | 文件 `*.msi`、`*.msix`、`*setup*.exe`、`*installer*.exe`、`*.rar`、`*.7z`，max_depth 6 | file | 168 | 0 | none | D7、D8、E2 |
| 18 | `audition-peak-files` | Audition 波形缓存 | custom / recommended | 文件 `*.pkf`，max_depth 12 | file | 24 | 0 | process_running `adobe audition.exe` | E1 |
| 19 | `audition-conformed` | Audition 转换副本 | custom / advisory | marker `dir_name` `Conformed Files`，max_depth 12 | dir | 0 | 0 | none | E1（被工程直接引用） |
| 20 | `media-render-caches` | 视频软件的缓存与代理 | custom / advisory | marker `dir_name` `CacheClip`、`ProxyMedia`、`OptimizedMedia`，max_depth 8 | dir | 0 | 0 | none | 10-29 第 22～27 项（达芬奇） |
| 21 | `custom-temp-old` | 临时文件夹里的旧东西 | custom / confirm | `custom_discovery` `root_names` `["tmp","temp"]`；`age_basis` `latest_created_or_modified` | any | 168 | 0 | none | F8（`F:\tmp`） |
| 22 | `pagefile` | 页面文件 | gpu_system / advisory | system_drive：`pagefile.sys`；`advice_zh`：`设置 › 系统 › 关于 › 高级系统设置 › 虚拟内存，按实际用量设上限；要重启。` | file | 0 | 0 | none | C22 |
| 23 | `recycle-bin` | 回收站 | gpu_system / advisory | system_drive：`$Recycle.Bin`；`advice_zh`：`在资源管理器里右键回收站 › 清空回收站。` | dir | 0 | 0 | none | C20 |
| 24 | `custom-recycle-bin` | 回收站 | custom / advisory | marker `dir_name` `$Recycle.Bin`，max_depth 1；同上 `advice_zh` | dir | 0 | 0 | none | C20 |
| 25 | `claude-code-old-sessions` | Claude Code 旧会话 | agent_tool / confirm | user_profile：`.claude projects * *.jsonl`；`session_tool` `claude-code`，`unlocks` `claude-code-sessions`，`retention_zh` 同上 | file | 720 | 0 | cmdline_references_item，名单空 | ADR-019 第 5 节 |
| 26 | `codex-old-sessions` | Codex 旧会话 | agent_tool / confirm | user_profile：`.codex* sessions # # # rollout-*`；`session_tool` `codex`，`unlocks` `codex-sessions` | file | 720 | 0 | 同上 | 同上 |
| 27 | `cursor-old-chats` | Cursor 旧聊天 | agent_tool / confirm | user_profile：`.cursor chats *`；`session_tool` `cursor`，`unlocks` `cursor-chats` | dir | 720 | 0 | 同上 | H4 |
| 28 | `grok-old-sessions` | Grok 旧会话 | agent_tool / confirm | user_profile：`.grok sessions * *`；`session_tool` `grok`，`unlocks` `grok-sessions` | dir | 720 | 0 | 同上 | H6 |
| 29 | `kimi-code-old-sessions` | Kimi Code 旧会话 | agent_tool / confirm | user_profile：`.kimi-code sessions wd_*`；`session_tool` `kimi-code`，`unlocks` `kimi-code-sessions` | dir | 720 | 0 | 同上 | Kimi 试验 |

说明：
- 第 9 行的 `path_has_any` 判断的是 D 及其上级的目录名**包含** `.avd`。
- 第 16 行：RULES-M3D 第 3 节要求被兜底的规则恰好 1 个定位器，本文放宽为“主规则与兜底规则定位器个数相同，按下标一一对应，每对的匹配种类、`marker` 或 `patterns`、`max_depth` 相同”。原有两对照旧成立。
- 第 22、23 行要用新的已知目录 `system_drive`（系统盘根，如 `C:\`）：`KnownFolders` 加一个**可选**的键 `system_drive`（`Option<String>`）。`from_json` 缺这个键时照旧接受，以它为基础的定位器不生成目标；有这个键时要求它是盘根、且与 `windows` 同盘。`known_folders_version` 不变。`hard_guards` 照旧包含盘根本身，所以只有盘根下的条目能出现。（扫描包与服务在后面的单里补上这个键，先后合入都不会坏。）
- 会话规则（25～29）只经第 4 节的开关生成目标。

## 7. 数据版本

`data_version` 改为 `2026-11-02.2`。

## 8. 测试

`tests/rules_v1.rs` 仍是精确四个测试，名字不变。新断言加在已有测试里，失败信息带标记：

| 标记 | 内容 |
|---|---|
| `RULES_M35_FIELDS` | 第 1～3 节每个新字段、新方式、新种类、新条件、新定位：合法写法通过，每条校验各有一个被拒的反例；缺省时计划 JSON 与改动前逐字节相同；`file_name` 与 `dir_name_pattern` marker、`custom_discovery` 对两个 custom root 生成的目标、顺序与 `root`；`file_name` 的规则 `item_type` 必须是 `file`；`custom_discovery` 对名字不是 tmp/temp 的 root 不生成 |
| `RULES_M35_SEEDS` | 第 5 节每行改动、第 6 节每条新规则的分类、级别、定位、类型、年龄、保留、在用逐项与表一致；第 16 行兜底的一一对应；新文案不含“垃圾”与英文枚举 |
| `RULES_M35_SESSIONS` | `resolve_plan` 不生成会话目标且输出不变；`resolve_plan_with` 打开 `claude-code` 时生成目标、`min_age_hours` 等于天数 × 24、`unlocks_target_ids` 正确、位置在 `claude-code-sessions` 的目标之后；未知工具被拒；会话规则与它 `unlocks` 的规则之间不触发重叠拒绝，与别的受保护规则重叠仍被拒 |
| `RULES_M35_VERSION` | `data_version` 为 `2026-11-02.2` |

原有断言中，以下几处与本文必然冲突，**获准修改**，其余不变：
1. 规则总数与 custom 规则个数、各种目标总数、custom root 的目标顺序表，只因第 6 节在末尾追加规则而改变的，按新值更新。
2. 所有比对 `data_version` 的断言改为 `2026-11-02.2`。
3. 第 5 节改动的规则，原来逐字段比对的断言按新值更新。
4. 构造或比对 `InUse`、`Locator`、`MatchSpec`、`KnownFolders` 的地方补上新字段的缺省值。

回执逐条写出原值与新值。上面没有覆盖、却必然要改的旧断言：先写受阻回执。

## 9. 负控与真实冒烟

- **nc1**：会话规则与它 `unlocks` 的规则之外的受保护规则重叠也被放过（重叠检查对整条会话规则不做），测试以 `RULES_M35_SESSIONS` 失败。
- **nc2**：`custom_discovery` 对任何 custom root 都生成目标，测试以 `RULES_M35_FIELDS` 失败。
- 负控只认 `src/` 里的改动，只改规则数据不算。
- **真实冒烟**（`--mode real`）：与原来相同，只核对已知目录是否存在；`system_drive` 由 `SystemDrive` 环境变量加 `\` 拼出。
