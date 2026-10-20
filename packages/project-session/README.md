# Project session

Windows 受控只读宿主，复用 X 的任务状态和取消令牌。固定程序只接收一个原生选择器起始目录；真正的扫描根来自 S 的选中能力。每个任务显式提供 `read_manifest`，选择绑定该任务，最多接受 32 个任务且不排队。

`v1::capture_registered` 接收调用方拥有的真实 P 登记，先调用 R，再将 E/H/Q 的原始元数据投影装入私有 `ConfirmedCapture`。`MarkerChoice::Skip` 不调用 Z；显式读取也须等元数据结束且未取消，才建立短暂 P attempt 并调用 Z。API 结束自己的 attempt，保留调用方的 scope 和其它活动 attempt。CLI 在同一工作线程持有 S 的 `SelectedScope`，整个流程结束或 unwind 后撤销自己的登记。

`water.project-host.v1` 在 stdin/stdout 使用紧凑 UTF-8 JSON + LF。请求限 4096 字节，bundle 限 64 MiB，Z observation string 限 8192 字节，事件含 LF 限 67125248 字节。`read_manifest` 为 start 必填布尔值；cancel 和 shutdown 不接受内容选择或路径。元数据 bundle 的 `ordinary_content_read=false` 只描述元数据扫描；额外读取事实保留在独立 marker 中，Z 原始 JSON 字符串不改写。结构证据不提升归属或删除权限。

可信 Rust 入口不宣称执行过 S；只有 CLI 的真实 S 选择才生成 `native_directory_dialog` envelope。额外同意不是自然手势鉴真。Windows 合成 fixture 验证不代表真实用户数据、生产竞态、macOS、桌面或 M1 验收。无删除、任意程序、网络或读取环境目录的接口。

仅通过正式票的 `scripts/project-wave-check.mjs --task WATER-W1-AA` 定向运行 baseline/lock/check/test 与一次 native final；不要手动扫描用户目录或反复打开原生对话框。测试只读冻结 factory 的元数据 index，普通 payload 内容仅经 Z 读取；所有 fixture、日志和构建现场保留。
