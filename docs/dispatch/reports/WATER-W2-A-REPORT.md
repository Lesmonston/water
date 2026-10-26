WATER-W2-A 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w2-a/docs/dispatch/reports/WATER-W2-A-REPORT.md

## 交付定位

- 票号：WATER-W2-A；已按补单 01 返工（见文末“补单 01”一节）；无越界申请、无阻塞。
- 权威票面：`F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W2-A-JUNK-RULES-20261026.md`；补单：`F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W2-A-ADDENDUM-01-20261026.md`。
- 工作树：`F:/new/smaltalk/water/.worktrees/w2-a`；分支：`worker/water-w2-a`。
- 精确基线：`7ca15282e477ed4b5120ffe3c1edc3a60b75c144`（标签 `water-w2-checkup-base-20261026`）。
- 原单实现提交：`cb41b1e2007cbbbc77dd34679875f32206ec2003`；原单报告提交：`3cc09105741341626234d380958af97b69c055a1`。
- 补单 01 实现提交：`3535f23d08f50451842a8b9373a6530a3294cd61`（主体）+ `60eada848b5186acdd18a0af1aa3c10ee6a6bd8c`（测试失败信息补 token）。**当前受测实现 HEAD 为 `60eada84`**，三项最终门均在该提交上开始和结束，前后工作树干净。
- 后续收尾提交仅含本报告及 `docs/acceptance/wave2/a/` 证据。
- 执行者：补单 01 由 Grok Bot 执行子代理单独完成，未启动其它子代理。
- 本报告表示执行者交付，等待总控独立验收；未合入 main，未修改主线 manifest/台账，未 push 或发布。

## 逐项结果（已按补单 01 更新）

| 项 | 结果 |
|---|---|
| 独立 crate `packages/junk-rules`（`water-junk-rules`） | 完成。edition 2024、rust-version 1.95、publish=false，四个 auto 发现关闭；`#![forbid(unsafe_code)]`；无 build 脚本、无 dev/build 依赖。 |
| 依赖 | 仅 `serde =1.0.229`（derive）与 `serde_json =1.0.151`。`Cargo.lock` 未因补单改变。 |
| 规则数据 | `rules/windows.json`，`data_version`=`2026-10-26.2`，60 条种子规则用 `include_str!` 编进库；三条 `{b}-login-and-site-data` 各 32 个定位器。 |
| 第 5 节种子 | 表内全部 rule_id 落地；Chrome / Edge / Brave 各写一份。中文文案语气未变。 |
| 来源 | 每条至少一条，未改。 |
| 校验 | `RuleSet::from_json` 拒绝未知键（含嵌套）、越界、重复 rule_id、错误 data_version、非法日期（月 1–12、日按月份与闰年）、discovery 年龄/级别、recommended+leak_prone 且年龄为 0、定位器重复；`locate` 上限 32。错误只含固定码和字段路径，不回显输入值。 |
| 保护优先 | 按补单 01 第 1 节：同一 base，可清理 k 段对受保护 m≥k 段，前 k 对逐段“可能重叠”则拒绝 `RULES_PRECEDENCE`。两边都无通配符按 ASCII 不区分大小写相等；恰一边有通配符时用 MODEL 段语法（`*` 零个或多个、`?` 恰一个、`#` 一个或多个 ASCII 数字）拿它匹配另一边字面；两边都有通配符视为可能重叠。原“仅可清理侧通配符”分支已删除。 |
| KnownFolders | `user_temp` / `system_temp` 与 `{local_app_data}\Temp` / `{windows}\Temp` 改为 ASCII 不区分大小写比较。 |
| 解析 | `resolve_plan` 用合成 KnownFolders 与两个 custom root 生成确定顺序的 targets / hard_guards；登录规则展开为 profile 外层、名字内层的 32 个连续 target。 |
| 真实冒烟 | `examples/real_smoke.rs` 未改，只检查已知目录和字面前缀是否存在，不含绝对路径。 |
| 测试 | 唯一文件 `tests/rules_v1.rs`，恰好四个测试名，无 ignore / filter。 |

本机实际版本：`rustc 1.95.0 (59807616e 2026-04-14)`，Windows x86_64 MSVC。Water 发布许可证仍未决定。

## 测试覆盖（补单 01 后）

| 测试 | 实际覆盖 |
|---|---|
| `rules_schema_strict` | 每个拒绝用例断言具体错误码且错误串含该码、不含 canary；新增：`locate` 33 个拒绝 / 32 个接受、嵌套未知键 `in_use.<key>` → `RULES_UNKNOWN_KEY`、`checked_on` `2026-13-01` 与 `2026-02-29` → `RULES_INVALID_SOURCE`、`data_version` `2026-04-31.1` → `RULES_INVALID_DATA_VERSION`、`2028-02-29` 接受。 |
| `rules_protection_precedence` | 原两例；可清理 `User Data/Default`、`User Data/Default/Network`、`User Data/Profile 3` 对 32 个受保护登录定位器拒绝；`.codex/sessions` 对 `.codex*/sessions` 拒绝；`?` 例与 `#` 例（`#` 需至少一位数字）；大小写不敏感；两边通配；不同 base 通过；根级 ShaderCache 通过；从嵌入 `windows.json` 取 gpu-cache + 登录规则子集（6 条、9 个 shader 定位器）通过；嵌入种子集 60 条通过。 |
| `rules_resolve_plan` | 总 target 214；`rules_data_version`=`2026-10-26.2`；三家浏览器登录 target 各 32 个、连续、`#1..#32`、segments 为 UD + profile + 名字且 profile 外层；其余原有断言保留。 |
| `rules_seed_coverage` | 原有对照之外，逐条断言 `in_use.processes`；登录规则改为 4×8=32 个定位器。 |

## 原单记录（cb41b1e2，保留备查）

原单 nc1：删除 `RuleSet::from_value` 中 `check_protection_precedence(&rules)?`；红 `2026-10-26T05-22-19.169Z-15932-red-nc1-result.json`，绿 `2026-10-26T05-22-53.109Z-15676-test-result.json`；最终门 check/test/real `05-23-17.898Z` / `05-23-35.562Z` / `05-23-52.807Z`，archive `05-24-10.646Z`（以上为 UTC 回执戳，均 2026-10-26）。原单真实冒烟：`base_exists` 56，`literal_prefix_exists` 45。原单“保护优先”实现采用“仅可清理侧通配符视为可能包含”，已被补单 01 判为错误并改正。

## 补单 01

### 起点

- 从 `3cc09105741341626234d380958af97b69c055a1` 续做，工作树干净；未重跑 baseline。
- 先读补单，再按其列出顺序读原票、规则（RULES/MODEL/工作者规则）和原回执。

### 新实现提交

| 提交 | 内容 |
|---|---|
| `3535f23d08f50451842a8b9373a6530a3294cd61` | `rules/windows.json`（data_version、3×32 登录定位器）、`src/types.rs`（段重叠与 MODEL 段匹配、日期校验）、`src/rules.rs`（`locate` 上限 32）、`src/folders.rs`（临时目录大小写不敏感）、`tests/rules_v1.rs`（四个测试按补单扩充） |
| `60eada848b5186acdd18a0af1aa3c10ee6a6bd8c` | 仅 `tests/rules_v1.rs`：`expect_precedence` 在意外通过时 panic 信息写出 `RULES_PRECEDENCE`，让负控能观察到目标 token |

改动范围只在 `packages/junk-rules/`、本报告和 `docs/acceptance/wave2/a/`。

### 改了什么

1. 保护优先改为补单第 1 节的逐段“可能重叠”判定（见上表）；`*` 用回溯，`#` 枚举 1..n 位数字，字面 ASCII 不区分大小写。
2. 三条登录规则各 32 个定位器：UD/{`Default`, `Profile *`, `Guest Profile`, `System Profile`}/{`Network`, `Cookies`, `Login Data`, `Local Storage`, `IndexedDB`, `Session Storage`, `Sessions`, `Web Data`}，profile 外层、名字内层。`windows.json` 用 JSON 解析后 `JSON.stringify(...,2)` 回写（事先验证原文件逐字节可回环），diff +904/−112。
3. `locate` 上限 8→32；`parse_segments` 段数上限仍为 8。
4. `data_version` → `2026-10-26.2`。
5. `valid_date`：月 1–12，日按月份，二月闰年规则（4/100/400）。
6. `folders.rs` 两处临时目录比较改 `eq_ignore_ascii_case`。

### 先红后绿

- 改生产代码前先改测试，`2026-10-26T07-19-18.005Z-21972-test-result.json` 红：四个测试都失败（`Profile 3` 被 `Profile *` 匹配却未拒绝；嵌入规则 `RULES_INVALID_LOCATE`；`2026-13-01` 未拒绝）。
- 实现后 fmt 一次失败（`07-20-06.420Z` check），`cargo fmt` 整理后 check `07-20-26.536Z` 与 test `07-20-41.204Z` 通过，4 passed。

### 新 nc1 红/绿回执

只改生产文件 `packages/junk-rules/src/rules.rs`：删除 `RuleSet::from_value` 中 `check_protection_precedence(&rules)?;`（第 124 行）。未改测试。

| 项 | 值 |
|---|---|
| 第一次尝试（无效） | `2026-10-26T07-22-24.555Z-18440-red-nc1-result.json`，HEAD `3535f23d`：测试确实红（`rules_protection_precedence` FAILED，3 passed / 1 failed），但 panic 信息未含 `RULES_PRECEDENCE`，检查入口判 failed。已立刻 `git checkout --` 恢复，`git hash-object` 前后均为 `8c6a0c182c217b6437e85fd0c7071df5a952c392`。随后补提交 `60eada84` 修正测试信息 |
| 坏态回执（有效） | `docs/acceptance/wave2/a/receipts/2026-10-26T07-23-51.598Z-43096-red-nc1-result.json`，HEAD `60eada84`，passed（观察到目标失败）；Cargo 退出 101，非编译失败 |
| 坏态 `rules.rs` SHA256 | `4272ac509cce3d16ba1638dc910f89c54392f4476d304a5b66318f1d6eed1894` |
| 恢复 | `git checkout -- packages/junk-rules/src/rules.rs`；`git hash-object` 前后均为 `8c6a0c182c217b6437e85fd0c7071df5a952c392` |
| 恢复后立刻 test | `2026-10-26T07-24-06.621Z-29076-test-result.json`，4 passed |
| 恢复后 `rules.rs` SHA256 | `b33066fe9066845257c1519aee657ec6c25da6b0a5bb172b95e2f38910b189aa`（与 HEAD 一致） |
| 最终 test 复核 | `proofAudit`：`nc1` → red `07-23-51.598Z-43096` / restored `07-24-06.621Z-29076` |

### 补单 01 门禁回执

全部在工作树根目录用票面入口执行（回执戳为 UTC，日期均 2026-10-26；东京时间 = UTC+9）。

| 模式 | 回执 | 结果 |
|---|---|---|
| test（先红） | `07-19-18.005Z-21972-test-result.json` | failed（预期的行为红） |
| check | `07-20-06.420Z-14124-check-result.json` | failed（fmt） |
| check | `07-20-26.536Z-28752-check-result.json` | passed |
| test | `07-20-41.204Z-29916-test-result.json` | passed，4/4 |
| red-nc1（第一次） | `07-22-24.555Z-18440-red-nc1-result.json` | failed（缺 token，见上） |
| check | `07-22-57.178Z-28172-check-result.json` | failed（fmt / 测试信息写法，改为 `match` 后解决） |
| check | `07-23-12.733Z-36164-check-result.json` | passed |
| test | `07-23-24.915Z-34528-test-result.json` | failed：`HEAD changed during the gate`（执行者误将该门与提交 `60eada84` 并行，测试本身 4 passed；回执作废，见偏差） |
| test | `07-23-39.596Z-16156-test-result.json` | passed，HEAD `60eada84` |
| red-nc1 | `07-23-51.598Z-43096-red-nc1-result.json` | passed（观察到 `RULES_PRECEDENCE`） |
| test（恢复后） | `07-24-06.621Z-29076-test-result.json` | passed |
| check --final | `07-24-25.343Z-3076-check-result.json` | passed，HEAD=`60eada84`，干净 |
| test --final | `07-24-29.243Z-2684-test-result.json` | passed，4/4，proofAudit nc1 |
| real --final | `07-24-32.173Z-29188-real-result.json` | passed |
| archive | `07-25-08.352Z-38320-archive-result.json` | passed；`ARCHIVE.json` 累计 499 个文件、7,882,994 字节 |

补单期间未单独跑非 final 的 `real`。

### 真实冒烟摘要变化

- 规则数仍 60；`base_exists` 为真：56 → 56。
- `literal_prefix_exists` 为真：45 → 46。唯一变化：`jest-cache` false → true。补单未改 `jest-cache` 规则，判断为本机在两次运行之间出现了该目录（环境变化，非规则改动）。
- 三条登录规则字面前缀为 UD 目录，结果与原单相同（chrome / edge 命中，brave 未命中）。
- 详细列表见 `real --final` 回执 `realSummary`。

### 与票面的偏差

1. 顺序：补单写“nc1 重做一次，然后提交，再跑 final”。检查入口要求负控时测试文件与 HEAD 一致、生产改动相对 HEAD 未提交，所以先提交实现再做 nc1（与原单相同做法），然后 final、archive。
2. nc1 实际跑了两次：第一次测试已红但 panic 信息缺 `RULES_PRECEDENCE` token 被判 failed，补一个只改测试信息的提交 `60eada84` 后第二次通过。两次都立即恢复并以 `git hash-object` 核对。
3. 一次开发期 test 门与 git commit 并行执行，回执 `07-23-24.915Z-34528` 因 HEAD 变化判 failed；随即在新 HEAD 上重跑通过。最终门全部串行。
4. 本机 git 无全局身份；提交用 `git -c user.name/user.email` 沿用本分支已有提交的作者身份（Riku Toto，noreply 邮箱），未改任何 git 配置。
5. 用 `cargo fmt`（同一 1.95.0 工具链）整理格式，只写 crate 内文件；测试与校验只经检查入口。
6. 补单新增的辅助脚本 `.local/addendum01-edit-*.mjs` 在被 gitignore 的工作树 `.local/` 内，未提交。

## 没做或没验证

- 未合主线、未 push、未改主线台账或 manifest 状态。
- 未跑扫描引擎、进程快照、清理执行器或桌面界面。
- 未在 macOS 验证。
- 未读任何真实文件内容，未删除任何真实用户文件或残留测试数据。
- 未验证生产竞态、用户 scope / 自然同意，或规则路径在其它机器上的存在性。
- Chrome 端侧模型、传递优化、Windows 更新下载等 advisory 项只登记说明，不在本票执行清理。
