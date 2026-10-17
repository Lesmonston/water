WATER-W1-A 补充单01 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/a/docs/dispatch/reports/WATER-W1-A-ADDENDUM-01-REPORT.md

## 交付定位

- 票号：WATER-W1-A 补充单01。无越界申请，无阻塞。
- 权威补充单：`F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W1-A-ADDENDUM-01-20261017.md`。
- 工作树：`F:/new/smaltalk/water/.worktrees/a`；分支：`worker/water-w1-a`。
- 架构基线：`a1e68364d47e137f8b66543eb95d35bb04424c78`，未改。续做起点核对为 `475c4703be3c455089b8080b53e084d4721b10f7`，分支正确，工作树干净，9 项冻结文件 SHA256 与主检出锁一致。未重跑 baseline、lock 或 fetch。
- 实际受测实现提交：`e25564f941f10295b1f90ce565b070149ec53302`。四项 `--final` 门都在该提交上开始和结束，前后工作树干净。
- 本提交之后的回执提交只含本报告和 `docs/acceptance/wave1/a/addendum-01/`。旧回执、旧证据、Cargo 清单、锁、工具链、helper 和冻结锁未改。
- 执行引擎：Grok 4.7（Cursor）。单一执行者完成本单，未启动实现子代理。
- 本报告只表示执行者交付，等待总控重新验收。未合入 main，未 push，未发布。

## 修复

20 种公开 wire 枚举不再派生 `Deserialize`。`deserialize_wire_string` 只读取 JSON 字符串，再按 Schema 字面值匹配。`SchemaVersion` 的材料是 const `water.scan.v1`；其余 19 种使用各自的字符串枚举。序列化仍输出原来的 snake_case 字符串，`SchemaVersion` 仍输出 `water.scan.v1`。

对象、数组、null、bool、数字和未知字符串在直接 Serde 入口失败。`parse_report` 仍从原始 input 反序列化，形状错误映射为 `InvalidShape`，Display 只有错误码和字段位置，不回显输入。重复键拒绝、必填 nullable 和原有语义校验没有改路径。非 wire 的 `ContractErrorCode` 未改。

回归加在现有 `raw_json_and_resource_limits` 末尾，顶层测试仍是原来五个。冻结 fixture 未改。

## 覆盖

直接入口按冻结 Schema 检查 20 种类型、93 个合法字面值：字符串接受且原样往返，`{"字面值": null}` 拒绝。每种另拒绝非 null 对象、数组、单元素数组、null、true、false、0、-1 和未知字符串 `DO_NOT_ECHO_CANARY_7f98`。`SchemaVersion` 读取 const，不读取 enum 数组。

| 类型 | 字面值数 | 报告位置 |
|---|---:|---|
| SchemaVersion | 1 | `/schema_version` |
| ScanStatus | 3 | `/status` |
| Platform | 2 | `/scopes/0/platform` |
| ScopeOrigin | 2 | `/scopes/0/origin` |
| Coverage | 3 | `/scopes/0/coverage` |
| LocationSource | 5 | `/findings/0/tool/root_source` |
| Category | 11 | `/findings/0/category` |
| Risk | 4 | `/findings/0/risk` |
| Recoverability | 5 | `/findings/0/recoverability` |
| Activity | 4 | `/findings/0/activity` |
| Confidence | 4 | `/findings/0/confidence` |
| EvidenceCode | 8 | `/findings/0/evidence/0/code` |
| EvidenceSource | 5 | `/findings/0/evidence/0/source` |
| ProtectionReason | 10 | `/findings/0/protection_reasons/0` |
| ReferenceState | 3 | `/findings/0/references/state` |
| SizeMethod | 4 | `/findings/0/size/method` |
| EstimateConfidence | 3 | `/findings/0/size/confidence` |
| SharedState | 3 | `/findings/0/size/shared` |
| AggregateMethod | 3 | `/totals/method` |
| IssueCode | 10 | `/issues/0/code` |

报告负例先把冻结基线收成语义有效的 partial 报告，再逐位置替换。20 处对象都要求 `InvalidShape`，且 Display 不含该字面值或 canary。同一 20 处还检查数组、null、bool、数字、未知字符串和 canary 对象。

原 66 个报告、全部 primitive、6 个 raw、6 个手造 DTO、2 个资源用例，以及原有 canary、8 MiB 边界和 8 处对象位置断言都保留并执行。

## 先红与 NC-07

先红时只改了测试，`v1.rs` 仍是未修复字节 `f39ea8d8619f05030a0c6cc33e85ba17142061f9352552199ac832596a9bfa72`。当时测试文件 SHA256 为 `ab68510a90c745556b81becfeec3668540f5cdcc7432c4081969620136948f9e`。完整 test 模式编译成功，前四个测试通过，`raw_json_and_resource_limits` 在新增断言失败：93 个直接对象和 20 处报告对象被接受，共 113 条。其他非字符串没有被接受。汇总 4 passed / 1 failed，Cargo 退出 101，helper 退出 1。日志目录 `logs/2026-10-17T09-44-27.733Z-21964-*`。

随后 rustfmt 只调整测试换行。第一次 fmt 退出 1；按 diff 改格式后 fmt 退出 0。这次格式失败不是行为先红。提交的测试文件 SHA256 为 `1686b7cdf2899414f5aee6b30508deecc32a5ca03764a702d6134b269b748f73`。

NC-07 只改 `deserialize_wire_string`：临时用 `deserialize_any` 的 `visit_map` 接受单键且值为 null 的对象，并把它当作对应字符串。未改测试、fixture 或 helper。坏态完整 test 再次出现上述 113 条对象接受，4 passed / 1 failed，Cargo 101，helper 1。三个 `v1.rs` SHA256：

| 状态 | SHA256 |
|---|---|
| 修改前 | `4dc7f33d9423bdeeb2b2980c779054f04ff495142317c84e6e0fa2b2c7aaaf6d` |
| 坏态 | `17049e56759e3ddc04a8998f5059c9f24c951c4fa2f73188a9d377c1827ad3c9` |
| 恢复后 | `4dc7f33d9423bdeeb2b2980c779054f04ff495142317c84e6e0fa2b2c7aaaf6d` |

坏态日志是 `logs/2026-10-17T09-48-55.168Z-10104-*`。恢复使用保存的原字节覆盖该文件，哈希与修改前一致。第一次恢复后的 test（`logs/2026-10-17T09-49-38.558Z-27340-*`）仍报同样 113 条失败，因为复制保留了更早的 mtime，Cargo 在 0.06 秒内复用了坏态产物，没有重编。该次不能充当负控，也不能充当恢复通过。只更新 mtime、字节和哈希不变后重跑，5 passed、0 failed/ignored/measured/filtered，helper 退出 0。有效恢复日志是 `logs/2026-10-17T09-50-18.613Z-8628-*`。未重做原六项历史负控。

## 命令与最终门

修复后的开发门在脏树上串行通过，HEAD 仍是续做起点：fmt `2026-10-17T09-46-22.478Z-18520`、test `2026-10-17T09-46-42.086Z-12540`（5 passed）、clippy `2026-10-17T09-47-05.963Z-37552`、metadata `2026-10-17T09-47-26.765Z-28092`。这些不是最终门。

最终门在实现提交 `e25564f941f10295b1f90ce565b070149ec53302` 上串行执行，前后干净且 SHA 不变：

| 命令 | 结果 | receipt |
|---|---|---|
| `node scripts/worker-check.mjs --task WATER-W1-A --mode fmt --final` | 退出 0 | `logs/2026-10-17T09-51-15.956Z-22568-fmt-result.json` |
| `node scripts/worker-check.mjs --task WATER-W1-A --mode test --final` | 退出 0，5 passed，0 failed/ignored/measured/filtered | `logs/2026-10-17T09-51-33.159Z-29184-test-result.json` |
| `node scripts/worker-check.mjs --task WATER-W1-A --mode clippy --final` | 退出 0 | `logs/2026-10-17T09-51-48.812Z-12248-clippy-result.json` |
| `node scripts/worker-check.mjs --task WATER-W1-A --mode metadata --final` | 退出 0 | `logs/2026-10-17T09-52-08.473Z-34096-metadata-result.json` |

引擎与版本：`rustc 1.95.0 (59807616e 2026-04-14)`，`cargo 1.95.0 (f2d3ce0bd 2026-03-21)`，Windows x86_64 MSVC。依赖仍是 serde `=1.0.229` 与 serde_json `=1.0.151`。哈希汇总见 [hashes.json](../../acceptance/wave1/a/addendum-01/hashes.json)。

## 限制

macOS 未运行。本单没有扫描、删除、真实用户数据或网络调用。产品仍只做内存中的契约解析和校验。本结果不是总控验收，也不是已集成或可发布。
