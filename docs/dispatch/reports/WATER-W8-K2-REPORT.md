WATER-W8-K2 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w8-k2/docs/dispatch/reports/WATER-W8-K2-REPORT.md

以下原单受阻记录保留为历史；本轮结果见文末“补单 01”。“任务已完成”表示执行者交回，尚待总控验收。

原单通知：WATER-W8-K2 任务受阻，任务报告在 F:/new/smaltalk/water/.worktrees/w8-k2/docs/dispatch/reports/WATER-W8-K2-REPORT.md

日期：2026-10-31。执行者：Codex（GPT-6；本会话未提供更细的模型型号）。

## 工作树与启动检查

- 工作树：`F:/new/smaltalk/water/.worktrees/w8-k2`。
- 分支：`worker/water-w8-k2`。
- 首次 HEAD：`912eba100ba342c3eeb21ba555c6d589b91e6b4f`，与工单一致。
- 开工与受阻确认时 `git status --porcelain=v1` 均为空；未修改产品、测试、契约、检查器、依赖或台账。
- 实现提交 SHA：无。本次只提交本受阻回执，不表示实现完成或验收通过。
- 权威工单读取自票面指定的主仓库绝对路径；未把主线合入工作树。

已按票面先读第八波执行者规则、RULES-M3C 及原规则契约，核对 ADR-018、第八波计划、MODEL、PROCESS-M3C 第 2 节、现有规则代码与测试。静态核对发现下面三类旧断言冲突，触发工单要求的受阻处理。

## 阻塞依据

`docs/dispatch/W8-M3C-WORKER-RULES.md:44` 明确规定：

> SPEC 没想到、但因本单改动而必然要改的旧断言：**先写受阻回执**，不要自行改。

`contracts/m3c-v1/RULES-M3C.md:70` 起只授权修改四类旧断言：规则总数、四条通用规则的在用设置、custom 规则个数、data_version，并写明“其余不变”。以下不属于这四类；因此不能沿用较早 RULES-AGENT 对其它写死数量的宽泛授权，也不能通过改产品语义绕过。

### 1. 两个 custom root 的目标总数冲突

- `packages/junk-rules/tests/rules_v1.rs:641` 固定断言 `assert_eq!(expected, 255)`。
- RULES-M3C 第 3 节必须新增一个 marker 定位器；原 RULES 第 4 节要求每个 custom root 都生成目标。
- 现有测试有 alpha、beta 两个 custom root，新增目标必须为 2 个，故目标总数应为 **255 → 257**。
- 这是目标数量，不是已获准修改的规则数量或 custom 规则数量。维持 255 必须漏生成目标或移除原目标，均违反契约。

### 2. Agent 目标尾段的边界、数量及顺序冲突

- `packages/junk-rules/tests/rules_v1.rs:822` 起找到 `custom:beta:rust-build-dirs#1`；第 827 行把其后的全部目标作为 `appended`。
- 第 828～831 行要求该尾段恰好 38 个目标，第 834～843 行从 `appended[0]` 开始逐项核对原 Agent 规则顺序。
- RULES-M3C 第 3 节要求新规则紧跟 `rust-build-dirs`，原解析顺序保持。因此此处尾段必然变为 **38 → 40**，前两项是 `custom:alpha:git-worktrees#1`、`custom:beta:git-worktrees#1`，后面才是原来的 38 个 Agent 目标。
- 即使只改 38 为 40，原 Agent 顺序断言仍会把 Git 目标当作第一个 Agent 目标。必须同时授权调整尾段边界，保留原 38 个 Agent 目标的完整检查。

### 3. 新规则逐字文案与旧措辞断言冲突

- RULES-M3C 第 3 节规定 `git-worktrees.why_zh` 必须逐字为：

  `里面可能有还没提交的改动，Water 不读文件内容，无法确认，所以只列出、不提供清理。`

- `packages/junk-rules/tests/rules_v1.rs:961` 起遍历所有规则与公开文案，第 973～976 行断言 `!value.contains("只列出")`，失败标记为 `RULES_M3_WORDING`。
- 新规则必然在 `why_zh` 与公开 `why_zh` 两处触发旧断言。改变规定文案违反逐字要求；为新规则收窄该旧断言又不在四类授权之内。

## 最小补充需求

请总控通过绑定本单与续做基线的编号补单明确授权以下测试调整，并同步受影响工单、SPEC、manifest：

1. 两个 custom root 的目标总数断言 **255 → 257**。
2. 将原 Agent 尾段检查的起点移至新增的两个 Git 目标之后，保留对原 **38** 个 Agent 目标的数量、字段及顺序核对；另用 `RULES_M3C_WORKTREE` 精确核对新增目标、插入位置和根顺序。
3. 仅允许 `git-worktrees` 的规定 `why_zh` 及其公开投影含“只列出”，并用 `RULES_M3C_WORKTREE` 逐字锁定；其它规则与其它字段继续保留旧措辞检查及原标记。

无需放宽产品安全边界、依赖、文件白名单或四个测试的名称和数量。

## 已运行的检查与证据

在指定工作树根执行：

```powershell
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W8-K2 --mode baseline
```

结果：退出码 **0**，`status: passed`，`offlineCache: complete`，前后 HEAD 均为原始基线，前后状态干净。工具链定位与版本检查通过。

原始回执保留在：

`.local/checks/WATER-W8-K2/2026-10-31T14-15-46.868Z-43588-baseline-result.json`

关联日志为同前缀的 `baseline-1.log`、`baseline-2.log`、`baseline-3.log`。baseline 只证明环境与输入就绪，`productTestsRun: false`、`realDataRead: false`；不作为产品测试或真实冒烟通过的证据。

另对仓库内的规则 JSON 做只读内存计数，并核对测试原文，结果为：

| 项 | 基线实值 | 按 SPEC 必然产生的值 |
|---|---:|---:|
| 规则总数 | 75 | 76 |
| marker 定位器数 | 5 | 6 |
| 两个 custom root 的计划目标数 | 255 | 257 |
| Rust beta 目标之后的尾段长度 | 38 | 40 |
| 规定 Git 文案是否含旧测试禁止的“只列出” | 不适用 | 是 |

这些是静态核对及计数，不是修改产品后运行测试所得的失败记录。未构造虚假的红灯或负控证据。

## SPEC 实现状态与未执行项

- 第 1 节新在用方式、第 2 节四条通用规则、第 3 节 Git 工作树规则、第 4 节盘根支持、第 5 节版本更新：**均未实现**，保持原始产品字节。
- 修改过的旧断言：**无**。
- `lock`、`check`、`test`、两条负控、三个 final、`real`、`archive`：**均未运行**。没有负控恢复哈希或 final 通过记录。
- 未读取真实用户文件内容，未扫描整盘，未删除数据，原生窗口 0、选择框 0；未下载依赖、未联网查资料。
- 未改任何远端或 Git 配置，未 push、merge、rebase、amend、reset 或改写历史；未启动子代理或后台任务。
- 未验证 macOS、进程/扫描/服务的跨票集成或任何真实清理链路。
- 本报告仅交回可定位、可复核的契约冲突；待总控编号补单后续做。

## 补单 01

### 身份、起点与提交

- 日期：2026-11-01（JST）；执行者 Codex，实际模型为本会话系统声明的 GPT-6；未提供更细的模型标识，不据工单模型安排推断。
- 同一工作树 `F:/new/smaltalk/water/.worktrees/w8-k2`、分支 `worker/water-w8-k2`。
- 续做起点 `f67309fa7d4d52b39b337fc3bab64b0c76866635`；启动时 HEAD 精确相等，工作树干净；没有重跑 baseline。
- 实现提交：`a55382c748f3fbdad0ff782415fced49ca4d1808`。仅修改 `packages/junk-rules/rules/windows.json`、`src/types.rs`、`src/rules.rs`、`src/plan.rs`、`tests/rules_v1.rs` 五个文件。
- 实现提交作者与提交者均为 `Codex <codex@localhost>`，仅在提交进程内设置四个 Git 身份环境变量；未写 Git 配置。
- 三个 final 均在上述干净实现提交上通过。后续提交只包含本回执与 archive 生成的证据，不夹带产品改动。

### SPEC 第 1～5 节逐条对照

1. **新的在用方式**：`src/types.rs` 新增 `InUseMode::RunsFromOrReferencesItem`，`parse` 与 `as_str` 精确对应 `runs_from_or_references_item`。`src/rules.rs::parse_in_use` 与 `src/plan.rs::parse_plan_in_use` 都接受该方式的 0～8 个小写 exe 名；沿用原有名字校验与最大数量检查。`none` 仍只接受空数组，另外两种旧方式仍要求 1～8 个名字。规则到目标沿用 `make_target` 的原样克隆，序列化使用新 wire 名。测试分别经公开 `RuleSet::from_json`、`resolve_plan`、`plan_to_json`、`ScanPlan::from_json` 覆盖 0～8 个名单的完整往返、9 个拒绝、大小写/后缀拒绝，以及旧方式空名单拒绝，标记 `RULES_M3C_IN_USE`。
2. **四条通用规则**：`windows.json` 仅将 `cachedir-tagged`、`python-tool-caches`、`node-modules`、`rust-build-dirs` 的 `in_use` 改为新方式与空名单；种子表与逐目标检查同步。`test-browser-profiles` 的全部字段保持，另外明确锁定其原模式与两个浏览器名字。对原始 75 条规则逐条做 JSON 深比较：除这四个 `in_use` 外，其余字段与顺序全部相等。
3. **Git 工作树**：在 `rust-build-dirs` 之后插入下列完整规则。四个测试仍然是原来的名字；`RULES_M3C_WORKTREE` 逐字比较完整 JSON（含出处），核对公开及两个 custom group 的文案，逐目标核对 `.git` 文件类型、1～4096 字节、深度 8、advisory、根与 ID。alpha/beta 两个目标紧跟 beta Rust 目标，之后才是原有 38 个 Agent 目标；没有自选根时不生成 Git 目标。Rust 保持第 61 条，Git 是第 62 条，14 条 Agent 规则原顺序保持。
4. **盘根**：仅把 `resolve_plan` 中 custom root 的 `valid_abs_path` 参数改为允许精确盘根；原有形状检查未改。`F:\` 能生成全部六种 marker 目标，原 root_id 保留，`hard_guards` 含一次 `F:\`。为使该合法输出仍可由本包严格解析读回，marker 的计划 JSON 入口也允许精确盘根；pattern/discovery 的根约束未改。`F:`、`F:\\`、`F:\a\`、点段、父段、正斜杠、非字母盘符及 UNC 仍拒绝，标记 `RULES_M3C_DRIVE_ROOT`。规则层不判断系统盘，不实际遍历 F 盘。
5. **版本**：数据与计划版本均为 `2026-10-31.1`，新增 `RULES_M3C_VERSION` 检查；`rules_version` 仍为 `water.junk-rules.v1`。

新规则完整 JSON：

```json
{
  "rule_id": "git-worktrees",
  "title_zh": "Git 工作树或子模块",
  "owner_zh": "Git",
  "category": "custom",
  "level": "advisory",
  "locate": [
    {
      "kind": "marker",
      "marker": {
        "kind": "file",
        "name": ".git",
        "min_bytes": 1,
        "max_bytes": 4096
      },
      "max_depth": 8
    }
  ],
  "item_type": "dir",
  "min_age_hours": 0,
  "keep_newest": 0,
  "in_use": { "mode": "none", "processes": [] },
  "growth": "slow",
  "what_zh": "目录里的 .git 是一个小文件而不是文件夹，通常是 git worktree 建出的工作树，也可能是子模块。",
  "why_zh": "里面可能有还没提交的改动，Water 不读文件内容，无法确认，所以只列出、不提供清理。",
  "after_zh": "确认不再需要后，在主仓库里用 git worktree remove 删除，主仓库的登记会一并清掉。",
  "fix_hint_zh": null,
  "sources": [
    {
      "kind": "local_observation",
      "ref": "F 盘清理记录 docs/maintenance/F-CLEANUP-20261029.md：130 棵已合并的旧工作树共 56 GB",
      "checked_on": "2026-10-29"
    },
    {
      "kind": "official_doc",
      "ref": "https://git-scm.com/docs/git-worktree",
      "checked_on": "2026-10-31"
    }
  ]
}
```

### 旧断言改动原文：SPEC 第 6 节四类

**1. 规则总数，75 → 76**（失败信息不变）：

```rust
// 改前
assert_eq!(embedded.rules().len(), 75, "seed set must load");
// 改后
assert_eq!(embedded.rules().len(), 76, "seed set must load");
```

**2. 四条通用规则的 in_use**：以下四个种子行各自的原文都是 `InUseMode::None,`，改后各自都是 `InUseMode::RunsFromOrReferencesItem,`。`processes_for` 原来返回空名单，仍然返回空名单。

| 种子行 | 改前原文 | 改后原文 |
|---|---|---|
| cachedir-tagged | `InUseMode::None,` | `InUseMode::RunsFromOrReferencesItem,` |
| python-tool-caches | `InUseMode::None,` | `InUseMode::RunsFromOrReferencesItem,` |
| node-modules | `InUseMode::None,` | `InUseMode::RunsFromOrReferencesItem,` |
| rust-build-dirs | `InUseMode::None,` | `InUseMode::RunsFromOrReferencesItem,` |

上述四条产品数据各自的改前/改后原文为：

```json
"in_use": {
  "mode": "none",
  "processes": []
}
```

```json
"in_use": {
  "mode": "runs_from_or_references_item",
  "processes": []
}
```

逐行种子表检查循环、Rust 的 `RULES_RUST_BUILD: in use mode`/`processes` 断言均保持原文，只消费获准变更的种子行。

**3. custom 规则个数，5 → 6**：原测试没有单独写死 `== 5` 的断言，原文是五条 custom 种子行并经全表循环核对。补单新增第六行（见下文第 5 条）；不虚构一个被替换的旧断言。另新增明确计数：

```rust
assert_eq!(
    rules
        .rules()
        .iter()
        .filter(|rule| rule.category == Category::Custom)
        .count(),
    6,
    "RULES_M3C_WORKTREE: six custom rules"
);
```

**4. data_version**：产品 JSON 的原文 `"data_version": "2026-10-28.2",` → `"data_version": "2026-10-31.1",`。旧计划断言只改版本值，保留原失败标记：

```rust
// 改前
assert_eq!(
    plan.rules_data_version, "2026-10-28.2",
    "RULES_M3_WORDING: plan data version"
);
// 改后
assert_eq!(
    plan.rules_data_version, "2026-10-31.1",
    "RULES_M3_WORDING: plan data version"
);
```

另外新增带 `RULES_M3C_VERSION` 的嵌入版本与计划版本断言。

### 旧断言改动原文：补单第 1 节五条

**1. 目标总数，255 → 257**：

```rust
// 改前
assert_eq!(expected, 255);
// 改后
assert_eq!(expected, 257);
```

**2. Agent 尾段起点**：

```rust
// 改前
let appended = &plan.targets[beta_position + 1..];
// 改后
let appended = &plan.targets[beta_position + 3..];
```

新增 `RULES_M3C_WORKTREE` 对 `plan.targets[beta_position + 1..beta_position + 3]` 的逐字段检查，目标依次为 `custom:alpha:git-worktrees#1`、`custom:beta:git-worktrees#1`。原有 `appended.len() == 38`、Agent 逐项级别/字段/顺序检查、最后目标 `other-agent-sessions#3` 与所有 `RULES_AGENT_TOOLS` 标记不变。

**3. “只列出”措辞**：

```rust
// 改前
assert!(
    !value.contains("只列出"),
    "RULES_M3_WORDING: {} {field} must describe cleaning, not listing",
    rule.rule_id
);
// 改后
if rule.rule_id != "git-worktrees" {
    assert!(
        !value.contains("只列出"),
        "RULES_M3_WORDING: {} {field} must describe cleaning, not listing",
        rule.rule_id
    );
}
```

同一循环的 `if rule.in_use.mode == InUseMode::None` 检查完整保留，包括对 Git 规则禁止承诺“被占用的文件会跳过”。Git 的完整 JSON 与三个公开 group 的文案另由 `RULES_M3C_WORKTREE` 逐字核对。

**4. 规则顺序**：

```rust
// 改前
rules.rules()[61..]
// 改后
rules.rules()[62..]
```

其后的迭代、`AGENT_RULE_IDS` 比较及 `RULES_AGENT_TOOLS: appended rule order` 均不变；Rust 下标 `Some(60)` 与 `RULES_RUST_BUILD: original rule remains 61st` 不变。新增：

```rust
assert_eq!(
    rules.rules()[61].rule_id,
    "git-worktrees",
    "RULES_M3C_WORKTREE: Git rule remains 62nd"
);
```

**5. 种子表新增一行**：原来 Rust 行之后直接是 `rows.extend(agent_seed_table());`，改后该位置原文为：

```rust
rows.push(seed(
    "git-worktrees",
    Category::Custom,
    Level::Advisory,
    ItemType::Dir,
    0,
    0,
    InUseMode::None,
    Growth::Slow,
    vec!["marker:file:.git:1:4096:8".to_string()],
));
rows.extend(agent_seed_table());
```

四条通用规则的种子行在上文列明；全表逐行核对循环本身没有改动。除此之外未改任何旧断言或旧失败标记。四个测试名与数量原样保持，没有 ignore、过滤、拆分或新增顶层测试。

### 检查命令、结果与证据

全部在工作树根执行。下表每行的命令均为 `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W8-K2` 加上“参数”列。回执与日志均由原检查入口生成，归档在 `docs/acceptance/wave8/k2/receipts/`；表中列出完整回执名。

| 参数 | 检查器退出码 / 结果 | 回执文件 |
|---|---|---|
| `--mode lock` | 0 / passed，原锁与依赖通过 | `2026-10-31T15-42-05.577Z-15612-lock-result.json` |
| `--mode test`（先加需求测试，产品仍为原字节） | 1 / failed，cargo 101；编译成功、四测实际失败 | `2026-10-31T15-43-17.392Z-11652-test-result.json` |
| `--mode test`（实现后） | 0 / passed，4 passed | `2026-10-31T15-45-01.527Z-21208-test-result.json` |
| `--mode check` | 0 / passed，fmt / Clippy / 依赖 / 源码政策 | `2026-10-31T15-45-57.047Z-21508-check-result.json` |
| `--mode test`（补入标记明确的计划读回检查后） | 0 / passed，4 passed | `2026-10-31T15-46-47.568Z-23344-test-result.json` |
| `--mode red-nc1` | 0 / passed，有效观察 cargo 101，2 passed / 2 failed | `2026-10-31T15-47-50.606Z-2144-red-nc1-result.json` |
| `--mode test`（nc1 立即恢复后） | 0 / passed，4 passed | `2026-10-31T15-48-21.509Z-2792-test-result.json` |
| `--mode red-nc2` | 0 / passed，有效观察 cargo 101，3 passed / 1 failed | `2026-10-31T15-49-04.062Z-21212-red-nc2-result.json` |
| `--mode test`（nc2 立即恢复后） | 0 / passed，4 passed | `2026-10-31T15-49-27.208Z-35724-test-result.json` |
| `--mode check --final` | 0 / passed，干净实现提交 | `2026-10-31T15-49-47.999Z-25504-check-result.json` |
| `--mode test --final` | 0 / passed，4 passed；两条负控与原字节恢复审计通过 | `2026-10-31T15-50-26.627Z-42520-test-result.json` |
| `--mode real --final` | 0 / passed，只读已知位置存在性检查 | `2026-10-31T15-50-43.043Z-18624-real-result.json` |
| `--mode archive` | 0 / passed，归档 210 个文件、3,867,563 字节 | `2026-10-31T15-50-59.822Z-31020-archive-result.json`（本地 archive 回执） |

最初的需求红灯是实际测试失败，不是负控：编译成功后分别观察到 75/76、255/257、新模式不识别（`RULES_M3C_IN_USE`）、旧版本与新版本不等（`RULES_M3C_VERSION`）。新增测试与最终测试之间有格式及新标记检查的变化，因此不把该红灯声称为最终测试字节的负控。正式两条负控与最终测试的 testHash 完全一致。

其它定向核对：两次执行 `C:/Users/37310/.cargo/bin/rustup.exe run 1.95.0 cargo fmt --manifest-path packages/junk-rules/Cargo.toml` 格式化本包（进程内关闭自动安装），退出 0；`git diff --check` 退出 0。内存 JSON 深比较通过：原 75 条规则只有四个获准的 `in_use` 变化，原顺序保持，Git 插在第 62 条。`Cargo.toml`、`Cargo.lock` 与其它包未变。未运行全仓测试。

归档保留原有四份 baseline 回执及其日志，均为本轮开始前已有，本轮没有执行 baseline。archive 命令自身的 result 在复制完成后才生成，按检查器现有行为仅留在 `.local/checks/WATER-W8-K2/`；210 项的权威索引为 `docs/acceptance/wave8/k2/ARCHIVE.json`，未手工伪造或补写归档文件。

交回前另逐项复算这 210 份归档的大小与 SHA-256，均与索引及 `.local` 源字节相等；复核 final 捕获的全部产品/测试字节仍等于当前实现、每条负控只有 `src/plan.rs` 与好态不同、两份恢复均绑定最终相同哈希，全部通过。回执内完整 Git JSON 与产品深比较相等，旧受阻正文完整保留；最终 `git diff --check` 退出 0。

### 两条生产负控与恢复哈希

两次都只改 `packages/junk-rules/src/plan.rs` 一处；测试、数据与其它源码不动。

**nc1**：把计划的在用校验从：

```rust
InUseMode::RunsFromOrReferencesItem => Ok(InUse { mode, processes }),
```

临时改为：

```rust
InUseMode::RunsFromOrReferencesItem if !processes.is_empty() => Ok(InUse { mode, processes }),
```

这会让新方式的空名单落入原来的拒绝分支。实际失败：

```text
RULES_M3C_IN_USE: strict plan accepts the new empty process lists
RULES_M3C_IN_USE: plan accepts zero through eight names: RulesError { code: "RULES_INVALID_IN_USE", path: "/targets/0/in_use/processes" }
```

`rules_resolve_plan`、`rules_schema_strict` 失败，另两测通过；没有编译错误、超时或旧标记先失败。坏态文件 SHA-256：`e3dc69645b31a042cd45ecfbd2a00efc64dd0ade0d0c56018b0a2c01bbd756ba`。随即执行 `git checkout -- packages/junk-rules/src/plan.rs`，立即 `--mode test`，4 passed。

**nc2**：把 custom root 校验从：

```rust
if !valid_abs_path(&root.path, true) {
```

临时改为：

```rust
if !valid_abs_path(&root.path, false) {
```

实际只有 `rules_resolve_plan` 失败：

```text
RULES_M3C_DRIVE_ROOT: exact drive root is valid: RulesError { code: "RULES_INVALID_PATH", path: "/custom_roots/0/path" }
```

另外三测通过；没有编译错误、超时或旧标记先失败。坏态文件 SHA-256：`28274a914b868f27b7533e899c9eb32bd7103522384de94a3e43852d6dcae8e8`。随即执行同一条单文件 checkout，再立即 `--mode test`，4 passed。

两次恢复后 `src/plan.rs` SHA-256 都是 `2839fa0d3349b85134fdafe74c5df4de2266402bbff8eb54149e4cb2edb0f34a`。两份恢复绿灯与全部 final 的聚合 productionHash 都是 `5469f20b6833a89e4c63adf22c98338db782fd43ec401f1b588394377107a925`，testHash 都是 `d900defca472b60c05b5116f991466344932da2696e68716eb2a976519320b89`。`test --final` 的 `proofAudit` 精确绑定上表 nc1/nc2 与各自紧随的恢复绿灯；坏态与恢复源码快照随原回执归档。

### 真实冒烟结果与边界

`real --final` 输出 76 条规则的布尔存在性结果：`base_exists=true` 为 70 条，`literal_prefix_exists=true` 为 60 条。Git 与其它五条 marker 规则没有自选根输入，存在性两个字段为 false；这不表示本机没有工作树，也不证明真实扫描能发现工作树。本次未遍历任何工作树或整盘，未读真实文件内容，输出不含真实目录路径。规则正文中的出处来自冻结 SPEC，未另行联网核对网页。

- 保留精确四测：`rules_schema_strict`、`rules_protection_precedence`、`rules_resolve_plan`、`rules_seed_coverage`；final 全部通过，0 ignored、0 filtered。
- 生产逻辑仍为纯数据与内存逻辑；没有新依赖、环境变量读取、进程启动、网络或文件内容读取。真实冒烟示例未改。
- 本票没有物理合成夹具创建或删除；原生窗口 0、选择框 0、浏览器 0。Cargo 离线、jobs 1、私有 Cargo home/target，由原检查器设置；没有下载。
- 未修改契约、检查器、台账、其它包、根 Cargo 文件、共享 Vault 或上游；未使用子代理。
- 未 push、merge、rebase、amend、reset、squash 或改写历史；未改远端或持久 Git 配置。只在续做起点之后新增提交。
- 未验证 macOS、K1/K3/K4 真实跨票集成、系统盘服务拦截、真实盘根扫描性能、真实 Git 状态、生产竞态、应用内清理与任何真实删除；这些不能由本票规则与内存计划测试代替。
