# WATER-W14-S1：服务，英文、错误与真实体检进度（中门）

2026-11-08，正式单，总控（Claude）。默认执行者：sol。状态以[第十四波 manifest](../wave14/manifest.json) 中本单的 `status` 为准。可以新开对话执行。

Flick 要加英文界面（用户 11-08 定：英文覆盖全部，给 agent 的线索复制文字跟界面语言）。服务经 IPC 返回的文字现在只有中文，约 230 句是运行时拼出来的。另有几处逻辑拿中文句子做判断，换语言就会坏。

用户还看到体检进度显示“完成”却停在 99%。原因是规则位置做完后，整盘位置还要做一次“空间分布”整盘遍历：
- 这一步没有进度；
- 把位置名改成“F 盘 · 空间分布”；
- 把数到的整盘字节算进了“已发现”。

规则的英文已由 R1 合入主线：`Rule` 与 `RuleText` 有了 `*_en` 字段。界面单 U1 照契约读 `_en`、`message_en`、`copy_text_en` 与新的进度阶段（它何时合入不影响本单）。

| 项 | 精确值 |
|---|---|
| 权威单 | F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W14-S1-SERVICE-20261108.md |
| 唯一工作树 / 分支 | F:/new/smaltalk/water/.worktrees/w14-s1 / worker/water-w14-s1 |
| 精确首次 HEAD | tag `water-w14-s1-base-20261108`，必须干净；完整 SHA 见 manifest |
| SPEC | F:/new/smaltalk/water/contracts/w14-v1/W14.md 第 0、1、3、7 节；背景见第 2.2 节（规则接口）与第 6.4 节（界面怎么用进度） |
| 规则 | F:/new/smaltalk/water/docs/dispatch/WORKER-RULES.md 与 F:/new/smaltalk/water/docs/dispatch/W14-WORKER-RULES.md |
| 检查入口 | F:/new/smaltalk/water/scripts/desktop-wave-check.mjs |
| 回执 | F:/new/smaltalk/water/.worktrees/w14-s1/docs/dispatch/reports/WATER-W14-S1-REPORT.md |
| 证据目录 | F:/new/smaltalk/water/.worktrees/w14-s1/docs/acceptance/wave14/s1/ |
| 门 | 中门：3 条负控 + check、test、real 三个 final |

**先读**：
- 两份规则、W14 第 0、1、2.2、3、6.4、7 节、本单全文；
- `packages/water-service/src/`：
  - `lib.rs`：`IpcError`；
  - `service.rs`：扫描线程（`scan_full` 到存记录那段，第 1050～1270 行一带）、进度观察者 `Progress::on_progress`（第 1430 行一带）、`progress_locations`、历史摘要、预测说明；
  - `views.rs`：`CATEGORIES`、增长与洞察的句子、`amount`；
  - `conclusion.rs`：卡片、折叠、线索与 `copy_text`，第 1018 行与第 2034 行一带拿中文判断的地方；
  - `m35.rs`：条目说明（第 375、430 行一带）、`amount`、第 562 行一带的 `starts_with`；
  - `clean.rs`、`quarantine.rs`、`dedupe.rs` 里的说明与原因；
- `packages/junk-rules/src/rules.rs` 的 `Rule`、`RuleText`（只读，接口照 W14 第 2.2 节）；
- `tests/service_v1.rs`：`fixtures`、`shape`（第 685 行一带）、`service_ipc_contract`、`service_scan_views`、`service_trends_locations`、`m35_conclusion_cards`、`m35_trends_history`。

## 1. 要做的（全部在 `packages/water-service/`）

### 1.1 英文兄弟字段（W14 第 1.3、3.1 节）

- **配对**：所有经 IPC 返回的 `<名字>_zh` 都配 `<名字>_en`，`copy_text` 配 `copy_text_en`。类型规则：
  - 字符串配非空字符串；
  - `null` 配 `null`；
  - 字符串数组配一样长的数组。
- **范围**：
  - 结论、卡片、折叠、线索；
  - 趋势、预测、历史摘要；
  - 清理与隔离的说明和原因、查重原因；
  - 位置与进度里的名字；
  - 类别名；
  - 设置里跳过名单的标题；
  - 错误。
- **规则带来的文字**：取 `Rule` / `RuleText` 的英文字段。
- **运行时拼的句子**：每一句写英文版本，照 W14 第 0.2 节写日期、数字、“约”、列举，照第 7 节词汇表用词。
- **大小文字**：`m35::amount` 与 `views::amount` 各出中英两种。
- **新存的记录**两种语言都存（体检记录里的条目说明、清理记录的文字、事件摘要、隔离区组名、跳过名单标题）。
- **旧记录**（这一波之前存的，只有中文）：读出来时 `_en` 填与 `_zh` 相同的中文，不报错、不丢字段。
- 词汇表里没有的说法，回执列出你用的译法。

### 1.2 错误（W14 第 3.2 节）

- `IpcError` 加 `pub message_en: String`。`IpcError::new` 的每个错误码、`disabled()`，以及两条自带说明的 `invalid`（加的位置太宽、不支持的文件系统）都给英文。
- 宿主 `apps/water/host/src/service.rs` 里有两处构造 `IpcError`：
  - **本单不改**；宿主在本单合入前编译不过是预期的；
  - 宿主单 H1 会以本单交回的提交为底接着改，两单一起合入。
  - 本单的检查只编译与测试 `water-service`。

### 1.3 逻辑不靠中文句子（W14 第 1.4 节）

- 这几处拿中文句子判断的地方，改成代码或结构化字段：
  - `conclusion.rs` 第 1018 行一带认“似乎已卸载”；
  - 第 2034 行一带认“已脱离 git”；
  - `m35.rs` 第 562 行一带认“在已安装程序 ”“在程序目录 ”开头；
  - `service.rs` 第 1461 行一带比对“你加的位置 · …”。
- 新存的记录里写代码。读这一波之前的旧记录时，仍然认得旧的中文写法。

### 1.4 扫描进度（W14 第 3.3 节）

`scan_progress` 的键不变，只改取值：

- **`state`**：新增 `finishing`。所有位置做完之后、记录存好之前（占用检查、生成结论、写盘）是这个状态。
- **`locations[].state`**：
  - 新增 `space`：这个盘的整盘空间统计正在跑；
  - 整盘位置要等它的空间统计结束才算 `done`。
- **`locations[].label_zh` / `label_en`**：始终是位置名，不再改成“· 空间分布”。
- **`found_bytes`**：只算规则位置找到的可清空间；整盘空间统计报来的字节**不计入**。
- **`percent`**：
  - 只增不减，进入最终状态时才是 100；
  - 没有整盘位置时，规则位置阶段按完成的目标数占 0～90，`finishing` 为 95；
  - 有整盘位置时：
    - 规则位置阶段占 0～40；
    - 空间统计阶段占 40～94，按“已统计字节 ÷ 这些盘开始体检时的已用字节”算；
    - `finishing` 为 95。
  - 已用字节取开始体检时平台给的盘信息（总量减可用）。扫描包每 50 ms 报一次已统计的字节，用它算。
- **`categories`**：照旧，每个类别带它已找到的字节。

### 1.5 公开前的写法

全目录照 W14 第 0.1 节，顺手看一遍改到的内容。

## 2. 测试（`tests/service_v1.rs`，测试个数不变，新断言加在已有函数里）

| 内容 | 放在 | 标记 |
|---|---|---|
| 遍历各命令的返回（含错误），所有 `_zh` 都有配对的 `_en`、`copy_text` 有 `copy_text_en`，类型照第 1.1 节；英文值里没有中文字符（旧记录与用户自己的路径、名字除外，测试里写明例外） | `service_ipc_contract` | `SERVICE_W14_EN` |
| 规则带来的文字等于规则的英文字段；几句运行时句子（增长、预测、清理说明、隔离原因、错误）中英各一条精确断言 | 相关的已有测试 | `SERVICE_W14_EN` |
| 旧记录（只有中文、没有代码）读出来 `_en` 等于 `_zh`；原来靠中文判断的几处，新记录靠代码、旧记录靠旧写法，结果一致 | `m35_conclusion_cards` 或条目说明所在的测试 | `SERVICE_W14_CODES` |
| 假平台上有一个整盘位置的体检：<br>- 状态序列 `running` → 位置 `space` → `finishing` → `completed`；<br>- `percent` 只增不减，空间统计阶段在 40～94 之间，最终 100；<br>- `found_bytes` 不含空间统计的字节；<br>- 位置名不变；<br>- 空间统计结束前位置不是 `done`。<br>另一组没有整盘位置时 `percent` 不超过 90 再到 95、100 | `service_scan_views` | `SERVICE_W14_PROGRESS` |
| 第十三波遗留：趋势测试把假时钟往后拨 60 秒，真实扫描超过 60 秒时仍会抢跑；改成不受真实耗时影响（例如按扫描实际结束时间再往后拨），不加墙钟时限 | `service_trends_locations` 与用同样做法的测试 | 原标记 |

- `shape` 比对前**两边都去掉**以 `_en` 结尾的键与 `copy_text_en`（W14 第 1.3 节）。三份共享样例不改。
- 观察进度序列用测试替身控制扫描与空间统计的节奏（照已有的 hold/entered 一类做法），不靠睡眠碰运气。
- **获准修改的旧断言**：
  - 依赖“· 空间分布”后缀、进度 99 的上限、`found_bytes` 含空间统计字节、`IpcError` 只有两个字段的断言；
  - 构造 `IpcError` 的测试代码；
  - 第十三波趋势测试拨时钟的写法。

  回执逐条写原值 → 新值 → 为什么。

## 3. 负控（改 `src/`）

| 负控 | 让什么失效 | 标记 |
|---|---|---|
| nc1 | 任挑一处卡片或线索，去掉它的 `title_en`（或对应的 `_en`） | `SERVICE_W14_EN` |
| nc2 | 空间统计报来的字节又计入 `found_bytes` | `SERVICE_W14_PROGRESS` |
| nc3 | 整盘位置在规则目标做完时就标 `done`（不等空间统计） | `SERVICE_W14_PROGRESS` |

每条只改一处 → `--mode red-ncN` → `git checkout -- <文件>` 恢复原字节 → 立即 `--mode test`。

## 4. 命令（在工作树根目录执行）

```powershell
node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W14-S1 --mode baseline
```

- 之后反复用 `lock`、`check`、`test`、`real`，做完负控。
- 提交干净实现后依次跑 `check --final`、`test --final`、`real --final`，再 `archive`。
- `real` 是一次只读真实体检，清理关闭，输出只有计数。

## 5. 预算与边界

- **白名单**：
  - `packages/water-service/` 下的 `src/`、`tests/service_v1.rs`、`README.md`；
  - `docs/dispatch/reports/WATER-W14-S1-REPORT.md`；
  - `docs/acceptance/wave14/s1/` 下 `--mode archive` 生成的证据。
- **不改**：
  - IPC 的命令名与已有键（只新增 `_en` 兄弟键）；
  - 三份共享样例、`Cargo.toml`、`Cargo.lock`；
  - 宿主、扫描、规则与其它包；
  - 契约。
- 原生窗口 0、选择框 0、浏览器 0；cargo 离线、单线程、私有 target；不新增系统函数。
- 不 merge、不 rebase，不改台账、检查器。
- 提交身份、远端与历史、回执编码照通用规则第 7 节。

## 6. 交回

回执第一行与通知完全一致：

```text
WATER-W14-S1 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w14-s1/docs/dispatch/reports/WATER-W14-S1-REPORT.md
```

回执照通用规则第 7 节第 4 条写。受阻则写“WATER-W14-S1 任务受阻”。
