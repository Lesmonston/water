# denglou 占用的磁盘：组成与建议（给 denglou 总控，2026-11-02）

Water 总控（Claude）。用户 11-01 晚让 Water 总控逐盘清理电脑，F 盘汇报里 `F:\new\denglou` 一个项目就占 **319 GB**（按 1024 换算；十进制是 343 GB，汇报里写的是后者）。用户：“denglou项目还是给我写给主控的报告。”本文只给只读得到的事实与初步建议，删什么、改什么由 `denglou` 总控与用户定。Water 总控**没有动** `denglou` 里的任何文件。

上一份是[会话组成报告](DENGLOU-SESSION-COMPOSITION-20261102.md)，`denglou` 总控已经回了[分析与改法](../../../../denglou/worktrees/ui-v2/docs/ops/SESSION-COMPOSITION-ANALYSIS-20261102.md)（`F:\new\denglou\worktrees\ui-v2\docs\ops\SESSION-COMPOSITION-ANALYSIS-20261102.md`）。

## 方法

- 整盘深度普查（不跟联接，硬链接按文件 ID 只算一次）给出各目录体量；
- 按文件类型统计大目录（[by-ext.cjs](../acceptance/wave8/controller/cleanup-20261101/by-ext.cjs)）；
- 工作树信息只用 git 的只读命令（[denglou-worktrees.cjs](../acceptance/wave8/controller/cleanup-20261101/denglou-worktrees.cjs)：`worktree list`、`status --porcelain`、`log -1`）。

下文 GB 按 1024 换算（与资源管理器一致）。

## 总览

| 目录 | GB | 是什么 | 最近改动 |
|---|---:|---|---|
| `worktrees\`（29 个目录） | 149.9 | 18 棵登记的工作树 + 11 个已脱离 git 的目录，见下 | 11-02 |
| `新建文件夹\⭐️2026刷题本【最新最全合集】` | 65.5 | 7,235 个 PDF | 07-04 |
| `_review\zhenti` | 53.1 | 77,873 个 JSON 共 46.3 GB，另有 `.db` 3.0 GB、`.jsonl` 2.8 GB | 10-29 |
| `_ctl\` | 27.2 | 演练、发布、采集目录；45 个 APK 共 11.9 GB，569 个 `.part` 没下完的文件 2.2 GB | 11-01 |
| `登楼知识库\` | 12.9 | 3,376 个 PDF（省考、国考真题等）；`F:\new\登楼知识库` 另有一份 1.7 GB 的同名目录 | 06-29 |
| `marketing\v150-feature-videos` | 7.8 | 36 个 `.webm` 共 7.1 GB | 10-25 |
| `.git` | 1.5 | | 11-02 |

主检出在 `master`，最后提交 06-27，有 379 处没提交的改动；开发都在工作树的分支上。

## 工作树里最大的三块

1. **`.tmp_w35b` 共 56.2 GB**，分布在三棵工作树：`fix-r9` 26.8 GB、`audit-b57a` 17.3 GB、`fix-r8` 12.1 GB。里面是成批的 `verify-<随机码>` 目录，每个约 0.43 GB（主要是一个 `.db` 加一批 `.json`），三棵合计约 130 个，最近的到 10-30、11-01。**这是某个验证脚本每次运行建一个临时目录、结束不删的泄漏特征**，和 10-23 那次的 `rb*-chrome-*` 一样。
2. **`ui-v2\eval\distill-w0` 14.3 GB**：288 个 `.m4a` 共 13.7 GB（评测音频），最后 10-01。
3. **`node_modules` 27.5 GB**：`apkbuild` 12.2、`audit-b57a` 8.3、`ui-v2` 6.7；`apkbuild` 另有 `android` 构建 5.5 GB。

## 18 棵登记的工作树

| 工作树 | GB | `node_modules` | 大头 | 分支 | 未提交 | 最后提交 |
|---|---:|---:|---|---|---:|---|
| `ui-v2` | 28.73 | 6.74 | `eval\distill-w0` 14.34 | `codex/ui-drawer-onboarding-v2` | 2817 | 11-02 |
| `fix-r9` | 28.05 | — | `.tmp_w35b` 26.77 | `feat/w45b-podcast-multi-per-day-20261101` | 72 | 11-01 |
| `audit-b57a` | 25.93 | 8.26 | `.tmp_w35b` 16.59 | `integ/wave2-0925` | 5 | 11-02 |
| `apkbuild` | 18.72 | 12.18 | `android` 5.45 | （游离） | 0 | 11-02 |
| `fix-r8` | 13.39 | — | `.tmp_w35b` 12.09 | `feat/w43b-press-feedback-vault-podcast-20261101` | 29 | 11-01 |
| `content` | 8.96 | — | `_work` 7.02 | `content/staging` | 64 | 10-16 |
| `up140` | 2.90 | — | `android` 2.18 | （游离） | 1 | 08-27 |
| `fix-r10` | 1.17 | — | — | `feat/w39a-image-announcement-server-20261031` | 27 | 10-31 |
| `fix-r6` | 1.16 | — | — | `feat/w39b-image-announcement-client-20261031` | 19 | 10-31 |
| `fix-r1` | 1.10 | — | — | `feat/w42b-podcast-favorites-playlist-20261031` | 198 | 10-31 |
| `_k3_rehearsal` | 1.10 | — | — | `k3/rehearsal-inputs` | 14 | 10-10 |
| `fix-r12` | 1.07 | — | — | `feat/w45a-podcast-publish-pool-20261101` | 140 | 11-01 |
| `fix-r5` | 1.06 | — | — | `audit/w18-1-20261011` | 10 | 10-11 |
| `cursor1` | 1.05 | — | — | `fix/w16f-split-result-card-copy-20261009` | 15 | 10-09 |
| `fix-r13` | 1.01 | — | — | `feat/w40c-cs-gift-server-20261031` | 1 | 10-31 |
| `fix-r11` | 1.00 | — | — | `release/w29c-epoch-223-152-20261028` | 68 | 10-28 |
| `zhenti-close180` | 0.97 | — | — | （游离） | 2 | 10-12 |
| `b58` | 0.92 | — | — | `restore/b58` | 1 | 10-03 |

“未提交”是 `git status --porcelain` 的行数（含未跟踪文件，比如 `.tmp_w35b` 若没被忽略也会算进去）。

## 11 个已脱离 git 的目录（约 11 GB）

- `fix-r3`、`fix-r4`、`fix-r7`、`grok2`、`grok3`、`grok4`、`ui`、`yb-release`：有 `.git` 文件，但它指向的 `F:\new\denglou\.git\worktrees\<名字>` 已经不存在（被 `git worktree prune` 或手动删过登记），git 不再把它们当工作树，里面有没有没提交的东西也没法用 git 查。较大的是 `ui` 2.6、`grok2` 1.7、`yb-release` 1.6、`grok4` 1.5、`fix-r3` 1.1、`grok3` 1.0、`fix-r4` 0.9 GB。
- `_dl_batchverify`、`b57f`、`fix-r2`：没有 `.git`。

## 项目以外、和 denglou 有关的占用（Water 这次已处理或记录）

| 位置 | 情况 |
|---|---|
| `C:\Windows\Temp\jest` | Jest 转换缓存按工作树各存一份（33 份、3.6 GB），用户已清。建议在 Jest 配置里把 `cacheDirectory` 放进工作树，或删树时 `jest --clearCache` |
| Claude Code 会话 | ui-v2 一个会话 4.1 GB，见上一份报告与你们的分析 |
| `F:\cdisk-cache\android-avd` | 23.6 GB：`climbmao_a35`（在用）与 `climbmao_up`（10-28 后没再用），各带 4 GB 的快照内存镜像 |
| `F:\cdisk-cache\gradle` | 8.0 GB，今天还在用 |
| `D:\claude-config\projects\F--new-denglou` | 2.2 GB，8～9 月的旧 Claude Code 会话（用户这次选择保留） |
| `F:\tmp` | 9 月的 denglou 导出目录（`w2*-export-*`、`expo-*` 等）已随 F:\tmp 的旧条目移入隔离 |

## 建议 denglou 总控考虑的事

1. **找到 `.tmp_w35b\verify-*` 的生产者**，让它用完即删（或放进系统临时目录并定期清），再清掉现有的 56 GB。
2. 11 个已脱离 git 的目录：确认里面没有要留的东西后删除。
3. 已合入或已放弃的工作树：按你们的分支状态判断，删树时一并删掉 `node_modules`、`android` 构建和 `.tmp_*`。
4. `_ctl`：只留需要的 APK（现有 45 个、11.9 GB），删掉 569 个没下完的 `.part`。
5. `_review\zhenti` 的 46 GB JSON：考虑压缩归档或移到数据盘。
6. 刷题本（65.5 GB）与两份 `登楼知识库`：资料放一处，查有没有重复。
7. 评测音频 `eval\distill-w0` 13.7 GB：是否该放到工作树之外的数据目录。
8. 模拟器：`climbmao_up` 不用了可以在 Android Studio 里删。

## 给 denglou 总控的转贴语

```text
读 F:/new/smaltalk/water/docs/maintenance/DENGLOU-DISK-USAGE-20261102.md：这是 Water 总控对 denglou 占用 319 GB 磁盘的只读分析，请你判断哪些可以清、哪些要改生产方式，给用户一张分级表。
```
