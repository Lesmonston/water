# Water 扫描工作台

零 npm 的 Windows 只读开发预览。提供选择目录并扫描、条目计数、取消、再扫和最近两份结果；报告展示和脱敏附件均由既有 `native-review`（W）服务提供。没有新增扫描器、内容读取或删除能力。

公开入口：

```js
import { startFromStreams } from './transport.mjs';
const workspace = await startFromStreams({ input, output, port: 0 });
// input: X stdout 的原始 Readable；output: X stdin 的 Writable。
// 等到严格的 ready 事件后才创建 loopback HTTP。
console.log(workspace.url);
await workspace.close(); // 幂等，仅关闭自己建立的 HTTP / W 服务。
```

`launchWorkspace({initialDirectory, port=0})` 仅启动本工作树固定 `.local/next-target/debug/water-scan-host.exe`，经 realpath / 树内 / 普通文件检查，参数恰 `[initialDirectory]`，shell=false。没有路径、命令、env 或 PATH 替换选项。X 未在本树交付时正常报 `Workspace unavailable.`。CLI 为 `node prototypes/live-workspace/launch.mjs <initialDirectory>`。关闭先发 shutdown，2 秒未结束仅终止自己启动的子进程。

`startFromStreams` 按字节同步复制生产者的每块输入，检查 LF、UTF-8、紧凑对象、解码后重复键、字段、事件顺序、job 绑定和单调计数。只有本实例生成的 OpaqueId 可以开始，取消必须匹配当前 job。陈旧/未知/重复 terminal、矛盾 bundle 或断管均停用动作，不生成替代结果。NativeFailure 没有可验证 bundle，因此保留已有报告并将连接置为 failed，不猜测目录选择结果。取消请求不会声称已关闭系统选择窗口，也不保证终态一定为 cancelled。

结果必须来自 native_scope_metadata，session_id 等于当前 job，使用冻结 8/10000/256 策略并通过真实 W.assertReviewInput。确认后的结果委托真实 W.startServer；选择取消不创建报告服务。最近两条结果包括选择取消；第三条到来时关闭淘汰结果所属的 W 服务。关闭工作台关闭所有自有报告，不关闭调用方的 streams 或其它报告服务。

HTTP 只绑定 127.0.0.1 和精确 Host。动作必须是带精确 Origin、每实例 crypto.randomBytes(32) token 和 application/json 的 POST；body 上限 1024 UTF-8 字节，严格重复键/字段/类型检查。token 仅在首页受控 bootstrap 提供，不出现在轮询、动作响应、错误、下载或日志中。固定资源、CSP、no-store、nosniff 和 no-referrer；没有任意路径映射。接口校验不等于自然用户手势鉴真。

指定检查（在 y 工作树根串行运行）：

```powershell
node scripts/interactive-wave-check-r2.mjs --task WATER-W1-Y --mode test
node scripts/interactive-wave-check-r2.mjs --task WATER-W1-Y --mode browser
```

三个模型/HTTP测试与两个浏览器测试使用公开 streams 接冻结 `interactive-host-replay.mjs` 的真实双向 pipe。数据明确为保留的原生捕获回放，没有运行新 X、没有假 exe、没有生产测试模式，也没有物理扫描夹具。Chrome 仅一个私有实例，截图和实际系统鼠标下载保留于本树 `.local/browser-lab`；下载按当次 W 的 Q 原文本核对，不重算 Q。

真实 X→Y 原生选择/合作取消整链由总控收齐后另行联合验收。真实用户 scope、恶意竞态、macOS、桌面壳/打包及 M1 尚未验收。本票交付状态仅 SUBMITTED。
