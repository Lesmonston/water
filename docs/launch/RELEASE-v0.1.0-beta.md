# v0.1.0 Beta 发布准备（2026-11-08）

用户 11-08 定的（[整体计划](../PLAN-OPEN-SOURCE-20261107.md)第 7 节）：今天**都先不推**，只把东西准备好；版本标 Beta。推送和发布那天照下面做，每一步对外操作前都先问用户。

## 1. 已准备好的

| 项 | 内容 |
|---|---|
| 受测提交 | `7968f03c`（私有仓库）：第十三波、第十一次整合、措辞收拾之后，加上 exe 版权字段、第三方许可证原文与 Beta 文件名 |
| release | `.local/release/flick-0.1.0-7968f03c/flick.exe`，sha256 `79e1b3df57007a3c8b2042f38659ea4098acfd61b964c1062f0f1ddd89a59e6c`，14,175,744 字节；版权字段 “Copyright (c) 2026 Flick contributors” |
| 安装包 | `Flick-Setup-0.1.0-beta.exe`，sha256 `1462e330225e9e0085d38108074e56d4a767b524a8b6953bd1de3c8d2811c14f` |
| 便携 zip | `flick-0.1.0-beta-windows-x64.zip`（`flick.exe` 加三份许可证文件），sha256 `03d005e7a516f672d8f5b780bff7e812cd12e25a9ba655fb00a9e01e0fa0b976` |
| 第三方许可证 | `THIRD-PARTY-LICENSES.md`，cargo-about 0.9.3 离线生成，217 个包及其许可证原文；与 release 实际编译的依赖逐个对上 |
| 公开树 | `.local/public-export/release-7968f03c-b/tree/`：192 个文件，3.6 MB；导出扫描 0 个错误，117 条提醒只剩测试里的占位用户名与通用的 `.worktrees` 目录名 |

## 2. 本机真装（11-08 已做）

1. 先把旧数据目录 `%LOCALAPPDATA%\Water` 原样复制到 `.local/water-data-backup-20261108/Water`（330 个文件，名字、大小与体检记录的哈希都一致）。
2. 静默安装：程序进 `%LOCALAPPDATA%\Programs\Flick`（`flick.exe`、三份许可证、卸载程序），开始菜单有快捷方式，“应用”里有 Flick 0.1.0 与项目地址。
3. 像开始菜单那样启动（不设数据目录），14 步全过：
   - 第一次启动把 `Water` 搬成 `Flick`。体检、清理、日志、计划、快照与备份逐字节一致，设置从 v2 升到 v4，加过的文件夹还在；
   - “记录”页显示 10-26 到 11-02 的旧记录；
   - 关于页：Flick 0.1.0、许可证 MIT OR Apache-2.0、项目地址；
   - “复制诊断信息”真的进了剪贴板，内容只有计数与版本，没有路径或用户名。
4. 静默卸载：程序目录、快捷方式、卸载项都没了；数据目录 `%LOCALAPPDATA%\Flick` 保留。

## 3. 推送与发布那天（每步先问）

1. 用受测提交重新导出一次，扫描 0 个错误，把清单给用户看。
2. 在导出的 `tree/` 里建仓库、做第一个提交：身份 `Deford <293710681+dfan0519-tech@users.noreply.github.com>`，没有历史。
3. 推到 `dfan0519-tech/flick` 的 `main`（它不是工作仓库的远端，用一次性的地址推）。
4. 等 GitHub Actions 的 Windows CI 跑通（格式、clippy、测试）。不通就先修，不发布。
5. 用 `gh` 打开私下报告漏洞（用户已同意）。
6. 建标签 `v0.1.0-beta`，在 GitHub Releases 发预发布 “Flick 0.1.0 Beta”，传安装包、zip 与 `SHA256SUMS.txt`。如果推送时代码比 `7968f03c` 新，就重打这三个文件。

## 4. 发布说明草稿

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
