WATER-W5-H3 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w5-h3/docs/dispatch/reports/WATER-W5-H3-REPORT.md

- 实际模型：Grok 4.7
- 实现提交：`19d32a33bb6d79085230a9e989f211065760c644`（`worker/water-w5-h3`，父提交 `3f9078972d7f958fad6bfd42e68f022dd659539e`）
- 本机 shell 没有 git 身份。提交时只为这一次命令设置了 `GIT_AUTHOR_*` / `GIT_COMMITTER_*`，作者沿用仓库现有提交的 Riku Toto，没有改 git config。

## SPEC 第 1～6 节

1. **宿主自己持有后端。** `BackendSlot` 用 `Mutex<Option<Arc<dyn Backend>>>` 保存服务。`call` 只在锁内克隆 `Arc`，调用后端时不持锁。`take` 之后任何命令都走 `UnavailableBackend` 的失败值。`run` 把槽作为 `Arc<dyn Backend>` 交给 Tauri。`run_return` 返回后先等清理停止线程结束，再 `take` 并丢掉后端，然后结束并 join 激活线程，最后释放实例锁。
2. **清理进行中关窗。** 主窗口的 `CloseRequested` 先读 `app_state`。`busy` 不是 `"cleaning"` 时不拦截。是 `"cleaning"` 时阻止关闭，并只启动一次后台线程调用 `stop_cleaning_and_wait`（间隔 200 ms）。等到不再清理后，在主线程关闭窗口，这次不再阻止。等待期间再次关闭只阻止，不第二次调用 `clean_stop`。
3. **打开清理。** `CLEAN_ENABLED = true`。生产配置 `clean_enabled` 为真。直接构造的生产后端对 `clean_prepare` 不再返回“这一版只做体检，清理功能会在下一版开放。”测试标记改为 `HOST_CLEAN_ENABLED`。
4. **信号文件只更新时间。** `signal_activation` 去掉了 `set_len(0)`。不存在就新建空文件；已有普通文件只 `set_modified`，长度和内容不变。目录、链接和重解析点仍失败且原物不动。
5. **启动接线可测。** `on_lock_result`：拿到锁返回 `Some`；`AlreadyRunning` 写信号并返回 `Ok(None)`；其它错误原样返回。`run` 调用它，`Ok(None)` 时返回 `Ok(())`。
6. **去掉 `\\?\` 后再核对。** 默认基目录先按扩展路径规范化，去掉 `\\?\` 后再规范化一次。两次去掉前缀的结果不同，或第二次规范化失败，就返回 `DataDirectoryError`。测试在夹具里用 `\\?\` 建了结尾带点的 `weird-name.`，`prepare_data_directories` 拒绝它，也没有另建去掉点的目录。

第 7 节的夹具清理闭环由检查器完成，本票没有改 `apps/water/ui`。第 9 节未改：依赖、`Cargo.toml`、`Cargo.lock`、`tauri.conf.json`、`capabilities/main.json`、图标；没有新增 `unsafe`、进程、网络或 `WATER_DATA_DIR` 以外的环境变量；源码里没有 `.setup(`。

## 检查命令

都在 `F:/new/smaltalk/water/.worktrees/w5-h3` 执行 `node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W5-H3`。

| 命令 | 结果 | 回执 |
|---|---|---|
| `--mode baseline` | passed | `2026-10-27T13-38-42.411Z-27276-baseline-result.json` |
| `--mode lock` | passed | `2026-10-27T14-08-19.722Z-22572-lock-result.json` |
| `--mode check --final` | passed | `2026-10-27T14-12-47.563Z-33072-check-result.json` |
| `--mode test --final` | passed，5 个测试，负控审计通过 | `2026-10-27T14-13-05.454Z-30356-test-result.json` |
| `--mode native --final` | passed，1 个窗口 | `2026-10-27T14-13-22.431Z-6820-native-result.json` |
| `--mode archive` | passed，386 个文件，31,714,509 字节 | 证据索引 `docs/acceptance/wave5/h3/ARCHIVE.json` |

提交前还有几次失败，都在实现提交之前改完：`Arc::clone` 不能把 `BackendSlot` 转成 trait object；带点目录的 `\\?\` 路径里夹了 `/`，创建返回 123；`cargo fmt`；clippy 的布尔式、多余 `return`，以及测试字段 `mark` 未读。这些失败的回执也在归档里。

## native --final

检查器打开 1 个窗口，选择框 0。进程 31956，从启动到退出墙钟 13,706 ms。观察器 9 步都通过，退出码 0。系统背景类型 2（Mica）。WebView 子进程随后全部结束。运行时没有操作这个窗口。

| 步 | 用时 | 截图里看到的 |
|---|---|---|
| 等到首页 | 1,296 ms | `home`：标题 Water，侧栏“磁盘体检”，C 盘 59.9 GB 可用，D/E/F 可用空间，按钮“开始体检”。没有“无法连接 Water 服务”。 |
| 点“开始体检” | 57 ms |  |
| 等到结果 | 6,248 ms | `results`：可放心清理 3 MB，本次识别 11.2 GB。已选 1 组 3 MB。“清理所选”可点。受保护行（Claude Code、Cursor、Grok、Codex 等）没有勾选框。扫描约 5 秒。 |
| 点“清理所选” | 33 ms |  |
| 等到确认框 | 1,148 ms | `confirm`：标题“永久删除 3 MB？”，一组“带缓存标记的目录”3 MB，警告“不进入回收站，无法恢复。”按钮是“取消”和“永久删除 3 MB”。 |
| 点“永久删除 3 MB” | 30 ms |  |
| 等到清理完成 | 1,467 ms | `done`：“清理完成”“3 MB 已释放”，预计 3 MB、实际 3 MB。“带缓存标记的目录 · 已清理”。F 盘 152.7 GB → 152.8 GB。 |
| 点“查看清理记录” | 29 ms |  |
| 等到记录页 | 884 ms | `history`：副标题“每一次体检与清理，都有迹可循。”一条“清理完成”，3 MB 已释放，清理 1 组，跳过 0 项；一条“体检记录”，识别 3 类位置，3 MB 可放心清理。 |

检查器核对：`projA/build-cache` 已删除；`projA/src/main.rs` 与 `lab/profile-a` 下的浏览器配置仍在且长度未变。服务存储顶层只有 `cleans`、`journal`、`plans`、`scans`、`settings.json`、`snapshots`、`water.lock`、`webview`，五类记录各 1 份。清理记录状态 `completed`，释放字节 `3145815`，该项 `deleted`，失败 0。日志事件有 `intent` 与 `result`。

## 负控

每条只改生产代码一处，`--mode red-ncN` 抓到标记后立刻 `git checkout` 恢复，再跑 `--mode test` 转绿。恢复后的字节与实现提交相同。

| 负控 | 改动 | 失败信息 | 恢复后 SHA-256 |
|---|---|---|---|
| nc1 | `BackendSlot::take` 里的 `guard.take()` 改成 `guard.as_ref().map(Arc::clone)`，槽里仍留着后端 | `HOST_BACKEND_RELEASE unavailable after take: Object {"ready": Bool(true)}` | `lib.rs` `68c5d7f89b12d7242eea1bdf359f3b7c4bf3a2b2c3eb11f094bbc5cb6f0e7102` |
| nc2 | `stop_cleaning_and_wait` 在确认正在清理后直接 `return true`，不调用 `clean_stop` | `HOST_CLOSE_DURING_CLEAN stops once`，left 0，right 1 | 同上 |
| nc3 | `CLEAN_ENABLED` 改回 `false` | `HOST_CLEAN_ENABLED production config` | `service.rs` `b701b9a15a150c91993f375e05a1b4eac3bb78ce087b309bf250885e641b83c5` |

对应回执：`2026-10-27T14-09-47.213Z-21044-red-nc1-result.json`，随后 `2026-10-27T14-10-20.558Z-15016-test-result.json`；`2026-10-27T14-11-00.288Z-23112-red-nc2-result.json`，随后 `2026-10-27T14-11-25.603Z-4176-test-result.json`；`2026-10-27T14-11-51.983Z-28480-red-nc3-result.json`，随后 `2026-10-27T14-12-20.998Z-25944-test-result.json`。

## 没做或没验证

- **清理进行中关窗没有在真窗口里试过。** 窗口预算只有 1 次，用在夹具清理闭环上。那次是在清理记录页、服务已空闲时由检查器关窗。`stop_cleaning_and_wait` 只在 `host_service_wiring` 里用脚本后端验证。
- 没有再开第二个实例去验证唤起第一个窗口。信号文件改为只更新时间，有测试；窗口前置沿用 G6 已验收的路径。
- 没有在 macOS 上验证。
- 没有 push，没有改远端、契约、检查器、台账或其它包。
