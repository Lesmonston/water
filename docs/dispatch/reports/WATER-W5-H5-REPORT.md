WATER-W5-H5 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w5-h5/docs/dispatch/reports/WATER-W5-H5-REPORT.md

补单 01 已完成；实现提交为 1e3fc3b6b399d503abe0b7478a551fbf0ed011d5，check、test、real 三个 final 均通过。以下先保留上一轮受阻现场；其中“未实现”“未运行”等结论仅指上一轮，本次结果见“补单 01”一节。任务交回等待总控验收，未自行标记 VERIFIED。

## 上一轮受阻回执（历史，提交 d6c83ea92996b148a585a3d6719c6a9e8babf25c）

日期：2026-10-27。实际模型：Codex（GPT-6；本会话未提供更细型号）。

工作树：F:/new/smaltalk/water/.worktrees/w5-h5；分支：worker/water-w5-h5。
首次 HEAD：3f9078972d7f958fad6bfd42e68f022dd659539e；初次检查时工作树干净，路径、分支、基线均与正式票一致。
实现提交 SHA：无，尚未修改产品或测试。本次交回只有受阻回执和检查器 archive 生成的基线证据。
首次提交回执时 git commit 因 Author identity unknown 失败（工具退出码 1，未创建提交）。回执提交使用仅在该命令进程内生效的 GIT_AUTHOR_NAME / GIT_COMMITTER_NAME=Codex、GIT_AUTHOR_EMAIL / GIT_COMMITTER_EMAIL=codex@localhost；不写入任何 Git 配置，也不借用人类作者身份。

### 阻塞：新增规则所需的两个数量调整未获票面授权

权威票 docs/dispatch/tickets/WATER-W5-H5-RULES-M2-20261027.md 第 45 行规定：“原有标记与断言不变。”同票与 RULES-M2 第 1、3 节又要求新增 rust-build-dirs，并将它加入种子表和解析计划。

基线测试存在两个固定数量断言：

| 位置 | 原断言 | 加入新规则后的必要期望值 |
|---|---|---|
| packages/junk-rules/tests/rules_v1.rs:563，rules_protection_precedence | assert_eq!(embedded.rules().len(), 60, "seed set must load"); | 61 |
| packages/junk-rules/tests/rules_v1.rs:582，rules_resolve_plan | assert_eq!(expected, 214); | 216 |

只读解析现有 windows.json，得到 60 条规则；按现有 expected_target_count 的算法、为该测试的两个 custom root 计算，得到 214 个目标。新增规则只有一个 marker 定位器；src/plan.rs:163–179 对每个 custom root 生成一个目标，因此将增加 1 条规则、2 个目标。

以上是静态核对与内存复算，没有修改文件来制造失败，也没有运行产品测试；不将这一推导冒称为已发生的测试失败。保持旧断言原样会与新增规则后的结果冲突；自行更新数量则违反票面“原有标记与断言不变”。未通过删减规则、缩小测试输入或调整计数算法绕过冲突。

按 docs/dispatch/W5-M2-WORKER-RULES.md 第 40 行的“契约冲突或缺东西时写受阻回执，不要自行变通”，以及 docs/CONTROLLER-WORKFLOW.md 第 2 节，停止实现并交回总控处理。

### 最小补充需求

请总控在编号补充单中明确授权仅将上述两处旧数量断言的期望值分别由 60 改为 61、214 改为 216，并同步权威票面/manifest 的相关约束。四个测试名、原有标记、其余规则的断言与全部行为约束继续保留；新增断言仍按 SPEC 使用 RULES_RUST_BUILD。

没有申请变更扫描器、规则校验器、规则格式版本、依赖或检查脚本，也未自行编辑契约与台账。

### 已执行的指定检查

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

### 来源核对与未改动的文件

已于 2026-10-27 只读访问 [Cargo 官方 Build cache 文档](https://doc.rust-lang.org/cargo/reference/build-cache.html)，核对网址与标题，并确认文档说明默认 target 目录、CARGO_TARGET_DIR / build.target-dir / --target-dir 可配置构建产物位置。这里的日期是本次访问日期，不是页面发布日期。页面未承诺 .rustc_info.json 标记或其大小界限；这部分依据仍仅为 SPEC 所载总控本机观察，不冒称本执行者重新扫描或获得了官方标记格式保证。没有下载依赖、安装程序或其它产物。

SPEC 要求的 local_observation 原文已核对：“2026-10-27 总控本机只读核查：Water 各工作树的 CARGO_TARGET_DIR 构建目录根下都有 .rustc_info.json”。尚未写入规则包。

两份产品/测试文件仍保持开工原字节（SHA-256）：

- packages/junk-rules/rules/windows.json：fc732242de91403c1932736e5f39bc4417898e86985dad5f461d0fa8197f7e53。
- packages/junk-rules/tests/rules_v1.rs：3b083489b918f782b1f64cacb1fa570871a76fe7acfebfd3ffc1952c66f08be8。

新规则、测试新增断言、有效负控及三个 final 均未完成；没有实现提交和新规则完整 JSON 交付。没有验证 Rust 构建目录的实际扫描命中、规则重叠的运行结果、应用内清理、自清理里程碑或 macOS。原生窗口 0、选择框 0、浏览器窗口 0；未建删除夹具，未删除真实数据。未启动子代理或后台测试进程；未修改远端/配置，未 push、merge、rebase 或改写已有提交。

## 补单 01

### 续做与交付范围

- 日期：2026-10-27；实际模型：Codex（GPT-6；本会话未提供更细型号）。
- 权威补单：F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W5-H5-ADDENDUM-01-20261027.md；按其指定顺序读原票、规则、契约、补单及历史回执。
- 续做起点：d6c83ea92996b148a585a3d6719c6a9e8babf25c；工作树 F:/new/smaltalk/water/.worktrees/w5-h5；分支 worker/water-w5-h5；开工时 HEAD 精确一致、树干净。没有重跑 baseline。
- 实现提交：1e3fc3b6b399d503abe0b7478a551fbf0ed011d5，仅含 packages/junk-rules/rules/windows.json 和 packages/junk-rules/tests/rules_v1.rs。
- 提交身份继续使用本次命令进程内的 Codex <codex@localhost> 作者/提交者环境变量；未写 Git 配置。后续提交只含本回执与 archive 生成的证据。

### 新规则完整 JSON 与来源

规则追加在既有四条 custom 规则之后；data_version 更新为 2026-10-27.1；rules_version 仍为 water.junk-rules.v1。原有 60 条规则经逐项 JSON 比较全部保留，顺序、字段值均未改变。

~~~json
{
  "rule_id": "rust-build-dirs",
  "title_zh": "Rust 构建目录",
  "owner_zh": "Rust 工具链",
  "category": "custom",
  "level": "recommended",
  "locate": [
    {
      "kind": "marker",
      "marker": {
        "kind": "file",
        "name": ".rustc_info.json",
        "min_bytes": 2,
        "max_bytes": 65536
      },
      "max_depth": 12
    }
  ],
  "item_type": "dir",
  "min_age_hours": 1,
  "keep_newest": 0,
  "in_use": {
    "mode": "none",
    "processes": []
  },
  "growth": "slow",
  "what_zh": "你添加的文件夹里，Rust 项目编译时生成的构建目录（根下有 Cargo 写的 .rustc_info.json）。",
  "why_zh": "只含编译产物，可以完整重建。只在你添加的文件夹里查找。",
  "after_zh": "项目源码还在。下次编译会重新生成，第一次会慢一些。",
  "fix_hint_zh": null,
  "sources": [
    {
      "kind": "local_observation",
      "ref": "2026-10-27 总控本机只读核查：Water 各工作树的 CARGO_TARGET_DIR 构建目录根下都有 .rustc_info.json",
      "checked_on": "2026-10-27"
    },
    {
      "kind": "official_doc",
      "ref": "https://doc.rust-lang.org/cargo/reference/build-cache.html",
      "checked_on": "2026-10-27"
    }
  ]
}
~~~

本地观察来源逐字沿用 SPEC，不冒称本执行者重新扫描所得。官方来源已在本次续做中重新只读访问核对：

- 网址：[https://doc.rust-lang.org/cargo/reference/build-cache.html](https://doc.rust-lang.org/cargo/reference/build-cache.html)。
- 标题：Build Cache - The Cargo Book。
- 访问日期：2026-10-27；这是 checked_on，不是页面发布日期。
- 核对内容：默认构建产物目录为工作区根下的 target，可用 CARGO_TARGET_DIR、build.target-dir 或 --target-dir 指定位置；文档区分最终产物与中间产物，并提示内部布局可变。
- 页面未保证 .rustc_info.json 标记及 2～65536 字节界限；它们按冻结 SPEC 与总控观察登记。仅阅读网页，未下载依赖或其它产物。

### SPEC 对照与获准调整的三个旧断言

新规则字段、来源形状及 custom/marker 约束沿用原校验器；未新增校验条件、字段或依赖。种子表追加一行；rules_seed_coverage 在旧循环之前用 RULES_RUST_BUILD 标记逐字段比较新规则的 ID/顺序、分类、级别、类型、年龄、保留数量、在用模式与进程列表、增长、定位摘要。其余种子断言保持原样。

rules_resolve_plan 经公开 resolve_plan 入口，对一个自定义根断言恰好一个新规则目标，核对 group_id、target_id、根、文件标记、大小上下界、深度及文案；另核对两根时末尾目标顺序、无 custom root 时不生成该规则目标。原计划的序列化/严格读回、hard_guards、浏览器保护断言仍保留。rules_schema_strict 追加新规则反向样本，证明原校验器仍拒绝倒置的大小界限及超出 16 的深度，没有添加生产约束。

仅按补单调整以下三个旧断言字面值，失败信息原样保留：

~~~rust
// rules_protection_precedence：原文
assert_eq!(embedded.rules().len(), 60, "seed set must load");
// 改为
assert_eq!(embedded.rules().len(), 61, "seed set must load");

// rules_resolve_plan：原文
assert_eq!(expected, 214);
// 改为
assert_eq!(expected, 216);

// rules_resolve_plan：原文
assert_eq!(plan.rules_data_version, "2026-10-26.2");
// 改为
assert_eq!(plan.rules_data_version, "2026-10-27.1");
~~~

rules_protection_precedence 中构造子集的测试输入 "data_version": "2026-10-26.2" 未改。测试文件仍精确四个测试：rules_schema_strict、rules_protection_precedence、rules_resolve_plan、rules_seed_coverage；无忽略或过滤。

### 检查命令、结果与归档

以下均在本工作树根执行。每行“参数”连接到下述命令前缀，即该次完整命令：

~~~powershell
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W5-H5
~~~

回执文件均位于 docs/acceptance/wave5/h5/receipts/；表内时间为 UTC，文件名保留执行时的完整时间戳与 PID。退出码列先列检查入口；涉及产品测试时另列 Cargo 退出码。

| 参数 | 入口 / Cargo 退出码 | 结果 | 回执文件 |
|---|---|---|---|
| --mode lock | 0 / — | passed；离线核对既有依赖，未改 Cargo.lock | 2026-10-27T14-05-27.422Z-9528-lock-result.json |
| --mode test | 1 / 101 | 先补测试、未加规则时四测皆红；包含 RULES_RUST_BUILD: rule exists 与 appended rule；这是先红记录，不是 nc1 | 2026-10-27T14-05-38.651Z-36228-test-result.json |
| --mode check | 0 / 0 | passed；依赖/源码政策、fmt --check、clippy -D warnings 通过 | 2026-10-27T14-06-38.217Z-29296-check-result.json |
| --mode test | 1 / 101 | 加规则后 3 过 1 败；新增深度用例将既有错误码误写为 RULES_INVALID_LOCATE，实际为 RULES_INVALID_NUMBER | 2026-10-27T14-07-54.251Z-37724-test-result.json |
| --mode test | 0 / 0 | 修正上述新增断言期望，原校验器未改；四测全绿 | 2026-10-27T14-08-24.116Z-33940-test-result.json |
| --mode red-nc1 | 0 / 101 | 有效负控：2 过 2 败；observedExpectedFailure=true，标记 RULES_RUST_BUILD | 2026-10-27T14-09-51.111Z-11496-red-nc1-result.json |
| --mode test | 0 / 0 | 单文件 checkout 恢复后立即四测全绿；生产/测试哈希与负控前一致 | 2026-10-27T14-09-55.494Z-38456-test-result.json |
| --mode check --final | 0 / 0 | passed；干净实现提交上通过政策、格式与 clippy | 2026-10-27T14-10-32.930Z-24832-check-result.json |
| --mode test --final | 0 / 0 | passed；四测全绿，0 ignored / measured / filtered；proofAudit 绑定上述 nc1 与立即恢复记录 | 2026-10-27T14-10-51.870Z-17464-test-result.json |
| --mode real --final | 0 / 0 | passed；只读已知目录与字面前缀存在性；输出无路径 | 2026-10-27T14-10-55.156Z-34956-real-result.json |
| --mode archive | 0 / — | passed；索引共 169 份文件、2,657,404 字节 | 本次 archive 回执在 .local，说明见下 |

失败的普通 test 回执可能仍标 productTestsRun=false，因为检查入口在核对进程退出码时已抛出错误；对应 -test-5.log 保留了实际四测输出和 Cargo 101，不能据该布尔值说测试没有运行。先红、开发中失败、修正后的绿、负控红与恢复绿全部保留，没有删除失败记录。

三个 final 的 before/after HEAD 都为实现提交 1e3fc3b6b399d503abe0b7478a551fbf0ed011d5，工作树干净。每个 final 只运行一次，随后没有再改产品或测试。

真实冒烟输出共 61 行，56 行 base_exists=true、46 行 literal_prefix_exists=true。它不枚举目录、不读真实文件内容，仅调用元数据存在性检查；五条 custom 规则均不传入自定义根，因此该模式对 marker 不作物理检查，rust-build-dirs 的两项布尔值为 false。不能将它解释为本机没有 Rust 构建目录。真实 marker 命中、重复规则合并、空间计量不在本次实测内。

归档入口按原字节复制 .local/checks/WATER-W5-H5 的回执、日志与源码快照，索引为 [ARCHIVE.json](../../acceptance/wave5/h5/ARCHIVE.json)。原有八份基线证据继续保留；上一轮 archive 自身的回执本次也被纳入。补单 01 没有新增 baseline。当前 archive 回执 .local/checks/WATER-W5-H5/2026-10-27T14-11-53.419Z-43892-archive-result.json 在复制完成后生成，未冒称已纳入本次索引。

另对唯一测试文件运行一次本机 1.95.0 rustfmt（--edition 2024 packages/junk-rules/tests/rules_v1.rs），退出 0；后续 check 与 check --final 均核对格式。所有 Cargo 调用均由指定入口以离线、单线程、工作树私有 target 执行。

### nc1：只改真实 marker 解码返回值，立即原字节恢复

负控采用原票允许的生产代码单点路径。检查入口要求 Rust 负控在 src 下有未提交变化，因此未采用只改 JSON 的路径，也未修改检查器。

仅临时修改 packages/junk-rules/src/rules.rs 中 parse_marker 返回 Marker::File 的一个字段：

~~~rust
// 正常
max_bytes,
// 负控
max_bytes: min_bytes,
~~~

它把实际解析得到的文件 marker 上界错误地设为下界；新规则从 2～65536 变成 2～2。没有增加开关、测试专用分支或修改测试。Cargo 正常编译后四测完整运行，rules_schema_strict、rules_protection_precedence 通过；rules_resolve_plan 与 rules_seed_coverage 命中目标失败：

~~~text
RULES_RUST_BUILD: marker name, bounds, depth and root
left:  File { name: ".rustc_info.json", min_bytes: 2, max_bytes: 2 }
right: File { name: ".rustc_info.json", min_bytes: 2, max_bytes: 65536 }

RULES_RUST_BUILD: locator summary
left:  ["marker:file:.rustc_info.json:2:2:12"]
right: ["marker:file:.rustc_info.json:2:65536:12"]
~~~

随后立即执行 git checkout -- packages/junk-rules/src/rules.rs，再执行 --mode test；四测全绿。对还原文件及检查器聚合哈希逐一核对：

| 对象 | SHA-256 |
|---|---|
| 负控 src/rules.rs | a4c642e6745dba236aa1a7429c93ab8d1fbd392c13ab3c33b249d4e38cfc7dae |
| 恢复后 src/rules.rs（与负控前原字节一致） | b33066fe9066845257c1519aee657ec6c25da6b0a5bb172b95e2f38910b189aa |
| 新规则 windows.json | ad0ee57794cab13ddd7b3aabab5dad23025532b3bd0d944d60c6de7933d62e50 |
| 最终 tests/rules_v1.rs | f0058670c44ffcb09f3f66c70cb0669db39fbd9ae9ff918b36fe8e4a81ea2bb7 |
| 负控 productionHash | 4318b8e362715ff7c8a2118273f7f0b96991316dc701c792741141be0549000e |
| 恢复后 / final productionHash | ee165fbd4b8a778336ad87f913d8487e7f5065f10ee54ec154f21879ccb002bd |
| 负控前 / 负控中 / 恢复后 / final testHash | c8fb3f6969a921fb2d9870c5a25c72660090f35c6317ebce4a944399ddd55fc9 |

最后的 test --final proofAudit 选择该次 red-nc1 与紧接其后的绿回执，并校验快照字节。最终 src、Cargo.toml、Cargo.lock、real_smoke.rs 均与续做起点 Git 内容一致；本次实现未改校验器、解析器或任何公开接口。

### 未做与未验证

未修改 packages/junk-scan、服务、宿主、界面、契约、检查器、台账、其它包或依赖；没有新增测试文件或测试名，没有降低原有断言。未运行整仓测试、其它票检查、上游脚本、网络安装或下载。

未扫描本机真实自定义项目根，没有实测真实 Rust 目录命中、两条标记规则的磁盘去重、清理执行、占用竞态、应用内流程、自清理里程碑或 macOS。原生窗口、选择框、浏览器窗口均为 0；未建立或删除物理夹具，未删除真实用户数据，未读取真实用户文件内容或进程命令行。未启动子代理、watch 或后台测试服务。

未 push、merge、rebase、reset、amend、squash 或改写历史，未修改远端与 Git 配置。实现之后只提交本回执及 archive 证据；交回后停止本票检查与修改。
