# WATER-W1-B / C 总控独立验收

2026-10-17。结论：**B、C均CHANGES_REQUESTED，未集成**。分别准备[补充单B-01](../../../dispatch/tickets/WATER-W1-B-ADDENDUM-01-20261017.md)和[补充单C-01](../../../dispatch/tickets/WATER-W1-C-ADDENDUM-01-20261017.md)，等待用户外贴；两单互不依赖。A既有补单独立继续。

## 提交与范围

| 项 | B | C |
|---|---|---|
| 工作树/分支 | `.worktrees/b` / worker/water-w1-b | `.worktrees/c` / worker/water-w1-c |
| 提交HEAD | `d05eae7b5a0fe5c952744336a776a8c5ee1b2873` | `93e2509882f3090883c8ccaedf2fb30e83dba49a` |
| 原受测实现 | `dd3f1a19b9b72259fc3e47c2867f6725c7b42430` | `5b16904000e5102227a4b8ff166c284227688310` |
| 基线 | `e92f39647c91d9ce077d592583c3352626d3402b` | 同左 |
| 差异 | 30文件，10个包文件 | 39文件，9个原型文件 |

两树干净，差异均在各票白名单，9项并行冻结材料哈希一致。实现至提交HEAD的产品目录diff为空，后加报告没有夹带产品变更。总控从原树运行，不修改产品源码。产品文件SHA256、归档日志哈希及前后HEAD记录在下列独立边界receipt。

[提交与历史核对](w1-bc-review-20261017/submission-and-history-audit.json)另确认B的10文件哈希、C的28份证据哈希与字节数、六项负控的实际目标断言/恢复哈希。C三项坏态由当前源码唯一替换在内存重建，SHA256与记录一致；B的一次无效重叠尝试被报告明确废弃，不计有效负控。历史核对不等于总控重做破坏性变异，独立运行以本次门和边界为准。

## 独立复跑

Node v24.16.0，Windows。全部命令加`--final`，前后同一干净提交。B/C语法和测试串行执行，没有安装依赖。

| 票/命令尾部 | 总控结果 | 归档receipt |
|---|---|---|
| B `parallel-check.mjs --task WATER-W1-B --mode check --final` | 退出0 | [B语法](w1-bc-review-20261017/b-2026-10-17T06-36-48.851Z-28880-check-result.json) |
| B `--mode test --final` | 退出0，5 passed，零skipped/todo/cancelled | [B测试](w1-bc-review-20261017/b-2026-10-17T06-36-55.406Z-22336-test-result.json) |
| C `parallel-check.mjs --task WATER-W1-C --mode check --final` | 退出0 | [C语法](w1-bc-review-20261017/c-2026-10-17T06-37-39.650Z-29212-check-result.json) |
| C `--mode test --final` | 退出0，5 passed，零skipped/todo/cancelled | [C模型](w1-bc-review-20261017/c-2026-10-17T06-39-05.452Z-8044-test-result.json) |
| C `--mode browser --final`，首次 | 退出1，1 passed/1 failed；首次Page.navigate CDP超时 | [失败原记录](w1-bc-review-20261017/c-2026-10-17T06-39-13.848Z-20880-browser-result.json) |
| C 同命令同提交手动重跑 | 退出0，2 passed，零skipped/todo/cancelled | [C浏览器](w1-bc-review-20261017/c-2026-10-17T06-40-00.205Z-42744-browser-result.json) |

原始日志随receipt归档，不改其空白字节。C超时也见于执行者首轮最终门，原因尚未确定；不算有效负控、不据此定位UI缺陷，不隐藏失败或声称工具毫无偶发性。未改冻结工具/超时，重跑前后代码不变。

两条B只读审查分别核对来源/保护事实、校验器/测试边界；独立打开17个官方页面未发现具体数据错误，六工具的配置覆盖、共享/独有资产与runtime_verified=false有据。来源核对不代表运行过工具或真实目录已验证。C只读审查检查模型、DOM、服务及历史证据；三条辅助均未编辑或执行项目代码，总控自行运行上表与下述检查。

## B-01：输入数组的继承方法绕过校验

`packages/tool-catalog/validate.mjs`第92—102行接受自定义原型的数组，第127/133/149/156/158行随后调用输入数组的some或forEach。给source_ids赋值`['missing-controller-source']`并为其原型定义空forEach，公开入口返回`{valid:true,errors:[]}`，继承方法计数1；反转index.tools并覆写继承some返回false，同样valid=true、方法计数1。

这违反来源引用、固定工具顺序与纯数据校验边界。普通JSON.parse输入不能直接携带这些方法；没有证据证明清理能力被提升或真实数据被操作。修复应在语义访问前限制非数据数组或使用不信任输入方法的校验路径；不要求建立任意JS/Proxy沙箱。

原数据/官方事实审查没有因此失败；阻止合入的是公开校验器在已证实构造输入上的遗漏。补单要求新增回归与有效负控，保持既有五测试及固定数据原字节。

## C-01：名称排序漏掉未知容量组

`prototypes/readonly-dashboard/model.mjs`第7行两个null提前return 0，遮蔽后续name_asc比较。独立调用真实selectFindings，输入顺序`unknown-z(z/null), unknown-a(a/null), known(m/1)`，实际`known,unknown-z,unknown-a`；按未知末尾与名称升序，应`known,unknown-a,unknown-z`。

固定八条数据只有一项未知，当前画面未暴露；但公开函数和原测试都接收同形构造finding，原冻结名称排序契约仍适用。补单只改模型与对应测试，保留大小排序的未知稳定顺序与BigInt边界；无需重做界面或改fixture。

## 真实浏览器、视觉及已排除候选

总控实际打开并查看本次通过的浏览器门生成的[1440×1000页面](w1-bc-review-20261017/c-dashboard-1440x1000.png)、[900×800页面](w1-bc-review-20261017/c-dashboard-900x800.png)和[1440详情](w1-bc-review-20261017/c-detail-1440x1000.png)。系统字体、白底中性边界与蓝色强调清楚；风险有文字，逻辑大小/未知/待去重/未估算明确；窄屏筛选换行且列表无横向裁切，八项需要纵向滚动。画面不是macOS/Tauri或真实扫描。

真实浏览器测试验证搜索、组合筛选、双向大小排序、详情与Esc回焦、空态重置、partial/cancelled、本地网络/CSP、服务拒绝父目录及敏感路径、关闭临时服务。DOM原始结果也归档。

额外检查详情内部滚到底：900×800下八条固定finding的“示例数据 · 只读演示”文字均仍完整可见，故不把只读标识滚失列为缺陷。一次中间探针以整个badge边框必须在视口内为条件，将pip/uv上边框裁切1像素误记失败；目视截图确认文字完整，改为检查文字Range和遮挡后全部通过。保留原探针记录，未要求worker修改CSS。最小文字上边界为3像素；这不保证未来任意更长数据/更小屏幕。

## 独立证据与交接

[总控runner](../../../../scripts/acceptance/review-bc-boundaries.mjs)仅从原库公开入口处理合成数据，并启动自己的本地服务/隔离Chrome；不修改worker产品。当次runner（主线`d3e600f`版本）的源码哈希与[有效最终receipt](w1-bc-review-20261017/2026-10-17T06-44-33.119Z-38844-boundary-result.json)相同：6个检查，3通过/3目标断言失败，退出1。B合法包、两项C标识检查通过；B两例绕过及C名称排序失败。较早两次探针receipt同目录保留，最终一次为判定依据。后续复验仅增加证据输出目录参数，原断言和本次归档不改。

本次不集成B/C、不代修产品；两张编号补单绑定各自精确提交，原基线/9项冻结锁/helper/测试名不变，仅补单报告新增白名单。A不受影响，后置扫描/正式接线仍未派出。Windows元数据与浏览器验证已做；macOS、真实扫描/分类、容量去重/回收/恢复、Rust/Tauri接线、安装签名与发布仍未验证。
