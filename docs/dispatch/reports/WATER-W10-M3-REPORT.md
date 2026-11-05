WATER-W10-M3 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w10-m3/docs/dispatch/reports/WATER-W10-M3-REPORT.md

实际模型：Codex GPT-6。只读辅助 m9_readonly_review 审阅契约与实现，未写文件、运行检查或取得实现权限；指出的 Unicode 保护匹配与绝对 gitdir 原样保留问题已在实现提交前修正并加回归断言。

工作树 F:/new/smaltalk/water/.worktrees/w10-m3；分支 worker/water-w10-m3；开工 HEAD f93afb8e3c5cf4114927fe2ab6c14dbb033c7ffe，干净。
实现提交 ec0ed5fd9a3911baec20b8a2c56f5f4510524a6e。之后仅提交回执和归档证据。

## SPEC 逐节对照

1. 独立 water-cleanup-manifest 包与 workspace，edition 2024/rust-version 1.95，仅冻结 serde/serde_json 依赖，lock 离线生成，全部代码 forbid unsafe。src 只使用许可的只读文件调用；Windows 打开带 FILE_FLAG_OPEN_REPARSE_POINT。不写、不建、不删、不跑 git/进程、不联网。
2. 公开 Manifest/Disposable/Worktree 与 Loaded/Invalid/GitLink 类型均派生指定 traits。parse 校验全部字段、必填、缺省、类型、字符长度/控制字符、计数、重复 id、年龄范围/前导零、kind/keepNewest/ask 和仅显示字段；未知键拒收且使用 JSON Pointer 转义。
3. 路径校验 1～8 段、总长及段长、相对性、非法字符、点段、尾点/空格、单独星号、双星、.git 和工作树路径禁止通配；sibling 的字面后缀限制符合契约。
4. to_targets 在 trusted=false 返回空；按声明/模式顺序产生全部目标键，目录 ASCII 小写 SHA 前12位作 ID；两种级别、小时数/keep_newest 缺省、反斜杠拆段、sibling 条件和小写后缀都按 JSON 值比较。测试中的目录哈希前缀另由 .NET SHA256 算出后固定。
5. protects 不带信任开关，逐段匹配父子重叠与目录边界；支持通配、斜杠、Unicode 大小写，? 消耗一个原始字符。覆盖内部、包含祖先、根本身、无关路径与相似前缀目录。
6. read_git_link 只读取 .git 普通小文件（≤1024字节），拒绝联接；只解释首行，支持相对/盘符/MSYS，拒绝 UNC/设备/驱动相对路径；相对路径文字归约，绝对路径保持规定文本形式；对目标只查目录元数据，区分 valid/detached/invalid。
7. read_manifest 校验绝对路径与文件名、重解析点、普通文件、大小；有界读 MAX_BYTES+1；返回含 BOM 原始字节的 SHA-256，parse 单独去 BOM；UTF8/JSON/容器深度/version/未知键/字段/路径问题给出固定错误码和 pointer。sha256.rs 为本次自行实现，无额外依赖。
8. 精确四测全部通过：manifest_parse_contract、manifest_targets_and_protect、manifest_read_files、manifest_git_link。含65536/65537字节边界、两种联接拒绝、.NET 独立原始文件哈希、空串/abc/百万 a 标准向量、三种 gitdir 写法、绝对文本保留及无效状态。
9. 两条有效生产负控、即时原字节恢复与四测绿均完成；check/test/real 三个 final 都绑定实现提交并通过；证据 archive 共174个文件、1508404字节。

无旧测试/断言，未修改其它包、契约、台账、检查器。没有创建窗口、浏览器或选择框，没有访问真实文件正文（除许可的 .git 小文件；根声明不存在）。夹具均为本树 .local 下本次新建 water-w10-m3-<pid>-<时间> 目录；各联接先单独移除，再核对父目录和名称前缀，仅回收各自目录，结束后这类目录剩0个。

## 负控

- nc1：path_ok 在发现 .. 段时错误放行；09:02:53 red 以 MANIFEST_FORMAT 断言失败。git checkout -- lib.rs 恢复，09:02:57 完整四测绿。
- nc2：to_targets 将不可信声明只在 disposable 为空时拦住，错误允许非空声明；09:03:22 red 以 MANIFEST_TARGETS: untrusted 失败。git checkout -- lib.rs 恢复，09:03:27 完整四测绿。
- 两次恢复及三个 final 的 productionHash 均为 67d5cea9f9e9da2696290ca6cd89e57cf2311d1af550eddc0476cde59bcd13cb；逐文件 SHA-256、测试哈希、变异快照及即时恢复链在归档 result.json，final test 的 proofAudit 通过。

## 真实只读冒烟与限制

本仓库 .worktrees 下 valid=18、detached=0、invalid=0；仓库根 .water-cleanup.json 不存在，因此未读取根声明。只输出汇总，没有路径或名字。没有删除真实数据、没有接服务/桌面、没有 macOS 验证。非Windows读取返回不可读，纯内存接口可用，不静默用普通打开跟随链接。

## 开发期记录与检查

首次 check 为 Clippy 的嵌套 if 与布尔写法失败，已修正。首次 test 的两个问题是测试把恰好512字符的合法模式当作超长、以及夹具 canonicalize 返回设备路径导致相对 gitdir 测试不符合输入；已将反例改为515字符，并将夹具路径还原成同一个本树绝对盘符形式。无旧断言变更，没有放宽契约。所有原始失败也归档。

每条 checker 从本树根运行，统一前缀为 `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W10-M3`；下表是完整后缀/结果。另运行固定1.95.0 cargo fmt 和提交前 git diff --check。08:18 baseline 是总控预先留下的记录；其它为本次执行。全部离线、串行、私有 target、测试单线程。

| 回执（UTC 时间文件名） | 命令后缀 | 结果 |
|---|---|---|
| 2026-11-05T08-18-39.530Z-31996-baseline-result.json | --mode baseline | passed |
| 2026-11-05T08-52-05.814Z-11464-baseline-result.json | --mode baseline | passed |
| 2026-11-05T08-58-08.872Z-26968-lock-result.json | --mode lock | passed |
| 2026-11-05T08-58-11.873Z-21968-check-result.json | --mode check | failed |
| 2026-11-05T08-59-00.297Z-27432-check-result.json | --mode check | passed |
| 2026-11-05T08-59-03.850Z-20024-test-result.json | --mode test | failed |
| 2026-11-05T09-00-18.384Z-10212-test-result.json | --mode test | passed |
| 2026-11-05T09-01-42.727Z-2756-check-result.json | --mode check | passed |
| 2026-11-05T09-01-46.020Z-23040-test-result.json | --mode test | passed |
| 2026-11-05T09-02-53.424Z-31312-red-nc1-result.json | --mode red-nc1 | passed |
| 2026-11-05T09-02-57.934Z-26964-test-result.json | --mode test | passed |
| 2026-11-05T09-03-22.185Z-21360-red-nc2-result.json | --mode red-nc2 | passed |
| 2026-11-05T09-03-27.111Z-16572-test-result.json | --mode test | passed |
| 2026-11-05T09-03-31.274Z-27052-check-result.json | --mode check --final | passed |
| 2026-11-05T09-03-34.513Z-23756-test-result.json | --mode test --final | passed |
| 2026-11-05T09-03-37.333Z-3656-real-result.json | --mode real --final | passed |
| 2026-11-05T09-03-41.374Z-27568-archive-result.json | --mode archive | passed |
