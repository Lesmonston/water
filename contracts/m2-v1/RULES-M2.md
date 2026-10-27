# RULES-M2：Rust 构建目录规则

2026-10-27，总控（Claude）。在规则包 `packages/junk-rules/rules/windows.json` 上新增一条规则；其余规则与校验器不变。只改 `packages/junk-rules/`。

依据：[M2 计划](../../docs/M2-PLAN-20261027.md) 第 2.3 节。总控核查发现：
- 用 `CARGO_TARGET_DIR` 指定的构建目录（例如 Water 各工作树的 `.local/w3-target`）没有 `CACHEDIR.TAG`，现有“带缓存标记的目录”规则认不出；
- 这些目录根下都有 Cargo 写的 `.rustc_info.json`。

## 1. 新规则

| 字段 | 值 |
|---|---|
| `rule_id` | `rust-build-dirs` |
| `title_zh` | Rust 构建目录 |
| `owner_zh` | Rust 工具链 |
| `category` | `custom`（只在用户添加的文件夹里查找） |
| `level` | `recommended` |
| `locate` | 一个 `marker`：文件 `.rustc_info.json`，大小 2～65536 字节；`max_depth` 12 |
| `item_type` | `dir` |
| `min_age_hours` | 1 |
| `keep_newest` | 0 |
| `in_use` | `{"mode":"none","processes":[]}`（构建进程的命令行通常不含构建目录路径，判断不可靠；靠一小时的年龄阈值避开正在构建的目录） |
| `growth` | `slow`（与“带缓存标记的目录”相同；现有取值只有 `slow`、`leak_prone`、`one_off`） |
| `what_zh` | 你添加的文件夹里，Rust 项目编译时生成的构建目录（根下有 Cargo 写的 `.rustc_info.json`）。 |
| `after_zh` | 项目源码还在。下次编译会重新生成，第一次会慢一些。 |
| `why_zh` | 只含编译产物，可以完整重建。只在你添加的文件夹里查找。 |
| `fix_hint_zh` | `null` |
| `sources` | 两条：<br>- `local_observation`：“2026-10-27 总控本机只读核查：Water 各工作树的 CARGO_TARGET_DIR 构建目录根下都有 .rustc_info.json”；<br>- `official_doc`：Cargo 官方文档中关于构建目录的页面（执行者核对网址与日期，只读，不下载）。 |

字段名、顺序与写法照规则包现有条目（例如 `cachedir-tagged`），不新增字段。新规则放在 `custom` 类的现有规则之后。

## 2. 与现有规则重叠

- 默认的 `target` 目录同时有 `CACHEDIR.TAG` 与 `.rustc_info.json`，两条规则都会命中同一个目录。
- 扫描（`junk-scan`）的既有规则是“同一路径多条命中取保守级别”，两条都是推荐清理，结果不变。本票不改扫描。

## 3. 测试

`tests/rules_v1.rs` 仍是现有的 4 个测试，名字不变：`rules_schema_strict`、`rules_protection_precedence`、`rules_resolve_plan`、`rules_seed_coverage`。新断言加在已有测试里，失败信息带标记 `RULES_RUST_BUILD`：
- 种子表加上新规则，`rules_seed_coverage` 逐字段核对：级别、年龄、在用、增长、定位摘要；
- 对一个自定义文件夹解析计划时，生成一个以 `.rustc_info.json` 为标记文件、大小界限 2～65536、深度 12 的 marker 目标；
- 现有校验约束照样适用于新规则，不新增约束。

## 4. 不变

- 其余规则与它们的级别、年龄、在用设置；
- 校验器、规则格式版本、依赖。
