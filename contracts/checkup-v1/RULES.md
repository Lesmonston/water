# WATER-W2-A 规则登记表 SPEC

2026-10-26 冻结。产出新 crate `packages/junk-rules`（`water-junk-rules`），包含：规则数据 `rules/windows.json`、严格校验器、把规则解析成 [MODEL](MODEL.md) 第 4 节扫描计划的解析器，以及给界面用的文案查询。纯数据与纯逻辑，不访问磁盘、环境变量、注册表或网络（真实冒烟模式除外，见第 6 节）。

## 1. crate 形状

- 独立 workspace，`edition = "2024"`，`rust-version = "1.95"`，`publish = false`，四个 auto 发现关闭；lib 名 `water_junk_rules`，`#![forbid(unsafe_code)]`。
- 依赖只允许 `serde = { version = "=1.0.229", features = ["derive"] }`、`serde_json = "=1.0.151"`，离线锁生成。无 build 脚本、无 dev-dependencies。
- 规则数据用 `include_str!` 编进库；`RuleSet::embedded()` 返回校验过的规则集。

## 2. 规则数据（`water.junk-rules.v1`）

```json
{"rules_version":"water.junk-rules.v1","data_version":"2026-10-26.1","rules":[Rule,...]}
```

Rule 字段（全部必填，未知键拒绝）：

| 字段 | 约束 |
|---|---|
| `rule_id` | `[a-z0-9-]`，3～48 字符，唯一；即 group_id |
| `title_zh` | 2～24 个字符，界面标题，如“Chrome 网页缓存” |
| `owner_zh` | 1～24 个字符，归属，如“Google Chrome”“Codex”“Windows” |
| `category`、`level` | MODEL 枚举；`custom` 只能配 marker 定位，`unrecognized` 不得出现在规则里 |
| `locate` | 1～8 个定位器，见下 |
| `item_type` | MODEL 枚举 |
| `min_age_hours` | 0～8760 整数 |
| `keep_newest` | 0～8 整数 |
| `in_use` | MODEL 第 4 节结构；进程名为小写 `*.exe`，1～8 个；mode 为 none 时 processes 为空数组 |
| `growth` | `one_off`、`slow`、`leak_prone` |
| `what_zh`、`why_zh`、`after_zh` | 各 4～160 字符：这是什么 / 为什么可以清（受保护时写为什么不清）/ 清理后会怎样 |
| `fix_hint_zh` | `leak_prone` 时必填 8～240 字符，其余为 null |
| `sources` | 1～6 条 `{"kind":"local_observation"|"official_doc"|"skill","ref":"...","checked_on":"YYYY-MM-DD"}`；official_doc 的 ref 必须是 https URL |

定位器三种：`{"kind":"pattern","base":<known_folder>,"segments":[...]}`、`{"kind":"marker","marker":<marker>,"max_depth":1～16}`、`{"kind":"discovery","base":<known_folder>}`。段语法与 marker 形状见 MODEL。marker 另增 `{"kind":"dir_name","names":[...]}`：目录名（ASCII 大小写不敏感）等于其中之一即命中，1～8 个名字。

文案语气：说人话、短句，不出现规则 ID、英文枚举或“垃圾”一词；参考 [设计说明](../../docs/design/water-ui-v1/DESIGN.md) 第 7 节与静态稿里的分组详情。

## 3. 校验（`RuleSet::from_json`）

除字段约束外，校验器必须拒绝：

1. 同一 base 上，可清理规则（recommended/confirm）的某个 pattern 定位器可能包含或等于某个 protected 规则的定位器。判定：可清理定位器有 k 段、受保护定位器有 m ≥ k 段，前 k 段逐段“可能重叠”即拒绝。两个段都不含通配符时按大小写不敏感比较是否相等；任一含通配符视为可能重叠。
2. discovery 规则级别不是 recommended/confirm、或 min_age_hours < 24。
3. `recommended` 规则 min_age_hours 为 0 却 growth 为 `leak_prone`（泄漏型必须有年龄阈值，避免删掉正在写的目录）。
4. 同一 rule 的定位器重复。
5. data_version 不是 `YYYY-MM-DD.N`。

错误类型 `RulesError` 只给固定枚举（字段路径 + 原因码），不回显输入值。

## 4. 解析（`resolve_plan`）

```rust
pub fn resolve_plan(rules: &RuleSet, folders: &KnownFolders, custom_roots: &[CustomRoot], created_at: &str)
    -> Result<ScanPlan, RulesError>;
pub fn plan_to_json(plan: &ScanPlan) -> String;
pub struct CustomRoot { pub root_id: String, pub path: String } // root_id: [a-z0-9-]{1,32}
```

- `KnownFolders` 按 MODEL 第 3 节，`KnownFolders::from_json` 严格校验（绝对路径、无 `..`、`user_temp`/`system_temp` 与上级一致）。
- pattern 定位器：base 换成对应 known folder 的值，target_id = `<rule_id>#<序号>`，group_id = rule_id。
- discovery：root = known folder。
- marker：对每个 custom root 生成一个 target，root = 该 custom root，group_id = `custom:<root_id>:<rule_id>`，target_id = `custom:<root_id>:<rule_id>#<序号>`。没有 custom root 时不生成。
- `hard_guards`：去重后的全部 known folder 值、它们的盘根（如 `C:\`）、每个 custom root。
- 输出顺序确定：按规则文件顺序，同一规则按定位器顺序，custom root 按传入顺序。
- 文案查询：`RuleSet::text(group_id) -> Option<RuleText>`，对 `custom:<root_id>:<rule_id>` 返回对应规则文案。

## 5. 种子规则（首版必须全部落地）

UD 指浏览器 User Data 目录：Chrome = `local_app_data` 下 `Google\Chrome\User Data`，Edge = `Microsoft\Edge\User Data`，Brave = `BraveSoftware\Brave-Browser\User Data`。三家浏览器的规则各写一份（rule_id 前缀 `chrome-`、`edge-`、`brave-`），进程分别为 `chrome.exe`、`msedge.exe`、`brave.exe`。

| rule_id | 分类 | 级别 | 定位（base: segments） | 类型 | 年龄 h | 保留 | 在用 | 增长 |
|---|---|---|---|---|---:|---:|---|---|
| codex-marketplace-staging | agent_tool | recommended | user_profile: `.codex*` `.tmp` `marketplaces` `.staging` `marketplace-upgrade-*` | dir | 1 | 0 | none | leak_prone |
| codex-runtimes | agent_tool | confirm | user_profile: `.cache` `codex-runtimes` `*` | dir | 24 | 1 | none | slow |
| claude-desktop-old-versions | agent_tool | recommended | local_app_data: `AnthropicClaude` `app-*` | dir | 24 | 1 | cmdline_references_item: claude.exe | slow |
| claude-desktop-packages | agent_tool | confirm | local_app_data: `AnthropicClaude` `packages` | dir | 24 | 0 | none | slow |
| claude-code-scratchpad | agent_tool | confirm | system_temp: `claude` `*` `*` | dir | 72 | 0 | none | slow |
| grok-downloads | agent_tool | recommended | user_profile: `.grok` `downloads` `*` | any | 24 | 0 | none | one_off |
| headless-browser-profiles | agent_tool | recommended | system_temp 与 user_temp 各一组：`rb#*-chrome-*`、`hrender-*`、`playwright_chromiumdev_profile-*`、`puppeteer_dev_profile-*`（共 8 个定位器） | dir | 1 | 0 | cmdline_references_item: chrome.exe, msedge.exe, chrome-headless-shell.exe | leak_prone |
| claude-code-sessions | agent_tool | protected | user_profile: `.claude` `projects` | dir | 0 | 0 | none | slow |
| claude-code-file-history | agent_tool | protected | user_profile: `.claude` `file-history` | dir | 0 | 0 | none | slow |
| cursor-chats | agent_tool | protected | user_profile: `.cursor` `chats` | dir | 0 | 0 | none | slow |
| codex-sessions | agent_tool | protected | user_profile: `.codex*` `sessions` | dir | 0 | 0 | none | slow |
| grok-sessions | agent_tool | protected | user_profile: `.grok` `sessions` | dir | 0 | 0 | none | slow |
| {b}-cache | browser | recommended | UD `*` `Cache`；UD `*` `Media Cache` | dir | 0 | 0 | process_running | slow |
| {b}-code-gpu-cache | browser | recommended | UD `*` `Code Cache`、`GPUCache`、`DawnCache`、`DawnGraphiteCache`、`DawnWebGPUCache`；UD `ShaderCache`、`GrShaderCache`、`GraphiteDawnCache` | dir | 0 | 0 | process_running | slow |
| {b}-service-worker-cache | browser | confirm | UD `*` `Service Worker` `CacheStorage`；UD `*` `Service Worker` `ScriptCache` | dir | 0 | 0 | process_running | slow |
| {b}-crash-reports | crash_log | recommended | UD `Crashpad` `reports` | dir | 24 | 0 | none | slow |
| {b}-login-and-site-data | browser | protected | UD `*` 下：`Network`、`Cookies`、`Login Data`、`Local Storage`、`IndexedDB`、`Session Storage`、`Sessions`、`Web Data` | any | 0 | 0 | none | slow |
| chrome-on-device-model | browser | advisory | UD(Chrome) `OptGuideOnDeviceModel` | dir | 0 | 0 | none | one_off |
| firefox-cache | browser | recommended | local_app_data: `Mozilla` `Firefox` `Profiles` `*` `cache2` | dir | 0 | 0 | process_running: firefox.exe | slow |
| electron-app-cache | app_leftover | recommended | roaming_app_data: `*` `Cache`、`*` `Code Cache`、`*` `GPUCache`、`*` `DawnCache`；local_app_data: `*` `Cache`、`*` `GPUCache` | dir | 1 | 0 | none | slow |
| app-logs | crash_log | confirm | roaming_app_data: `*` `logs`；local_app_data: `*` `logs` | dir | 168 | 0 | none | slow |
| installer-unpack-temp | app_leftover | recommended | system_temp: `vscode-stable-*`、`vscode-user-*`、`sand-update*`、`workbuddy-update-*`、`codebuddy-marketplace-install*` | dir | 24 | 0 | none | slow |
| downloads-installers | app_leftover | confirm | downloads: `*.exe`、`*.msi`、`*.msix`、`*.msixbundle`、`*.appx` | file | 168 | 0 | none | one_off |
| squirrel-packages | app_leftover | confirm | local_app_data: `*` `packages` | dir | 24 | 0 | none | slow |
| windows-delivery-optimization | app_leftover | advisory | windows: `ServiceProfiles` `NetworkService` `AppData` `Local` `Microsoft` `Windows` `DeliveryOptimization` | dir | 0 | 0 | none | slow |
| windows-update-download | app_leftover | advisory | windows: `SoftwareDistribution` `Download` | dir | 0 | 0 | none | slow |
| system-temp-old | system_temp | recommended | discovery: system_temp | any | 168 | 0 | none | slow |
| user-temp-old | system_temp | recommended | discovery: user_temp | any | 168 | 0 | none | slow |
| npm-cache | dev_cache | recommended | local_app_data: `npm-cache` | dir | 1 | 0 | none | slow |
| pip-cache | dev_cache | recommended | local_app_data: `pip` `cache` | dir | 1 | 0 | none | slow |
| yarn-cache | dev_cache | recommended | local_app_data: `Yarn` `Cache` | dir | 1 | 0 | none | slow |
| uv-cache | dev_cache | advisory | local_app_data: `uv` `cache` | dir | 0 | 0 | none | slow |
| pnpm-store | dev_cache | advisory | local_app_data: `pnpm` `store` | dir | 0 | 0 | none | slow |
| cargo-registry-cache | dev_cache | recommended | user_profile: `.cargo` `registry` `cache`；`.cargo` `registry` `src` | dir | 1 | 0 | none | slow |
| gradle-caches | dev_cache | confirm | user_profile: `.gradle` `caches` | dir | 24 | 0 | none | slow |
| playwright-browsers | dev_cache | confirm | local_app_data: `ms-playwright` | dir | 24 | 0 | none | one_off |
| node-gyp-cache | dev_cache | recommended | local_app_data: `node-gyp` `Cache` | dir | 1 | 0 | none | one_off |
| electron-build-cache | dev_cache | recommended | local_app_data: `electron-builder` `Cache`；`electron` `Cache` | dir | 1 | 0 | none | one_off |
| jest-cache | dev_cache | recommended | system_temp: `jest`；user_temp: `jest` | dir | 1 | 0 | none | slow |
| huggingface-models | dev_cache | advisory | user_profile: `.cache` `huggingface` | dir | 0 | 0 | none | one_off |
| ollama-models | dev_cache | advisory | user_profile: `.ollama` `models` | dir | 0 | 0 | none | one_off |
| crash-dumps | crash_log | recommended | local_app_data: `CrashDumps` `*.dmp` | file | 24 | 0 | none | slow |
| wer-user-reports | crash_log | recommended | local_app_data: `Microsoft` `Windows` `WER` `ReportArchive` `*`；同路径 `ReportQueue` `*` | dir | 24 | 0 | none | slow |
| wer-system-reports | crash_log | advisory | program_data: `Microsoft` `Windows` `WER` | dir | 0 | 0 | none | slow |
| gpu-shader-cache | gpu_system | recommended | local_app_data: `NVIDIA` `DXCache`、`NVIDIA` `GLCache`、`D3DSCache`、`AMD` `DxCache`、`AMD` `GLCache`、`Intel` `ShaderCache` | dir | 0 | 0 | none | slow |
| explorer-thumbnail-cache | gpu_system | advisory | local_app_data: `Microsoft` `Windows` `Explorer` | dir | 0 | 0 | none | slow |
| cachedir-tagged | custom | recommended | marker file `CACHEDIR.TAG` 43～1024 字节，max_depth 12 | dir | 1 | 0 | none | slow |
| python-tool-caches | custom | recommended | marker dir_name `__pycache__` `.pytest_cache` `.mypy_cache` `.ruff_cache`，max_depth 12 | dir | 1 | 0 | none | slow |
| test-browser-profiles | custom | confirm | marker children_all `Local State` `Default`，max_depth 8 | dir | 24 | 0 | cmdline_references_item: chrome.exe, msedge.exe | slow |
| node-modules | custom | confirm | marker dir_name `node_modules`，max_depth 6 | dir | 168 | 0 | none | slow |

说明：`uv-cache`、`pnpm-store` 依据规则包 B 的已核对事实（uv 不允许直接修改缓存，pnpm store 有共享链接），只给“请运行 uv cache clean / pnpm store prune”的建议。`electron-app-cache` 与 `squirrel-packages` 的 `*` 可能命中 `Application Data` 这类系统联接，联接由扫描端跳过，不在规则端特判。

## 6. 测试与检查

唯一测试文件 `packages/junk-rules/tests/rules_v1.rs`，精确四个测试：`rules_schema_strict`、`rules_protection_precedence`、`rules_resolve_plan`、`rules_seed_coverage`。

- schema：每类字段越界、未知键、重复 rule_id、错误 data_version、leak_prone 无年龄、discovery 年龄不足均被拒绝；错误不回显输入。
- precedence：构造“可清理 `User Data` `*`”对“受保护 `User Data` `*` `Cookies`”必须拒绝；“`*` `Cache`”对“`*` `Network`”必须通过；嵌入的种子集合通过。
- resolve：用合成 KnownFolders 与两个 custom root，核对 target 数量与顺序、group_id、hard_guards、MODEL 形状，输出能被同样严格的解析读回。
- seed coverage：第 5 节每个 rule_id 都存在，级别、分类、定位器与表一致；每条有中文文案与来源。

有效负控 nc1：真实移除第 3 节第 1 条的重叠检查，使 precedence 测试失败，失败信息含 `RULES_PRECEDENCE`；立即原字节恢复后测试全绿。

真实冒烟（`--mode real`，只读）：`examples/real_smoke.rs` 用环境变量 `USERPROFILE`、`LOCALAPPDATA`、`APPDATA`、`ProgramData`、`SystemRoot` 拼出 KnownFolders（downloads = `USERPROFILE\Downloads`），对每个 pattern 定位器只检查“第一段之前的 base 是否存在”和“全字面段组成的前缀是否存在”，输出每条规则 `{rule_id, base_exists, literal_prefix_exists}`。不列目录、不读文件。结果写入回执，用来证明规则路径在这台机器上是活的。
