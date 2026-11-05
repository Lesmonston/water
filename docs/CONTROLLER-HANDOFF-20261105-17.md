# Water 总控交接报告（2026-11-05 第 17 份）

项目根 `F:/new/smaltalk/water`，总控 Claude。用户 11-05 21:30 JST 说“先到这儿吧，记录一下状态”。本报告取代[第 16 份](CONTROLLER-HANDOFF-20261105-16.md)作为当前入口；第 16 份第 1、2 节与它列出的“仍然有效”各节继续有效。

所有回复用中文；GB 按 1024 换算。派单句不要“你接手 Water 项目……”这类开场白；每条派单句单独一个代码块并标单号，界面单单列。补单与派单句要能在新对话里直接执行（用户会归档旧对话，11-05 再次确认可以直接贴）。

## 0. 一句话现状

- 主线 `3894ed18`，三处与 E 盘镜像一致。
- 第十波后端：M9、M3、M8、M4 已验收合入；M1 补单 03 已交回待验收，M2 补单 01 在做，M5 补单 01 已出（是否已派不知道），M7 未写单。
- 界面 M6 仍暂缓：冰山可视化换了多轮画风，最新一版（平静的手绘游戏风）已发用户，等意见。

## 1. 这一段的提交（第 16 份 `e66d5e3a` 之后）

| 提交 | 内容 |
|---|---|
| `155bf29e` | M4 补单 02：改名改用 `NtSetInformationFile` 类 10（总控核对脚本在 `acceptance/wave10/controller/m4-rename-probe-20261105/`） |
| `c701d029`、`2def1796`、`bb841e4d` | M9、M3 合入与验收记录 |
| `a9053407`、`beaa89c0` | M8 合入与验收记录（B 组完成） |
| `dc07cf12` → `eccde405` | 拟物样稿 `viz-skeuo.html` 第二～五版（都被否） |
| `fad74fde` | M5 补单 01 |
| `e3c1b1c1`、`8d23798f` | M4 合入；M1 补单 03、M2 补单 01（验收未通过续做） |
| `0a00a3fe` | 新样稿 `viz-iceberg.html` 像素风（被否） |
| `3894ed18` | `viz-iceberg.html` 平静手绘游戏风（待用户意见） |

## 2. 第十波各单（21:30）

| 组 | 单 | 状态 | 要点 |
|---|---|---|---|
| A | M1 规则 | **补单 03 已交回，待验收**（`2fd789d8`，实现 `72ac1178`） | 补单 03：`jest-cache` 定位改两段 `["jest","*"]`；discovery 不许以盘根为 base；旧条件循环恢复覆盖原有 78 条 |
| A | M2 扫描 | **补单 01 在做**（工作树有未提交改动，起点 `f50da264`） | `<h>` 簇只收同扩展名；带声明的目录不算候选、声明不因成簇而删；名字命中但条件不成立的目录照常搜索；清单缓存释放、子项按名索引、簇循环查取消与预算 |
| B | M9、M3、M8 | **VERIFIED** 已合入 | — |
| C | M4 执行器 | **VERIFIED**（`e3c1b1c1`） | 遗留两条建议发布前修（见第 4 节） |
| C | M5 宿主 | **补单 01 已出**，派单句在[计划](dispatch/wave10/PLAN.md)第 7 节 | 授权 `host_command_registry` 里因命令追加与新参数而必然失败的旧断言，加通则 |
| — | M6 界面 | HOLD | 等可视化定稿 |
| — | M7 服务 | 未写单 | A、C 都合入后写，见第 5 节 |

M1 与 M2 一起合入（M2 的包不直接依赖规则包，但新规则产生的计划要新扫描器才认）。

## 3. 验收做法与工具

- 工具在 `.local/w10-accept/`（副本 `docs/acceptance/wave10/controller/accept-kit/`）：`run.sh <槽> <模式…>`、`make-manifest.mjs '{"m1":"<head>"}'`、`controls.mjs <槽> [起始标签]`、`record-verified.cjs '{"m1":"<合入提交>"}'`（实现提交、自报模型、审查摘要、遗留在脚本里按槽填）；变异清单 `.local/w10-accept/mutations.json`；`heads.json` 记交回 HEAD。
- 流程：
  1. `WATER_W2_AUDIT_MANIFEST=docs/dispatch/wave10/manifest.json node scripts/acceptance/w2-receipt-audit.mjs <单号>`；
  2. 验收树：`git worktree add -b controller/accept-w10-<槽> .worktrees/accept-w10-<槽> <交回HEAD>`；已有的 `accept-w10-m1`、`accept-w10-m2` 停在上一轮 HEAD，重验时用 `git -C <树> merge --ff-only <新HEAD>` 前移，然后 `make-manifest` 更新；
  3. `run.sh <槽> lock check:final real:final`（几棵树**按顺序**跑，同时编译会崩）；
  4. `controls.mjs <槽>`：锚点先核唯一；每个 nc 至少一条被抓住的红，否则 test final 缺证明（M8 这次就补了一条）；
  5. 只读代理独立审查，只给契约、单子、代码，不给回执；
  6. `run.sh <槽> archive`，证据拷进 `docs/acceptance/wave10/controller/accept-20261105/`，`git merge --no-ff`，核对包与证据目录与分支逐字节相同，`record-verified.cjs`，写[验收报告](acceptance/wave10/controller/WATER-W10-REVIEW-20261105.md)与 STATUS，五步推送。
- M1、M2 已有的变异（`mutations.json` 的 `m1`、`m2`）重验时锚点要按新代码重核。

## 4. 遗留（都在清单各单的 `carryOverLater` 里）

- **写 M7 单时必须交代**：
  - 调 `protects` 前把路径统一成 `X:\` 写法（M3 只认这种）；
  - 清理条目不能包住项目声明目录（路径是声明目录上级时 `protects` 按契约返回 None）；
  - `collected_at`（M9）是 Unix 秒字符串，要换成 RFC 3339；
  - M9 的中日韩与字母连写算一个词，不能单凭它说“似乎已卸载”；
  - SERVICE-M35-ADD-01：每个盘里各级别、各分类的字节数（界面按比例画用），在写 M7 前定。
- **建议 M3.5 发布前另出执行器小单**（M4）：子文件夹被占用时永久删除留下整块；编号目录被完全独占时报入口错误；编号放过设备名；移入后写日志失败丢整份报告。
- M3、M8 的真实冒烟用 `ancestors().nth(4)` 找仓库根，只在 `.worktrees/<名>/` 下可用，下次动这两个包时修。
- 教训（已写进各补单）：契约追加命令、参数或规则时，先把旧测试里整表比较、个数、切片、参数集合的断言逐处列出来再写豁免；契约表格里一格列多个名字时不要夹空格，路径分段写成 `["a","b"]`。

## 5. 界面：冰山可视化（M6 暂缓的原因与进度）

用户这段的要求，按先后（原话都在记忆 `water-ui-frosted-glass.md` 与第 16 份第 4 节）：
1. 冰山一角放大画（面积按可清字节，32 GB 画满），始终居中；
2. 每项垃圾是一整块、颜色按类别、半透明；不要冰山里星星点点的小石块；
3. 水下冰山默认要小一点；水下的块设最小尺寸（边长 clamp(√(GB×1100), 32, 96) px）；
4. 冰山由轮廓吻合的块**拼起来**，体检时越拼越大，块够大时上面显出名字（“C 盘”、垃圾名与大小）；不要镜面效果；
5. 风格先后否定：低多边形玻璃（太塑料）→ 2D 动漫磨砂 → 水彩参考图 → 像素风（参考《潜水员戴夫》，只借画风）→ 用户说“留白太少了，画面看起来太脏了，不干净”，给了两张平静的立体手绘解谜游戏截图（`design/water-ui-v2/feedback/20261105-user-reference-game-*.webp`）。

当前样稿 [viz-iceberg.html](design/water-ui-v2/viz-iceberg.html)（`3894ed18`，预览 `previews/iceberg-*.png` 六帧：体检早/中/后、结果、清理中、完成）：
- 大片安静的水面，冰山约占右侧画面 19%；
- 冰山是加权 Voronoi 切出的圆角厚石板，边缘严丝合缝，体检时一块块滑进来；
- 名牌只挂面积 ≥ 2500 px² 的块；
- 待看的块带琥珀小徽标，受保护带锁。

`viz-skeuo.html` 是旧路线，留作历史。下一步：
1. 等用户对这一版的意见；
2. 定了就铺开首页、隔离区、趋势、查重、空间分布；
3. 然后改设计 v2、UI-M35（画面对照、左栏、动画、截图名单）、样例；
4. 重出 M6（界面单，用户选模型）。

做画面的代理每轮都要先对照参考图看“干净、留白”。

## 6. 下一步（按顺序）

1. 验收 M1 补单 03（`2fd789d8`）；等 M2 补单 01 交回后验收；两张都过再一起合入。
   - **11-06 00:50 已做**（STATUS 第 57 条、验收报告第 9 节）：M1 通过，顺手出补单 04（剪映 `CEF Cache`）；M2 未通过，出补单 02（`.git` 内出条目等）。派单句在计划第 7 节末尾。两张交回后重验，验收树 `accept-w10-m1`、`accept-w10-m2` 照旧 `merge --ff-only` 前移，变异清单已按新代码更新（M1 c1～c10，M2 c1～c8）；计时用旧代码临时树 `.worktrees/tmp-m2-old` 与脚本 `acceptance/wave10/controller/accept-20261105/controller/logs/m2-timing/m2-timing.sh`。
2. 等 M5 补单 01 交回后验收合入（C 组完成）。
3. 用户定下冰山画风后，按第 5 节推进界面。
4. A、C 都合入后写 M7 服务单（含 SERVICE-M35-ADD-01 与第 4 节要交代的几条），从合入后的 HEAD 开工。
5. M4 遗留的执行器小单（问用户）。
6. M7、M6 合入后：第七次整合检查、release、M3.5 验收。
7. 仍欠：“删了还剩”复盘、合成夹具生成器、Water 自己的 `.water-cleanup.json`；第 14 份第 3 节用户侧事项照旧。

## 7. 接手粘贴语

```text
交接里写了（F:/new/smaltalk/water/docs/CONTROLLER-HANDOFF-20261105-17.md）：读交接报告，准备接手 Water 总控，从第 6 节继续第十波。
```
