WATER-W1-H 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/h/docs/dispatch/reports/WATER-W1-H-REPORT.md

## 身份

| 项 | 值 |
|---|---|
| 票 | WATER-W1-H |
| 工作树 | `F:/new/smaltalk/water/.worktrees/h` |
| 分支 | `worker/water-w1-h` |
| 基线 | `045ab4f0d01edd573828fbc8cca988e1ad37efee` |
| 实现提交 | `52748c5895f485aa54f65c6943ab8bf74fd95ddb` |
| 平台 | Windows。macOS 未运行，未验证 |
| 模型 | Grok 4.7 |
| 工具 | Node v24.16.0，rustc/cargo 1.95.0 |

实现提交之后工作树是干净的。下面五门 `--final` 的 before/after HEAD 都是这个 SHA，status 为空。本报告提交只追加证据，不改产品和测试。

## 实现

`packages/summary-export` 是独立 workspace（resolver 3），包 `water-summary-export` 0.1.0，edition 2024，rust-version 1.95，publish false。公开入口是 `water_summary_export::v1::summarize_json` 和 `summarize_report`。

`summarize_json` 把原始字符串交给 `water_contracts::v1::parse_report`。`summarize_report` 先调用 `validate_report`，再按 findings 计数。scopes、findings、issues 是三个数组长度，用 `u32::try_from`。每条 finding 进入一个风险桶和一个类别桶，用 `checked_add`。零桶仍在固定结构里。`totals` 克隆来源 `ScanTotals`，不把 finding 尺寸相加，也不把未知改成 0。输出只有固定版本、A 的枚举和来源 totals。生产模块不读文件、环境或网络，不写导出文件，crate 禁止 unsafe。

去掉直接标识和自由文本之后，精确容量和计数分布仍可能关联到来源报告。这个结果不称为匿名，也不称为可以安全公开。

## 需求对照

| 需求 | 结果 |
|---|---|
| 11 个正例从两个公开入口汇总，值与 expected 一致；13 个 canary 在输入中，Serialize 不得出现 | `export_whitelist` |
| A 原 66 变体与 6 个 raw，加上重复键、未知字段、对象枚举、缺 nullable；错误与 A 相同且不回显 canary | `export_validation` |
| 6 个手工非法 DTO 与 `validate_report` 的错误相等 | `export_validation` |
| 0、2^53、2^53+1、u64::MAX 保持十进制字符串；未知 totals 保持 null；两个 u32::MAX 分别保留；来源 37 不是 finding 之和 | `export_precision_and_totals` |
| 四风险、十一类别和零桶都输出；completed、partial、cancelled 保持原状态；空 findings/issues 不另造计数；issues 不是 skipped_entries | `export_counts_and_status` |
| 一致 ID 双射、文本、工具字段和数组顺序变化后导出相等；同一输入重复结果相同，输入报告不被修改 | `export_invariance_and_purity` |
| bridge 调用两个公开入口，11 个正例的实际 Serialize 与 expected 相等，6 个 raw 和 6 个 DTO 的错误与 A 相等 | final bridge |
| 根 Cargo、A–G/I、旧 helper、冻结锁和上游 | 未改 |

测试目标只有 `export_v1` 的五个顶层测试，没有第六个，也没有 ignore。

## 最终门

全部在 `52748c5895f485aa54f65c6943ab8bf74fd95ddb` 上串行通过。退出码 0。

| 门 | receipt |
|---|---|
| fmt --final | `docs/acceptance/wave1/h/2026-10-17T14-45-28.104Z-24000-fmt-result.json` |
| test --final | `docs/acceptance/wave1/h/2026-10-17T14-45-42.124Z-19808-test-result.json` |
| clippy --final | `docs/acceptance/wave1/h/2026-10-17T14-45-51.524Z-26372-clippy-result.json` |
| metadata --final | `docs/acceptance/wave1/h/2026-10-17T14-46-14.438Z-20144-metadata-result.json` |
| bridge --final | `docs/acceptance/wave1/h/2026-10-17T14-46-26.931Z-6488-bridge-result.json` |

test 汇总是 5 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out。日志是同名前缀的 `test-6.log`。bridge 先 `cargo build --lib`，再编译冻结的 `scripts/acceptance/summary-export-bridge.rs`，运行该程序调用本库两个入口并 Serialize。11 个正例、6 个 raw 拒绝、6 个 DTO 拒绝。没有用 expected JSON 代替程序输出。对应日志是 `bridge-6.log`、`bridge-7.log`、`bridge-8.log`。

开工 baseline 通过：`docs/acceptance/wave1/h/2026-10-17T14-11-47.555Z-29428-baseline-result.json`。HEAD 与基线相同，工作树干净，冻结 36 项，11 份 H 来源报告和 4 份 E 视图由资产探针核对，新产品当时未测。离线 lock 通过：`docs/acceptance/wave1/h/2026-10-17T14-25-21.942Z-3144-lock-result.json`。

## 先红、负控和恢复

行为红发生在库已编译之后。当时 `counts.findings` 固定为 0。完整五测试里三个失败：`export_counts_and_status` 和 `export_validation` 对 base 的 finding 数量得到 0 而不是 1，`export_whitelist` 的 expected 不一致。receipt：`docs/acceptance/wave1/h/2026-10-17T14-33-57.519Z-38684-test-result.json`，日志 `…-test-6.log`。这之前有一次测试编译失败和一次 clippy 失败（见下），那两次不算红。

负控改的是提交文件 `packages/summary-export/src/v1.rs`。SHA256 见 `docs/acceptance/wave1/h/negative-controls.json`。四次都是完整五测试，命中目标断言后按原字节写回，恢复哈希等于原哈希 `3180e0d286c2ed33f761c5179879aabff91c7ad5619370380b96270734b63c68`，写回更新了 mtime，随后五测试通过。

| 负控 | 坏哈希 | 失败断言 | 失败 receipt | 恢复 receipt |
|---|---|---|---|---|
| findings 计数固定为 0 | `ae411571488038a4059b26767e512ae5a584147a66277823d883f35ca83a0cab` | `base: finding count`，得到 0 | `2026-10-17T14-33-57.519Z-38684` | `2026-10-17T14-34-39.956Z-43660` |
| 跳过 `summarize_report` 的 `validate_report` | `a4acb61e1c9827bd0b43aa44a21511b2385c1e4b8f3d096a2913eb1e8df67931` | `unsafe classification: illegal DTO must fail export_validation` | `2026-10-17T14-35-18.712Z-27432` | `2026-10-17T14-36-47.360Z-34048` |
| `SummaryExport` 增加 `scan_id` 并复制来源 | `0bfd6e2ace63ab5495718c6a7ec81c6f2e45f06c4b3dc5d2ad9584c462ef2831` | `all-categories-canary: exact keys/canary`，泄漏 `H_SCAN_CANARY` 和键 `scan_id` | `2026-10-17T14-38-06.685Z-39332` | `2026-10-17T14-39-49.691Z-39328` |
| 未知 `totals.logical_bytes` 改成 0 | `c7fe6f37a378af4d80fa4ecb68e99bd3e66918f333630c2be3ed2793cba33dd6` | `unknown totals.logical_bytes must stay null` | `2026-10-17T14-41-39.615Z-34096` | `2026-10-17T14-43-01.946Z-2916` |

上表 receipt 都在 `docs/acceptance/wave1/h/`，文件名以该戳开头，测试输出在对应 `test-6.log`。没有用测试开关、缺文件或编译失败充当负控。

## 失败记录

- 第一次 `test` 编译失败：`Option<ByteCount>::map` 不能直接接 `ByteCount::get` 的函数指针。这不是行为红。receipt：`docs/acceptance/wave1/h/2026-10-17T14-26-37.830Z-26448-test-result.json`，日志 `…-test-6.log`。改成闭包后测试通过：`2026-10-17T14-28-19.125Z-36620-test-result.json`。
- clippy 首次拒绝未使用的 `ByteCount` 导入。去掉导入后行为不变，clippy 通过。receipt：`docs/acceptance/wave1/h/2026-10-17T14-29-51.673Z-35636-clippy-result.json`，随后 `2026-10-17T14-31-16.338Z-30296-clippy-result.json`。负控是在去掉该导入之后的提交字节上做的。

fmt 第一次 `--check` 即通过：`2026-10-17T14-25-44.228Z-6816-fmt-result.json`。提交前的 metadata 与 bridge 也通过：`2026-10-17T14-32-02.509Z-40424-metadata-result.json`、`2026-10-17T14-32-32.333Z-42392-bridge-result.json`（11 正例，6 raw，6 DTO）。

没有越界申请。没有改冻结契约、helper、根 Cargo、A–G/I 或上游。没有扫描器、分类器、上传、UI 或真实用户数据。没有内部实现子代理。负控使用了 `.local` 里的脚本，它只改本票 `v1.rs` 并调用本票 helper，不进入提交。

macOS 未验证。白名单汇总通过不等于匿名化、真实扫描或桌面应用完成。
