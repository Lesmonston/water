# v0.1.0 Beta 发布准备（2026-11-08）

用户 11-08 上午定的（[整体计划](../PLAN-OPEN-SOURCE-20261107.md)第 7 节）：先只准备，不推；版本标 Beta。下午用户说“可以推送公开仓库了”：公开仓库 [Lesmonston/flick](https://github.com/Lesmonston/flick) 已推送，GitHub CI 全过（第 3 节）。**预发布还没发**（标签、安装包与 zip），发之前先问用户（第 5 节）。

## 1. 已准备好的

| 项 | 内容 |
|---|---|
| 受测提交 | `45294836`（私有仓库）：在 `7968f03c`（第十三波、第十一次整合、措辞收拾、exe 版权字段、第三方许可证原文、Beta 文件名）之上，加公开 CI 修复（`c60e89c1`、`5b1792b1`）与账号改名后的项目地址（`45294836`） |
| release | `.local/release/flick-0.1.0-45294836/flick.exe`，sha256 `037bf64bf305a55e82fcc42fe3074418b3ddc132829c3e5f3b1ea57324ef0d53`，14,175,744 字节；版权字段 “Copyright (c) 2026 Flick contributors”；关于页项目地址 `https://github.com/Lesmonston/flick` |
| 安装包 | `Flick-Setup-0.1.0-beta.exe`，sha256 `b35889bce9d43e26f987ceb362d24ebb4de0d308516a4ba3f40f71d50c8fd55c`，3,083,564 字节 |
| 便携 zip | `flick-0.1.0-beta-windows-x64.zip`（`flick.exe` 加三份许可证文件），sha256 `7d7fb3d0111401ff422ef6cce9b1248ab30bb15e988bb45f7bcbacdd609aa398`，4,558,185 字节 |
| 第三方许可证 | `THIRD-PARTY-LICENSES.md`，cargo-about 0.9.3 离线生成，217 个包及其许可证原文；与 release 实际编译的依赖逐个对上 |
| 公开仓库 | `Lesmonston/flick` 的 `main` = `c261e4ef`：一个提交，194 个文件，与 `45294836` 的源文件逐字节一致；GitHub CI 13 个任务全过 |

三样发布文件在 `.local/release/flick-0.1.0-45294836/dist/`（含 `SHA256SUMS.txt`）。`7968f03c` 那一套还写着旧账号的地址，作废。

## 2. 本机真装（11-08 上午，`7968f03c`）

1. 先把旧数据目录 `%LOCALAPPDATA%\Water` 原样复制到 `.local/water-data-backup-20261108/Water`（330 个文件，名字、大小与体检记录的哈希都一致）。
2. 静默安装：程序进 `%LOCALAPPDATA%\Programs\Flick`（`flick.exe`、三份许可证、卸载程序），开始菜单有快捷方式，“应用”里有 Flick 0.1.0 与项目地址。
3. 像开始菜单那样启动（不设数据目录），14 步全过：
   - 第一次启动把 `Water` 搬成 `Flick`。体检、清理、日志、计划、快照与备份逐字节一致，设置从 v2 升到 v4，加过的文件夹还在；
   - “记录”页显示 10-26 到 11-02 的旧记录；
   - 关于页：Flick 0.1.0、许可证 MIT OR Apache-2.0、项目地址；
   - “复制诊断信息”真的进了剪贴板，内容只有计数与版本，没有路径或用户名。
4. 静默卸载：程序目录、快捷方式、卸载项都没了；数据目录 `%LOCALAPPDATA%\Flick` 保留。

`45294836` 相对 `7968f03c` 只改了项目地址与测试，没有再真装：用新 exe 配一个临时数据目录启动，关于页显示 `项目地址 https://github.com/Lesmonston/flick`，窗口正常退出，没有残留的 WebView 进程（证据见第 3 节的目录）。

## 3. 公开仓库推送记录（11-08 下午）

证据：[public-push-20261108](../acceptance/wave13/controller/public-push-20261108/)。

1. 用户：“可以推送公开仓库了。需要我做什么嘛？”从 `d9d902e0` 重新导出（192 个文件，0 个错误，与上午审过的导出逐文件相同），另做一遍独立隐私检查，第一次推送 `0b74f2e5`（身份 Deford）。私下报告漏洞用 `gh` 打开。
2. CI 第一次 13 个任务 6 个没过：
   - 导出漏了根目录的 `Cargo.toml` 与 `Cargo.lock`。`crates/water-contracts` 从根 workspace 继承版本等设置，依赖它的 4 个任务在 `cargo metadata` 就停了；
   - water-service 有 3 个测试默认检出位置在 F 盘，GitHub 的机器放在 D 盘；
   - process-scan 两个测试读到同一个时钟值，临时目录重名。

   用户选“总控直接改”。
3. 修复（`c60e89c1`、`5b1792b1`）：
   - 导出带上根 workspace，有包继承了没导出的 workspace 时导出直接失败；
   - 测试改用检出位置的盘符（`fixture_drive()`），token 加进程内计数；
   - `skip_unit_add` 和 `skip_add` 一样会同步写盘，归入 200 ms 那一档；
   - `actions/checkout` 升到 v5；
   - 新增 `scripts/release/ci-local.mjs`：在别的盘上按 CI 的步骤跑一遍导出的代码。E 盘跑出了全部问题，修完 38 步全过，只有耗时检查重跑过（规则允许）。
4. 修复提交 `906d1e4` 推上去后 CI 全部“跳过”：用户刚把 GitHub 账号 `dfan0519-tech` 改名为 `Lesmonston`（“我刚改了ID，lesmonstons是原仓库”），而工作流写死了只在 `dfan0519-tech/flick` 里运行。用户又定了两条：
   - 旧地址都换成 `Lesmonston/flick`：CI、README、issue 模板、关于页、安装包卸载项。CI 条件改成“仓库不是私有的才运行”，账号再改名也不会关掉 CI；导出扫描遇到旧账号名直接报错；
   - 公开仓库重做成一个用新邮箱的提交。

   随后在 `45294836` 上重编 release、重打安装包与 zip，并用新 exe 验了关于页。
5. 用 `--force-with-lease` 强推 `c261e4ef`（作者与提交者都是 `Deford <293710681+Lesmonston@users.noreply.github.com>`），覆盖 `0b74f2e5` 与 `906d1e4`。CI 13 个任务全过（run 42458613316，约 5 分钟）。

旧的两个提交已不在任何分支上，但知道哈希的人仍可能在 GitHub 打开它们，直到 GitHub 自己清理；Actions 里也还留着它们的两次运行记录。私有仓库的 `origin` 已改成 `https://github.com/Lesmonston/water.git`。

## 4. 以后每次推公开仓库

1. `node scripts/release/export-public.mjs --commit <rev>`：0 个错误，提醒逐条看过。
2. 把导出的 `tree/` 复制到 F 盘以外（GitHub 的机器在 D 盘），跑 `node scripts/release/ci-local.mjs <tree>`。全过才往下走；只有耗时的失败可以重跑。
3. 在 `.local/public-repo/flick-v2` 里提交，身份 `Deford <293710681+Lesmonston@users.noreply.github.com>`。核对每个文件都与私有提交里的源文件逐字节一致。
4. 用户同意后推送，等 GitHub CI 全绿。

## 5. 发布（还没做，先问用户）

建标签 `v0.1.0-beta`（指向 `c261e4ef`），在 GitHub Releases 发预发布 “Flick 0.1.0 Beta”，上传 `.local/release/flick-0.1.0-45294836/dist/` 里的安装包、zip 与 `SHA256SUMS.txt`。如果发布时公开仓库的代码比 `c261e4ef` 新，就重打这三个文件。

## 6. 发布说明草稿

**Flick 0.1.0 Beta**

做了个清理磁盘的小工具，叫 Flick，还在调。

写代码的电脑满得快，大头往往是：AI 编程工具的旧版本和升级残留、npm/pip/cargo 的缓存、项目里的 `target` 和很久没动的 `node_modules`、测试用的浏览器配置，还有一直在长、没人收拾的临时目录。

- 先只读体检，再给结论：能放心清的、要你看一眼的、不碰的，分开说。
- 清掉的先进隔离区，随时还原；一直在长的目录会给一段线索，可以交给 agent 查根因。
- 不碰登录信息与 Cookies、你的源码；AI 工具的会话记录默认不清。

注意：
- 只有 Windows（x64），界面只有中文。
- 需要 Microsoft Edge WebView2 运行库（Windows 11 自带）。
- 没有代码签名，第一次运行 Windows 可能提示 SmartScreen：点“更多信息 → 仍要运行”。
- 用 `SHA256SUMS.txt` 核对下载的文件：`sha256sum -c SHA256SUMS.txt`。
- 这是 Beta：遇到问题请在设置 → 关于与隐私里“复制诊断信息”，贴进 issue。

A small disk cleanup tool for Windows, still in beta. Read-only checkup first, then a conclusion; cleaned items go to a quarantine you can restore from. Windows x64 only, Chinese UI only for now, unsigned (SmartScreen may warn).
