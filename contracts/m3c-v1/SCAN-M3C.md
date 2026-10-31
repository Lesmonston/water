# SCAN-M3C：去重体量、一次遍历与新在用方式（W8-K3）

2026-10-31，总控（Claude）冻结。补充 [SCAN](../checkup-v1/SCAN.md) 与 [MODEL](../checkup-v1/MODEL.md) 第 5 节，冲突时以本文为准。只改 `packages/junk-scan/`。

依据：10-29 F 盘清理时，Cargo 构建目录大量用硬链接，按路径相加是 88.4 GB，`du` 去重后是 75.4 GB；整盘加进来时，5 条标记规则会各从根走一遍。

## 1. 认新的在用方式

扫描计划校验（`plan.rs` 中 `in_use.mode` 的取值）增加 `runs_from_or_references_item`，名单可以为空。扫描只把它原样带进组的 `in_use`，不做判断。

## 2. 每项去重后的体量

- **Item** 增加 `unique_bytes`：该项内每个文件按“卷序列号 + 128 位文件 ID”只算一次的长度之和，所以 `unique_bytes ≤ total_bytes`。文件 ID 取不到的文件按长度计入，不去重。
- **Group** 增加 `unique_bytes`（全部项之和）与 `eligible_unique_bytes`（可清理项之和）。
- `total_bytes`、`file_count`、`newest_activity` 的口径不变。
- 只在每一项内部去重，不跨项、不跨组。项与项的嵌套重复仍按原规则：同一路径只属于一个组。

### 实现要求

- 在 Windows 上，按目录句柄枚举取得每个子项的名字、属性、大小、修改时间与文件 ID，不逐个打开文件：
  - `CreateFileW` 打开目录，访问权限只允许 `FILE_LIST_DIRECTORY`；
  - `GetFileInformationByHandleEx` 的信息类只用 `FileIdExtdDirectoryInfo`（19）与 `FileIdExtdDirectoryRestartInfo`（20）；
  - 卷序列号沿用已有的 `GetVolumeInformationByHandleW`。
- 允许的系统函数与访问权限在原清单上只增加上面这些。
- 枚举结果必须与原来 `read_dir` 加 `symlink_metadata` 的口径一致：
  - 重解析点本身计 0 字节、不进入；
  - 名字不合法的照旧记 `unrepresentable_name`；
  - 权限不足照旧记 `access_denied`。
- 非 Windows 平台：`unique_bytes` 等于 `total_bytes`。

### 兼容

- `result_to_json` 总是写出新字段。
- `result_from_json` 遇到**没有**这三个字段的旧记录，按 `unique_bytes = total_bytes`、`eligible_unique_bytes = eligible_bytes` 补齐。
- 结果版本仍为 `water.scan-result.v1`。

## 3. 每个根只走一遍

- 同一个 root 上的全部 marker target 合并成一次遍历：每进入一个目录，对这条分支上尚未命中的每个 target 检查标记。命中的 target 在这棵子树里关闭；只要还有 target 开着就继续往下走，各 target 的 `max_depth` 分别生效。
- **结果必须与原来逐个 target 遍历完全相同**：条目、所属组、顺序、体量、issue 都一样。
- `visited_entries` 按实际列出的目录项计数，同一目录不重复计。
- 不进入重解析点目录和名为 `.git` 的目录，规则不变。

## 4. 测试

`tests/scan_v1.rs` 仍是精确五个测试，名字不变。新断言加在已有测试里，失败信息带标记：

| 标记 | 内容 | 放在 |
|---|---|---|
| `SCAN_M3C_MODE` | 新方式的计划可读回，空名单通过；未知方式仍被拒 | `scan_plan_contract` |
| `SCAN_M3C_UNIQUE` | 夹具用 `cmd /c mklink /H` 给一个 1 MiB 文件做 3 个硬链接：`total_bytes` 为 4 MiB，`unique_bytes` 为 1 MiB；没有硬链接的项两者相等；组的两个新字段等于各项之和 | `scan_pattern_marker_discovery` |
| `SCAN_M3C_SINGLE_WALK` | 同一 root 上 5 个 marker target 的夹具：结果与逐个 target 的预期完全一致；`visited_entries` 不超过该树目录项总数加 5 | `scan_overlap_and_guards` |
| `SCAN_M3C_COMPAT` | 去掉三个新字段的结果 JSON 能读回，并补齐为相等的值；新结果读回后字段不变 | `scan_snapshot_growth_keys` |

原有断言不变。

## 5. 负控与真实冒烟

- **nc1**：让去重不生效（每个文件都按长度计入），测试以 `SCAN_M3C_UNIQUE` 失败。
- **nc2**：`result_from_json` 要求新字段必须存在，测试以 `SCAN_M3C_COMPAT` 失败。
- **真实冒烟**（`--mode real`）照旧只输出组级汇总，另加每组的 `unique_bytes`、`eligible_unique_bytes`，以及本次用时与访问条目数。
