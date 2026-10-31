# WATER-W8-K5：宿主转发排除与“以后都跳过”（重门，final 含 1 次真窗口）

2026-10-31，正式单，总控（Claude）。以[第八波 manifest](../wave8/manifest.json) 中本单 `status` 为准；READY 不代表已外贴。可以新开对话执行。本单与 K1、K2、K3、K6 同时进行，各改各的目录。

| 项 | 精确值 |
|---|---|
| 权威单 | F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W8-K5-HOST-20261031.md |
| 唯一工作树 / 分支 | F:/new/smaltalk/water/.worktrees/w8-k5 / worker/water-w8-k5 |
| 精确首次 HEAD | 912eba100ba342c3eeb21ba555c6d589b91e6b4f，必须干净 |
| SPEC | F:/new/smaltalk/water/contracts/m3c-v1/HOST-M3C.md（本单的全部要求） |
| 仍然有效的契约 | F:/new/smaltalk/water/contracts/m3c-v1/IPC-M3C.md；F:/new/smaltalk/water/contracts/m3-v1/HOST-M3-FIX.md；F:/new/smaltalk/water/contracts/m3-v1/HOST-M3.md；F:/new/smaltalk/water/contracts/m2-v1/HOST-M2.md；F:/new/smaltalk/water/contracts/desktop-v1/HOST.md |
| 规则 | F:/new/smaltalk/water/docs/dispatch/W8-M3C-WORKER-RULES.md |
| 检查入口 | F:/new/smaltalk/water/scripts/desktop-wave-check.mjs |
| 回执 | F:/new/smaltalk/water/.worktrees/w8-k5/docs/dispatch/reports/WATER-W8-K5-REPORT.md |
| 证据目录 | F:/new/smaltalk/water/.worktrees/w8-k5/docs/acceptance/wave8/k5/ |
| 门 | 重门：2 条负控 + check、test、native 三个 final |

先读：
1. 规则与 SPEC HOST-M3C 全文，再读 IPC-M3C 第 1、3 节与 HOST-M3-FIX；
2. 代码：
   - `apps/water/host/src/commands.rs`：`COMMANDS`、`cmd_clean_prepare`；
   - `src/lib.rs`：`generate_handler!`，约 259～277 行；`BackendSlot`，约 90～122 行；退出等待，约 164～198 行；
   - `README.md`：第 4、31～32、54 行；
3. `tests/host_v1.rs`：
   - `host_command_registry`，约 218 行；
   - Exit 接线的源码断言，约 1491～1500 行；
   - `HOST_EXIT_DEADLINE`，约 1265～1284 行；
   - 分词器，约 1155～1205 行。

## 要做的（全部在 `apps/water/host/`）

SPEC 第 1～3 节：
1. `clean_prepare` 增加可选的 `exclude_item_ids`：非空时转发 `excludeItemIds`，否则与原来逐字节相同；
2. 新命令 `skip_add`、`skip_remove`：`COMMANDS` 增至 19，登记进 `generate_handler!`，README 改为 19；
3. 第七波 J1 的五处遗留。

**不变**：其余命令、capabilities、CSP、导航与窗口安全、关窗与退出的行为、依赖。

## 白名单

- `apps/water/host/` 下的文件（不得改 `Cargo.toml` 的依赖、`Cargo.lock`）
- `docs/dispatch/reports/WATER-W8-K5-REPORT.md`
- `docs/acceptance/wave8/k5/` 下 `--mode archive` 生成的证据

## 测试

`apps/water/host/tests/host_v1.rs`，仍是精确 5 个测试，名字不变：`host_config_boundary`、`host_navigation_boundary`、`host_command_registry`、`host_data_directory`、`host_service_wiring`。

- 新断言照 SPEC 第 4 节加在已有测试里，失败信息带 `HOST_M3C_EXCLUDE`、`HOST_M3C_SKIP`、`HOST_TEST_TOKENIZER`。
- 已有的 `HOST_EXIT_WIRING`、`HOST_EXIT_DEADLINE` 照 SPEC 第 3 节加强。
- 旧断言里只有命令总数 17 → 19 获准修改。

## 负控

| 负控 | 让什么失效（举例，选一处） | 标记 |
|---|---|---|
| nc1 | `clean_prepare` 不转发非空的 `excludeItemIds` | `HOST_M3C_EXCLUDE` |
| nc2 | `skip_remove` 转发错键（如 `itemId`） | `HOST_M3C_SKIP` |

只改 `apps/water/host/src/` 里一处 → `--mode red-ncN` → `git checkout` 恢复原字节 → 立即 `--mode test`。

## 命令（在工作树根目录执行）

```powershell
node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W8-K5 --mode baseline
```

之后反复用 `lock`、`check`、`test`，做完两条负控；提交干净实现后依次跑 `check --final`、`test --final`、`native --final`，再 `archive`。

`native --final` 与第七波 J1 相同：
- 检查器在本树 `.local/w8-k5-native/` 下生成夹具，七个分类全部关闭，只清理夹具；
- 原生窗口 1 个，选择框 0 个；
- 界面是基线版本，所以排除功能不在整机检查里验证。

## 预算与边界

- 原生窗口 1（只在 `native --final`），选择框 0。
- cargo 离线、单线程、私有 target，不下载。
- 不 merge、不 rebase，不改台账、契约、检查器、其它包。
- 提交身份照规则第 5 节：只在提交命令的进程里设，用你自己的名字，不借用人类作者身份。
- **远端与历史**：
  - 不 push 到任何远端，不添加或修改 git 远端与配置；
  - 不改写已有提交（不 amend、reset、squash 或任何强制操作），只在首次 HEAD 之后新增提交；
  - 提交信息写错就在回执里说明，不要改写。

## 交回

回执第一行与通知完全一致：

```text
WATER-W8-K5 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w8-k5/docs/dispatch/reports/WATER-W8-K5-REPORT.md
```

回执要写：
- 实际模型、实现提交 SHA；
- SPEC 第 1～3 节逐条：改了哪里、怎么满足；
- 改过的旧断言：原值与新值；
- 每个检查命令与结果；
- 整机步骤、用时、退出码与截图；
- 负控：改了哪一处、失败信息、恢复后的哈希；
- 没做或没验证的事。

受阻则同一路径写“WATER-W8-K5 任务受阻”，写清冲突与最小补充需求，不要自行变通。
