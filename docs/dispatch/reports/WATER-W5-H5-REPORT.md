WATER-W5-H5 任务受阻，任务报告在 F:/new/smaltalk/water/.worktrees/w5-h5/docs/dispatch/reports/WATER-W5-H5-REPORT.md

日期：2026-10-27。实际模型：Codex（GPT-6；本会话未提供更细型号）。

工作树：F:/new/smaltalk/water/.worktrees/w5-h5；分支：worker/water-w5-h5。
首次 HEAD：3f9078972d7f958fad6bfd42e68f022dd659539e；初次检查时工作树干净，路径、分支、基线均与正式票一致。
实现提交 SHA：无，尚未修改产品或测试。本次交回只有受阻回执和检查器 archive 生成的基线证据。
首次提交回执时 git commit 因 Author identity unknown 失败（工具退出码 1，未创建提交）。回执提交使用仅在该命令进程内生效的 GIT_AUTHOR_NAME / GIT_COMMITTER_NAME=Codex、GIT_AUTHOR_EMAIL / GIT_COMMITTER_EMAIL=codex@localhost；不写入任何 Git 配置，也不借用人类作者身份。

## 阻塞：新增规则所需的两个数量调整未获票面授权

权威票 docs/dispatch/tickets/WATER-W5-H5-RULES-M2-20261027.md 第 45 行规定：“原有标记与断言不变。”同票与 RULES-M2 第 1、3 节又要求新增 rust-build-dirs，并将它加入种子表和解析计划。

基线测试存在两个固定数量断言：

| 位置 | 原断言 | 加入新规则后的必要期望值 |
|---|---|---|
| packages/junk-rules/tests/rules_v1.rs:563，rules_protection_precedence | assert_eq!(embedded.rules().len(), 60, "seed set must load"); | 61 |
| packages/junk-rules/tests/rules_v1.rs:582，rules_resolve_plan | assert_eq!(expected, 214); | 216 |

只读解析现有 windows.json，得到 60 条规则；按现有 expected_target_count 的算法、为该测试的两个 custom root 计算，得到 214 个目标。新增规则只有一个 marker 定位器；src/plan.rs:163–179 对每个 custom root 生成一个目标，因此将增加 1 条规则、2 个目标。

以上是静态核对与内存复算，没有修改文件来制造失败，也没有运行产品测试；不将这一推导冒称为已发生的测试失败。保持旧断言原样会与新增规则后的结果冲突；自行更新数量则违反票面“原有标记与断言不变”。未通过删减规则、缩小测试输入或调整计数算法绕过冲突。

按 docs/dispatch/W5-M2-WORKER-RULES.md 第 40 行的“契约冲突或缺东西时写受阻回执，不要自行变通”，以及 docs/CONTROLLER-WORKFLOW.md 第 2 节，停止实现并交回总控处理。

## 最小补充需求

请总控在编号补充单中明确授权仅将上述两处旧数量断言的期望值分别由 60 改为 61、214 改为 216，并同步权威票面/manifest 的相关约束。四个测试名、原有标记、其余规则的断言与全部行为约束继续保留；新增断言仍按 SPEC 使用 RULES_RUST_BUILD。

没有申请变更扫描器、规则校验器、规则格式版本、依赖或检查脚本，也未自行编辑契约与台账。

## 已执行的指定检查

全部在上述工作树根目录执行。

1. node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W5-H5 --mode baseline
   - 退出码 0，status=passed；before/after 均为精确首次 HEAD、工作树干净；offlineCache=complete。
   - productTestsRun=false，realDataRead=false；真实位置仅由基线入口核对已知目录是否存在。
   - 回执：.local/checks/WATER-W5-H5/2026-10-27T13-34-48.928Z-17628-baseline-result.json。
   - SHA-256：c90f76533af5e9574aa4b0c1646f0797b6e8f3a2d000dd4d1fa9560dc7a22f5d。
2. node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W5-H5 --mode archive
   - 退出码 0，status=passed；共归档 8 份文件、9469 字节，不是完整验收证据。
   - 其中 4 份是本次 13:34:48 UTC 的基线回执与工具日志；另外 4 份是开工前该树 .local 中已有的 13:11:34 UTC 总控派前基线回执与日志，时间戳与 manifest.baselineEvidence 对应。这组旧记录是检查器按原字节一并复制的继承证据，不计作本执行者额外运行的检查。
   - 已逐项核对 8 份归档文件与索引、原 .local 文件的 SHA-256 一致。继承的派前回执也是 baseline/passed、productTestsRun=false、realDataRead=false。
   - 索引：[ARCHIVE.json](../../acceptance/wave5/h5/ARCHIVE.json)。基线原字节回执在该索引对应的 receipts/ 下。
   - archive 自身的回执：.local/checks/WATER-W5-H5/2026-10-27T13-38-27.210Z-12744-archive-result.json；它在本次复制结束后生成，未冒称已进入本次归档索引。

未运行 lock、check、test、red-nc1、check --final、test --final、real --final。没有负控失败记录或恢复哈希；没有将正常基线通过写成产品验收通过。

## 来源核对与未改动的文件

已于 2026-10-27 只读访问 [Cargo 官方 Build cache 文档](https://doc.rust-lang.org/cargo/reference/build-cache.html)，核对网址与标题，并确认文档说明默认 target 目录、CARGO_TARGET_DIR / build.target-dir / --target-dir 可配置构建产物位置。这里的日期是本次访问日期，不是页面发布日期。页面未承诺 .rustc_info.json 标记或其大小界限；这部分依据仍仅为 SPEC 所载总控本机观察，不冒称本执行者重新扫描或获得了官方标记格式保证。没有下载依赖、安装程序或其它产物。

SPEC 要求的 local_observation 原文已核对：“2026-10-27 总控本机只读核查：Water 各工作树的 CARGO_TARGET_DIR 构建目录根下都有 .rustc_info.json”。尚未写入规则包。

两份产品/测试文件仍保持开工原字节（SHA-256）：

- packages/junk-rules/rules/windows.json：fc732242de91403c1932736e5f39bc4417898e86985dad5f461d0fa8197f7e53。
- packages/junk-rules/tests/rules_v1.rs：3b083489b918f782b1f64cacb1fa570871a76fe7acfebfd3ffc1952c66f08be8。

新规则、测试新增断言、有效负控及三个 final 均未完成；没有实现提交和新规则完整 JSON 交付。没有验证 Rust 构建目录的实际扫描命中、规则重叠的运行结果、应用内清理、自清理里程碑或 macOS。原生窗口 0、选择框 0、浏览器窗口 0；未建删除夹具，未删除真实数据。未启动子代理或后台测试进程；未修改远端/配置，未 push、merge、rebase 或改写已有提交。
