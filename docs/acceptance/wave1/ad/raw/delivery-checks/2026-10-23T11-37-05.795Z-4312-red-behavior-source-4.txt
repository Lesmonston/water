# Project workspace

AB 的本地只读开发工作台，独立于旧 Y/W 页面，零 npm 依赖。公开入口：

```js
import { startFromStreams } from './transport.mjs';
const workspace = await startFromStreams({ input: host.stdout, output: host.stdin, port: 0 });
// workspace.url；await workspace.close()，不销毁调用方的 streams。
```

`launchProjectWorkspace({initialDirectory, port: 0})` 只启动本树固定
`.local/next-target/debug/water-project-session.exe`。本独立树没有 AA 产品时，
以 `Project workspace unavailable.` 净化拒绝。不接受程序路径或环境覆盖。

每次开始捕获当前复选框布尔值并立即复位，活动时禁用；默认不读正文。
服务端绑定随机任务 ID、accepted/result 的选择和 marker。严格解析复制后的
UTF-8 行，拒绝重复键、额外键、错误顺序、越限和未经请求的结构证据。
Z/U 全字段、计数关联、false/null 均校验；零计数不推断字段缺失。

元数据报告交真实 W 服务，Q 原字节不变。结构附件只提供仍保留的 observed
结果，内容恰 Z 原序列化 UTF-8 字节，独立下载为
`water-project-evidence.json`。最近结果至多两份，淘汰即关闭自己的 W 和附件。
仅 127.0.0.1、精确 Host/Origin、每实例随机令牌、CSP、no-store；令牌不进入
轮询、错误、报告、日志或用户可见文字。

定向验证从本工作树运行：

```powershell
node scripts/project-wave-check.mjs --task WATER-W1-AB --mode test
node scripts/project-wave-check.mjs --task WATER-W1-AB --mode browser
```

测试使用冻结 `project-host-replay` 真正双向管道及内存反例，依赖捕获里的
R/Z 来自真实 P 确认后调用；dialog envelope 是合成声明，未运行新 AA 或 S。
保留的选择取消来自旧 S 捕获。一个私有 Chrome、无物理 fixture 读取、原生
系统窗零次；实际鼠标下载 Q 和结构附件并比对字节，保留截图和进程退出回执。
真实 AA→AB 链待总控联合验收。结构统计不证明归属、安装、引用或可删，未知
保持保护。真实用户范围、生产竞态、macOS、桌面及 M1 未验收。
