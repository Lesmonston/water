# WATER-W1-F：受控夹具只读元数据扫描

总控：Codex。2026-10-17。正式状态以主检出manifest为准；READY仅表示可外贴，用户未确认转贴前不记RUNNING。前置A/D已VERIFIED（Windows范围）。本票为独立实验库，不代表M1完成。

| 项 | 唯一值 |
|---|---|
| 权威票 | `F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W1-F-SCAN-LAB-20261017.md` |
| 唯一工作树 / 分支 | `F:/new/smaltalk/water/.worktrees/f` / `worker/water-w1-f` |
| 精确基线 | `fc114eb81125cef7d374deddc95144bcd9aee748` |
| 快照tag | `water-w1-scan-lab-base-20261017` |
| 权威manifest | `F:/new/smaltalk/water/docs/dispatch/wave1/manifest.json` |
| 冻结协议 | `contracts/scan-lab-v1/`，22项freeze.lock.json；同时核对四份旧锁覆盖的43个唯一文件 |
| helper / 纪律 | `scripts/scan-lab-check.mjs` / `docs/dispatch/W1-SCAN-LAB-WORKER-RULES.md` |
| 回执 | `F:/new/smaltalk/water/.worktrees/f/docs/dispatch/reports/WATER-W1-F-REPORT.md` |
| 证据 | 本树`docs/acceptance/wave1/f/`；原始日志`.local/checks/WATER-W1-F/` |
| 私有构建目录 | 本树`.local/scan-lab-cargo-home`、`.local/scan-lab-target`、`.local/scan-lab-tmp` |

## 开工与权限

先读主检出README/STATUS/AGENTS/CONTROLLER-WORKFLOW、本票、F纪律、ADR-006、scan-lab-v1全部材料、fixture-lab-v1的SPEC/cases、A的SEMANTICS及平台静态核对。执行树基线早于本票和登记，旧STATUS不是当前派单实况；从主检出读取权威票面即可，不merge主线取票、不复制主线台账或修改旧文档。

核对绝对路径、分支、精确HEAD、初始干净、依赖和冻结。父目录`docs/dispatch/reports/`已存在。任何不符保留现场交受阻回执，不切树/重置/覆盖。首次运行：

```powershell
node scripts/scan-lab-check.mjs --task WATER-W1-F --mode baseline
```

baseline仅核分配/锁、Node24/Rust1.95/MSVC、根A metadata与Windows身份API不稳定编译证据，不是F测试。helper从已验收A树`.local/cargo-home/registry`复制现有锁定缓存到本树私有Cargo home；仅此缓存源可读，不读取其它文件或凭证，不fetch/安装/改全局配置。

本票仅允许遍历冻结prepare工具在本树`.local/fixture-lab/run-*`新建的合成夹具及其scope。生产库只读元数据和有界marker，不读普通文件内容；Rust测试只读控制index、冻结材料和所选run。只有冻结prepare工具可新建物理文件/链接，禁止手造/改写marker、ACL、移动、删除或清理。既有active index可复用；必要时可通过fixtures模式另建一批，旧run和历史index保留，每批最多24个逻辑run、1MiB内容。不要反复造批次。

禁止HOME/整盘/真实用户目录扫描、执行上游/项目命令、任意路径API、shell入口、网络上传、UI/IPC、分类、ScanReport/Finding组装、E接线、导出、汇总回收量或删除。根防线仅覆盖无恶意并发修改的合成实验，不冒充生产竞态安全。Windows identity恒Unknown，macOS只有设计及源码依据，未实测就明确未验证。

## 实现与文件范围

按SPEC实现`water_scan::fixture_v1`：私有run/token，严格原文marker校验，真正装配NativeIo/NoopObserver的公开入口，no-follow遍历、平台元数据事实、排序/深度/全局条目及目录批次预算、共享取消token、覆盖/来源明确的issue。不得从marker.nodes或matrix拼出磁盘结果，不在生产代码按case_id制造故障/取消。

唯一允许新建/修改：

- `packages/fixture-scan/Cargo.toml`、`Cargo.lock`、`README.md`。
- `packages/fixture-scan/src/`内Rust实现。
- `packages/fixture-scan/tests/scan_v1.rs`，精确六个顶层测试。
- 本票REPORT及`docs/acceptance/wave1/f/`内文本/JSON证据；已冻结.gitattributes不可改。

package water-scan 0.1.0/lib water_scan，独立[workspace] resolver3、edition2024、Rust1.95、publish=false，四auto项false；只有lib及scan_v1测试目标，无bin/example/bench/build。仅依赖本地A、serde =1.0.229（derive）及serde_json =1.0.151，沿用根锁registry来源/版本/checksum。禁止unsafe、新包、nightly、替代同名本地依赖、改根Cargo、A–E、D工厂、旧helper/冻结或upstream。

## 定向验证

总控派前已运行fixtures模式并留下active index；产品尚不存在。实现前如index丢失，才运行下列fixtures模式。准备可编译骨架、manifest及唯一测试文件，再离线生成自有锁。每次只运行一个门：

```powershell
node scripts/scan-lab-check.mjs --task WATER-W1-F --mode fixtures
node scripts/scan-lab-check.mjs --task WATER-W1-F --mode lock
node scripts/scan-lab-check.mjs --task WATER-W1-F --mode fmt
node scripts/scan-lab-check.mjs --task WATER-W1-F --mode test
node scripts/scan-lab-check.mjs --task WATER-W1-F --mode clippy
node scripts/scan-lab-check.mjs --task WATER-W1-F --mode metadata
node scripts/scan-lab-check.mjs --task WATER-W1-F --mode bridge
```

精确六测试：`scan_native_fixtures`、`scan_scope_and_links`、`scan_budgets_and_order`、`scan_faults_and_coverage`、`scan_cancellation`、`scan_identity_and_readonly`。11个D case/12个scope，所有链接支持时native共39条entry；permission/cancel受控注入后的36条单独在测试核对，unsupported按实际能力扣减，不能skip整测试。六个marker/根负例与非法options/run_id见negative-inputs。

测试须断言边界对象/链接目标IO调用数0、预算前停止、排序与精确coverage/issue、共享token效果。故障包装器只写在测试中并委托NativeIo；目录批次故障注入只证明错误传播，NativeIo原生ReadDir逐项Result处理须源码复核，真实ACL/迭代故障仍未实测。snapshot未变只证明内容没变，不能证明从未读取；结合IO trace及生产源码审阅。

bridge构建真实F库，以冻结Rust程序调用open/scan_fixture，Node逐项核对实际native facts与快照。不得以expected JSON替代实际输出。Cargo jobs=1、单命令180秒、离线、单测试线程；无整仓/coverage/watch，不放宽门槛。helper是定向纪律检查，不是OS沙箱。

## 行为红、四负控与交付

先留下编译成功后的真实行为红；缺文件/编译失败不算。按SPEC做四个有效负控：①NativeIo误标链接为目录（保留独立read_dir链接/祖先拒绝）；②全局预算多访问一项；③真实CancelToken忽略取消；④PermissionDenied当空目录成功。每项运行完整六测试，目标断言失败才有效；记录原/坏/恢复逐文件三hash及原始日志。原字节恢复、确保源mtime更新后完整六测试绿，不能只靠旧缓存、改测试造红或清理现场。

提交实现/测试及首轮证据，在同一干净实现SHA串行完成：

```powershell
node scripts/scan-lab-check.mjs --task WATER-W1-F --mode fmt --final
node scripts/scan-lab-check.mjs --task WATER-W1-F --mode test --final
node scripts/scan-lab-check.mjs --task WATER-W1-F --mode clippy --final
node scripts/scan-lab-check.mjs --task WATER-W1-F --mode metadata --final
node scripts/scan-lab-check.mjs --task WATER-W1-F --mode bridge --final
```

后加报告/日志提交仅含文档/原字节证据，不夹带未复测的产品/测试变化。REPORT写受测完整SHA、逐项需求、五final receipt、native实际数量/unsupported、全部失败、行为红/四负控/恢复、marker/内容读取审阅、越界申请、未验证平台与实际模型。日志原字节复制；.log用git add -f显式点名，禁批量add。

无push/merge/rebase/清理/发布权限；不改global。如缺Git身份，只用单命令Water Worker (external)/water-worker@localhost并禁hooks/签名。可用只读辅助且记回执，不再分派实现子代理。完成或受阻后保留现场、提交本分支、停止修改，由总控验收。

报告第一行及完成通知：

```text
WATER-W1-F 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/f/docs/dispatch/reports/WATER-W1-F-REPORT.md
```

受阻改“任务受阻”，列出具体冲突和最小补充需求，不向用户申请扩大权限。
