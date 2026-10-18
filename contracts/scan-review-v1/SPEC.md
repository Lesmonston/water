# Scan Review v1 — 实际A/E/H/Q报告预览与默认脱敏下载

prototypes/scan-review，零npm ES modules，仅复用真实../report-reader/model.mjs的assertReportView/selectFindings/formatBytes，不复制或改I。只依赖已验收A/E/H/I/Q和冻结供数，不依赖R或S在途实现。沿用既有页面设计，中文清晰说明来源和Unknown，不引入新设计系统。

输入严格{bundle_version:"water.scan-review-bundle.v1",snapshots:[...]}，1..32。每snapshot严格{source_kind,view,summary,redacted_json}，source_kind仅retained_j_capture/synthetic_memory，是caller声明、非鉴真。view用真实I.assertReportView，scan_id唯一；summary精确H键/枚举/计数和view一致，totals完整原值不重算。redacted_json是实际Q.to_json的紧凑原字节UTF-8文本，<=16777216，解析后JSON.stringify必须恰等于原string（拒绝重复键/空白/非规范编码），校验Q严格9顶层和嵌套白名单、版本/profile/false、summary相等、scope/findings/issues按原序局部alias和view的所有固定字段/计数/size相符。不得输出路径、自由文本或额外映射；无本地重新“脱敏”替代真实Q输出。JS只核展示一致性，不代替Rust A/Q验证或来源真实性。

model.mjs恰公开assertReviewBundle(bundle)（成功返回原bundle，失败Error('Unsupported scan review.')）、selectSnapshot(bundle,scanId)（先验证，未知null）、exportText(bundle,scanId)（先验证，存在返回已核redacted_json原字节，未知抛固定错）、selectFindings/formatBytes（重导出I）。输入不变，不能按scan_id/case预置结果。

server.mjs export async startServer({bundle,port=0}={})返回{server,url,close}，import不自启。先真实本页assertReviewBundle再捕获不可变完整JSON（UTF-8<=67108864），同时捕获每snapshot原redacted_json字节。无文件/fixture/CLI/env输入fallback。精确127.0.0.1、Host/GET/HEAD、no-store/nosniff/no CORS/Referrer-Policy no-referrer；CSP与既有K/O相同。固定raw路由/、/styles.css、/app.mjs、/model.mjs、/report-reader/model.mjs、/reports.json；导出route只建`/exports/1.json`..`/exports/N.json`映射，严格不接受query/编码/fragment/穿越/重复斜线/路径参数。导出Content-Type application/json;charset=utf-8，Content-Disposition attachment; filename="water-report-1.json"等固定序号，无用户ID/路径/原名；Content-Length精确原Q UTF-8 bytes。HEAD同长度无正文。固定资源realpath拒绝symlink/junction逃逸，错误净化无绝对路径；开始后caller突变不影响任何JSON/下载。

页面持续只读/受控来源与非真实用户目录提示；选择全部snapshot、状态/来源标签、scope覆盖/根issue/取消空态、分类/风险/来源总量与过滤列表，Unknown不变0、筛选不重算整份总量。详情显示完整原E证据/保护/size（textContent/DOM，无innerHTML/动态脚本/任意URL），可访问dialog/Escape/焦点返回。默认导出区先展示本份完整Q文本、去除哪些字段/精确数量仍可关联说明；显式按钮“下载脱敏报告”，下载对应整个当前snapshot的Q原字节，过滤不改输出。换snapshot必须同步preview/导出ordinal，禁止下载view/summary代替Q、禁止“导出原始报告”或上传/扫描/目录选择/删除控件。

1440×1000和900×800无水平溢出，大数原u64 string完整。浏览器真实点击按钮经HTTP attachment下载至本树.local/browser-lab/新私有目录；核实际文件字节与Q、下载名/headers、canary原路径/ID/证据不出现；不能仅fetch/字符串比较冒充下载。保留三新截图scan-review-1440x1000.png、scan-review-900x800.png、scan-review-export.png。

tests/model.test.mjs三个顶层review_bundle_validation、review_selection_and_privacy、review_export_bytes；tests/browser.test.mjs两个顶层review_live_input_and_download、review_layout_and_safety。24份真实A/E/H/Q供数全部通过、9原A错误仅供来源baseline，新增非法bundle/额外Q字段/Unknown0/错误alias/跨snapshot导出必须拒绝。两个不同caller bundle和改scan_id经过实际server→HTTP→Chrome→真实下载，启动后caller突变隔离，动态HTML字面、键盘、精确路由攻击/HEAD/Host/CSP验证。

行为T_BEHAVIOR；nc1真实导出route改发view而非Q字节→T_REDACTED_ONLY；nc2UI导出ordinal固定1导致换snapshot仍下首份→T_SELECTED_EXPORT；nc3Unknown显示0→T_UNKNOWN_PRESERVED。每项完整五红/原字节恢复五绿；编译/SyntaxError/CDP/下载超时不算有效红。final check/test/browser三门，最多一个私有Chrome，固定180秒子命令。无物理fixture/真实用户目录或桌面原生保存对话框权限；本票只浏览器下载受控报告。
