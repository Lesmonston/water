WATER-W1-O 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/o/docs/dispatch/reports/WATER-W1-O-REPORT.md

# O 执行回执

状态：SUBMITTED，待总控独立验收；未自行标记 VERIFIED、合主线或 push。日期：2026-10-18（Asia/Tokyo）。实际执行者：Codex / GPT-6，当前会话未提供更细构建标识；没有分包或启动子代理。

## 基线与交付范围

工作树 `F:/new/smaltalk/water/.worktrees/o`，分支 `worker/water-w1-o`，精确基线 `75cf4db7607a382673a2146ca69732a5110c1579`，tag `water-w1-next-core-base-20261018`。初始 HEAD、分支、干净状态及产品目录不存在均符合票面；主 manifest 的 O 状态为 READY。开工重复 baseline 通过，98 新锁条目与八旧锁合计 198 唯一文件实际校验通过。记录见 [START-AUDIT.json](../../acceptance/wave1/o/START-AUDIT.json)。

完整受测实现提交：`62a8ef12eae55f8414a1c24a774905f4769e6a26`（`feat: add caller-fed evidence and observed-size reader`）。该提交包含八个指定产品/测试/README 文件与启动审计。三个 final 门均在此 SHA、前后干净状态下串行通过。此后只新增本报告、原始证据与证据索引，没有追加产品或测试变更。

改动仅在 `prototypes/evidence-reader/` 八个白名单文件、本报告及 `docs/acceptance/wave1/o/`。未修改旧 K/I/L/M、helper、契约/冻结、主 manifest/台账、根 Cargo、N/其他工作树或上游。没有新增依赖、package.json、安装、物理 fixture、目录扫描或用户数据访问。

## 需求对照

| 要求 | 交付及验证 |
|---|---|
| 真实复用旧模型 | O 模型直接 import K `assertSessionBundle`，直接 re-export I `selectFindings`；测试核对同一函数及服务返回的旧模块原文。未复制旧模型逻辑。 |
| 严格 bundle 与来源关联 | 精确两个 bundle 键、四个 snapshot 键、1–32 份、唯一 scan ID、source_kind 两值；K 先验证六字段 session，再逐值核对 L/M 的精确版本、头、完整 facts/totals、counts、全部候选与 refs。非法来源、缺失/重复/错 scope refs、false 升级及 Unknown 归零均拒绝，O 错误固定为 `Unsupported evidence bundle.`。 |
| L 四规则与保护边界 | 候选按原序与普通 File basename 精确匹配；父路径、四规则、ecosystem、覆盖及非文件计数核对。保留 filename_only、三个 false、display_only / protected；旧 unknown 类别及 protected 风险不变。 |
| M 大整数与身份 | 使用 BigInt 做展示一致性核验，规范 u128 原值格式化；校验分组顺序、device/inode、去重数值升序、长度/link_count 冲突、恰好覆盖所有 File 的 refs、Unknown 独立条目和 null/布尔边界。按 map 分组及源序索引，无全配对关联。 |
| 只读内存服务 | `startServer({bundle,port=0})` 返回 `{server,url,close}`；先验证再捕获完整不可变 UTF-8 JSON，64 MiB 上限。import 不自启，无 CLI/env/文件/fixture 默认输入。只读取固定页面资源。 |
| HTTP 边界 | 仅 127.0.0.1、精确 Host、GET/HEAD；七条精确 raw 路由；query/fragment/编码/重复斜线/穿越等返回净化错误。精确 CSP、no-store、nosniff、无 CORS；静态路径 realpath 核验。 |
| 页面与完整含义 | 显示 source_kind 为调用方声明，持续只读/非真实用户目录提示；scope 根 issue 的空串与 null 分开，保留取消、问题、平台和覆盖。L 候选与 M 字节/身份组分别展示；scope 覆盖和观察身份完整性独立，Unknown 不变 0，空观察不称磁盘空，卷唯一/回收量恒 Unknown。来源 totals 原值显示，筛选不改总量。 |
| 交互与文本安全 | 沿用 K/I 的字体、色彩与布局；搜索、scope/工具/类别/风险/排序与计数；详情显示原 finding/entry、证据、保护原因、候选、组全部 refs 及冲突值。原生 dialog、Tab 焦点保持、Escape/关闭及焦点返回通过。动态文本使用 textContent/DOM API，无动态 URL。无目录选择、扫描、上传、导出、删除或 shell 控件。 |
| 页面尺寸 | 1440×1000、900×800 的真实 Chrome 页面与详情检查通过，无水平溢出；大数字设置可换行。三张要求的新截图已生成、查看并原字节归档。 |

七条路由：`/`、`/styles.css`、`/app.mjs`、`/model.mjs`、`/lab-reader/model.mjs`、`/report-reader/model.mjs`、`/evidence.json`。

## 输入、真实服务与五测试

冻结 `sessions.json` 的完整 18 份在每次 helper 运行核验来源 SHA，并经模型全部验证：13 份保留 J 捕获 `pipeline-0` 至 `pipeline-12`；五份人工内存样本 `evidence-ui-known-hardlinks`、`evidence-ui-length-conflict`、`evidence-ui-link-count-conflict`、`evidence-ui-beyond-u64`、`evidence-ui-four-root-rules`。它们来自冻结的真实 G/A/E/H/L/M API 输出；未重跑资产准备或发起 J 新扫描。source_kind 不构成真实性认证，人工 Unix 身份不代表 macOS 实机。

两个不同调用方 bundle 均通过真实 `startServer → HTTP → Chrome`：

- A：18 份，首份从 `pipeline-0` 改为 `caller-alpha`，一个普通文件路径及证据改为恶意 HTML 字面样本，同步相关 facts，来源声明改为 synthetic_memory。真实页面逐份选择全部 18 份，检查字节/Unknown、两类冲突、完整 refs、四规则、根 issue 和取消空态。
- B：3 份（已知硬链接、超过 u64、四规则），首份从 `evidence-ui-known-hardlinks` 改为 `caller-beta`，同样含字面文本样本。HTTP 和 Chrome 均核对该独立输入与改名 ID。

每个服务启动后都突变调用方对象字段并移除数组元素，完整 HTTP JSON 仍等于启动前快照；Chrome 选项与内容也来自捕获字节。没有用模型内切换代替服务接线。检查七路由 GET/HEAD 的正文/长度与 headers、四类非法方法、错误 Host、raw 攻击、真实旧模块、字面 HTML、全部请求同源且无页面异常/CSP 错误。

测试文件自首次行为红至最终提交字节不变，精确五顶层，无子测试、skip、todo 或筛选：

| 文件 | 测试 |
|---|---|
| tests/model.test.mjs | evidence_reader_bundle、evidence_reader_selection、evidence_reader_annotations |
| tests/browser.test.mjs | evidence_reader_live_input、evidence_reader_layout_and_safety |

包含 u128 最大值格式化、超过 u64 的 `36893488147419103230 B` 原值、非法 canonical 数字、Unknown/冲突、全部候选关联与输入不可变检查。

## 检查命令及最终结果

统一命令前缀：`node scripts/next-core-check.mjs --task WATER-W1-O --mode`。每次只一个 gate，使用既有 Node v24.16.0 和 browser-lab 私有 Chrome profile；没有增加超时、安装或并发浏览器。完整运行清单含全部失败见 [VERIFICATION.json](../../acceptance/wave1/o/VERIFICATION.json)。归档还保留了执行前已存在的总控 baseline，不冒称本会话所跑。

| 模式/参数 | 结果 | 原始 receipt（均在 helper/） |
|---|---|---|
| baseline | helper 0；只验证旧资产/K 和空白页 | 2026-10-18T06-21-09.210Z-20952-baseline-result.json |
| red-behavior | helper 0；完整五测，底层退出 1，命中 O_BEHAVIOR | 2026-10-18T06-24-10.293Z-15924-red-behavior-result.json |
| suite（稳定实现） | 5 pass / 0 fail，helper 0 | 2026-10-18T06-32-06.542Z-22364-suite-result.json |
| check --final | helper 0；五个 MJS 语法及全部 proofAudit 通过 | 2026-10-18T06-39-01.746Z-19696-check-result.json |
| test --final | helper 0；3 pass / 0 fail，proofAudit 通过 | 2026-10-18T06-39-29.909Z-28404-test-result.json |
| browser --final | helper 0；2 pass / 0 fail，proofAudit 与三张新截图通过 | 2026-10-18T06-39-40.823Z-20664-browser-result.json |

三个 final 的完整受测 SHA 均为 `62a8ef12eae55f8414a1c24a774905f4769e6a26`。稳定生产聚合 SHA-256 为 `d5aaea3f46a353a378904b1d2147753e800fe17f224a4afa3afdf83c2b210f83`，测试聚合 SHA-256 为 `d3e40735c62840ea7cb0eddc52ee1bd1105075566872e03caf4e30a3b537099c`。

## 实际负控与恢复

先写完整五测试及可运行骨架，实际运行行为红，再实现；原始行为红生产聚合哈希 `db9149c52176ccb177b62654109eb26ee355044c7cd3a89fb54d96962fd7f318`。首次五绿后补充大数列换行，随后以当前完整字节五绿建立稳定恢复证据。以下三项均临时修改真正生产逻辑、完整跑五测、底层退出 1 并命中指定目标；helper 自身退出 0 表示验证了预期红。每次随后立即按原始源码快照恢复并核验哈希，完整 suite 五绿后才进入下一项。

| 项 | 实改与命中 | 红 receipt | 恢复五绿 receipt |
|---|---|---|---|
| nc1 | server JSON 捕获将 snapshots 截为一份；O_SERVER_CAPTURE | 2026-10-18T06-33-07.122Z-7568-red-nc1-result.json | 2026-10-18T06-33-50.992Z-2620-suite-result.json |
| nc2 | UI 将 null 去重字节格式化为 0；O_LEDGER_UNKNOWN | 2026-10-18T06-34-48.219Z-31704-red-nc2-result.json | 2026-10-18T06-35-27.767Z-36712-suite-result.json |
| nc3 | 实际 DOM 节点构造的 textContent 改为 innerHTML；O_TEXT_LITERAL | 2026-10-18T06-36-07.785Z-24300-red-nc3-result.json | 2026-10-18T06-38-01.211Z-36340-suite-result.json |

原 / 坏 / 恢复的被改文件 SHA-256：

| 项/文件 | 原 | 坏 | 恢复 |
|---|---|---|---|
| nc1 server.mjs | 3cf47a3c7781afdc913b004d2e825cba89a518aa89a8e6ec4e636e2d160ecf37 | 372e11c9079b1878f08ea1a507e1947d51e4287c2079aca581f339846861a2e0 | 3cf47a3c7781afdc913b004d2e825cba89a518aa89a8e6ec4e636e2d160ecf37 |
| nc2 app.mjs | 8073f8f0a474257669454bd34b6ec148e81b991a1ce330c2f2be872710d74357 | 204343194ed4b0435be3d48e37978de0ef3941e9b1420c9fde19d80a200d4af3 | 8073f8f0a474257669454bd34b6ec148e81b991a1ce330c2f2be872710d74357 |
| nc3 app.mjs | 8073f8f0a474257669454bd34b6ec148e81b991a1ce330c2f2be872710d74357 | 1b925412f667036aa33eff7cd7bf4241fd9589014c3689eb91faf85107d7c740 | 8073f8f0a474257669454bd34b6ec148e81b991a1ce330c2f2be872710d74357 |

三个坏态生产聚合哈希依次为 `6209b0cf986393e81a79a669177cc33e326f0cde620a1fec9064c4c67af5e5b2`、`a19841182b6394e263a3a3cc3a6c9ab88632c27fe890001023328bae8f3f6381`、`1786e308d11c1214a4044e80715839978979d82918a35bb8d86302fb845cf849`；所有恢复聚合哈希均等于当前稳定生产哈希，测试聚合哈希始终相同。helper 已在三个 final 门复核四条红/恢复链及源码快照原字节。没有把语法错误、缺文件或超时计为有效负控。

## 所有非预期测试失败与剩余限制

| 失败 receipt | 实际结果与处理 |
|---|---|
| 2026-10-18T06-28-08.213Z-25692-suite-result.json | 4 pass / 1 fail：dialog 的 Tab 将焦点带出页面。增加单控件弹窗内 Tab/Shift+Tab 焦点保持；保留测试，后续完整五绿。 |
| 2026-10-18T06-31-05.115Z-19808-suite-result.json | 4 pass / 1 fail：CDP timeout: Page.navigate；相同生产/测试字节重跑 06-32 suite 五绿，没有改 helper、测试或超时。 |
| 2026-10-18T06-36-47.756Z-39868-suite-result.json | 3 pass / 2 fail：两项 Chrome 测试均在 Page.navigate 超时。检查本票私有 profile 无残留 Chrome 进程，保留 stderr/profile；相同字节重跑 06-38 suite 五绿，最终 browser 门也通过。 |

Chrome 导航的间歇超时根因未定位，属于保留的验证环境限制；未用它们证明负控。执行工具层还遇到过把 TESTS/PROVENANCE 当 Markdown 扩展名读取、系统无 python、PowerShell 管道编码及一次 patch 上下文不匹配；均已用实际 JSON 文件/既有 Node/UTF-8 纠正，没有安装工具或产生范围外改动。

64 MiB 临界拒绝、资源文件的物理 symlink/junction 替换拒绝本轮仅作源码核对，未构造相应物理测试；O 无物理 fixture 权限。来源声明不做真实性认证，JS 验证不替代 Rust 校验或授权。真实用户 scope、新物理扫描、macOS 身份 IO/实机、选择授权/有界遍历、生产竞态、桌面接线、卷唯一分配/回收量与删除均未验证，M1 尚未完成。没有越界申请、额外依赖或契约变更。

## 证据交回

helper 的全部 json/log/txt/png（包含失败和已有总控 baseline）及三张最新同名截图，合计 283 文件、3,480,381 字节，均原字节复制并逐个核 SHA-256；不纳 browser profile、缓存或二进制。完整文件清单及哈希见 [EVIDENCE-INDEX.json](../../acceptance/wave1/o/EVIDENCE-INDEX.json)，门与红绿链索引见 [VERIFICATION.json](../../acceptance/wave1/o/VERIFICATION.json)。私有 profiles/日志在原 `.local` 保留，未清理。

截图：[1440×1000](../../acceptance/wave1/o/evidence-reader-1440x1000.png)、[900×800](../../acceptance/wave1/o/evidence-reader-900x800.png)、[详情](../../acceptance/wave1/o/evidence-reader-detail.png)。helper 原始 receipt、日志和源码快照全部位于本票 `docs/acceptance/wave1/o/helper/`。只提交本票显式文件名，忽略的 log 使用 `-f` 纳入；报告提交不包含未复测产品代码。交回后停止修改，等待总控独立收单。
