WATER-W1-D 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/d/docs/dispatch/reports/WATER-W1-D-REPORT.md

# WATER-W1-D 回执

执行者只提交本分支。受测实现 SHA 是 `58fc5973a1d68555bbd41fdf4c6d2990cbff870d`。本报告和证据是其后的纯记录提交，不改变产品文件。总控尚未验收。目录能够创建，不等于扫描、分类或 macOS 验收通过。

## 范围

| 项 | 值 |
|---|---|
| 工作树 | `F:/new/smaltalk/water/.worktrees/d` |
| 分支 | `worker/water-w1-d` |
| 基线 | `7007c65d5845c3fe5938d920e930c8bcb7ffc4e0` |
| 受测实现 | `58fc5973a1d68555bbd41fdf4c6d2990cbff870d` |
| 权威票 | `F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W1-D-FIXTURE-LAB-20261017.md` |
| 引擎 | Cursor 中的 Grok 4.7，外部执行者自报 |
| Git 身份 | 本机无 user.name/user.email。提交使用一次性 `Water Worker (external) <water-worker@localhost>`，`core.hooksPath=NUL`，未签名。未改 global，未 push/merge/rebase |

产品文件只有 `tools/fs-fixture-kit/materialize.mjs`、`tools/fs-fixture-kit/tests/materialize.test.mjs`、`tools/fs-fixture-kit/README.md`。SHA256：

- materialize.mjs `89f7386e609cb33f0839961919dbef99c2192d708cf92de577e98ec9b51f9c6a`
- materialize.test.mjs `935b705cb28e1f4d7f2138e59979a7864f95cf3a50d303ed0c70baff6682297b`
- README.md `e854b00adaa78fbf219dc77afd2d3dfa3cc4a1d1b9d7878b74390865e3b1340b`

## 行为对照

冻结清单 11 个 case 顺序为 project-markers、mixed-assets、scope-prefix、overlapping-scopes、unicode-spaces、hardlink-pair、directory-links、depth-budget、entry-budget、permission-plan、cancel-plan。18 个内存变体和全部 invalid_run_ids 来自 `negative-cases.json`，断言读取其中的 expected，不按 id 预置结果。

五个顶层测试：fixture_manifest_and_cases、fixture_materialization、fixture_paths_and_collisions、fixture_link_capabilities、fixture_declarative_faults。每次完整通过的测试创建 20 个 run（11 个物化、3 个路径/环境、2 个链接、4 个声明式计划）。历史 run 留在本树 `.local/fixture-lab`，提交时直接子目录 209 个，含 `run-UPPER`。没有清理。

`validateFixtureManifest` 不读环境或磁盘。`materializeCase` 只从模块位置读冻结 cases.json。输出根是本工作树 `.local/fixture-lab/<run_id>/`。成功时写 `.water-fixture-run.json`，`scanner_executed` 为 false，计划原样返回。没有扫描、ACL 修改或回收入口。

## 能力

平台 win32，Node v24.16.0。macOS 未运行。

probe 与产品测试一致：hardlink supported，nlink 2，dev/ino 相同且 ino 非 0；symlink_dir supported，realpath 指向同 run 目标；junction_dir supported，realpath 指向同 run 目标。证据：`docs/acceptance/wave1/d/capabilities.json`、`probe-result.json`。这只是这台 Windows 机器本次结果。

## 检查

都在本工作树、Node 24 上串行运行。最终两项绑定同一干净 SHA `58fc5973a1d68555bbd41fdf4c6d2990cbff870d`。

| 命令 | 结果 | 证据 |
|---|---|---|
| baseline | exit 0 | `baseline-result.json` |
| probe | exit 0 | `probe-result.json` |
| 实现前 test | exit 1，五测试均为 AssertionError | `red-test.log` |
| 非最终 check | exit 0 | `precommit-check-result.json` |
| `--mode check --final` | exit 0，两个 `--check` 均为 0 | `final-check-result.json` |
| `--mode test --final` | exit 0；TAP tests 5、pass 5、fail 0、skipped 0、cancelled 0、todo 0 | `final-test.log` |

## 先红

桩实现可导入，但校验恒为 valid、物化返回 `scanner_executed: true` 且不拒绝非法 run。2026-10-17T09:51:30Z 的 test 退出码 1。五个失败都是 AssertionError：missing_version 仍为 valid、scanner_executed 为 true、非法 run 没有拒绝、链接节点缺失、声明式计划的 scanner_executed 为 true。不是缺文件、语法错误或超时。

## 负控

每项只改 `materialize.mjs`，跑完整五测试，再按原字节恢复。恢复后 SHA256 都回到 `89f7386e609cb33f0839961919dbef99c2192d708cf92de577e98ec9b51f9c6a`，并再次完整通过。

| 项 | 坏 SHA256 | 目标失败 | 恢复后 |
|---|---|---|---|
| NC-01 | `ccd571493de991ac842a6b4618af4f7620249688329abf23a6a4d540b6e04375` | `fixture_paths_and_collisions` AssertionError | exit 0，`nc-01-restore-test-result.json` |
| NC-02 | `605b12c94378ffed190c54a72b41a237927ad42ef55ecc370438ae3deb9a9d7c` | 同上，collision 断言 | exit 0，`nc-02-restore-test-result.json` |
| NC-03 | `238a11ce16dbe13abdf7b6874cd32fb52b20214cd889442c0c3d88c8535f62c2` | `fixture_declarative_faults` AssertionError | exit 0，`nc-03-restore-test-result.json` |

NC-01 只把 `isRunId` 第 69–70 行的 `[a-z0-9]` 放宽为 `[a-zA-Z0-9]`。长度、连字符、`run-` 前缀和直接子目录边界未改。绑定最终测试的一次（`nc-01-test.log`，exit 1）里，`run-UPPER` 期望 `invalid_run_id`，实际 `collision`，因为更早一次负控已经留下该目录。其余四测试通过。第一次负控（`nc-01-first-test.log`）发生在目录还不存在时，失败是 `Missing expected rejection`，说明当时调用成功而不是越界写。`../escape`、绝对路径等仍在 `run-UPPER` 之前被拒绝。没有删除 `run-UPPER`。

NC-02 在 `materializeCase` 里对已存在 run 返回标记内容，不调用写入，也不覆盖文件。`materialize.test.mjs:430` 的 collision 断言得到 `Missing expected rejection`（`nc-02-test.log`，exit 1）。其余四测试通过。

NC-03 在 `scanner_plan` 深拷贝后把非空 `faults` 置空、把非 null 的 `cancel_after_entries` 置 null。`fixture_declarative_faults` 在 permission-plan 的 faults 深比较失败（`nc-03-test.log`，exit 1，测试第 528 行）。其余四测试通过。测试先遇到 permission-plan，没有继续执行到 cancel-plan。

## 失败尝试

第一次完整实现测试通过后，恢复 NC-01 再跑时，`run-paths-owned-1` 已经存在，路径测试在首次创建处抛出 FixtureError `collision`（`fixed-run-id-rerun-test.log`，exit 1）。这是固定 run_id 撞上未清理的历史 run，不是校验器回退。测试改为同一次运行内用新的 `run-<uuid>` 做创建和碰撞，旧目录未删除。`materialize.mjs` 字节未变。随后的恢复测试和最终门通过。

除此之外，实现第一次接上真实断言后即通过。没有改冻结输入、helper、超时或断言来换绿。

## 未验证

macOS 未运行。没有真实 ACL 失败、竞态替换、超长路径或 HOME 夹具。没有执行扫描，没有 ScanReport。Windows 上的链接成功只描述这一台机器。209 个历史 run 仍在 `.local/fixture-lab`，未提交。
