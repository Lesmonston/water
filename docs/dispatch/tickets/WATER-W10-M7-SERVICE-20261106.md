# WATER-W10-M7：服务：算结论、分两块清理、管隔离区与查重（中门，含只读真实冒烟）

2026-11-06，正式单，总控（Claude）。以[第十波 manifest](../wave10/manifest.json) 中本单 `status` 为准；READY 不代表已外贴。可以新开对话执行。

SERVICE-M35 写着“第二批，等 M1、M2、M3、M4、M8、M9 都验收合入后才派”。这六张现在都已合入主线（宿主 M5 也已合入），本单从合入后的主线开工。

| 项 | 精确值 |
|---|---|
| 权威单 | F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W10-M7-SERVICE-20261106.md |
| 唯一工作树 / 分支 | F:/new/smaltalk/water/.worktrees/w10-m7 / worker/water-w10-m7 |
| 精确首次 HEAD | b4b889a9412c47d8227c492eb76ef053fbd2b9c2（tag `water-w10-m7-base-20261106`），必须干净 |
| SPEC | F:/new/smaltalk/water/contracts/m35-v1/SERVICE-M35.md（全文），以及本单第 2 节的总控补充（冲突时以本单为准） |
| 接口形状 | F:/new/smaltalk/water/contracts/m35-v1/IPC-M35.md |
| 要用的包与它们的契约 | 规则 `packages/junk-rules`（RULES-M35）、扫描 `packages/junk-scan`（SCAN-M35）、项目声明 `packages/cleanup-manifest`（MANIFEST-M35）、执行器与隔离区 `packages/junk-clean`（CLEAN-M35）、查重 `packages/dup-finder`（DUP-M35）、已安装程序 `packages/installed-apps`（APPS-M35）；契约都在 F:/new/smaltalk/water/contracts/m35-v1/ |
| 仍然有效、要读的 | F:/new/smaltalk/water/contracts/desktop-v1/SERVICE.md；F:/new/smaltalk/water/contracts/hardening-v1/SERVICE-HARDENING.md；F:/new/smaltalk/water/contracts/m3c-v1/SERVICE-M3C.md 与 SERVICE-M3C-ADD-01.md；F:/new/smaltalk/water/contracts/m3d-v1/SERVICE-M3D.md；F:/new/smaltalk/water/contracts/m3c-v1/IPC-M3C.md；F:/new/smaltalk/water/contracts/checkup-v1/IPC.md；F:/new/smaltalk/water/docs/decisions/ADR-019-project-declarations-and-quarantine.md；F:/new/smaltalk/water/docs/design/water-ui-v2/DESIGN.md 第 3～6 节 |
| 工作规则 | F:/new/smaltalk/water/docs/dispatch/W10-M35-WORKER-RULES.md |
| 检查入口 | F:/new/smaltalk/water/scripts/desktop-wave-check.mjs |
| 回执 | F:/new/smaltalk/water/.worktrees/w10-m7/docs/dispatch/reports/WATER-W10-M7-REPORT.md |
| 证据目录 | F:/new/smaltalk/water/.worktrees/w10-m7/docs/acceptance/wave10/m7/ |
| 门 | 中门：3 条负控 + check、test、real 三个 final（real 只读，清理关闭） |

先读：
1. 工作规则与 SPEC 全文，本单第 2 节；
2. IPC-M35 全文，以及上表“仍然有效”的契约；[第十波计划](../wave10/PLAN.md)第 2 节（来由）；
3. 六个包的契约与公开接口：各包 `src/lib.rs` 里 `pub` 的函数与类型。实际签名与契约有出入时以代码为准，回执写明；
4. 服务代码：`packages/water-service/src/` 全部、`tests/service_v1.rs`、`examples/service_smoke.rs`、`Cargo.toml`、`README.md`。

## 1. 要做的（只改 `packages/water-service/`）

照 SPEC 第 1～10 节逐节实现：
- `Platform` 新方法；
- 设置第三版；
- 体检的范围、计划、扫描后补充与进度；
- 结论视图（卡片、汇总行、线索、收起行、版本与过期）；
- 两块清理与隔离记录；
- 隔离区；
- 查重；
- 设置命令；
- 趋势与增长。

IPC-M35 第 1 节列出的 16 条新命令都由服务实现（`quarantine_reveal` 由宿主实现，服务只提供内部命令 `quarantine_locate`）。

## 2. 总控补充（SPEC 没写或写得不够，必须照做）

这几条来自前几张单验收时记下的遗留，都是往安全方向收紧。

1. **调 `protects` 与 `read_git_link` 前统一路径写法**。项目声明包只认 `X:\…` 这种本地盘路径。路径开头是 `\\?\X:\` 的，先去掉 `\\?\` 再传；去掉后仍不是 `X:\…`（如 UNC、`\\?\UNC\`、设备路径）的条目，**改为不可清**，原因“路径格式无法核对项目声明”。
2. **清理条目不能包住项目声明的目录**。条目路径等于或是某个声明目录（本次扫描找到的任何一个 `.water-cleanup.json` 所在目录，不论信任与否、有效与否）的上级时，`protects` 按契约返回 None，但整块清会把整个项目一起清掉。这种条目**改为不可清**，原因“里面有项目的声明文件，不能整块清理”。
3. **`collected_at` 换成 RFC 3339**。已安装程序列表的 `collected_at` 是 Unix 秒数的字符串（早于 1970 年时带负号）。服务存、显示或传给界面时，一律换成与其它时间相同的 RFC 3339 UTC 写法；解析不了就当作没有（null），不报错。
4. **“已卸载”不能只凭一次查找**。已安装程序包的 `name_tokens` 会把汉字与紧挨着的字母、数字粘成一个词，所以已经装着的“腾讯QQ”，用 `find(list, &name_tokens("QQ"))` 查不到。SPEC 第 4.2 节第 2 条“查不到”之前，再做一次宽松核对：把每个已安装程序的显示名与规则的 `installed_names` 都转成小写、去掉空格；任何一个显示名**包含**任何一个名称，就按“还装着”处理（整组不可清，“<名称> 还装着，这是它的数据”）。两次都查不到，卡片才可以写“似乎已卸载”。
5. **执行器写日志失败时不报成功**。执行器在移动或永久删除之后写日志失败时，会返回错误并丢掉整份报告，服务无法知道到底动了哪些。这时：
   - 这次清理或永久删除的结果按失败报，`message_zh` 写“文件已经动过，但记录没有写成功，请到隔离区核对”；
   - 隔离区视图照 SPEC 第 7 节从磁盘重新核对，不用丢掉的报告去猜；
   - 不重试移动。
6. **SERVICE-M35-ADD-01 不做**。它原本给冰山画面按比例画用（每个盘里各级别、各分类的字节数）。冰山画面已经放弃，界面单 M6 规定只画接口已有的数。IPC-M35 不加字段，服务不加这份数据。

**这几条的测试**放进 SPEC 第 11 节指定的测试里，不新增测试函数：
- 第 1、2、4 条放进 `m35_scope_and_plan`，失败信息带 `SERVICE_M35_SCOPE`。至少包括：
  - `\\?\` 开头的条目能被声明保护；
  - 非本地盘写法的条目不可清；
  - 声明目录的上级条目不可清；
  - 装着“腾讯QQ”时，`installed_names` 为“QQ”的组不可清；
- 第 3 条放进 `m35_scope_and_plan` 或 `m35_trends_history`，核对一个正数、一个负数与一个坏值；
- 第 5 条放进 `m35_clean_split` 或 `m35_quarantine`，用假平台或假执行器的写日志失败来触发，失败信息带对应标记。

## 3. 白名单

- `packages/water-service/` 下的文件
- `docs/dispatch/reports/WATER-W10-M7-REPORT.md`
- `docs/acceptance/wave10/m7/` 下 `--mode archive` 生成的证据

## 4. 依赖与系统函数

- `Cargo.toml` 只加三个 path 依赖：`water-cleanup-manifest = { path = "../cleanup-manifest" }`、`water-dup-finder = { path = "../dup-finder" }`、`water-installed-apps = { path = "../installed-apps" }`。检查器按清单逐项核对，多一个少一个都不过。不加别的依赖，不加 feature。
- 新增的系统函数只有 `SHQueryRecycleBinW`（只读），放在 `src/native_windows.rs` 现有的 `extern "system"` 块里。不得新增别的系统函数，不得起进程，不得联网。

## 5. 测试

- `packages/water-service/tests/service_v1.rs` 精确 12 个测试：
  - 原有 6 个：`service_ipc_contract`、`service_scan_views`、`service_clean_flow`、`service_trends_locations`、`service_storage_safety`、`service_hardening`；
  - 新增 6 个：`m35_scope_and_plan`、`m35_conclusion_cards`、`m35_rows_and_detail`、`m35_clean_split`、`m35_quarantine`、`m35_trends_history`。
- 标记：`SERVICE_M35_SCOPE`、`SERVICE_M35_CONCLUSION`、`SERVICE_M35_ROWS`、`SERVICE_M35_CLEAN`、`SERVICE_M35_QUARANTINE`、`SERVICE_M35_TRENDS`。
- 原有断言只能改 SPEC 第 11 节获准的四类，回执逐条写原值与新值。
- 隔离根、查重与声明夹具都放在本树 `.local/` 下；测试不得写到任何真实盘根。夹具照工作规则第 3 节：用完只删本次新建的那一个目录。
- 测试对时间敏感时，照前几张服务单的教训：不要依赖机器快慢，回执写明怎么避免的。

## 6. 负控

| 负控 | 让什么失效（SPEC 第 12 节的例子，可选更窄的一处） | 标记 |
|---|---|---|
| nc1 | “你选的”一块也用 `execute`（删而不移） | `SERVICE_M35_CLEAN` |
| nc2 | 卡片不限 5 张 | `SERVICE_M35_CONCLUSION` |
| nc3 | 不信任的声明也转成目标 | `SERVICE_M35_SCOPE` |

只改 `packages/water-service/src/` 的生产代码一处，跑 `--mode red-ncN`，用 `git checkout` 恢复原字节，立即跑 `--mode test`。要找只有新断言才抓得到的位置。

## 7. 命令（在工作树根目录执行）

```powershell
node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W10-M7 --mode baseline
```

之后反复用 `lock`、`check`、`test`，做完负控；提交干净实现后依次跑 `check --final`、`test --final`、`real --final`，再 `archive`。

**真实冒烟**（`real`）：SPEC 第 12 节，只读体检常用位置，取一次结论视图与 `quarantine_list`，清理关闭，只输出计数，不输出路径与名字。

## 8. 预算与边界

- 原生窗口 0、选择框 0、浏览器 0。
- cargo 离线、单线程、私有 target，不下载；不需要联网查资料。
- 真实数据只读元数据；不清理、不移动、不删除任何真实文件；测试里的隔离根永远在本树 `.local/` 下。
- 不 merge、不 rebase，不改台账、契约、检查器、其它包（六个依赖包有问题时在回执里写，不要去改它们）。
- 提交身份照工作规则第 5 节：只在提交命令的进程里设，用你自己的名字，不借用人类作者身份。
- **远端与历史**：不 push 到任何远端，不添加或修改 git 远端与配置；不改写已有提交（不 amend、reset、squash 或任何强制操作），只在首次 HEAD 之后新增提交；提交信息写错就在回执里说明，不要改写。

## 9. 交回

回执第一行与通知完全一致：

```text
WATER-W10-M7 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w10-m7/docs/dispatch/reports/WATER-W10-M7-REPORT.md
```

回执要写：
- 实际模型、实现提交 SHA；
- SPEC 逐节与本单第 2 节逐条：改了哪里、怎么满足；
- 六个包的实际接口与契约不一致的地方；
- 改过的旧断言（原值与新值）；
- 每个检查命令与结果；
- 负控：改了哪一处、失败信息、恢复后的哈希；
- 真实冒烟的计数；
- 没做或没验证的事。

受阻则写“WATER-W10-M7 任务受阻”，写清冲突与最小补充需求，不要自行变通。
