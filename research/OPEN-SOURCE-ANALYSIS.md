# Water 开源源码研究：总控结论

日期：2026-10-17。阶段：W0静态研究完成；应用与真实删除尚未实现。来源锁记录五个本地checkout；审阅后均保持未修改。

## 决策

**Water 独立建立扫描/证据/计划内核，暂不选择某个竞品直接fork为产品。** 开源项目可以帮助理解规则覆盖、工程组织和交互，但本轮没有找到可直接继承Water全部安全要求的内核。此判断限定于已读commit和当前需求，不是对上游产品或未来版本的安全认证。

不以“开源功能很多”推断可安全复用，也不以“发现静态缺口”推断Water已经有竞争优势。下一阶段用受控夹具证明自己的实现，再进行授权实机对照。

## 五个固定样本

| 项目/commit前缀 | 实际看到了什么 | 值得借鉴 | Water不能直接继承 |
|---|---|---|---|
| Jharu `ca1d2ec` | Rust规则、模型inventory、Ollama引用计数、Tauri通用trash入口 | 按工具和对象解释、读取错误可见、共享层意识 | 通用路径执行、混合数据根操作、atime使用判断、Trash计freed |
| Developer Machine Cleaner `77b2795` | marker扫描、后台任务、session候选集、末级链接拒绝、逐项结果 | 后端候选范围、扫描与UI隔离、默认不选、错误结果 | session只绑定路径；父链/身份复核不足；模型根混有配置凭证；容量语义 |
| Mole main `03e77be` | 模块化CLI、保护名单、三态活跃探测、最后执行门、特定对象身份复核、回归用例 | 保护失败关闭、执行门、预览去重、工具专用协调 | Shell耦合、部分启发式规则、直接删除/清Trash、uv不可用时手动清缓存 |
| Kondo `1d351ca` | marker/产物映射、core与CLI分离、mtime筛选、直接remove_dir_all | 项目视图、规则映射、dry-run | 静态目录等同可删、逻辑长度当回收量、直接删除与错误协议 |
| npkill `bfc0768` | worker队列、取消/进度、profiles/JSON、链接跳过、直接平台删除 | 交互扫描、输出协议、分块任务 | basename安全判断、path删除API、权限错误忽略、无身份/恢复协议 |

完整证据：[Jharu](reviews/JHARU.md)、[Developer Machine Cleaner](reviews/DEV-MACHINE-CLEANER.md)、[Mole](reviews/MOLE.md)、[Kondo/npkill](reviews/KONDO-AND-NPKILL.md)。精确commit与许可证见 [upstreams.lock.json](upstreams.lock.json)。

## 总控抽查确认的关键事实

### 1. “放入回收站”与“磁盘释放”被混淆

Jharu的通用执行器对路径测量逻辑长度，trash成功就累加`freed_bytes`。这证明当前代码的统计口径，不证明已回收宿主磁盘块。[源码](https://github.com/riponcm/Jharu/blob/ca1d2ec22bc5036f615f50f9415aa20a31c01da1/src-tauri/src/lib.rs#L24-L50)

Water必须区分逻辑大小、实际分配、预计可回收、已移入回收站与宿主实测变化；没有能力精确估算时保留unknown/区间。此要求直接进入W-F05/W-F11。

### 2. 扫描会话白名单有价值，但还不是完整执行边界

Developer Machine Cleaner只允许会话候选路径，末级symlink/reparse也会拒绝，是确实存在的防线。但session保存的是路径集合，clean_one没有绑定扫描时的卷/文件身份；保留8个session不等于一次性且短时有效的清理计划。[session](https://github.com/Maks417/DevMachineCleaner/blob/77b279513e6a2271960312d9b4068a33bd84394c/src-tauri/src/state.rs#L10-L77)、[执行器](https://github.com/Maks417/DevMachineCleaner/blob/77b279513e6a2271960312d9b4068a33bd84394c/src-tauri/src/cleaner.rs#L23-L89)

Water的scope/finding/plan协议需要同时明确用户选择、真实对象、规则版本、有效性与执行状态。不可伪造ID能限制任意输入，仍需界面信任假设与执行前复核，不能自称完全抵御被控前端。

### 3. 模型/缓存根不等于纯垃圾

两个Tauri项目均有把HF home等整根作为可操作项的路径；HF官方说明HF_HOME同时存缓存和token。源码事实与外部工具契约结合后，足以要求Water不照搬该规则，仍不能说本轮已观察到真实凭证被删除。见两份审阅的详细调用链与引用。

### 4. 比较成熟的保护模式也不能不加判断继承

Mole main具有细致的状态/名单/执行门处理，说明Water应把工程投入放到这些环节而非单纯扩大目录清单。`clean_uv_cache`在uv存在且可探测时用原生prune，在工具缺失或版本探测失败分支手动清已知路径；**不是**prune失败后无条件转手动删除。Water遇到这种无法遵守工具缓存契约的情况应保持只读。[具体分支](https://github.com/tw93/Mole/blob/03e77bec6746fb08588a7ae9188b794feb35e83d/lib/clean/dev.sh#L98-L109)

Mole Windows分支只核对存在、README与LICENSE，不把main的Bash审阅当Windows实现验收。原生付费App未获取源码，不能将App宣传归到开源CLI。

### 5. 项目标记证明生态，不证明每个目录没有价值

Kondo的规则将Jupyter检查点、Unreal Saved等归为产物；clean函数直接递归删除。Water可以借鉴项目分组，却必须重新设计用途、资产保护和重建条件。[规则](https://github.com/tbillington/kondo/blob/1d351ca80b3d3adfad9bbe7db872c27359190210/kondo-lib/src/lib.rs#L47-L78)、[执行](https://github.com/tbillington/kondo/blob/1d351ca80b3d3adfad9bbe7db872c27359190210/kondo-lib/src/lib.rs#L316-L329)

## 工程取舍

- **自研优先**：对象与证据契约、版本适配器、保护策略、已知引用与空间口径、具体计划及失效、受限执行、恢复/审计。
- **借鉴后独立实现**：项目marker、后台任务与取消、按工具说明、错误显式化、白名单失败关闭、活跃三态、预览ledger、结构化报告。
- **暂不引入**：任意上游完整执行器、通用目录清理表、GPL模块、竞品UI或文案。
- **技术方向**：Rust内核、Tauri桌面壳、TypeScript/React；先只读fixture，后UI和受限清理。工具链与双平台构建仍待验证。
- **许可与来源**：输入目录被忽略，不形成嵌套vendor/submodule；无产品代码复制。发布前另做依赖、资产、NOTICE与商标审查。

## 接下来验证什么

W1只验证用户选择范围内的只读扫描、证据输出、链接边界、重叠去重、权限/取消与unknown状态。W2/W3扩展工具inventory。M1通过后才能用W5开放一个原生工具清理闭环。

本轮没有运行五个项目的安装、构建、测试、扫描和清理；没有证实竞态利用、跨平台恢复或容量实测。分析结论全部是固定版本静态证据或明确标注的推导。不得将“读过源码”宣传成“安全审计通过”，不得对外发送未授权的漏洞报告。
