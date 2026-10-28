# RULES-M3-FIX：Agent 工具规则的措辞与出处修正

2026-10-28，总控（Claude）。补充 [RULES-AGENT](RULES-AGENT.md)，冲突时以本文为准；仍然有效的是 [RULES](../checkup-v1/RULES.md) 与 [MODEL](../checkup-v1/MODEL.md)。只改 `packages/junk-rules/`。

依据：[第六波收单验收](../../docs/acceptance/wave6/controller/WATER-W6-REVIEW-20261028.md) I1 一节（独立审查低级 1、2、3、5、6 条）与 I1 服务真实冒烟的数字。用户 10-28 同意做 M3 收尾。

## 1. 说明文字（一字不差替换）

只改下表列出的字段，其余字段与其余规则都不动。

| 规则 | 字段 | 现在 | 改为 | 原因 |
|---|---|---|---|---|
| `desktop-updater-residue` | `why_zh` | 只清超过一天的更新包残留，正在安装或被占用的文件会跳过。 | 只清超过一天的更新包残留；正在使用的文件删不掉时会原样留下。 | 在用设置是 none，被占用的文件是删除失败、这一项记为部分完成，不是“跳过” |
| `agent-cli-old-binaries` | `why_zh` | 只清超过一天的备份，当前在用的程序不动，被占用的文件会跳过。 | 只清超过一天、以 .old 或 .bak 结尾的备份，当前程序不在清理范围内；正在使用的备份删不掉时会原样留下。 | 同上 |
| `claude-code-old-versions` | `why_zh` | 保留最新一个版本，正在运行的版本不动，只清超过一天的旧版本。 | 保留最新的一个版本，只清超过一天的旧版本。 | 在 Windows 上 Claude Code 从另一份拷贝运行，命令行不会指到 `versions` 下面，“正在运行的版本不动”这句没有依据 |
| `qoder-workspace-temp` | `why_zh` | 无法确定这些临时文件是否还要使用，需要你确认，只列出超过一天的目录。 | 无法确定这些临时文件是否还要使用，需要你确认；只清超过一天的目录。 | 太新的目录也会列出（标“最近有改动”，不可清），只是不清 |
| `agent-tool-logs` | `what_zh` | 各个 Agent 工具自己的运行日志，只列出一周以前的内容。 | 各个 Agent 工具自己的运行日志。 | 同上 |
| `agent-tool-logs` | `why_zh` | 旧日志通常可以清理，但排查过去的问题时可能用得上。 | 只清一周以前的日志；旧日志通常可以清理，但排查过去的问题时可能用得上。 | 把“只清一周以前”放到原因里 |

## 2. `opencode-sessions` 连带保护数据库旁文件

`opencode-sessions` 的第 1 个定位器的最后一段由 `opencode.db` 改为 `opencode.db*`，把 SQLite 的 `opencode.db-wal`、`opencode.db-shm` 一起算进受保护占用。定位器个数不变（解析计划的目标数仍是 255）。

## 3. 本机观察的出处（`local_observation` 的 `ref`）

下列规则的 `local_observation` 改成下表的文字（`checked_on` 写 `2026-10-28`）。数字来自第六波 I1 验收时的服务只读真实体检（总控 2026-10-28）。其余来源不动。

| 规则 | 新的 `ref` |
|---|---|
| `electron-gpu-caches` | 2026-10-28 总控本机只读体检：应用的显卡着色器缓存目录共 41 个，约 45 MB，其中可清的 34 个。 |
| `kimi-code-sessions` | 2026-10-28 总控本机只读体检：.kimi-code 的 sessions 与 file-history 共约 351 MB，受保护。 |
| `workbuddy-memory-sessions` | 2026-10-28 总控本机只读核查：.workbuddy 与 .workbuddy-ai 内有 memory、sessions、plans、plugins 等目录，其中 memory 与 sessions 受保护。 |
| `other-agent-sessions` | 2026-10-28 总控本机只读核查：.dsh 共约 3 MB，内有 profiles、sessions、storages 与 settings.yaml，其中 sessions 受保护。 |

## 4. 数据版本

`data_version` 改为 `2026-10-28.2`，`rules_version` 不变。

## 5. 测试（仍是精确 4 个，名字不变）

`rules_schema_strict`、`rules_protection_precedence`、`rules_resolve_plan`、`rules_seed_coverage`。新断言加在已有测试里，失败信息带 `RULES_M3_WORDING`：
- 第 1 节六处文字逐字等于本表“改为”一栏；所有规则的 `what_zh`、`why_zh`、`after_zh` 都不含“只列出”；在用设置为 none 的规则，说明里不含“被占用的文件会跳过”（`electron-app-cache` 的“扫描时会跳过联接”是对的，不受影响）；
- 第 2 节：`opencode-sessions#1` 的段为 `.local`、`share`、`opencode`、`opencode.db*`；
- 第 3 节四条 `ref` 逐字相等；
- 计划的 `rules_data_version` 为 `2026-10-28.2`。

**获准改动的旧断言**：
- `rules_resolve_plan` 的 `plan.rules_data_version`：`2026-10-28.1` → `2026-10-28.2`；
- 第六波 `RULES_AGENT_TOOLS` 断言里写死了 `opencode-sessions` 定位器（种子表的定位摘要、逐目标的段）或上面四条 `ref` 的地方，改成新值。

回执逐条写出原值与新值。其余原有断言与标记不变；规则数 75、目标数 255 不变。

## 6. 不做

- 校验器不拒“受保护的 `.grok#` 家目录里更深的可清规则”：按 RULES 第 3 节，这种位置由扫描期“受保护内部”保护，是设计如此。
- `claude-code-old-versions` 的在用设置不改（无害，只是在 Windows 上不起作用）。

## 7. 不变

- 其余 74 条规则（`opencode-sessions` 除第 2 节外）的全部字段与顺序；
- 校验器、解析器、规则格式版本、依赖、`Cargo.toml`、`Cargo.lock`；
- 不改 `packages/junk-scan`、服务、宿主与界面。
