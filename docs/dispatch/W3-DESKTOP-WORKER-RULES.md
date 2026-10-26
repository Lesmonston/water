# 第三波（桌面接线）执行者规则

2026-10-26，总控（Claude）。适用 WATER-W3-F1、WATER-W3-F2。在第二波规则基础上调整依赖与原生窗口两处；删除与真实数据的底线不变。

## 1. 开工

1. 只认工单里的绝对路径。先读：本规则、工单、[ADR-018](../decisions/ADR-018-device-junk-checkup-and-in-app-cleanup.md)、[IPC v1](../../contracts/checkup-v1/IPC.md)、[共享模型](../../contracts/checkup-v1/MODEL.md)，以及工单指定的 SPEC（`contracts/desktop-v1/` 下）。
2. 在工单指定的工作树根目录运行（不要 cd 到别处）：

```powershell
node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task <票号> --mode baseline
```

baseline 只证明环境与输入就绪，不代表产品存在。失败就停下写受阻回执。

## 2. 写代码

- 只改工单白名单里的文件。已验收的 `packages/junk-rules`、`junk-scan`、`process-scan`、`junk-clean`、`native-picker` 与 `apps/water/ui` 一律只读。契约、检查脚本、台账也不能改。契约冲突或缺东西时写受阻回执，不要自行变通。
- Rust：edition 2024、rust 1.95、`publish = false`、四个 auto 发现关闭，依赖严格按 SPEC 第 1 节。全部离线：第一次写好 `Cargo.toml` 后跑一次 `--mode lock` 生成锁文件，之后不再改依赖。
- F1 需要的 Windows 系统调用只写在 `src/native_windows.rs`，写法同第二波；F2 不写任何 unsafe。
- 生产代码不得启动进程、联网。读环境变量只允许 F2 的 `WATER_DATA_DIR` 与 F1 真实冒烟 example 的命令行参数。
- 测试只放在工单指定的测试文件，测试名与工单完全一致，不许 `#[ignore]`、过滤或拆分凑数。

## 3. 夹具与真实数据

- 合成夹具只能建在本树 `.local/w3-<槽位>-fixtures/` 下，每次用随机名新建一个目录；测试结束**只删除本次新建的那一个目录**（校验父目录与名字前缀）。不得递归删除任何别的东西。
- F1 的清理测试只在夹具里删除，计划里不得出现任何真实用户位置。
- 用户已授权开发期对本机做**只读**扫描。真实读取只能通过 `--mode real` 运行 F1 规定的 `examples/service_smoke.rs`，并且清理保持关闭；输出不得含路径或命令行。
- F2 的测试不打开任何窗口或选择框。真实窗口只在 `--mode native --final` 里由检查器打开一次（第 4 节）。

## 4. 检查与负控

| 模式 | 作用 |
|---|---|
| `lock` | 首次离线生成 Cargo.lock 并核对依赖（F2 另核对每个包都在已验收的 AC 锁里） |
| `check` | 依赖与 unsafe 政策、`cargo fmt --check`、`cargo clippy -D warnings` |
| `test` | 跑工单指定的测试，名字与数量必须完全一致 |
| `real` | F1 只读真实冒烟 |
| `native` | F2 原生窗口检查，只能 `--final`，整票只有一次 |
| `red-nc1` 等 | 有效负控 |
| `archive` | 把 `.local/checks/<票号>/` 的回执、日志与截图按原字节复制进证据目录并写索引 |

负控做法：
1. 只改 `src/` 下真正被调用的那一行，不改测试、不加开关；
2. 运行 `--mode red-ncN`，它必须以目标失败信息失败；
3. **立即**用 `git checkout -- <文件>` 恢复原字节，跑一次 `--mode test` 变绿，再做下一条。

检查器会核对源码哈希。用编译错误、超时或改测试造出的红不算数。

## 5. 收尾

1. 实现、测试与锁文件全部提交，得到干净的实现提交。
2. 在这个干净提交上依次跑工单列出的 final。final 会核对负控记录；产品字节不变时不要重复跑。F2 的 `native --final` 放在最后，只跑一次。
3. 跑 `--mode archive`，写回执（路径见工单），把回执与证据目录逐个文件 `git add` 后单独提交。后续提交只能含回执与证据。
4. 回执第一行与给用户的通知完全一样：`<票号> 任务已完成，任务报告在 <绝对路径>`；受阻则写“任务受阻”。
5. 回执必须写清：
   - 实际模型、实现提交 SHA；
   - 逐条需求对照；
   - 每个检查命令与结果；
   - 负控：改了哪一行、失败信息、恢复后的哈希；
   - F1 的真实冒烟摘要，F2 的原生窗口结果（逐张截图写看到了什么）；
   - 没做或没验证的事。

禁止：push、merge、rebase、`git add -A`、`git clean`、`git reset --hard`、`git stash`、改主线台账、提交别人的文件。交回后停止一切测试与后台进程。
