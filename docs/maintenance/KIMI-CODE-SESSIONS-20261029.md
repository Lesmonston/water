# Kimi Code 对话记录清理实验（2026-10-29）

用户原话：“你先把本地的kimicode的对话记录先全部清理掉吧，不要读内容。记录一下大小即可。（用的比较少，先实验清理之后是否影响我使用。）”

目的：看清掉 agent 的对话记录后，工具还能不能正常用，为 Water 以后处理会话记录（清、压、炼）提供依据。

## 做法

- 挪走 `~\.kimi-code\sessions\` 和 `~\.kimi-code\session_index.jsonl`，放到同盘的隔离文件夹 `~\kimi-code-sessions-quarantine-20261029\`。
- 同盘挪动等于改名，不打开、不读取、也不复制任何文件内容。挪走后 Kimi 看不到这些记录，效果和删除一样；出问题时挪回原处就能恢复。
- 挪动前确认过 Kimi 没有在运行。
- 原处保留：程序 `bin`、配置 `config.toml`、`device_id`、`region`、`workspaces.json`，以及 `cache`（3 MB）、`file-history`（10 个文件，接近 0）、`logs`、`telemetry`、`updates`。

## 大小

共 2,062 个文件，367,585,593 字节（350.6 MB）。文件时间从 2026-09-08 到 2026-10-27。

| 项目目录 | 大小 | 文件数 | 最后写入 |
|---|---:|---:|---|
| car-op | 99.5 MB | 1,074 | 10-09 |
| ui-v2 | 73.9 MB | 378 | 10-01 |
| .worktrees | 61.6 MB | 177 | 10-23 |
| denglou | 58.2 MB | 383 | 10-01 |
| smaltalk | 41.9 MB | 22 | 10-26 |
| worktrees | 12.2 MB | 12 | 10-27 |
| pillow | 3.2 MB | 9 | 10-22 |
| ext5 | 0 | 0 | — |
| 索引缓存 `.index-cache` 与 `.index-dirty` | 不到 0.1 MB | 6 | 10-27 |

## 核对

- 挪动前后，文件名、文件数和总字节逐项一致。
- 原文件清单只记相对路径、大小和修改时间，在本机 `.local/agent-records-20261029/kimi-code/`（`before-manifest.csv`、`summary.json`），不进 git。
- `kimi --version` 能正常运行，输出 2.0.2，也没有重新建出 `sessions` 目录。

脚本第一次运行时，两项挪动已经完成，但在按项目统计时因为 `ext5` 目录是空的而中止。统计改为单独补做，`summary.json` 里注明了这一点。

## 等用户试用

- 要看的：Kimi 能否正常打开、新建对话、在各项目里正常干活，以及原来的历史会话是否从列表里消失。
- 没有影响：用户自己删掉隔离文件夹即可，彻底删除这一步由用户来做。
- 有影响：把 `sessions` 和 `session_index.jsonl` 挪回 `~\.kimi-code\` 即可恢复（Kimi 关着时操作）。
