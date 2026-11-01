# WATER-W8-K4：服务接上 M3 收口的各项（重门，final 含只读真实体检）

2026-11-01，正式单，总控（Claude）。以[第八波 manifest](../wave8/manifest.json) 中本单 `status` 为准；READY 不代表已外贴。可以新开对话执行。第八波第二批，只有这一张；界面单 K6 的补单 02 同时在别的工作树进行，互不相干。

| 项 | 精确值 |
|---|---|
| 权威单 | F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W8-K4-SERVICE-20261101.md |
| 唯一工作树 / 分支 | F:/new/smaltalk/water/.worktrees/w8-k4 / worker/water-w8-k4 |
| 精确首次 HEAD | 232bc2982228f5d99f42017de6db3caa5912a8ab（标签 `water-w8-k4-base-20261101`），必须干净；K1（进程）、K2（规则）、K3（扫描）都已合入 |
| SPEC | F:/new/smaltalk/water/contracts/m3c-v1/SERVICE-M3C.md 与 F:/new/smaltalk/water/contracts/m3c-v1/SERVICE-M3C-ADD-01.md（补充 01 优先） |
| 形状与回放数据 | F:/new/smaltalk/water/contracts/m3c-v1/IPC-M3C.md；F:/new/smaltalk/water/contracts/m3c-v1/ui-fixtures-m3c.json |
| 上游新接口 | F:/new/smaltalk/water/contracts/m3c-v1/PROCESS-M3C.md；F:/new/smaltalk/water/contracts/m3c-v1/RULES-M3C.md；F:/new/smaltalk/water/contracts/m3c-v1/SCAN-M3C.md（只读，已由 K1～K3 实现） |
| 仍然有效的契约 | F:/new/smaltalk/water/contracts/m3-v1/SERVICE-M3-FIX.md；F:/new/smaltalk/water/contracts/m2-v1/SERVICE-M2.md；F:/new/smaltalk/water/contracts/hardening-v1/SERVICE-HARDENING.md；F:/new/smaltalk/water/contracts/desktop-v1/SERVICE.md |
| 规则 | F:/new/smaltalk/water/docs/dispatch/W8-M3C-WORKER-RULES.md |
| 检查入口 | F:/new/smaltalk/water/scripts/desktop-wave-check.mjs |
| 回执 | F:/new/smaltalk/water/.worktrees/w8-k4/docs/dispatch/reports/WATER-W8-K4-REPORT.md |
| 证据目录 | F:/new/smaltalk/water/.worktrees/w8-k4/docs/acceptance/wave8/k4/ |
| 门 | 重门：3 条负控 + check、test、real 三个 final |

先读：
1. 规则、SERVICE-M3C 全文、补充 01 全文，再读 IPC-M3C 与 `ui-fixtures-m3c.json`（服务产出的形状以它们为准）；
2. 上游三份 SPEC 里与服务有关的部分：
   - PROCESS-M3C 第 2、3 节：新在用方式、`OrphanChain.memory_bytes`；
   - RULES-M3C 第 1～4 节：新方式、`git-worktrees`、盘根；
   - SCAN-M3C 第 2 节：`unique_bytes` 与兼容规则；
3. 代码：
   - `packages/water-service/src/views.rs`：组视图、详情、在用、合计；
   - `src/lib.rs`：Platform、在用快照、`valid_custom`；
   - `src/service.rs`：扫描收尾、设置、`clean_prepare`；
   - `src/clean.rs`：计划与复核；
   - `src/native_windows.rs`：盘信息；
   - `src/storage.rs`：设置与记录的读写；
4. `tests/service_v1.rs`：测试平台（`TestPlatform` 一类）的盘、进程、时钟怎么注入；`SERVICE_SCAN_RECORD` 那段挡写入的做法。

## 要做的（全部在 `packages/water-service/`）

SERVICE-M3C 第 1～8 节，加补充 01 第 1～3 节：
1. 一切展示字节改用去重后的值，`GroupView.logical_bytes` 给逻辑字节，计划仍写逻辑字节；
2. 逐项在用：组的 `in_use = {process_label_zh, item_count}`，详情逐项 `in_use`；未知方式按“无法确认”；
3. 整盘位置：非系统固定盘的盘根，NTFS 或 ReFS，`root_id` 为 `drive-<盘符>`（补充 01 第 2 条，含唯一获准新增的 `GetVolumeInformationW`）；
4. `GroupView.by_drive`；
5. `clean_prepare` 的排除；设置的 `skipped`；`skip_add` / `skip_remove`；扫描时与 `skip_add` 时都应用跳过（补充 01 第 1 条）；排除里的已跳过项忽略（补充 01 第 3 条）；
6. 孤儿进程只列，`Trends.orphans`；
7. `AppState.checkup_due` 与 `Trends.forecast`；
8. 第七波遗留：快照删除失败路径的测试（不加产品挂点）。

**不变**：SERVICE-M3C 第 11 节（除补充 01 第 2 条的那个系统函数）：原有 IPC 命令的语义、错误码与清理流程；存储布局只新增可选键与设置字段；依赖与锁文件；不新增进程启动、网络与环境变量读取。不改别的包。

## 白名单

- `packages/water-service/` 下的文件（不得改 `Cargo.toml`、`Cargo.lock`）
- `docs/dispatch/reports/WATER-W8-K4-REPORT.md`
- `docs/acceptance/wave8/k4/` 下 `--mode archive` 生成的证据

## 测试

`packages/water-service/tests/service_v1.rs`，仍是精确 6 个测试，名字不变：`service_ipc_contract`、`service_scan_views`、`service_clean_flow`、`service_trends_locations`、`service_storage_safety`、`service_hardening`。新断言照 SERVICE-M3C 第 9 节与补充 01 第 4 节加在已有测试里，失败信息带：
- `SERVICE_M3C_UNIQUE`、`SERVICE_M3C_INUSE_ITEM`、`SERVICE_M3C_DRIVE_ROOT`、`SERVICE_M3C_BY_DRIVE`、`SERVICE_M3C_EXCLUDE`；
- `SERVICE_M3C_SKIP`、`SERVICE_M3C_ORPHANS`、`SERVICE_M3C_FORECAST`、`SERVICE_M3C_DUE`、`SERVICE_SNAPSHOT_REMOVE_FAIL`。

### 获准修改的旧断言

派单前总控已逐条盘点 `tests/service_v1.rs`，必然冲突的旧断言都写在补充 01 第 5 节，按那里改：
1. **形状比对**：`fixtures()` 叠加 `ui-fixtures-m3c.json` 的顶层条目；`custom_root_add` 改比 `custom_root_add_drive`；另加 `SERVICE_M3C_SHAPE` 断言防止样本缺失（第 5.1 节）；
2. **在用文案**：`SERVICE_IN_USE_SAVED` 一条、`SERVICE_PRODUCT_NAME` 四条改为“将跳过 N 个占用的项”（第 5.2 节）；
3. **测试平台**：构造盘与注入盘的辅助代码可以改，默认盘列表不变（第 5.5 节）；
4. **字节口径**：SERVICE-M3C 第 9 节获准的那一类（旧夹具没有硬链接，数值应当不变）。

另外三条不改断言、但必须遵守：
- `Platform` 新方法带默认实现、不改 `DriveInfo`（第 2 节）；
- 新的记录可选键各自独立可缺（第 5.4 节）；
- 未知在用方式的记录仍不可读（第 5.3 节）。

除上面列出的与 SERVICE-M3C 第 9 节获准的字节口径外，其余原有断言与标记不变。回执逐条写出原值与新值。**这里没列到、但因本单改动而必然要改的旧断言：先写受阻回执，不要自行改。**

## 负控

| 负控 | 让什么失效（举例，选一处） | 标记 |
|---|---|---|
| nc1 | 排除校验不检查条目是否属于所选组 | `SERVICE_M3C_EXCLUDE` |
| nc2 | `skip_add` 不改最新扫描，或扫描视图不应用跳过 | `SERVICE_M3C_SKIP` |
| nc3 | `valid_custom` 不排除系统盘根 | `SERVICE_M3C_DRIVE_ROOT` |

只改 `packages/water-service/src/` 里一处 → `--mode red-ncN` → `git checkout` 恢复原字节 → 立即 `--mode test`。

## 命令（在工作树根目录执行）

```powershell
node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W8-K4 --mode baseline
```

之后反复用 `lock`、`check`、`test`，做完三条负控；提交干净实现后依次跑 `check --final`、`test --final`、`real --final`，再 `archive`。

`real --final` 是服务对本机的一次只读体检：
- 读文件名、大小、时间与进程列表，不读文件内容；
- 不清理（这个模式下清理是关的）；
- 输出只有分类汇总、不含路径，约 2 分钟。

## 预算与边界

- 原生窗口 0、选择框 0。
- cargo 离线、单线程、私有 target，不下载。
- 测试用的盘、进程、时钟都由测试平台注入；不结束、不挂起任何真实进程；夹具只建在本树 `.local/` 下，只删除本次新建的目录。
- 不 merge、不 rebase，不改台账、契约、检查器、其它包。
- 提交身份照规则第 5 节：只在提交命令的进程里设，用你自己的名字，不借用人类作者身份。
- **远端与历史**：
  - 不 push 到任何远端，不添加或修改 git 远端与配置；
  - 不改写已有提交（不 amend、reset、squash 或任何强制操作），只在首次 HEAD 之后新增提交；
  - 提交信息写错就在回执里说明，不要改写。

## 交回

回执第一行与通知完全一致：

```text
WATER-W8-K4 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w8-k4/docs/dispatch/reports/WATER-W8-K4-REPORT.md
```

回执要写：
- 实际模型、实现提交 SHA；
- SERVICE-M3C 第 1～8 节与补充 01 第 1～3 节逐条：改了哪里、怎么满足；新增的系统函数与安全说明；
- 改过的旧断言：原值与新值；
- 每个检查命令与结果，`real` 的分类汇总；
- 负控：改了哪一处、失败信息、恢复后的哈希；
- 没做或没验证的事。

受阻则同一路径写“WATER-W8-K4 任务受阻”，写清冲突与最小补充需求，不要自行变通。
