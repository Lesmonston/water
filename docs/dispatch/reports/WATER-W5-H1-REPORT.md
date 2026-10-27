WATER-W5-H1 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w5-h1/docs/dispatch/reports/WATER-W5-H1-REPORT.md

2026-10-28，执行者 Codex（GPT-6）接手完成。原 Cursor 对话：`43aa8642-2501-4c73-a086-26c571435a52`；原执行者的底层模型未知，未代填。当前为执行者交回，等待总控独立验收。

工作树 `F:/new/smaltalk/water/.worktrees/w5-h1`，分支 `worker/water-w5-h1`；首次基线 `3f9078972d7f958fad6bfd42e68f022dd659539e`。实现提交：`0dc44d458bffc0b4e8bfbae929d9fe7e8585a276`。实现只修改 `packages/junk-clean/src/native_windows.rs` 和 `packages/junk-clean/tests/clean_v1.rs`；后续提交只含本回执与检查器归档。

接手时 HEAD 仍为指定基线，两个实现文件已有未提交改动，检查目录已有历史收据。按用户明确的接手授权保留并审阅了这些改动，再补齐句柄逆序关闭、停止检查点和无效名字碰撞的处理。已有的干净基线收据 `2026-10-27T15-03-35.012Z-17144-baseline-result.json` 显示 HEAD 为原始基线、工作树干净、离线缓存完整。接手时再次调用 baseline 被其“只接受未经修改基线”的断言拒绝，收据完整保留；续做沿用已有干净基线证据，没有清除现场或复位提交。

SPEC CLEAN-M2 第 1～5 节的落实：

1. 快照使用 `SnapFrame` 显式栈与 `drain_snap` 循环，删除使用 `DelFrame` 显式栈与 `delete_from` 循环，残余统计使用 `MeasFrame` 显式栈与 `drain_measure` 循环，三条路径没有自身递归或互相递归。各栈由 `FrameStack` 持有，提前返回也从最深层逐个弹出，先关子句柄再关父句柄；正常后序删除同样在返回父层前立即关闭子目录句柄。目录仍按句柄相对打开，删除共享仍为 3；身份、类型与重解析点复核保持。子目录完成后才执行父层的 post-child 停止检查，保留原递归版本的检查位置。
2. `DelCtx.deleted` 为每个快照项记录本次成功设置删除标记的事实；文件、目录、名称代理链接的成功分支都经 `note_removed` 更新。目录删除失败后的 `only_post_snapshot` 允许“新名字 / 已有交代 / 本次已删快照项”三种残留，不重复计父目录失败。再枚举为空或失败时仍计一次。
3. `walk_parent` 用 `ParentErr::Gone` 区分逐级相对打开的错误 2、3。删除入口映射为 `skipped/gone`、释放 0、失败 0；残余路径复用原 `replaced(self_deleted)` 规则：本次删过条目本身才认定残余 0，否则保留 `bytes_before`，不额外计失败。其它错误保留原处理。
4. 普通文件在设置删除标记前，从同一句柄读取 `FileStandardInfo` 的大小和链接数；读取失败则留下该对象并计失败。只有标记设置成功且链接数不大于 1，才把删除时的大小累加到 `bytes_freed`；目录和重解析点不计。残余只决定状态，文件增大后也不以 `bytes_before` 截断释放量。总报告继续沿用原 API 汇总各项。
5. 采用“无效 UTF-16 名字不尝试打开，计 1 个失败并记为已有交代”的方案。`Raw` / `Entry` 记录 `name_ok`；无效名字使用 NUL 前缀加逐个原始 UTF-16 单元的十六进制值作为私有快照键，避免两个不同代理项或合法 U+FFFD 名字发生有损转换碰撞。该键不会传入打开调用。无效名字的目录不进入，残余无法测量其子树时遵循原残余未知规则。

测试仍是精确六个，原测试名与已有断言保留。新增断言位于原 `clean_report_volume` 和 `clean_handle_hardening`：

- `CLEAN_DEEP_TREE`：每层 `d` 的 4000 层目录链，最深处一个文件；用扩展路径创建，在 256 KiB 栈线程里经公开 `execute` 清理，断言 `deleted` 和条目消失。
- `CLEAN_FREED_EXACT`：条目内有一个另有外部硬链接的文件，外部链接仍在且内容不变；另外两个普通文件合计 6 字节，释放量精确为 6。
- `CLEAN_UNPAIRED_NAME`：两个含不同孤立代理项、但有相同有损拼写的文件留下，失败数精确为 2；另一个合法 U+FFFD 同形名字正常删除，整项不报 `deleted`。

测试辅助的体量计算和夹具回收也改为迭代，支持长路径及原始宽字符串。回收仍先验证本次随机 `fixture-<16位hex>` 目录、精确父目录、规范路径和非重解析祖先，再对每个待处理路径做按路径分段的归属检查；不跟随重解析点，只回收本次新建的那个目录。夹具均在本树 `.local/w2-d-fixtures/`。

检查命令统一前缀为：

```powershell
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W5-H1
```

以下命令均在指定工作树根执行；除 archive 自己的结果收据外，表中收据全部位于归档的 `receipts/` 下。

| 后缀 | 结果 | 收据 |
|---|---|---|
| `--mode baseline`（接手前已有） | 通过，原始 HEAD 干净，离线缓存完整 | `2026-10-27T15-03-35.012Z-17144-baseline-result.json` |
| `--mode baseline`（接手时） | 拒绝已有实现改动的现场，退出 1；沿用上一行基线 | `2026-10-27T15-09-05.391Z-11412-baseline-result.json` |
| `--mode lock` | 通过，依赖与锁文件未改 | `2026-10-27T15-10-54.998Z-29320-lock-result.json` |
| `--mode check` | 通过，源码政策、八个 FFI、fmt、Clippy | `2026-10-27T15-11-21.255Z-43240-check-result.json` |
| `--mode test` | 六测全绿 | `2026-10-27T15-11-33.857Z-39128-test-result.json` |
| `--mode red-nc1` | 目标断言红，Cargo 101；检查器通过、退出 0 | `2026-10-27T15-13-13.343Z-35680-red-nc1-result.json` |
| `--mode test`（恢复 nc1 后） | 六测全绿 | `2026-10-27T15-14-23.340Z-32396-test-result.json` |
| `--mode red-nc2` | 目标断言红，Cargo 101；检查器通过、退出 0 | `2026-10-27T15-15-39.435Z-30424-red-nc2-result.json` |
| `--mode test`（恢复 nc2 后） | 六测全绿 | `2026-10-27T15-16-38.120Z-30440-test-result.json` |
| `--mode red-nc3` | 目标断言红，Cargo 101；检查器通过、退出 0 | `2026-10-27T15-17-36.488Z-32196-red-nc3-result.json` |
| `--mode test`（恢复 nc3 后） | 六测全绿 | `2026-10-27T15-26-35.677Z-43328-test-result.json` |
| `--mode check --final` | 干净实现提交通过 | `2026-10-27T15-28-44.129Z-24864-check-result.json` |
| `--mode test --final` | 干净实现提交通过，六测全绿，三组 proofAudit 全过 | `2026-10-27T15-28-56.744Z-12832-test-result.json` |
| `--mode archive` | 通过，归档 687 项 / 8,804,541 字节 | `.local/checks/WATER-W5-H1/2026-10-27T15-30-03.977Z-1320-archive-result.json` |

另外执行了指定包的 `cargo fmt --manifest-path packages/junk-clean/Cargo.toml`（使用本机既有 1.95.0 工具链），以及 `git diff --check`，均成功。第一次提交因缺少 Git 作者身份失败；随后仅给该提交进程设置 `GIT_AUTHOR_*` / `GIT_COMMITTER_*`，以 `Codex <codex@local.invalid>` 新增实现提交，没有修改 Git 配置。后续回执提交使用相同进程环境方式。

三条负控每次只临时改生产源码的一处，测试保持实现提交的字节；完成后用 `git checkout -- packages/junk-clean/src/native_windows.rs` 恢复，核对 SHA-256，再立即运行完整 `--mode test`：

| 负控 | 临时修改 | 实际失败信息 |
|---|---|---|
| nc1 | 普通文件计费条件 `links <= 1` 改为 `links >= 1` | `CLEAN_FREED_EXACT: hard-linked file was counted or other sizes were wrong`，实际 `22`、期望 `6` |
| nc2 | 无效名字分支移除 `self.fail(index)`，直接返回 | `CLEAN_UNPAIRED_NAME: unpaired-name file was not counted as a failure` |
| nc3 | 删除栈深度达到 1024 后不再压入子目录帧 | `CLEAN_DEEP_TREE: 4000-deep tree was not deleted`，实际 `Failed`、期望 `Deleted` |

三次恢复后的 `native_windows.rs` SHA-256 均为 `f949bc4514059eab43f71fcd9174c85a60d05b160dc3756296d3359199f09c60`；测试文件 SHA-256 为 `51a0c7301a7109a0205861882f793439e354d7b3936195b0056b1b5a36743c64`。最终收据中的 `productionHash` 为 `93a666c86e708e7b18025738805d39b7c4b465a0c59e388474cd8f8413a94534`，`testHash` 为 `2ac21db050c9e4cba6fc8ec477a4b5b0c9e22977212d3775f32c54bc5597a32c`。`proofAudit` 逐条绑定上表中的红态和其后精确字节恢复的绿态。

nc3 的测试日志为 5 通过、1 失败，用时 418.87 秒；深目录未被删掉后，测试用迭代回收清理了自己的整条夹具，耗时明显高于正常执行。该次没有超时或编译错误。最终正常六测耗时 47.95 秒。

证据索引：[ARCHIVE.json](../../acceptance/wave5/h1/ARCHIVE.json)。独立逐项复算了全部 687 项的归档哈希、原件哈希、字节数及总数，均与索引一致。其中保留接手前的全部历史日志与收据：baseline 5 次通过 / 2 次失败、lock 4 次通过、check 4 次通过 / 4 次失败、test 24 次通过。历史失败没有改写或冒称为有效负控；各次源码快照、具体命令及失败输出都在索引内。归档命令本次自己的结果收据按检查器行为留在上述 `.local` 路径，索引收录的是归档执行前已有的文件。

额外的全暂存区 `git diff --cached --check` 报出一处历史原始日志的尾随空白：`receipts/2026-10-27T14-12-17.015Z-1880-check-5.log:6`。为保持归档原字节，没有修改该日志；回执自身的暂存空白检查通过，产品文件已通过前述 fmt、Clippy 和提交前空白检查。

公开 API、JSON 字段、依赖、锁文件、允许的八个系统函数以及原删除方式均保持。没有新增生产测试开关。只在本树合成夹具上执行删除，原生窗口 0；未操作真实用户数据。未运行总控的快照后改磁盘与生产竞态用例（SPEC 第 2、3 条留给总控验证），未做主线集成、M2 自清理、macOS 验证或发布。未修改其它票、契约、检查器、台账、远端及 Git 配置；未 merge、push 或改写已有提交。交回后停止本票测试，无自有后台测试进程留存。
