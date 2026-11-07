# WATER-W10-M14：服务补修，程序目录不算、已装程序要整名对上、线索合并、卡片说人话（中门）

2026-11-07，正式单，总控（Claude）。默认执行者：sol（后端单）。状态以[第十波 manifest](../wave10/manifest.json) 中本单的 `status` 为准；READY 不代表已外贴。可以新开对话执行。

## 0. 背景

M3.5 收口的真实只读体检（[收口报告](../../acceptance/wave10/controller/WATER-M35-CLOSE-20261107.md)第 2.3 节）查出服务这边的几处问题：
- **R1 程序目录**：“安装包”卡收进了已装软件目录里的卸载程序与扩展包（`Telegram Desktop\unins000.exe`、`qq\…\QQExtension.appx`）。这些软件多数没有在注册表里登记安装位置，但目录里都有卸载程序。
- **R2 已装程序配对**：“对应的软件已经装好”按单个词配，`install-service.exe` 配成了 “Xbox Service”，setuptools 的 `cli-arm64.exe` 配成了 “GitHub CLI”。
- **R3 程序目录里的簇**：一个音频软件的帮助图片目录被当成泄漏，旁边上级目录里就有 `unins000.exe`。
- **R4 线索太多**：“交给 agent”有 786 条，其中 724 条是“被联接引用”的逐项线索，实际只来自 2 个联接。泄漏线索的“每天新增约 N 个”是 `成员数 / 14`，与实际无关。
- **R5 卡片难懂**：泄漏卡标题带 UUID，文件簇也写“同模板目录”；证据写原始时间 `2026-03-06T07:31:01Z`，同一句说明重复多次。
- **R8 折叠行重名**：“仅供参考”里两行都叫“浏览器数据目录”，看不出各是哪个位置。

扫描（M13）与规则（M12）另有单子；本单只改服务，不依赖它们，基线上就能测。

| 项 | 精确值 |
|---|---|
| 权威单 | F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W10-M14-SERVICE-FIX-20261107.md |
| 唯一工作树 / 分支 | F:/new/smaltalk/water/.worktrees/w10-m14 / worker/water-w10-m14 |
| 精确首次 HEAD | 98f9678e（tag `water-w10-m14-base-20261107`），必须干净；完整 SHA 见 manifest |
| SPEC | F:/new/smaltalk/water/contracts/m35-v1/SERVICE-M35.md，加上本单第 1 节的补充（本单优先） |
| 规则 | F:/new/smaltalk/water/docs/dispatch/W10-M35-WORKER-RULES.md；没有预列、却因本单必然要变的旧断言，按 F:/new/smaltalk/water/docs/dispatch/WORKER-RULES.md 第 3 节直接迁移（不得变弱），回执逐条写原值与新值 |
| 检查入口 | F:/new/smaltalk/water/scripts/desktop-wave-check.mjs |
| 回执 | F:/new/smaltalk/water/.worktrees/w10-m14/docs/dispatch/reports/WATER-W10-M14-REPORT.md |
| 证据目录 | F:/new/smaltalk/water/.worktrees/w10-m14/docs/acceptance/wave10/m14/ |
| 门 | 中门：3 条负控 + check、test、real 三个 final |

先读：
1. 规则；SPEC 第 4.2 节（资格调整与备注）、第 5 节（卡片、线索、折叠）。
2. APPS-M35 第 4 节（`name_tokens`、`installer_tokens`）。
3. 代码：
   - `packages/water-service/src/m35.rs` 第 267～440 行（`supplement`）；
   - `packages/water-service/src/conclusion.rs` 第 754～881 行（`card`、`tail2`）、第 1628～1789 行（`clues`、`folds`）；
   - `packages/water-service/tests/service_v1.rs` 里的 `m35_scope_and_plan`（第 4212 行起）、`m35_conclusion_cards`（第 4585 行起）。

下面的行号都指 `98f9678e`。

## 1. 要做的（全部在 `packages/water-service/`）

1. **已装程序要整名对上**（R2，`m35.rs` 第 373～387 行）：
   - “对应的软件已经装好：<名称> <版本>”只在下面两个条件都满足时写：
     - 已装程序显示名称的 `name_tokens` 里，每个不是纯数字的词，都与这个文件名 `installer_tokens` 里的某个词相等（ASCII 不分大小写）；
     - 这些词里至少有一个不少于 3 个字符。
   - 有多个程序满足时，取列表里第一个。这里不再用 `water_installed_apps::find`。
   - 对照：
     - `install-service.exe` 不配 “Xbox Service”；`cli-arm64.exe` 不配 “GitHub CLI”；
     - `MostLogin-setup.exe` 配 “MostLogin”；`Git-2.47.0-64-bit.exe` 配 “Git”。
2. **程序目录里的不算**（R1、R3，`supplement` 里）：只对 `installer-files` 组的条目、以及带 `cluster` 的组（泄漏簇）的成员生效。满足下面任一条，就把它挡掉（不可清），原因与备注写在最前面：
   - **a. 在已装程序的安装位置里**：路径在某个已装程序的 `install_location` 之内（`util::contains`，ASCII 不分大小写）。长度不超过 3 的安装位置（盘根）不算。原因写“在已安装程序 <名称> 的安装目录里”。
   - **b. 上级目录里有卸载程序**：从条目所在目录（簇用 `cluster.parent`）开始，连同往上 5 级，任何一级目录**直接**含有名字匹配 `unins*.exe` 或 `uninstall*.exe`（ASCII 不分大小写）的普通文件。盘根不查。原因写“在程序目录 <那一级目录名> 里（有卸载程序）”。
   - **只读**：只列目录名，不打开文件。列不出来就当不是程序目录。同一个目录在一次补充里只查一次。
   - 已装程序列表取不到时，只做 b。
   - 簇组里每个成员都因本条被挡掉时，这个簇**不出线索**（卡片本来就因为可清字节为 0 不出）。
3. **联接线索按联接合成一条**（R4，`conclusion.rs` 第 1696～1711 行）：
   - 同一个 `referenced_by` 第一个路径（ASCII 不分大小写）的条目合成一条：
     - `text_zh`：“<联接> 引用了 N 项，共 X；改指别处后这些才能清”；
     - `copy_text`：这句话，加上最多 20 个条目路径（每行一个），超过时末行“…等 N 项”；
     - `clue_id`：`cl-ref-` 加联接路径（小写）的 `util::digest` 前 12 位；
     - 排序用的体量：各项 `unique_bytes` 之和。
   - 名字特殊的线索（`cl-odd-`）、已脱离 git 的线索不变。
4. **泄漏线索写实际新增数**（R4，第 1657～1663 行）：
   - `text_zh` 改为“<父目录> 里有 N 个 <模板>，最近 14 天新增 k 个”。k 是创建时间（`item_created`，没有就用 `newest_activity`）不早于本次体检 `finished_at` 前 14 天的成员数。
   - k 为 0 时写“最近 14 天没有新增”。
   - `copy_text` 不变。
5. **泄漏卡标题**（R5，第 767～776 行）：
   - 改为“<地点> 里有 N 个同模板目录｜文件，还在长｜已经不长了”。目录还是文件看 `cluster.kind`。
   - <地点> 仍取父目录最后两级，但下面这些段换成“…”：
     - UUID 形状（8-4-4-4-12 位十六进制）的段；
     - 全是十六进制且不少于 7 位的段；
     - 全是数字且不少于 8 位的段。
   - 例：`…\subagents`、`en\image`。
6. **卡片证据**（R5，第 845～867 行）：
   - 时间只写日期 `YYYY-MM-DD`（取原字符串前 10 位）；最早与最新是同一天时只写一个日期。
   - 备注按第一次出现的顺序去重，最多写 2 条，其余写“等 N 条”（N 为剩下的不同备注数）。
   - 路径那一段不变。
7. **折叠行写位置**（R8，第 1777～1788 行）：
   - 仅供参考与受保护两种折叠的每一行：组 ID 是 `custom:<location_id>:…`、且这个 `location_id` 在本次扫描记录的 `scope` 里时，`note_zh` 写那个位置的 `label_zh`（如“D 盘”“Mirasim-A”）；否则仍为 null。
   - `text_zh` 里的前三个名字去重后再取。
8. **SPEC 补充**：SERVICE-M35 第 4.2 节（资格调整）、第 5 节（卡片标题与证据、线索、折叠），以本条为准。IPC 形状不变：没有新字段，只改文字与取值。

**不变**：
- IPC 命令、字段与形状；计划、清理、隔离区的流程；
- 别的资格调整与备注；
- 系统函数清单（只用 `std::fs` 列目录）；
- 计时限制（照现行 `call()`：200 ms 名单与 50 ms）。

## 2. 白名单

- `packages/water-service/` 下的文件（不得改 `Cargo.toml` 的依赖与 `Cargo.lock`）
- `docs/dispatch/reports/WATER-W10-M14-REPORT.md`
- `docs/acceptance/wave10/m14/` 下 `--mode archive` 生成的证据

## 3. 测试

- `packages/water-service/tests/service_v1.rs`，精确 12 个测试，与 M7 相同。
- **新断言**：
  - `m35_scope_and_plan`，标记 `SERVICE_M35_SCOPE`：第 1、2 条。用假平台的已装程序列表（`f.fake.apps`）。夹具都在自选位置下，层数不超过规则的 `max_depth` 3，时间改到 8 天前（规则要求一周没动）：
    - `apps/Bar/Bar-1.2.0.exe`，假列表里 “Bar” 的 `install_location` 指向 `apps/Bar` → 不可清，原因含“在已安装程序 Bar 的安装目录里”；
    - `prog/App/unins000.exe` 与同目录的 `prog/App/App-setup.exe` → `App-setup.exe` 不可清，原因含“在程序目录 App 里”（基线规则下 `unins000.exe` 自己也会被认出，同样被挡）；
    - `downloads/Foo-setup.exe`，没有对应程序、没有卸载程序 → 仍可清；
    - `downloads/install-service.exe`、`downloads/cli-arm64.exe`，假列表里有 “Xbox Service”“GitHub CLI” → 备注里没有“对应的软件已经装好”。这两个名字基线规则仍会认，M12 合入后不再认；断言写成“若出现，则不带这句备注”，两种规则下都成立；
    - `downloads/MostLogin-setup.exe`，假列表里有 “MostLogin” → 备注含“对应的软件已经装好：MostLogin”；
    - `prog/App/cache/` 下 12 个 `verify-A0000N` 目录 → 成员全部不可清，结论里没有它的卡片，也没有它的线索。
  - `m35_conclusion_cards`，标记 `SERVICE_M35_CONCLUSION`：第 3～7 条。
    - 4 个条目共用一个联接 → 1 条线索，文字与 `clue_id` 照第 3 条；
    - 泄漏线索的“最近 14 天新增 k 个”与“没有新增”两种；
    - 文件簇标题写“文件”，父目录带 UUID 的标题里是“…”；
    - 证据只有日期、同一天只写一个、备注去重与“等 N 条”；
    - 两个位置各有一组同名的仅供参考组时，两行的 `note_zh` 分别是两个位置名。
- **获准修改的旧断言**（总控已预列）：
  - `m35_conclusion_cards` 第 4742～4767 行那一段：让 4 个条目各用不同的 `referenced_by`（如 `synthetic-reference-0`～`3`），“exactly three of four clues”与“remaining clue count 1”保持原意不变；
  - 同时在旁边新增一段“4 个条目共用一个联接 → 1 条”的断言。
- 只因计时失败的，原样重跑，最多 3 次，不算受阻（用户 11-06 的要求）。

## 4. 负控

| 负控 | 让什么失效 | 标记 |
|---|---|---|
| nc1 | 已装程序配对改回 `water_installed_apps::find`（第 1 条） | `SERVICE_M35_SCOPE` |
| nc2 | 去掉“上级目录里有卸载程序”的判断（第 2 条 b） | `SERVICE_M35_SCOPE` |
| nc3 | 联接线索改回每项一条（第 3 条） | `SERVICE_M35_CONCLUSION` |

只改 `packages/water-service/src/` 的生产代码一处 → `--mode red-ncN` → `git checkout` 恢复原字节 → 立即 `--mode test`。

## 5. 命令（在工作树根目录执行）

```powershell
node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W10-M14 --mode baseline
```

之后反复用 `lock`、`check`、`test`、`real`，做完负控；提交干净实现后依次跑 `check --final`、`test --final`、`real --final`，再 `archive`。`real` 照 M7：只读体检冒烟，清理关闭。

## 6. 预算与边界

- 原生窗口 0、选择框 0、浏览器 0；cargo 离线、单线程、私有 target，不下载，不联网。
- 跑测试前按进程名看一眼，没有别的 cargo 检查进程；机器上有别的 cargo 在跑时，计时失败照第 3 节重跑。
- 不 merge、不 rebase，不改台账、契约、检查器、其它包。
- 提交身份照规则第 5 节：只在提交命令的进程里设，用你自己的名字。
- **远端与历史**：
  - 不 push 到任何远端，不添加或修改 git 远端与配置；
  - 不改写已有提交（不 amend、reset、squash 或任何强制操作），只在首次 HEAD 之后新增提交；
  - 提交信息写错就在回执里说明，不要改写。

## 7. 交回

回执第一行与通知完全一致：

```text
WATER-W10-M14 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w10-m14/docs/dispatch/reports/WATER-W10-M14-REPORT.md
```

回执要写：
- 实际模型、实现提交 SHA；
- 第 1 节逐条：改了哪里、怎么满足；
- 每个检查命令与结果（计时重跑写明次数）；
- 改过的旧断言的原值与新值；
- 负控：改了哪一处、失败信息、恢复后的哈希；
- 真实冒烟的结果；
- 没做或没验证的事。

受阻则写“WATER-W10-M14 任务受阻”，写清冲突与最小补充需求。
