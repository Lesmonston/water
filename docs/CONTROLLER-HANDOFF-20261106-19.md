# Water 总控交接报告（2026-11-06 第 19 份）

2026-11-06 16:50 JST，总控（Claude）。上一份：[第 18 份](CONTROLLER-HANDOFF-20261106-18.md)（`b8679fa1`）。用户要压缩上下文，写本份。**接手先读本份，再按需翻第 18、17 份。**

## 0. 一句话现状

- 第十波九张单里七张已验收合入：M1、M2、M3、M4、M5、M8、M9。
- 剩下两张都在等外派补单：
  - 界面 M6：补单 02 READY；
  - 服务 M7：补单 01 READY。
- 界面设计 v3 已定稿，十一屏。
- 主线 `b543e9a4`，五步推送完成，三处远端与 E 盘镜像一致。

## 1. 这一段的提交（第 18 份 `b8679fa1` 之后，主线一层）

| 提交 | 内容 |
|---|---|
| `4cd83496`、`b3b86e7c` | M2 补单 03 出单、记录派给 sol |
| `0e3dfe57` | 界面设计 v3 定稿：十一屏、DESIGN 第 0～5 节与 tokens.css 重写，第三轮原稿移到 `round3/` |
| `3c6d15dd`、`7aebb2ef`、`80fff0b8` | 第三轮证据；M5 合入；记录与验收报告第 10 节 |
| `06d266d1`、`ce6bd2d1` | UI-M35 按 v3 修订（只改样子）；M6 按 v3 重出（HOLD → READY） |
| `99f2bd96` | M6 补单 01（看设计稿不用开浏览器） |
| `a30cd640`、`e144a580`、`256e3eaf`、`b4b889a9` | 第四轮证据；M1、M2 合入（A 组）；记录与验收报告第 11 节 |
| `0269e16c` | M7 服务单出单 |
| `b543e9a4` | M6 补单 02、M7 补单 01 |

## 2. 第十波各单

| 单 | 状态 | 说明 |
|---|---|---|
| M1 规则 | VERIFIED，合入 `e144a580` | 补单 04 第三轮通过 |
| M2 扫描 | VERIFIED，合入 `256e3eaf` | 补单 03 第四轮通过：变异 15 条抓住 14 条，c15 只能靠时间预算触发，没有稳定测试；审查没有高危也没有中等；热缓存计时没有变慢 |
| M3、M4、M8、M9 | VERIFIED（第 17 份之前） | |
| M5 宿主 | VERIFIED，合入 `7aebb2ef` | 变异 7 条抓住 5 条，c3（放过 `..`）、c4（重解析点检查）是测试偏弱；整机检查开过一次窗口，开之前告诉了用户 |
| **M6 界面** | **BLOCKED → 补单 02 READY** | 按设计 v3 重出后受阻两次，都成立，都是总控的错：① 单子要先开浏览器看设计稿，又只许检查器开浏览器 → 补单 01 改为看截图与源码；② 卡片与汇总行要“以后都跳过”，接口只有 `skip_add {itemId}` → 补单 02 定为这一波只给真实条目（逐项行与展开后的单项）。工作树停在 `e63161cf` |
| **M7 服务** | **BLOCKED → 补单 01 READY** | 从合入后的主线 `b4b889a9` 开工，开工审阅就受阻，成立：IPC-M35 给八种旧返回值加了键，旧的严格形状测试比的是旧样例，没有迁移授权 → 补单 01 授权“旧样例加新键，值从对应 `v2_*` 样例取”。工作树停在 `50fb2ab4` |

M6、M7 的补单都**还没有外派**，粘贴语见第 7 节。两张改的目录不同，可以同时派；M6 不跑 cargo。

### 2.1 M7 单子里的总控补充（第 2 节，六条）

1. 调 `protects` 前统一成 `X:\` 写法：去掉 `\\?\`，仍不是本地盘写法的条目不可清；
2. 条目包住项目声明目录时不可清；
3. `collected_at` 换成 RFC 3339；
4. 判“似乎已卸载”前，再按显示名宽松核对一次（小写、去空格、包含），防“腾讯QQ”这类粘连；
5. 执行器写日志失败按失败报，并从磁盘重新核对隔离区；
6. SERVICE-M35-ADD-01 不做（冰山已放弃，界面只画已有的数）。

## 3. 收活做法（工具在 `.local/w10-accept/`，见第 17、18 份第 3 节）

- 流程：
  1. 交回后先 `WATER_W2_AUDIT_MANIFEST=docs/dispatch/wave10/manifest.json node scripts/acceptance/w2-receipt-audit.mjs <任务ID> > .local/w10-accept/audit-aN.json`；
  2. 上一轮验收树证据移到 `.local/w10-accept/roundN-evidence/`；
  3. 验收树 `git -C .worktrees/accept-w10-<槽> merge --ff-only <交回HEAD>`；
  4. `node .local/w10-accept/make-manifest.mjs '{"<槽>":"<HEAD>"}'`；
  5. **手工改 `heads.json`**（这次漏改过一次，记录时 M2 的交回 HEAD 写成了上一轮的，已修正）；
  6. `bash .local/w10-accept/run.sh <槽> lock check:final real:final`（宿主是 `native:final`，开窗口前告诉用户），再 `node .local/w10-accept/controls.mjs <槽>`；
  7. 最后 `run.sh <槽> archive`。
- M6 是界面单，检查器是 `checkup-wave-check.mjs`，模式 `check`、`test`、`browser`（`run.sh m6 check:final test:final browser:final`）。`run.sh` 原来把 m6 送去 `desktop-wave-check`，16:50 已改为 m5、m7 走 `desktop-wave-check`，其余（含 m6）走 `checkup-wave-check`；M6 的 `browser` 模式在 `run.sh` 里还没跑过，第一次用时看一眼输出。
- M7 是服务单，用 `desktop-wave-check.mjs`；这个检查器**不核对系统函数清单**，SERVICE-M35 只许新增 `SHQueryRecycleBinW`，验收时要人工看 `native_windows.rs` 的 `extern "system"` 块。
- 变异清单 `mutations.json`：M2 有 c1～c15，M5 有 c1～c7；M6、M7 的还没写。
- `record-verified.cjs` 已改过：只把 READY 的补单记成 VERIFIED 并写新 HEAD；`carryOverLater` 追加不覆盖；旧的审查摘要接在后面（“Earlier: …”）。
- M2 计时脚本 `.local/w10-accept/m2-timing-4.sh`（旧 `f50da264` 在 `.worktrees/tmp-m2-old`）。
- 一次只跑一棵树的 cargo，并行会把机器拖垮。

## 4. 界面：设计 v3 定稿

- 用户：“可以，定稿吧”。他看的是网页（私有 Artifact https://claude.ai/artifact/QMNN9P38NRc5tpitQGy3Y7，十一屏都在上面）。**这位用户可能打不开仓库里的 PNG，看图请做成网页。**
- 设计在 `docs/design/water-ui-v3/`：
  - `mockup.html` 十一屏，`?s=` 切页面，`drawer`、`confirm` 盖在结论页上；
  - `previews/` 十一张截图，用 `node scripts/design/render-mockup-previews.mjs <屏,…> docs/design/water-ui-v3` 生成；
  - `DESIGN.md` 第 0～5 节、`tokens.css`。
- UI-M35 已按 v3 修订（`06d266d1`）：
  - 只换样子，另加“只画服务给的数”一条；
  - 25 张截图对照 v3；
  - 测试名与标记里的 `v2` 照旧不改。

## 5. 遗留与后续事项

- **整组、整行“以后都跳过”**：要另定接口与服务协议（版本绑定、64 条上限、原子失败、新成员算不算）。v2 设计里有这项，用户还没被问过要不要这一波就做；上次回复里已向用户说明，用户没表态。
- **M4 执行器小单**（第 17 份第 4 节）：子文件夹被占用时永久删除留下整块；编号目录被完全独占时报入口错误；编号放过设备名；移入后写日志失败丢整份报告。建议 M3.5 发布前出，**用户还没回答要不要现在出**。
- 各单的 `carryOverLater` 在清单里：
  - M2 新增 7 条（时间预算两种情况没有测试、预算问题偶尔记到不会再出东西的组、新断言固定了“停下时丢掉已测完的 discovery 条目”这条遗留，修它的单子要明确允许改这条断言，等）；
  - M5 新增 5 条。
- M3、M8 的真实冒烟用 `ancestors().nth(4)` 找仓库根，下次动这两个包时修。
- **教训**（已写进记忆）：
  - 契约给已有返回值加字段时，要在契约里预先授权旧形状测试的迁移；
  - 单子不要让执行者在检查器以外开浏览器；
  - 卡片菜单里的动作，要先确认接口真有对应的命令。

## 6. 下一步（按顺序）

1. 用户外派 M6 补单 02、M7 补单 01 后，在清单里记派单（`dispatchReportedAt`、`model`、`dispatchEvidence`）。
2. 交回就按第 3 节收活：
   - **M7** 要另写变异（建议照 SERVICE-M35 第 12 节三条负控之外，再打总控补充的六条，以及“选”与“推荐”两块的划分），再派一个只读独立审查；
   - **M6** 收活要看 25 张截图与设计 v3 是否一致（把截图做成网页给用户看）。
3. M6、M7 都合入后，做第十波的整合检查（照第 12 份第五次整合与第六次整合的做法），编 release，再问用户 M3.5 收口。
4. 问用户两件事：整组跳过要不要做；M4 执行器小单要不要出。

## 7. 粘贴语

接手：

```text
交接里写了（F:/new/smaltalk/water/docs/CONTROLLER-HANDOFF-20261106-19.md）：读交接报告，准备接手 Water 总控，从第 6 节继续。
```

待外派（各自一个代码块，M6 是界面单，模型由用户选）：

**WATER-W10-M6 补单 02（界面单）**

```text
WATER-W10-M6 补单 02（“以后都跳过”这一波只给单个条目，轻门）：读 F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W10-M6-ADDENDUM-02-20261106.md，按其中列出的顺序读原单、补单 01、本补单与你的回执，在 F:/new/smaltalk/water/.worktrees/w10-m6（分支 worker/water-w10-m6）从 e63161cf 续做；做完、提交并交回回执；受阻就停下写受阻回执。
```

**WATER-W10-M7 补单 01**

```text
WATER-W10-M7 补单 01（旧形状测试迁到 IPC-M35 的新字段，中门）：读 F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W10-M7-ADDENDUM-01-20261106.md，按其中列出的顺序读原单、本补单与你的回执，在 F:/new/smaltalk/water/.worktrees/w10-m7（分支 worker/water-w10-m7）从 50fb2ab4 续做；做完、提交并交回回执；受阻就停下写受阻回执。
```
