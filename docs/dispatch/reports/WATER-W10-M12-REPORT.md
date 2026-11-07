WATER-W10-M12 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w10-m12/docs/dispatch/reports/WATER-W10-M12-REPORT.md

日期：2026-11-07。执行者：Codex（GPT-6；用户外贴安排为 astra，运行环境未提供更细型号），未使用子代理。

## 基线、续做与提交

- 工作树：`F:/new/smaltalk/water/.worktrees/w10-m12`；分支：`worker/water-w10-m12`。
- 初始基线：`98f9678e6a49bb63b87272644dae15c721384d9c`。此前 baseline 已通过。
- 经用户明确授权从受阻回执提交 `5f2b1885d750e78e2bbfe95bb2ce719e0ca64b04` 续做，续做时工作树干净；没有重跑 baseline。原阻塞及其证据保留在该历史提交。
- 数据与首轮测试提交：`b7bd648e17eb60a9f329bb80006fb7d7e24d9aa4`。
- 最终实现提交：`eb2026c633041dfdafcb6025d55555df8de83f23`。后续提交只含本回执与归档器证据。
- 总控修改了主树检查器及 manifest 的 `negativeControlPaths`；执行者没有修改检查器、台账或契约。工单补充中“不禁止改测试”按用户明确说明“不许改测试”执行：每次负控均未修改测试。

## 工单第 1 节逐项结果

1. `installer-files` 第二个定位器的模式精确为 `*setup*.exe`、`*installer*.exe`、`*#.#*.exe`，顺序一致。第一定位器、`max_depth = 3`、`parent_lacks_file_matching *.dll` 与其余字段保持不变。
2. `why_zh` 精确改为：程序文件名要带 setup、installer 或版本号（如 5.1.0），且旁边没有动态库；卸载程序和程序自带的小工具不算。
3. 数据版本与 README 同步为 `2026-11-07.1`。
4. 按工单对 RULES-M35 的覆盖说明实施，没有修改契约。JSON 对比确认仅数据版本、上述模式与文案变化，其余 109 条规则完全相同；`src/`、Cargo.toml、Cargo.lock 未改。

`rules_seed_coverage` 新增精确断言，核对两个定位器、第二定位器的类型、三个模式及顺序、排除两个旧模式、深度、DLL 条件和无 fallback，错误均带 `RULES_M35_SEEDS`。四个测试名称和数量不变，无忽略或过滤。

## 旧断言迁移（行号均指 98f9678e）

| 位置 | 原值 | 新值 | 原因 |
|---|---|---|---|
| rules_v1.rs:723，种子表第二定位器 | `marker:file_name:*#*.exe,*setup*.exe,*install*.exe:3` | `marker:file_name:*setup*.exe,*installer*.exe,*#.#*.exe:3` | 工单要求收窄模式；第一定位器文字不变 |
| rules_v1.rs:700，RULES_M35_VERSION | `2026-11-02.2` | `2026-11-07.1` | 精确核对新版数据 |
| rules_v1.rs:2394，RULES_M3_WORDING | `2026-11-02.2` | `2026-11-07.1` | 计划携带新版数据版本 |
| rules_v1.rs:2398，RULES_M3C_VERSION | `2026-11-02.2` | `2026-11-07.1` | 同上 |
| rules_v1.rs:2866，RULES_M3D_VERSION | `2026-11-02.2` | `2026-11-07.1` | 嵌入数据版本已更新 |
| rules_v1.rs:2904，RULES_M3C_VERSION | `2026-11-02.2` | `2026-11-07.1` | 同上 |

除此之外没有修改旧断言或旧失败标记。另在 `rules_resolve_plan` 的旧版本断言之前新增同样精确的 `RULES_M35_VERSION: plan data version` 断言，确保版本负控首先触发本票标记；旧断言继续保留。

## 检查命令与结果

下表全部在 M12 工作树根目录执行。完整参数、子命令退出码、源码快照与日志见对应回执；日期前缀均为 2026-11-07，本文检查时间均为 UTC。负控门 exit 0 表示已验证目标失败，其内部 cargo test exit 101；普通成功门 exit 0。下表唯一失败的 test 是修复前的预期红（门 exit 1、cargo exit 101），不是最终失败。

| 回执文件 | 命令 | 结果 |
|---|---|---|
| `2026-11-07T03-03-07.873Z-25592-baseline-result.json` | `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W10-M12 --mode baseline` | passed |
| `2026-11-07T03-14-04.071Z-26168-baseline-result.json` | `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W10-M12 --mode baseline` | passed |
| `2026-11-07T03-14-40.352Z-20328-archive-result.json` | `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W10-M12 --mode archive` | passed |
| `2026-11-07T03-21-25.292Z-31592-lock-result.json` | `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W10-M12 --mode lock` | passed |
| `2026-11-07T03-21-33.257Z-26300-test-result.json` | `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W10-M12 --mode test` | failed |
| `2026-11-07T03-22-14.930Z-9912-check-result.json` | `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W10-M12 --mode check` | passed |
| `2026-11-07T03-24-30.236Z-16544-test-result.json` | `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W10-M12 --mode test` | passed |
| `2026-11-07T03-26-10.432Z-29200-red-nc1-result.json` | `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W10-M12 --mode red-nc1` | passed |
| `2026-11-07T03-27-49.952Z-22212-test-result.json` | `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W10-M12 --mode test` | passed |
| `2026-11-07T03-28-05.393Z-25636-red-nc2-result.json` | `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W10-M12 --mode red-nc2` | passed |
| `2026-11-07T03-29-37.634Z-30604-test-result.json` | `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W10-M12 --mode test` | passed |
| `2026-11-07T03-29-51.916Z-16540-check-result.json` | `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W10-M12 --mode check` | passed |
| `2026-11-07T03-31-10.103Z-31520-test-result.json` | `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W10-M12 --mode test` | passed |
| `2026-11-07T03-34-06.175Z-2936-red-nc1-result.json` | `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W10-M12 --mode red-nc1` | passed |
| `2026-11-07T03-35-40.179Z-27040-test-result.json` | `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W10-M12 --mode test` | passed |
| `2026-11-07T03-35-46.834Z-23200-red-nc2-result.json` | `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W10-M12 --mode red-nc2` | passed |
| `2026-11-07T03-35-54.047Z-26216-test-result.json` | `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W10-M12 --mode test` | passed |
| `2026-11-07T03-36-00.965Z-18044-check-result.json` | `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W10-M12 --mode check --final` | passed |
| `2026-11-07T03-36-06.038Z-28760-test-result.json` | `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W10-M12 --mode test --final` | passed |
| `2026-11-07T03-37-15.675Z-31388-real-result.json` | `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W10-M12 --mode real --final` | passed |
| `2026-11-07T03-37-20.792Z-23860-archive-result.json` | `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W10-M12 --mode archive` | passed |

03:03 的 baseline 是总控派前留下的记录，不是本执行者新跑的；03:14 baseline 和 archive 来自本对话首次受阻前。所有原记录均保留。03:21:33 的 test 在旧数据上只让 `rules_seed_coverage` 失败，明确显示旧三模式与新三模式的差异，证明新增断言能检测问题。

03:28 的首轮 nc2 虽被检查器接受，但 `rules_resolve_plan` 先触发旧标记，故未作为最终负控证据。补充新版本断言后，check 和完整四测再次通过；测试哈希变化，因此两条负控均重新运行。没有计时断言失败、超时重试或放宽时限。

检查前仅按进程名核对 cargo/rustc/clippy-driver；有其他检查时等待结束后再启动本票命令。所有 cargo 命令均由指定检查器配置离线、jobs=1、私有 Cargo home 和 `junk-rules` target；未下载。进程检查发现忙时没有运行该次 gate，也不计为检查失败。

## 最终有效负控与原字节恢复

| 负控 | 唯一变异 | 实测失败 | 红回执 → 恢复绿回执 |
|---|---|---|---|
| nc1 | `rules/windows.json` 第二定位器末尾加回 `*#*.exe` | `RULES_M35_SEEDS: exact installer patterns and order`；3 通过、1 失败 | `2026-11-07T03-34-06.175Z-2936-red-nc1-result.json` → `2026-11-07T03-35-40.179Z-27040-test-result.json` |
| nc2 | 同文件 data_version 退回 `2026-11-02.2` | `RULES_M35_VERSION: plan data version` 与 `RULES_M35_VERSION: embedded version`；2 通过、2 失败 | `2026-11-07T03-35-46.834Z-23200-red-nc2-result.json` → `2026-11-07T03-35-54.047Z-26216-test-result.json` |

每次红后立即 `git checkout -- packages/junk-rules/rules/windows.json`，核对原字节 SHA-256，再以完整四测变绿；等待机器编译空档期间没有其它变异。两次恢复文件哈希均为 `8245e53f439b36b1d09ba7a86044e6debd177e9691a6b22108db30e63daeeb0b`。

最终三门的 productionHash 都为 `045b7fbeb7785a0684dc4309ca4ca13181657a9028a5100170c3d8557cc689b0`，testHash 都为 `dbe5aad761611ee26bee31b008bf5e4f1326f898f9fd347a23f1e78565fd8f17`。`2026-11-07T03-36-06.038Z-28760-test-result.json` 的 proofAudit 精确绑定上述两组红与绿，四测试全部通过，0 ignored、0 filtered out。

## final、真实冒烟与证据

三个 final 依次为 check（03:36:00）、test（03:36:06）、real（03:37:15），均在干净的最终实现提交上通过，前后 HEAD 不变。check 包含格式、依赖/源码政策与 Clippy `-D warnings`。

real 只核对已知目录和字面路径前缀存在性，没有枚举真实文件或读取内容，返回：

```json
{"base_present_count":87,"literal_prefix_present_count":70,"rule_count":110,"system_drive_exists":true}
```

`archive` 于 03:37:20 通过，`docs/acceptance/wave10/m12/ARCHIVE.json` 索引 305 个证据文件、8,125,531 字节。它按原字节保留修复前红、首轮负控以及最终有效负控；所有归档文件逐个核对 SHA-256。本轮 archive 自身回执仍在 `.local/checks/WATER-W10-M12/`（归档运行结束后才写出），不为收录自身再次归档。回执以 UTF-8 写入并读回检查。

## 边界与未验证

没有改变扫描包、服务包、执行器、公开接口或依赖；M12 仅验证数据，不把文件名实际匹配行为或 M12/M13/M14 集成称为通过。没有真实清理、网络访问、窗口、浏览器或选择框；macOS 未验证。没有 push、merge、rebase、reset、amend、修改 Git 配置/远端或主线台账。

本票交回为完成，等待总控验收；不是自行标记 VERIFIED。完成回执与证据提交后停止 M12 检查，再按用户原派单开始 M13。
