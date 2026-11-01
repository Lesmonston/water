# denglou 清理执行单与执行结果（2026-11-02）

Water 总控（Claude）。依据 `denglou` 总控的分级回执 `F:\new\denglou\worktrees\ui-v2\docs\ops\DISK-USAGE-TRIAGE-20261102.md`，用户逐项选定。

**执行人改为 Water 总控。** 本单原写“交 `denglou` 总控执行”，用户看过后说：“这是你需要做的事情，你要在这个过程中总结经验，旧压缩包可以不删按照你推荐的来。”执行结果见文末“执行结果”一节；下面“做法”“逐项”两节保留写单时的原文。

## 用户原话

> A/B都清理，然后C1/C2你查一下有没有重复的，只留一份，如果有我曾经的压缩文档也可以删除，C3压缩归档。C4测评音频应该也没用了可以删除。C5/C6不要动。

编号对应回执第 1 节分级表（Water 总控转述时加的编号）：A1 `.tmp_w35b`、A2 下载分段、A3 本机测试包、A4 模拟器快照；B1 脱离目录、B2 已合入工作树、B3 执行方工作区、B4 `ui-v2` 根目录 `.tmp_*`、B5 `_ctl` 往期演练；C1 刷题本、C2 两份登楼知识库、C3 `_review\zhenti`、C4 评测音频、C5 宣传视频、C6 `content` 的 `_work`；D 保留项。

## 做法（建议沿用 Water 这一轮的做法）

- 先移到同盘隔离目录（例如 `F:\_denglou-quarantine-20261102\`），写清单（原路径、大小、时间），由用户核对后删除；移动前查有没有进程在用。
- 工作树一律 `git worktree remove`，不手删目录（回执 P7）。
- 完成后给用户一份回执：逐项结果、隔离目录体量、跳过的项及原因。

## 逐项

GB 按 1024 换算。“现状”是 Water 总控 11-02 约 02:30 JST 的只读核对。

| # | 用户选择 | 内容与做法 | 约 GB | 现状与注意 |
|---|---|---|---:|---|
| A1 | 清 | 三棵工作树的 `.tmp_w35b\verify-*` | 56 | `fix-r9` 123 个（都是 10-30 建的）、`audit-b57a` 81 个、`fix-r8` 51 个，共 255 个（Water 总控上一份报告写“约 130 个”是数错了，体量无误）。`audit-b57a` 最新的 9 个建于 11-02 01:34，修复 `f4e29ebd` 在 01:43 提交，`audit-b57a` 已含修复，此后没有新增。**`fix-r8`、`fix-r9` 不含修复，再跑全量门还会长**，清之前或之后要让它们带上修复 |
| A2 | 清 | `_ctl\**\*.apk.parts`（7 个目录、569 个分段） | 2.2 | 7 个目录仍在 |
| A3 | 清 | `_ctl\*\apk_<提交号>.apk` | 3.1 | 现有 12 个；按回执只留 `w45_collect\apk_871cd852.apk` |
| A4 | 清 | `F:\cdisk-cache\android-avd\*.avd\snapshots`（`climbmao_a35`、`climbmao_up` 各一份） | 8.2 | **核对时模拟器正在运行**（`emulator.exe`、`qemu-system-x86_64.exe`）。要先关模拟器、把启动参数改成 `-no-snapshot`（回执 P4），再清；否则退出时又存回来 |
| B1 | 清 | 11 个已脱离 git 的目录：`fix-r3`、`fix-r4`、`fix-r7`、`grok2`、`grok3`、`grok4`、`ui`、`yb-release`、`_dl_batchverify`、`b57f`、`fix-r2` | 11 | git 查不了有无未提交内容；回执说成果都已在中央库 |
| B2 | 清 | 已合入、不再复用的工作树：`b58`、`cursor1`、`zhenti-close180`、`up140`（`_k3_rehearsal` 属内容线，不在此列） | 6 | **四棵都有未提交的改动**，`git worktree remove` 会拒绝，需先核再决定是否 `--force`：四棵都删了一个被跟踪的 `scratch/…/__pycache__/*.pyc`（无害）；`cursor1` 共 15 处，含未跟踪的 `.tmp_eval/`、`.tmp_p3b/` 等；`zhenti-close180` 有未跟踪的 `_work/zhenti/close180/packages/`，像是真题打包产物，请确认已有归宿 |
| B3 | 清 | 执行方反复用的工作区 `fix-r1`、`fix-r5`、`fix-r6`、`fix-r10`、`fix-r11`、`fix-r13` 等 | 小 | **按回执的做法：保留目录，只清里面的 `.tmp_*`**。Water 总控转给用户的表里就是这样写的，用户选“B都清理”，按这一行的做法执行；若用户要连目录删，另说 |
| B4 | 清 | `ui-v2` 根目录的 `.tmp_*` | 3.3 | 现有 414 个 |
| B5 | 清 | `_ctl` 往期演练目录（`ota_rehearsal_151`、`release_152`、`w29b_drill`、`w28_drill` 等）里的 APK 与安装包 | 9 | 按回执：脚本与日志留着，只删大件。用户没说上架包是否留底，**默认每个上架版本留一份** |
| C1、C2 | 只留一份 | 刷题本与两份登楼知识库查重，见下节 | 4.7 | 逐字节相同的只有这么多 |
| C1、C2 | 压缩包可删 | 见下节 | — | **结论：不删**。只找到 10 个，9 个的内容是唯一的一份 |
| C3 | 压缩归档 | `_review\zhenti`（77,873 个 JSON 约 46 GB，另有 `.db` 3.0、`.jsonl` 2.8） | 53.1 | 属内容线。建议：仍被现行脚本读的部分不压；其余按版本打包，归档包放同盘；**校验通过（能完整解开、文件数一致）后再删原件** |
| C4 | 删 | `ui-v2\eval\distill-w0` 的 288 个 `.m4a` | 13.7 | 被 `.gitignore` 忽略，删了无法从 git 找回；用户说“应该也没用了可以删除”。回执原建议是移出工作树，这里按用户的选择删除（仍先进隔离目录） |
| C5、C6 | 不动 | 宣传视频、`content` 的 `_work` | — | — |
| D | 保留 | `node_modules`、`apkbuild\android`、Gradle、两台模拟器本体 | — | — |

## C1、C2 查重结果

方法：[dup-keep-one.cjs](../acceptance/wave8/controller/cleanup-20261101/dup-keep-one.cjs)，三处共 18,959 个文件，同大小的才算完整 SHA-256，所以列出的都是逐字节相同。完整清单（每组留哪份、删哪些，含完整路径）：`F:\new\smaltalk\water\.local\cleanup-20261101\dup-denglou-C1C2.json`（不进 git）。

**留哪份的规则**：
1. `F:\new\登楼知识库`（项目外那份）**一个都不动**：`scripts/content/adapt_gen.js`、`gkz_pull.js` 直接读 `F:/new/登楼知识库/gkzhenti_json`、`pdf_json`。它内部的 6 个重复也不删。
2. 其次是刷题本（按科目分文件夹的原始合集）。
3. 最后是项目内的 `登楼知识库`（平铺，不少文件带 `-<12 位十六进制>` 的导出尾巴）。同一处有两份时留不带尾巴的。

| 删哪里 | 因为和哪里相同 | 文件数 | GB |
|---|---|---:|---:|
| 刷题本 | `F:\new\登楼知识库` | 172 | 0.53 |
| 项目内 `登楼知识库` | 刷题本（大头是 26 版教材五本，单本 0.4～0.6 GB） | 64 | 3.65 |
| 项目内 `登楼知识库` | 它自己（导出副本） | 125 | 0.53 |
| **合计** | | **361** | **4.71** |

- 两边**同名但内容不同**的有 27 个（项目内那份共 0.79 GB），可能是不同版本，不算重复、不删。
- 删完后：刷题本约 64.9 GB，项目内 `登楼知识库` 约 8.7 GB。两套资料大部分是不同的东西，所以“只留一份”能省的不多。

**压缩包**（[zip-extracted.cjs](../acceptance/wave8/controller/cleanup-20261101/zip-extracted.cjs)，按包内每个文件的大小，到三处资料的全部文件里找）：
- 三处资料里一共 10 个 zip（0.13 GB），都在刷题本里。只有 1 个（0.8 MB，`2024明哥综应D类教育常识300题（答案解析）.zip`）的内容在外面全能找到；其余 9 个（129 MB）里的答案、押题卷在外面找不到，是唯一的一份。**建议都不删**。
- 下载目录、QQ、微信文件、D 盘、E 盘里的压缩包 31 个，没有一个与这些资料有关。四个盘 500 MB 以上的压缩包也都无关。

## 预计

A 约 70、B 约 30、C1/C2 4.7、C4 13.7，合计约 118 GB；C3 压缩后再省一大块（JSON 压缩率通常很高，具体看归档方式）。

## 执行结果（Water 总控，11-02 约 02:45～03:00 JST）

**做法**：全部移到 `F:\_water-quarantine-20261102-dl\<编号>\<原路径>`（同盘改名，可原样移回），逐项查在用进程，由用户核对后删除。B2 移完后在 `denglou` 仓库跑 `git worktree prune`；C3 先压缩、核对，再隔离原目录。计划由 [plan-denglou.cjs](../acceptance/wave8/controller/cleanup-20261101/plan-denglou.cjs) 按规则现场生成，生成时逐条重查前提；明细日志在 `.local/cleanup-20261101/quarantine-DL.jsonl`（不进 git）。

**执行时 `denglou` 总控正在另一个会话里做真机测试**：模拟器 `climbmao_a35`、4 个 PostgreSQL（数据目录在 `_ctl\w45_fix`、`_ctl\w45_collect`、`_ctl\w37b_device`）、`_ctl\w39w40_device\server_up.sh`，日志写在 `_ctl\r153_final`。这些目录一律没碰；工作树里的 `.tmp_*` 只动两天以上没改过的。

| # | 结果 | 去重后 GB | 说明 |
|---|---|---:|---|
| A1 | 254 个 `verify-*` 移走 | 56.05 | 只挑名字为 `verify-` 加 6 位字母数字的目录。`fix-r9`、`fix-r8` 的 `.tmp_w35b` 里还有执行方的脚本、报告与数据库快照，**原样留着**；`verify-s8-revisions.cjs` 是脚本，不是泄漏，也留着 |
| A2 | 7 个 `.apk.parts` 移走 | 2.21 | 移前逐个确认旁边有大小一致的完整文件 |
| A3 | 11 个测试包移走 | 2.80 | 9 个按提交号命名的，加 `apk_F1`、`apk_F2`、`apk_diag`；留 `w45_collect\apk_871cd852.apk` |
| A4 | `climbmao_up` 的快照移走 | 4.02 | **`climbmao_a35` 的快照没动**：它正在运行（已是 `-no-snapshot` 启动，回执 P4 已做），快照 11-02 01:19 还写过。关掉模拟器后可以再清这 4 GB |
| B1 | 10 个移走，`grok2` 移回原位 | 9.88 | 见下文“差点弄断的依赖” |
| B2 | 4 棵移走，`git worktree prune` 注销了正好这 4 个登记 | 6.05 | 分支保留（如 `restore/b58`）。`zhenti-close180` 未提交的 `_work\zhenti\close180\packages\v225`（2.8 MB）在隔离区里，`content` 工作树有同名交付目录 |
| B3 | 164 个 `.tmp_*` 移走 | 0.49 | 6 个执行方工作区的目录都保留 |
| B4 | 414 个 `.tmp_*` 移走 | 3.24 | 都是两天以上没改过的 |
| B5 | 45 项移走 | 11.01 | 演练目录里的测试、诊断、集成 APK，以及 Expo 导出产物（`U*-dist`、`U*-out`、`export*`）。**每个上架版本留一份**：`release_152\climbmao-1.5.2-vc25-store.apk`、`ota_rehearsal_151\app-151-eas-72b8d5b6-vc19.apk`。设备数据库快照与 `release_152\up_151_backup.tgz` 不属于“APK 与安装包”，留着 |
| C1/C2 | 361 个重复文件移走 | 4.71 | 按上节规则；`F:\new\登楼知识库` 一个没动；压缩包都不删（用户：“旧压缩包可以不删按照你推荐的来”） |
| C3 | 压缩归档：41 个子目录打成 51 个 zip，52.3 GB 压成 3.7 GB，全部核对通过后原目录移走 | 53.09 | 归档包在 `F:\new\denglou\_review\zhenti-archive-20261102\`，包内路径保持原样，解压到 `_review\zhenti\` 即恢复。原位置留了索引 `_review\zhenti\ARCHIVED-20261102.md`；顶层台账文件没动。脚本 [archive-zhenti.py](../acceptance/wave8/controller/cleanup-20261101/archive-zhenti.py) |
| C4 | 288 个 `.m4a`、13 个 `.wav` 移走 | 13.97 | 同目录的转写文本、结果 JSON、`.md` 与评测脚本留着 |
| C5、C6、D | 没动 | — | |
| **合计** | | **167.52** | F 盘删除前可用 204.86 GB（新增的归档包占 3.7 GB），删除后约 372 GB |

### 差点弄断的依赖（已恢复）

移完后在 `F:\new\denglou` 与 `F:\cdisk-cache` 全盘查“还有没有联接指向被移走的路径”（[links-into-moved.cjs](../acceptance/wave8/controller/cleanup-20261101/links-into-moved.cjs)），查出一条：保留的整合树 `audit-b57a` 的 `server\node_modules` 指向 `grok2\server\node_modules`，而那本身是指向 `ui-v2` 的联接。`grok2` 被当作脱离目录移走后，这条链断了。总控当场把 `grok2` 原样移回，复查为 0 条。**`grok2` 要等 `audit-b57a` 的这个联接直接改指 `ui-v2\server\node_modules` 之后才能删。**

### 隔离区里的联接已拆除

隔离区里原有 26 个联接（B1、B2 的工作树共用 `ui-v2` 的 `node_modules`、`android`，C3 的 `final` 里有一个指向 `content\node_modules`）。`grok2` 移回后剩 23 个，总控逐个确认是重解析点后做不递归的删除，只去掉联接本身。复查隔离区 0 个联接，`ui-v2\node_modules` 完好。这样用户删除隔离区时，不会有命令顺着联接删到在用的依赖。

## 给 denglou 总控的转贴语（知会）

```text
读 F:/new/smaltalk/water/docs/maintenance/DENGLOU-CLEANUP-ORDER-20261102.md 的“执行结果”一节：用户让 Water 总控代为清理了你的分级回执里选中的项（已移到 F:\_water-quarantine-20261102-dl，等用户删除）。请注意：b58、cursor1、zhenti-close180、up140 四棵工作树已移走并 prune；_review\zhenti 已压缩归档到 _review\zhenti-archive-20261102；grok2 因 audit-b57a\server\node_modules 经它联接到 ui-v2 而保留，请把那个联接直接改指 ui-v2\server\node_modules 后再决定 grok2；fix-r8、fix-r9 不含 f4e29ebd，跑全量门还会长 verify-*；climbmao_a35 的快照没动。
```
