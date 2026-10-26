# WATER-W2-A：规则登记表

2026-10-26，正式票，总控（Claude）。以 [第二波 manifest](../wave2/manifest.json) 中本票 `status` 为准；READY 不代表已外贴。

| 项 | 精确值 |
|---|---|
| 权威票 | F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W2-A-JUNK-RULES-20261026.md |
| 唯一工作树 / 分支 | F:/new/smaltalk/water/.worktrees/w2-a / worker/water-w2-a |
| 精确首次 HEAD | 7ca15282e477ed4b5120ffe3c1edc3a60b75c144（标签 water-w2-checkup-base-20261026），必须干净、`packages/junk-rules` 不存在 |
| SPEC | F:/new/smaltalk/water/contracts/checkup-v1/RULES.md |
| 共享模型 | F:/new/smaltalk/water/contracts/checkup-v1/MODEL.md |
| 规则 | F:/new/smaltalk/water/docs/dispatch/W2-CHECKUP-WORKER-RULES.md |
| 检查入口 | F:/new/smaltalk/water/scripts/checkup-wave-check.mjs |
| 回执 | F:/new/smaltalk/water/.worktrees/w2-a/docs/dispatch/reports/WATER-W2-A-REPORT.md |
| 证据目录 | F:/new/smaltalk/water/.worktrees/w2-a/docs/acceptance/wave2/a/ |
| 门 | 轻门：一条负控 |

先读规则、[ADR-018](../../decisions/ADR-018-device-junk-checkup-and-in-app-cleanup.md)、共享模型与 SPEC。这些文件在你的工作树基点里也有同样内容，但以主检出绝对路径为准；不要 merge 或复制主线的后续提交。

## 本票要点

- 新 crate `packages/junk-rules`，规则数据放 `packages/junk-rules/rules/windows.json` 并用 `include_str!` 编进库。
- 第 5 节种子规则必须全部落地；三家浏览器各写一份。每条规则的中文文案按设计说明第 7 节的语气写：这是什么、为什么可以清（受保护的写为什么不清）、清了会怎样，说人话，不出现规则 ID 和英文枚举。
- 每条规则至少一条来源。本机观察写 `local_observation`，ref 写“2026-10-26 总控本机只读摸底”或你自己 real 模式的回执文件名；官方文档写 https 链接。不确定的事实不要编。
- 真实模式：`examples/real_smoke.rs`（Cargo.toml 里用 `[[example]]` 声明）按 SPEC 第 6 节只检查路径前缀是否存在，输出 `{rule_id, base_exists, literal_prefix_exists}` 列表，不列目录、不读文件、不输出路径。

## 白名单

- `packages/junk-rules/` 下本票新建的全部文件（含 Cargo.toml、Cargo.lock、README.md、src、tests、examples、rules）
- `docs/dispatch/reports/WATER-W2-A-REPORT.md`
- `docs/acceptance/wave2/a/` 下由 `--mode archive` 生成的证据

其余一律只读，包括契约、检查入口、台账、其它 packages、apps、prototypes 与其它工作树。

## 唯一测试

文件 `packages/junk-rules/tests/rules_v1.rs`，测试目标名 `rules_v1`，精确测试：`rules_schema_strict`、`rules_protection_precedence`、`rules_resolve_plan`、`rules_seed_coverage`。

## 命令顺序（在工作树根目录执行）

```powershell
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W2-A --mode baseline
```

写好 Cargo.toml 后：

```powershell
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W2-A --mode lock
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W2-A --mode check
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W2-A --mode test
```

只读真实冒烟（开发期可以多跑几次，最后在干净提交上跑 final）：

```powershell
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W2-A --mode real
```

负控（每条：只改生产代码 → 运行 → 立即恢复原字节 → 跑一次 test）：

| 模式 | 失败信息必须含 |
|---|---|
| `--mode red-nc1` | `RULES_PRECEDENCE` |

提交干净的实现后，依次运行 final，然后归档证据：

```powershell
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W2-A --mode check --final
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W2-A --mode test --final
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W2-A --mode real --final
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W2-A --mode archive
```

## 预算与边界

原生窗口 0、目录选择框 0、浏览器 0；Rust 离线、jobs 1、私有目录；不下载、不改网络与全局配置。真实读取只按 ADR-018 的只读范围。不 push、不 merge、不 rebase，不改主线台账。

## 交回

回执第一行与通知完全一致：

```text
WATER-W2-A 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w2-a/docs/dispatch/reports/WATER-W2-A-REPORT.md
```

受阻则同一路径写“WATER-W2-A 任务受阻”，写清具体冲突与最小补充需求，不要让别人接手脏树。完成只进入 SUBMITTED，由总控复核后才算 VERIFIED。
