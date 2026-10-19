# X/Y/Z 正式READY：三条独立任务一次外贴

2026-10-19。用户要求加快并按波次一次安排。三票已冻结、独立建树、实际baseline通过，现在READY；dispatchedAt/startedAt仍null，没有自动实现者或子代理。READY不代表产品已实现。

| 票 | 本次交付目标 | 唯一槽位/分支 | 派前结果 |
|---|---|---|---|
| WATER-W1-X | 持续原生扫描宿主与真实合作取消 | x / worker/water-w1-x | PASSED / READY |
| WATER-W1-Y | 可开始、取消、再扫的交互工作台 | y / worker/water-w1-y | PASSED / READY |
| WATER-W1-Z | 显式额外同意的根package.json读取 | z / worker/water-w1-z | PASSED / READY |

共同精确基线 `1c152a1ed317fb51498503de837bb228c50dc663`，tag `water-w1-interactive-base-r2-20261019`；每树干净且产品目录不存在。检查入口统一 `scripts/interactive-wave-check-r2.mjs`，本波冻结 `contracts/interactive-batch-v1/freeze-r2.lock.json`：202物理锁条目+4份旧O/T资源Git对象身份、15继承锁、426唯一约束；旧341及A–W任务/槽位/产品/根Cargo均保持。

## 分别贴入三个执行对话

**WATER-W1-X：持续原生扫描宿主与真实合作取消**

```text
请读取 F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W1-X-SCAN-HOST-20261019.md，开始执行任务。
```

**WATER-W1-Y：可开始、取消、再扫的交互工作台**

```text
请读取 F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W1-Y-LIVE-WORKSPACE-20261019.md，开始执行任务。
```

**WATER-W1-Z：显式额外同意的根package.json读取**

```text
请读取 F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W1-Z-ROOT-MARKER-20261019.md，开始执行任务。
```

## 实际基线与范围

- X：私有离线Rust1.95/MSVC/jobs1构建真实既有V/R/S/P/N/A/U；真实P→R→A得到8条观察，R共享CancelToken预取消得到真实cancelled，V API链接通过；未调用S对话框。X本树原工厂4目录/6文件条目含硬链接及junction，60字面/74逻辑字节，全部留存。
- Y：新协议真实双向pipe回放完整/选择取消/确认后取消，经真实W模型校验；独立平台loopback与headless Chrome系统鼠标点击下载当次Q 5096字节。该平台probe是依赖/工具检查，尚未运行新X或新Y，也不把回放冒充真实新宿主。Y没有物理扫描fixture权限。
- Z：真实P/N注册根与许可及真实U通过；实际Windows单名NtCreateFile、class1/9/18、只读共享、同句柄有界读取及U分析通过。ABI probe读取262284字节，仅来自新good/exact合成文件；oversize/hardlink在读前拒绝，directory/junction/missing边界通过。新factory固定524474字面payload字节，元数据index与payload保留；该probe不代表新Z同意API已实现。

三条基线并行各jobs1/独立target与cache，Y最多一个私有Chrome，派前原生窗口总数0。无真实用户数据/旧fixture内容读取、无安装/下载依赖、删除/ACL/移动或上游运行。

## 明确提速方式

接口和文件归属提前冻结，Y凭冻结双向回放可独立实现，不等待X产品；Z不依赖X/Y。负控按风险定向跑，不再把每个负控扩大成整套原生UI；稳定字节两个生产负控→逐次原字节恢复，干净SHA完整final一次。X整单窗口上限6（native最终3窗，真正token接线红1窗），Y/Z原生窗0。资源与结束检查写入票面。

X→Y实际固定程序/开始/进度/合作取消/再扫/W报告下载在两单收齐后由总控做联合验收。Z与页面的额外内容同意/新来源侧车是明确后续依赖，不能塞回旧V/W ordinary_content_read=false协议。

## 派前失败与证据

归档首次运行另遇平台baseline默认浏览器上下文的已下载文件在关闭后不存在：原probe在运行时的实际字节断言通过，原目录原样保留；没有用冻结Q重构冒充附件。总控独立再跑一次私有context→真实W服务→实际鼠标下载，关闭context前保存原字节副本及新回执，归档该份真实新下载。无新X/Y实现或原生窗口。归档重入只允许已存在目标逐字节相同，不覆盖差异文件。

[勘误01](INTERACTIVE-PREFLIGHT-ERRATUM-01-20261019.md)记录初版8e73790三门在最前冻结审计失败（未构建/未fixture/未UI），及随后3次0窗文件日志复现。没有把重放日志冒称首轮原始文件；首轮工具输出保留于会话。只修正新证据.gitattributes自有LF和新锁中的4份此前未物理冻结旧资源之Git对象校验，旧341/产品/原锁/helper不改；原freeze.lock与原提交保持历史。准备分支由总控只快进到r2新共同SHA，之后三门完整实际通过。

[总控原字节归档](../../acceptance/wave1/controller/w1-interactive-preflight-20261019/ARCHIVE.json)含83文件/522801字节，逐项source/archive/bytes/SHA核对，含所有基线日志、失败复现、回放与实际下载、fixture index，不纳target/cache/binary/profile/physical payload。

- [WATER-W1-X实际PASSED](../../acceptance/wave1/controller/w1-interactive-preflight-20261019/x/2026-10-19T08-56-16.016Z-23460-baseline-result.json)
- [WATER-W1-Y实际PASSED](../../acceptance/wave1/controller/w1-interactive-preflight-20261019/y/2026-10-19T08-56-16.030Z-14748-baseline-result.json)
- [WATER-W1-Z实际PASSED](../../acceptance/wave1/controller/w1-interactive-preflight-20261019/z/2026-10-19T08-56-16.042Z-25976-baseline-result.json)

新产品测试数仍为0；A–W及七补单只是原Windows受控验收保持。真实用户scope、恶意竞态、自然手势/来源鉴真、macOS、桌面壳/打包/发布与M1仍未验收。后续以单票实际回执收单、独立验收后集成，旧票不重复外贴。
