# RULES-M3D：标记的附加条件与兜底规则（W9-L1）

2026-11-02，总控（Claude）冻结。补充 [RULES](../checkup-v1/RULES.md)、[RULES-M3C](../m3c-v1/RULES-M3C.md)，冲突时以本文为准。只改 `packages/junk-rules/`。来由：10-29 场景复现的 F1、F2（[复现报告](../../docs/acceptance/wave8/controller/WATER-M3-REPLAY-20261101.md)）。扫描侧的同一份 JSON 见 [SCAN-M3D](SCAN-M3D.md)，两张单经这份 JSON 对接，合入时一起合。

## 1. 附加条件（`conditions`）

`marker` 定位器可以带可选字段 `conditions`：一个数组，**全部满足**才算命中这条规则。只看名字、结构与路径文本，不读内容，符合 ADR-018。

| `kind` | 其余字段 | 含义（D 为按原标记命中的目录） |
|---|---|---|
| `parent_has_file` | `name` | D 的父目录里有一个**文件**叫 `name` |
| `parent_has_other_entries` | `except`（名字数组） | D 的父目录里，除 D 自己和 `except` 里的名字之外，**至少还有一个**子项（文件、目录、联接都算） |
| `no_ancestor_suffix` | `suffixes`（数组） | D 的路径里，D 之上的每一级目录名（不含盘符）都**不以**任一后缀结尾 |
| `path_has_any` | `names`（数组） | D 的路径里（含 D 自己，不含盘符）**至少有一级**目录名包含任一字符串 |

比较一律不分大小写（ASCII）。

校验，任何一条不满足都整份规则文件拒收：
- 只有 `category` 为 `custom` 的规则、`kind` 为 `marker` 的定位器可以带 `conditions`。
- `conditions` 有 1～4 项，每种 `kind` 最多一项；未知的 `kind` 拒收；每项只能有上表的字段。
- `name` 与各数组里的字符串：1～64 个字符，只含可打印 ASCII（0x21～0x7E），不含 `\ / : * ? " < > |`，不是 `.` 或 `..`。
- 数组 1～16 项，不分大小写不得重复。
- 不写 `conditions` 与写空数组：前者是原来的形状，后者拒收。

## 2. 两条规则加条件

只加 `conditions`，其余字段与文案不变。

`node-modules` 的定位器：

```json
{"kind":"marker","marker":{"kind":"dir_name","names":["node_modules"]},"max_depth":6,
 "conditions":[
  {"kind":"parent_has_file","name":"package.json"},
  {"kind":"parent_has_other_entries","except":["package.json","package-lock.json","npm-shrinkwrap.json","yarn.lock","pnpm-lock.yaml","bun.lock","bun.lockb","node_modules"]},
  {"kind":"no_ancestor_suffix","suffixes":[".asar.unpacked"]}
 ]}
```

`test-browser-profiles` 的定位器：

```json
{"kind":"marker","marker":{"kind":"children_all","names":["Local State","Default"]},"max_depth":8,
 "conditions":[
  {"kind":"path_has_any","names":["ms-playwright","playwright","puppeteer","selenium","webdriver","chromedriver","cypress"]}
 ]}
```

复现时实测：npm 全局目录、Electron 解包目录、Mirasim 程序版本目录都没有 `package.json`；`isolated-cli\pkg\claude` 只有 `package.json`、`package-lock.json`、`node_modules` 三样；内嵌浏览器（WebView2 的 `EBWebView` 等）的数据目录路径里没有测试工具名。

## 3. 兜底（`fallback_for`）与两条新规则

`marker` 定位器可以带可选字段 `fallback_for`（字符串，另一条规则的 `rule_id`）。含义：**那条规则的标记命中、但附加条件不满足的目录，归到本规则**。

校验：
- 带 `fallback_for` 的规则：`category` 为 `custom`，`level` 为 `advisory`，`locate` 恰好 1 项，这一项不带 `conditions`。
- 被指向的规则存在，`category` 为 `custom`，`locate` 恰好 1 项，是带 `conditions` 的 `marker`，不带 `fallback_for`。
- 两边的 `marker` 与 `max_depth` 完全相同。
- 一条规则最多被一条规则兜底；不能指向自己。

在规则文件里，紧跟 `git-worktrees` 之后（第 63、64 条，下标 62、63）新增两条，字段逐字如下：

**`bundled-node-modules`**

| 字段 | 值 |
|---|---|
| `title_zh` | `程序或工具自带的依赖` |
| `owner_zh` | `Node.js` |
| `category` / `level` | `custom` / `advisory` |
| `locate` | `[{"kind":"marker","marker":{"kind":"dir_name","names":["node_modules"]},"max_depth":6,"fallback_for":"node-modules"}]` |
| `item_type` / `min_age_hours` / `keep_newest` | `dir` / `0` / `0` |
| `in_use` | `{"mode":"none","processes":[]}` |
| `growth` | `slow` |
| `what_zh` | `名字叫 node_modules，但旁边没有像项目的文件，多半是全局安装的命令行工具、桌面程序解包出的文件，或某个程序自带的依赖。` |
| `why_zh` | `删掉可能让对应的工具或程序打不开。Water 无法确认它属于谁，所以不提供清理，仅供参考。` |
| `after_zh` | `确认是不再用的工具后，用安装它的方式卸载，例如 npm uninstall -g。` |
| `fix_hint_zh` | `null` |
| `sources` | `[{"kind":"local_observation","ref":"10-29 场景复现 docs/acceptance/wave8/controller/WATER-M3-REPLAY-20261101.md：npm 全局目录、Electron 解包目录、Mirasim 程序目录被认成项目依赖","checked_on":"2026-11-01"}]` |

**`browser-data-dirs`**

| 字段 | 值 |
|---|---|
| `title_zh` | `浏览器数据目录` |
| `owner_zh` | `内嵌浏览器` |
| `category` / `level` | `custom` / `advisory` |
| `locate` | `[{"kind":"marker","marker":{"kind":"children_all","names":["Local State","Default"]},"max_depth":8,"fallback_for":"test-browser-profiles"}]` |
| `item_type` / `min_age_hours` / `keep_newest` | `dir` / `0` / `0` |
| `in_use` | `{"mode":"none","processes":[]}` |
| `growth` | `slow` |
| `what_zh` | `看起来像完整的浏览器配置，但路径里没有自动化测试工具的名字，多半是某个桌面程序内嵌浏览器（Chromium、WebView2、CEF）的数据。` |
| `why_zh` | `里面可能有登录状态和程序数据，删掉可能要重新登录或让程序出错，所以不提供清理，仅供参考。` |
| `after_zh` | `要清理，请在对应程序里退出登录或卸载程序。` |
| `fix_hint_zh` | `null` |
| `sources` | `[{"kind":"local_observation","ref":"10-29 场景复现 docs/acceptance/wave8/controller/WATER-M3-REPLAY-20261101.md：内嵌浏览器的数据目录被认成测试用浏览器配置","checked_on":"2026-11-01"}]` |

## 4. Rust 类型与计划

公开接口新增，并**获准**给两个已有的变体加字段（服务里对它们的匹配都写了 `..`，不受影响）：
- 新类型 `Condition`（`Debug, Clone, PartialEq, Eq`），四个变体：`ParentHasFile { name }`、`ParentHasOtherEntries { except }`、`NoAncestorSuffix { suffixes }`、`PathHasAny { names }`，从 crate 根导出。
- `Locator::Marker` 与 `MatchSpec::Marker` 各加 `conditions: Vec<Condition>`、`fallback_for: Option<String>`。

`resolve_plan`：
- 目标的生成方式与顺序不变：两条新规则排在 `git-worktrees` 之后，所以每个 custom root 的目标依次多出 `custom:<root_id>:bundled-node-modules#1`、`custom:<root_id>:browser-data-dirs#1`。
- 主规则的目标原样带上 `conditions`。
- 兜底规则的目标：`fallback_for` 写**同一 root 下主规则目标的 `target_id`**（如 `custom:alpha:node-modules#1`），`root`、`marker`、`max_depth` 与主目标相同。

计划 JSON（`plan_version` 仍是 `water.scan-plan.v1`）：
- 带条件的 marker 匹配多一个 `conditions` 键，兜底的多一个 `fallback_for` 键，都排在 `max_depth` 之后。
- 条件对象的键依次为 `kind`，再加上表里它自己的那一个字段。
- **不带条件、不是兜底的目标，序列化结果与改动前逐字节相同**（不出现这两个键）。
- 本包的 `ScanPlan::from_json` 读得回这两个字段，往返不变。

`locator_key` 与定位摘要（`marker:dir_name:node_modules:6` 这类）的格式不变，不含条件与兜底。

## 5. 数据版本

`data_version` 改为 `2026-11-02.1`。

## 6. 测试

`tests/rules_v1.rs` 仍是精确四个测试，名字不变。新断言加在已有测试里，失败信息带标记：

| 标记 | 内容 |
|---|---|
| `RULES_M3D_CONDITIONS` | 第 1 节的每条校验各有一个被拒的反例，合法写法通过；`node-modules`、`test-browser-profiles` 的 `conditions` 逐项等于第 2 节；它们的计划目标带同样的条件；计划 JSON 往返不变；不带条件的目标里不出现 `conditions` 与 `fallback_for` 两个键 |
| `RULES_M3D_FALLBACK` | 两条新规则的字段逐项等于第 3 节（与 `git-worktrees` 一样整条 JSON 比对）；第 3 节的每条兜底校验各有一个被拒的反例；有两个 custom root 时，每个 root 生成兜底目标，`fallback_for` 指向同 root 的主目标，`root`、`marker`、`max_depth` 相同；盘根 `F:\` 也一样 |
| `RULES_M3D_VERSION` | `data_version` 为 `2026-11-02.1` |

原有断言中，以下几处与本文必然冲突，**获准修改**，其余不变：
1. 规则总数 76 → 78；种子表在下标 62、63 加两行；Agent 工具规则的切片 `rules()[62..]` → `rules()[64..]`。
2. 两个 custom root 的目标总数 257 → 261。
3. custom 规则个数 6 → 8。
4. Agent 工具目标的起点 `beta_position + 3` → `beta_position + 7`（beta 的 Rust 目标之后先是两个 `git-worktrees`，再是四个新目标），追加的个数仍是 38。
5. 盘根 `F:\` 的 marker 目标 6 → 8，顺序表末尾加 `custom:drive-f:bundled-node-modules#1`、`custom:drive-f:browser-data-dirs#1`。
6. 所有比对 `data_version` 的断言 `2026-10-31.1` → `2026-11-02.1`（含 `RULES_M3_WORDING`、`RULES_M3C_VERSION` 的那几处）。
7. 列出全部字段构造或比对 `Locator::Marker`、`MatchSpec::Marker` 的地方补上新字段：`node-modules` 与 `test-browser-profiles` 补第 2 节的条件，其余补 `conditions: vec![]`、`fallback_for: None`。
8. 其它旧断言若**只因**“下标 62、63 新增两条规则”而改变计数、下标或顺序，同样获准，按新位置更新；文案与字段值不在此列。

回执逐条写出原值与新值。上面没有覆盖、却必然要改的旧断言：先写受阻回执。

新规则的 `what_zh`、`why_zh`、`after_zh` 都不含“只列出”，也不含“被占用的文件会跳过”，原有的措辞检查不用改。

## 7. 负控与真实冒烟

- **nc1**：校验器不再要求被兜底的规则带 `conditions`，测试以 `RULES_M3D_FALLBACK` 失败。
- **nc2**：`resolve_plan` 不把 `conditions` 带进目标，测试以 `RULES_M3D_CONDITIONS` 失败。
- 负控只认 `src/` 里的改动，只改规则数据不算。
- **真实冒烟**（`--mode real`）与原来相同，只核对已知目录是否存在。
