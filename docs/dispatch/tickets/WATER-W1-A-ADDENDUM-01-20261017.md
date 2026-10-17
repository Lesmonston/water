# WATER-W1-A 补充单01：严格限制wire枚举为字符串

总控：Codex。日期：2026-10-17。状态：CHANGES_REQUESTED，等待用户转贴给A执行者。

本单绑定[原工单](WATER-W1-A-CONTRACTS-20261017.md)，仅修复原冻结Schema的实现偏差，不更改契约。主检出manifest为权威；本单优先于原单的首次开工/回执规则，其余原规则继续适用。

| 项 | 唯一值 |
|---|---|
| 权威补充单 | `F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W1-A-ADDENDUM-01-20261017.md` |
| 工作树/分支 | `F:/new/smaltalk/water/.worktrees/a` / `worker/water-w1-a` |
| 原架构基线 | `a1e68364d47e137f8b66543eb95d35bb04424c78`，保持不变 |
| 续做起点 | `475c4703be3c455089b8080b53e084d4721b10f7`，首次接本补单时必须精确等于此SHA且干净 |
| 被审实现提交 | `149109f3e835cec96efb3a8b99419ccff2a18713`，后续提交仅报告/证据 |
| 新回执 | `F:/new/smaltalk/water/.worktrees/a/docs/dispatch/reports/WATER-W1-A-ADDENDUM-01-REPORT.md` |
| 新证据目录 | 本树`docs/acceptance/wave1/a/addendum-01/`，helper仍写原`.local/checks/WATER-W1-A/` |
| 依赖 | 不依赖B/C；二者已有独立执行活动，不修改其树或产物 |

## 1. 已复现的问题

总控对原提交复跑fmt/test/clippy/metadata全部通过，但独立边界检查发现：所有20种wire枚举直接derive Deserialize，接受Serde外部标签对象。冻结Schema要求字符串；其中SchemaVersion使用string+const，其余19种使用string+enum。

最小复现：在`contracts/v1/examples/valid-report.json`中，将`scopes[0].platform`从`"windows"`替换为`{"windows":null}`，或将`schema_version`替换为`{"water.scan.v1":null}`。`parse_report`目前成功，预期必须是`InvalidShape`。这影响协议一致性；不表示已经发生真实文件误删，本票没有清理接口。

总控测试确认：直接Serde入口对20种枚举的93个合法字面值都接受相应对象形式；报告公开入口的20个位置也全部接受。正常报告往返对照通过。见[总控验收报告](../../acceptance/wave1/controller/WATER-W1-A-REVIEW-20261017.md)。

## 2. 必须完成的行为

1. 所有20种公开wire枚举的Deserialize均只接受Schema规定的JSON字符串。包括SchemaVersion、Platform、ScopeOrigin、Coverage、ScanStatus、LocationSource、Category、Risk、Recoverability、Activity、Confidence、ProtectionReason、EvidenceCode、EvidenceSource、SizeMethod、EstimateConfidence、SharedState、ReferenceState、AggregateMethod、IssueCode。不涉及非wire的ContractErrorCode。
2. 所有已有合法字符串与Serialize结果保持不变；拒绝对象、数组、null、bool、数字和未知字符串。通过`parse_report`进入时形状错误统一`InvalidShape`，错误不回显输入；直接Serde入口也拒绝这些非字符串。
3. 修复真实类型的反序列化边界。不能只在parse前增加局部值过滤，不能接受对象后规范化为字符串；保持原始input反序列化、重复键拒绝、必填nullable与现有全部语义。
4. 在现有唯一`contract_v1.rs`内补回归，仍精确五个顶层测试。建议在`raw_json_and_resource_limits`中增加：20种枚举逐字面值的字符串正例/原样往返与对象负例，及所有20处报告位置的对象负例和精确错误码。其他非字符串/未知值也需要测试，辅助函数与循环不限；SchemaVersion的材料是const而非enum数组。不得新开第六测试或改冻结fixture。
5. 原66报告、全部primitive、6 raw、6手造DTO、2资源用例和原有附加边界全部保留执行，不降低断言。

## 3. 权限与续做

先读原票/本补单、AGENTS、工作流、原执行规则、冻结语义/Schema以及总控报告。主检出新增的`scripts/acceptance/`仅作只读参考；**不要运行总控runner、复制它到执行树、merge主线、改helper或冻结锁**。

只允许修改原票范围内的`crates/water-contracts/src/`、现有测试、必要的crate README，以及本单新回执/新证据。不需要改变Cargo清单、锁或工具链，保持原字节；不改旧回执/旧证据，不补写历史。manifest仅新增本单回执白名单，原基线/默认helper/冻结锁/其余权限不变。

首次续做核SHA/干净状态/冻结哈希，不再运行初次baseline、lock或fetch。环境变化导致检查失败时按原规则报告，不安装依赖或改全局配置。没有真实HOME/磁盘扫描、网络调用、外部工具执行、清理、push/发布授权。

## 4. 验证、负控与回执

先新增回归测试，在未修实现上运行原helper的完整test模式，必须至少有一个新增目标断言失败；编译失败不算行为先红。记录case、日志、退出码及源文件哈希。

修复后串行通过原fmt/test/clippy/metadata。新增NC-07有效负控：在真实修复逻辑中临时恢复至少一种对象形式可被接受，运行完整test，确认新增断言失败；按原字节恢复并核对哈希，再跑完整test。不得改测试/fixture/helper来制造失败，也不能以编译失败代替。无需重做原六项历史负控。

提交实现与测试后，在同一干净实现SHA上串行执行：

```powershell
node scripts/worker-check.mjs --task WATER-W1-A --mode fmt --final
node scripts/worker-check.mjs --task WATER-W1-A --mode test --final
node scripts/worker-check.mjs --task WATER-W1-A --mode clippy --final
node scripts/worker-check.mjs --task WATER-W1-A --mode metadata --final
```

回执记录确切受测SHA、初始红/NC-07/恢复的日志与三个哈希、四个最终门receipt、逐类型/报告位置覆盖清单、未验证平台及实际引擎。后加回执/证据提交不得夹带产品或测试改动。保持macOS未验证的事实。

完成通知及新回执第一行：

```text
WATER-W1-A 补充单01 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/a/docs/dispatch/reports/WATER-W1-A-ADDENDUM-01-REPORT.md
```

若起点/权限/契约冲突，原地停止并写本单受阻回执，不重置或覆盖已有变化。完成后停止修改，由总控重新验收；本补单不授权合主线。
