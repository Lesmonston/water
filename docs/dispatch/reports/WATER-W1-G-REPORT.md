WATER-W1-G 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/g/docs/dispatch/reports/WATER-W1-G-REPORT.md

## 身份

| 项 | 值 |
|---|---|
| 票 | WATER-W1-G |
| 工作树 | `F:/new/smaltalk/water/.worktrees/g` |
| 分支 | `worker/water-w1-g` |
| 基线 | `045ab4f0d01edd573828fbc8cca988e1ad37efee` |
| 实现提交 | `4ae559b3c84856994bb09e252834987518982f70` |
| 平台 | Windows。macOS 未运行，未验证 |
| 模型 | Grok 4.7 |
| 工具 | Node v24.16.0，rustc/cargo 1.95.0，MSVC |

实现提交之后工作树是干净的。下面五门 `--final` 的 before/after HEAD 都是这个 SHA，status 为空。本报告提交只追加证据，不改产品和测试。

本机没有 git user.name / user.email。提交使用单次命令 `-c user.name="Water Worker (external)" -c user.email="water-worker@localhost"`，没有改全局配置。

## 实现

`packages/scan-report` 是独立 workspace（resolver 3），包 `water-scan-report` 0.1.0，edition 2024，rust-version 1.95，publish false。公开入口是 `water_scan_report::v1::assemble_json`。

`assemble_json` 先拒绝超过 8MiB 的输入，再检查 JSON 语法，然后从原始文本反序列化私有事实 DTO。重复键不会先折叠成 Value。全部 finding 为 unknown/protected，证据只有一条元数据观察，保护原因按 unknown_ownership、incomplete_evidence，同 scope 已记录严格后代再追加 protected_descendant。目录、链接和 Other 不填逻辑长度。totals 保持 unavailable，不按文件求和。`source_facts` 保留通过验证的事实，包括 kind、depth、identity 和 issue 来源。调用方 context 只提供报告声明，不授权路径访问。生产模块不读文件、环境、网络或时钟，不依赖 F crate，禁止 unsafe。

## 需求对照

| 需求 | 结果 |
|---|---|
| 17 个 golden 从 `assemble_json` 组装，bundle 与 expected 一致，并经 A `to_json` / `parse_report` 往返 | `report_public_roundtrip` 与 final bridge |
| 重复键、语法错误、未知字段、缺 nullable、对象枚举、位置数组、非法字节/深度/身份/计数、上下文错序；错误不回显 canary | `report_strict_input` |
| completed / partial / cancelled、已完成 scope 后取消、注入来源写进 issue message | `report_coverage_and_issues` |
| 全未知保护；`a` 不是 `ab` 祖先；cache / 模型 / 凭证路径仍 unknown/protected | `report_conservative_findings` |
| 0、2^53、2^53+1、u64::MAX 保持十进制字符串；目录/链接/Other 大小未知；Unix 身份只留 sidecar；重叠 scope 与硬链接不去重、不求和 | `report_size_identity_and_overlap` |
| 输入文本不变；不超过 8MiB 且不超过 10000 条记录的事实，组装报告超过 A 的 8MiB 上限时返回 ReportRejected，不截断 | `report_public_roundtrip` |
| 真实 G 组装后 A 往返，再由 E `project_report` 对照 17 个 expected view；2 个 raw 与 10 个构造变体拒绝 | final bridge，`actualEProjection: true`，`actualFScanner: false` |
| 根 Cargo、A–F、H/I、旧 helper、冻结锁和上游 | 未改 |

测试目标只有 `report_v1` 的五个顶层测试，没有第六个，也没有 ignore。

## 最终门

全部在 `4ae559b3c84856994bb09e252834987518982f70` 上串行通过。退出码 0。

| 门 | receipt |
|---|---|
| fmt --final | `docs/acceptance/wave1/g/2026-10-17T14-49-50.971Z-18684-fmt-result.json` |
| test --final | `docs/acceptance/wave1/g/2026-10-17T14-50-27.661Z-30608-test-result.json` |
| clippy --final | `docs/acceptance/wave1/g/2026-10-17T14-51-08.172Z-19168-clippy-result.json` |
| metadata --final | `docs/acceptance/wave1/g/2026-10-17T14-51-50.894Z-40260-metadata-result.json` |
| bridge --final | `docs/acceptance/wave1/g/2026-10-17T14-52-11.243Z-25504-bridge-result.json` |

test 汇总是 5 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out。日志是同名前缀的 `test-6.log`。bridge 先构建本库和已验收的 report-view，再编译冻结的 `scripts/acceptance/scan-report-bridge.rs` 并运行。17 个正例、2 个 raw 拒绝、10 个构造变体拒绝。没有用 expected JSON 代替程序输出，没有调用 F。对应日志是 `bridge-6.log` 至 `bridge-9.log`。

开工 baseline 通过：`docs/acceptance/wave1/g/2026-10-17T14-15-07.872Z-7344-baseline-result.json`。离线 lock 通过：`docs/acceptance/wave1/g/2026-10-17T14-28-20.712Z-28596-lock-result.json`。

## 负控和恢复

负控改的是提交文件 `packages/scan-report/src/v1.rs`。SHA256 见 `docs/acceptance/wave1/g/negative-controls.json`。三次都是完整五测试，命中目标断言后按原字节写回，更新 mtime，恢复哈希等于原哈希 `35971aacd81ae0f2854fc0348bdf08b9ec282418554408a3579359709910bb65`，随后五测试通过。三次都实际编译并运行，不是缺文件或超时。

| 负控 | 坏哈希 | 失败断言 | 失败 receipt | 恢复 receipt |
|---|---|---|---|---|
| 原文解析改成 Value last-wins 再 `from_value` | `a4b6c0681ef1001756776e23acd1e092c0c3b12f3c40a475b37cf07e8a83d093` | `duplicate keys must be rejected` | `2026-10-17T14-41-42.525Z-42200` | `2026-10-17T14-43-10.024Z-4684` |
| 第一个无后代 File 改为 download_cache/low/native 并清空保护 | `3db0a5fdf861cf0190694199652ddfc3b0fd1515d81180e7ac5880759c356e0e` | `leaf file stays protected`，得到 Low | `2026-10-17T14-44-34.758Z-27312` | `2026-10-17T14-45-46.488Z-1640` |
| totals 按文件 logical_bytes 求和并改为 file_identity_deduplicated | `a0ac4de877eda7b2a879b275b22d53b2059ae3390ff3dd5caf629bce171e568b` | `unknown totals stay null` | `2026-10-17T14-46-35.101Z-36288` | `2026-10-17T14-47-59.370Z-39444` |

上表 receipt 都在 `docs/acceptance/wave1/g/`，文件名以该戳开头，测试输出在对应 `test-6.log`。第一项只有 `report_strict_input` 失败，其余四项通过。后两项的目标测试失败时，`report_public_roundtrip` 的整包相等也失败：第二项把 `.git/HEAD` 收成 `download_cache` / `low` / 空保护，A 仍然接受该报告；第三项把 project-markers 的 totals 收成 `"173"` 和 `file_identity_deduplicated`，A 也接受。因此这两项不是“仅 A 拒绝”。

## 失败记录

- fmt 首次 `--check` 失败，只因格式。随后用 Rust 1.95 的 rustfmt 写入格式，再跑 helper fmt 通过。receipt：`2026-10-17T14-29-09.235Z-36784-fmt-result.json`。
- 第一次 `test` 编译失败：私有 DTO 的 `Deserialize` derive 被 `serde::de::Deserialize` 特质导入挡住。这不是行为红。receipt：`2026-10-17T14-31-13.489Z-29260-test-result.json`。改为导入 `serde::Deserialize` 后五测试通过。
- clippy 首次拒绝 `EntryKind` / `IdentityKind` 上未使用的 `wire`。加上 `allow(dead_code)` 后行为不变，clippy 通过。receipt：`2026-10-17T14-33-13.684Z-19012-clippy-result.json`。负控是在该修正之后、并且五测试已绿的字节上做的，所以上面的原哈希就是提交文件的哈希。

没有越界申请。没有改冻结契约、helper、根 Cargo、A–F、H/I 或上游。没有扫描器、分类器、导出器、页面、IPC 或真实用户数据。没有内部实现子代理。

macOS 未验证。合成 macos 字段不是 macOS IO 实测。G 通过不等于 F 扫描接线、分类、去重计量或桌面应用完成。
