# Scan Review

零 npm ES modules；调用方内存报告预览与默认脱敏 JSON 下载，沿用 I/K/O 页面样式。

```js
import { startServer } from './server.mjs';
const review = await startServer({ bundle });
// 可信调用方打开 review.url；结束时 await review.close()。
```

不自启动，不从文件、环境或 CLI 读取报告。bundle 遵从 `contracts/scan-review-v1/SPEC.md`，实际来源由调用方声明，页面不鉴真；展示校验不替代 Rust A/Q 验证。使用真实 I 模型校验和筛选，不改变来源总量或未知值。

默认预览完整当前 Q 文本；显式“下载脱敏报告”保存其原 UTF-8 字节。固定局部序号文件名，没有原始报告导出。移除直接标识、路径与自由文本，精确数量、大小、顺序及结构仍可关联，不保证匿名。

服务仅 `127.0.0.1`，固定原始 URL 白名单、精确 Host、GET/HEAD、安全响应头；启动时捕获调用方报告与下载字节，之后调用方变更不影响服务。没有扫描、目录选择、上传、删除或桌面原生保存入口。

在 T 工作树串行运行：`node scripts/parallel-wave-check.mjs --task WATER-W1-T --mode suite`。三个模型、两个 Chrome 顶层测试；使用冻结合成/保留捕获资产及新私有浏览器状态和下载目录，不访问物理 fixture 或真实用户数据。Windows 验证不代表 macOS、桌面或 M1 完成。
