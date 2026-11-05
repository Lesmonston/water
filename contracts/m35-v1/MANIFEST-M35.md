# MANIFEST-M35：项目清理声明与工作树登记（W10-M3）

2026-11-05，总控（Claude）冻结（11-02 起草，11-05 按通读结果修订）。新建 `packages/cleanup-manifest/`，只改这个目录。

来由：[ADR-019](../../docs/decisions/ADR-019-project-declarations-and-quarantine.md) 第 1、2 节（用户 11-02 拍板），[第十波计划](../../docs/dispatch/wave10/PLAN.md)第 2 节第 23、57、60 行，[第九波计划](../../docs/dispatch/wave9/PLAN.md) 4.4 节。

## 1. 包的形状与边界

- crate `water-cleanup-manifest`，lib 名 `water_cleanup_manifest`；独立 workspace，edition 2024，rust-version 1.95，`autotests = false`；依赖只有 `serde = "=1.0.229"`（derive）与 `serde_json = "=1.0.151"`。`#![forbid(unsafe_code)]`。
- **只读两种文件**：名为 `.water-cleanup.json` 的普通文件（第 2 节）、名为 `.git` 的普通文件（第 6 节）。别的文件一律不打开。
- `src/` 里允许的文件系统调用只有：`std::fs::symlink_metadata`、`std::fs::metadata`（只在第 6 节查路径在不在）、`OpenOptions::new().read(true)`（带 `FILE_FLAG_OPEN_REPARSE_POINT`，即 `custom_flags(0x0020_0000)`）与 `Read`。不得写、建、删、改名、改属性，不得起进程、联网。检查器按名字拒收 `fs::write`、`File::create`、`.write(true)`、`.append(`、`create_dir`、`remove_`、`rename`、`set_permissions`、`std::process`、`std::net`。
- 本包不跑 git，不认 `.git` 目录里的任何东西，不执行声明里的任何字段。

## 2. 声明文件 `.water-cleanup.json` 第一版

```json
{
  "version": 1,
  "project": "Water",
  "producer": "总控与执行器",
  "disposable": [
    {
      "id": "worktree-builds",
      "title": "工作树里的构建产物",
      "paths": [".worktrees/*/.local/target", ".worktrees/*/.local/*-profile-*"],
      "kind": "build",
      "when": "older-than-3-days",
      "keepNewest": 0,
      "ask": true,
      "producer": "cargo test 与界面冒烟",
      "fixedIn": null
    }
  ],
  "protected": [".offline-cache", "docs"],
  "worktrees": [{ "path": ".worktrees/w10-m1", "note": "第十波 M1" }]
}
```

| 键 | 必填 | 取值 |
|---|---|---|
| `$schema` | 否 | 字符串，≤ 256 字符，忽略 |
| `version` | 是 | 数字 `1` |
| `project`、`producer` | 否 | 1～64、1～200 字符，只显示 |
| `disposable` | 否 | 0～64 项，见下 |
| `protected` | 否 | 0～64 个路径模式（第 3 节） |
| `worktrees` | 否 | 0～64 项 `{"path": 不带通配的路径模式, "note": 0～200 字符（可省）}`，只显示 |

`disposable` 的每一项：

| 键 | 必填 | 取值 |
|---|---|---|
| `id` | 是 | 1～48 个 `[a-z0-9-]`，整份文件内不重复 |
| `title` | 是 | 1～60 字符 |
| `paths` | 是 | 1～16 个路径模式 |
| `when` | 是 | `always`、`older-than-N-days`（N 为 1～365，不带前导零）、`sibling-complete-file-exists` |
| `kind` | 否 | `leak`、`cache`、`build`、`download`、`test`、`other`（缺省） |
| `keepNewest` | 否 | 0～8，缺省 0 |

（N 与 `keepNewest` 的上限照服务的计划类型——规则包的 `ScanPlan` 只接受 `min_age_hours` ≤ 8760、`keep_newest` ≤ 8。）
| `ask` | 否 | 布尔，缺省 false；true 为“需要确认”，否则为“推荐清理” |
| `producer` | 否 | 0～200 字符，只显示 |
| `fixedIn` | 否 | 字符串（0～200 字符）或 `null`，只显示 |

- 字符串里不得有控制字符。任何位置出现表外的键，整份无效。
- `when` 为 `sibling-complete-file-exists` 时，每个模式的最后一段必须以字面后缀结尾：`.` 加 1～16 个 ASCII 字母数字，后缀里没有通配（如 `*.parts`、`downloads/*.crdownload`）。含义：去掉这个后缀后的同名普通文件在旁边，且不小于它。

## 3. 路径模式

- 相对声明所在目录。分隔符 `/` 或 `\`；1～8 段；整体 ≤ 512 字符。
- 每段 1～255 字符；不是 `.` 或 `..`；不含 `:`、`<`、`>`、`"`、`|`、`#`、控制字符；不以 `.` 或空格结尾。
- 通配只有 `*`（同一段内任意个字符）与 `?`（一个字符）；不得出现 `**`。
- 不得以分隔符开头（即不能是绝对路径；盘符因 `:` 已被拒）。
- 不得每一段都只是 `*`（“单独的 `*`”）。
- 任何一段不得是 `.git`（不分大小写）。通配段在扫描里也不会匹配到 `.git`（SCAN-M35 第 6.6 节）。
- 还要能被扫描的段语法接受；本包按第 7 节测试里列出的例子核对。

## 4. 转成扫描目标

```rust
pub fn to_targets(manifest: &Manifest, dir: &str, trusted: bool) -> Vec<serde_json::Value>;
```

- `trusted` 为 false 时返回空数组（不信任的声明只有 `protected` 生效，见第 5 节）。
- `dir` 是声明所在目录的绝对路径。`key` = `dir` 的 ASCII 小写的 UTF-8 字节的 SHA-256 的前 12 位小写十六进制（ID 只能含 `[A-Za-z0-9:._-]`，服务据此校验，也不让路径进界面参数）。
- `disposable` 第 i 项的第 j 个模式（j 从 1 起）生成一个目标，值如下，取缺省值的键不省略（这是扫描计划 JSON，SCAN-M35 第 1 节）；返回的是 `serde_json::Value`，**不要求键的顺序**（测试按值比较）：

```json
{"target_id":"decl:<key>:<id>.<j>","group_id":"decl:<key>:<id>","rule_id":"decl:<id>",
 "level":"recommended 或 confirm","category":"custom",
 "match":{"kind":"pattern","base":"<dir>","segments":["<段>",…]},
 "item_type":"any","min_age_hours":<N×24 或 0>,"keep_newest":<keepNewest>,
 "in_use":{"mode":"runs_from_or_references_item","processes":[]}}
```

- `when` 为 `always`、`sibling-complete-file-exists` 时 `min_age_hours` 为 0。
- `sibling-complete-file-exists` 时，`match` 在 `segments` 之后多一个键 `"conditions":[{"kind":"sibling_without_suffix","suffixes":["<后缀>"]}]`，后缀即第 2 节要求的那个（小写）。
- 模式里的 `\` 统一成段数组，段原样（`*`、`?` 与扫描语法相同）。
- 输出顺序：先按 `disposable` 的顺序，再按 `paths` 的顺序。

## 5. 保护

```rust
pub fn protects(manifest: &Manifest, dir: &str, path: &str) -> Option<usize>;
```

- 返回第一个与 `path` 重叠的 `protected` 模式的下标，没有则 None。信任与否都要用（ADR-019 第 1 节第 3 条：永远生效）。
- 重叠按文字保守判断：`path` 不在 `dir` 之内则 None；`path` 等于 `dir` 时，只要有任何 `protected` 就算重叠；否则把 `path` 相对 `dir` 的各段 c₁…cₖ 与模式的各段 p₁…pₙ 比，前 min(k, n) 段逐段匹配（不分大小写）即算重叠——k ≥ n 是位于保护之内，k < n 是可能包住受保护的东西。
- 服务（M7）用它把重叠的条目判为不可清，并且不放进清理计划。

## 6. 工作树登记：读 `.git` 小文件（ADR-019 第 2 节）

```rust
pub struct GitLink {
    pub state: String,           // "valid"、"detached"、"invalid"
    pub gitdir: Option<String>,
}
pub fn read_git_link(worktree_dir: &str) -> GitLink;
```

- 只看 `<worktree_dir>\.git`：必须是普通文件、不是重解析点、≤ 1024 字节，否则 `invalid`。
- 只取第一行（到 `\n` 为止，去掉结尾 `\r` 与空格）。必须以 `gitdir: ` 开头（区分大小写，与 git 一致），后面非空、≤ 1000 字符，否则 `invalid`。
- 路径换算：`/` 换成 `\`；`C:\…`、`C:/…` 原样；`/c/…`（MSYS 写法，单个字母）换成 `C:\…`；其余以 `\` 开头的（UNC、`\\?\`）为 `invalid`；相对路径接在 `worktree_dir` 后面，按文字处理 `.` 与 `..`。
- 换算后的路径是已存在的目录：`valid`；不存在：`detached`；查不了（拒绝访问等）：`invalid`。**只查在不在**，不打开、不列那个目录。
- `gitdir` 为换算后的路径（`invalid` 时为 None）。服务（M7）把 `git-worktrees` 组的条目分成“登记有效”与“已脱离”，都仍是仅供参考。

## 7. 读声明文件

```rust
pub const FILE_NAME: &str = ".water-cleanup.json";
pub const MAX_BYTES: u64 = 65_536;

pub struct Loaded {
    pub path: String,
    pub dir: String,
    pub size: u64,
    pub hash: Option<String>,        // 读到的原始字节（含 BOM）的 SHA-256，小写十六进制
    pub manifest: Option<Manifest>,
    pub error: Option<Invalid>,
}
pub struct Invalid { pub code: String, pub pointer: String } // pointer 为 JSON Pointer，整份问题为 ""

pub fn read_manifest(path: &str) -> Loaded;
pub fn parse(bytes: &[u8]) -> Result<Manifest, Invalid>;
pub fn sha256_hex(bytes: &[u8]) -> String;
```

- `path` 必须是绝对路径、最后一段是 `.water-cleanup.json`（不分大小写），否则 `MANIFEST_NOT_FILE`。
- 顺序：`symlink_metadata`：是重解析点 → `MANIFEST_REPARSE`；不是普通文件或不存在 → `MANIFEST_NOT_FILE`；长度 > `MAX_BYTES` → `MANIFEST_TOO_LARGE`（不读）。然后以不跟随重解析点的方式打开，最多读 `MAX_BYTES + 1` 字节，超过也是 `MANIFEST_TOO_LARGE`；打不开或读失败 → `MANIFEST_UNREADABLE`。读到字节后总给出 `hash`。
- `parse`：去掉开头的 UTF-8 BOM；不是 UTF-8 → `MANIFEST_ENCODING`；JSON 解析失败或嵌套超过 4 层（顶层对象为第 1 层）→ `MANIFEST_JSON`；`version` 不是 1 → `MANIFEST_VERSION`；表外的键 → `MANIFEST_UNKNOWN_KEY`；类型、长度、范围、重复不对 → `MANIFEST_FIELD`；路径模式不合第 3 节或第 2 节的后缀要求 → `MANIFEST_PATH`。按文档顺序报**第一个**问题。
- 信任记录（路径 + 哈希）由服务保存（M7）；文件一改哈希就变，要重新信任。
- `sha256_hex` 本包自己实现（不加依赖），用标准测试向量核对。
- `Manifest`、`Disposable`、`Worktree`、`GitLink`、`Invalid`、`Loaded` 都导出，派生 `Debug, Clone, PartialEq, Eq, Serialize, Deserialize`；`Manifest` 的字段名照 JSON（`keep_newest` 用 `#[serde(rename = "keepNewest")]`，`fixed_in` 同理）。

## 8. 测试

`tests/manifest_v1.rs` 精确四个测试：

| 测试 | 标记 | 内容 |
|---|---|---|
| `manifest_parse_contract` | `MANIFEST_FORMAT` | 第 2 节示例能解析；第 2、3 节每条规则各一个被拒的反例，`code` 与 `pointer` 都对；带 BOM 能解析；`$schema` 被接受；嵌套 5 层被拒 |
| `manifest_targets_and_protect` | `MANIFEST_TARGETS`、`MANIFEST_PROTECT` | 示例的 `to_targets` 与本文写出的 JSON 按值相同（含 `sibling-complete-file-exists` 的条件、`older-than-N-days` 的小时数）；不信任时为空；`protects` 的位于之内、包住、不相干、`path` 等于 `dir`、不在 `dir` 之内各一例 |
| `manifest_read_files` | `MANIFEST_READ` | 在本树 `.local/` 下：65 536 字节可读、65 537 字节 `MANIFEST_TOO_LARGE`；名为 `.water-cleanup.json` 的目录 `MANIFEST_NOT_FILE`；名为它的联接 `MANIFEST_REPARSE`；哈希等于另行算出的值；SHA-256 向量（空串、`abc`、一百万个 `a`） |
| `manifest_git_link` | `MANIFEST_GITDIR` | 相对、绝对、`/f/…` 三种写法的 `valid`；指向不存在目录的 `detached`；`.git` 是目录、超过 1 KB、没有 `gitdir: `、空路径、`.git` 是联接，都为 `invalid` |

## 9. 负控与真实冒烟

- **nc1**：路径模式放行 `..`，测试以 `MANIFEST_FORMAT` 失败。
- **nc2**：`to_targets` 不看 `trusted`，测试以 `MANIFEST_TARGETS` 失败。
- 负控只认 `src/` 里的改动。
- **真实冒烟**（只读）：对本仓库 `.worktrees\` 下每个工作树调用 `read_git_link`，只输出三种状态各几个；仓库根有 `.water-cleanup.json` 时读一次，只输出有效与否、条目数与哈希前 8 位。不输出路径。
