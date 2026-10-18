# Water 受控会话阅读页面

K 是零 npm 依赖的会话阅读页面，消费调用方提供的 `water.lab-reader-bundle.v1` JSON 值。只读展示受控夹具元数据，始终显示“受控夹具扫描 · 只读”和“非真实用户目录”。没有文件路径参数、CLI、环境变量覆盖或自动读取 contracts 的生产入口。

可信后端显式调用并负责关闭：

```js
import { startServer } from './server.mjs';
const server = await startServer({ bundle, port: 0 });
// server.url 仅指向 127.0.0.1；bundle 必须由调用方提供。
await server.close();
```

导入模块不监听。启动先校验并捕获 UTF-8 JSON 字节副本（上限 32 MiB），后续调用方变异不影响服务。监听端口默认由操作系统分配。仅六固定原始路由、严格 Host 和 GET/HEAD；静态文件真实路径须仍在固定包内。每个响应明确关闭连接，避免关闭服务后客户端重用失效连接。CSP 禁外部资源，服务无 CORS。不读取真实数据或 F/J 物理夹具，不清理浏览器状态。

`model.mjs` 提供 `assertSessionBundle`、`selectSnapshot`、`summarizeSnapshot`，静态导入并重新导出原 I 的 `selectFindings` 和 `formatBytes`。检查版本、六字段快照、四层状态与 scope/entry 顺序、来源大小、报告与视图、H 八字段及全部零计数桶。校验只是一致性展示防线，不代替 A/J 验证、来源证明或文件系统授权。支持已经验证的 JSON 值；getter/proxy/循环值不是输入契约。

页面从 `/sessions.json` 加载捕获值，默认首项，任意合法 scan_id 都来自输入。切换快照重置筛选，并更新状态、覆盖、问题、来源总量及保护计数。大小比较和格式化沿用 I 的 BigInt 语义。筛选计数与整份快照计数分开，来源未知保持 null。详情使用原生 dialog，完整显示 E 字段及 facts 的 kind/depth/identity/相对根；文本通过 textContent 创建，无动态 HTML、URL、内联事件或路径操作。

定向验证从 K 工作树执行，全部通过冻结 helper：

```powershell
node scripts/session-batch-check.mjs --task WATER-W1-K --mode check
node scripts/session-batch-check.mjs --task WATER-W1-K --mode suite
```

精确三模型与两浏览器测试覆盖四份总控捕获和两个调用方合成内存变体、完整 HTTP/页面供数、后续变异隔离、BigInt、来源未知、字面 HTML、键盘和焦点、1440×1000 / 900×800 布局。只有测试读取冻结资产；内存变体不是物理 F 捕获。Chrome 的隐式 `/favicon.ico` 也被固定路由策略拒绝，浏览器检查仅排除这一预期的本地 404。

当前验证范围为 Windows。实际 J 输出到 K 页面、桌面/IPC、真实用户目录和 macOS 由总控后续独立验收；本票不把冻结输入称作 J 产物。

补充单01区分三种来源问题位置：issue.relative_path 为 `""` 时保留原值并显示“scope 根”，为 `null` 时显示“无相对路径”，普通相对路径保持字面文本。只有 issue 允许空串；entry.relative_path 和 scope.relative_root 仍须非空，所有非法绝对路径、盘符、反斜杠、控制字符、点段/父段继续拒绝。

补单回归测试只读取证据目录中保留的实际 J 十三快照 JSON（169500 字节及固定 SHA-256），通过调用方内存传给真实服务并打开页面；不重新扫描，不读取其它树夹具。测试同时保留原两份调用方 bundle、精度/HTML、键盘/焦点、HTTP 边界和双尺寸用例，并对空串/null/普通位置的同步内存变体核对显示。此回归证明保留的实际 J 输出可被页面消费；总控在其原集成树上的重新执行与验收仍另行完成。
