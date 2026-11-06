# Water 总控交接报告（2026-11-06 第 18 份）

项目根 `F:/new/smaltalk/water`，总控 Claude。用户 11-06 约 14:05 JST：“跑门的时候写交接报告，我要先压缩上下文了”。本报告取代[第 17 份](CONTROLLER-HANDOFF-20261105-17.md)作为入口；第 17 份第 3、4 节（验收做法与工具、遗留）与第 16 份第 1、2 节继续有效。

所有回复用中文；GB 按 1024 换算。派单句：每条单独一个代码块并标单号，界面单单列，不要“你接手 Water 项目……”这类开场白；补单与派单句要能在新对话里直接执行。开原生窗口前先告诉用户。

## 0. 一句话现状

- **主线** `b5b78dde`，三处远端与 E 盘镜像一致，本报告提交后前移。
- **第十波后端**：M9、M3、M8、M4 已合入。用户 14:00 说“外部的两单都结束了，你收活吧”，正在收：
  - **M1**：补单 04 已验收通过；
  - **M2**：补单 02 的门在跑；
  - **M5**：补单 01 的门还没跑。
  - 三张都要验收后再合入，M1 与 M2 一起合。
- **界面**：设计 v3 改到第五轮，等用户看（第 3 节）。

## 1. 这一段的提交（第 17 份 `1dd11f9d` 之后）

| 提交 | 内容 |
|---|---|
| `4a165b63` | A 组第二轮验收：M1 补单 03 通过、出补单 04（剪映 `CEF Cache` 拆两段）；M2 补单 01 未通过、出补单 02（`.git` 内出条目，高危）。验收报告第 9 节 |
| `80822789` | 设计 v3 第一轮（天蓝页头 + 白卡片），`docs/design/water-ui-v3/` |
| `74f11d5f` | 设计 v3 第二轮（圆环、柱状、五彩），被否 |
| `b5b78dde` | 第三轮（全部细竖条，现在的 `water-ui-v3/mockup.html`）与第四轮两屏（`round4/`） |

工作区里未提交、要随本报告一起提交的：
- `docs/design/water-ui-v3/round5/`（第五轮两屏与截图）；
- `DESIGN.md` 第 7 节第五轮一条；
- 本报告、STATUS。

## 2. 第三轮收活（进行中）

### 2.1 已有交回

| 单 | 交回 HEAD | 实现提交 | 审计 |
|---|---|---|---|
| M1 补单 04 | `02bcbfab2d71f4dd306738573a20ddb09069da09` | `2d1c71b7d7d988a70f209753a571f964f30be6e5` | 0 问题 |
| M2 补单 02 | `c4a0287523a8d51f37e28d1d5bff33d51f729a31` | `cd08848363844da83e50a187b15a1eee8d8fc94c` | 0 问题；测试只增不删 |
| M5 补单 01 | `82560b780af6965333ec5f98b3ef1e5e95b4fd6e` | 代码 `e6f7fa673294715b86abc3dde7a12b156f9aa801`；final 落在 `761edd0e1e1990203e16a56d62bc8bfe83a5ab46`（只多了回执与开窗前预算） | 0 问题 |

审计输出在 `.local/w10-accept/audit-a3.json`。

### 2.2 已做

- 验收树 `accept-w10-m1`、`accept-w10-m2` 已用 `merge --ff-only` 前移到上表 HEAD。新建 `.worktrees/accept-w10-m5`（分支 `controller/accept-w10-m5`）在 `82560b78`。`make-manifest.mjs` 与 `heads.json` 已更新。上一轮的验收证据移到了 `.local/w10-accept/round2-evidence/`。
- **M1 通过**：
  - lock、check final、real final 通过；
  - 总控变异 c1～c11 全部被抓住（c11 = 剪映 `CEF Cache` 改回单段）；
  - test final 通过；
  - 已 archive，树内 `docs/acceptance/wave10/controller/accept-20261105/m1/` 共 1,190 个回执；
  - M1 只改两行数据，没有另派审查。
- **M2**：后台在跑 `run.sh m2 lock check:final real:final` 与 `controls.mjs m2`，日志 `.local/w10-accept/logs/m2-1.txt`、`m2-controls.txt`（日志是追加写，看最后一段）。变异 c1～c11：
  - c9：`.git` 内仍搜索；
  - c10：簇长在条目里；
  - c11：discovery 处问题记两遍；
  - c5、c7 是上一轮漏掉的两条，这次要看是否被抓住。
- **M5**：
  - 变异清单已写入 `mutations.json` 的 `m5`：c1～c4 打 `HOST_M35_REVEAL`（打开路径不校验、任何文件夹都算隔离区、放过 `..`、放过重解析点），c5～c7 打 `HOST_M35_FORWARD`（restore 丢 `beside`、decide 丢 `decision`、dedupe_start 参数名错）；
  - 锚点都唯一；门还没跑。
- **独立审查**：已派两个只读代理，M2 补单 02 一个，M5 一个。压缩后若结果没收到，就按下面第 5 步的要点重派。

### 2.3 接着做（按顺序）

1. **M2 门**：
   - 看 `m2-controls.txt` 最后一段，确认 c1～c11 的 KILLED/SURVIVED 和 test final；
   - 再 `bash .local/w10-accept/run.sh m2 archive`；
   - 若 c5 或 c7 仍漏，属测试偏弱，记遗留。
2. **M5 门**（几棵树按顺序跑，不并行编译）：
   - 先 `bash .local/w10-accept/run.sh m5 lock check:final`，再 `node .local/w10-accept/controls.mjs m5`（最后自动跑 test final）；
   - **先告诉用户**“M5 的整机检查要开一次 Water 主窗口，合成夹具，最多 5 分钟”，再 `bash .local/w10-accept/run.sh m5 native:final`；
   - 最后 `run.sh m5 archive`；
   - 门的模式在清单 `allowedModes`，M5 没有 real，只有 native。
3. **审查要点**（若要重派，只给契约、单子、代码）：
   - **M2**：`.git` 内任何目标都不再搜索（`streaming.rs` 的 `outside_git`、`search_indices`）；`budget_exhausted` 记到每个没做完的组；簇不长在最终条目里；discovery 问题只记一次。
   - **M5**：17 条新命令的名字、顺序、参数照 IPC-M35；界面不传路径；`quarantine_reveal` 只能打开服务给的隔离区文件夹（`opener.rs` 的 `valid_quarantine_path`、`local_disk_path`，用 `SystemRoot\explorer.exe` 起进程）；`host_v1.rs` 旧断言只在补单 01 授权处改；配置、权限、CSP 没动。
4. **合入**：
   - 三张都过后，把各验收树的 `docs/acceptance/wave10/controller/accept-20261105/<槽>/` 拷进主线同名目录（新归档是旧的超集，直接覆盖），连同 `audit-a3.*`、`heads.json`、`manifest.json`、`mutations.json` 与各槽日志拷进 `.../controller/`，`git add -f` 提交；
   - 依次 `git merge --no-ff worker/water-w10-m1`、`worker/water-w10-m2`、`worker/water-w10-m5`；
   - 逐张核对 `git diff <交回HEAD> HEAD -- <包> docs/acceptance/wave10/<槽>` 为空（包：`packages/junk-rules`、`packages/junk-scan`、`apps/water/host`）。
5. **记录**：
   - 改 `.local/w10-accept/record-verified.cjs` 的 `impl`、`self`（都是 Codex GPT-6）、`review`、`later` 四张表，加 m1、m2、m5 三项后运行；
   - 注意 M1 补单 02 的状态是 SUBMITTED，其它补单的 `submittedHead` 不要被覆盖成最新；
   - 验收报告 `docs/acceptance/wave10/controller/WATER-W10-REVIEW-20261105.md` 加第 10 节；
   - STATUS 加一条；五步推送。
6. A、C 两组都合入后，写 M7 服务单。要交代的几条见第 17 份第 4 节：`protects` 前统一成 `X:\` 写法、清理条目不能包住声明目录、`collected_at` 转 RFC 3339、中日韩连写、SERVICE-M35-ADD-01。从合入后的 HEAD 开工。
7. 问用户 M4 遗留的执行器小单要不要出（第 17 份第 4 节）。
8. 遗留（不在本轮做，已在清单 `carryOverLater`）：
   - M1：盘根错误指针、过时的断言说明；
   - M2：discovery 先测后判覆盖、停下时丢掉已测完的 discovery 条目、`row.issues` 累积、逐字符分配。

## 3. 界面：设计 v3（等用户看第五轮）

用户 11-06 放弃冰山动画，要求整体重构，越来越明确的要求如下：
- 第一轮方向说“对了”。
- 第二轮被否：“没有任何的设计感……柱状图，环形图，都还是上个世纪的审美设计了，太丑了”；又说参考图“排版合理，留白很足。清晰大方”。
- 之后发来七张优秀设计，都只在对话里，没有存盘：智能家居面板、Crextio 人事面板、Wise 统计、团队表现、UPS 货运、Avito 商品、带矩形树图与热力格子的网站流量面板。
- 最后一句：“配色方块什么的，你参考一下这个吧，现在圆角太多了。”

| 轮 | 位置 | 状态 |
|---|---|---|
| 一、二 | 已被第三轮覆盖（git 历史 `80822789`、`74f11d5f`） | 否 |
| 三 | `docs/design/water-ui-v3/mockup.html`，十一屏，细竖条 | 作废 |
| 四 | `water-ui-v3/round4/mockup.html`，首页、结论两屏 | 被第五轮取代 |
| **五** | **`water-ui-v3/round5/mockup.html`**，首页、结论两屏，截图 `round5/previews/` | **等用户看** |

第五轮的做法写在 `DESIGN.md` 第 7 节：
- **布局**：整窗浅天蓝到白的渐变；深色大标题，旁边三个细体大数；方块分段比例条；便当格，每屏一张黑色主角卡放主按钮。
- **图表**：刻度圆表；带圆点的细竖线，带小气泡；矩形树图（这次能清什么）；热力格子留给记录页。
- **样式**：小圆角（卡片 10px）加细线；配色天蓝四档、柠檬绿 `#D6F03C` 唯一高亮、橙红 `#FF4F2B` 表示注意或问题、浅灰、黑。

用户认可后：
1. 按同样做法铺开其余九屏：体检中、抽屉、确认、完成、隔离区、趋势、记录（热力格子）、设置、查重；
2. 改写 `DESIGN.md` 第 1～4 节与 `tokens.css`；
3. 改 UI-M35（令牌来源、顶部导航、逐页对照）；
4. 重出 M6 界面单，用户选模型。

截图用 `node scripts/design/render-mockup-previews.mjs <屏,…> <设计目录>`，它只认目录下的 `mockup.html`。教训已写进记忆 `water-ui-frosted-glass.md`：这位用户先看主次、留白与图表的“设计感”；一次只做两屏给他看，认可再铺开。

## 4. 其它

- 临时树 `.worktrees/tmp-m2-old`（`f50da264`，脱离分支）是 M2 计时用的，可以留着下次对比，也可以 `git worktree remove`（树里只有构建产物）。计时脚本在 `acceptance/wave10/controller/accept-20261105/controller/logs/m2-timing/`。
- 上两轮的验收证据在 `.local/w10-accept/round1-evidence/`、`round2-evidence/`，主线里已有，可留可弃。

## 5. 接手粘贴语

```text
交接里写了（F:/new/smaltalk/water/docs/CONTROLLER-HANDOFF-20261106-18.md）：读交接报告，准备接手 Water 总控，从第 2.3 节继续收活。
```
