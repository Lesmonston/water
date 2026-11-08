# Water 总控交接报告（2026-11-09 第 27 份）

2026-11-09 JST，总控（Claude）。上一份是[第 26 份](CONTROLLER-HANDOFF-20261108-26.md)（11-08 19:55）。产品名 **Flick**；代码、仓库、包名仍叫 water。用户 11-09 凌晨：“收活，然后暂时就到这”。

## 0. 一句话现状

- **第十四波的六张单都已验收**（英文界面与语言切换、真实体检进度、一屏放下、第十三波遗留）：
  - R1 规则、J1 扫描、U1 界面、J2 扫描根目录信号已合入主线；
  - H1 宿主/安装包已通过，等 S1 一起合入；
  - S1 服务功能通过，但独立审查有一条中级（整盘位置在规则阶段就显示“正在统计整盘”），已出补单 03，**还没派**。
- **还没做**：主线上跑一遍服务、宿主、界面测试；第十二次整合（真宿主、中英两种语言）；导出与本地 CI；问用户后推空的公开仓库 `Lesmonston/flick`。
- 公开仓库仍是空的，不是远端；英文界面整合完、用户同意前不推。

## 1. 这一段做了什么（第 26 份之后）

| 时间（JST） | 事 | 提交 |
|---|---|---|
| 11-08 20:35 | 接手时 S1 已交回受阻：扫描包的进度回调分不出哪个目标走完了，W14 第 3.3 节“按完成的目标数”在服务里算不出来。总控读扫描源码核实。计划第 1 节“只改服务就够”只对整盘统计阶段成立，已更正 | — |
| 20:50 | 补充契约 [W14-ADD-01](../contracts/w14-v1/W14-ADD-01.md)：扫描包加 `on_root_done`，服务按根目录走完算。出 J2 扫描单；S1 分两段（补单 01 第 A 段，补单 02 第 B 段） | `a9a17310`、`06b82781`（STATUS 114） |
| 21:00 | S1 第 A 段受阻：检查器的 Clippy 会编译 `examples/service_smoke.rs`，工单白名单漏了它。补单 01 加第 5 节放开 | `bf6b3931` |
| 22:15～22:45 | 用户“收活”：U1 补单 01 轻门、J2 中门通过并合入；S1 第 A 段收下；总控把主线合进 S1 分支（`dd7ac13a`），出 S1 补单 02；H1 出单（底 `f91a982a`）。宿主 `forbid(unsafe_code)` 读不了系统语言，出 [W14-ADD-02](../contracts/w14-v1/W14-ADD-02.md)：不加 `system_language`，界面用 `navigator.language` | `c2e07b63`、`3953de0a`、`b724c4b8`（STATUS 115） |
| 22:50 | 用户：“两单都是sol” | `02fa2369` |
| 23:30 | H1 受阻：整机检查会让 Flick 把夹具一项移进盘根 `.flick-quarantine`，通用规则不许，第十四波规则与原单漏写了第十二波 P3 的例外。出 H1 补单 01 | `1e945f20` |
| 11-09 00:20～01:10 | 用户“收活，然后暂时就到这”：H1 补单 01 轻门通过；S1 补单 02 中门功能过，审查中级一条，出 S1 补单 03。期间用户要总控看 F 盘涨得太快（见第 3 节第 2 条） | 本份交接所在提交（STATUS 116） |

细节：[第十四波计划](dispatch/wave14/PLAN.md)、[清单](dispatch/wave14/manifest.json)、验收记录[第一批](acceptance/wave14/controller/WATER-W14-REVIEW-20261108.md)、[第二批](acceptance/wave14/controller/WATER-W14-REVIEW-20261108b.md)、[第三批](acceptance/wave14/controller/WATER-W14-REVIEW-20261109.md)、[状态页](STATUS.md)第 114～116 条。

## 2. 用户这一段的原话

- “收活。”（两次）
- “两单都是sol”。
- “收活，然后暂时就到这”。
- “你趁现在看一下F盘，现在涨的又太快了。”

## 3. 下一步（按顺序）

1. **派 S1 补单 03**（用户还没派；粘贴语见本节末）。交回后中门：
   - 审计（`w3-receipt-audit.mjs`，清单里补单 03 的 `resumeFromCommit` 已写）；
   - 新验收树（可在 `.worktrees/accept-w14-s1` 检出新 HEAD）；
   - `nc-replay.py s1` 重放三条负控；
   - 总控变异重点打补单 03 的改动，例如整盘位置的规则目标走完就标 `space`、单复数一律复数；
   - 独立审查。
2. **F 盘**（[普查](maintenance/F-USAGE-20261109.md)、[清理记录](maintenance/F-CLEANUP-20261109.md)，STATUS 117）：
   - 用户选“隔离1-4”：73 棵已合入的 Water 工作树（197.8 GB）已移进 `F:\_water-quarantine-20261109`，并跑了 `git worktree prune`；
   - 用户说自己删，总控已在资源管理器里打开这个文件夹。
   - **下次先核对**：隔离目录已不在、F 盘可用约 320 GB，结果补进清理记录第 4 节。
   - 第 6 项 denglou `worktrees` 交 denglou 总控（[简报](maintenance/DENGLOU-DISK-BRIEF-20261109.md)）；它回话后记一句。
   - **以后每次收单合入后就收树**：执行者树与验收树移进隔离区，只留还在做的。
3. **S1 + H1 一起合入**：
   - 先合 S1 分支，再合 H1 分支；H1 的底是 S1 第 A 段 `f91a982a`，应当没有冲突；
   - 合入后在主线跑服务、宿主、界面测试（照第十一次整合的做法，用 `integ-w8a` / `integ-w8b` 两棵树与覆盖清单）。
4. **第十二次整合**（[第十四波计划](dispatch/wave14/PLAN.md)第 5 节）：
   - 真宿主下中英两种语言走一遍主要页面；
   - 新数据目录第一次打开时，语言是否跟 Windows 显示语言（W14-ADD-02 的核对）；
   - 整盘体检的进度阶段（规则阶段按根目录走，整盘统计 40～94，95、100）；
   - 一屏放下（1240×820、1040×720）；
   - 显卡缓存可清量；
   - 安装包两种语言。
   - 开窗前告诉用户。可以给用户看真软件后再定界面的打磨项（方块图类别名等宽字体等遗留）。
5. **之后**：
   - 导出，扫描 0 个错误；
   - 在 F 盘以外跑 `scripts/release/ci-local.mjs`；
   - 问用户后推空的 `Lesmonston/flick`（一个提交、Deford 身份），重新发布（版本与标签再问）。
6. **遗留**（清单 `carryOverLater`）：
   - J2 测试没钉住“一开始就不走的根目录按计划顺序报”（中级测试缺口），兜底没有单独的根，README 措辞；
   - U1 方块图类别名等宽字体、共享样例里的“Water 不会动”；
   - H1 安装包语言自动选择没真装验证。

S1 补单 03 的粘贴语：

```text
WATER-W14-S1 补单 03
执行 Water 工单 WATER-W14-S1 补单 03：读权威补单 F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W14-S1-ADDENDUM-03-20261109.md 并照做，在原工作树 F:/new/smaltalk/water/.worktrees/w14-s1 从 47760070 续做，做完按补单第 5 节交回。
```

## 4. 这一段的教训

- **写单前核对上游接口能不能给出契约要的东西**：W14 第 3.3 节“按完成的目标数”，扫描包根本没有这个信号，S1 做到一半才发现。写进度一类的契约，先读一遍数据从哪来。
- **照抄旧单的清单条目时，白名单与例外也要跟着抄**：
  - S1 清单的 `productionFiles` 里有示例文件，工单白名单却没写；
  - H1 的整机检查要用盘根隔离区，第十二波规则里有例外，第十四波规则与工单都没带上。
  - 两次都是执行者照规则停下交回，耽误一轮。
- **宿主是 `forbid(unsafe_code)`**：要系统信息时，先看宿主现有依赖能不能给，不能就放到原生包里，或像这次一样改用界面能拿到的值。
- **清单里补单的续做提交要写成 `resumeFromCommit`（完整 SHA）**：收单审计按这个键检查，写成 `resumeFrom` 会报“不是祖先”。
- **工作区混合换行**会让审计报 final 哈希不符（U1 的 `app.css`、H1 的 `flick.nsi`）：去掉回车后与提交相同即可确认。
- **探针变异有用**：J2 的第四条变异没被抓到，和独立审查的中级是同一个测试缺口。

## 5. 现场

- **主线**：本份交接所在的提交。GitHub 私有仓库（`Lesmonston/water`）、本机中央仓库、E 盘镜像一致。公开仓库 `Lesmonston/flick` 是空的，不是远端。
- **第十四波分支与工作树**：
  - `.worktrees/w14-s1`：`worker/water-w14-s1`，交回 `47760070`；第 B 段的底是总控合并提交 `dd7ac13a`（清单 `baseCommit`，旧底记在 `baseHistory`）。补单 03 从这里续做。
  - `.worktrees/w14-h1`：`worker/water-w14-h1`，交回 `1b534207`（实现 `bb87445d`，底 `f91a982a`）。
  - 验收树：只留 `accept-w14-s1`（分支 `controller/accept-w14-s1`）。
  - 其余已合入的 73 棵树 11-09 已移进隔离区（分支都在，要用时 `git worktree add` 重建）。
  - `integ-w8b` 在 `controller/release-b`（`45294836`），用来编 release。
- **工具**：
  - `.local/w14-accept/`：`run.sh`、`seq.sh`、`make-manifest.mjs`、`nc-replay.py`、`controls.mjs`，以及 `add-mutations-{j1,j2,s1}.py`、`mutations.json`；
  - 清单生成：`docs/dispatch/wave14/add-s1.mjs`、`add-j2.mjs`、`add-h1.mjs`（H1 从第十一次整合的宿主条目克隆，加了 `bundle.copyright`）。
  - 发布：`scripts/release/export-public.mjs`、`scripts/release/ci-local.mjs`、`.local/w13-release/build-release.sh`。
- **本机**：
  - Flick 0.1.0 Beta 装在 `%LOCALAPPDATA%\Programs\Flick`；
  - `E:\flick-ci`（7.9 GB）还等用户自己删。
- **用户方面**：
  - 没有在外面做的单；S1 补单 03 待派；
  - 用户在删 `F:\_water-quarantine-20261109`；
  - denglou 简报在用户手里，要转给 denglou 总控；
  - 没有后台任务。

## 6. 粘贴语

```text
交接里写了（F:/new/smaltalk/water/docs/CONTROLLER-HANDOFF-20261109-27.md）：读交接报告，准备接手 Water 总控，从第 3 节第 1 条继续。
```
