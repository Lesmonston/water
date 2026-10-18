# WATER-W1-N：Windows原生目录身份基础

归档状态（2026-10-18）：VERIFIED（Windows受控范围），原票不再外贴或从基线重做。以下为原执行票，当前以manifest及[总控验收报告](../../acceptance/wave1/controller/WATER-W1-NO-REVIEW-20261018.md)为准。

总控2026-10-18。执行前主manifest必须为READY；用户转贴后一个新执行对话独占本票。与O完全独立。该票不实现选择授权或扫描器。

| 项 | 唯一值 |
|---|---|
| 权威票 | F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W1-N-NATIVE-ROOT-20261018.md |
| 工作树 / 分支 | F:/new/smaltalk/water/.worktrees/n / worker/water-w1-n |
| 精确基线 | 75cf4db7607a382673a2146ca69732a5110c1579 |
| tag | water-w1-next-core-base-20261018 |
| 权威manifest | F:/new/smaltalk/water/docs/dispatch/wave1/manifest.json |
| 冻结 | contracts/next-core-v1/freeze.lock.json，98项+八旧锁，合计198唯一文件 |
| helper / 纪律 | scripts/next-core-check.mjs / docs/dispatch/W1-NEXT-CORE-WORKER-RULES.md |
| 回执 | F:/new/smaltalk/water/.worktrees/n/docs/dispatch/reports/WATER-W1-N-REPORT.md |
| 证据 / 临时 | 本树docs/acceptance/wave1/n/、.local/checks/WATER-W1-N/、.local/next-{cargo-home,target,tmp} |

必读主检出README/STATUS/AGENTS/工作流、本票、M1-DELIVERY-PLAN、ADR-010、本批纪律、next-core-v1 COMMON/TESTS和native-root-v1 SPEC/SOURCES。执行树早于票面/登记，直接读主检出权威材料，不merge取票。首次核工作树绝对路径、分支、精确HEAD、干净状态、198冻结及packages/native-root尚不存在；不符保留现场写受阻回执，不重置。

首次仅运行：

```powershell
node scripts/next-core-check.mjs --task WATER-W1-N --mode baseline
```

baseline已由总控在本树独立实跑，执行者开工重复确认。只验证Node24/Rust1.95/MSVC、私有离线A/serde依赖、Win32 ABI/同目录稳定ID/不同目录不同ID和本树有界junction能力；无N产品或五测试通过。只由冻结prepare工具创建/复用本树.local/native-root-fixtures固定批（两个小文件共35字节、两个junction），保留index/夹具，不清理重造。Rust测试只读index和元数据，不读普通文件正文、不写fixture；O/旧树无权限。

## 实现

仅packages/native-root：water-native-root / water_native_root / pub mod v1，API/词法/错误/私有字段/精确wire按SPEC。validate_windows_path纯词法先拒绝；native只允许固定本地盘、祖先和终项非跟随重解析检查、FILE_READ_ATTRIBUTES自有句柄和FileIdInfo。DirectoryLease私有File寿命，refresh只查同句柄，无原路径/handle/File出口，无可伪造输出构造器。

只在src/native_windows.rs允许逐处SAFETY的窄FFI；恰GetDriveTypeW和GetFileInformationByHandleEx(class9/18)，其它模块deny unsafe。不能引入windows crate/新包、写/删除/list/read-data权限、shell、网络、提权、目录遍历/授权/全局状态。所有三个authority/race字段false。祖先预检不解决并发替换，别写成安全遍历已经完成。旧F/G Windows Unknown、M容量协议不改。

白名单仅本树：packages/native-root/Cargo.toml、Cargo.lock、README.md、src/内Rust文件、tests/native_root_v1.rs；docs/dispatch/reports/WATER-W1-N-REPORT.md和docs/acceptance/wave1/n/新证据。其余旧产品/根Cargo/冻结/helper/台账/上游/别树只读。自有workspace、唯一lib/test、三直接依赖，锁仅`--mode lock`离线生成，SPEC固定原版本。

## 五测试与红绿

唯一五顶层root_path_validation、root_native_identity、root_reparse_boundaries、root_observation_wire、root_lifetime_and_errors。词法无IO、正常A/B及nested ID、refresh、两种junction含祖先child、普通file/missing、净化错误和精确wire均覆盖。至少公开open_directory→observation/refresh→to_json实入口；RAII/无重开路径源码证据与竞态未实测分别记录，不靠模拟句柄替代native。

先完整五测试和可编译骨架`red-behavior`，真实行为断言N_BEHAVIOR/退出101；再实现、suite五绿。先完成fmt/clippy稳定，再逐个实改真生产逻辑：

1. red-nc1：关闭真实重解析拒绝但保留no-follow打开标志，命中N_REPARSE_ROOT。
2. red-nc2：实际File ID改常量导致两正常目录碰撞，命中N_IDENTITY_HANDLE。
3. red-nc3：authorization_granted或traversal_allowed提升true，命中N_NO_AUTHORITY。

每项完整五红，立即原字节恢复并suite五绿；保存原/坏/恢复哈希，测试字节不变。编译/超时/缺文件不算红；不得改helper、测试开关或减少断言。COMMON规定final核当前源码恢复链，修改后重录对应证据。

命令统一`node scripts/next-core-check.mjs --task WATER-W1-N --mode <mode>`；允许baseline/fixtures/lock/fmt/test/suite/clippy/metadata/bridge/red-behavior/red-nc1/2/3。一树一个门，offline/locked/jobs1，单子命令180秒；无整仓/watch/coverage。

实现/测试提交后同一干净SHA串行：

```powershell
node scripts/next-core-check.mjs --task WATER-W1-N --mode fmt --final
node scripts/next-core-check.mjs --task WATER-W1-N --mode test --final
node scripts/next-core-check.mjs --task WATER-W1-N --mode clippy --final
node scripts/next-core-check.mjs --task WATER-W1-N --mode metadata --final
node scripts/next-core-check.mjs --task WATER-W1-N --mode bridge --final
```

bridge由总控源码真实调用本库，核两目录不同ID、同句柄refresh、reparse/file/missing错误与wire。全部helper json/log/txt原字节归档本票证据目录，不含二进制/缓存/fixture内容；显式文件名add，log用-f。回执绑定完整受测SHA、需求/测试/红恢复/实际模型、窄unsafe安全说明、全部失败和未验证：macOS/真实用户scope/生产竞态/选择授权/遍历/桌面/删除。报告提交不夹未复测产品；不merge/push，交回后停止。

通知与报告首行：

```text
WATER-W1-N 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/n/docs/dispatch/reports/WATER-W1-N-REPORT.md
```
