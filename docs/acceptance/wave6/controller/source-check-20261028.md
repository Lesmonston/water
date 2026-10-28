# 第六波 I1 官方出处：总控只读核对（2026-10-28）

I1 执行者的网页工具返回 HTTP 503，打不开出处（见 I1 受阻回执 `f0f7243a`）。总控用内置浏览器只读打开 RULES-AGENT 第 2.5 节要求的出处，核对网址能打开、标题对得上、正文有对应内容。不下载、不登录。

| 规则 | 网址 | 页面标题 | 正文核对 |
|---|---|---|---|
| `desktop-updater-residue` | https://github.com/electron-userland/electron-builder/blob/master/packages/electron-updater/src/DownloadedUpdateHelper.ts | electron-builder/packages/electron-updater/src/DownloadedUpdateHelper.ts at master · electron-userland/electron-builder | 源码（raw 版）含 `"pending"` 目录名 |
| `desktop-updater-residue` | https://github.com/electron-userland/electron-builder/issues/8730 | Erase the "pending" directory after an update has been successfully installed · Issue #8730 | 标题即说明安装后 `pending` 不删 |
| `agent-tool-logs`、`kimi-code-sessions` | https://moonshotai.github.io/kimi-code/en/configuration/data-locations.html | Data locations \| Kimi Code CLI Docs | 正文有 `logs` 与 `sessions` |
| `agent-tool-logs`、`opencode-sessions` | https://opencode.ai/docs/troubleshooting/ | Troubleshooting \| OpenCode | 正文有日志与 `.local/share/opencode` |
| `agent-tool-logs`、`other-agent-sessions` | https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-config-dir-reference | GitHub Copilot CLI configuration directory - GitHub Docs | 正文有 `logs` 与 `session-state` |
| `kiro-sessions` | https://kiro.dev/docs/cli/chat/session-management/ | Session management - Chat - CLI - Docs - Kiro | “Storage: Local database (~/.kiro/)” |
| `kiro-sessions`（备选） | https://kiro.dev/docs/configuration/ | Configuration scopes - Features - Docs - Kiro | “Global — applies across all projects. Stored in ~/.kiro/.” |
| `other-agent-sessions` | https://geminicli.com/docs/cli/session-management/ | Session management \| Gemini CLI | 会话存在 `~/.gemini/tmp/<project_hash>/chats/` |

注：Kiro 两页是前端渲染，要等页面加载完才有正文。Gemini 的网址打开后会补上结尾的 `/`，表里写的是最终网址。
