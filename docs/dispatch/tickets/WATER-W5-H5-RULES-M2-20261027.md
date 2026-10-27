# WATER-W5-H5：Rust 构建目录规则（轻门）

2026-10-27，正式票，总控（Claude）。以 [第五波 manifest](../wave5/manifest.json) 中本票 `status` 为准；READY 不代表已外贴。可以新开对话执行。本票与 H1～H4 同时进行，各改各的目录。

| 项 | 精确值 |
|---|---|
| 权威票 | F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W5-H5-RULES-M2-20261027.md |
| 唯一工作树 / 分支 | F:/new/smaltalk/water/.worktrees/w5-h5 / worker/water-w5-h5 |
| 精确首次 HEAD | 3f9078972d7f958fad6bfd42e68f022dd659539e，必须干净；`packages/junk-rules` 是第二波 A 验收合入后的版本 |
| SPEC | F:/new/smaltalk/water/contracts/m2-v1/RULES-M2.md（本票的全部要求） |
| 仍然有效的契约 | F:/new/smaltalk/water/contracts/checkup-v1/RULES.md；F:/new/smaltalk/water/contracts/checkup-v1/MODEL.md |
| 规则 | F:/new/smaltalk/water/docs/dispatch/W5-M2-WORKER-RULES.md |
| 检查入口 | F:/new/smaltalk/water/scripts/checkup-wave-check.mjs |
| 回执 | F:/new/smaltalk/water/.worktrees/w5-h5/docs/dispatch/reports/WATER-W5-H5-REPORT.md |
| 证据目录 | F:/new/smaltalk/water/.worktrees/w5-h5/docs/acceptance/wave5/h5/ |
| 门 | 轻门：1 条负控 + check、test、real 三个 final |

先读：
1. 规则与 SPEC RULES-M2 全文，再读 RULES（规则格式与校验）与 MODEL；
2. 背景：[M2 计划](../../M2-PLAN-20261027.md)第 2.3 节；
3. 规则包：`packages/junk-rules/rules/windows.json` 里 `custom` 类的现有规则（特别是 `cachedir-tagged`），`tests/rules_v1.rs` 的种子表与 `locator_summary`。

## 要做的（全部在 `packages/junk-rules/`）

1. 按 SPEC 第 1 节在 `rules/windows.json` 新增规则 `rust-build-dirs`：
   - 放在 `custom` 类现有规则之后；
   - 字段、顺序与写法照现有条目，不新增字段。
2. 来源两条：
   - 本地观察照 SPEC 原文；
   - 官方文档要核对网址与日期（只读网页，不下载任何东西），回执里写出核对了什么。
3. 测试按 SPEC 第 3 节补断言。

**不变**：SPEC 第 4 节，包括其余规则、校验器、格式版本、依赖。本票不改扫描（`packages/junk-scan`）。

## 白名单

- `packages/junk-rules/` 下的文件（不得改 `Cargo.toml`、`Cargo.lock`）
- `docs/dispatch/reports/WATER-W5-H5-REPORT.md`
- `docs/acceptance/wave5/h5/` 下 `--mode archive` 生成的证据

## 测试

`packages/junk-rules/tests/rules_v1.rs`，仍是精确 4 个测试，名字不变：`rules_schema_strict`、`rules_protection_precedence`、`rules_resolve_plan`、`rules_seed_coverage`。

新断言加在已有测试里，失败信息带标记 `RULES_RUST_BUILD`。原有标记与断言不变。

## 负控

| 负控 | 让什么失效（举例，选一处） | 标记 |
|---|---|---|
| nc1 | 新规则的标记文件名或大小界限与 SPEC 不符 | `RULES_RUST_BUILD` |

只改规则数据或生产代码里真正被用到的一处，不改测试 → `--mode red-nc1` → `git checkout` 恢复原字节 → 立即 `--mode test`。

## 命令（在工作树根目录执行）

```powershell
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W5-H5 --mode baseline
```

之后反复用 `lock`、`check`、`test`，做完负控；提交干净实现后依次跑 `check --final`、`test --final`、`real --final`，再 `archive`。

`real --final` 与第二波 A 相同：只解析本机已知目录的计划，不读文件内容，输出不含路径。

## 预算与边界

- cargo 离线、单线程、私有 target。
- 原生窗口 0、选择框 0。
- 不 merge、不 rebase，不改台账、契约、检查器、其它包。
- **远端与历史**：
  - 不 push 到任何远端，不添加或修改 git 远端与配置；
  - 不改写已有提交（不 amend、reset、squash 或任何强制操作），只在首次 HEAD 之后新增提交；
  - 提交信息写错就在回执里说明，不要改写。

## 交回

回执第一行与通知完全一致：

```text
WATER-W5-H5 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w5-h5/docs/dispatch/reports/WATER-W5-H5-REPORT.md
```

回执要写：
- 实际模型、实现提交 SHA；
- 新规则的完整 JSON 与核对过的来源；
- 每个检查命令与结果；
- 负控：改了哪一处、失败信息、恢复后的哈希；
- 没做或没验证的事。

受阻则同一路径写“WATER-W5-H5 任务受阻”，写清冲突与最小补充需求，不要自行变通。
