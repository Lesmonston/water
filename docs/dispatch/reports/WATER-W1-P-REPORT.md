WATER-W1-P 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/p/docs/dispatch/reports/WATER-W1-P-REPORT.md

本回执提交 P 的范围登记与进程内许可实现，等待总控独立验收。没有自行更新主线台账或标记 VERIFIED。

| 项目 | 实际值 |
|---|---|
| 权威票 | 主检出 `docs/dispatch/tickets/WATER-W1-P-SCOPE-REGISTRY-20261018.md` |
| 工作树 / 分支 | `F:/new/smaltalk/water/.worktrees/p` / `worker/water-w1-p` |
| 精确基线 / tag | `34badd897b8983cffbb57e03a9df9e6af52f7b8f` / `water-w1-scope-export-base-20261018` |
| 实现及五 final 受测 SHA | `2e963bba0c6b968299880198eb4f1bb8a8100108` |
| 实际执行引擎 / 模型 | Codex API 会话；系统标识为基于 GPT-6，未提供更细模型 ID；未启动子代理或其他实现者 |
| 环境 | Windows，Node v24.16.0，Rust 1.95.0 / Windows MSVC 实际编译；离线私有 Cargo home、target、tmp；jobs=1，测试线程=1 |
| 冻结 | 51 新条目、9 旧锁 / 198 旧唯一文件，共 227 唯一文件全部哈希匹配 |
| 物理夹具 | 复用本树冻结工具既有四个合成目录 / 一个 junction；普通文件 0、内容 0 字节；索引 SHA-256 `4eaaa2a470445ab6afacb3fceb94a7bf1db67932b514c06d7feaf7b1b9236020` |

实现只有 `packages/scope-registry` 的 Cargo.toml、独立 Cargo.lock、README、src/lib.rs、src/v1.rs、tests/registry_v1.rs 六文件。直接依赖恰为 A/N 两个 path，无新增 registry 版本、直接 serde/dev/build 依赖、bin 或 unsafe。后续提交只追加本票报告与证据，产品和测试保持受测提交原字节。

**需求逐项与五测试**

| 测试 | 实际覆盖 |
|---|---|
| `registry_registration` | capacity 0/17/usize::MAX 拒绝，1/16 接受；pending/confirmed/active 均占槽；full→duplicate ID→真实 N 的检查顺序；失败不占槽；同根、全分隔与混合分隔别名重复；不同根身份；允许祖先/后代重叠 |
| `registry_confirmation` | pending 原生观察与 flags；decline 和重放；同 ID 重建时旧 pending 无效；confirm 唯一；确认及 active 后旧 pending 均 WrongState；失败不改变当前 permit |
| `registry_permits_and_replay` | 每根单 active；finish/cancel 重放拒绝；新 attempt 不复活旧 permit；旧 finish 不能结束新 attempt；独立根互不影响 |
| `registry_revocation_and_owner` | 两 registry 同 ID 同根仍不能互用；所有涉及能力的入口拒绝外来对象；active revoke 失效全部旧能力；同 ID 同根重建仍拒绝旧 registration；撤销、取消一个根不影响另一根或 registry；drop 后旧 owner 无效 |
| `registry_public_native_bridge` | 实际公开 prepare→preview→confirm→begin→check→finish/cancel/revoke；和直接 N lease 的 identity/观察逐值相等；真实词法与 junction 错误原样包装；枚举 Display/Clone/Eq/Error；N 三个 authority/race 标记保持 false |

每 registry owner、每 registration、每 attempt 都是独立 `Arc<()>`，分别用 `Arc::ptr_eq` 验证。能力只公开 `scope_id()`，没有 Clone/Debug/Default/Serde/字段/任意状态构造。能力持有 Arc 保证旧对象存活时身份不会因地址重用复活。外部编译证据含一个成功对照与 **29 个指定拒绝**，覆盖四类对象的 Clone、Debug、Default、Serialize、Deserialize、结构构造与私有字段，以及 permit attempt 字段；见 [PRIVACY-COMPILE.json](../../acceptance/wave1/p/PRIVACY-COMPILE.json) 和原始输入/日志。该证据链接 final bridge 选择的真实 rlib，未改产品或依赖。

**串行定向检查**

所有门使用 `node scripts/scope-export-check.mjs --task WATER-W1-P --mode <mode>`。首次 baseline 在产品目录不存在、精确基线且干净时通过，实际 A/N、三个正常根身份、别名身份及 junction 拒绝均通过。锁只经 `--mode lock` 离线生成。

实现提交后，下列五门均加 `--final`，同一干净 SHA 的检查前后状态为空，helper 退出码均为 0。每门均核验四条当前源码/测试字节的完整红绿证据链。

| final 模式 | 结果 | 原始回执（证据 checks/ 下） |
|---|---|---|
| fmt | 通过 | `2026-10-18T10-28-56.791Z-28688-fmt-result.json` |
| test | 5 passed / 0 failed / 0 ignored | `2026-10-18T10-29-02.285Z-1608-test-result.json` |
| clippy | 所有 target，`-D warnings` 通过 | `2026-10-18T10-29-19.723Z-26820-clippy-result.json` |
| metadata | 独立 workspace / 两直接依赖 / 唯一 lib 和 test / 锁白名单通过 | `2026-10-18T10-29-25.090Z-40552-metadata-result.json` |
| bridge | 冻结公开 P/N 桥接通过 | `2026-10-18T10-29-29.120Z-43240-bridge-result.json` |

bridge 返回 `actual_P_N=true`、`owner_binding=true`、`revocation_and_replay=true`、`original_N_flags_preserved=true`、`native_user_gesture_verified=false`、`directory_enumerated=false`。完整门及命令、退出码见 [GATE-SUMMARY.json](../../acceptance/wave1/p/GATE-SUMMARY.json)。没有运行全仓、watch、coverage 或并发重负载门。

**有效红 / 原字节恢复**

先完成最终字节的五项测试和可编译 API 骨架，再运行 red-behavior：5 个测试全部执行，0 passed / 5 failed，真实 Rust 退出 101 并命中 `P_BEHAVIOR`；实现后 suite 5 passed。测试字节全程相同：文件 SHA-256 `757869f6675024afdf67fcff3903aed30bb97a24af3ea759112ae29ffd781be6`，helper testHash `be144d993ada0f69442bfd9869513b1db27dccdcffa7b78810574ad71212a4e2`。

稳定 fmt/clippy 后依次实改生产 src/v1.rs，每轮完整五项测试均执行，helper 认定预期行为红后立即原字节恢复，再完整五绿。没有编译失败、缺文件、超时、测试开关或伪造对象充作负控。

| 负控 | 真实改坏行为 / 指定断言 | 坏态完整五测 | 恢复完整五测 |
|---|---|---|---|
| nc1 | 允许 active 再发第二个 permit；`P_SINGLE_ACTIVE` | 4 passed / 1 failed，Rust 101 | 5 passed |
| nc2 | 移除 owner/registration 指针认证，按 scope ID 查找；`P_OWNER_BOUND` | 3 passed / 2 failed，Rust 101 | 5 passed |
| nc3 | revoke 保留 active entry / lease / attempt；`P_REVOKED` | 1 passed / 4 failed，Rust 101 | 5 passed |

三轮的原与恢复 src/v1.rs SHA-256 均为 `67de5f02e256bd0bc85518cd5004e1bed58719f31a100583aaee55f76e7bf73b`。坏态 SHA-256 分别为 nc1 `af727024972dfd1629e287572c6c37d41903b565cb96eedaa7c72b509632da2d`、nc2 `4e97daf31254689ec857bdb841d09abd7b124bc83c06a4003a9f1619a72e8afa`、nc3 `b408d287c9afdd71e83144a0bdfd0a129bd384fb8af5f1f2bea509b8aa221dc7`。完整原/坏/恢复源码及生产聚合三哈希、红与下一红之前恢复的回执见 [NEGATIVE-CONTROLS.json](../../acceptance/wave1/p/NEGATIVE-CONTROLS.json)。最终 productionHash 为 `78dc90418ef86cf604cc537a9af5c85cdc48513b46626a5046f77ffbc9ff40ab`；骨架 productionHash 为 `fe9c5a86cd7a8b7733e32abf0d99ebf37850f82a02b1348d71de6540811e1fbd`，详 [BEHAVIOR-PROOF.json](../../acceptance/wave1/p/BEHAVIOR-PROOF.json)。

**证据、失败与边界**

全部 helper json/log/txt 共 **322 文件 / 18 回执** 已原字节复制到 `docs/acceptance/wave1/p/checks/`，其中含一份已有总控派前 baseline；本次 17 回执全部通过。来源路径、字节数与 SHA-256 全量见 [HELPER-ARCHIVE.json](../../acceptance/wave1/p/HELPER-ARCHIVE.json)。没有纳入二进制、cache 或物理 fixture；冻结证据 .gitattributes 未改。

预期行为红、三项负控及 29 编译拒绝全部保留。另有四项辅助问题：初读 ADR 路径不存在；PowerShell 的 node -e 引号导致只读 manifest 检视 SyntaxError；包含原始 runner 日志的 git whitespace 检查因六个 EOF 空行退出 2；交付审计脚本的中文期望值经 PowerShell ASCII 管道变成问号，首行比较失败。分别用正确目录/PowerShell JSON、保留日志原字节并检查产品及 JSON、ASCII Unicode 转义的相同期望值解决。报告原始 UTF-8 正确，产品未变。全部细节见 [FAILURE-NOTES.txt](../../acceptance/wave1/p/FAILURE-NOTES.txt)。未出现非预期产品测试或门失败。

`Entry::refresh` 的原生刷新错误传播、RootChanged 身份不等分支及其无状态变更，仅完成源码审阅；固定原生句柄未实触这些失败。lease 释放按 Rust/N File RAII 源码审阅，没有伪称句柄资源测量。详 [SOURCE-REVIEW.txt](../../acceptance/wave1/p/SOURCE-REVIEW.txt)。

`confirm` 只是可信 Rust 宿主的进程内声明。**真实用户确认鉴真、原生选择器、IPC/HTTP/WebView、permit 到原生句柄有界遍历、scope 重叠互斥、生产竞态、macOS、桌面导出及删除均未验证或未实现。** N 三个 authority/race 字段保持 false，P 不保留路径、不枚举、不读取普通内容或配置、不汇总容量。后续遍历器须接有效 permit、Registry.check_permit 和重新打开后的根身份比对；本票未接线。

冻结旧依赖、A–O、根 Cargo/锁、helper、台账、上游与其他工作树保持。没有 merge、push、安装依赖、联网 fetch、真实用户数据、HOME/盘根扫描、清理、ACL 或移动动作。实现、测试、原始证据与本回执在指定 worker 分支交回；等待总控验收，M1 用户闭环仍未完成。
