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
