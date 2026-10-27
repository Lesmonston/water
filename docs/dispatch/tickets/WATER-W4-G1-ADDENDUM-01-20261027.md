# WATER-W4-G1 补单 01：删除路径复核与报告修正（重门）

2026-10-27，总控（Claude）。依据 [G1 收单验收](../../acceptance/wave4/controller/WATER-W4-G1-REVIEW-20261027.md)。**这是删除路径上的特殊票，可以新开对话执行。** 新执行者开工前依次读：
1. 原票 `F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W4-G1-CLEAN-HARDENING-20261026.md`；
2. 规则 `F:/new/smaltalk/water/docs/dispatch/W4-HARDENING-WORKER-RULES.md`；
3. SPEC `F:/new/smaltalk/water/contracts/hardening-v1/CLEAN-HARDENING.md`（全文，含第 11 节附录）与原契约 `F:/new/smaltalk/water/contracts/checkup-v1/CLEAN.md`；
4. 本补单；
5. 上一轮回执 `F:/new/smaltalk/water/.worktrees/w4-g1/docs/dispatch/reports/WATER-W4-G1-REPORT.md` 与上面的验收报告。

## 验收结果

下面这些已经通过，不要改：
- 机械检查、两个 final、三条负控；
- 只声明 8 个允许的系统函数，`src/` 没有 `std::fs` 与 `Path`；
- 快照与删除都相对句柄打开，不进入链接；
- 非名称代理重解析点让整项 `reparse`；
- 守卫与保护路径按身份比对；
- 删除方式 0x13、不改属性；
- 子项句柄先于父目录的删除标记关闭。

总控另做的 6 项合成用例全部通过（深层长路径、只读、指出条目的联接、指回祖先的联接、硬链接、目录符号链接的组合）。

要改的是下面这些。编号与验收报告对应。

## 要改的（全部在 `packages/junk-clean/src/` 内）

### 1. 删除链接前从句柄复核（高级 H1）

名称代理链接相对父句柄打开链接本身后，从**这个句柄**读属性、重解析标签与 FileId。只有下面三条同时成立才删：
- 仍是重解析点；
- 标签带名称代理位 `0x2000_0000`；
- FileId 等于快照里这一项的 FileId。

否则不删，计 1 个 failed_entries。

背景：现在只看“仍是重解析点”。删除过程中若某个联接被换成同名的非链接重解析点（例如 OneDrive 云占位文件），它会被删掉，而删占位文件会同步删掉云端文件。

### 2. 条目身份从句柄比对（中级 1）

- 第 3 步改为从**走到条目的那个句柄**读卷序列号与 FileId，与计划的 `identity` 比较，不同 → `changed`。两次复核与快照都这样做。
- 执行路径里不再用按路径名打开的 `identity_of` 做第 3 步。公开函数 `identity_of` 本身保留，它是给生成计划用的。

**对 CLEAN-HARDENING 第 4 节第 2 步第 5 条的放宽**（本补单覆盖该条）：
- 不要求同一个条目句柄从第 2 步一直保留到第 7 步。
- 每一步可以从盘根重新逐级按句柄打开，但每次都必须从自己用的条目句柄核对：
  - 复核与快照时，FileId 等于计划 `identity`；
  - 删除时，FileId 等于快照里条目本身那一项（现有逻辑已做，保持）。

### 3. 枚举区分“结束”与“出错”（中级 2）

- 枚举只有在系统返回“没有更多文件”（错误 18）时才算正常结束；其它任何失败都是错误。
- 读错误码用 `std::io::Error::last_os_error()`，不新增系统函数声明。
- 遇到错误时：
  - **快照**中：本项 `changed`。
  - **删除**中某个目录枚举失败：计 1 个 failed_entries，不给这个目录设删除标记，并停止本项（同第 5 条）。
  - **统计残余**时：残余未知，按 `bytes_before` 计，计 1 个 failed_entries。**任何残余未知的情况都不得报 `deleted`。**

### 4. 残余按句柄统计（中级 3）

- 第 8 步改为：重新逐级打开到父目录，再相对父句柄按名字打开条目本身（同样不跟随）。
  - 不存在（错误 2 或 3）→ 残余 0；
  - FileId 不等于快照里条目本身 → 原条目已不在，残余 0；
  - 否则从这个句柄统计：目录按句柄枚举求和，文件读长度。
- 不再在父目录列表里按名字比对。现在只忽略 ASCII 大小写，非 ASCII 大小写不同或 8.3 短名时会误报 `deleted`。
- 父目录打不开或统计中出错 → 残余未知，按第 3 条处理。

### 5. 删除时对象变了就停止本项（中级 4）

删除时区分两类：
- **名字在快照里、但对象变了**：FileId 不同，或类型、重解析状态与快照不符。
  - 是目录 → 计 1 个 failed_entries，并**停止本项**（本项不再删除任何东西，已删的不恢复，结果按残余规则判 `partial` 或 `failed`），同 SPEC 第 4 节第 7 步。
  - 是文件或链接 → 不删，计 1 个 failed_entries，继续下一个。
  - 这同样适用于枚举父目录时发现的子项：现在名字在快照里但 FileId 不同的子项被静默跳过，要改为按上面计数，目录要停止本项。
- **名字不在快照里**：快照之后才出现的项，不删、不进入、不计失败，同 SPEC。

### 6. 快照之后才出现的项不计失败（低级）

- 一个目录设删除标记失败时，用它自己的句柄再枚举一次。
- 若剩下的全是名字不在快照里的项（第 5 条的第二类），不计失败；否则计 1 个 failed_entries。

### 7. 快照查找不再是线性的（低级，M2 必需）

- 删除时按相对名查快照项，改为映射或在已排序列表上二分查找，不要每个子项线性扫描整个快照。
- M2 要用 Water 清 Water 自己的 Rust 构建产物，单个 `target` 目录就有十万级文件。
- 总控验收会用十万个文件的合成目录计时。

### 8. 名字长度上限（低级）

- 计划校验拒绝任何一段超过 255 个 UTF-16 单元的路径（`CleanPlan::from_json` 返回错误）。
- `nt_open` 自身也拒绝超过 255 单元的名字，并用检查过的转换计算 `UNICODE_STRING` 的字节长度，不得截断或回绕。

### 9. 时间换算不溢出（低级）

- FILETIME 转 `SystemTime` 用检查过的算术。
- 溢出时不得回绕；按 `changed` 处理。不要把它当成很旧的时间。

### 10. unsafe 细节（低级）

- **枚举**：
  - 每条记录先确认 `NextEntryOffset` 是 8 的倍数、向前推进、记录头与名字（`off + 88 + FileNameLength`）都在缓冲区内；
  - 不满足 → 枚举错误（第 3 条）。
- **`nt_open`**：系统返回的任何非空句柄都交给 `Handle` 管理，保证关闭。只有状态为 0 才算成功。
- **尺寸断言**：给 `FileBasicInfo`（40）、`FileStandardInfo`（24）、`UnicodeString`（16）补编译期尺寸断言，或者对你实际用到的结构补齐。
- 每个 `unsafe` 块的 SAFETY 说明写清缓冲区边界与对齐依据。

### 11. 祖先身份（低级）

- 逐级打开时，某一级祖先的身份读不出 → `changed`，不要静默丢弃。
- 盘根的身份也加入祖先列表，参与保护路径的身份比对。

## 测试（仍是精确 6 个，原有名字不变）

都写进 `clean_handle_hardening`，失败信息带标记：

| 标记 | 新增断言 |
|---|---|
| `CLEAN_GUARD_ID` | 保护路径写成**条目上级目录**的联接别名（文本比对不中）→ 本项 `protected_overlap`，夹具一个字节不变 |
| `CLEAN_LONG_PATH` | **条目本身**的路径超过 300 字符 → `deleted`，条目外的兄弟项不变 |
| `CLEAN_REPARSE_KIND` | 条目下第二层的一个**空目录**被盖上自定义非链接标签（沿用现有 PowerShell 辅助，它带备份语义，可以打开目录）→ 整项 `reparse`，什么都不删 |

第 1、5、6 条只在删除过程中被并发替换时才走到，测试没有挂点，不要为此在生产代码里加测试开关。在回执里逐条写明代码怎么满足，总控会逐行审。

## 负控

测试文件变了，三条都要按新的测试字节重做，标记与原票相同：
- nc1 `CLEAN_REPARSE_KIND`
- nc2 `CLEAN_GUARD_ID`
- nc3 `CLEAN_NO_FOLLOW`

每条只改 `src/` 里真正被调用的一处 → `--mode red-ncN` → `git checkout` 恢复原字节 → 立即 `--mode test`。

## 续做与检查

- 同一工作树 `F:/new/smaltalk/water/.worktrees/w4-g1`、分支 `worker/water-w4-g1`，从回执提交 `b593f0be97e7338bbe54c85e456ce3a8c4d0c7a0` 接着做。**不要重跑 baseline。** 开工时树应干净且 HEAD 为该提交。
- 检查入口与命令同原票，例如：
  ```powershell
  node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W4-G1 --mode test
  ```
  另有 `lock`、`check`、`red-nc1..3`。提交干净实现后依次跑 `check --final`、`test --final`，再 `archive`。
- 范围、依赖、允许的 8 个系统函数、`forbidPatterns` 都不变。
- 不 push、不 merge、不 rebase，不改台账、契约、检查器、其它包。
- **远端与历史**：
  - 不 push 到任何远端，不添加或修改 git 远端与配置；
  - 不改写已有提交（不 amend、reset、squash 或任何强制操作），只在 `b593f0be` 之后新增提交。
  - 上一轮把已推送备份的提交 amend 过，导致总控的备份推送被拒；提交信息写错就在回执里说明。
- 不碰任何真实用户位置；夹具只在本树 `.local` 下。

## 交回

改写同一份回执，第一行与原票一致：

```text
WATER-W4-G1 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w4-g1/docs/dispatch/reports/WATER-W4-G1-REPORT.md
```

新增“补单 01”一节，写：
- 实际模型、续做起点、新实现提交 SHA；
- 第 1～11 条逐条：改了哪里、怎么满足（第 1、5、6 条写清复核顺序与计数）；
- 新增三项断言；
- 三条负控的改动、失败信息、恢复后的哈希；
- 两个 final 与 archive 的回执。

受阻则写“WATER-W4-G1 任务受阻”，写清冲突与最小补充需求，不要自行变通。
