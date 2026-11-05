WATER-W10-M8 任务受阻，任务报告在 F:/new/smaltalk/water/.worktrees/w10-m8/docs/dispatch/reports/WATER-W10-M8-REPORT.md

实际模型：Codex GPT-6。本组按 M9 → M3 → M8 顺序执行：前两单已各自完成产品/证据提交并通知后，才读取本单、运行本单 baseline。没有跳单、跨树实现、merge、push 或改写历史。

工作树 F:/new/smaltalk/water/.worktrees/w10-m8；分支 worker/water-w10-m8；首次 HEAD f93afb8e3c5cf4114927fe2ab6c14dbb033c7ffe，开工干净、分支正确。本单没有实现提交；本回执与 baseline 证据是本单唯一新增提交内容。

## 受阻原因：同一句柄修改时间复查没有获准的读取入口

冻结 SPEC `contracts/m35-v1/DUP-M35.md`：

- 第10行：FFI 限 `GetFileInformationByHandleEx` 的类1 FileStandardInfo、类9 FileAttributeTagInfo、类18 FileIdInfo，以及只取卷序列号的 GetVolumeInformationByHandleW。
- 第11行：“文件系统只用” read_dir、DirEntry::metadata/file_type、OpenOptions 只读打开及 Read；未包括对已打开 File 的 metadata()。
- 第56行：“读完从同一句柄再读一次（FileStandardInfo 与修改时间）”，大小或修改时间变化都必须移出结果并记 changed。

类1的 FileStandardInfo 只有分配大小、文件大小、链接数及标志，不提供修改时间；类9/18及卷序列号也没有修改时间。DirEntry::metadata 基于目录项/路径，不能证明复查的是已经打开的那个文件，无法代替“同一句柄”。

仓内现有实现可静态复核：`packages/junk-clean/src/native_windows.rs:95` 的 FileBasicInfo 含 last_write；`:103` 的 FileStandardInfo 不含时间；`:345`～`:353` 的 write_time 明确通过 `info(handle, 0, ...)` 查询。类0恰好不在 M8 允许列表中。工单准读的 junk-scan 原生模块通过目录枚举取得时间，也不能解决同一候选文件句柄的复查要求。

因此当前不能同时遵守第1节的精确白名单和第3.6节的强制安全行为。按 W10-M35-WORKER-RULES 第2节“契约冲突或缺东西时写受阻回执，不要自行变通”，本单停在实现前。没有扩大信息类白名单，没有使用未列出的 File::metadata，没有把按路径复查或只比大小冒充同一句柄修改时间复查。

## 所需最小编号补充单

建议总控明确允许现有 `GetFileInformationByHandleEx` 增加 **类0 FileBasicInfo，仅查询**，继续限制在 native_windows.rs；无需新 FFI 函数，可在同一已打开句柄上取得创建/修改时间。另一可选方案是明确允许已打开 File 的 metadata()。

由总控统一修订受影响工单/冻结契约及清单，并指定从本受阻回执提交继续的基线后，执行者才可恢复。本回执仅提出最小补充，不修改任何契约、检查器、台账或其它包。

## 已做与未做

已按票面读取本规则与 SPEC、ADR-019、第十波计划第58/66行及 junk-scan/src/native_windows.rs，并只读参考上面的执行器结构与查询以核实冲突。只读辅助 m9_readonly_review 对同一冲突作了独立静态复核，没有写文件、运行检查或取得实现权限；没有联网。

本单没有新建 packages/dup-finder、Cargo.toml、锁文件、生产代码、测试或物理夹具。没有旧断言变化；没有测试、负控或 final，故没有恢复哈希、实现 SHA 或可报告的产品成功。没有对真实 docs/ 查重，没有读取文件正文，没有真实清理、窗口、选择框、浏览器或自有后台进程。

仅完成以下环境/归档检查，不能视为产品验证。统一命令前缀：`node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W10-M8`，均在本单工作树根执行。

| 命令后缀 | 结果 | 回执（UTC 文件名） |
|---|---|---|
| --mode baseline | passed；环境和冻结输入就绪，不含产品验证 | 2026-11-05T09-06-35.989Z-30364-baseline-result.json |
| --mode archive | passed；原字节归档 baseline 证据 | 2026-11-05T09-07-31.854Z-25968-archive-result.json |

证据目录 `docs/acceptance/wave10/m8/` 由 archive 生成；也保留总控此前08:18的预检 baseline，明确不是本次产品测试。后续工作在此停止。
