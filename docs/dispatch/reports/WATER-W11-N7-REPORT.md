WATER-W11-N7 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w11-n7/docs/dispatch/reports/WATER-W11-N7-REPORT.md

- 实际模型：Codex（GPT-6；会话未提供更细型号）。未使用子代理。
- 基线：`ccc584b3894e28d1f6bb8f86748d03c143a38e5b`；工作树：`F:/new/smaltalk/water/.worktrees/w11-n7`；分支：`worker/water-w11-n7`。
- 干净实现提交：`2c234d6aaf80ce7824eb11fd0954c729506c6225`。全部 final 均绑定此提交；后续只提交本回执和检查器生成的证据。
- 本单为执行者交付，尚待总控独立验收与合入。

## 工单逐项对照

- src/util.rs 的 excluded 名单加入 .flick-quarantine，继续沿用 eq_ignore_ascii_case；全 src 搜索没有其他只登记旧隔离名的地方。两个调用点是 scan.rs 的 safe_root 与遍历目录排除，均复用此名单。
- real_smoke 从 CARGO_MANIFEST_DIR 向上找第一个同时含 docs 目录与 .git 文件或目录的祖先，找不到以原 expect 失败；查重任务名 w10-m8-real 保留。
- 本次真实冒烟查的是相对主仓库位置 .worktrees/w11-n7/docs/，即本工作树自身的 docs/，不是主线 docs/；一次调用 find_duplicates，只输出文件数、候选数、组数与可腾出字节数。
- 原四个测试名与数量保持。新断言紧邻旧排除名单，两个大小写名称各用一个独立合成根；隐藏副本与两个普通重复文件内容相同，精确核对 files_listed=2、candidate_files=2、groups=1、copies=2，并核对隐藏文件未进入任何组或硬链接路径；另核对选它为根也被静默排除。全部新增断言带 DUP_W11_RENAME。
- 未改旧排除名单、旧断言、公开接口、依赖、Cargo.lock、系统函数及其他包。

## 检查命令与结果

每行命令均为 `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W11-N7 --mode <模式> [--final]`；通过为检查器退出 0。负控通过表示产品测试退出 101 且命中指定标记；没有编译错误或超时造红。

| 模式 | 结果 | 回执 / 日志索引 |
|---|---|---|
| `baseline` | failed | `docs/acceptance/wave11/n7/receipts/2026-11-07T06-42-37.590Z-35156-baseline-result.json` |
| `baseline` | passed | `docs/acceptance/wave11/n7/receipts/2026-11-07T06-44-10.125Z-4904-baseline-result.json` |
| `baseline` | passed | `docs/acceptance/wave11/n7/receipts/2026-11-07T07-16-26.074Z-36564-baseline-result.json` |
| `test` | failed | `docs/acceptance/wave11/n7/receipts/2026-11-07T07-17-16.892Z-26484-test-result.json` |
| `test` | passed | `docs/acceptance/wave11/n7/receipts/2026-11-07T07-18-20.583Z-36908-test-result.json` |
| `lock` | passed | `docs/acceptance/wave11/n7/receipts/2026-11-07T07-19-14.837Z-33888-lock-result.json` |
| `check` | passed | `docs/acceptance/wave11/n7/receipts/2026-11-07T07-19-17.811Z-4952-check-result.json` |
| `red-nc1` | passed | `docs/acceptance/wave11/n7/receipts/2026-11-07T07-19-43.602Z-16976-red-nc1-result.json` |
| `test` | passed | `docs/acceptance/wave11/n7/receipts/2026-11-07T07-20-00.775Z-33096-test-result.json` |
| `red-nc2` | passed | `docs/acceptance/wave11/n7/receipts/2026-11-07T07-20-38.988Z-20064-red-nc2-result.json` |
| `test` | passed | `docs/acceptance/wave11/n7/receipts/2026-11-07T07-21-10.519Z-30920-test-result.json` |
| `check --final` | passed | `docs/acceptance/wave11/n7/receipts/2026-11-07T07-21-39.786Z-36000-check-result.json` |
| `test --final` | passed | `docs/acceptance/wave11/n7/receipts/2026-11-07T07-21-47.704Z-17140-test-result.json` |
| `real --final` | passed | `docs/acceptance/wave11/n7/receipts/2026-11-07T07-22-17.933Z-29896-real-result.json` |
| `archive` | passed | `.local/checks/WATER-W11-N7/2026-11-07T07-22-58.981Z-14572-archive-result.json` |

具体 cargo 命令、退出码及日志文件名在各 JSON 的 `commands` 字段；fmt、clippy、metadata、离线与私有 target 由冻结检查器控制。每次 cargo 前仅按进程名查看 cargo/rustc，未输出命令行；未终止其他任务进程。

## 负控与恢复

- `nc1`：目标红 `2026-11-07T07-19-43.602Z-16976-red-nc1-result.json`；`git checkout -- <本次变异文件>` 后核对原字节，再立即 `test` 绿 `2026-11-07T07-20-00.775Z-33096-test-result.json`。
- `nc2`：目标红 `2026-11-07T07-20-38.988Z-20064-red-nc2-result.json`；`git checkout -- <本次变异文件>` 后核对原字节，再立即 `test` 绿 `2026-11-07T07-21-10.519Z-30920-test-result.json`。

## 旧断言迁移

- 无旧断言迁移；原名单仅包含旧隔离名，原遍历 9、候选 7、三份重复等精确断言原样保留。

## 执行中的选择与失败记录

- 先只加新断言跑 test，在旧代码上以 DUP_W11_RENAME 失败：files_listed/candidate_files 从期望 2/2 变为 3/3（3 测试通过、1 失败）。实现后四测试全绿。
- 使用独立合成根分别验证全小写与混合大小写，避免 Windows 不区分大小写导致两个目录合并，同时保持旧测试的所有精确计数。
- nc1 仅从 excluded 名单去掉新名；nc2 仅使新名的比较区分大小写、其他名单仍按旧逻辑比较。分别由全小写与混合大小写的新断言抓住；每次精确恢复后立即跑四测试。
- 执行调度偏差：第二次恢复 test（07:21:10.521Z～07:21:44.985Z）尚未退出时，误启动 check --final（07:21:39.788Z～07:21:47.439Z），两门重叠 5.197 秒；这不符合单树检查串行的要求，两份原始回执完整保留。两门均通过，源码未变；后续 test --final 于 07:21:47.704Z 才启动，已在恢复 test 结束之后，proofAudit 通过。未再启动并行检查，也未额外重跑真实查重。
- 真实找根用 docs.is_dir 和 .git 元数据的文件/目录类型判断，不加公开接口、不依赖固定层数；实际执行在指定工作树，主线模式只静态审阅。
- 归档包括总控原有派前 baseline；本次执行从 2026-11-07T07:16:26Z 的 baseline 起。
- 没有计时失败或计时重跑；没有降低断言强度、删除或忽略测试。

## 真实只读冒烟

只运行工单授权的 `real --final` 一次；结果只含计数或组级汇总：

```json
{
  "candidate_files": 310,
  "files_listed": 82274,
  "groups": 29,
  "reclaimable_bytes": "350221084"
}
```

## 证据、边界与未验证

- `ARCHIVE.json`：166 个文件，1377299 字节；逐一复算大小和 SHA-256 均一致。archive 本身的结果回执留在 `.local/checks/WATER-W11-N7/`（归档在其生成前完成）。
- 真实内容读取仅限工单授权的本树 docs/ 查重，用于哈希计算；未输出路径、名字、文件内容或完整哈希，没有清理。
- 合成夹具与原有离线/稀疏/联接测试仅在本树 .local 下各自新建的受控目录里操作与回收；未在盘根建隔离目录。
- Windows x64 定向验证；主线中直接运行 real_smoke、macOS、服务与桌面 UI 集成未实测。
- 未启动本单后台进程、原生窗口、选择框或浏览器；没有本单进程待终止。未合主线、未推送、未改配置、远端、已有历史或主线台账。
