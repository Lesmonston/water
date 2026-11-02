# DUP-M35：用户发起的逐字节查重（W10-M8）

**草案，未冻结**（2026-11-02，总控 Claude 起草；与 m35-v1 其它契约一起冻结）。新建 `packages/dup-finder/`，只改这个目录。

来由：[ADR-019](../../docs/decisions/ADR-019-project-declarations-and-quarantine.md) 第 7 节（用户 11-02：“需要做”），[第十波计划](../../docs/dispatch/wave10/PLAN.md)第 2 节第 58、66 行、第 4 节 M8。上一轮查出 6 组、8.98 GB 完全相同的音频，也遇到三份 3.8 GB 的同名同大小文件其实字节不同：名字和大小都不算数，只认完整内容。

## 1. 包的形状与边界

- crate `water-dup-finder`，lib 名 `water_dup_finder`；独立 workspace，edition 2024，rust-version 1.95，`autotests = false`；依赖只有 `serde = "=1.0.229"`（derive）与 `serde_json = "=1.0.151"`。
- `#![deny(unsafe_code)]`；只有 `native_windows.rs` 允许 unsafe，FFI 只有 `GetFileInformationByHandleEx`（类 1 FileStandardInfo、类 9 FileAttributeTagInfo、类 18 FileIdInfo），作用在 std 打开的句柄上。
- 文件系统只用：`std::fs::read_dir`、`DirEntry::metadata`/`file_type`、`OpenOptions::new().read(true)`（`share_mode(7)`，`custom_flags(0x0020_0000 | 0x0800_0000)` 即不跟随重解析点、顺序读）与 `Read`。**不写、不建、不删、不改名、不改属性**，不起进程、不联网。检查器按名字拒收 `fs::write`、`File::create`、`.write(true)`、`.append(`、`create_dir`、`remove_`、`rename`、`set_permissions`、`std::process`、`std::net`。
- 只有用户在界面上点了“查重复文件”并同意后，服务（M7）才调用；体检不调用。内容只用来算哈希：按 1 MiB 的块读，读完即丢，不存、不显示、不上传、不写进任何日志。

## 2. 接口

```rust
#[derive(Clone, Default)]
pub struct CancelFlag(Arc<AtomicBool>);          // cancel()、is_cancelled()

pub struct DupOptions {
    pub roots: Vec<String>,        // 1～8 个绝对路径（盘根或文件夹），互不包含
    pub min_bytes: u64,            // 缺省 1 MiB；小于它的不比；0 字节的永远不比
    pub prefer: Vec<String>,       // 用户指定“以这里为准”的文件夹，0～8 个
    pub protected: Vec<String>,    // 服务给的保护路径（项目声明的 protected 等），0～256 个
}
pub trait DupObserver: Sync {
    fn on_progress(&self, p: &DupProgress);
}
pub struct DupProgress {
    pub phase: String,             // "listing"、"hashing"
    pub files_listed: u64, pub candidate_files: u64,
    pub bytes_to_hash: u64, pub bytes_hashed: u64,
    pub current: Option<String>,   // hashing 阶段正在读的文件
}
pub fn find_duplicates(scan_id: &str, options: &DupOptions, cancel: &CancelFlag, observer: &dyn DupObserver, now: SystemTime) -> Result<DupResult, DupError>;
pub fn result_to_json(r: &DupResult) -> String;
pub fn result_from_json(s: &str) -> Result<DupResult, DupError>;
pub fn sha256_hex(bytes: &[u8]) -> String;   // 本包自己实现
```

- `DupError`：`InvalidOptions`（路径不是绝对路径、互相包含、个数越界、`scan_id` 为空或超过 64 字符）、`Unsupported`（非 Windows）、`Json`。查到一半出的问题不是错误，记进结果（第 5 节）。
- 观察者在列目录时每 1000 个文件、读内容时每 16 MiB 与每换一个文件各调一次。

## 3. 怎么找

1. **列目录**：从每个根往下走，深度优先，名字排序。不进入：
   - 任何重解析点（联接、符号链接、云文件占位、去重……），它自己也不当文件比；
   - 名为 `.git`、`.water-quarantine`、`$Recycle.Bin`、`System Volume Information` 的目录；
   - 列不出的目录（记 `access_denied`）。
   文件带 `OFFLINE`（0x1000）、`RECALL_ON_OPEN`（0x40000）、`RECALL_ON_DATA_ACCESS`（0x400000）任一属性的不读（读了会触发下载），记 `offline`。最多列 2,000,000 个文件，超过就停在这里，状态 `budget_exhausted`，已列的照常往下比。
2. **按大小分组**：大小 ≥ `min_bytes` 且同大小的有 2 个以上，才是候选。
3. **认硬链接**：打开每个候选（第 1 节的方式），读 FileIdInfo 得到身份（卷序列号 + 128 位文件 ID）。同一身份的多个路径是**同一个文件**，只算一份，其余路径记进 `hard_link_paths`；打开后再读 FileAttributeTagInfo，变成重解析点的丢掉（记 `reparse`）。打不开：32、33 记 `locked`，其余记 `access_denied`。
4. **先比开头**：同大小、不同身份的文件，先算前 64 KiB 的 SHA-256；开头不同的不可能重复，就此分开。
5. **再算完整哈希**：开头相同的，从头到尾算 SHA-256。**大小相同且完整哈希相同才算重复**；同名同大小但哪怕最后一个字节不同，也不算。
6. **读完复查**：读之前记下大小与修改时间，读完从同一句柄再读一次（FileStandardInfo 与修改时间），变了就把这个文件从结果里拿掉，记 `changed`。
7. 取消：每读一块检查一次。取消后状态 `cancelled`，`groups` 为空（半截的结果不给用户看）。

## 4. 建议留哪一份

每组的每一份按下面的顺序排，排第一的是建议保留的（`keep_index`），其余是“多出来的”：

1. 在 `protected` 里的优先（这一份标 `protected: true`；同组有几份都在保护里，就都不能被建议清理，`removable` 为 false）；
2. 在 `prefer` 里的优先；
3. 修改时间早的优先（原件）；
4. 名字不带导出尾巴的优先。导出尾巴（只看去掉扩展名后的结尾，不分大小写）：` (n)`、`(n)`、` - 副本`、` - 副本 (n)`、` 副本`、` - copy`、` - copy (n)`、` copy`、`_copy`；
5. 路径字典序小的优先。

建议只供用户决定，结果里没有“已勾选”之类的字段。多出来的那几份清理时先进隔离区，由服务（M7）安排。

## 5. 结果

```rust
pub struct DupResult {
    pub dup_version: String,             // "water.dup-result.v1"
    pub scan_id: String, pub roots: Vec<String>,
    pub started_at: String, pub ended_at: String,
    pub status: String,                  // "completed"、"cancelled"、"budget_exhausted"
    pub files_listed: u64, pub candidate_files: u64, pub hashed_bytes: String,
    pub groups: Vec<DupGroup>,           // 按 reclaimable_bytes 降序，再按 hash；最多 10,000 组
    pub groups_truncated: bool,
    pub same_name_different: u64,        // 见下
    pub skipped: Skipped,
    pub issues: Vec<DupIssue>,           // 最多 200 条，按路径排序
}
pub struct DupGroup {
    pub group_id: String,                // "dup:" + 完整哈希前 16 位 + ":" + 大小
    pub size: String, pub hash: String,
    pub copies: Vec<DupCopy>,            // 按第 4 节排好，第一份即建议保留的
    pub keep_index: usize,               // 恒为 0，留着给界面直接用
    pub reclaimable_bytes: String,       // 大小 ×（份数 − 1 − 其余份里在保护中的份数）
}
pub struct DupCopy {
    pub path: String, pub mtime: String, pub created: String,
    pub identity: String,                // 卷序列号 8 位大写十六进制 + ":" + 文件 ID 32 位小写十六进制
    pub hard_link_paths: Vec<String>,    // 同一文件的其它路径（在根内找到的），最多 8 个
    pub protected: bool, pub preferred: bool, pub export_tail: bool,
    pub removable: bool,                 // 不是第一份、也不在保护里
}
pub struct Skipped { pub reparse: u64, pub offline: u64, pub access_denied: u64, pub locked: u64, pub changed: u64, pub small: u64, pub empty: u64 }
pub struct DupIssue { pub path: String, pub kind: String /* reparse|offline|access_denied|locked|changed */ }
```

- 字节数用十进制字符串，时间用 UTC RFC 3339（与扫描相同）。所有类型派生 `Debug, Clone, PartialEq, Eq, Serialize, Deserialize`，结构带 `deny_unknown_fields`。
- 结果里只有路径、大小、时间、身份与哈希，没有任何文件内容。
- `same_name_different`：候选里按（大小，文件名不分大小写）分组，有 2 个以上不同身份、但不全在同一个重复组里的，每个这样的组计 1（设计 v2 第 3.13 节第 4 条“另有 3 组同名不同内容”）。开头就不同、没算完整哈希的也算。`dup_contract` 里两例“只差最后一个字节”“只差第一个字节”应各计 1。

## 6. 测试

`tests/dup_v1.rs` 精确四个测试，夹具都在本树 `.local/` 下：

| 测试 | 标记 | 内容 |
|---|---|---|
| `dup_contract` | `DUP_GROUPS`、`DUP_KEEP` | 三份同内容不同名 → 一组三份；两份同名同大小（> 64 KiB）只差最后一个字节 → 不成组；两份只差第一个字节 → 不成组；硬链接（`std::fs::hard_link`）两条路径 → 不成组，另有一份同内容的普通副本时成组两份、硬链接的另一条路径在 `hard_link_paths`；只能经联接走到的副本不算；`.git` 里的副本不算；0 字节与小于 `min_bytes` 的计入 `empty`、`small`；第 4 节五条顺序各一例；一组两份都在 `protected` 里时 `reclaimable_bytes` 为 0 |
| `dup_skips_and_change` | `DUP_SKIPS` | 用 PowerShell 给一份加 `Offline` 属性 → 不读、计入 `offline`；一份被不带共享读地打开 → `locked`；在观察者回调里改写正在读的文件 → `changed` 且不在任何组里；两份 64 MiB + 1 字节的稀疏文件（`fsutil sparse setflag` 后 `set_len`）只差最后一个字节 → 不成组，`hashed_bytes` 对 |
| `dup_cancel_and_budget` | `DUP_CANCEL` | 观察者在第一次 hashing 进度时取消 → `cancelled`、`groups` 为空；根互相包含 → `InvalidOptions`；`result_to_json` 与 `result_from_json` 往返相等 |
| `dup_sha256_vectors` | `DUP_SHA256` | 空串、`abc`、448 位的标准消息、55/56/63/64/65 字节的边界、一百万个 `a` |

## 7. 负控与真实冒烟

- **nc1**：按大小与名字分组、不算哈希，测试以 `DUP_GROUPS` 失败。
- **nc2**：不认硬链接（不读身份），测试以 `DUP_GROUPS` 失败。
- **nc3**：不跳过带 `Offline` 属性的文件，测试以 `DUP_SKIPS` 失败。
- 负控只认 `src/` 里的改动。
- **真实冒烟**：只对本仓库的 `docs/` 跑一次（Water 自己的文件，不碰用户数据），只输出列出的文件数、候选数、组数与可腾出字节数，不输出路径。
