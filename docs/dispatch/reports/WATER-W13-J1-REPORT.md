WATER-W13-J1 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w13-j1/docs/dispatch/reports/WATER-W13-J1-REPORT.md

## 提交与范围

- 实际执行模型：Codex（GPT-6，本会话未暴露更细的后端型号）；没有启动子代理或外部实现者。
- 工作树：`F:/new/smaltalk/water/.worktrees/w13-j1`；分支：`worker/water-w13-j1`。
- 首次 HEAD：`6b7703e84e8903d03a6c2ef0c0550187034717ac`，与 `water-w13-j1-base-20261108` 一致，开工时干净。
- 第一份实现提交：`c4ee5c7bc1b0bb7237465c00183188be11c3a48d`。
- 最终实现提交：`9b1fcab1559165edc4cb9573835601333f28a70c`。三个 final 均绑定此提交，运行前后工作树均干净；负控后没有再改产品或测试。
- 两份实现提交均为新增提交。未 merge、rebase、amend、reset、push，未改 git 配置、远端、台账、契约、检查器、其它包、依赖或锁文件。提交身份仅由提交进程的四个 `GIT_*` 身份环境变量设为 `Codex / Codex@localhost`。
- 实现实际改动五个文件：`packages/junk-scan/src/scan.rs`、`src/templates.rs`、`tests/scan_v1.rs`、`examples/real_smoke.rs`、`README.md`。回执和 archive 生成的证据另作提交。

## 逐条对照工单

1. **兼容联接不进索引**：私有 `Child` 新增 `attributes`，从 `DirectoryEntry.attributes` 原样传递；扫描起点则复用既有 `symlink_metadata` 的属性。`index_junction` 在支持标签判断、目标读取、10,000 项上限判断之前，排除同时带 `0x2` 与 `0x4` 的重解析点。不增加枚举、文件打开、系统函数或公开字段。单独隐藏、单独系统的联接仍索引。遍历与重解析点跳过路径保持原行为。
2. **引用只认条目本身或其内部**：删除 `is_proper_ancestor(final_target, item.path)` 分支，保留相等与 `is_proper_ancestor(item.path, final_target)`。联接本身位于条目内（或等于条目）的排除、按段比较、ASCII 不分大小写、最多八个 `referenced_by` 与排序均沿用原实现。`resolve_junctions` 不必修改：过滤后的索引已不含兼容联接，因此普通联接目标经过兼容联接时保留该文本终点。
3. **公开写法**：测试安装包名统一使用通用名字；移除测试说明里的 M12/M13 任务沿革，两个私有辅助函数改为功能名；`src/templates.rs` 注释改为描述后缀语法；README 阶段标题改为功能标题，并说明新索引与引用语义。全包检索未再发现本机用户名、项目工作路径、私人邮箱、私有文档引用或完整工单号。契约要求的测试标记（包括 `SCAN_W13_JUNCTIONS`）保留。
4. **测试仍精确五个**：新增断言全部加入 `m35_junctions_overview`；属性辅助函数不增加测试数量。通过实际 `scan_full` 入口检查相等/内部引用、上级目标零引用、双属性排除、两个单属性保留、兼容联接不参与链解析、孤立兼容联接仍记精确一次 `reparse_skipped`、仅测量路径不入索引且不跟入、兼容联接作为起点不入索引且保留原 `base_reparse` 问题。
5. **夹具属性**：经 `cmd /c attrib ... /l <联接>` 仅修改本树 `.local/w2-b-fixtures/fx-*` 中本次新建的合成联接，并核对联接的属性精确位及目标属性未变。夹具继续由既有 `Fixture::drop` 校验父目录与前缀后，仅回收本次创建的目录。测试完成后该夹具父目录下剩余目录数为 0。
6. **真实冒烟**：原输出键保留；保留已有 `junction_count`，新增 `hidden_system_junction_count`。逐个 `symlink_metadata` 只读查索引联接属性，读取失败不会被悄悄算成零；计数必须精确为零，否则示例失败。没有输出路径、条目名或进程命令行。

`ScanResult`、`Item`、`ScanExtras`、`Junction` 的字段与 JSON 形状完全未改。变化只涉及私有扫描结构与示例汇总字段。

## 旧断言与测试数据迁移

| 原值 | 新值 | 原因与强度 |
|---|---|---|
| `referenced_by` 为 chain、direct、inside-target、parent-target 四条 | chain、direct、inside-target 三条 | W13 不再把最终目标包住条目视为引用；继续精确核对排序后的完整列表，说明文字改为 equal/inside 与 parent-target excluded |
| `referenced_count = 4` | `referenced_count = 3` | 与上述完整列表同步，仍断言精确值 |
| 原联接索引总数 `7` | `10` | 原七条保留，新增五条中双属性的两条被过滤，仅两个单属性和一个普通链联接进入；继续断言精确值 |
| 四个安装包样本中的真实软件/项目名 | `DemoApp-setup.exe`、`SampleTool-0.0.783.exe`、`ServerKit 5.1.0.exe`、`UtilitySuite_installer.exe` | 保留 setup、版本号、空格、installer 等匹配形状；原精确四项计数、逐项命中与反例断言全部保留 |
| 测试描述中的 M12/M13 前缀与两个 m13 辅助函数名 | 描述去掉阶段前缀，辅助函数为 `cluster_exclusions`、`installer_patterns` | 只改公开措辞，不改原断言条件、测试名称或数量 |

没有删除测试、ignore、过滤、拆分测试或放宽时限。新增的 parent-only 条目另精确断言零引用；属性专用条目精确断言两条单属性引用；孤立兼容联接条目再精确断言零引用，避免由其它联接代为满足断言。

## 检查命令、结果与证据

全部正式检查都从本工作树根执行，公共前缀如下；下表的参数与此前缀合起来即为完整命令：

```powershell
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W13-J1
```

下表文件名均位于 `docs/acceptance/wave13/j1/receipts/`，每份 result 内还记录了具体 cargo 参数、退出码、源码哈希与日志文件名。

| 参数 | 退出码/结果 | result 文件 |
|---|---|---|
| `--mode baseline` | 0，通过；精确基线与离线环境就绪 | `2026-11-07T16-31-40.251Z-35288-baseline-result.json` |
| `--mode check` | 1，首次格式检查失败，随后格式化修复 | `2026-11-07T16-42-22.410Z-37448-check-result.json` |
| `--mode check` | 0，fmt/clippy 通过 | `2026-11-07T16-43-02.659Z-11588-check-result.json` |
| `--mode test` | 1，新增跳过断言错误限定为 cache 组，4/5 通过；后续独立夹具改为精确核对真实归属 | `2026-11-07T16-43-39.813Z-15588-test-result.json` |
| `--mode test` | 0，5/5 | `2026-11-07T16-46-18.461Z-38112-test-result.json` |
| `--mode red-nc1` | 0，观察到预期测试退出 101 | `2026-11-07T16-48-15.051Z-30988-red-nc1-result.json` |
| `--mode test` | 0，5/5 | `2026-11-07T16-49-13.244Z-25248-test-result.json` |
| `--mode red-nc2` | 0，观察到预期测试退出 101 | `2026-11-07T16-50-21.922Z-36128-red-nc2-result.json` |
| `--mode test` | 1，初次手动恢复比较方向有误，4/5；随后 checkout 原字节恢复 | `2026-11-07T16-50-58.734Z-26520-test-result.json` |
| `--mode test` | 0，5/5，已恢复第一份实现提交 | `2026-11-07T16-52-15.198Z-36192-test-result.json` |
| `--mode test` | 0，5/5，加入孤立联接/测量/起点断言后 | `2026-11-07T16-56-23.894Z-37860-test-result.json` |
| `--mode lock` | 0，依赖策略通过，没有生成或改动锁文件 | `2026-11-07T16-56-55.885Z-26820-lock-result.json` |
| `--mode red-nc1` | 0，最终测试字节，目标断言红 | `2026-11-07T16-57-33.965Z-21804-red-nc1-result.json` |
| `--mode test` | 0，checkout 原字节后 5/5 | `2026-11-07T16-57-46.533Z-39700-test-result.json` |
| `--mode red-nc2` | 0，最终测试字节，目标断言红 | `2026-11-07T16-58-15.690Z-37320-red-nc2-result.json` |
| `--mode test` | 0，checkout 原字节后 5/5 | `2026-11-07T16-58-29.867Z-8740-test-result.json` |
| `--mode red-nc3` | 0，最终测试字节，目标断言红 | `2026-11-07T16-58-59.744Z-38840-red-nc3-result.json` |
| `--mode test` | 0，checkout 原字节后 5/5 | `2026-11-07T16-59-08.623Z-39300-test-result.json` |
| `--mode check --final` | 0，干净提交上的 fmt/clippy 全目标通过 | `2026-11-07T16-59-33.206Z-8656-check-result.json` |
| `--mode test --final` | 0，5 passed / 0 failed / 0 ignored / 0 measured / 0 filtered；8.30 秒；三条 proofAudit 全过 | `2026-11-07T16-59-50.274Z-38620-test-result.json` |
| `--mode real --final` | 0，只读真实冒烟通过 | `2026-11-07T17-00-18.495Z-33868-real-result.json` |
| `--mode archive` | 0，生成 376 份归档内容，共 7,746,653 字节 | archive 自身回执在 `.local/checks/WATER-W13-J1/2026-11-07T17-02-20.554Z-30044-archive-result.json` |

归档入口是 `docs/acceptance/wave13/j1/ARCHIVE.json`，逐份列出原文件、归档文件、字节数和 SHA-256；另有 archive 自动生成的 `.gitattributes`。归档保留所有旧轮次与失败日志，未挑选隐藏失败。其中 `2026-11-07T16-14-06.307Z-32144-baseline-result.json` 是本次会话开始前已存在的派前证据，未冒充本会话新跑。

## 最终三条负控

每条仅修改实际被调用的 `src/scan.rs` 一处，测试文件保持不变；red 模式记录测试退出 101，而检查器验证预期失败后自身退出 0。未用编译错误、超时、测试开关或修改测试造红。

| 负控 | 临时改变 | 实际失败断言 | 恢复 |
|---|---|---|---|
| nc1 | 移除双属性过滤项 | `SCAN_W13_JUNCTIONS: compatibility links are excluded from index` | `git checkout -- packages/junk-scan/src/scan.rs`，diff 空，立即 test 5/5 |
| nc2 | 在原引用谓词中恢复上级目标分支 | `SCAN_W13_JUNCTIONS: equal/inside, parent-target excluded, own link excluded` | 同上，立即 test 5/5 |
| nc3 | 把双属性同时存在改为任意一个存在 | `SCAN_W13_JUNCTIONS: compatibility links are excluded from index`（误滤两个单属性） | 同上，立即 test 5/5 |

最终 test 的 `proofAudit` 逐条绑定上表三份最新 red 与其紧接的绿色恢复测试，并复核源码快照 SHA-256。前一份实现提交上做过的 nc1/nc2 不充当最终证据；因为后续扩展了测试，已经在最终测试字节上重做全套。

- 恢复后的 `src/scan.rs` SHA-256：`95da1b9272ba2ad34e83711ab4440aabc5c6d226139491c06b835c7fd423a389`。
- 最终 `tests/scan_v1.rs` SHA-256：`8c612050bd9bcc7a18a292e1247f607c9ab7bcf45e7866b6caa594c50283e4db`。

## 真实冒烟结果

全部只读，按现有 real-plan 模板、现有 known folders 与用户目录空间概览执行；没有扩大模板、读取普通文件内容或执行清理。下面只有计数和状态；完整组级汇总在 real 回执中。

| 部分 | 结果 |
|---|---|
| 普通扫描 | completed；visited_entries 276,501；12 组；20,458 ms |
| 完整扫描 | completed；visited_entries 276,497；20 组；14,509 ms |
| 联接索引 | junction_count 10；hidden_system_junction_count **0**；junctions_truncated false |
| 附加结果 | cluster_count 8；declaration_count 0 |
| 空间概览 | completed；visited_entries 674,498；file_count 577,264；top_count 10；others_count 229；59,331 ms |

real 检查本身从 `2026-11-07T17:00:18.496Z` 到 `2026-11-07T17:01:57.580Z`；cargo 示例退出 0。现有 ordinary/full 分别扫描，动态真实目录导致两次访问计数不同，未声称二者是同一冻结快照。命令输出的路径检查通过。

## 自主选择、环境小障碍与未验证项

- 选择在唯一 `index_junction` 入口过滤，而不是分别修改搜索/测量/起点三条调用链；这样改动更少，属性来源仍是已有结果，不增加公开接口。`extras.rs`、`native_windows.rs` 无须改动。
- 新属性夹具位于原 `loc` 下的独立 `compat` 子目录，原根扫描会枚举到它，因此按票面预列把总索引数从 7 精确迁移为 10；孤立 skip、measurement 和 root 用额外独立子目录，避免其它联接满足新增断言。
- 先试用了工作树内相对路径的旧检查器，得到 `Unknown task`，未进入业务检查；随后立即改为票面指定的主目录绝对路径检查器，baseline 通过，后续所有正式门均使用它。未修改或复制检查器。
- shell 的 PATH 没有 cargo，直接调用失败后改用检查器已确认的 Rust 1.95.0 cargo 绝对位置格式化；没有安装、下载或改全局 PATH。一次辅助文本编辑先因 python 不存在失败、再因 PowerShell 传给 `node -e` 的引号被剥离失败，均在写入前报错；之后用 .NET 的 UTF-8 文件读写完成。回执本身由补丁工具直接写为 UTF-8，并读回复核。
- 初版 skip 断言误写组归属和一次 nc2 手动恢复方向错误都已如实保留日志并修复；最终孤立夹具精确验证 `isolated-search / reparse_skipped / count=1`，最终所有负控按 checkout 恢复流程重新跑完。
- 没有计时类失败或计时重跑，没有修改任何墙钟上限。cargo 全部离线、jobs=1、测试线程 1、私有 target；重负载检查串行执行，执行前仅按进程名观察机器负载，未输出任何进程命令行。
- 原生窗口 0、选择框 0、浏览器 0。没有创建后台服务；结束时已观察本票 real_smoke 进程退出，未发现残留扫描测试进程，没有终止其它票进程。
- 未进行真实删除、移动、属性修改或清理；只有应用后续用户发起的真实清理才能验证生产清理行为。未验收服务/UI 集成、生产竞态、10,000 项实机压力场景或 macOS/M1。容量上限前过滤与目标读取前过滤经控制流审阅，未把它们描述为系统调用追踪或容量压力实测。
- 本回执表示执行者提交完成，等待总控独立验收；没有自行更新任何任务状态。
