WATER-W11-N1 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w11-n1/docs/dispatch/reports/WATER-W11-N1-REPORT.md

# WATER-W11-N1 回执：Flick 界面改名、零字节显示与部分完成提示

| 项 | 值 |
|---|---|
| 工单 | `WATER-W11-N1` |
| 工作树 / 分支 | `F:/new/smaltalk/water/.worktrees/w11-n1` / `worker/water-w11-n1` |
| 基线 | `ccc584b3894e28d1f6bb8f86748d03c143a38e5b` |
| 实现提交 | `5f392089d1205c3e9b8d077c964fea84e620b2e1` (`fix(ui): adopt Flick branding and clarify zero and partial results`) |
| 执行模型 | Codex GPT-6（接手已完成实现的工作树，仅补做验收与交回） |
| 平台 | Windows x64；Node 24；Chrome 私有浏览器夹具 |
| macOS | 未验证 |

## 1. 读取与范围

按工单顺序读取了 `WORKER-RULES.md`、`W11-WORKER-RULES.md`、`RENAME-FLICK.md`、`UI-M35.md`、`IPC-M35.md`、`ui-fixtures-m35.json`、`BRAND.md`、M11 原工单，以及 UI 工单列出的 HTML、模块、视图和两份测试文件。实现差异只在 `apps/water/ui/`；未改契约、检查器、夹具、设计稿或 `packages/`。

## 2. 实际实现

1. `index.html` 删除旧 `i-berg` 与 mask，加入 BRAND.md 冻结的单路径 `i-flick`，并将标题改为 `Flick · 磁盘体检`。
2. `app.mjs` 顶栏使用实心 Flick 标志和 `Flick` 文案；用户可见的错误提示改为 Flick。
3. `about.mjs`、`detail.mjs`、`home.mjs`、`locations.mjs` 的用户可见 Water 文案改为 Flick；UI 源码（排除测试）中不再保留用户可见的 `Water`，`berg` 也已清除。
4. `formatBytes(0)` 与 `byteDelta('0')` 返回 `0 MB`，正数小于 1 MiB 仍返回 `<1 MB`。
5. 结果页 `status === 'partial'` 时在页眉末尾追加 ` · 部分完成：有的位置没有权限，或时间到了`；其它状态保持原文。
6. 测试只增加工单列出的断言与内存夹具变体，没有修改冻结样例数据。

## 3. 检查与结果

所有命令均在工作树根执行：

```text
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W11-N1 --mode check --final
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W11-N1 --mode red-nc1
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W11-N1 --mode test
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W11-N1 --mode red-nc2
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W11-N1 --mode test
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W11-N1 --mode red-nc3
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W11-N1 --mode test
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W11-N1 --mode test --final
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W11-N1 --mode browser --final
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W11-N1 --mode archive
```

结果：

- `check --final`：passed，工作树干净。
- `red-nc1`：passed；临时把零字节回退为 `<1 MB`，按预期失败并包含 `UI_W11_ZERO`，随后恢复并通过 unit test。
- `red-nc2`：passed；临时把顶栏品牌改回 `Water`，按预期失败并包含 `UI_W11_BRAND`，随后恢复并通过 unit test。
- `red-nc3`：passed；临时移除 partial 页眉后缀，按预期失败并包含 `UI_W11_PARTIAL`，随后恢复并通过 unit test。
- `test --final`：passed；控制器审计了三组红测与恢复后的 exact-byte 绿测，`nc1`、`nc2`、`nc3` 均有对应记录。
- `browser --final`：passed；6 个浏览器测试全部通过，生成并校验 25 张 PNG 截图。浏览器只使用测试内存夹具，没有真实数据读取。
- `archive`：passed；证据归档到 `docs/acceptance/wave11/n1/`，归档索引记录 623 个文件、10,508,427 字节。

最终源代码哈希（由检查器记录）：`productionHash=535647c322fc8b195518564ca59cd5682c99d4bc8d7589b147456c2bfb128e94`，`testHash=93790846e8f8609ff4f3e27410c802168167c3fa7cc5478b427687d925a1d0a8`。最终 HEAD 为实现提交，最终工作树仅包含工单允许的回执与验收证据。

## 4. 负控现场说明

第一次 `red-nc1` 在没有临时生产改动时被检查器拒绝（`A negative control needs an uncommitted production change`），未被计为有效负控；随后按工单方式完成了真正的破坏、红测、恢复和绿测。第一次 `test --final` 发生在 `nc3` 恢复绿测尚未被控制器看到的时序窗口，提示 `Missing immediate exact-byte restore and green test after nc3`；紧接着按原字节恢复后重跑 `test`，再跑 `test --final`，最终通过。两次均未改变实现提交或证据安全边界。

## 5. 未验证与交接

- 未运行真实 Tauri 宿主、真实 Water/Flick 服务或真实用户目录；N1 的真实数据权限为 none。
- 未验证 macOS。
- 未 merge、rebase、push，未修改主线、manifest、契约、检查器、样例或其它包。
- 验收原始回执和截图在 `F:/new/smaltalk/water/.worktrees/w11-n1/docs/acceptance/wave11/n1/`；浏览器进程已由检查器关闭，没有本票遗留的无头浏览器进程。
