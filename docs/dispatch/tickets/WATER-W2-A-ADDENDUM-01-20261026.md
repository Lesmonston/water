# WATER-W2-A 补单 01：保护优先判定与浏览器配置目录

2026-10-26，总控（Claude）。依据 [第二波收单验收](../../acceptance/wave2/controller/WATER-W2-AE-REVIEW-20261026.md) A 小节。**贴回原 A 对话续做，不新开执行者。**

## 为什么有这张补单

你的实现除了一处，其余与 RULES 逐条一致，60 条种子与表完全对上。那一处是保护优先判定：RULES 第 3 节第 1 条写“任一段含通配符视为可能重叠”，你改成了“只有可清理一侧带通配符才算”。

你改它的原因是对的：按原文，`User Data` 根下的 ShaderCache、GrShaderCache、GraphiteDawnCache（三个浏览器共 9 个定位器）会被判为与 `User Data\*\Cookies` 重叠，种子集自己过不了。这是总控契约写错了。但改法放得太宽：一条 recommended 规则写成 `User Data\Default` 或 `User Data\Default\Network` 也能通过，而它会包住 Cookies 和登录数据。

另外记一笔流程：契约与种子冲突时应按执行者规则第 2 节交回受阻，不要自行改判定，也不要在回执里写“无阻塞”。

## 覆盖条款（冻结契约文件不改，以本补单为准）

1. **替换 RULES 第 3 节第 1 条的判定**。同一 base 上，可清理定位器 k 段、受保护定位器 m ≥ k 段，前 k 段逐段判断“可能重叠”，全部可能重叠即拒绝，错误码仍为 `RULES_PRECEDENCE`。逐段规则：
   - 两段都不含通配符：ASCII 大小写不敏感相等。
   - 恰好一段含通配符：用 MODEL 段语法（`*` 零个或多个字符，`?` 一个字符，`#` 一个或多个 ASCII 数字，字面字符 ASCII 大小写不敏感）把含通配符的那段当模式，去匹配另一段的字面文本，能匹配即可能重叠。
   - 两段都含通配符：视为可能重叠。
2. **替换 RULES 第 5 节 `{b}-login-and-site-data` 一行的定位器**（chrome、edge、brave 三条）。原来的 UD `*` 改为显式列出四种配置目录：`Default`、`Profile *`、`Guest Profile`、`System Profile`，每种下面仍是原来 8 个名字（`Network`、`Cookies`、`Login Data`、`Local Storage`、`IndexedDB`、`Session Storage`、`Sessions`、`Web Data`）。每条规则因此有 32 个定位器，顺序为配置目录在外、名字在内。其余字段不变，rule_id 不变。
3. **RULES 第 2 节 `locate` 的上限从 8 改为 32**。其它定位器约束不变。
4. 按新判定，嵌入种子集必须原样通过，不得为了过校验而给任何规则开例外。

## 必改

1. `check_protection_precedence` 与逐段判定按第 1 条实现；删除“只看可清理一侧通配符”的分支。
2. `rules/windows.json` 按第 2 条改三条受保护规则；数据版本 `data_version` 加一（`2026-10-26.2`）。
3. 顺手修两处小问题：`folders.rs` 比较两个临时目录时改为 ASCII 大小写不敏感；`valid_date` 检查月份 1～12、日期在当月范围内。

## 测试（仍是原四个测试名，不加不减）

- `rules_protection_precedence` 至少覆盖：
  - 原有两例（`User Data` `*` 对 `User Data` `*` `Cookies` 拒绝；`*` `Cache` 对 `*` `Network` 通过）。
  - 可清理字面段对受保护模式段：recommended `User Data` `Default` 拒绝；recommended `User Data` `Default` `Network` 拒绝；recommended `User Data` `Profile 3` 拒绝（匹配 `Profile *`）。
  - user_profile 上 recommended `.codex` `sessions` 对受保护 `.codex*` `sessions` 拒绝。
  - `?` 与 `#` 各一例（例如 `Profile #` 对字面 `Profile 12` 重叠，对 `Profile x` 不重叠）。
  - 嵌入种子集通过，其中 9 个 shader 定位器与新的受保护定位器不冲突。
  - 失败信息都含 `RULES_PRECEDENCE`。
- `rules_schema_strict`：`reject()` 断言具体错误码，不只断言出错；补嵌套未知键一例和日期越界一例。
- `rules_seed_coverage`：核对 in_use 的进程名列表；三条 login-and-site-data 按新的 32 个定位器核对。
- `rules_resolve_plan`：解析后 login-and-site-data 的 target 数与顺序随之更新。

## 续做与检查

- 同一工作树 `F:/new/smaltalk/water/.worktrees/w2-a`、分支 `worker/water-w2-a`，从你的回执提交 `3cc09105741341626234d380958af97b69c055a1` 接着做。**不要重跑 baseline。**
- 命令与原票相同：`check`、`test`、`real`；负控 nc1 重做一次（只改生产代码，让保护优先判定失效，失败信息含 `RULES_PRECEDENCE`，`git checkout` 原字节恢复后立即 `test`）；提交干净实现后跑 `check --final`、`test --final`、`real --final`，再 `archive`。
- 改动范围仍只限 `packages/junk-rules/`、本票回执与 `docs/acceptance/wave2/a/`。

## 交回

改写同一份回执，第一行与原票一致：

```text
WATER-W2-A 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w2-a/docs/dispatch/reports/WATER-W2-A-REPORT.md
```

新增“补单 01”一节：续做起点、新实现提交、改了什么、新负控的红绿回执、真实冒烟摘要的变化。受阻仍写“WATER-W2-A 任务受阻”。
