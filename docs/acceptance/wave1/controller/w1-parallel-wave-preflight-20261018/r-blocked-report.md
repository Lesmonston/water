WATER-W1-R 任务受阻，任务报告在 F:/new/smaltalk/water/.worktrees/r/docs/dispatch/reports/WATER-W1-R-REPORT.md

# R 执行回执：冻结报告语义冲突

日期：2026-10-18。执行状态：BLOCKED，等待总控编号补充单。本报告不代表产品实现、SUBMITTED 完成或总控验收通过；主线 manifest/registry 未修改。

## 执行身份和初始核对

- 执行器：OpenAI Codex；会话开发者配置说明为基于 GPT-6，未提供更细的可核验模型版本。未调用子代理或其它实现者。
- 权威工单：`F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W1-R-NATIVE-SCAN-20261018.md`。权威 manifest 中本票 READY、baselineStatus PASSED。
- 唯一执行树：`F:/new/smaltalk/water/.worktrees/r`；分支：`worker/water-w1-r`。
- 初始及 baseline 前后 HEAD：`dd09c3b8801b86a0059f3fb73fe8a250acb1d89e`，与票面精确基线相同；初始与 baseline 后 Git 状态为空。
- `packages/native-scan` 初始不存在，当前仍未创建；没有产品实现提交或 R 受测 SHA。此处基线 SHA 不能视作 R 实现 SHA。
- 已读取主检出接手材料、权威票/manifest、ADR-012、本批纪律、SPEC/TESTS.json/SOURCES/decoder-cases、N/P/Q API、A 校验语义、冻结桥接与夹具索引。执行树早于正式票，未 merge 获取主线材料。
- 冻结工具 baseline 校验通过；另以纯文件哈希审计记录 61 个新锁条目、十旧锁 227 个唯一文件，合计 255 个唯一冻结文件，详见证据目录 `freeze-audit.json`。

## 阻断 R-001：固定保护原因与 A 祖先保护不兼容

这是冻结契约与已验收依赖的静态语义冲突，尚未执行 R 产品测试，不把以下推导写成实测失败。

1. 基线 `contracts/native-scan-v1/SPEC.md:74` 要求每个 entry 对应一个 finding，路径保持一致，全部 `risk=protected`，且 `protection_reasons` **固定为 `[unknown_ownership,incomplete_evidence]`**。
2. 同文件 `:76` 要求返回前真实调用 `A.validate_report`，默认输出真实调用 `Q.redact_report`；Q 本身也先真实调用 A 校验。
3. 冻结夹具 `scripts/prepare-native-walk-fixtures.mjs:10` 与本次 baseline 保存的 index 同时要求 `dir`、`dir/inner.txt`。前序顺序分别为第三和第四个 finding。冻结 `scripts/acceptance/native-scan-bridge.rs:9` 要求完整八条目，`:10` 保持相对路径；`:11` 明确再次校验真实 A 和 Q。
4. 实际 `crates/water-contracts/src/v1.rs:749` 的 `validate_ancestor_protection` 在 `:769`–`:786` 判断相同 scope 下是否存在受保护后代；存在时祖先 finding 必须包含 `ProtectionReason::ProtectedDescendant`，否则返回 `UnsafeClassification`，字段为 `/findings/{index}/protection_reasons`。`validate_report` 在 `:572` 调用此校验。
5. 因此完整八条目中 `dir` 的 findings 索引为 2，后代 `dir/inner.txt` 必须受保护；固定两项原因必然缺少 `protected_descendant`。按源码推导，真实 A 将返回 `UnsafeClassification at /findings/2/protection_reasons`。

保留两项原因无法通过 A；追加第三项违反 R 的固定 wire 语义。丢弃/改名后代、合并 findings、降低后代保护、跳过 A 或复制 Q 算法均违反本票要求。A、SPEC、锁、helper 和 bridge 也全部不在执行者修改白名单。

停止依据为主检出 `docs/CONTROLLER-WORKFLOW.md:19`：

> 若这些材料冲突，执行者不自行选一个继续：写明具体冲突交总控修订。

## 最小补充需求（建议，未实施）

请总控发绑定原票和精确基线的编号补充单，明确祖先 finding 的保护原因规则：保留基础两项，若在已记录 findings 中存在相同 scope 下的受保护后代，则按确定顺序追加 `protected_descendant`，其它 finding 仍为基础两项。由总控同步所有受影响的票面、SPEC、冻结 hash/manifest 及验收断言，并说明本树从该基线继续的授权方式。

建议配套对照：完整八项中 `dir` 有第三项；深度 1 没有记录 `dir/inner.txt` 时 `dir` 仅有基础两项；所有成功/partial/cancelled 报告仍通过真实 A，Q 继续委托真实入口。此建议不代表已获得契约变更授权或已通过测试。

## 已执行验证与证据

唯一运行的产品检查工具命令：

```powershell
node scripts/native-scan-check.mjs --task WATER-W1-R --mode baseline
```

- 退出码 0；开始 `2026-10-18T14:08:18.049Z`，结束 `2026-10-18T14:08:28.616Z`。
- Node `v24.16.0`、Windows x64、冻结工具要求的 Rust 1.95/MSVC/私有离线图通过。
- 真实 P/N/A 根绑定、Nt 父句柄相对打开、硬链接 ID 相同、14 字节逻辑长度、junction 本身不跟随、一层 7 个名称通过。
- 已验收 Q/A/H 桥接：24 报告、9 原始错误通过；这是既有 Q 能力，非新 R 验收。
- 复用本 r 树既有固定 fixture/index。index SHA-256：`584cd6c6c0ddbd913877b3e30aea9c88aa54e090dc6ad956a07f597be4728931`。仅冻结 prepare 有界检查结构/合成 payload；Rust 探针不读普通 payload、不递归，未手工改造/清理夹具。
- 本次 helper 产生的全部 json/log/txt 原字节归档在 `docs/acceptance/wave1/r/blocked-r001/baseline/`，来源和逐文件 SHA-256 记录在同级 `ARCHIVE.json`。
- `contract-conflict.json` 提供纯内存两 finding 输入和基于源码的预期错误，供总控复核；未执行该用例，没有把预期当运行结果。
- 探索性读取曾误用不存在的 `TESTS.md`、`src/types.rs` 和 `scripts/lib`；随后定位实际 `TESTS.json`、`src/v1.rs` 和平铺脚本。未更改文件或检查工具，无失败的产品门。

## 尚未执行、未验证与剩余工作

由于 R-001，未创建产品目录/可编译骨架/五测试，未执行 lock/fmt/test/suite/clippy/metadata/bridge、red-behavior 或 red-nc1/2/3，也没有四条红/恢复链及生产原/坏/恢复哈希；这些均为未执行，不是跳过后判通过。

全部 native R 实现、P 生命周期 guard、递归预算/取消、decoder/名称验证、A/Q 纵向链路、unsafe 审阅和生产错误分支均待补充单后实施。原生用户确认/选择器、真实用户 scope、其它 Windows/文件系统、生产竞态、重命名后永久包含、macOS、桌面保存/上传和删除仍未验收，M1 未完成。

本次仅新增本报告及 r 证据目录，所有产品、根 Cargo、冻结材料/helper、上游、其它树、旧现场与主线台账保持。证据/报告提交在本分支，不 merge/push；交回后停止修改。
