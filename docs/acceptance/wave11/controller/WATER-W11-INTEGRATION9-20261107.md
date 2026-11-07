# 第九次主线整合检查（2026-11-07）

总控（Claude）。第十一波八张单全部合入之后做（见[第十一波计划](../../../dispatch/wave11/PLAN.md)第 3 节“合入之后”）。用户 11-07 定首页重复计数“放第十二波”，随后按计划往下走。

| 项 | 值 |
|---|---|
| 受测提交 | `3d8bec11`。主线合入第十一波八张单（最后一张 N1 `520d7a09`），加上总控的两个提交：验收记录（`ad8b19d3`）和检查器能认 `.flick-quarantine`（`3d8bec11`） |
| 结论 | **通过**。八个部分全绿；真窗口 17 步通过，窗口标题 Flick，新移入走 `.flick-quarantine`；选择框 7 次真对话框，标题都是 Flick；release 编好、冒烟通过；同位置真实复验的扫描结果与第八次一致，改名与收尾项都看得到 |
| release | `.local/release/flick-0.1.0-3d8bec11/flick.exe`，sha256 `83e13946088094ff1ba7eaa7e25abf4555236415f42dafbd451bf957cdfb1111`，14,026,240 字节 |

## 范围

第八次整合的受测提交是 `63a500ae`。从那以后改了：
- 执行器 `junk-clean`（N3）、规则 `junk-rules`（N4）、扫描 `junk-scan`（N5）、项目声明 `cleanup-manifest`（N6）、查重 `dup-finder`（N7）、服务 `water-service`（N8）；
- 宿主 `apps/water/host`（N2）、界面 `apps/water/ui`（N1）；
- 选择框 `native-picker` 的标题（总控 `f36975c9`）。

进程与已安装程序两个包 `git diff 63a500ae 3d8bec11` 为空，沿用[第八次](../../wave10/controller/WATER-W10-INTEGRATION8-20261107.md)（它又沿用第七次）的结果。

- **工具**：`.local/w11-integ9/`（副本在 [controller](integ9-20261107/controller/)）。各部分用第十一波对应单子的任务配置；宿主用 N2 的整机步骤与夹具，只改两处：
  - “无法连接”那一步的文字换成 Flick；
  - 检查器核对的隔离根换成 `.flick-quarantine`。
- **检查器改动**（`3d8bec11`）：`desktop-wave-check.mjs` 的整机隔离根改由任务的 `nativeQuarantineName` 指定，旧清单不写这一项时仍是 `.water-quarantine`。同时记录另一个名字，运行中不许出现。
- **整合树**：两棵树换到新分支：A `.worktrees/integ-w8a`（`controller/integ9-a`），B `.worktrees/integ-w8b`（`controller/integ9-b`）。
- **顺序**：一次只跑一棵树的 cargo。先 A 上的五个包与界面，再 B 上的宿主，然后服务单独跑；最后依次是整机、选择框、release、复验。

## 结果

一轮全绿，30 步都是退出码 0（[integ.txt](integ9-20261107/controller/integ.txt)）。没有计时失败，也没有重跑。

| 部分 | 结果 |
|---|---|
| 执行器 | lock、check、测试 11/11；真实只读冒烟 |
| 规则 | lock、check、测试 4/4；真实只读冒烟（规则 110 条，基础目录存在 87、字面前缀存在 70，与第八次相同） |
| 扫描 | lock、check、测试 5/5；真实只读冒烟 |
| 项目声明 | lock、check、测试 4/4；真实只读冒烟 |
| 查重 | lock、check、测试 4/4；真实只读冒烟 |
| 界面 | check、测试、浏览器 |
| 宿主 | lock、check、测试 5/5；真窗口 17 步 |
| 服务 | lock、check、测试 12/12；真实只读冒烟（常用位置，清理关闭） |

归档时出过一次总控工具的问题：几部分共用树 A，第一部分归档后，后面几部分把它的证据当成范围外的文件。各部分的允许前缀改为整个 `integ9-20261107/` 后重跑归档，都通过。产品与检查结果不受影响。

## 真窗口（`native --final`）

- **范围**：一个 Flick 窗口，只用合成夹具，步骤同 N2 的验收。
- **结果**：17/17，10.4 秒，退出码 0，没有残留子进程。
  - 推荐的构建缓存直接删除，3,145,815 字节；
  - 选中的安装包先进 `F:\.flick-quarantine`，再永久删除，1,048,576 字节；
  - `F:\.flick-quarantine` 原先不存在，用完也不存在；`F:\.water-quarantine` 前后都不存在。
- **截图**：6 张 1568×1072。系统标题栏与顶栏都是一笔弹出的标志加 “Flick”。确认框的摘要是“你加的位置 3 MB（带缓存标记的目录）”（N8 第 1.6 节）。

## 选择框（总控改的标题，`f36975c9`）

- **做法**：在树 A 编 `native-picker` 的 `picker_v1` 测试，用 `scripts/picker-test-driver.mjs` 跑。每弹一次对话框，由 `picker-ui-action.ps1` 按取消或选定，它会打出对话框标题。夹具是 `.local/picker-fixtures` 下的空目录与一个联接。
- **结果**：7 次真对话框，标题都是 `Flick - Select a read-only directory`；5 个测试全过（[picker-real.txt](integ9-20261107/controller/picker-real.txt)）。

## release 版

- **构建**：在树 B 用同一工具链、离线缓存与镜像参数，`--release --locked --bin flick`，86 秒，构建前后树都干净（[release-build.txt](integ9-20261107/controller/release-build.txt)）。
- **版本信息**：ProductName 与 FileDescription 是 `Flick`，版本 0.1.0；CompanyName 仍是 `water`（N2 的已知遗留）。
- **冒烟**：空的新数据目录，[记录](integ9-20261107/controller/release-20261107T111512Z-second-instance.json)：

  | 项 | 值 |
  |---|---|
  | 第二个实例 | 47 毫秒退出，退出码 0 |
  | 最小化的窗口回到前台 | 108 毫秒 |
  | 正常关窗 | 退出码 0 |

- **冒烟脚本**：`w4-g6-second-instance.ps1` 加了 `-Title`，缺省仍是 Water，这次传 Flick。

## 同位置真实复验

做法同[第八次](../../wave10/controller/WATER-W10-INTEGRATION8-20261107.md)：
- **工具**：`m35-close-observe.ps1` 的第十一波副本，窗口标题改为参数（这次传 Flick），“无法连接”那一步改成 Flick 的文字；
- **数据目录**：新的 `.local/w11-integ9/real/20261107T111559Z`；
- **范围**：D 盘与 `F:\Mirasim-A`，只读，步骤里没有清理或删除。

15 步都通过，退出码 0。脱敏摘要在 [real-20261107T111559Z.json](integ9-20261107/controller/real-20261107T111559Z.json)；截图和原始导出有真实路径，留在本机 `.local`。

**和第八次比**：

| 项 | 第八次（`water-0.1.0-63a500ae`） | 第九次（`flick-0.1.0-3d8bec11`） |
|---|---|---|
| 扫描 | 部分完成，7.4 秒，访问 143,447 项；48 组、208 项（推荐 18、要确认 18、仅供参考 12）；无权限 25、联接跳过 700 | 部分完成，6.1 秒，访问 143,537 项；组、项、分级、问题数都相同 |
| 页头小字 | “D 盘、Mirasim-A · 刚刚” | 加上“部分完成：有的位置没有权限，或时间到了”（N1） |
| 聚簇卡片 | “…同模板目录，已经不长了”，同簇线索却写“最近 14 天新增 52 个” | “…同模板目录，最近 14 天新增 52 个”，与线索一致（N8 第 1.5 节，第八次遗留 1 解决） |
| “包含什么”与摘要 | “自定义” | “你加的位置 335 MB（内置浏览器的网页缓存、Python 工具缓存）”（N8 第 1.6 节） |
| 明细 | “自定义 · 20 组 · 4.4 GB” | “你加的位置 · 20 组 · 4.4 GB” |
| 空隔离区的“一共” | “<1 MB” | “0 MB”（N1） |
| 系统建议 | 2 条，约 341 MB | 3 条，约 348 MB（本机状态变了，不是产品改动） |
| 名字 | 窗口与页面都是 Water | 窗口、顶栏、页面标题都是 Flick |

摘要脚本原来只认“同模板目录，已经/每天”开头的卡片，换了说法就漏掉。改成认“同模板目录/文件，”之后重新生成：卡片 5 张，都在页面上。第八次的摘要漏掉了两张“同模板文件”的卡片，原因相同。

## 遗留

1. **首页重复计嵌套条目**（N8 验收中级）：用户 11-07：“放第十二波”，见[第十一波计划](../../../dispatch/wave11/PLAN.md)第 6 节。这次复验没有选中嵌套的两组，看不出来。
2. **CompanyName 仍是 `water`**（N2 遗留）：exe 版本信息里的公司名。
3. 各单的其它低级遗留在[第十一波清单](../../../dispatch/wave11/manifest.json)各单的 `carryOverLater` 里。

## 没有覆盖的

同第八次：
- 真实关机与注销；
- 默认数据目录（包括 `%LOCALAPPDATA%\Water` 搬到 `Flick` 的真实搬家，只在 N2 的测试与验收里用合成目录做过）；
- 真实 U 盘与映射盘；
- 真实数据上的应用内清理（由用户本人按）；
- macOS。

## 证据

- **各部分**：[exec](integ9-20261107/exec/)、[rules](integ9-20261107/rules/)、[scan](integ9-20261107/scan/)、[decl](integ9-20261107/decl/)、[dup](integ9-20261107/dup/)、[ui](integ9-20261107/ui/)、[svc](integ9-20261107/svc/)、[host](integ9-20261107/host/)。宿主目录里有整机的 6 张截图与步骤记录。
- **总控工具与日志**：[controller](integ9-20261107/controller/)，含覆盖清单、运行脚本、逐行结果、选择框、release 构建与冒烟、复验工具与脱敏摘要。
