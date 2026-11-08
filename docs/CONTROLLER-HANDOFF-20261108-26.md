# Water 总控交接报告（2026-11-08 第 26 份）

2026-11-08 19:55 JST，总控（Claude）。上一份是[第 25 份](CONTROLLER-HANDOFF-20261108-25.md)（11-08 02:00）。产品名 **Flick**；代码、仓库、包名仍叫 water。

## 0. 一句话现状

- **GitHub 账号改名**：`dfan0519-tech` 改成了 `Lesmonston`（同一账号 id 293710681）。
  - 私有仓库是 `Lesmonston/water`，`origin` 已改；
  - 公开仓库 `Lesmonston/flick` 被用户删掉后，总控重建了**空的**，私下报告漏洞已打开；
  - **英文界面做完前不推**。
- **第十四波进行中**（英文界面与语言切换、真实体检进度、主页面一屏放下、第十三波遗留）：
  - R1 规则英文、J1 扫描已验收合入；
  - U1 界面功能通过，补单 01 已派给 astra；
  - S1 服务正在做（用户派重了一次，停了一个，见第 2 节）；
  - H1 宿主与安装包还没出单，要以 S1 交回的提交为底。
- 本机已用 0.1.0 Beta 安装包装好 Flick，桌面有快捷方式。

## 1. 这一段做了什么（第 25 份之后）

| 时间（JST） | 事 | 提交 |
|---|---|---|
| 02:00～13:30 | 推特小视频；第十三波收单与合入；第十一次整合；措辞收拾；发布前七项决定与 v0.1.0 Beta 准备（真装、搬家、许可证原文） | 到 `d9d902e0`，见 STATUS 第 104～108 条 |
| 15:35～16:40 | 用户“可以推送公开仓库了”。第一次推送后 CI 6/13 没过（根 Cargo 文件没导出、测试默认 F 盘、测试目录重名），总控直接改。新增 `scripts/release/ci-local.mjs`，在 E 盘本地跑通。账号改名后 CI 被写死的旧名字跳过，用户定“旧地址都换、重做成一个提交”。重编 release、重打安装包、验关于页，强推 `c261e4ef`，CI 全绿 | `c60e89c1`、`5b1792b1`、`45294836`、`b7d09826`（STATUS 109） |
| 16:38 | 用户“发预发布”：v0.1.0-beta 发了 | `de1e7ae1`（STATUS 110） |
| 16:40～17:00 | 用户“打开软件吧……桌面快捷方式，遗留的三项都处理一下”：装好、建快捷方式并打开，删旧 Actions 记录。`E:\flick-ci` 删除被保护规则拦下，留给用户删。用户随后删掉公开仓库（预发布一起没了），总控重建空仓库 | `78b26865`（STATUS 111） |
| 17:00～17:40 | 用户看装好的软件提了三条（一屏放下、99% 卡住没有下一步、去掉“每秒一根”换方块图）。查明 99% 的原因：整盘“空间分布”遍历没有进度。普查中文来源，用户定语言四项。第十四波计划、契约 W14、R1/J1/U1 三张单、清单、基线全过；检查器加认 `WATER-W14-` | `d692bd60`、`792642b5`（STATUS 112） |
| 17:40 | 派单：R1 sol，J1、U1 astra；J1 问“看见并跳过”计数的数据来源，总控答复“独立只读验证” | `c574cdd8`、`e0de84b4` |
| 19:20～19:40 | 收活：R1 轻门、J1 中门通过并合入；U1 新验收树全过，但独立审查与截图发现单复数等问题，出补单 01；S1 出单（底 `5f6ff198`） | `3693a6b2`、`985222a0`、`5f6ff198`、`5ffafe9c`（STATUS 113） |
| 19:50 | S1 一个会话报受阻（同一工作树有别的写入者）。用户：“派重了，我停了一个，你不用管了。” | `d42724bb` |

细节：
- [发布准备](launch/RELEASE-v0.1.0-beta.md)第 3～5 节（推送记录、以后每次推送的步骤）；
- [第十四波计划](dispatch/wave14/PLAN.md)、[契约 W14](../contracts/w14-v1/W14.md)、[清单](dispatch/wave14/manifest.json)；
- [第十四波验收（第一批）](acceptance/wave14/controller/WATER-W14-REVIEW-20261108.md)；
- [状态页](STATUS.md)第 109～113 条。

## 2. 用户这一段的要求与决定（原话）

- “可以推送公开仓库了。需要我做什么嘛？”
- CI 不过：“总控直接改”。
- “我刚改了ID，lesmonstons是原仓库”；旧地址“都换”；公开仓库“重做成一个提交”。
- “发预发布”。
- “打开软件吧。我看一眼。帮我创建桌面快捷方式，遗留的三项都处理一下。”
- 第十三波遗留“全部出第十四波工单”。
- “旧仓库已经删掉了，然后这一轮还需要做英文界面，做语言切换。做完了再提交，你可以先去建新的仓库。”
- 语言四项：第一次打开**跟随系统**；英文覆盖**全部**；线索复制**跟界面语言**；界面改动**直接派单**。
- 看了装好的 Beta：
  - “想办法把主页面排版固定到一页，主页面尽量不要做下拉才能看到的信息”；
  - 进度“显示已完成，但是进度还是99%，也没有下一步的指引”；
  - “每秒一根这样的表述太多余了……换成之前给你看过的带颜色的方块”。
- 派单：“第一单是sol，另外两单是astra”。
- “收活”。
- S1：“派重了，我停了一个，你不用管了。”

## 3. 下一步（按顺序）

1. **等回执**（用户报派单只记账）：
   - **S1**：中门。照第一批的做法：
     - 用第十四波清单跑 `w3-receipt-audit.mjs`；
     - `.local/w14-accept/make-manifest.mjs` 加 s1；
     - 新验收树重放负控，总控变异三条。建议：漏一个 `_en`、空间统计字节回到 `found_bytes`、`percent` 在空间阶段回退；
     - 只读子代理独立审查；
     - 注意：S1 分支上有一个停掉的会话留下的受阻回执提交 `414d42bf`，另一个会话在其上继续，交回的回执会覆盖它。
   - **U1 补单 01**：轻门。审计（`w2-receipt-audit.mjs`）、回执、截图（56 张全部重拍）。看单复数、方块图不截断、第一屏不闪语言。清单里 U1 的负控已换成补单的 `UI_W14_PLURAL`、`UI_W14_PROGRESS`，`browserProofs` 只有 nc2。
2. **H1 宿主与安装包**：S1 验收通过后出单，以 S1 交回的提交为底（新工作树 `w14-h1`，基于 S1 的 HEAD）。
   - 范围：W14 第 4 节，即 `app_info.system_language`、`IpcFailure.message_en`、宿主几条错误的英文、`HostPicker::pick` 两处 `IpcError` 补 `message_en`、安装包中英双语；
   - 宿主检查照第十二波 P3（`desktop-wave-check` 的 host kind，`expectedConfig` 要带上 `bundle.copyright`）；
   - S1 与 H1 一起合入；S1 单独合入时宿主编译不过，这是预期的。
3. **合入顺序**：U1（补完）→ S1 + H1。合入后主线跑一遍服务、宿主测试与界面测试。
4. **第十二次整合**（PLAN 第 5 节）：
   - 真宿主下中英两种语言走一遍主要页面；整盘体检的进度阶段；一屏放下（两种窗口）；显卡缓存可清量；安装包两种语言。
   - 开窗前告诉用户。可以给用户看真软件后再定 U1 的打磨项。
5. **之后**：
   - 导出，扫描 0 个错误；
   - 把导出的树复制到 F 盘以外，跑 `node scripts/release/ci-local.mjs <tree>`，全过；
   - **问用户**后推空的 `Lesmonston/flick`（新的干净副本、Deford 新邮箱、一个提交），重新发布（版本与标签再问）。

## 4. 现在可以并行的

没有。S1 与 U1 补单在外面做；等回执，不要自己找活跑测试。

## 5. 这一段的教训

- **推公开仓库前要在 F 盘以外真编译测试一遍导出的树**：第一次推送 CI 6/13 没过，全是本机看不出的问题（根 workspace 没导出、测试默认 F 盘）。现在有 `ci-local.mjs` 与[发布准备](launch/RELEASE-v0.1.0-beta.md)第 4 节。
- **CI 条件不要写死账号名**：用户改名后 CI 全部跳过。现在看仓库是否私有。
- **复制脚本改路径要核对**：sed 没改到日志路径（那一行以 `T=` 开头），覆盖了第十一次整合的编译日志，从提交的证据恢复了。
- **界面检查器要求 `tokens.css` 与设计稿逐字节一致**：写界面单前先看检查器的约束，不要在契约里让执行者加 token。
- **Git Bash 删除要用字面路径**：`rm -r "$A/$d"` 被安全检查拦下，改成字面绝对路径才行。`cmd /c rd` 删 `E:\flick-ci` 被运行环境整体拦下，不能绕过，留给用户。
- **工作区混合换行会让审计报 final 哈希不符**：去掉回车后与提交相同的，在新检出的验收树重跑 final 即可确认。

## 6. 现场

- **主线**：`d42724bb`。GitHub 私有仓库（`Lesmonston/water`）、本机中央仓库、E 盘镜像一致。公开仓库 `Lesmonston/flick` 是空的，不是远端。
- **工作树**：
  - `.worktrees/w14-s1`：S1 进行中，分支 `worker/water-w14-s1`，底 `5f6ff198`；有受阻回执提交 `414d42bf` 与另一会话未提交的改动。**不要动**。
  - `.worktrees/w14-u1`：U1 补单 01 进行中，从 `ded24001` 续做。
  - `.worktrees/w14-r1`、`w14-j1`：已合入，可留着。
  - `.worktrees/accept-w14-j1`、`accept-w14-u1`：第一批验收树（分支 `controller/accept-w14-*`）。U1 补单交回后可新建 `accept-w14-u1b` 或在旧树检出新 HEAD。
  - `.worktrees/integ-w8b`：在 `controller/release-b`（`45294836`），用来编 release。
- **工具**：
  - `.local/w14-accept/`：第十四波验收（`run.sh`、`seq.sh`、`make-manifest.mjs`、`nc-replay.py`、`controls.mjs`、`add-mutations-j1.py`、`mutations.json`）。副本在 `docs/acceptance/wave14/controller/accept-kit/`。
  - `docs/dispatch/wave14/make-manifest.mjs`、`add-s1.mjs`：清单生成。H1 照 `add-s1.mjs` 写一个 `add-h1.mjs`，从第十二波 P3 的宿主条目克隆。
  - `scripts/release/export-public.mjs`：导出与扫描，旧账号名 `dfan0519` 是错误。
  - `scripts/release/ci-local.mjs`：本地跑 CI。环境：`PATH` 前加 `C:/Users/37310/.rustup/toolchains/1.95.0-x86_64-pc-windows-msvc/bin`，`CARGO_HOME=F:/new/smaltalk/water/.local/w13-release/about-home`，`CARGO_NET_OFFLINE=true`。
  - `.local/w13-release/build-release.sh`：在 `integ-w8b` 编 release，日志在 `.local/w13-release/`。
  - `.local/w13-release/observe-about.ps1`：用临时数据目录开 exe 看关于页。
- **release**：`.local/release/flick-0.1.0-45294836/`（新地址；安装包 `b35889bc…`、zip `7d7fb3d0…`）。英文界面合入后要重编重打。
- **本机**：
  - Flick 0.1.0 Beta 装在 `%LOCALAPPDATA%\Programs\Flick`，桌面 `Flick.lnk`，数据在 `%LOCALAPPDATA%\Flick`；
  - 旧 Water 数据备份在 `.local/water-data-backup-20261108/`；
  - `E:\flick-ci`（7.9 GB）等用户自己删。
- **用户方面**：S1（sol 一类）与 U1 补单（astra）在外面做；没有后台任务；没有待用户回复的问题。

## 7. 粘贴语

```text
交接里写了（F:/new/smaltalk/water/docs/CONTROLLER-HANDOFF-20261108-26.md）：读交接报告，准备接手 Water 总控，从第 3 节第 1 条（等 S1 与 U1 补单 01 的回执）继续。
```
