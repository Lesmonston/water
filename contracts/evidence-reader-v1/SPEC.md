# Evidence Reader v1 — L/M实际输出页面

总控2026-10-18冻结。prototypes/evidence-reader，零npm，ES modules，复用真实../lab-reader/model.mjs及其../report-reader/model.mjs，不复制/修改旧模型。无N依赖。只展示调用方内存数据，无目录选择/扫描/上传/下载/执行/shell。静态资源和模型严格白名单；不使用物理fixture。

## 输入与公共API

bundle严格{bundle_version:"water.evidence-reader-bundle.v1",snapshots:[...]}，1–32份；每份严格{source_kind,session,project_evidence,size_ledger}。source_kind仅retained_j_capture或synthetic_memory，是调用方声明，非真实性认证。session保持旧J严格六字段，不新增字段：由真实K.assertSessionBundle({bundle_version:"water.lab-reader-bundle.v1",snapshots:sessions})校验。scan_id唯一。实际13保留J捕获+5内存变体由冻结sessions.json供给，PROVENANCE明确真实与合成、不冒称新J扫描/macOS。

model.mjs恰公开assertEvidenceBundle(bundle)（成功返回bundle，失败Error('Unsupported evidence bundle.')）、selectSnapshot(bundle,scanId)（返回匹配snapshot，未知ID返回null；先验证）、selectFindings（复用K/I）、formatLedgerBytes(value)（null→'Unknown'，规范十进制字符串不超过u128→精确十进制+' B'，非法抛同一固定错；不得Number/按u64截断）。可增加私有helper，无其他公开接口。

对每份L/M按各SPEC精确键/版本/类型/枚举验证，shared headers read_only/scan_id/source_run_id/platform/status/source_facts/source_totals须分别等于session实际来源。验证counts非负u32、候选/identity groups/unknown refs的finding_id、scope_id和原entry关联；候选必须普通file且rule/path/parent/filename_only/三个false/display_only/protected/coverage匹配四规则；候选完整性/非File匹配数量准确。M counts、组refs/Unknown refs覆盖File且每ref恰一次、group(device,inode)不重复、known/Unknown身份及sorted unique values/conflict状态/布尔/null边界符合M SPEC，禁止Unknown/null改0。不重算/替换session或source_totals，注释明确JS展示验证不替代Rust校验或来源真实性验证。关联按map/index，避免10000项全配对。输出不修改输入；筛选只筛可见findings，不重算整份snapshot指标。

## server.mjs

export async function startServer({bundle,port=0}={})，返回{server,url,close}，close返回Promise。先调用真实本页assertEvidenceBundle，再捕获不可变JSON字节，UTF-8<=67108864；不截断。仅127.0.0.1、精确Host、GET/HEAD、不接受query/fragment/编码/重复斜线/路径穿越或任何输入路径/文件/CLI/env fallback。与K相同CSP default-src 'none';script-src 'self';style-src 'self';connect-src 'self';form-action 'none';frame-ancestors 'none';base-uri 'none'，no-store/nosniff/无CORS，错误净化且无绝对路径。7个精确raw route：/、/styles.css、/app.mjs、/model.mjs、/lab-reader/model.mjs、/report-reader/model.mjs、/evidence.json。资源realpath固定且拒绝symlink/junction逃逸；启动无输入或非法bundle失败，不能私读默认fixture。import无副作用启动。

## 页面

持续显示只读/受控来源提示、当前来源类型和未接真实用户目录说明；可选择全部snapshot，scan ID/状态/平台/scope覆盖/原issues完整可见。保留根issue relative_path=""的scope根含义，取消空观察不说磁盘为空。展示L四规则候选、文件名弱证据/三个未验证字段、display_only/protected；不提升分类或归属。展示M观察File字节、已知组一次字节、Unknown观察字节、观察集合去重值（null明确Unknown）、观察身份完整性与scope覆盖分开；volume_unique_allocated_bytes/reclaimable_bytes为Unknown。超过u64的u128值精确显示，不调用I.formatBytes或Number。

findings有搜索/类别/风险筛选、计数和可访问详情；详情完整展示原证据/保护原因、L候选和M组/refs/冲突值，原生dialog、Escape关闭和焦点返回。动态文本一律textContent/DOM API，无innerHTML/动态URL/脚本插值/网络第三方资源；恶意HTML标识字面呈现。1440×1000、900×800无水平溢出，键盘可用；沿用现有页面视觉系统，非新设计系统。

## 五测试与实入口

tests/model.test.mjs三个顶层evidence_reader_bundle、evidence_reader_selection、evidence_reader_annotations；tests/browser.test.mjs两个顶层evidence_reader_live_input、evidence_reader_layout_and_safety，无额外子测试/skip。完整冻结18输入、非法headers/关联/false升级/Unknown归零/重复漏ref/超大数字；有新scan_id的两个不同caller bundle经真实startServer→HTTP→Chrome渲染，启动后修改调用方对象不影响捕获；检查7路由/HEAD/Host/method/编码穿越/query/CSP。实际选择18份snapshot，检验Unknown、两个冲突类型、u128、source_kind、根issue和empty状态。使用scripts/browser-lab.mjs，最多一个Chrome，保留新截图evidence-reader-1440x1000.png、evidence-reader-900x800.png、evidence-reader-detail.png至.local/browser-lab。

行为红O_BEHAVIOR；三个实生产负控：服务捕获截短snapshots→O_SERVER_CAPTURE；UI把null去重值显示0→O_LEDGER_UNKNOWN；动态textContent改innerHTML→O_TEXT_LITERAL。全部完整五测红/恢复suite，SyntaxError/超时/缺资源不算。final check/test/browser三门；browser实际独立profile，禁止仅在模型内改bundle冒充服务接线测试。
