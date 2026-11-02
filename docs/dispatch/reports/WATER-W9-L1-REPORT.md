WATER-W9-L1 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w9-l1/docs/dispatch/reports/WATER-W9-L1-REPORT.md

# WATER-W9-L1 执行回执

- 实际模型：Codex，GPT-6（本会话系统所示；未冒称派单台账中的具体变体）。
- 工作树：`F:/new/smaltalk/water/.worktrees/w9-l1`；分支：`worker/water-w9-l1`。
- 首次 HEAD：`57ecd7ce42a98f9932faecc69e5d82c648991669`，开工时干净；baseline 通过。
- 实现提交：`c27b88c84fd3a7000580c126148f7740f8f6d927`。
- 修改范围：`packages/junk-rules/rules/windows.json`、`src/lib.rs`、`src/types.rs`、`src/rules.rs`、`src/plan.rs`、`tests/rules_v1.rs`；随后仅提交本回执与归档器生成的证据。
- 未改 Cargo.toml、Cargo.lock、依赖、契约、检查器、其它包或台账；未 merge、push、改远端、改 Git 配置或改写已有提交。提交身份仅在提交进程内设为 `Codex GPT-6 <codex-gpt-6@localhost>`。

## SPEC 第 1～5 节对照

1. **附加条件与校验**：`types.rs` 新增公开 `Condition` 四种变体，共用 `parse_conditions` 严格解析器；`rules.rs::parse_locator` 仅给 marker 开放 `conditions`，`parse_locators` 限 custom 规则。数组长度 1～4、kind 唯一、未知 kind/额外字段/缺字段拒收；名字为 1～64 字节可打印 ASCII，排除规定的字符、`.`、`..`；名字数组 1～16 项且按 ASCII 忽略大小写去重。缺省为空 Vec，显式空数组拒收。错误只含固定码与字段路径，不回显输入。
2. **两条主规则条件**：`windows.json` 的 `node-modules` 加入 `parent_has_file`、`parent_has_other_entries`、`no_ancestor_suffix`；`test-browser-profiles` 加入 `path_has_any`，逐项与 SPEC 相同。用 Git 基线解析比对确认，移除这两处 conditions 并移除两条新增规则后，原有 76 条规则的全部字段、文案与顺序逐项相等。
3. **兜底与新增规则**：`rules.rs::check_fallbacks` 校验 custom/advisory、单定位器、兜底无条件、主规则存在/custom/单 marker/非空条件/非兜底、同 marker/max_depth、单一兜底及不指自身。新增 `bundled-node-modules`、`browser-data-dirs` 在 `git-worktrees` 后，下标 62、63；所有字段、来源与中文文案由测试整条 JSON 比对。
4. **Rust 类型与计划**：crate 根导出 `Condition`；`Locator::Marker`、`MatchSpec::Marker` 增加 `conditions` 与 `fallback_for`。`resolve_plan` 原样复制条件，兜底 rule_id 转为同 root 下的主 target_id（`custom:<root_id>:<rule_id>#1`）。旧目标顺序不变，每个 root 按规则顺序增加两个目标。`plan_to_json` 在 max_depth 后按序输出非空 conditions / fallback_for，条件键序为 kind 后专属字段；空/无字段省略。`ScanPlan::from_json` 严格读回并检查兜底关系；新旧计划往返通过，旧形状目标字段、旧 marker JSON 字节与摘要格式均有断言，未变的序列化字段顺序保持。`locator_key`、定位摘要忽略两个新字段。
5. **数据版本**：`2026-10-31.1` → `2026-11-02.1`；新增 `RULES_M3D_VERSION` 精确断言。

测试仍精确四个且名字不变：`rules_schema_strict`、`rules_protection_precedence`、`rules_resolve_plan`、`rules_seed_coverage`。新增断言覆盖条件与兜底各项校验反例、合法边界、逐字数据、两个 custom root、盘根、同 root 主目标关联、新旧 JSON 往返与新键顺序，标记为 `RULES_M3D_CONDITIONS` / `RULES_M3D_FALLBACK` / `RULES_M3D_VERSION`。没有 ignore、过滤或新增测试入口。

## 获准修改的旧断言（原值 → 新值）

1. `rules_protection_precedence` 的嵌入规则总数：76 → 78；种子表在 `git-worktrees` 后增加下标 62、63 两行；Agent 规则切片 `rules()[62..]` → `rules()[64..]`。种子表总长随之 76 → 78；Agent 14 条本身不变。
2. `rules_resolve_plan` 两个 custom root 的 expected target 数量：257 → 261，实际 target 总数仍逐项核对。
3. `rules_seed_coverage` custom 规则数：6 → 8（对应提示文字 six → eight）。
4. Agent 目标起点切片：`beta_position + 3` → `beta_position + 7`；追加数仍为 38。两个 Git 目标的原切片和原断言保持。
5. 盘根 marker 目标数：6 → 8（提示文字 six → eight）；顺序表在末尾加入 `custom:drive-f:bundled-node-modules#1`、`custom:drive-f:browser-data-dirs#1`。
6. 三处嵌入/计划版本断言（含 `RULES_M3_WORDING`、`RULES_M3C_VERSION`）：`2026-10-31.1` → `2026-11-02.1`；合成输入的历史版本值未改。
7. Rust 构建目标与 Git 工作树目标两处完整 `MatchSpec::Marker` 比对：原仅 root/marker/max_depth → 追加 `conditions: vec![]`、`fallback_for: None`。定位摘要 helper 的 `Locator::Marker { marker, max_depth }` → 带 `..`，继续只读旧字段；现有摘要期望值不变。导入新增 `Condition`。
8. 除上述授权项与 rustfmt 格式整理外，未删除、放宽或更换旧断言；第 6 节第 8 类没有额外需要修改的旧断言。

## 检查命令与结果

统一命令前缀（均在专属工作树根执行）：

```powershell
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W9-L1 --mode <模式> [--final]
```

以下回执均在 [归档索引](../../acceptance/wave9/l1/ARCHIVE.json) 中，时间为 UTC；文件名前缀可定位原始 result、日志和源码快照。

| 本会话回执前缀 | 模式 | 检查器退出码 / 结果 |
|---|---|---|
| `2026-11-02T03-50-05.323Z-30744` | baseline | 0 / passed，精确初始 HEAD、干净树、离线缓存就绪 |
| `2026-11-02T03-56-11.603Z-39392` | test | 1 / failed，Rust 101：旧完整变体构造缺两个新字段、旧穷举需补字段；按授权修正 |
| `2026-11-02T04-02-31.661Z-30216` | test | 0 / passed，4/4 |
| `2026-11-02T04-03-59.525Z-38104` | check | 1 / failed，fmt check 失败；运行本机 1.95.0 的 cargo fmt 后修正 |
| `2026-11-02T04-08-27.506Z-17272` | test | 1 / failed，新增逐字 JSON 断言抓到新规则中文经 PowerShell 管道写成问号；用 UTF-8 补丁修正 |
| `2026-11-02T04-10-03.143Z-3420` | test | 0 / passed，4/4 |
| `2026-11-02T04-11-57.616Z-22200` | lock | 0 / passed，依赖核对，锁文件不变 |
| `2026-11-02T04-12-13.235Z-34000` | check | 0 / passed，fmt、Clippy `-D warnings` |
| `2026-11-02T04-12-53.620Z-16100` | test | 0 / passed，4/4，最终测试字节 |
| `2026-11-02T04-14-20.809Z-1968` | red-nc1 | 0 / 有效红，Rust 101，3 passed / 1 failed，命中 `RULES_M3D_FALLBACK` |
| `2026-11-02T04-14-34.572Z-43568` | test | 0 / 原字节恢复绿，4/4 |
| `2026-11-02T04-15-09.680Z-29092` | red-nc2 | 0 / 有效红，Rust 101，3 passed / 1 failed，命中 `RULES_M3D_CONDITIONS` |
| `2026-11-02T04-15-24.387Z-24192` | test | 0 / 原字节恢复绿，4/4 |
| `2026-11-02T04-15-53.029Z-4472` | check --final | 0 / passed，干净实现提交 |
| `2026-11-02T04-16-06.678Z-14660` | test --final | 0 / passed，4/4，两条 proofAudit 通过 |
| `2026-11-02T04-16-22.771Z-40928` | real --final | 0 / passed，只读存在性核对 |
| `2026-11-02T04-16-55.763Z-19860` | archive | 0 / passed，253 文件、5,393,369 字节（含派前 baseline 与失败历史） |

另一次开发用 `cargo test --offline --workspace --tests` 因 shell PATH 无 cargo，未启动 Cargo；随后所有构建/测试均使用冻结检查器指定的本机 1.95.0、离线私有 Cargo home/target 和 jobs=1。开发中通过 rustup 定位 cargo 后运行 `cargo fmt --manifest-path packages/junk-rules/Cargo.toml`，仅做格式化，各次退出码 0；最后格式化后 check/test 已绿。未下载。

## 负控与恢复

两条负控都只改本包 `src/` 单处生产逻辑，测试与数据字节未变，无测试开关；每条完成后立即 `git checkout -- <文件>`，核对 SHA-256，紧接一次完整四测试绿，才进行下一条。

| 负控 | 变异 | 首个失败 | 恢复文件 SHA-256 |
|---|---|---|---|
| nc1 | `rules.rs::check_fallbacks` 移除 `main_conditions.is_empty()` 条件，保留其它兜底检查 | `rules_schema_strict`：`RULES_M3D_FALLBACK: main requires conditions`；其它三测通过 | `2848c2bba3e706a81c24b1e61d86c8235ba54051740cd25886218bfce3fe9c4e` |
| nc2 | `plan.rs::resolve_plan` 中目标 `conditions: conditions.clone()` → `conditions: vec![]` | `rules_resolve_plan`：`RULES_M3D_CONDITIONS: target conditions`，实际 `[]`；其它三测通过 | `2b696ff604c5d662fe4d20c689380d4899f8ff32a7c0d9e057d1ef33fab0755e` |

恢复后的聚合 productionHash 为 `31e906ea04569997e640980869a17b48f244299b4ed9018462726f1ed6293a87`，testHash 为 `c9a3bdffde633a6b4b3555646e1d9a0193e75cedeb8988361f74e8addfe6d76d`，与三个 final 一致。变异只有未使用变量警告，没有编译错误、超时或旧断言先失败。

归档逐文件长度、SHA-256 与源字节复核全部通过。实现提交前 `git diff --check` 通过；归档暂存后的 `git diff --cached --check` 退出 2，提示早期 04:02 / 04:03 的原始源码快照内 CRLF 和 fmt 失败日志空白（6 处）。按归档原字节要求保留，没有修改证据；本回执和最终产品无此空白问题。这是附加检查提示，不是上述 final 检查失败。

## 真实冒烟与边界

`real --final` 复用未改的 `examples/real_smoke.rs`：78 条规则输出存在性布尔值；base 存在 70、不存在 8，literal prefix 存在 53、不存在 25。8 条 marker（含两个新兜底）没有 custom root，返回 false/false，不代表对应对象不存在。输出不含绝对路径；只核对已知目录是否存在，不列目录、不读取真实文件内容、不做清理。

未做或未验证：扫描侧的条件实际判定与归组（属于 L2）、与 L2 的联合 JSON 接线、服务/桌面真实体检、F1/F2 真实目录归组复验、macOS、删除或真实清理。原生窗口、选择框、浏览器均为 0；未创建或删除物理夹具。仅提交完成待总控验收，未自行标 VERIFIED 或合入主线。
