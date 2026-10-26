# 本机只读摸底（2026-10-26 12:58，总控）

用户同日授权开发期只读扫描本机后执行。只读名字、大小、修改时间与属性，不读文件内容，不改不删。脚本 [survey1026.ps1](survey1026.ps1)，原始输出 [survey1026.txt](survey1026.txt)。第二波验收时，B 扫描引擎的真实冒烟结果要与这里同一位置的数对照（PLAN 规定差异不超过 2%；中间相隔几天，增长型目录按增长解释差异）。

## 磁盘

| 盘 | 已用 GB | 可用 GB |
|---|---:|---:|
| C | 190.3 | 59.8 |
| D | 51.4 | 23.6 |
| E | 129.7 | 20.3 |
| F | 710.7 | 243.1 |

## 主要位置

| 位置 | GB | 文件数 | 级别（种子规则） |
|---|---:|---:|---|
| `~\.claude\projects` | 6.439 | 1577 | 受保护 |
| Chrome `OptGuideOnDeviceModel` | 3.977 | 4 | 仅供参考 |
| `~\.codex2\.tmp\marketplaces\.staging` | 3.565 | 69947 | 推荐清理 |
| `~\.cursor\chats` | 2.713 | 315 | 受保护 |
| `%LOCALAPPDATA%\AnthropicClaude`（含多个 app-* 版本） | 2.698 | 18232 | 旧版本推荐清理 |
| `%LOCALAPPDATA%\npm-cache` | 2.174 | 19874 | 推荐清理 |
| Windows DeliveryOptimization | 1.690 | 535 | 仅供参考 |
| `~\.cache\codex-runtimes` | 1.541 | 22427 | 需要确认 |
| `~\.claude\file-history` | 0.708 | 11688 | 受保护 |
| Edge Default Service Worker CacheStorage | 0.691 | 1146 | 需要确认 |
| `%LOCALAPPDATA%\ms-playwright` | 0.685 | 612 | 需要确认 |
| Chrome Default `Cache` / `Code Cache` | 0.367 / 0.290 | 2242 / 3492 | 推荐清理 |
| `%LOCALAPPDATA%\CrashDumps` | 0.325 | 10 | 推荐清理 |
| NVIDIA DXCache | 0.304 | 84 | 推荐清理 |
| Explorer 缩略图缓存 | 0.271 | 33 | 仅供参考 |
| 下载文件夹安装程序（9 个 exe，均超过 7 天） | 1.447 | 9 | 需要确认 |

Chrome 共有 Default、Profile 2/6/12/16/17/20/26 等多个用户配置，各自带缓存。

## 临时目录前缀归类

`C:\Windows\Temp`：2704 个目录、625 个散文件（0.096 GB）。

| 归一化键 | 个数 | GB | 最早 | 最新 |
|---|---:|---:|---|---|
| `*`（随机名，含 `claude` 等被旧规则误吞的名字） | 2070 | 1.116 | 10-08 | 10-26 |
| `vscode-stable-system-x#*` | 4 | 0.856 | 10-23 | 10-26 |
| `sand-update*` | 6 | 0.693 | 10-22 | 10-26 |
| `workbuddy-update-x#` | 1 | 0.419 | 10-25 | 10-25 |
| `playwright_chromiumdev_profile*` | 11 | 0.091 | 10-23 | 10-23 |
| `codebuddy-marketplace-install*` | 2 | 0.103 | 10-25 | 10-25 |
| `cursor-bash-state*` | 23 | 0.003 | 10-19 | 10-20 |

`%LOCALAPPDATA%\Temp`：3 个目录，几乎为空。当时没有 `rb*-chrome-*` 泄漏（10-23 已清）。

## 摸底中发现、已写进契约的两个坑

1. Skill 里的前缀归一化会把 `claude` 这类普通单词也替换成 `*`；SCAN SPEC 第 5 节改为只替换含数字或大小写混合的随机后缀。
2. `%LOCALAPPDATA%\Application Data` 是指回自身的系统联接；摸底脚本只在终点检查联接，顺着它多算了 1.25 GB。SCAN SPEC 第 3 节要求中间段遇到联接一律不进入。
