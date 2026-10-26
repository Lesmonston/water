# 第四波派前回执（2026-10-26 晚）

总控（Claude）。G1 D 加固、G2 服务加固、G3 界面修补三张票 READY，可以各自在新对话里执行，与正在验收的 F3 并行。计划见 [PLAN](PLAN.md)，规则见 [W4 规则](../W4-HARDENING-WORKER-RULES.md)，登记见 [manifest](manifest.json)。

## 基点与冻结

- 基点 `0ca42f8e8038a5a7816802c5a7f175a966b0625c`，标签 `water-w4-hardening-base-20261026`。
  - 第一次基点 `dda1ca5` 冻结了三份契约、规则、计划与检查入口扩展。
  - 自测改了四处契约后，在 `0ca42f8e` 重定基点。标签在推送前移过去，6 个工作树都快进到这里。
- 波次级冻结 4 个：ADR-018、MODEL、IPC、W4 规则。每票另冻结自己的 SPEC 与被覆盖的原契约：
  - G1：CLEAN；
  - G2：SERVICE；
  - G3：UI、ui-fixtures 与设计稿三件。
- **哈希按执行者工作树计算**：本仓库 `core.autocrlf=true`，新工作树里文本是 CRLF，主检出里是 LF。第一次按主检出算错了，G3 自测的 baseline 因此报 tokens.css 不符，已改正，生成脚本里写了原因。
- 执行者树：
  - `.worktrees/w4-g1`、`w4-g2`、`w4-g3`；
  - 分支 `worker/water-w4-g1..g3`；
  - 都停在基点、干净；
  - 总控已在三棵树里各跑过一次派前 baseline，都通过。

## 不打扰 F3 的做法

- 第三波冻结的 SERVICE、IPC、ui-fixtures、第三波规则一个字没改，修改都写在 `contracts/hardening-v1/` 的新文件里逐条覆盖。
- `desktop-wave-check.mjs` 只加了一处：`WATER-W4-` 开头的票号读第四波清单。第三波票号的路径不变。改动时间晚于 sol 的三个 final。

## 检查入口的改动

`checkup-wave-check.mjs`（G1、G3 用）：
1. `WATER-W4-` 票号读第四波清单；自测、验收清单的覆盖也放开到 `WATER-W4-SELFTEST`、`WATER-W4-ACCEPT-`。
2. `outputRootExists`：baseline 要求已验收的目录存在且未改。
3. `forbidPatterns`：G1 的 `src/` 里不得出现 `std::fs`、`fs::`、`Path`、`PathBuf` 与路径式文件操作。
4. `allowedFfi`：逐个核对原生模块 `extern "system"` 块里声明的函数名，并记进回执。
5. `browserProofs`：G3 的 nc2、nc3 用浏览器测试证明。

`desktop-wave-check.mjs`（G2 用）：只有第四波清单的路由。

## 系统接口实测（G1）

派前用只依赖标准库的 Rust 小程序在本机实测了 G1 要用的全部系统接口，全部可行。结构体布局、常量与两处坑写进了 CLEAN-HARDENING 第 11 节：
- 联接不能带“非目录”选项打开；
- POSIX 删除要等关闭句柄后名字才消失。

非管理员令牌也能给夹具文件设自定义的非链接重解析标签，所以“非链接重解析点不删”能用测试打红。

## 自测

三棵自测树 `.worktrees/w4-selftest-g1..g3` 放了桩。桩只用来走通检查入口、证明测试写得出来，不是参考实现，执行者看不到。每棵树都按执行者的顺序走完：
1. 提交桩；
2. 三条负控逐条变红，恢复原字节后变绿；
3. 跑全部 final；
4. 归档。

| 票 | 负控（失败信息里的标记） | final | 要点 |
|---|---|---|---|
| G1 | `CLEAN_REPARSE_KIND`、`CLEAN_GUARD_ID`、`CLEAN_NO_FOLLOW` 都红，恢复后绿 | check、test，负控审计三条配对 | 见下 |
| G2 | `SERVICE_PANIC_IDLE`、`SERVICE_TRUST_BOUNDARY`、`SERVICE_PARTIAL_SOURCE` 都红，恢复后绿 | check、test、real | 见下 |
| G3 | `UI_LEVEL_GUARD`（单元测试）、`UI_FOOTER_WRAP` 与 `UI_NOTICE_SCOPE`（浏览器测试）都红，恢复后绿 | check、test、browser（23 张截图） | 见下 |

**G1**：
- 桩保留了现有的路径式代码，所以用另一个自测编号 G1B（不带路径规则）走完全程。
- 按 G1 的真实规则跑 check，被“Path-based file access (fs::) is not allowed”拒绝。
- 白名单里拿掉一个函数再跑，被“System function not allowed: SetFileInformationByHandle”拒绝。
- 测试里用 PowerShell 设自定义标签的做法，在检查器环境里可行。
- 用别名写的保护路径与硬守卫能按身份认出来。
- 只读文件按句柄删除后，经硬链接读回仍带只读属性。
- **发现现有 D 处理不了超过 260 个字符的路径**，已写进契约。

**G2**：
- 后台扫描线程里的 panic、命令里的 panic，测试都能稳定造出来。
- 改写磁盘上的计划文件不影响实际删除；重启后读回的扫描 prepare 返回 stale。
- 在受保护目录里放一个名字无法表示的文件，扫描为 partial，问题记在受保护组上，prepare 返回 stale；同样的文件放在推荐组里，prepare 正常。
- 非 ASCII 字母大小写可以当别名，能区分文本判断与规范路径判断。
- 存储整理：临时文件、计划与日志上限都可以测。
- `real --final` 只读冒烟：
  - 状态 completed，用时 72 秒；
  - 识别 46.5 GB，可放心清理 9.65 GB；
  - 清理请求返回 unavailable。

**G3**：
- 滚到底时操作坞与最后一行之间本来就有空隙，那条修复取消，改为回归锁定。
- 侧栏说明实测是 14 字加 1 字。改用 `text-wrap: balance` 后，侧栏与首页说明都不再有短孤行；`pretty` 对中文无效。
- 修复后，切到增长趋势时 M1 提示已消失，“重新连接”这类提示仍会保留。

### 自测里踩到的坑（已改正，记给验收）

- 冻结哈希要按执行者树计算（CRLF），见上文。
- 用脚本往 CRLF 文件里插 LF 行，提交时 Git 会统一换行，于是恢复后的字节与变异前不同，负控审计对不上。桩文件要先统一换行再提交。
- 测试里用 `unwrap_err()` 断言失败时，变异后 panic 的消息不含标记，负控会被检查器判无效。要用带标记的 `expect_err` 或 `assert!`。

### 证据

[docs/acceptance/wave4/controller/](../../acceptance/wave4/controller/)：
- `preflight/`：三棵执行者树的 baseline 回执；
- `selftest/`：G1B、G2、G3 的归档（各带逐文件哈希索引）、G1 真实规则被拒的回执；
- `selftest/scripts/`：流程脚本、自测清单与运行记录。

## 外贴句

三张票各在一个新对话里执行，可以同时贴出。

特殊票（D 加固：Rust 与 Windows NT 底层系统调用，建议选这方面能力强的模型）：

```text
你接手 Water 项目 WATER-W4-G1（清理执行器加固，重门）。先读 F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W4-G1-CLEAN-HARDENING-20261026.md，按其中列出的顺序读规则与契约，在 F:/new/smaltalk/water/.worktrees/w4-g1（分支 worker/water-w4-g1）从 0ca42f8 开工。
```

服务票（Rust）：

```text
你接手 Water 项目 WATER-W4-G2（服务加固）。先读 F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W4-G2-SERVICE-HARDENING-20261026.md，按其中列出的顺序读规则与契约，在 F:/new/smaltalk/water/.worktrees/w4-g2（分支 worker/water-w4-g2）从 0ca42f8 开工。
```

界面票（前端布局，建议选前端能力强的模型）：

```text
你接手 Water 项目 WATER-W4-G3（界面修补）。先读 F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W4-G3-UI-POLISH-20261026.md，按其中列出的顺序读规则与契约，在 F:/new/smaltalk/water/.worktrees/w4-g3（分支 worker/water-w4-g3）从 0ca42f8 开工。
```
