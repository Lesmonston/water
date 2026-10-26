# 第二波（设备垃圾体检）执行者规则

2026-10-26，总控（Claude）。适用 WATER-W2-A～E。和第一波相比门更轻，但删除与真实数据两条底线更严。

## 1. 开工

1. 只认工单里的绝对路径。先读：本规则、工单、[ADR-018](../decisions/ADR-018-device-junk-checkup-and-in-app-cleanup.md)、[共享模型](../../contracts/checkup-v1/MODEL.md) 和工单指定的 SPEC。
2. 在工单指定的工作树根目录运行（不要 cd 到别处）：

```powershell
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task <票号> --mode baseline
```

baseline 只证明环境与输入就绪，不代表产品存在。失败就停下写受阻回执。

## 2. 写代码

- 只改工单白名单里的文件；新 crate 的目录就是你的地盘。改别处、改契约、改检查脚本一律不行；觉得契约有问题，写受阻回执。
- Rust：edition 2024、rust 1.95、`publish = false`、四个 auto 发现关闭；依赖只有 `serde =1.0.229`（derive）与 `serde_json =1.0.151`；全部离线。第一次写好 `Cargo.toml` 后跑一次 `--mode lock` 生成锁文件，之后不再改依赖。
- 需要 Windows 系统调用的票，只在 `src/native_windows.rs` 用裸 `extern "system"` 声明，`lib.rs` 写 `#![deny(unsafe_code)]` 并只对该模块放开；其它票 `#![forbid(unsafe_code)]`。生产代码不得启动进程、联网、读环境变量（真实冒烟的 example 除外）。
- 测试只放在工单指定的测试文件，测试名与工单完全一致，不许 `#[ignore]`、过滤或拆分凑数。

## 3. 夹具与真实数据

- 合成夹具只能建在本树 `.local/w2-<槽位>-fixtures/` 下，每次用随机名新建一个目录；测试结束**只删除本次新建的那一个目录**（校验父目录与名字前缀）。不得递归删除任何别的东西。
- 用户已授权在开发期对本机做**只读**扫描：只读规则登记位置的名字、大小、时间、属性，以及进程列表与命令行。不读任何文件内容，不改、不删任何真实文件。真实读取只能通过 `--mode real` 运行工单规定的 `examples/real_smoke.rs`，输出不得含绝对路径或命令行。
- WATER-W2-D（清理执行器）没有真实模式，测试计划里不得出现任何真实用户位置。

## 4. 检查与负控

| 模式 | 作用 |
|---|---|
| `lock` | 首次离线生成 Cargo.lock 并核对依赖白名单 |
| `check` | 依赖与 unsafe 政策、`cargo fmt --check`、`cargo clippy -D warnings` |
| `test` | 跑工单指定的测试，名字与数量必须完全一致 |
| `real` | 只读真实冒烟（A/B/C） |
| `red-nc1` 等 | 有效负控 |
| `archive` | 把 `.local/checks/<票号>/` 的回执与日志按原字节复制进证据目录并写索引 |

负控做法：只改 `src/` 下真正被调用的那一行（不改测试、不加开关），运行 `--mode red-ncN`，它必须以目标失败信息失败；然后**立即**用 `git checkout -- <文件>` 恢复原字节，跑一次 `--mode test` 变绿，再做下一条。检查器会核对源码哈希，用编译错误、超时或改测试造出的红不算数。

## 5. 收尾

1. 实现、测试与锁文件全部提交，得到干净的实现提交。
2. 在这个干净提交上依次跑工单列出的 final：`--mode check --final`、`--mode test --final`，有真实模式的再跑 `--mode real --final`。final 会核对负控记录；产品字节不变时不要重复跑。
3. 跑 `--mode archive`，写回执（路径见工单），把回执与证据目录逐个文件 `git add` 后单独提交。后续提交只能含回执与证据。
4. 回执第一行与给用户的通知完全一样：`<票号> 任务已完成，任务报告在 <绝对路径>`；受阻则写“任务受阻”。
5. 回执必须写：实际模型、实现提交 SHA、逐条需求对照、每个检查命令与结果、负控（改了哪一行、失败信息、恢复后的哈希）、真实冒烟摘要、没做或没验证的事。

禁止：push、merge、rebase、`git add -A`、`git clean`、`git reset --hard`、`git stash`、改主线台账、提交别人的文件。交回后停止一切测试与后台进程。
