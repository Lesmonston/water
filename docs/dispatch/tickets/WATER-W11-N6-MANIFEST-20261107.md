# WATER-W11-N6：项目声明认两个文件名、真实冒烟找根（轻门）

2026-11-07，正式单，总控（Claude）。默认执行者：sol；N4～N7 由同一个执行者按顺序做，本单第三张（N5 交回后再开工）。状态以[第十一波 manifest](../wave11/manifest.json) 中本单的 `status` 为准；READY 不代表已外贴。可以新开对话执行。

用户 11-07 把软件改名 Flick：项目声明的新名字是 `.flick-cleanup.json`，旧名字 `.water-cleanup.json` 照旧认。另外收掉 M3 遗留第 4 条：真实冒烟用 `ancestors().nth(4)` 找仓库根，只在工作树里对。服务单 N8 要等本单合入后才开工。

| 项 | 精确值 |
|---|---|
| 权威单 | F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W11-N6-MANIFEST-20261107.md |
| 唯一工作树 / 分支 | F:/new/smaltalk/water/.worktrees/w11-n6 / worker/water-w11-n6 |
| 精确首次 HEAD | ccc584b3（tag `water-w11-n6-base-20261107`），必须干净；完整 SHA 见 manifest |
| SPEC | F:/new/smaltalk/water/contracts/w11-v1/RENAME-FLICK.md（第 4 节）与 F:/new/smaltalk/water/contracts/m35-v1/MANIFEST-M35.md，加上本单第 1 节 |
| 规则 | F:/new/smaltalk/water/docs/dispatch/WORKER-RULES.md 与 F:/new/smaltalk/water/docs/dispatch/W11-WORKER-RULES.md |
| 检查入口 | F:/new/smaltalk/water/scripts/checkup-wave-check.mjs |
| 回执 | F:/new/smaltalk/water/.worktrees/w11-n6/docs/dispatch/reports/WATER-W11-N6-REPORT.md |
| 证据目录 | F:/new/smaltalk/water/.worktrees/w11-n6/docs/acceptance/wave11/n6/ |
| 门 | 轻门：2 条负控 + check、test、real 三个 final |

先读：两份规则、SPEC 第 4 节、本单全文；代码 `packages/cleanup-manifest/src/lib.rs`、`examples/real_smoke.rs`、`README.md`、`tests/manifest_v1.rs`。下面的行号都指 `ccc584b3`。

## 1. 要做的（全部在 `packages/cleanup-manifest/`）

1. **两个文件名**（SPEC 第 4 节第 1 条）：
   - `FILE_NAME`（第 12 行）保留，值仍是 `.water-cleanup.json`；
   - 新增 `pub const FILE_NAME_FLICK: &str = ".flick-cleanup.json";` 与 `pub const FILE_NAMES: [&str; 2] = [FILE_NAME_FLICK, FILE_NAME];`；
   - `read_manifest`（第 435～441 行的文件名检查）两个名字都认，不区分 ASCII 大小写；别的校验与读法不变。
2. **真实冒烟找根**（`examples/real_smoke.rs` 第 5～8 行）：不再数目录层数。从 `CARGO_MANIFEST_DIR` 往上找**第一个含有 `.worktrees` 目录**的祖先当仓库根（工作树里与主线里都能找到主仓库）；找不到就按现在的失败方式退出，不去别处读。
   - 工作树计数照旧。
   - 仓库根的声明文件：两个名字各自有就各只读一次，输出各自的 `present`、`valid`、`entries`、`hash_prefix`（JSON 键名用 `flick` 与 `water` 区分）。
3. `README.md` 第 4 行一带写上两个名字。
4. 公开接口只增加上面两个常量，别的不变。

## 2. 测试

- `packages/cleanup-manifest/tests/manifest_v1.rs`，精确 4 个测试，与 M3 相同：`manifest_parse_contract`、`manifest_targets_and_protect`、`manifest_read_files`、`manifest_git_link`。
- **新断言**（放进 `manifest_read_files`，失败信息带 `MANIFEST_W11_NAMES`）：
  - `FILE_NAMES` 正好是 `[".flick-cleanup.json", ".water-cleanup.json"]`，`FILE_NAME` 仍是 `.water-cleanup.json`；
  - 同一份合法内容写成 `.flick-cleanup.json` 与 `.water-cleanup.json`，`read_manifest` 结果相同（除 `path` 外）；
  - 大小写混写的新名字也认；别的名字（例如 `.flick-cleanup.json.bak`、`flick-cleanup.json`）仍是 `MANIFEST_NOT_FILE`。
- **旧断言**：预计没有必须改的（第 7 行样例里的 `"project":"Water"` 是声明内容，不是界面文字，不改）。

## 3. 负控

| 负控 | 让什么失效 | 标记 |
|---|---|---|
| nc1 | `read_manifest` 又只认旧名字 | `MANIFEST_W11_NAMES` |
| nc2 | `FILE_NAMES` 两个名字顺序对调 | `MANIFEST_W11_NAMES` |

只改 `packages/cleanup-manifest/src/` 的生产代码一处 → `--mode red-ncN` → `git checkout -- <文件>` 恢复原字节 → 立即 `--mode test`。

## 4. 命令（在工作树根目录执行）

```powershell
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W11-N6 --mode baseline
```

之后反复用 `lock`、`check`、`test`、`real`，做完负控；提交干净实现后依次跑 `check --final`、`test --final`、`real --final`，再 `archive`。`real` 只读：工作树 `.git` 小文件三种状态的个数，仓库根的声明文件各读一次。

## 5. 预算与边界

- 白名单：`packages/cleanup-manifest/` 下的文件（不得改 `Cargo.toml` 的依赖与 `Cargo.lock`）；`docs/dispatch/reports/WATER-W11-N6-REPORT.md`；`docs/acceptance/wave11/n6/` 下 `--mode archive` 生成的证据。
- 原生窗口 0、选择框 0、浏览器 0；cargo 离线、单线程、私有 target。跑 cargo 前按进程名看一眼。
- 不 merge、不 rebase，不改台账、契约、检查器、其它包。
- 提交身份、远端与历史、回执编码照通用规则第 7 节。

## 6. 交回

回执第一行与通知完全一致：

```text
WATER-W11-N6 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w11-n6/docs/dispatch/reports/WATER-W11-N6-REPORT.md
```

回执照通用规则第 7 节第 4 条写，另外写真实冒烟在工作树里的输出。受阻则写“WATER-W11-N6 任务受阻”。交回后接着做 N7。
