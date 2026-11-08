WATER-W14-J1 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w14-j1/docs/dispatch/reports/WATER-W14-J1-REPORT.md

2026-11-08。GPU 缓存例外、真实冒烟计数和两条测试措辞均已完成。此前的数据来源问题已按用户转贴的总控答复解决：允许在现有扫描范围内独立只读验证，不加公开接口、不改契约。最新真实冒烟看见 10 个兼容联接，跳过 10 个；三个 final 均通过。

## 身份与提交

- 实际执行者：Codex，基于 GPT-6；会话未提供更细的模型版本标识，不沿用 manifest 中的预设模型名。没有子代理。
- 工作树：`F:/new/smaltalk/water/.worktrees/w14-j1`。
- 分支：`worker/water-w14-j1`。
- 首次 HEAD：`d692bd60cd8ab3fe4d0201afacd8a29fcfc8265a`，与 `water-w14-j1-base-20261108` 一致，开工时干净。
- 最终实现提交：`b341f5c1beb8795148807bcd0bc006f0be9cd538`。此前实现为 `f5abfbe0e91110e2acc61920b6bb05fbe97c91ac`，首次受阻回执为 `fa2244c4d39e7c0ae38a948da3200a083dcf034f`；续做时仍在该干净 HEAD，没有改写这些提交。
- 两次实现累计只改 `packages/junk-scan/src/scan.rs`、`examples/real_smoke.rs`、`tests/scan_v1.rs`、`README.md` 四个文件。续做只改示例与 README，src/tests 原字节保持。报告与检查器生成的证据另行提交。
- 提交身份通过当前进程的四个 `GIT_AUTHOR_*` / `GIT_COMMITTER_*` 变量设为 `Codex <codex@localhost>`；没有修改 Git 配置、远端或已有历史，没有 push、merge、rebase、reset、amend。

## 总控答复与实现方式

本项按本会话中用户转贴的总控答复实现：

> 选“允许独立只读验证”，不加公开接口，不改契约。……逐个用 std::fs::symlink_metadata 只读读属性，不跟进去、不读内容、不新增系统函数；存在且同时带隐藏与系统属性的计入“看见”，其中不在 extras.junctions 里的计入“跳过”。输出两个计数，要求“跳过”等于“看见”；“看见”为 0 时不判失败，但在输出里写明，由总控验收时看数。

`examples/real_smoke.rs` 的私有函数 `compatibility_junction_counts` 从已校验计划的各目标 `base`/`root` 及示例原有的 user-profile overview 根确定范围；不把 `hard_guards` 当作扫描根。由于 `Match` 类型没有公开导出，使用现有 `Serialize` 实现取 `base`/`root`，没有修改库公开接口。

候选严格使用答复列出的用户目录下 8 个名字和 AppData\\Local 下 3 个名字，经过按段、不分 ASCII 大小写的范围检查及去重；只有实际扫描根为盘根时才加入该盘的 `Documents and Settings`。本次真实计划没有盘根目标，保护名单里的盘根不会导致该候选被读取。候选只调用 `symlink_metadata`，要求重解析点位、隐藏位和系统位同时存在（属性掩码 `0x406`），不把同名普通目录算作联接。

输出 `hidden_system_junction_seen_count` 和 `hidden_system_junction_skipped_count`，后者按 ASCII 不分大小写比较完整路径、不在索引才计数，断言两数相等。`hidden_system_junction_observation` 明确为 `none_seen` 或 `seen_and_skipped`；零观测不失败，读不到元数据不计数。原有不可用重读计数与索引零断言保留。

此计数是总控指定的独立元数据观察与索引对照，不是对汇总 `Issue` 逐路径归因。最初受阻的原因及现场保留在 `fa2244c4` 的回执和旧证据中；当前不再受阻。

## 工单逐条对照

| 条目 | 当前结果 |
|---|---|
| 1.1 GPU `cache.db` 例外 | 已完成。先按现有方式把名字和路径转为 ASCII 小写，只对精确文件名 `cache.db` 加例外；使用 `file_name(parent)` 判断直接父目录的七项白名单。没有文件内容读取。 |
| 1.1 三类保护 | 已完成。其他数据库名、更深一级的 `cache.db`、其他父目录下的 `cache.db` 仍计为贵重；原有其它保护及排除规则未改。 |
| 1.2 已索引联接重读失败 | 已完成。`symlink_metadata` 失败时跳过该条，不再 `expect`；计入输出字段 `unavailable_indexed_junction_count`。字段使用 unavailable，因为错误不一定能证明对象已经删除；处理范围与工单要求的“读不到元数据”一致。 |
| 1.2 原索引零断言 | 已保留，仍要求 `hidden_system_junction_count == 0`。 |
| 1.2 看见并跳过计数 | 已按总控答复完成独立只读验证，最新实测看见 10、跳过 10，输出 `seen_and_skipped`，相等断言通过。 |
| 1.3 两条措辞 | 已完成，仅换成现有断言实际检查的描述；布尔条件不变，隔离夹具精确计数断言保留。 |
| 1.4 公开前写法 | 已检查修改内容及包的 src/tests/examples/README。新增内容无本机用户名、真实用户路径、邮箱或私有派单/验收引用；测试用动态合成夹具。现有 `F:\\synthetic` 为虚构路径，不是本机项目路径。 |
| 第 2 节测试 | 在既有 `m35_rules_names` 中新增独立夹具，测试函数名和个数均未改。 |
| 第 3 节负控 | 三条均在真正调用的 `valuable` 处改坏；均以 `SCAN_W14_GPU` 失败，每条恢复原字节后立即跑全套 5 测变绿。 |
| 第 4 节门与归档 | baseline、lock、check、test、三个负控及恢复、check/test/real 三个 final、archive 均已执行，详见下节。 |
| 第 5 节边界 | 只改白名单四文件和本报告/归档证据；无 Cargo.toml/Cargo.lock、其它包、检查器、契约、台账变更。未新增系统函数。窗口、选择框、浏览器均为 0。 |

新增 GPU 夹具先放七个缓存文件：七种父目录各一个，文件名为 `CaChE.Db`，其中父目录 `sHaDeRcAcHe` 也混合大小写。通过公开 `scan` 路径核对：条目数 1、文件数 7、`valuable_count == 0`、`valuable_names == []`。再添加 `GPUCache\\index.db`、`GPUCache\\sub\\cache.db`、`Other\\cache.db`，精确核对文件数 10、贵重数 3，以及按序的完整三个相对名字。

原 `SCAN_M35_NAMES` 的 14 个贵重文件、8 个保留名字等断言全部不变。

## 旧断言迁移与自主选择

| 原文/原值 | 新文/新值 | 理由 |
|---|---|---|
| `SCAN_W13_JUNCTIONS: hidden-system links remain skipped` | `SCAN_W13_JUNCTIONS: shared fixture records at least one reparse skip` | 原条件只检查共享结果存在任意 `reparse_skipped`，不能逐联接归因。只改措辞；独立夹具中 `isolated-search` 的跳过计数仍精确等于 1。 |
| `SCAN_W13_JUNCTIONS: isolated hidden-system link does not use index capacity` | `SCAN_W13_JUNCTIONS: isolated hidden-system link leaves an empty, untruncated index` | 原条件实际检查索引为空且未截断，单个联接不能证明容量边界。现有公开设置没有降低 10,000 上限的入口，采用工单允许的保守措辞方案。 |

两条断言的求值表达式均未改，未降低断言强度。没有更改其它旧断言的预期值。GPU 测试选择独立夹具目录，避免迁移旧夹具计数。README 补充名字例外、属性重读失败和独立观察的行为及限制，没有写入私有流程。

首次 PowerShell 读文件使用系统默认编码出现显示乱码；立即用 `Get-Content -Encoding UTF8` 和 UTF-8 控制台重读，未写回任何材料。报告由 UTF-8 文件编辑接口写入，并在提交前完整读回检查。

## 命令与证据

所有检查从指定工作树根目录执行，公共前缀为：

```powershell
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W14-J1
```

下面“参数”逐行接在此前缀后，就是实际检查命令。receipt 均在 `docs/acceptance/wave14/j1/receipts/`，日期均为 `2026-11-08`；为便于定位，表中保留完整文件名。检查器为负控预期的 Cargo 101 退出码判定成功，表中退出码是检查入口自身的退出码。

| 参数 | 退出码 / 结果 | receipt |
|---|---|---|
| `--mode baseline` | 0 / passed，干净基线 | `2026-11-08T08-40-02.172Z-37776-baseline-result.json` |
| `--mode lock` | 0 / passed，离线依赖核对，无锁变更 | `2026-11-08T08-40-34.015Z-23288-lock-result.json` |
| `--mode test` | 1 / 预期先红：旧实现计 7，断言要求 0；其它四测通过 | `2026-11-08T08-44-04.782Z-5468-test-result.json` |
| `--mode check` | 0 / fmt、Clippy 全过 | `2026-11-08T08-46-03.093Z-16544-check-result.json` |
| `--mode test` | 0 / 5 passed | `2026-11-08T08-46-35.365Z-25024-test-result.json` |
| `--mode red-nc1` | 0 / 指定失败已观测 | `2026-11-08T08-48-07.017Z-21088-red-nc1-result.json` |
| `--mode test` | 0 / nc1 原字节恢复后 5 passed | `2026-11-08T08-48-48.987Z-25104-test-result.json` |
| `--mode red-nc2` | 0 / 指定失败已观测 | `2026-11-08T08-49-19.020Z-30996-red-nc2-result.json` |
| `--mode test` | 0 / nc2 原字节恢复后 5 passed | `2026-11-08T08-49-53.615Z-7152-test-result.json` |
| `--mode red-nc3` | 0 / 指定失败已观测 | `2026-11-08T08-50-32.110Z-21248-red-nc3-result.json` |
| `--mode test` | 0 / nc3 原字节恢复后 5 passed | `2026-11-08T08-51-19.542Z-32820-test-result.json` |
| `--mode check --final` | 0 / passed，首次部分实现 f5abfbe0 | `2026-11-08T08-52-11.691Z-36776-check-result.json` |
| `--mode test --final` | 0 / 5 passed；首次部分实现 f5abfbe0 | `2026-11-08T08-52-53.550Z-35924-test-result.json` |
| `--mode real --final` | 0 / passed，首次部分实现 f5abfbe0 | `2026-11-08T08-53-44.796Z-20756-real-result.json` |
| `--mode archive` | 0 / passed，首次归档 | `2026-11-08T08-56-18.230Z-39148-archive-result.json` |
| `--mode check` | 0 / passed，补齐独立观察后 | `2026-11-08T09-14-56.911Z-9240-check-result.json` |
| `--mode check --final` | 0 / passed，最终实现 b341f5c1 | `2026-11-08T09-15-56.911Z-39660-check-result.json` |
| `--mode test --final` | 0 / 5 passed，7.78 s；最终实现 b341f5c1，负控快照审计通过 | `2026-11-08T09-17-18.861Z-8260-test-result.json` |
| `--mode real --final` | 0 / passed，最终实现 b341f5c1 | `2026-11-08T09-19-10.806Z-20640-real-result.json` |
| `--mode archive` | 0 / passed，最终归档 | `.local/checks/WATER-W14-J1/2026-11-08T09-23-05.606Z-25308-archive-result.json` |

最终归档由检查器生成：`ARCHIVE.json` 登记 322 个原始证据文件、6,748,977 字节，另有该索引及 `.gitattributes`。它包含首次的 243 个原始证据文件（4,976,627 字节）和新增 79 个证据文件。开工前已有的 `08-28-13.786Z-37688` 是派前 baseline；本执行者的 baseline 是 `08-40-02.172Z-37776`，两者没有混称。最新 archive 自身的 receipt 在 `.local`，这是检查器先复制证据、再写当前 receipt 的既有行为；首次 archive 的 receipt 已随本次归档。

辅助命令：只对三个改动的 Rust 文件执行 `rustup run 1.95.0 rustfmt --edition 2024 ...`；多次 `git diff --check`；运行每次 Cargo 门前按进程名查看负载，不读取或输出进程命令行。检查器提供离线依赖、单任务构建和工作树私有 Cargo home/target。

### 三条负控

| 负控 | 单处变异 | 实际失败 | 恢复 |
|---|---|---|---|
| nc1 | 把精确 `cache.db` 判断临时换为不匹配缓存文件的 `disabled-cache-exception`，使缓存例外失效 | `SCAN_W14_GPU: known GPU cache databases excluded`，7 对 0 | `git checkout -- packages/junk-scan/src/scan.rs` 后立即 test，5 passed |
| nc2 | 把精确文件名判断临时改为 `name.ends_with(".db")` | `SCAN_W14_GPU: other databases and parents stay valuable`，2 对 3 | 同上，5 passed |
| nc3 | 删除例外的父目录条件，只保留 `name == "cache.db"` | 同上标记，1 对 3 | 同上，5 passed |

每次负控 Cargo 均为 4 passed / 1 failed，失败目标相符；没有编译错误、超时或测试变异。每次还原后手动核对 `scan.rs` SHA-256 为 `8f881d8291ed6be0841ddda536fafea24e979ebd7f825190322373c383f67234`，检查器 final 再审计生产及测试快照的原字节一致性。没有计时失败或计时重跑。

续做的 src/tests 字节未变，因此复用上述三条有效负控，不重复无关变异。最新 `test --final` 的 proofAudit 再次通过。现有检查器捕获的是 src/tests，示例不在 sourceState 中；最新示例由干净提交 `b341f5c1`、该提交上的 `check --final` 编译及 `real --final` 实际执行绑定，没有把示例宣称为旧负控覆盖的内容。

## 真实冒烟与限制

通过原检查入口执行真实计划、完整 extras 与 user-profile overview，并按总控答复在相同扫描范围内增加固定兼容联接的独立元数据检查。未读取真实文件内容，未创建、删除或改动真实用户数据；输出只有组级汇总、计数及观测状态，不含用户路径或名字。下面是最终实现上的最新结果；首次部分实现的结果仍在旧 receipt 中。

| 项目 | 结果 |
|---|---|
| 普通 scan | completed；274,221 entries；61,538 ms |
| full scan | completed；274,209 entries；17,113 ms |
| 已索引联接 | 10 |
| 已索引且隐藏 + 系统 | 0，原断言通过 |
| 属性重读不可用 | `unavailable_indexed_junction_count = 0` |
| 独立看见兼容联接 | `hidden_system_junction_seen_count = 10` |
| 看见且不在索引 | `hidden_system_junction_skipped_count = 10`，与看见数相等 |
| 观测状态 | `hidden_system_junction_observation = "seen_and_skipped"` |
| 索引截断 | false |
| 泄漏簇 | 7，全为 confirm |
| 声明数量 | 0 |
| overview | completed；676,001 entries；578,749 files；41,538 ms；无 issues |

本次没有实际观察到重读前消失的联接，不能声称真实竞态已经复现。重读失败分支已编译检查；没有通过修改真实联接来制造竞态。当前机器看见数非零，`none_seen` 分支未在真实机器上触发；实际计划不含盘根，盘根候选分支未实测。独立观察反映本次元数据读取时的对象及其索引缺席，不声称所有候选均曾产生可逐路径关联的 `reparse_skipped`。

依 W14 第 5.4 节记明：普通联接的目标若写成经过兼容别名的路径，例如 `…\\Local Settings\\Temp\\foo`，不会继续解析到真实条目，那个真实条目可能不被标为引用；这是保留的 W13 语义，本次未改。

没有 UI 或截图任务；没有 macOS 验证；没有真实清理、发布或集成验收。测试的合成文件仅由既有 Fixture 在本树 `.local` 内创建并回收，本执行者没有手动递归删除任何目录。所有本票检查进程已结束，不留自有后台进程。总控台账未改；本报告为完成交回，是否验收合入仍由总控决定。
