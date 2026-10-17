WATER-W1-D 补充单01 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/d/docs/dispatch/reports/WATER-W1-D-ADDENDUM-01-REPORT.md

# WATER-W1-D 补充单01 回执

执行者只提交本分支。受测实现 SHA 是 `ff99fb2aae6e1edec84f818415167d821940af26`。本报告和 `docs/acceptance/wave1/d/addendum-01/` 是其后的纯记录，不改变产品文件。总控尚未复验。

## 范围

| 项 | 值 |
|---|---|
| 工作树 / 分支 | `F:/new/smaltalk/water/.worktrees/d` / `worker/water-w1-d` |
| 原基线 | `7007c65d5845c3fe5938d920e930c8bcb7ffc4e0`，未改 |
| 续做起点 | `b92d5b8dff8802d1e403e59c08eb1cd4fb175f5f`，开工时干净 |
| 原受测实现 | `58fc5973a1d68555bbd41fdf4c6d2990cbff870d` |
| 本单受测实现 | `ff99fb2aae6e1edec84f818415167d821940af26` |
| 引擎 | Cursor 中的 Grok 4.7，外部执行者自报 |
| Git 身份 | 仍无 global 身份。一次性 `Water Worker (external) <water-worker@localhost>`，`core.hooksPath=NUL`，未签名。未 push/merge |

开工核对 8 项冻结哈希一致。未重跑 baseline/probe，未改 helper、锁、旧回执、旧证据或 `.gitattributes`。

产品 SHA256：

- materialize.mjs `55b89260532c4b6434b8c9114d4ba9de69c9a9a013118b76fe0b55dee981830e`
- materialize.test.mjs `7809160ab89f78d5c20eecfe44b2696ac3172871a76707593475813ff2832529`
- README.md `7efb0e693bbaa8db50011176fd59185e0fd67cbca4d0557221e93f9d323d8fed`

## 修复

`canonicalIndex` 只接受规范十进制、能按原字符串往返、且满足 `0 <= index < 4294967295` 与 `index < length` 的键。`4294967295`、`9007199254740992` 和更长的数字串都不是这种索引。它们在数组本身上报 `shape`，路径不包含键或值，也不读取 getter。稀疏数组、访问器、自定义原型和其他未知属性仍拒绝。物化 API、marker、链接、故障计划和写入边界未改。

## 18 回归与先红

仍是原来五个顶层测试。`fixture_manifest_and_cases` 对六类数组各加三个非索引键，共 18 例：`/cases`、`/cases/0/nodes`、`/cases/0/scopes`、`/cases/0/canaries`、`/cases/0/scanner_plan/faults`、`/cases/0/scanner_plan/expected_issue_codes`，键为 `4294967295`、`9007199254740992`、`999999999999999999999999999999`。每例要求 invalid，且 errors 含 `{code:"shape", path:该数组}`。正例仍校验完整冻结清单。原 18 个冻结负例、逐层缺字段/未知键、深冻结和纯度断言都保留。这些变体只进纯校验，没有物化。

未修实现上的完整 test（2026-10-17T11:28:14Z，exit 1）在测试第 235 行得到 AssertionError：`/cases 4294967295` 实际 `valid: true`。其余四测试通过。不是缺文件、语法错误或超时。证据：`red-test.log`。

## NC-04

只把 `canonicalIndex` 的范围判断改成 `value >= 0`，撤掉 `< 4294967295` 和 `< length`。坏 SHA256 `63e5f59c3204c52883bcdf7f04f573f6ca4363d1317de65b2654a6b6d3fdfdf1`。完整 test exit 1，同一条新增断言失败：`/cases 4294967295` 被接受。其余四测试通过。没有物化这 18 个非法清单。证据：`nc-04-test.log`。

原字节恢复后 SHA256 回到 `55b89260532c4b6434b8c9114d4ba9de69c9a9a013118b76fe0b55dee981830e`。完整 test exit 0，见 `nc-04-restore-test-result.json`。未重做原 NC-01/02/03。

## 最终门

同一干净 SHA `ff99fb2aae6e1edec84f818415167d821940af26` 上串行：

| 命令 | 结果 | receipt |
|---|---|---|
| `node scripts/fixture-check.mjs --task WATER-W1-D --mode check --final` | exit 0，两个 `--check` 均为 0 | `final-check-result.json` |
| `node scripts/fixture-check.mjs --task WATER-W1-D --mode test --final` | exit 0；TAP tests 5、pass 5、fail 0、skipped 0、cancelled 0、todo 0 | `final-test.log` |

没有其他失败尝试。超时和 helper 未改。历史 run 仍留在本树 `.local`，未清理。macOS 未运行。Node v24.16.0，平台 win32。
