WATER-W14-J1 任务受阻，任务报告在 F:/new/smaltalk/water/.worktrees/w14-j1/docs/dispatch/reports/WATER-W14-J1-REPORT.md

2026-11-08。已完成并验证独立部分；工单 1.2 的“看见并跳过”计数未实现，不能按整单完成交回。以下 final 通过仅说明当前已提交实现通过现有检查器，不代表本单全部要求已经满足。

## 身份与提交

- 实际执行者：Codex，基于 GPT-6；会话未提供更细的模型版本标识，不沿用 manifest 中的预设模型名。没有子代理。
- 工作树：`F:/new/smaltalk/water/.worktrees/w14-j1`。
- 分支：`worker/water-w14-j1`。
- 首次 HEAD：`d692bd60cd8ab3fe4d0201afacd8a29fcfc8265a`，与 `water-w14-j1-base-20261108` 一致，开工时干净。
- 当前实现提交：`f5abfbe0e91110e2acc61920b6bb05fbe97c91ac`。
- 实现提交只含 `packages/junk-scan/src/scan.rs`、`examples/real_smoke.rs`、`tests/scan_v1.rs`、`README.md` 四个文件。报告与检查器生成的证据另行提交。
- 提交身份通过当前进程的四个 `GIT_AUTHOR_*` / `GIT_COMMITTER_*` 变量设为 `Codex <codex@localhost>`；没有修改 Git 配置、远端或已有历史，没有 push、merge、rebase、reset、amend。

## 受阻点与最小补充

工单 1.2 要求计数“结果里记了联接跳过、且自身同时带隐藏与系统属性”的联接，并对找不到元数据的联接不计数。现有返回值无法把一次跳过对应回具体联接：

- `packages/junk-scan/src/model.rs:92`：`Issue` 只有 `code`、`group_id`、`count`，没有路径或属性。
- `packages/junk-scan/src/scan/streaming.rs:756`、806、888：`reparse_skipped` 只按目标组汇总；同一组可能混有普通联接与兼容联接。
- `packages/junk-scan/src/scan.rs:299` 一带：隐藏且系统的重解析点在 `index_junction` 中直接返回，没有保留到索引。
- `packages/junk-scan/src/model.rs:188`：`ScanExtras` 只有已索引的 `junctions`、截断标记与声明列表，没有被过滤联接信息。

因此，不能用 `reparse_skipped` 的汇总数冒充已逐个核对属性的计数，也不能只遍历已索引联接来算被排除的联接。未采取这两种错误实现，未改公共返回值或冻结契约。

依据通用规则第 4 节“要改公开接口、依赖、系统函数，或扩大真实数据的读取范围”须交受阻回执；本单 5 节也不允许执行者改契约。最小补充是由总控明确一种取数方式：冻结可返回被跳过联接信息的接口，或明确允许并限定独立的逐联接只读验证如何从既有范围取候选、关联实际跳过结果及计数。会话中已提出这一问题，交回时尚未收到补充；没有把等待视为授权。

无需重做已完成的 GPU 规则和两条措辞修正。补充确定后，可从上述实现提交继续，以新增提交补齐真实冒烟计数并复验。

## 工单逐条对照

| 条目 | 当前结果 |
|---|---|
| 1.1 GPU `cache.db` 例外 | 已完成。先按现有方式把名字和路径转为 ASCII 小写，只对精确文件名 `cache.db` 加例外；使用 `file_name(parent)` 判断直接父目录的七项白名单。没有文件内容读取。 |
| 1.1 三类保护 | 已完成。其他数据库名、更深一级的 `cache.db`、其他父目录下的 `cache.db` 仍计为贵重；原有其它保护及排除规则未改。 |
| 1.2 已索引联接重读失败 | 已完成。`symlink_metadata` 失败时跳过该条，不再 `expect`；计入输出字段 `unavailable_indexed_junction_count`。字段使用 unavailable，因为错误不一定能证明对象已经删除；处理范围与工单要求的“读不到元数据”一致。 |
| 1.2 原索引零断言 | 已保留，仍要求 `hidden_system_junction_count == 0`。 |
| 1.2 看见并跳过计数 | 未完成，原因及所需补充见上节。没有伪造数值或新增一个恒为零的字段。 |
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

两条断言的求值表达式均未改，未降低断言强度。没有更改其它旧断言的预期值。GPU 测试选择独立夹具目录，避免迁移旧夹具计数。README 只补充名字例外与属性重读失败行为，没有写入私有流程。

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
| `--mode check --final` | 0 / passed，绑定干净实现提交 | `2026-11-08T08-52-11.691Z-36776-check-result.json` |
| `--mode test --final` | 0 / 5 passed；三条负控与恢复哈希审计通过 | `2026-11-08T08-52-53.550Z-35924-test-result.json` |
| `--mode real --final` | 0 / passed，原有只读冒烟 | `2026-11-08T08-53-44.796Z-20756-real-result.json` |
| `--mode archive` | 0 / passed | `.local/checks/WATER-W14-J1/2026-11-08T08-56-18.230Z-39148-archive-result.json` |

归档由检查器生成：`ARCHIVE.json` 登记 243 个原始证据文件、4,976,627 字节，另有该索引及 `.gitattributes`。它也包含开工前已有的 `08-28-13.786Z-37688` 派前 baseline；本执行者的 baseline 是 `08-40-02.172Z-37776`，两者没有混称。最后一次 archive 自身的 receipt 在 `.local`，这是检查器先复制证据、再写当前 receipt 的既有行为。

辅助命令：只对三个改动的 Rust 文件执行 `rustup run 1.95.0 rustfmt --edition 2024 ...`；多次 `git diff --check`；运行每次 Cargo 门前按进程名查看负载，不读取或输出进程命令行。检查器提供离线依赖、单任务构建和工作树私有 Cargo home/target。

### 三条负控

| 负控 | 单处变异 | 实际失败 | 恢复 |
|---|---|---|---|
| nc1 | 把精确 `cache.db` 判断临时换为不匹配缓存文件的 `disabled-cache-exception`，使缓存例外失效 | `SCAN_W14_GPU: known GPU cache databases excluded`，7 对 0 | `git checkout -- packages/junk-scan/src/scan.rs` 后立即 test，5 passed |
| nc2 | 把精确文件名判断临时改为 `name.ends_with(".db")` | `SCAN_W14_GPU: other databases and parents stay valuable`，2 对 3 | 同上，5 passed |
| nc3 | 删除例外的父目录条件，只保留 `name == "cache.db"` | 同上标记，1 对 3 | 同上，5 passed |

每次负控 Cargo 均为 4 passed / 1 failed，失败目标相符；没有编译错误、超时或测试变异。每次还原后手动核对 `scan.rs` SHA-256 为 `8f881d8291ed6be0841ddda536fafea24e979ebd7f825190322373c383f67234`，检查器 final 再审计生产及测试快照的原字节一致性。没有计时失败或计时重跑。

## 真实冒烟与限制

只执行原检查入口已有的真实计划、完整 extras 与 user-profile overview，没有增加其它真实目录或独立探针。未读取真实文件内容，未创建、删除或改动真实用户数据；输出只有组级汇总及计数。

| 项目 | 结果 |
|---|---|
| 普通 scan | completed；274,218 entries；32,604 ms |
| full scan | completed；274,219 entries；18,946 ms |
| 已索引联接 | 10 |
| 已索引且隐藏 + 系统 | 0，原断言通过 |
| 属性重读不可用 | `unavailable_indexed_junction_count = 0` |
| 索引截断 | false |
| 泄漏簇 | 7，全为 confirm |
| 声明数量 | 0 |
| overview | completed；675,982 entries；578,730 files；59,489 ms；无 issues |

本次没有实际观察到重读前消失的联接，不能声称真实竞态已经复现。重读失败分支已编译检查；没有通过修改真实联接来制造竞态。“看见并跳过”计数仍缺失，不能从索引里的零推断过滤实际遇到了多少兼容联接。

依 W14 第 5.4 节记明：普通联接的目标若写成经过兼容别名的路径，例如 `…\\Local Settings\\Temp\\foo`，不会继续解析到真实条目，那个真实条目可能不被标为引用；这是保留的 W13 语义，本次未改。

没有 UI 或截图任务；没有 macOS 验证；没有真实清理、发布或集成验收。测试的合成文件仅由既有 Fixture 在本树 `.local` 内创建并回收，本执行者没有手动递归删除任何目录。所有本票检查进程已结束，不留自有后台进程。总控台账未改，整单保持受阻交回，等待上述最小补充。
