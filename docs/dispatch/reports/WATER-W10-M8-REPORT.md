WATER-W10-M8 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w10-m8/docs/dispatch/reports/WATER-W10-M8-REPORT.md

当前结论见本文末尾“补单 01”。下面至原证据表结束为 `67975926` 的首轮受阻历史，保留原文；其“没有实现、没有测试、停止”等陈述只指首轮，不代表本次续做状态。

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

## 补单 01

实际模型：Codex GPT-6。续做起点 `67975926157a2385b2b5715c55cd95024b1b7c32`，同一工作树与 worker/water-w10-m8 分支，开工干净；依补单未重跑 baseline。实现提交 **ef552f5a6ec8753920503143cab439d63c385916**，之后的交付提交仅含本回执与归档证据。原受阻提交、证据和本报告受阻原因均保留，未改历史。

### SPEC 第 1～5 节与补单对照

1. 新建独立 water-dup-finder 包、workspace、lib、显式 test/example，edition 2024/rust-version 1.95，publish=false、四项自动发现关闭。只有冻结 serde/serde_json 两个依赖，无 dev/build 依赖或 build 脚本；lock 由检查器离线生成。lib deny unsafe，所有非原生模块 forbid unsafe；原生模块 deny unsafe_op_in_unsafe_fn。系统函数仅 native_windows.rs 中的 GetFileInformationByHandleEx 和 GetVolumeInformationByHandleW，没有新函数；生产只读，无写、建、删、进程或网络。
2. 导出 CancelFlag、DupOptions/Default、DupObserver、DupProgress、find_duplicates、全部结果类型、JSON 和 sha256_hex。根1～8且互不包含，prefer≤8、protected≤1024、scan_id字符数1～64；默认最小1MiB，0字节始终排除；字节字段十进制字符串，时间UTC RFC3339，结果结构拒绝未知字段。非Windows discovery返回Unsupported，未做该平台实测。
3. 深度优先、名字排序遍历；根本身和祖先从盘根向叶核对，拒绝重解析点与保留目录；条目跳过全部三类离线/Recall属性，打开后再查类9。只对同大小候选打开，只读 share_mode(7)、OPEN_REPARSE_POINT|SEQUENTIAL_SCAN。类18文件ID按16字节内存顺序小写十六进制；卷号只取卷查询的32位序列号、8位大写；类1 NumberOfLinks保留真实链接数。按身份合并，最多8条别名；受保护别名也参与代表路径选择。
   前64KiB SHA筛分，只有相同前缀的不同身份再从头完整哈希；完整阶段重开后先核同一身份及上次大小/修改时间，再在该已打开句柄读取前后都用 **类1 EndOfFile 与补单新增类0 LastWriteTime** 复查，变化记changed并移出结果。**DupCopy.created和mtime全程取打开时类0的CreationTime/LastWriteTime**；不用目录时间混搭，不调用File::metadata。读取按最多1MiB块，每块检查取消，不保留内容。取消清空groups；列目录每1000文件、读取每16MiB和每换文件报告进度。
   hashed_bytes记录实际读取量，包含前缀与完整两遍，不含未读取的硬链接别名；bytes_to_hash先给保守上界，结束时等于实际读取量。文件数上限2000000，超过为budget_exhausted且继续比较已经列到的候选。
4. 按保护→偏好→原始修改时间更早→无导出尾巴→路径字典序排序，keep_index恒0；首份及所有保护份removable=false，没有默认勾选字段。普通/Verbatim Disk与UNC路径在保护、偏好和根重叠比较前统一，比较不受路径前缀或斜杠写法绕过；逐段判断目录边界。
5. group_id使用完整哈希前16位与大小；按可腾出字节数数值降序、再hash排序，最多10000组并记录groups_truncated；issues最多200条、按路径排序。same_name_different按同大小桶里的不分大小写名字→不同身份→内容签名计组，包含前缀不同与末字节不同的两个反例。reclaimable_bytes按契约公式，保护份不计入；found_bytes为已确认组的累计可腾出字节数。结果只含允许的元数据、身份与摘要，无内容。

### 四测、独立校对与只读复审

- dup_contract：三份同内容不同名仅一组三份；两类同名同大小反例均不成组，same_name_different=2；身份格式与cmd /c vol的32位序列号一致；硬链接单独不成组、加普通副本后恰好两份且有别名/真实link_count，两条硬链接在独立扫描中的身份相同；联接与四个保留目录排除；空/小文件计数；保留五级顺序逐级隔离断言；两份均保护时可腾出0。另覆盖根与祖先联接、保留祖先和Verbatim路径保护/偏好/根重叠。
- dup_skips_and_change：PowerShell对本次夹具设置Offline并核属性生效，不读且计offline；独占打开夹具得到locked；观察者在完整读取中等长改写并改变mtime，changed且稳定副本仍可成组；两份fsutil设置稀疏标记后set_len为67108865字节、仅最后一字节不同，不成组；hashed_bytes精确为 **134348802**（两份完整逻辑内容加两份65536字节前缀）。
- dup_cancel_and_budget：1000文件listing进度、第一次hashing回调取消、groups为空、未读内容；重叠/等价根和各数量/scan_id边界；非空结果JSON往返与未知字段拒绝。200万文件预算分支已实现，但没有实际造200万个文件测试。
- dup_sha256_vectors：空串、abc、448位标准消息、55/56/63/64/65字节边界、百万a，均固定独立摘要；边界摘要在实现前另用.NET SHA256计算。分块完整读取另由稀疏文件末字节用例覆盖。

只读辅助 m9_readonly_review 审阅契约/补单及实现和测试，没有写文件、运行检查或取得执行权限。指出的祖先检查顺序和Verbatim路径比较问题已在实现提交前修正并加入回归；最终只读复审未发现新的实质问题。

所有夹具都在本树.local中新建water-w10-m8-<pid>-<时间>目录内，包括联接目标、硬链接、稀疏、Offline和锁定文件。结束时先清自己设置的Offline标志、逐个移除自建联接，再校验绝对父目录及名称前缀，只回收本次目录。归档时这种夹具目录剩0个；没有对真实数据做删除或属性修改。

### 三条有效负控与恢复

只改src/scan.rs的生产承重点，测试字节不变；每条red之后立即git checkout恢复该文件并完整四测变绿：

| 负控 | 生产变异 | 目标失败 | red回执UTC时间 | 恢复绿测UTC时间 |
|---|---|---|---|---|
| nc1 | digest返回值改为仅由文件大小生成的伪摘要，内容不再决定分组 | DUP_GROUPS: only actual content duplicates；稀疏末字节断言也失败 | 09:41:18.044 | 09:41:43.078 |
| nc2 | 身份索引查询改为永不命中，硬链接不再合并 | DUP_GROUPS: hard links alone are one file | 09:42:39.625 | 09:43:13.620 |
| nc3 | Offline位掩码去掉0x1000，另两种Recall位不变 | DUP_SKIPS: Offline counted | 09:43:54.666 | 09:44:09.543 |

三次恢复、最终check/test/real的productionHash均为 **2c9897a3f16ae8fb4e73f450574997daa08bcc6854b5295db802f829b279796d**；测试哈希均为 **c709adb56605a52821069d12c3920ba8dbfed1cdf7280c2c55b4857266649d84**。逐文件SHA-256与红/绿源码快照在各result.json和source-*.txt中。final test的proofAudit核对三条red与其后的即时完整绿测，通过。

恢复后的scan.rs文件SHA-256为 **009814b9bc529e011c0a5094e88d9d9b6d0c78361d8a5e0f8bf6c4650f8f49f4**。

### 真实只读冒烟与未验证项

只对主仓库docs/运行一次real --final（默认最小1MiB）。输出仅一行：

```json
{"candidate_files":289,"files_listed":61677,"groups":26,"reclaimable_bytes":"324257495"}
```

未输出路径、名字或内容；这是候选可腾出估算，没有清理、移动或释放真实空间。没有原生窗口、选择框、浏览器、联网或依赖下载；测试命令均已退出，没有自有后台进程。未接服务/桌面/隔离执行器；与执行器身份的逐字集成验收仍归总控。macOS、外部真实用户位置、并发目录替换竞态及200万/10000组/200条issue上限的实体压力测试未验证，不冒充已验收。

### 检查命令与开发期记录

所有checker命令从本树根运行，前缀为 `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W10-M8`，下表记录本次补单的每次后缀、状态及回执。另用固定1.95.0 cargo fmt，提交前git diff --check通过。Cargo离线、私有target、单构建任务；Rust测试精确四个，单线程、无ignore或过滤。没有旧断言变更。

首次check因Todo枚举变体大小差异被Clippy拒绝，改为Box<DirEntry>后通过；首次test因本次夹具路径混合分隔符导致字面路径与观察者目标不匹配，修正夹具构造后通过。未放宽断言、超时或检查器；这些早期失败原样归档。完成后archive共有244个条目、2021179字节，旧受阻证据保留。
| 回执（UTC时间文件名） | 命令后缀 | 状态 |
|---|---|---|
| 2026-11-05T09-33-53.655Z-21216-lock-result.json | --mode lock | passed |
| 2026-11-05T09-33-57.511Z-6424-check-result.json | --mode check | failed |
| 2026-11-05T09-35-08.131Z-29232-check-result.json | --mode check | passed |
| 2026-11-05T09-35-12.115Z-33616-test-result.json | --mode test | failed |
| 2026-11-05T09-36-32.734Z-33616-test-result.json | --mode test | passed |
| 2026-11-05T09-39-10.532Z-19632-check-result.json | --mode check | passed |
| 2026-11-05T09-39-14.740Z-21052-test-result.json | --mode test | passed |
| 2026-11-05T09-41-18.044Z-9436-red-nc1-result.json | --mode red-nc1 | passed |
| 2026-11-05T09-41-43.078Z-29332-test-result.json | --mode test | passed |
| 2026-11-05T09-42-39.625Z-28148-red-nc2-result.json | --mode red-nc2 | passed |
| 2026-11-05T09-43-13.620Z-26324-test-result.json | --mode test | passed |
| 2026-11-05T09-43-54.666Z-18276-red-nc3-result.json | --mode red-nc3 | passed |
| 2026-11-05T09-44-09.543Z-19632-test-result.json | --mode test | passed |
| 2026-11-05T09-44-51.168Z-31644-check-result.json | --mode check --final | passed |
| 2026-11-05T09-44-54.685Z-19912-test-result.json | --mode test --final | passed |
| 2026-11-05T09-45-20.369Z-29576-real-result.json | --mode real --final | passed |
| 2026-11-05T09-46-22.750Z-24440-archive-result.json | --mode archive | passed |
