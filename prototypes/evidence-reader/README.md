# Water 证据与容量观察

零依赖、只读的调用方内存阅读页面，沿用 K/I 的页面样式，真实导入 K 的 `assertSessionBundle` 和 I 的 `selectFindings`。新模型只公开 `assertEvidenceBundle`、`selectSnapshot`、`selectFindings`、`formatLedgerBytes`。JS 关联校验不替代 Rust 校验、来源认证或用户目录授权。

应用调用 `await startServer({bundle, port: 0})`，取得 `{server, url, close}`；结束时 `await close()`。导入 server 无启动副作用，无 CLI、环境变量或默认文件输入。bundle 按 `contracts/evidence-reader-v1/SPEC.md`，验证通过后捕获不超过 64 MiB 的完整 JSON 字节。服务仅绑定 127.0.0.1，提供七条固定路由，资源验证 realpath 并拒绝链接逃逸。

页面显示调用方声明的 `retained_j_capture` / `synthetic_memory`；冻结测试含 13 份保留 J 捕获和 5 份人工内存样本，来源记录见 `contracts/evidence-reader-v1/PROVENANCE.json`。没有发起新扫描，Unix 身份样本不代表 macOS 实机验证。静态文件仅为页面资源，产品入口不读取冻结数据。

L 只给文件名弱候选，三个验证字段保持 false，保留 display_only / protected。M 精确显示规范 u128 十进制原值、Unknown、冲突长度及 link_count 值与全部 refs；观察集合身份完整性和 scope 覆盖独立展示。来源总量照原值展示，筛选不改变总量；无 File 观察不表示磁盘为空，硬链接组不代表卷唯一分配或可回收量。详情保留原始 finding、元数据、证据、保护原因、候选及身份组，支持原生 dialog、Escape 和焦点返回。

仅使用工单定向门：`node scripts/next-core-check.mjs --task WATER-W1-O --mode <mode>`。五顶层测试为三模型测试与两真实 Chrome 测试；Chrome 使用 browser-lab 独立 profile，全部保留。服务测试含两个不同调用方 bundle、重命名 scan ID、启动后输入突变、七路由与攻击输入；页面测试实际切换全部 18 份快照。

没有目录选择、上传、导出、删除或 shell 接口。真实用户 scope、新物理扫描、macOS、授权遍历、生产竞态与桌面接线均未验证；本交付不代表 M1 完成。最终测试 SHA、日志和负控恢复见本票回执。
