# WATER-W4-G6：宿主收尾

2026-10-27，正式票，总控（Claude）。以 [第四波 manifest](../wave4/manifest.json) 中本票 `status` 为准；READY 不代表已外贴。可以新开对话执行。本票与 G5（D）、G7（界面）同时进行，各改各的目录。

| 项 | 精确值 |
|---|---|
| 权威票 | F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W4-G6-HOST-FINISHING-20261027.md |
| 唯一工作树 / 分支 | F:/new/smaltalk/water/.worktrees/w4-g6 / worker/water-w4-g6 |
| 精确首次 HEAD | 4f35c52f5abb3dee22583cc2c86b05da2fc2be93，必须干净；`apps/water/host` 是 F3 验收合入后的版本，图标已是 G4 的新图标 |
| SPEC | F:/new/smaltalk/water/contracts/m2-prep-v1/HOST-FINISHING.md（本票的全部要求） |
| 仍然有效的契约 | F:/new/smaltalk/water/contracts/desktop-v1/WIRING.md；F:/new/smaltalk/water/contracts/desktop-v1/HOST.md |
| 规则 | F:/new/smaltalk/water/docs/dispatch/W4-HARDENING-WORKER-RULES.md；宿主的写法沿用 F:/new/smaltalk/water/docs/dispatch/W3-DESKTOP-WORKER-RULES.md |
| 检查入口 | F:/new/smaltalk/water/scripts/desktop-wave-check.mjs |
| 回执 | F:/new/smaltalk/water/.worktrees/w4-g6/docs/dispatch/reports/WATER-W4-G6-REPORT.md |
| 证据目录 | F:/new/smaltalk/water/.worktrees/w4-g6/docs/acceptance/wave4/g6/ |
| 门 | 3 条负控 + check、test、native 三个 final |

第四波规则里“`apps/water/host/` 属于 F3”已过时：F3 已合入，本票就是宿主的收尾票。宿主的依赖、镜像参数、离线缓存、政策检查都与 F3 相同，检查器会照 F3 的方式核对。

先读：
1. SPEC HOST-FINISHING 全文；
2. WIRING（特别是第 6 节整机检查、第 7 节已知取舍）与 HOST；
3. 背景：[F3 验收报告](../../acceptance/wave3/controller/WATER-W3-F3-REVIEW-20261026.md)里的 4 条低级观察；
4. 代码：`apps/water/host/src/lib.rs`（`run`）、`startup.rs`、`data.rs`、`service.rs`，以及 `tests/host_v1.rs`。

## 要做的（全部在 `apps/water/host/`）

SPEC 第 1～5 节逐条实现：
1. **正常退出**：`app.run` 改为 `app.run_return`，返回后释放服务与实例锁，退出码 0。
2. **第二个实例唤起第一个窗口**：
   - 用数据目录里的 `activate.signal` 文件；
   - 公开 `signal_activation`、`take_activation`，签名见 SPEC；
   - 第二个实例写完信号后退出码 0。
3. **服务起不来时也有窗口**：公开 `backend_or_unavailable`，后端创建失败时用 `UnavailableBackend` 开窗。
4. **默认数据目录在联接后面**：只解析 Tauri 给出的默认基目录；`WATER_DATA_DIR` 不解析；签名不变。
5. **测试的三处问题**：夹具父目录竞争、直接测试 `service_backend`、`Drop` 里不断言。

**不变**：SPEC 第 8 节列的一切，包括：
- 依赖、配置、权限文件；
- 清理保持关闭；
- 不新增 `unsafe`，不开进程、不联网、不读别的环境变量；
- 不用 Tauri 的 `.setup()`，检查器会拒绝。后台线程在建好窗口之后、进入事件循环之前启动。

## 白名单

- `apps/water/host/` 下的文件（不得改 `Cargo.toml`、`Cargo.lock`、`tauri.conf.json`、`capabilities/main.json`、`icons/`）
- `docs/dispatch/reports/WATER-W4-G6-REPORT.md`
- `docs/acceptance/wave4/g6/` 下 `--mode archive` 生成的证据（含整机截图）

## 测试

`apps/water/host/tests/host_v1.rs`，仍是精确 5 个测试，名字不变。新断言照 SPEC 第 6 节的表加在已有测试里，失败信息带标记：
- `HOST_SINGLE_INSTANCE`
- `HOST_STARTUP_VISIBLE`
- `HOST_DATA_JUNCTION`（联接用 `cmd /c mklink /J`，只在本树 `.local` 的夹具里建）
- `HOST_BACKEND_DIRECT`

原有标记与断言不变。

## 负控

每条只改生产代码里真正被调用的一处，失败信息必须含目标标记：

| 负控 | 让什么失效（举例，选一处） | 标记 |
|---|---|---|
| nc1 | `take_activation` 不删信号文件，或永远返回 `false` | `HOST_SINGLE_INSTANCE` |
| nc2 | 后端创建失败时不再换成 `UnavailableBackend` | `HOST_STARTUP_VISIBLE` |
| nc3 | 默认基目录不再解析联接 | `HOST_DATA_JUNCTION` |

→ `--mode red-ncN` → `git checkout` 恢复原字节 → 立即 `--mode test`。

## 命令（在工作树根目录执行）

```powershell
node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W4-G6 --mode baseline
```

之后反复用 `lock`、`check`、`test`，做完三条负控；提交干净实现后依次跑 `check --final`、`test --final`、`native --final`，再 `archive`。

**`native --final` 会在本机弹出 1 个 Water 窗口**：
- 用本树 `.local` 下的独立数据目录，对本机做一次真实的**只读**整机体检；清理保持关闭。
- 检查器按 WIRING 第 6 节的 11 步自动操作、截图，最后关窗并要求退出码 0。
- 预算只有 1 次，检查器会记录；运行时不要操作那个窗口。
- 失败就写受阻回执，不要再开窗。

## 预算与边界

- 原生窗口 1（只给 `native --final`），选择框 0；
- cargo 离线、单线程、私有 target，不下载；
- 不 merge、不 rebase，不改台账、契约、检查器、其它包。
- **远端与历史**：
  - 不 push 到任何远端，不添加或修改 git 远端与配置；
  - 不改写已有提交（不 amend、reset、squash 或任何强制操作），只在首次 HEAD 之后新增提交；
  - 提交信息写错就在回执里说明，不要改写。

## 交回

回执第一行与通知完全一致：

```text
WATER-W4-G6 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w4-g6/docs/dispatch/reports/WATER-W4-G6-REPORT.md
```

回执要写：
- 实际模型、实现提交 SHA；
- SPEC 第 1～5 节逐条怎么做的；
- 每个检查命令与结果，`native --final` 的步骤、用时、退出码与 6 张截图各看到了什么；
- 三条负控：改了哪一处、失败信息、恢复后的哈希；
- 没做或没验证的事。特别是：第二个实例唤起窗口有没有在真窗口里试过（预算不够时写明没试）。

受阻则同一路径写“WATER-W4-G6 任务受阻”，写清冲突与最小补充需求，不要自行变通。
