# 安全说明 / Security

## 什么算安全问题

Flick 会删除和移动文件。下面这些请**私下报告**，不要开公开 issue：

- 删除或移动了受保护的数据（登录信息、会话、设置、你自己的文件），或规则说明之外的路径；
- 动了跳过名单里的东西，或体检范围之外的东西；
- 隔离区还原到了错误的位置，或日志不完整导致无法还原；
- 正在使用的文件被清理，导致程序损坏；
- “复制诊断信息”或其它导出内容带出了路径、用户名或其它个人信息。

某条规则清得太多、但它做的事和规则说明一致的，属于规则问题，请开普通 issue（规则模板）。

## 怎么报告

在仓库的 **Security** 页点 **Report a vulnerability**（GitHub 私下报告）。请尽量附上：

- 版本：“设置 → 关于与隐私”里版本那一行的“复制”；
- 诊断信息：同一页的“复制诊断信息”（不含路径与条目 ID，可以放心贴）；
- 涉及的规则 ID，以及路径的大致样子（把用户名换成 `alice` 之类）；
- 发生了什么、你原本以为会发生什么。

这是一个志愿维护的项目，我们会尽快回复，通常在一周之内。

## 出事之后先自救

- 你选的项先进隔离区：在“隔离区”页找到那一批，点“还原”。
- 推荐项是直接删除的，不进回收站；它们按规则是会自动重新生成的缓存与日志。

## Reporting in English

Flick deletes and moves files. Please report privately, not in a public issue, if it deleted or moved protected data or paths outside a rule's description, touched items on the skip list or outside the checkup scope, restored from quarantine to the wrong place, cleaned files that were in use, or leaked paths or personal data in an export.

Use **Security → Report a vulnerability** on the repository (GitHub private reporting). Include the version and the diagnostics text from Settings → About & privacy (the diagnostics contain no paths or item ids), the rule id, and the shape of the path with your user name replaced. A rule that cleans more than you like but does what its description says is a normal issue.

Items you chose go to quarantine first and can be restored from the Quarantine page. Recommended items are deleted directly and do not go to the Recycle Bin.
