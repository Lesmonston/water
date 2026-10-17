# WATER-W1-A 总控独立验收

日期：2026-10-17。结论：**CHANGES_REQUESTED，未集成。** [补充单01](../../../dispatch/tickets/WATER-W1-A-ADDENDUM-01-20261017.md)已准备，等待用户转贴。B/C不因本问题新增依赖；本次收尾只读观察到各自未提交的实现文件，台账记独立RUNNING，未接到完成通知或验收。

## 受审对象与范围

- 分支`worker/water-w1-a`，工作树`F:/new/smaltalk/water/.worktrees/a`。
- 提交HEAD=`475c4703be3c455089b8080b53e084d4721b10f7`；原基线`a1e68364d47e137f8b66543eb95d35bb04424c78`。
- 实现提交`149109f3e835cec96efb3a8b99419ccff2a18713`；实现至HEAD的Cargo/工具链/crates差异为空。提交回执和当前树均干净。
- 实际差异239文件，均在原票白名单；其中8个工程/源码/测试文件，其余为本票报告与文本证据。9个冻结文件SHA256一致。当前产品文件哈希归档在下列boundary receipt。
- 只审阅并运行本票内存DTO与校验；没有扫描真实用户数据或运行上游项目，没有修改worker源码。

## 通过的独立检查

四门均在提交HEAD开始/结束，工作树保持干净，Rust 1.95.0 / Windows x86_64 MSVC：

| 总控实际命令（A树内执行） | 结果 | 原始receipt |
|---|---|---|
| `node scripts/worker-check.mjs --task WATER-W1-A --mode fmt --final` | 退出0 | [fmt](w1-a-review-20261017/2026-10-17T06-11-38.715Z-33516-fmt-result.json) |
| `node scripts/worker-check.mjs --task WATER-W1-A --mode test --final` | 退出0，5 passed，零ignored/filtered | [test](w1-a-review-20261017/2026-10-17T06-11-43.345Z-25128-test-result.json) |
| `node scripts/worker-check.mjs --task WATER-W1-A --mode clippy --final` | 退出0，warnings视为错误 | [clippy](w1-a-review-20261017/2026-10-17T06-12-14.262Z-39044-clippy-result.json) |
| `node scripts/worker-check.mjs --task WATER-W1-A --mode metadata --final` | 退出0，目标/依赖/来源一致 | [metadata](w1-a-review-20261017/2026-10-17T06-12-17.390Z-23556-metadata-result.json) |

以上receipt及其原始日志从总控本次运行目录逐字节归档。冻结输入校验`verify-contract-assets.mjs`也通过；它本身不验证Rust行为。

三条内部只读审查分别核对语义、wire边界、测试/历史证据，未写文件或运行产品代码。共同发现下述枚举问题；其他指定语义未发现具体缺陷。测试审查核实原冻结66/45/6/6/2输入均消费，六个历史负控替换/坏态哈希/目标断言日志可追溯。历史证据核查不替代上述总控独立复跑。

补单派前另一次只读复核确认：新增回执/证据被helper白名单覆盖，续做SHA和命令可执行，归档四门与A本次原始文件哈希完全一致，最终harness源码哈希与receipt一致。项目文档/来源、冻结输入、runner语法和差异空白检查见[元数据门记录](w1-a-review-20261017/controller-metadata-gates.json)；这些检查不替代产品边界失败。

## 阻止验收的实际缺陷 A-01

位置：worker `crates/water-contracts/src/v1.rs` 第231—243行，`wire_enum!`与`SchemaVersion`使用普通derive Deserialize。锁定serde_json支持单位枚举的外部标签对象，因此报告接受Schema不允许的JSON形状。

最小输入变更：有效fixture的`/scopes/0/platform`改为`{"windows":null}`。实际parse成功，预期`InvalidShape`。`/schema_version`改为`{"water.scan.v1":null}`同样成功。语义校验看到的是已经解析的正常枚举，无法恢复原wire形状。

总控独立检查使用[合成测试源码](../../../../scripts/acceptance/contract-wire-boundaries.rs)，以精确rustc链接四门刚编译出的原A库及其锁定依赖，无产品副本或修改。通过[验收runner](../../../../scripts/acceptance/review-contract-wire.mjs)记录编译/执行命令、依赖rlib与产品文件哈希、前后HEAD/干净状态：

```powershell
node scripts/acceptance/review-contract-wire.mjs --expected-head 475c4703be3c455089b8080b53e084d4721b10f7
```

有效最终运行：[boundary receipt](w1-a-review-20261017/2026-10-17T06-14-22.738Z-8960-boundary-result.json)。编译成功；真实测试执行退出101，总控runner退出1；3个测试均执行，1 passed / 2 failed / 零ignored或filtered。

- 正常报告完整DTO往返通过，证明库已链接且正例可用。
- 20种wire枚举的93种合法字符串均正常往返，但相应93种对象写法也全部错误接受；失败于目标断言`93 non-string enum values accepted`。
- 同一合法partial报告上，20处枚举位置逐一替换为对象，全部被`parse_report`错误接受；失败于目标断言`20 report enum objects accepted or misclassified`。覆盖根/Scope/Tool/Finding/Evidence/Reason/Reference/Size/Totals/Issue。

首次总控harness运行亦保留[原记录](w1-a-review-20261017/2026-10-17T06-13-50.077Z-5316-boundary-result.json)：其中枚举类型测试将SchemaVersion的const误作enum数组，发生harness unwrap；该失败不算产品缺陷证据。修正总控harness后重跑得到以上两个真实目标断言失败。第一次报告入口测试已经复现20处接受。worker从未因这些检查被编辑。

影响是协议边界不一致，尚无证据表明分类保护语义可被绕过，更没有真实清理行为。要求修复全部公开枚举的Deserialize并补齐回归；不放宽Schema、不更改冻结用例或依赖。

## 交接与限制

按人工外贴流程回派实质修复。原A提交及其报告保留；main没有合入A产品代码，总控没有代修。补单扩大白名单仅用于新增补单回执；原基线、9项冻结锁、helper与B/C范围不变。

macOS尚未运行；扫描器、分类器接线、文件身份/竞态/权限、容量去重、清理与恢复均不在此次验收范围。此结论不等于产品可发布或Windows/macOS应用已经完成。
