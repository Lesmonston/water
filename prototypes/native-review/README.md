# Native review

只读原生会话页面、原始字节入口和固定 V 启动器。零 npm，沿用 Water I/T 的页面样式及真实模型；无外部字体、脚本或资源。旧 T/I 文件不改动。

`model.mjs` 提供 `assertReviewInput`、`selectSnapshot`、`exportText`，重导出真实 T 的 `selectFindings` 和 `formatBytes`。旧 `water.scan-review-bundle.v1` 交真实 T 验证，来源标签保留；新 `water.native-session-bundle.v1` 独立校验原生策略、单 scope、未知/保护、实际祖先、Windows 名称、源 totals、summary 和 Q。Q 对照投影只作校验，导出使用调用方传入的原 string。

```js
import { startFromStream } from './host.mjs';
// stream 必须是可信调用方提供的 Node Readable，产生 Uint8Array/Buffer。
const local = await startFromStream({ stream, port: 0 });
console.log(local.url);
// 调用方完成后：await local.close();
```

`readSession(stream)` 逐块复制原字节，拒绝已解码 string、BOM、坏 UTF-8、重复键、非紧凑 JSON、额外对象/行，JSON 最多 64 MiB，允许末尾单 LF。流入口仅原生协议。`startServer({bundle,port})` 也支持旧 T 内存输入；在首次 await 前验证和捕获完整 JSON 与每份 Q 原字节，调用方之后修改对象不影响页面或下载。

HTTP 固定 `127.0.0.1` 和精确 Host，只支持 GET/HEAD。路由为 `/`、`/styles.css`、`/app.mjs`、`/model.mjs`、`/scan-review/model.mjs`、`/report-reader/model.mjs`、`/session.json`、按实际快照数分配的 `/exports/N.json`。下载固定 `water-report-N.json`；没有路径、选择器、扫描、进程、上传或原始报告导出接口。

```powershell
node prototypes/native-review/launch.mjs '可信本机初始目录'
```

`launchNative({initialDirectory,port})` 仅调用本工作树 `.local/next-target/debug/water-native-session.exe`，经 realpath/项目内/普通文件校验，以单个结构化参数、`shell:false` 和原字节 stdout/stderr pipe 启动。初始目录只是 V/S 选择器起始位置；W 不解析它来授权扫描。只有子进程退出 0 且完整协议合法后才启动服务器。CLI 打印 loopback URL，并在 SIGINT/SIGTERM 关闭自己的服务/进程；不清理文件、不构建 V、不下载依赖。

目录选择取消显示“目录选择已取消；未开始扫描”，没有报告/预览/下载；选择确认后的扫描取消保留实际 cancelled 报告与 Q。原生页显示 no-follow、预算、普通内容未读、手势/竞态未验证及 Completed 的策略边界。来源是可信宿主声明，页面不认证来源或捕获新鲜度；页面没有发起新扫描。旧输入不补造原生策略。筛选不改变源总量或整份导出；详情用文本节点和原生 dialog。

定向检查（在本工作树根运行，一次一个门）：

```powershell
node scripts/native-host-check.mjs --task WATER-W1-W --mode suite
```

五顶层测试覆盖八份保留的真实 S/P/R/E/H/Q 捕获、旧 T 的 24 份快照、两份明确标注的合成重命名变体、严格字节边界、不可变服务器输入、HTTP/隐私、实际鼠标事件下载、两种取消、双尺寸、键盘/焦点、HTML 字面及 u64/Unknown。测试回放工具是冻结 `native-session-stream-probe.mjs`；没有假 V.exe 或生产测试入口。私有浏览器 profile、下载和日志全部保留。

本 W 独立树没有 V 产品，未运行真正 V.exe → 固定 `launchNative` → HTTP/Chrome/下载整链；该链由总控收两单后联合验收。当前仅 Windows 受控回放验证，不代表真实用户 scope、macOS、桌面壳、自然手势鉴真、恶意生产竞态或 M1 完成。没有扫描物理 fixture、读取普通内容或删除权限。
