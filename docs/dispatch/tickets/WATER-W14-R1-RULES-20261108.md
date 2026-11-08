# WATER-W14-R1：规则的英文（轻门）

2026-11-08，正式单，总控（Claude）。默认执行者：sol。状态以[第十四波 manifest](../wave14/manifest.json) 中本单的 `status` 为准。可以新开对话执行。

Flick 要加英文界面（用户 11-08 定：英文覆盖全部）。118 条规则的说明现在只有中文。本单给每条规则加英文字段，并把这些字段做进 Rust 接口，供服务单使用。

| 项 | 精确值 |
|---|---|
| 权威单 | F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W14-R1-RULES-20261108.md |
| 唯一工作树 / 分支 | F:/new/smaltalk/water/.worktrees/w14-r1 / worker/water-w14-r1 |
| 精确首次 HEAD | tag `water-w14-r1-base-20261108`，必须干净；完整 SHA 见 manifest |
| SPEC | F:/new/smaltalk/water/contracts/w14-v1/W14.md 第 0、2、7 节；规则格式见 F:/new/smaltalk/water/contracts/m35-v1/RULES-M35.md |
| 规则 | F:/new/smaltalk/water/docs/dispatch/WORKER-RULES.md 与 F:/new/smaltalk/water/docs/dispatch/W14-WORKER-RULES.md |
| 检查入口 | F:/new/smaltalk/water/scripts/checkup-wave-check.mjs |
| 回执 | F:/new/smaltalk/water/.worktrees/w14-r1/docs/dispatch/reports/WATER-W14-R1-REPORT.md |
| 证据目录 | F:/new/smaltalk/water/.worktrees/w14-r1/docs/acceptance/wave14/r1/ |
| 门 | 轻门：2 条负控 + check、test、real 三个 final |

**先读**：
- 两份规则、W14 第 0、2、7 节、本单全文；
- `packages/junk-rules/src/rules.rs`：
  - `RuleText`、`Rule`、`Rule::text()`；
  - 解析器的键白名单（第 150～190 行一带）；
  - `read_text` 与各字段的长度检查（第 195～285 行一带）；
- `rules/windows.json`；
- `tests/rules_v1.rs`：顶部的条数与版本常量、`sample_rule`、`m35_schema`、`m35_seeds`、`rules_schema_strict`。

## 1. 要做的（全部在 `packages/junk-rules/`）

### 1.1 接口（W14 第 2.2 节，冻结，服务单照这个用）

- `Rule` 加公开字段：
  - `title_en: String`、`owner_en: String`、`what_en: String`、`why_en: String`、`after_en: String`；
  - `fix_hint_en: Option<String>`、`advice_en: Option<String>`、`in_use_en: Option<String>`、`retention_en: Option<String>`。
- `RuleText` 照它现有的字段加对应的英文：`title_en`、`owner_en`、`what_en`、`why_en`、`after_en`、`fix_hint_en`。`Rule::text()` 一并填上。
- 名字、类型照上面写，不另加别的公开接口。

### 1.2 解析与检查（W14 第 2.1 节）

- 把英文键加进白名单。
- 必填与长度：
  - `title_en` 2～48 个字符；
  - `what_en`、`why_en`、`after_en` 4～320 个字符；
  - `owner_en` 1～64 个字符；
  - `in_use_en`、`fix_hint_en`、`advice_en`、`retention_en` 与对应的中文字段同有同无，4～320 个字符。
- 英文字段里出现中文字符（CJK 统一表意文字与中文标点）时拒绝。错误码照现有的“字段不合格”那一类。
- 其余字段与检查不变。

### 1.3 118 条规则的英文（W14 第 2.3 节）

- 给 `rules/windows.json` 每条规则写上第 1.2 节的英文字段。
- **怎么写**：
  - 照 W14 第 0.2 节与第 7 节词汇表；
  - 意思与中文一致，不增不减；
  - 读起来像英文产品文案，不照字面硬翻；
  - `title_en` 写清是什么东西，如 `Old Chrome versions`、`npm cache`；
  - `what_en`、`why_en`、`after_en` 各一两句。
- `owner_en`：
  - 中文值本来就是英文名的照抄；
  - 是中文的（34 条一类，如“系统”“你自己”）照意思写，如 `Windows`、`You`。
- `sources[].ref` 不翻译。
- `data_version` 改为 `2026-11-08.2`，测试顶部的版本常量同步。
- 词汇表里没有的说法，回执里列出你用的译法。

### 1.4 公开前的写法

全目录照 W14 第 0.1 节，顺手看一遍新写的内容。

## 2. 测试（`tests/rules_v1.rs`，测试个数不变，新断言加在已有函数里）

| 内容 | 放在 | 标记 |
|---|---|---|
| 自带规则全部 118 条的英文字段都在、长度合格、不含中文字符；`Rule::text()` 带英文 | `m35_seeds` | `RULES_W14_EN` |
| 缺 `title_en`、`what_en` 超长、`owner_en` 含中文、有 `in_use_zh` 却没有 `in_use_en`、没有 `in_use_zh` 却有 `in_use_en`，各被拒绝 | `rules_schema_strict` | `RULES_W14_EN` |

- 测试里手写的规则（`sample_rule` 一类）补上英文字段，照 W14 第 0 节写。
- **获准修改的旧断言**：
  - 数据版本常量改为 `2026-11-08.2`；
  - 因英文字段变成必填而要补字段的手写规则。

  回执逐条写原值 → 新值 → 为什么。

## 3. 负控

| 负控 | 让什么失效 | 标记 |
|---|---|---|
| nc1 | `rules/windows.json` 里任挑一条，删掉它的 `title_en` | `RULES_W14_EN` |
| nc2 | `src/rules.rs` 里去掉“英文字段不含中文字符”的检查 | `RULES_W14_EN` |

每条只改一处 → `--mode red-ncN` → `git checkout -- <文件>` 恢复原字节 → 立即 `--mode test`。

## 4. 命令（在工作树根目录执行）

```powershell
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W14-R1 --mode baseline
```

- 之后反复用 `lock`、`check`、`test`、`real`，做完负控。
- 提交干净实现后依次跑 `check --final`、`test --final`、`real --final`，再 `archive`。
- `real` 只看已知目录是否存在，输出只有计数。

## 5. 预算与边界

- **白名单**：
  - `packages/junk-rules/` 下的 `src/`、`rules/windows.json`、`tests/rules_v1.rs`、`README.md`；
  - `docs/dispatch/reports/WATER-W14-R1-REPORT.md`；
  - `docs/acceptance/wave14/r1/` 下 `--mode archive` 生成的证据。
- **不改**：规则的条数、`rule_id`、定位、等级、在用、中文文案、`sources`；`Cargo.toml`、`Cargo.lock`；别的包与契约。
- 原生窗口 0、选择框 0、浏览器 0；cargo 离线、单线程、私有 target。
- 不 merge、不 rebase，不改台账、契约、检查器。
- 提交身份、远端与历史、回执编码照通用规则第 7 节。

## 6. 交回

回执第一行与通知完全一致：

```text
WATER-W14-R1 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w14-r1/docs/dispatch/reports/WATER-W14-R1-REPORT.md
```

回执照通用规则第 7 节第 4 条写。受阻则写“WATER-W14-R1 任务受阻”。
