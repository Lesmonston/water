# WATER-W1-P：目录范围登记与进程内许可

总控2026-10-18。主manifest为READY后、用户外贴给一个新执行对话才开始。本票与Q独立；不实现原生选择器或遍历器。

| 项 | 唯一值 |
|---|---|
| 权威票 | F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W1-P-SCOPE-REGISTRY-20261018.md |
| 工作树 / 分支 | F:/new/smaltalk/water/.worktrees/p / worker/water-w1-p |
| 精确基线 | 34badd897b8983cffbb57e03a9df9e6af52f7b8f |
| tag | water-w1-scope-export-base-20261018 |
| 权威manifest | F:/new/smaltalk/water/docs/dispatch/wave1/manifest.json |
| 冻结 | contracts/scope-export-v1/freeze.lock.json，51条目/九旧锁198唯一文件，合计227唯一文件 |
| helper / 纪律 | scripts/scope-export-check.mjs / docs/dispatch/W1-SCOPE-EXPORT-WORKER-RULES.md |
| 回执 | F:/new/smaltalk/water/.worktrees/p/docs/dispatch/reports/WATER-W1-P-REPORT.md |
| 证据 / 临时 | 本树docs/acceptance/wave1/p/、.local/checks/WATER-W1-P/、.local/next-{cargo-home,target,tmp} |

必读主检出README/STATUS/AGENTS/工作流、本票、ADR-011、本批纪律、scope-export COMMON/TESTS、scope-registry SPEC和真实N的SPEC/源码。执行树早于正式票/登记，直接读主检出权威材料，不merge取票。首次核绝对路径/分支/精确HEAD/干净状态/227冻结与packages/scope-registry尚不存在；不符保留现场写受阻回执，不重置。

首次只运行：

```powershell
node scripts/scope-export-check.mjs --task WATER-W1-P --mode baseline
```

总控派前已在此树实跑同命令，执行者重复确认。它仅验证Node24/Rust1.95/MSVC、私有离线真实A/N、三个正常根不同身份/混合分隔alias同身份/一个junction拒绝；新P与五测试不存在。只由冻结prepare工具在本树.local/scope-fixtures创建一次四个合成目录+一个junction，普通文件0/内容0字节；工具有界核固定目录项，Rust不枚举/读内容/写fixture。原树/夹具不动，不重造或清理。

## 实现与边界

仅packages/scope-registry，water-scope-registry/water_scope_registry/pub mod v1，全部API/状态/错误/顺序按SPEC。直接依赖只A/N两个path；自有workspace/锁/唯一lib/test，无unsafe/dev/build/serde/新包/bin。N完成所有原生IO，Registry只持其私有lease，不保存路径或开新File。

Registry的pending/confirmed/active状态、每registry owner Arc、每registration Arc、每attempt Arc必须真实绑定；不可只按scope_id或串token授权。所有能力私有、不可Clone/Debug/Serde/Default/公开构造，唯一scope_id getter不等于权限。完整prepare→preview→confirm→begin→check→finish/cancel/revoke，拒绝跨registry/重放/二次active/已撤销/同ID重建复活，且不伤其它scope。capacity/duplicate检查顺序与失败不变状态按SPEC。

confirm仅可信Rust宿主的进程内声明，不证明真实用户手势；不得添加HTTP/WebView/CLI/JSON恢复/原生picker或假user_confirmed=true wire。N的三个authority/race字段保持false；P不遍历、读配置/内容、汇总容量或验证祖先/后代scope互斥。future permit→原生句柄扫描只在文档说明，本票不接线。

白名单仅本树：packages/scope-registry/Cargo.toml、Cargo.lock、README.md、src/内Rust文件、tests/registry_v1.rs；docs/dispatch/reports/WATER-W1-P-REPORT.md和docs/acceptance/wave1/p/新证据。证据.gitattributes已预置冻结，不改；旧A–O/N、根Cargo/锁/helper/台账/上游/其它树只读。测试不用serde_json；公开N观察用getter核对。对Result<不实现Debug的能力>别用unwrap_err导致编译造红，使用matches!/err等合法断言。

## 五测试与有效红绿

唯一registry_registration、registry_confirmation、registry_permits_and_replay、registry_revocation_and_owner、registry_public_native_bridge；全部SPEC边界及真实N公开链路。能力私有性用源码/编译拒绝证据，不为伪造状态加后门。

先完整五测试与可编译骨架，red-behavior命中P_BEHAVIOR、底层101；再实现suite五绿。先稳定fmt/clippy，再逐项实改真实生产逻辑：

1. red-nc1关闭单active防护，第二permit被发出，P_SINGLE_ACTIVE红。
2. red-nc2关闭owner/registration认证，跨registry同ID/根可混用，P_OWNER_BOUND红。
3. red-nc3 revoke不移除active条目/attempt，旧permit仍可用，P_REVOKED红。

每项完整五红→立即原字节恢复→suite完整五绿，记录原/坏/恢复哈希。helper保存所有源码/日志，final核当前字节四条恢复链。编译/缺文件/超时/测试开关不算红，不改helper/减少测试；源或测试变化重录受影响证据。

命令统一`node scripts/scope-export-check.mjs --task WATER-W1-P --mode <mode>`；允许baseline/fixtures/lock/fmt/test/suite/clippy/metadata/bridge/red-behavior/red-nc1/2/3。锁只经lock离线生成，jobs1，一次一个门，单子命令180秒，无全仓/watch/coverage。

实现/测试提交后同一干净SHA串行：

```powershell
node scripts/scope-export-check.mjs --task WATER-W1-P --mode fmt --final
node scripts/scope-export-check.mjs --task WATER-W1-P --mode test --final
node scripts/scope-export-check.mjs --task WATER-W1-P --mode clippy --final
node scripts/scope-export-check.mjs --task WATER-W1-P --mode metadata --final
node scripts/scope-export-check.mjs --task WATER-W1-P --mode bridge --final
```

bridge编译总控冻结源码，真实P/N公开生命周期、owner绑定、取消/撤销/ID重建与N标记逐项核验。把全部helper json/log/txt原字节归档本票证据，不纳二进制/cache/fixture；显式文件名add，log用-f，不批量add。回执绑定完整受测SHA、五测试/五final、完整红/恢复/三哈希、所有失败、实际引擎/模型及限制：真实用户确认/原生选择器/IPC、permit到原生遍历、scope重叠、竞态、macOS、桌面/删除均未验证。RootChanged/不可强制native失败若只源码审阅就明确写，不伪造观察值。

实现后报告提交不夹未复测产品，不merge/push，交回后停止。通知与报告首行：

```text
WATER-W1-P 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/p/docs/dispatch/reports/WATER-W1-P-REPORT.md
```
