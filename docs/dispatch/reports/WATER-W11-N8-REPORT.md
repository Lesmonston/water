WATER-W11-N8 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w11-n8/docs/dispatch/reports/WATER-W11-N8-REPORT.md

实际执行者：Codex（GPT-6），未使用子代理。Windows x64；不代表 macOS 验证。2026-11-07。

工作树 F:/new/smaltalk/water/.worktrees/w11-n8，分支 worker/water-w11-n8。开工 HEAD 为 4e4118966b98f9ce20c560ca10f89b239847686c，干净；先跑工单第 4 节 baseline，通过。实现提交为 **f7cb9a965cc2cd189bcdc3fbb399640b64f3d1d3**，全部 final 均绑定该提交，报告与归档在后续独立提交中交回。提交身份仅在提交进程内设置为 Codex-GPT-6 <Codex-GPT-6@localhost>，未改 Git 配置、远端或历史，未 push、merge、rebase。

本次改动仅 7 个服务源文件及指定 tests/service_v1.rs；依赖、Cargo.toml、Cargo.lock、契约、检查器、其它包和台账均未改。

逐条交付：

| 工单 | 实现与验证 |
|---|---|
| 1.1 改名 | lib.rs 的服务错误、m35.rs 的特殊文件说明、quarantine.rs 的遗留原因、service.rs 的外部清理说明均改 Flick；另查到 conclusion.rs 复制线索中的 Water，同样迁移。src 中已无大写 Water。service_hardening 通过公开 Service::new 的错误验证 SERVICE_W11_RENAME。 |
| 1.2 新旧隔离名 | WindowsPlatform 查询新旧两个根；新移入缺省根为 .flick-quarantine，并显式把同一个根放进 QuarantineTarget.base，避免执行器默认值掩盖服务接线错误；假平台注册根仍优先。测试实际新移入，再把合成批次及记录转为旧名，重启服务后分别验证列出、打开、还原及永久删除。空间分布两个名字均标“隔离区”。 |
| 1.3 只列存在的根 | WindowsPlatform 和服务刷新均检查普通目录；缺失、普通文件、联接都不显示。测试无根、仅新、仅旧、双根，以及双根各有批次时页面、卡片、常驻入口总量一致。显示列表不再决定默认新移入能否创建根；缺省目标按固定盘登记判断。 |
| 1.4 声明优先级 | 用 FILE_NAMES 枚举范围根与范围内已信任声明的同目录候选；扫描结果一次收齐、按 ASCII 小写目录配对，旧名只生成 valid:false / MANIFEST_SHADOWED，无 hash、manifest 或内容读取，且不进设置的信任列表。旧的既有信任撤销并持久化。测试新单名、旧单名、双名、无效新声明不回退旧声明、独占锁住旧文件、交错目录与截断只报新名。 |
| 1.5 增长说法 | 同组 growth 存在时保留“还在长 / 已经不长了”；不存在时卡片和线索共用实际最近 14 天计数，覆盖 0、2 与时间缺失回退。 |
| 1.6 类别与摘要 | 类别、扫描进度及结果位置名为“你加的位置”；摘要追加所选体量最大的至多两个标题，稳定按体量及 ID 排序，用“、”连接。测试三组选取前二、取消最大后重排、仅余一组，以及新旧隔离名空间标签。其它类别摘要逻辑保持。 |
| 1.7 计时 | 原票面 3376、3833、3852、3981 行规模断言从 50 ms 改为 200 ms，原标记与失败消息保留；通用非写盘命令 50 ms 未放宽，未新增墙钟断言。 |
| 1.8 嵌套计划 | clean.rs 收齐符合资格及选择的条目后，按末尾补分隔符、ASCII 小写路径排序，去掉相同或被外层包含的条目，再计算组数、组体量、总量、按盘统计及两块确认摘要；保持原输入顺序和外层处理方式。先做去重再检查隔离可用性，避免隔离失败时退成只清内层。 |

嵌套主用例使用扫描真实产生的 node_modules 与其中的 __pycache__，通过公开 clean_prepare / clean_start 接真实执行器：双选直接清、双选隔离、内外两种混合方式、只选内层直接清与隔离共六种，均核对计划、确认框、结果和持久化记录。另在测试私有服务注入合成扫描元数据，通过公开准备入口核对内层先出现、ASCII 大小写别名、相同路径折叠及 node_modules-extra 兄弟目录保留；这组别名用例只验证准备，不声称执行验证。

检查命令统一从本工作树根运行：

`node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W11-N8 --mode <下表模式> [--final]`

| 时间前缀（UTC） | 模式 | 结果 |
|---|---|---|
| 08:53:35.885 / 26756 | baseline | 通过，首次 HEAD、干净状态、缓存与冻结输入通过；不编译产品。 |
| 08:59:03.177 / 15480 | lock | 通过，离线依赖检查；锁未变化。 |
| 09:06:11.294 / 32176 | check | 通过。 |
| 09:07:49.206 / 26228 | test | 11 过、1 失败：预列旧 UUID 标题断言漏迁移，产品已给新文案；精确迁移后继续。 |
| 09:12:10.730 / 32552 | test | 12 过。 |
| 09:15:14.113 / 25824 | check | 通过。 |
| 09:15:52.631 / 8440 | test | 12 过。 |
| 09:18:58.251 / 33308 | test | 12 过，覆盖最后新增边界。 |
| 09:21:27.331 / 31044 | check | 通过，随后提交实现。 |
| 09:34:53.562 / 31072 | red-nc1 | 通过负控门：测试退出 101，仅 m35_quarantine 失败，指定标记命中。 |
| 09:44:47.444 / 12976 | test | 恢复 nc1 后 12 过。 |
| 09:46:59.890 / 22120 | red-nc2 | 通过负控门：测试退出 101，仅 m35_scope_and_plan 失败，指定标记命中。 |
| 09:48:35.538 / 30580 | test | 恢复 nc2 后 12 过。 |
| 10:03:05.499 / 34040 | red-nc3 | 通过负控门：测试退出 101，仅 m35_clean_split 失败，指定标记命中。 |
| 10:05:15.114 / 30932 | test | 恢复 nc3 后 12 过。 |
| 10:07:22.430 / 17168 | check --final | 通过：格式、Clippy -D warnings、冻结输入及范围。 |
| 10:07:38.013 / 28808 | test --final | 通过：精确 12 个测试，0 失败、0 ignore、0 filtered；检查器的三条负控及原字节恢复审计通过。 |
| 10:09:24.607 / 36292 | real --final | 通过，只读真实体检，清理关闭。 |
| 10:11:20.555 / 26940 | archive | 通过：370 文件、10,961,963 字节；归档后独立核对每条哈希与字节数。 |

所有成功检查命令退出码均为 0；三个负控的被测 Cargo 命令退出 101，检查入口确认预期失败后退出 0。未出现计时失败，也没有因计时原样重跑。上表 test 重跑分别来自断言迁移、边界测试增加及负控恢复。

证据为 [ARCHIVE.json](../../acceptance/wave11/n8/ARCHIVE.json) 与其 receipts 子目录。每次检查的 result.json 带完整命令、退出码、源快照、哈希与日志。归档保留了控制器开工前留下的 08:35 baseline 失败与 08:36 baseline 成功；前者是 manifest 已记录的控制器冻结哈希陈旧问题，不是本执行者的一次失败 baseline，未删除这些历史证据。archive 自身的回执由检查入口在复制完成后生成，留在 .local，不另手工塞进归档。

负控与恢复：

| 负控 | 唯一生产变更 | 被捕获断言 | git checkout 恢复后的文件 SHA-256 |
|---|---|---|---|
| nc1 | quarantine.rs 缺省根 .flick-quarantine → .water-quarantine | SERVICE_W11_QUARANTINE: default new destination，实际旧根与期望新根不符。默认目标测试不执行移入，不触碰盘根。 | 210decf295df4952b0989779aafa274c7ece51c829f29e043a1c28c0dd89fc80 |
| nc2 | m35.rs 把遮蔽分支条件变为 false，旧声明走正常读取 | SERVICE_W11_DECL: old never read，实际 MANIFEST_UNREADABLE、期望 MANIFEST_SHADOWED。 | 59715b09628fc0d41ec52bdaff6e0ab3998fc82917d1b6016b5fa5cb1d00e7d3 |
| nc3 | clean.rs 把去重调用作用于 items.clone()，实际 items 不去重 | SERVICE_W11_NESTED: outermost only，实际 2、期望 1。 | 53e42cc7e93d52b7e21a592097709c6ce3dc305c71bad6c9bf53f5064610860e |

每次负控后立即 git checkout -- 对应单文件恢复、核对 Git diff 和 SHA-256、运行 test；没有修改负控期间的测试，没有编译错误或超时造红。final proofAudit 绑定了与最终实现完全相同的生产与测试哈希。

迁移的旧断言与夹具：

- 测试错误替身和两处错误期望：Water 服务暂时不可用。→ Flick 服务暂时不可用。；特殊名说明期望 Water 能删 → Flick 能删；趋势 note Water 以外的清理之后重新起算 → Flick 同句。均为精确字符串迁移。
- m14_conclusion_text 的 UUID 标题：已经不长了 → 最近 14 天新增 2 个；后续 opaque-segment 循环标题：已经不长了 → 最近 14 天没有新增。没有增长基准，且与相同组的线索数完全一致；未降低字符串核对强度。首轮只漏了源代码中转义双反斜杠的 UUID 字符串，随后补齐。
- 新移入的假平台默认根与 prepare/start/dedupe、两逻辑盘记录、已移入批次移走的夹具位置：.water-quarantine → .flick-quarantine。原有 foreign/locked 批次仍用 .water-quarantine，同时显式切回旧根登记，保留旧名永久删除和遗留重试覆盖；新增带可恢复记录的旧名还原、永久删除用例。
- 四条规模断言：50 ms → 200 ms，理由是工单 1.7 的明确要求；断言标记与失败信息没有改。

实现选择与边界：

- 新移入显式传 Some(root)，没有依赖执行器的缺省值；测试注册的 base 不存在时仍可创建，但被测试取消登记时照旧判不可用。
- 同盘同时存在新旧隔离根时，新根保留 qroot-盘符，旧根用 qroot-盘符-legacy 作为服务发出的不透明目标 ID，避免两条入口定位到同一路径；仅旧根存在时保留原 qroot-盘符。合成根照旧 qroot-tN，命令、字段与错误码未变。实际同盘双根的 ID 分支只静态核对，没有在真实盘根新建夹具来运行；本树测试覆盖双合成根入口可分别打开。
- 双名声明并存即移除旧 consent，以免日后移走新声明时静默恢复旧信任；不把旧文件解析后仅丢掉结果。遮蔽记录 size 为 0、hash/manifest 为 null；不读取其内容，MANIFEST_SHADOWED 只进入扫描记录。
- 嵌套仅对实际已选、符合原资格的候选去重；保留外层，保留原来的保护、跳过、确认令牌和过期校验。ASCII 同路径重复时保留按原候选顺序遇到的第一个，不新增处理方式接口。
- 工具小障碍：首次 PowerShell Get-Content 未显式 UTF-8，显示乱码后改用 -Encoding UTF8 重读；一次 Node -e 内联只读摘要因 PowerShell 引号传递失败，改用原生 PowerShell 读取 JSON。均未改变产品或检查工具。

真实冒烟：检查器使用私有 .local/w3-f1-real 新目录，ServiceConfig.clean_enabled=false；只扫描 common，未调用真实清理、还原、永久删除或查重，未开窗口、选择框或浏览器。stdout 只有以下聚合数据，路径与名字不进入冒烟摘要：

```json
{"cards":5,"clues":3,"conclusion_rows":13,"drives":4,"folds":3,"quarantine_cards":0}
```

未做或未验证：macOS、真实用户删除、生产竞态、真实拔盘、真实同盘双名隔离根操作；所有破坏性测试仅在本树本次随机新建的 .local 合成目录，沿用既有 Fixture 父目录与前缀复核后回收单个目录。未修改执行器。工单 1.9 的“直接清理已完成、随后隔离返回其它错误导致清理记录不保存”仍是遗留，本单未扩大范围修复。未运行额外原生窗口、选择框或浏览器；交回前确认本票 Cargo/Rust 测试和冒烟进程均已退出。

本报告表示执行者完成并提交，状态交由总控验收，不自行标 VERIFIED。
