# 真实 AA→AD 联合验收计划

2026-10-26，总控执行。冻结于运行之前；不是任何执行者的权限扩展，也不改产品代码。

## 目的

AD 已在冻结回放上验收（[AD/AE 验收](WATER-W1-ADAE-REVIEW-20261024.md)）。本次补上回放替代不了的一段：真实固定 AA 宿主经原生目录选择、R/Z 读取，流入 AB 传输层，再进入 AD 同源项目报告页，并从报告页用鼠标下载元数据和结构证据原字节。

## 现场

- 候选树：`F:/new/smaltalk/water/.worktrees/integration-aaad-20261026`，分支 `controller/water-w1-aaad-joint-20261026`，起点为主线 `1d02a6a7206ea01a23f4c9095a47ec7c6103936f`，不合并任何分支。
- 运行前核对：`prototypes/project-workspace` 与 AD 受测实现 `3ad5e70` 字节一致；`packages/project-session` 源码及锁与 AA 受测实现 `b3a874d` 一致；`packages`、`prototypes`、`crates`、`tools` 自 AD/AE 集成 `5b4d77c` 起无改动。
- AA 固定程序在候选树内离线构建：Rust 1.95.0、jobs1、私有 Cargo home/target/tmp，缓存来源沿用 AA 任务登记的 `cargoCacheSource`。不下载、不改网络或全局 Cargo 配置。
- 只用冻结工厂在候选树 `.local/root-marker-fixtures` 创建并核验合成夹具，系统选择只确认 `batch-v1/good` 或取消。不读真实用户目录、HOME、上游或凭证。

## 预算

| 项 | 上限 |
|---|---|
| 系统目录选择窗口 | **4 次**，四场景各一次 |
| 联合驱动总墙钟 | 180 秒 |
| 单个 UI 动作助手 | 20 秒 |
| 私有 headless Chrome | 1 个，独立 profile，不用用户 profile |
| 自动重试 | 0 次 |

超时或失败即保存日志并关闭自有进程。重做前必须先在本文件追加失败记录和剩余预算，不得重复弹窗试错。只截私有 Chrome 中的受控页面，不截桌面或原生窗口；AA 历史排除截图继续不读取、不复制、不看图。

## 四个场景（同一 AA 宿主进程）

1. **默认 false**：确认 good 目录 → completed、一条 protected 元数据、marker `not_requested`。报告页无结构面板，`/evidence/<job>.json` 为 404。
2. **显式 true**：鼠标勾选后确认同目录 → marker `observed`。报告页结构面板可见；Q 与默认 false 相同。
3. **true 后选择取消** → `selection_cancelled`，没有报告链接，也没有报告路由。它占用最近槽位，淘汰默认 false 的报告、W 服务和元数据附件。
4. **true 后在确认前请求取消，再确认** → metadata `cancelled`，marker `skipped/scan_cancelled`，无结构附件。淘汰显式 true 的报告和证据路由。

## 每个已确认结果的 AD 核对

- 工作台对应行出现 `查看项目报告`，链接精确为 `/reports/<job_id>/`；用系统鼠标点击进入。
- 报告页 `session.json` 恰为 `report_version/job_id/read_manifest/bundle/marker` 五字段；bundle 与 W 会话 bundle 逐值相同，marker 与工作台记录相同。
- 报告页鼠标下载 `water-report-1.json`，字节等于当次 `snapshots[0].redacted_json`。
- 仅 observed：报告页鼠标下载 `water-project-evidence.json`，字节等于当次 `marker.observation_json`。
- 截图：observed 报告页 1440×1000 与 900×800（核无横向溢出），scan_cancelled 报告页一张，工作台选择取消一张。总控实际看图并记录。
- 淘汰：第 3 个结果后默认报告的 `/reports/<job>/session.json` 与 `metadata.json` 为 404；第 4 个结果后 observed 报告与证据均为 404。

## 通用核对

- 跨源和缺 token 的 start 均 403，且不启动任务。
- 每次开始前复选框为 unchecked，发起后立即复位并在活动中禁用。
- 公开 close 走正常 shutdown；独立观察 AA 退出码 0；工作台、W 与报告端口全部关闭；记录手动终止次数。

## 不宣称

自然用户手势鉴真、真实用户 scope、生产竞态、macOS、桌面打包、M1 均不因本次通过而成立。普通 UI 合作取消与末条 observer 的精确 late 边界是两件事，本次不以前者冒充后者。

## 留档

运行产物先写入 `.local/checks/controller-aaad-20261026/`，验收报告时按原字节归档到 `docs/acceptance/wave1/controller/w1-aaad-joint-20261026/`，附 `ARCHIVE.json`。不归档缓存、二进制、profile 或夹具 payload；不清理旧现场。

## 执行记录

- 2026-10-26 12:36 准备：候选树建于 `1d02a6a`；三项字节核对均退出 0；AA 固定程序离线构建成功；夹具 524474 字节。窗口 0。
- 2026-10-26 12:38 联合驱动执行一次：4 个窗口，9.993 秒，四场景全部通过，重试 0，手动终止 0。剩余窗口预算 0；本计划已用完，不再运行。结果见 [联合验收报告](WATER-W1-AAAD-JOINT-REVIEW-20261026.md)。
