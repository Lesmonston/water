# 真实 AA→AD 联合验收通过

2026-10-26，总控（Claude，接任 Codex）。按事先冻结的[计划](WATER-W1-AAAD-JOINT-PLAN-20261026.md)一次完成，无重试。**真实固定 AA 宿主 → 原生目录选择 → R/Z → AB 传输 → AD 同源项目报告 → 报告页鼠标下载元数据与结构证据，四个场景全部通过（Windows 受控合成范围）。** 31 张主任务的状态与槽位不变，没有新实现者，没有改产品代码。

## 受测现场

| 项 | 值 |
|---|---|
| 候选树 / 分支 | `.worktrees/integration-aaad-20261026` / `controller/water-w1-aaad-joint-20261026` |
| 起点 | 主线 `1d02a6a7206ea01a23f4c9095a47ec7c6103936f`，未合并任何分支 |
| AD 产品字节 | 与受测实现 `3ad5e70` 一致（`git diff --quiet` 退出 0） |
| AA 源码与锁 | 与受测实现 `b3a874d` 一致（退出 0） |
| 产品目录 | `packages`、`prototypes`、`crates`、`tools` 自 `5b4d77c` 起无改动（退出 0） |
| AA 固定程序 | 离线 Rust 1.95.0/jobs1 私有构建，1585664 字节，SHA-256 `8208ccbc539a252b707c4d7a6a7d90c9510660c6970c87787f4d9002398a0e6f` |
| 合成夹具 | 冻结工厂，字面 payload 524474 字节，index SHA-256 `02908c88eef2209368b6def22ae4e6f8fa1391d63aa37a268edcc66e93456909` |

## 预算执行

| 项 | 计划上限 | 实际 |
|---|---:|---:|
| 系统目录选择窗口 | 4 | 4 |
| 联合驱动墙钟 | 180 秒 | 9.993 秒 |
| 私有 headless Chrome | 1 | 1 |
| 重试 | 0 | 0 |
| 手动终止 | — | 0 |

## 四个场景

一个 AB 公开 `launchProjectWorkspace` 固定启动一个 AA 宿主（PID 31380），四场景复用同一进程。

| 场景 | 工作台结果 | marker | AD 报告页 |
|---|---|---|---|
| 默认 false | completed，1 条 protected | `not_requested` | 标题“扫描完成”；“未请求读取 · 本次未读取清单”；无结构面板；证据 404 |
| 显式 true | completed，Q 与默认 false 相同 | `observed` | “已读取根清单 · 仅保留结构统计”；结构面板可见，140 B、5/9 字段 |
| true 后选择取消 | selection_cancelled | `skipped/selection_cancelled` | 无“查看项目报告”链接；`/reports/<job>/` 与 session.json 均 404 |
| true 后确认前取消 | cancelled，0 条 | `skipped/scan_cancelled` | 标题“扫描已取消”；“扫描取消未读 · 未读取清单”；无结构面板；证据 404 |

每个已确认结果都由系统鼠标点击工作台行内的 `查看项目报告` 进入 `/reports/<job_id>/`。报告 `session.json` 恰为五字段，bundle 与同次 W 会话 bundle 逐值相同，marker 与工作台记录相同。页面元数据预览等于当次 `redacted_json`。

## 报告页鼠标下载

| 场景 | 文件 | 字节 | SHA-256 |
|---|---|---:|---|
| 默认 false | water-report-1.json | 1387 | `688326559e719a0d9099dca6a580d94aaef518d40a4c54872a2b5c7f6ad58550` |
| 显式 true | water-report-1.json | 1387 | `688326559e719a0d9099dca6a580d94aaef518d40a4c54872a2b5c7f6ad58550` |
| 显式 true | water-project-evidence.json | 844 | `3d5ab3ad3916ad49dfe1621ff4e7bbc99dc4103b2ab052884f5571c0bb9b9350` |
| 扫描取消 | water-report-1.json | 902 | `e08ba3bc1e83afc94c7dd5d48e6c31c34e7a1b4f5a662c2b5225106b93ac5c57` |

四份下载都与当次原字符串 UTF-8 逐字节相同。三种哈希与 2026-10-22 的 [AA→AB 联合验收](WATER-W1-AB-ADDENDUM-01-REVIEW-20261022.md)完全一致，说明同一合成夹具经新报告路由后字节不变。

## 淘汰、权限与关闭

- 第 3 个结果（选择取消）占用最近槽位后，默认 false 的报告页、session.json、metadata.json 均 404，其 W 服务已关闭。
- 第 4 个结果后，显式 true 的报告三条路由与 `/evidence/<job>.json` 均 404，其 W 服务已关闭。最终最近两项为扫描取消和选择取消。
- 跨源与缺 token 的 start 都返回 403，且没有启动任务。每次开始前复选框为 unchecked，发起后立即复位并在活动中禁用。
- 公开 close 走正常 shutdown：runner 退出码 0，独立句柄观察 AA 退出码 0。工作台与 W 端口均关闭，私有 Chrome close 返回。事后按命令行查询，没有任何引用本项目路径的残留进程。

## 实际看图

总控逐张查看了 6 张私有 Chrome 截图，记录见 [VISUAL-REVIEW.json](w1-aaad-joint-20261026/controller/VISUAL-REVIEW.json)：observed 报告 1440×1000 首屏与结构面板、900×800（无横向溢出）、默认 false 报告、扫描取消报告、工作台选择取消。没有截取或查看桌面与原生窗口像素，AA 历史排除截图未打开。

## 留档

[ARCHIVE.json](w1-aaad-joint-20261026/ARCHIVE.json) 按原字节索引 45 份文件、478411 字节：准备与联合回执、10 份构建日志、4 份 UI 动作日志、各场景工作台状态、W bundle、报告 session、4 份下载副本、6 张截图、runner 与 AA 退出日志，以及本次使用的 6 个总控脚本副本。不含缓存、二进制、Chrome profile 或夹具 payload。候选树、夹具、下载目录和 profile 均保留，未清理。

## 结论与不宣称

handoff 第 6 节“真实 AA→AD 原生选择→同源报告→附件”一项现已由真实系统整链覆盖（Windows 受控合成夹具）。以下仍未验收：自然用户手势鉴真、真实用户 scope、生产竞态、macOS、Tauri 桌面接入扫描与报告、M1。普通 UI 合作取消与末条 observer 的精确 late 边界是两件事；本次只覆盖前者，后者仍以 10-22 的无窗口真实捕获为准。
