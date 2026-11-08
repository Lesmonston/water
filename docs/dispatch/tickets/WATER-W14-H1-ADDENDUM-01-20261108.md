# WATER-W14-H1 补单 01：整机检查的隔离区例外，补跑 native（轻门）

2026-11-08，总控（Claude）。在原单 [WATER-W14-H1](WATER-W14-H1-HOST-20261108.md) 的基础上续做，原单的规则、边界、门照旧，本补单只写增量。可以新开对话执行。

原单交回受阻（`db0f188e`，实现 `bb87445d`）。实现、两条负控、`check --final`、`test --final`、安装包编译都已完成，只差 `native --final`。

受阻原因总控核实属实，是原单漏写了一条例外：
- 通用规则第 5 节不许在盘根建隔离区；
- 但检查器的整机流程会让 Flick 把夹具里的一项移进夹具所在盘根的 `.flick-quarantine`，再永久删除。
- 第十二波的执行者规则给 P3 写过这条例外（同第十一波 N2），第十四波的规则与原单都没带上。

你没有绕开检查器，也没有自己去碰盘根，是对的。

| 项 | 精确值 |
|---|---|
| 权威补单 | F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W14-H1-ADDENDUM-01-20261108.md |
| 原单 | F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W14-H1-HOST-20261108.md |
| 工作树 / 分支 | F:/new/smaltalk/water/.worktrees/w14-h1 / worker/water-w14-h1（原树，不新建） |
| 续做起点 | `db0f188e`（你交回的 HEAD），必须干净 |
| 检查入口、证据、回执 | 同原单；回执写在原回执后面，加一节“补单 01” |
| 门 | 轻门：在当前 HEAD 上重跑 check、test、native 三个 final，再 `archive` |

## 1. 例外（只此一处）

通用规则第 5 节“隔离根一律在本树 `.local/` 下”，对本单的 `native --final` 有一个例外：

- 只在检查器驱动的那一次 `native --final` 里，Flick 可以把夹具里选中的那一项移进夹具所在盘根的 `.flick-quarantine`（本树在 F 盘，就是 `F:\.flick-quarantine`），流程随后在界面里把这一批永久删除。
- 这一批由本次私有数据目录里的记录认领。永久删除只删这一批，盘根里别的东西（包括用户自己的隔离批次）Flick 看不到也不会碰。
- 检查器已经在管这件事：
  - 记下运行前这个根在不在；
  - 运行后核对恰好一批移入、一批删除、私有数据目录里没有残留的隔离记录；
  - 运行前这个根不存在的话，运行后也不能留下空的根。
- 你**不要**用别的办法读、列、建、删盘根的 `.flick-quarantine` 或 `.water-quarantine`，也不要在检查器之外启动 Flick。检查器报失败就照实交回，不要手动收拾。

## 2. 要做的

1. 不改产品代码与测试。
2. 在干净的 `db0f188e` 上依次跑：
   ```powershell
   node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W14-H1 --mode check --final
   node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W14-H1 --mode test --final
   node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W14-H1 --mode native --final
   node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W14-H1 --mode archive
   ```
   `native` 开**一个** Flick 窗口，只开一次。
3. 回执写 native 的结果：
   - 31 步是否都走完、截图名单；
   - 窗口退出码；
   - 检查器记下的 `nativeQuarantineRoot`（运行前后在不在）与 `nativeClean`、`nativePurge` 的计数。

   不写盘根里的其它内容。

## 3. 交回

- 回执第一行与通知完全一致：

  ```text
  WATER-W14-H1 补单 01 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w14-h1/docs/dispatch/reports/WATER-W14-H1-REPORT.md
  ```

- 受阻则写“WATER-W14-H1 补单 01 任务受阻”。
