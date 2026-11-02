# SCAN-M3D：附加条件、兜底目标与增长提示（W9-L2）

2026-11-02，总控（Claude）冻结。补充 [SCAN](../checkup-v1/SCAN.md)、[SCAN-M3C](../m3c-v1/SCAN-M3C.md)，冲突时以本文为准。只改 `packages/junk-scan/`。计划 JSON 的新字段由 [RULES-M3D](RULES-M3D.md) 第 1、3、4 节定义，本包按同一份 JSON 解析，两张单合入时一起合。

## 1. 计划 JSON

`Match::Marker` 加两个可选字段，缺省时与原来完全一样：
- `conditions`：附加条件数组，JSON 与校验逐条照 RULES-M3D 第 1 节；本包自己定义同形的 `Condition` 类型。
- `fallback_for`：字符串，同一份计划里另一个目标的 `target_id`。

两个字段都用 `serde` 缺省值，序列化时为空就省略。原有计划（不含这两个键）照旧解析，行为完全不变。

校验（不通过就是 `InvalidPlan`）：
- `conditions` 照 RULES-M3D 第 1 节：1～4 项，每种 `kind` 最多一项，字符串与数组的限制相同。
- 带 `fallback_for` 的目标本身不带 `conditions`。它指向的目标必须同时满足：
  - 存在、不是它自己；
  - 是 marker 匹配，带非空的 `conditions`，不带 `fallback_for`；
  - `root`（不分大小写）、`marker`、`max_depth` 与它完全相同。
- 一个目标最多被一个目标兜底。

## 2. 条件怎么判断

D 是按原有标记语义命中的目录。

- **父目录**：在这次遍历里列出 D 的那个目录，用它已经列出的子项清单判断。**不得为此再列任何目录**：每个目录最多列一次，这是 SCAN-M3C 的要求，不变。
  - D 就是目标的根目录（深度 0）时，父目录不在这次遍历里，`parent_has_file` 与 `parent_has_other_entries` 视为**不满足**。
- **路径**：用扫描为 D 拼出的路径文本，按 `\` 分级，去掉盘符那一级。
  - `no_ancestor_suffix` 看 D 之上的各级；
  - `path_has_any` 看各级（含 D 自己）。
- 比较一律不分大小写（ASCII）。各条的含义照 RULES-M3D 第 1 节的表。

## 3. 命中归谁

- **条件全部满足**：命中算主目标的，与原来相同。
- **有任一条不满足**：
  - 计划里有兜底它的目标时，命中算兜底目标的。测量方式完全相同（`total_bytes`、`unique_bytes`、`file_count`、最新与最早活动、`has_git`、identity），资格判断用兜底目标自己的 `level`、`min_age_hours`、`keep_newest`、`in_use`；
  - 没有兜底目标时，不算任何目标的命中。
- **两种情况下**，主目标都不再往 D 里面找，与普通命中相同。D 只测量一次。
- **兜底目标不单独搜索**：
  - 不列目录，不记列目录的问题，没有自己的进度；
  - 根目录不存在或是联接时，与主目标一样记 `base_missing` / `base_reparse`；
  - 它的组与其它目标的组一样出现在结果里，没有命中时为 0 项。
- 同一份计划里，带条件的计划与去掉条件和兜底目标的同一份计划相比，`visited_entries` 相等。

## 4. 增长提示（`snapshot.rs` 的 `growth`）

1. 两次快照间隔**不足 24 小时**（86 400 秒）时返回空数组。原来的下限是 1 小时。
2. `leak_suspect` 还要求**体量在增加**：`bytes_delta > 0`，并且（`count_delta >= 20` 且最近有活动，或 `bytes_per_day >= 1 GiB`）。
3. 其余不变：`days` 的算法、`bytes_per_day` 按精确间隔四舍五入、“最近有活动”的定义、输出字段。

## 5. 测试

`tests/scan_v1.rs` 仍是精确五个测试，名字不变。新断言加在已有测试里，失败信息带标记：

| 标记 | 放在 | 内容 |
|---|---|---|
| `SCAN_M3D_PLAN` | `scan_plan_contract` | 带条件、带兜底的计划能解析；第 1 节的每条校验各有一个被拒的反例；不含新键的旧计划解析结果不变 |
| `SCAN_M3D_CONDITIONS` | `scan_pattern_marker_discovery` | 用合成夹具，见下表 |
| `SCAN_M3D_GROWTH` | `scan_snapshot_growth_keys` | 23 小时返回空；恰好 24 小时有结果；体量减少时，即使多了 20 个且最近有活动，`leak_suspect` 也为假；体量增加且多了 20 个为真；每天增加 1 GiB 为真 |

`SCAN_M3D_CONDITIONS` 的夹具（只建在本树 `.local/` 下，主目标用 RULES-M3D 第 2 节的条件）：

| 夹具 | 预期 |
|---|---|
| `proj\package.json`、`proj\src\a.js`、`proj\node_modules\x\index.js` | `proj\node_modules` 算主目标 |
| `npmglobal\claude.cmd`、`npmglobal\node_modules\…`（没有 `package.json`） | 算兜底目标 |
| `pkg\package.json`、`pkg\package-lock.json`、`pkg\node_modules\…`（只有这三样） | 算兜底目标 |
| `app\resources\app.asar.unpacked\package.json`、同级 `lib\…`、同级 `node_modules\…` | 算兜底目标（后缀条件） |
| `proj\node_modules\x\node_modules\y\…` | 不单独出现 |
| 目标根目录本身就叫 `node_modules` | 算兜底目标 |
| `tests\playwright-profile-1\` 下有 `Local State` 与 `Default\` | 算浏览器主目标 |
| `app2\EBWebView\` 下有 `Local State` 与 `Default\` | 算浏览器兜底目标 |
| 计划里没有兜底目标时的 `npmglobal` | 不算任何目标的命中，下面也不出现 |
| 兜底命中的级别、年龄资格 | 来自兜底目标自己的字段 |
| 带条件与不带条件的同一份计划 | `visited_entries` 相等 |

原有断言中，以下几处与本文必然冲突，**获准修改**，其余不变：
1. `scan_snapshot_growth_keys` 里间隔不足 24 小时的样例：
   - `cur19`、`cur20` 原来比 `prev` 晚 2 小时，改为晚至少 24 小时，各自要证明的不变：多 19 个不算疑似；多 20 个、最近有活动、体量增加算疑似（`newest_activity` 仍在它自己的 `taken_at` 之前 24 小时内）。
   - `one_hour` 原来是 1 小时，用来核对按精确间隔四舍五入。改为一个不足整天倍数的间隔（如 25 小时），按同一公式重算期望的 `bytes_per_day`。原来那组 1 小时的样例改为断言返回空。
   - `hour`（30 分钟）仍断言返回空。
2. 列出全部字段构造或比对 `Match::Marker` 的地方，补上 `conditions: vec![]`、`fallback_for: None`。

回执逐条写出原值与新值。上面没有覆盖、却必然要改的旧断言：先写受阻回执。

## 6. 负控与真实冒烟

- **nc1**：不满足条件的命中仍算主目标（条件被忽略），测试以 `SCAN_M3D_CONDITIONS` 失败。
- **nc2**：增长的间隔下限改回 1 小时，测试以 `SCAN_M3D_GROWTH` 失败。
- 负控只认 `src/` 里的改动。
- **真实冒烟**（`--mode real`）与原来相同：一次只读真实扫描，只输出组级汇总，不含路径。
