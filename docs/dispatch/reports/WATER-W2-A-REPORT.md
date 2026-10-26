WATER-W2-A 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w2-a/docs/dispatch/reports/WATER-W2-A-REPORT.md

## 交付定位

- 票号：WATER-W2-A；无补充单、无越界申请、无阻塞。
- 权威票面：`F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W2-A-JUNK-RULES-20261026.md`。
- 工作树：`F:/new/smaltalk/water/.worktrees/w2-a`；分支：`worker/water-w2-a`。
- 精确基线：`7ca15282e477ed4b5120ffe3c1edc3a60b75c144`（标签 `water-w2-checkup-base-20261026`）。
- 实际受测实现提交：`cb41b1e2007cbbbc77dd34679875f32206ec2003`。三项最终门均在该提交上开始和结束，前后工作树干净。
- 后续收尾提交仅含本报告及 `docs/acceptance/wave2/a/` 证据。
- 执行引擎：Cursor Grok 4.6（本会话系统标识）。本轮由单一执行者实现，未启动子代理。
- 本报告表示执行者交付，等待总控独立验收；未合入 main，未修改主线 manifest/台账，未 push 或发布。

## 逐项结果

| 项 | 结果 |
|---|---|
| 独立 crate `packages/junk-rules`（`water-junk-rules`） | 完成。edition 2024、rust-version 1.95、publish=false，四个 auto 发现关闭；`#![forbid(unsafe_code)]`；无 build 脚本、无 dev/build 依赖。 |
| 依赖 | 仅 `serde =1.0.229`（derive）与 `serde_json =1.0.151`。离线 `lock` 生成并提交 `Cargo.lock`。锁定传递依赖：itoa 1.0.18、memchr 2.8.3、proc-macro2 1.0.107、quote 1.0.47、serde_core 1.0.229、serde_derive 1.0.229、syn 3.0.9、unicode-ident 1.0.27、zmij 1.0.23。 |
| 规则数据 | `rules/windows.json`，`data_version`=`2026-10-26.1`，60 条种子规则用 `include_str!` 编进库；`RuleSet::embedded()` 返回校验过的集合。 |
| 第 5 节种子 | 表内全部 rule_id 落地；Chrome / Edge / Brave 各写一份。中文文案按设计说明第 7 节语气：这是什么、为什么可以清或为什么不清、清了会怎样；不出现规则 ID、英文枚举和“垃圾”。 |
| 来源 | 每条至少一条。本机观察写 `local_observation` / `2026-10-26 总控本机只读摸底`；agent 类另附 skill `agent-era-disk-junk-cleanup`；uv / pnpm / npm / pip / Cargo / 传递优化 / CACHEDIR.TAG 另附已核对 https 官方文档。 |
| 校验 | `RuleSet::from_json` 拒绝未知键、越界、重复 rule_id、错误 data_version、discovery 年龄/级别、recommended+leak_prone 且年龄为 0、定位器重复。错误只含固定码和字段路径，不回显输入值。 |
| 保护优先 | 同一 base 上，可清理 pattern 的前缀若可能包住受保护 pattern 则拒绝 `RULES_PRECEDENCE`。可清理段带通配符视为可能包含；仅受保护段带通配符时，不把旁边的字面目录当成前缀（否则 `User Data\ShaderCache` 会误伤 `User Data\*\Cookies`，种子集无法通过）。必测例“`User Data` `*` 对 `User Data` `*` `Cookies`”仍拒绝，“`*` `Cache` 对 `*` `Network`”仍通过。 |
| 解析 | `resolve_plan` 用合成 KnownFolders 与两个 custom root 生成确定顺序的 targets / hard_guards；`plan_to_json` 可被同样严格的 `ScanPlan::from_json` 读回。`RuleSet::text` 对 `custom:<root_id>:<rule_id>` 返回对应规则文案。 |
| 真实冒烟 | `examples/real_smoke.rs` 只检查已知目录和字面前缀是否存在，输出 `{rule_id, base_exists, literal_prefix_exists}`，不含绝对路径。 |
| 测试 | 唯一文件 `tests/rules_v1.rs`，恰好四个测试名，无 ignore / filter。 |

实现入口见 `packages/junk-rules/src/lib.rs`。冻结契约、检查入口、其它 packages 与其它工作树未改。

本机实际版本：`rustc 1.95.0 (59807616e 2026-04-14)`，Windows x86_64 MSVC。Water 发布许可证仍未决定。

## 测试覆盖

| 测试 | 实际覆盖 |
|---|---|
| `rules_schema_strict` | 版本、rule_id/文案/枚举/年龄/保留数/在用/增长/定位器/来源越界；未知键；重复 rule_id；错误 data_version；leak_prone 无年龄或无修复说明；discovery 年龄不足或级别不对；自定义类别配 pattern；错误串不含 canary。 |
| `rules_protection_precedence` | 可清理 `User Data` `*` 对受保护 `User Data` `*` `Cookies` 拒绝且信息含 `RULES_PRECEDENCE`；`*` `Cache` 对 `*` `Network` 通过；嵌入种子集通过。 |
| `rules_resolve_plan` | 合成 KnownFolders + `alpha`/`beta` 两个 custom root；核对 target 数量与顺序、chrome-cache 文案/在用、marker group_id、hard_guards（含 `C:\` 与两个 custom root）、MODEL 形状，JSON 可严格读回。 |
| `rules_seed_coverage` | 第 5 节 60 个 rule_id 的级别、分类、定位器、年龄、保留、在用、增长与表一致；每条有中文文案与来源。 |

## 负控 nc1

只改生产文件 `packages/junk-rules/src/rules.rs`：删除 `RuleSet::from_value` 末尾对 `check_protection_precedence(&rules)?` 的调用（实现提交中约第 122 行）。未改测试。

| 项 | 值 |
|---|---|
| 坏态回执 | `docs/acceptance/wave2/a/receipts/2026-10-26T05-22-19.169Z-15932-red-nc1-result.json` |
| 失败信息 | 含 `RULES_PRECEDENCE`（`rules_protection_precedence` 断言失败）；Cargo 退出 101，不是编译失败 |
| 坏态 `rules.rs` SHA256 | `a26ed094e6945a6b0592ec62ef772da824e8bc0c2c23547a66d09362f088f85b` |
| 恢复 | `git checkout -- packages/junk-rules/src/rules.rs` |
| 恢复后立刻 test | `2026-10-26T05-22-53.109Z-15676-test-result.json`，4 passed |
| 恢复后 `rules.rs` SHA256 | `5d25f249b770346141320f4ce00a787f0ddf1711a860d9cdfb7b18d2359b8b80`（与实现提交一致） |
| 最终 test 复核 | `proofAudit` 记 `nc1` → 上述红/绿回执 |

## 检查命令

全部在工作树根目录用票面入口串行执行。开发中的 fmt/clippy/测试失败已如实留在证据里，不以格式失败冒充行为红。

```powershell
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W2-A --mode baseline
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W2-A --mode lock
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W2-A --mode check
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W2-A --mode test
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W2-A --mode real
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W2-A --mode red-nc1
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W2-A --mode check --final
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W2-A --mode test --final
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W2-A --mode real --final
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W2-A --mode archive
```

| 模式 | 回执 | 结果 |
|---|---|---|
| baseline（本轮开工） | `2026-10-26T05-10-35.839Z-38908-baseline-result.json` | passed |
| lock | `2026-10-26T05-15-36.043Z-12704-lock-result.json` | passed |
| check（开发） | `2026-10-26T05-18-23.850Z-22024-check-result.json` | passed |
| test（开发） | `2026-10-26T05-20-23.254Z-5948-test-result.json` | passed |
| real（开发） | `2026-10-26T05-21-11.789Z-33940-real-result.json` | passed |
| red-nc1 | `2026-10-26T05-22-19.169Z-15932-red-nc1-result.json` | passed（观察到目标失败） |
| test（恢复后） | `2026-10-26T05-22-53.109Z-15676-test-result.json` | passed |
| check --final | `2026-10-26T05-23-17.898Z-24988-check-result.json` | passed，HEAD=`cb41b1e2`，干净 |
| test --final | `2026-10-26T05-23-35.562Z-23348-test-result.json` | passed，4/4，proofAudit nc1 |
| real --final | `2026-10-26T05-23-52.807Z-35164-real-result.json` | passed |
| archive | `2026-10-26T05-24-10.646Z-34692-archive-result.json` | passed；`ARCHIVE.json` 257 个文件、3,605,813 字节 |

开发期另有 fmt / clippy / 种子优先与分类对照失败回执，均保留在证据目录，未当作最终门。

## 真实冒烟摘要

只读检查 60 条规则的已知目录与字面前缀，不列目录、不读文件、输出不含绝对路径。

- `base_exists` 为真：56
- `literal_prefix_exists` 为真：45
- 本机字面前缀未命中（15）：`brave-*` 五条、`firefox-cache`、`uv-cache`、`jest-cache`、`huggingface-models`、`ollama-models`、`wer-user-reports`；以及四条仅 marker 的自定义规则（无 custom root 时不做前缀检查）：`cachedir-tagged`、`python-tool-caches`、`test-browser-profiles`、`node-modules`
- 字面前缀命中的包括 Codex / Claude / Cursor / Grok / Chrome / Edge、系统临时与多项开发缓存，与 2026-10-26 总控本机摸底方向一致

详细列表见最终 real 回执 `realSummary`。

## 没做或没验证

- 未合主线、未 push、未改主线台账或 manifest 状态。
- 未跑扫描引擎、进程快照、清理执行器或桌面界面。
- 未在 macOS 验证。
- 未读任何真实文件内容，未删除任何真实用户文件。
- 未验证生产竞态、用户 scope / 自然同意，或规则路径在其它机器上的存在性。
- Chrome 端侧模型、传递优化、Windows 更新下载等 advisory 项只登记说明，不在本票执行清理。
