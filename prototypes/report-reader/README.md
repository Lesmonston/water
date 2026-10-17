# Water 合成报告阅读

本目录只读展示 `water.report-view.v1` 的四份冻结合成报告：`base`、`composite_partial`、`cancelled`、`empty_completed`。数据来自本工作树 `contracts/report-reader-v1/reports.json`，由总控用真实 E `project_json` 生成。这里没有扫描、删除、上传、目录选择或 Tauri/IPC。

默认打开 `composite_partial`。切换报告会更新状态、覆盖、问题、来源总量和条目。来源总量沿用来源 `totals`，页面不把条目逐行相加，也不把未知大小当成 0。`low`、`review`、`high`、`protected` 分开显示。筛选键 `all` 表示不限；`tool:all`、`no_tool`、`tool:no_tool` 是精确工具键。

在本工作树根目录使用已安装的 Node 24。导入 `server.mjs` 不会监听端口；测试调用 `startServer({ port: 0 })`，并在 `finally` 里关闭。服务只绑定 `127.0.0.1`，只接受精确路径 `/`、`/styles.css`、`/app.mjs`、`/model.mjs`、`/reports.json` 的 GET/HEAD。

定向验证（逐条运行）：

```powershell
node scripts/parallel-next-reader-check.mjs --task WATER-W1-I --mode check
node scripts/parallel-next-reader-check.mjs --task WATER-W1-I --mode test
node scripts/parallel-next-reader-check.mjs --task WATER-W1-I --mode browser
```

浏览器测试使用冻结的 `scripts/browser-lab.mjs` 和本机已有 Chrome，profile 在本树 `.local/browser-lab`。截图写到 `.local/browser-lab/reader-1440x1000.png`、`reader-900x800.png`、`reader-detail.png`。当前只在 Windows 上验证，不代表 macOS 或正式桌面壳。
