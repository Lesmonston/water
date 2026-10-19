# Interactive Host v1：X/Y共同边界

旧V/W全部只读。X新crate water-scan-host/water_scan_host，edition2024/rust1.95/publish=false，独立workspace resolver3，四auto=false；唯一lib src/lib.rs、bin water-scan-host src/main.rs、tests/host_v1.rs。直接依赖恰water-native-session、water-native-scan、water-native-picker、water-scope-registry、water-contracts、serde =1.0.229 features=[derive]、serde_json =1.0.151，均已有path/根锁checksum；无新registry/dev/build依赖，lib/bin forbid unsafe。

唯一CLI参数initial_directory只用于真实S起始位置，不能作为扫描根。固定scope_id=interactive-scope，session_id=每次job_id；真实V.capture_session_with_observer→真实V.to_json生成bundle，预算8/10000/256。每次在工作线程内创建并持有自己的Registry/PickerOptions，不把路径/原生能力跨线程或交HTTP。输入线程持续读命令，输出由单一writer串行化，不能让JSON行交错。一次只允许一个原生活动任务，最多接受32个不同start ID；旧ID不得复用，不能排队自动再弹窗。

## STDIO

stdin每条恰一个紧凑UTF-8对象+LF，正文<=4096字节；无BOM、空行、CRLF、重复/转义重复键、未知字段、额外对象、非UTF-8。EOF后不足一行拒绝。stdout事件同样紧凑UTF-8+LF，一行<=67109888字节，bundle自身仍遵守V/W的64MiB上限；stderr正常为空，错误只固定Host unavailable.加LF。argv错误退出64且stderr Invalid host arguments.加LF；协议流无法继续退出2，无stdout诊断/栈/路径。无env输入或任意执行路径。

请求恰：{"command":"start","job_id":"OpaqueId"}、{"command":"cancel","job_id":"OpaqueId"}、{"command":"shutdown"}。job_id遵守A.OpaqueId，空/超长/路径/额外键都拒绝。纯内存公开函数 decode_request(raw:&[u8])->Result<HostRequest,HostError>；raw不含LF，用同一解析逻辑服务生产stdin，HostRequest Debug/Clone/PartialEq/Eq，具体内部状态设计由执行者负责。

事件公共键version="water.interactive-host.v1"、kind；除此只允许对应一行列出的键：

| kind | 其余键 |
|---|---|
| ready | 无 |
| accepted | job_id |
| progress | job_id、visited_entries、recorded_entries（0..10000整数，recorded<=visited，单任务各自单调） |
| cancel_ack | job_id、applied（bool） |
| result | job_id、bundle（真实V对象，session_id=job_id） |
| failure | job_id（可为null）、code |
| stopped | 无 |

failure.code只允许InvalidRequest/Busy/ReusedJobId/UnknownJob/JobLimit/NativeFailure。无自由文本或原始错误。ready一次在任何请求前；accepted先于该任务progress/result/NativeFailure，terminal恰一次，之后回idle。Busy等请求错误不终结活动任务；无未知job的progress/result，不丢弃或重写Q。progress仅输出两个计数，不发relative_path/root/原生ID；observer只观察并转发真实R计数，不为了慢样本sleep。结果来源保持native_scope_metadata及Unknown/保护。

cancel必须匹配当前job才对传给真实V的同一个R.CancelToken调用cancel；无活动/过期/其它ID返回UnknownJob，不取消别人。选择器尚开时取消只表示已请求，不能假称已关闭系统窗口；仍由用户取消选择或确认后得到R已取消报告。selection cancelled无snapshot与确认后scan cancelled有snapshot保持区别。shutdown/EOF在idle正常stopped/退出0；活动时请求合作取消，等待选择器/任务结束，再stopped。Y关闭超时可以仅终止自己启动的X进程，不能据此伪造cancelled报告。

库可暴露用于真实生产调用的状态机/事件API，测试须调用同一实际逻辑；不新增生产测试开关、假扫描器、按fixture/job名返回结果或传任意执行闭包替代实际V。无UI单位检查可测真实CancelToken+R/状态机与解析器；native门额外运行真实X.exe，取消选择/完整/选择前cancel后确认各一次。该门按PID固定title操作，不跑旧V全套UI。
