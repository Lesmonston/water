WATER-W13-U1 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w13-u1/docs/dispatch/reports/WATER-W13-U1-REPORT.md

# WATER-W13-U1 执行回执

2026-11-08（JST）。实际执行者：Codex（GPT-6）。本回执表示已提交，最终验收与集成由总控处理。

## 1. 起点、提交与范围

- 工作树：F:/new/smaltalk/water/.worktrees/w13-u1；分支：worker/water-w13-u1。
- 首次 HEAD 与 tag water-w13-u1-base-20261108 均为 6b7703e84e8903d03a6c2ef0c0550187034717ac，开工时干净。
- 实现提交：631cb4096c2f8ab0be7916de406ccdcf3bdc77b7。实现与测试共 8 个文件；最终检查均在此干净提交上执行。
- 回执与 archive 生成的证据另作一个提交，没有夹带产品改动。
- 按工单顺序读通用规则、波次规则、W13 指定章节与工单，然后读三份样例、app/locations、unit/browser 测试；同时核对项目协作规则、README、STATUS、章程、工作流及 UI-M35。
- 未改依赖、package.json、其它契约、检查器、台账、其它包、远端或 Git 配置；未合并、推送或改写历史。提交身份仅在提交进程中设置为 Codex GPT-6 / codex-gpt-6@localhost。

## 2. 逐项实现

| 工单项 | 落地内容与证据 |
|---|---|
| 1.1 三份样例 | 只替换 JSON 字符串值；路径、项目名、线索 ID、复制文字、相对路径和安装包名统一使用虚构值。样例说明移除内部工单与设计文档引用。 |
| 1.2 移除跳过 | skip_remove 成功后，仅在已有结论时调用 readConclusion / conclusion_get，不再本地 markStale。not_found 清空缓存结论，并让结论/明细模式回到首页，保留其它错误的原有提示。skipItem、skipUnit 的重读路径保持。 |
| 1.3 公开前写法 | apps/water/ui/README.md 移除内部派单/补单措辞，纠正过时的跳过说明与命令数；tests/browser.test.mjs 移除内部票号注释，将测试网址与额外合成目录名改为通用例子。测试使用的项目 ID 在 unit.test.mjs 同步替换。 |
| 第 2 节测试 | 保持原 3 个 unit 与 6 个 browser 的名字及数量。UI_W13_FIXTURES 遍历三份原始样例的全部字符串值，拒绝盘根 new 目录与非许可用户目录。UI_W13_FRESH 通过实际页面操作核对移除后请求顺序、次数、卡片恢复、清理按钮可用与最新结论版本，并覆盖无缓存结论和 not_found。 |
| 第 3 节负控 | 两条都只改 app.mjs 的 removeSkip；目标失败后 git checkout -- apps/water/ui/app.mjs，校验 SHA-256，立即 browser，再 test。详见第 4 节。 |
| 界面文案 | views/locations.mjs 的跳过名单页副标题改为“设置 · 移除后立即生效”，与本次行为一致。其它页面、样式和令牌没有调整。 |

映射表仅列原值类别，不列原来的私人值：

| 原值类别 | 新值 |
|---|---|
| 本项目工作目录、项目显示名与字符串 ID | D:\code\flick、Flick、custom:flick:* |
| 其它应用项目 | D:\code\demo-app |
| 服务项目 | D:\code\server-kit |
| 引擎项目 | D:\code\engine-lab |
| 审计项目 | D:\code\audit-tool |
| 界面项目 | D:\code\ui-kit |
| 视频项目 | D:\code\video-lab |
| 工作目录的公共父级 | D:\code |
| 用户目录（含相对路径） | C:\Users\alice、Users\alice |
| 本地软件、安装目录与安装包 | Acme、F:\Apps\Acme、F:\Apps\Acme-Test、acme-setup-1.2.3.exe |
| 私有工作树与临时目录标识 | desktop-demo、runtime-demo、session-demo、integration-demo、feature-a～i、cache-a～d、fix-demo、audit-demo、example-demo、.tmp-checks、build-output |
| 媒体项目目录与含个人标识的文件名 | E:\media、session-2/4、originals、processed、session-EP03.wav、speaker-a.wav、scene-2.wav、session-3/4.m4a、speaker-b-3/4.m4a |
| 缓存目录例子 | F:\sample-cache |
| 假宿主项目网址 | https://example.com/flick |

一次性递归核对以 git show 6b7703e84e8903d03a6c2ef0c0550187034717ac:<文件> 作为基线：逐层核对 Object.keys、typeof、数组标记和长度；null 与所有非字符串原始值逐个精确比较；跨三份建立“原字符串 → 新字符串”内存表，重复原字符串必须映射一致。比较脚本直接在 Node 标准输入执行，没有新增产品脚本或把私人映射表落盘。

| 文件 | 字符串值修改处数 | 递归比较结果 |
|---|---:|---|
| contracts/checkup-v1/ui-fixtures.json | 34 | 键与类型完全一致；数组长度、数字、布尔、null 不变 |
| contracts/m3c-v1/ui-fixtures-m3c.json | 39 | 键与类型完全一致；数组长度、数字、布尔、null 不变 |
| contracts/m35-v1/ui-fixtures-m35.json | 271 | 键与类型完全一致；数组长度、数字、布尔、null 不变 |

共 344 处字符串修改、140 个不同字符串映射，跨文件一致。冻结的旧字典键原字节保留，只修改字符串值；路径盘符变化没有改动数量、体量或已有盘符 ID 字段。对最终三份样例与 UI 目录的私人标识/内部票据引用定向搜索无匹配；这不代替总控的公开导出扫描。

## 3. 旧断言与测试替身迁移

| 位置/原预期 | 新预期 | 原因与强度 |
|---|---|---|
| skip_add、skip_unit_add 返回固定过期结论 | 复制当前结论，版本末段加一；卡片跳过时精确移除目标卡 | 与跳过不过期契约一致；未去掉版本校验 |
| 卡片跳过后等待过期警告 | 无过期警告、目标卡消失、其余卡 ID 与顺序精确相等；clean_prepare 使用 cv-16Z-5d2b-2 | 旧行为被新契约替换，精确核对服务返回内容与下一次请求版本 |
| IPC 边界用例中的本项目旧字符串 ID | custom:flick:cachedir-tagged | 跟随虚构项目映射；原有精确 command/args 断言保持 |
| 缺少线索用例中的私有工作树线索 ID | clue-verify-fix-demo | 与样例线索 ID 一致；仍精确验证缺失线索时不显示复制、不复制空文本 |
| 跳过名单额外样例的私有临时目录标识 | .tmp-checks | 和三份共享样例使用同一替换，显示文字/日期仍逐行 deepEqual |
| 关于页面测试的真实项目网址 | https://example.com/flick | 样例使用保留域名；关于三行、复制网址与诊断 JSON 仍逐字比较 |
| m3c 样例变量原先覆盖合并基础样例 | 分别读取并递归检查基础、m3c、m35 三份 | 避免覆盖合并遗漏原始字符串；其它旧断言没有减少 |

没有因路径变短而降低截断、排序、数量或页面可用性的断言。新增的设置导航操作最初漏等 hash 路由完成，出现 missing settings-skip；已在这两处新增操作前等待子页按钮出现，没有修改旧测试时限。

## 4. 检查与负控

以下所有检查的工作目录都是指定工作树；表中的“参数”完整接在同一命令之后：

    node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W13-U1

负控的检查器退出码为 0 代表成功观察到预期失败；其内部 Node 测试退出码为 1。正式采信 nc1 首轮及 nc2 第二轮：两者均只有 ui_v2_pages_layout_a11y 以 UI_W13_FRESH 失败，5 通过 / 1 失败，错误为缺少移除后的结论重读（实际次数 1，预期 2），没有编译、模块或超时失败冒充目标失败。

- nc1：removeSkip 改回 skip_remove 后 markStale，不重读。
- nc2：removeSkip 只取回 locations，既不 markStale 也不重读。
- 每次恢复的 app.mjs SHA-256 都是 5aec75ff148db79c04b420464a84637ab6dfbe46c9360f5f805c3c0b8f0017e4。
- nc2 首轮虽被检查器判 passed，但旧查重用例先等待 .dedupe-row 失败（该用例 31,062.3956 ms），因此本回执不采信该轮为有效负控。原样重跑 1 次，查重用例通过（16,114.6823 ms），仅目标断言失败。没有放宽时限、删除断言或修改该旧用例。
- 其它计时重跑：无。最初 unit/browser 红分别用于先复现脱敏和刷新问题；开发中另一次 browser 红来自上述新增导航等待缺失。
- 检查器 proofAudit 目前从 test 记录寻找恢复证据，所以每次依工单先恢复并立即 browser 后，又运行 test。未修改检查器。最新 test --final 引用有效 nc1/nc2 及对应恢复 test。
- 三个 final 均重新运行在同一个干净实现 SHA 上，最终 browser 6/6、unit 3/3，全部必需截图 28/28。所有早期失败和旧轮次保留，未覆盖删除。

| UTC 开始时间 | 参数 | 检查器退出码 / 结果 | 回执 |
|---|---|---|---|
| 2026-11-07 16:33:55.063 | --mode baseline | 0 / passed | [JSON](../../acceptance/wave13/u1/receipts/2026-11-07T16-33-55.062Z-29924-baseline-result.json) |
| 2026-11-07 16:36:36.393 | --mode test | 1 / 预期红：原样例未脱敏 | [JSON](../../acceptance/wave13/u1/receipts/2026-11-07T16-36-36.390Z-35624-test-result.json) |
| 2026-11-07 16:38:09.800 | --mode browser | 1 / 预期红：原 removeSkip 未重读 | [JSON](../../acceptance/wave13/u1/receipts/2026-11-07T16-38-09.798Z-26128-browser-result.json) |
| 2026-11-07 16:41:12.479 | --mode check | 0 / passed | [JSON](../../acceptance/wave13/u1/receipts/2026-11-07T16-41-12.477Z-25288-check-result.json) |
| 2026-11-07 16:41:18.692 | --mode test | 0 / passed | [JSON](../../acceptance/wave13/u1/receipts/2026-11-07T16-41-18.690Z-37380-test-result.json) |
| 2026-11-07 16:41:29.185 | --mode browser | 1 / 开发红：新增导航步骤未等页面就绪 | [JSON](../../acceptance/wave13/u1/receipts/2026-11-07T16-41-29.183Z-15168-browser-result.json) |
| 2026-11-07 16:42:59.288 | --mode browser | 0 / passed | [JSON](../../acceptance/wave13/u1/receipts/2026-11-07T16-42-59.287Z-12364-browser-result.json) |
| 2026-11-07 16:45:38.009 | --mode red-nc1 | 0 / passed | [JSON](../../acceptance/wave13/u1/receipts/2026-11-07T16-45-38.006Z-2520-red-nc1-result.json) |
| 2026-11-07 16:46:48.133 | --mode browser | 0 / passed | [JSON](../../acceptance/wave13/u1/receipts/2026-11-07T16-46-48.131Z-34660-browser-result.json) |
| 2026-11-07 16:48:06.300 | --mode test | 0 / passed | [JSON](../../acceptance/wave13/u1/receipts/2026-11-07T16-48-06.299Z-27732-test-result.json) |
| 2026-11-07 16:48:10.591 | --mode red-nc2 | 0 / 检查器 passed；本报告不采信为负控，另有查重等待失败 | [JSON](../../acceptance/wave13/u1/receipts/2026-11-07T16-48-10.589Z-24844-red-nc2-result.json) |
| 2026-11-07 16:49:27.136 | --mode browser | 0 / passed | [JSON](../../acceptance/wave13/u1/receipts/2026-11-07T16-49-27.134Z-6992-browser-result.json) |
| 2026-11-07 16:50:41.662 | --mode test | 0 / passed | [JSON](../../acceptance/wave13/u1/receipts/2026-11-07T16-50-41.661Z-12928-test-result.json) |
| 2026-11-07 16:50:45.860 | --mode check --final | 0 / passed | [JSON](../../acceptance/wave13/u1/receipts/2026-11-07T16-50-45.858Z-28960-check-result.json) |
| 2026-11-07 16:50:54.282 | --mode test --final | 0 / passed | [JSON](../../acceptance/wave13/u1/receipts/2026-11-07T16-50-54.279Z-22808-test-result.json) |
| 2026-11-07 16:51:00.934 | --mode browser --final | 0 / passed | [JSON](../../acceptance/wave13/u1/receipts/2026-11-07T16-51-00.933Z-29744-browser-result.json) |
| 2026-11-07 16:52:36.471 | --mode red-nc2 | 0 / passed | [JSON](../../acceptance/wave13/u1/receipts/2026-11-07T16-52-36.470Z-29880-red-nc2-result.json) |
| 2026-11-07 16:54:40.602 | --mode browser | 0 / passed | [JSON](../../acceptance/wave13/u1/receipts/2026-11-07T16-54-40.601Z-3604-browser-result.json) |
| 2026-11-07 16:55:50.323 | --mode test | 0 / passed | [JSON](../../acceptance/wave13/u1/receipts/2026-11-07T16-55-50.321Z-7528-test-result.json) |
| 2026-11-07 16:55:54.878 | --mode check --final | 0 / passed | [JSON](../../acceptance/wave13/u1/receipts/2026-11-07T16-55-54.876Z-22864-check-result.json) |
| 2026-11-07 16:56:04.229 | --mode test --final | 0 / passed | [JSON](../../acceptance/wave13/u1/receipts/2026-11-07T16-56-04.228Z-6160-test-result.json) |
| 2026-11-07 16:56:07.835 | --mode browser --final | 0 / passed | [JSON](../../acceptance/wave13/u1/receipts/2026-11-07T16-56-07.833Z-10644-browser-result.json) |
| 2026-11-07 16:58:42.933 | --mode archive | 0 / passed | [JSON](../../../.local/checks/WATER-W13-U1/2026-11-07T16-58-42.931Z-34604-archive-result.json) |

归档还包含工作树原有的 16:14:21 UTC 派前 baseline 回执，它不是本执行者运行的检查。日志与源码快照由检查器原样收集；archive 自身的结果记录写在归档完成之后，所以上表该行链接到本树 .local。已逐项重算 ARCHIVE.json 中 905 个条目的字节数与 SHA-256，全部相符，共 34,491,015 字节。

## 5. 截图与人工核对

28 张必需截图全部由最新 browser --final 重拍。已逐张查看同一实现的绿色浏览器运行截图，并核对最终 28 张与所查看版本的 SHA-256 全部一致。1240×820 为常规尺寸，home-narrow 为 1040×720；自动检查包含横向溢出、主按钮数量、键盘焦点与减少动效。

对照仓库已有的第十二波整合截图（2026-11-07T15-19-42.024Z-18388）：13 张 PNG 原字节一致，15 张因虚构样例或副标题变化而不同。下表列出全部画面；样式、数字和服务列表顺序没有另行调整。

| 截图 | 与既有画面的差异 |
|---|---|
| [v3-confirm-1240x820.png](../../acceptance/wave13/u1/screenshots/2026-11-07T16-56-07.833Z-10644/v3-confirm-1240x820.png) | 选中泄漏项名称改为 fix-demo / .tmp-checks；隔离缺省、字节数与提示保持。 |
| [v3-confirm-direct-1240x820.png](../../acceptance/wave13/u1/screenshots/2026-11-07T16-56-07.833Z-10644/v3-confirm-direct-1240x820.png) | 同样更新选中项名称；直接删除橙红按钮与确认说明保持。 |
| [v3-dedupe-1240x820.png](../../acceptance/wave13/u1/screenshots/2026-11-07T16-56-07.833Z-10644/v3-dedupe-1240x820.png) | 录音文件名与路径改为 media / session / speaker 通用例子；树图标签按原逻辑截断，窄块下方仍有完整名称。 |
| [v3-dedupe-intro-1240x820.png](../../acceptance/wave13/u1/screenshots/2026-11-07T16-56-07.833Z-10644/v3-dedupe-intro-1240x820.png) | 与既有截图原字节一致。 |
| [v3-dedupe-menu-1240x820.png](../../acceptance/wave13/u1/screenshots/2026-11-07T16-56-07.833Z-10644/v3-dedupe-menu-1240x820.png) | 与既有截图原字节一致。 |
| [v3-details-1240x820.png](../../acceptance/wave13/u1/screenshots/2026-11-07T16-56-07.833Z-10644/v3-details-1240x820.png) | 与既有截图原字节一致。 |
| [v3-done-1240x820.png](../../acceptance/wave13/u1/screenshots/2026-11-07T16-56-07.833Z-10644/v3-done-1240x820.png) | 与既有截图原字节一致。 |
| [v3-drawer-1240x820.png](../../acceptance/wave13/u1/screenshots/2026-11-07T16-56-07.833Z-10644/v3-drawer-1240x820.png) | 用户目录改为 alice，四行路径正常显示；勾选和占用说明保持。 |
| [v3-drawer-big-1240x820.png](../../acceptance/wave13/u1/screenshots/2026-11-07T16-56-07.833Z-10644/v3-drawer-big-1240x820.png) | 背后的结论标题/路径变更；前景六行汇总及合计保持。 |
| [v3-history-1240x820.png](../../acceptance/wave13/u1/screenshots/2026-11-07T16-56-07.833Z-10644/v3-history-1240x820.png) | 与既有截图原字节一致。 |
| [v3-home-1240x820.png](../../acceptance/wave13/u1/screenshots/2026-11-07T16-56-07.833Z-10644/v3-home-1240x820.png) | 与既有截图原字节一致。 |
| [v3-home-narrow-1040x720.png](../../acceptance/wave13/u1/screenshots/2026-11-07T16-56-07.833Z-10644/v3-home-narrow-1040x720.png) | 与既有截图原字节一致；1040×720 无横向溢出。 |
| [v3-home-new-1240x820.png](../../acceptance/wave13/u1/screenshots/2026-11-07T16-56-07.833Z-10644/v3-home-new-1240x820.png) | 新增位置显示为 demo-app；单独选中和列表滚动保持。 |
| [v3-intro-1240x820.png](../../acceptance/wave13/u1/screenshots/2026-11-07T16-56-07.833Z-10644/v3-intro-1240x820.png) | 与既有截图原字节一致。 |
| [v3-menu-1240x820.png](../../acceptance/wave13/u1/screenshots/2026-11-07T16-56-07.833Z-10644/v3-menu-1240x820.png) | 底层结论卡使用新路径；跳过/明细菜单位置与动作保持。 |
| [v3-quarantine-1240x820.png](../../acceptance/wave13/u1/screenshots/2026-11-07T16-56-07.833Z-10644/v3-quarantine-1240x820.png) | 与既有截图原字节一致。 |
| [v3-quarantine-leftover-1240x820.png](../../acceptance/wave13/u1/screenshots/2026-11-07T16-56-07.833Z-10644/v3-quarantine-leftover-1240x820.png) | 与既有截图原字节一致；该画面显示的是通用应用名/保留名样例。 |
| [v3-results-1240x820.png](../../acceptance/wave13/u1/screenshots/2026-11-07T16-56-07.833Z-10644/v3-results-1240x820.png) | 项目路径与泄漏标题改为虚构值，文字自然换行；五张卡及体量保持。 |
| [v3-results-decided-1240x820.png](../../acceptance/wave13/u1/screenshots/2026-11-07T16-56-07.833Z-10644/v3-results-decided-1240x820.png) | 已决定的泄漏卡与安装包路径使用新值，决定行与数字保持。 |
| [v3-results-empty-1240x820.png](../../acceptance/wave13/u1/screenshots/2026-11-07T16-56-07.833Z-10644/v3-results-empty-1240x820.png) | 与既有截图原字节一致。 |
| [v3-results-folds-1240x820.png](../../acceptance/wave13/u1/screenshots/2026-11-07T16-56-07.833Z-10644/v3-results-folds-1240x820.png) | 工作树、联接及泄漏线索使用虚构项目名/路径；折叠与复制入口保持。 |
| [v3-results-stale-1240x820.png](../../acceptance/wave13/u1/screenshots/2026-11-07T16-56-07.833Z-10644/v3-results-stale-1240x820.png) | 虚构路径同步显示；独立的过期样例仍显示过期条并停用清理。 |
| [v3-scan-1240x820.png](../../acceptance/wave13/u1/screenshots/2026-11-07T16-56-07.833Z-10644/v3-scan-1240x820.png) | 与既有截图原字节一致。 |
| [v3-settings-1240x820.png](../../acceptance/wave13/u1/screenshots/2026-11-07T16-56-07.833Z-10644/v3-settings-1240x820.png) | 与既有截图原字节一致。 |
| [v3-settings-about-1240x820.png](../../acceptance/wave13/u1/screenshots/2026-11-07T16-56-07.833Z-10644/v3-settings-about-1240x820.png) | 假宿主网址改为 example.com/flick；关于信息和复制入口保持。 |
| [v3-settings-decl-1240x820.png](../../acceptance/wave13/u1/screenshots/2026-11-07T16-56-07.833Z-10644/v3-settings-decl-1240x820.png) | 项目名显示为 demo-app / Flick，路径及临时目录使用新值；信任状态和条数保持。 |
| [v3-settings-skip-1240x820.png](../../acceptance/wave13/u1/screenshots/2026-11-07T16-56-07.833Z-10644/v3-settings-skip-1240x820.png) | 路径改为 D:\code 下虚构项目；临时目录名同步替换，副标题为“设置 · 移除后立即生效”。 |
| [v3-trends-1240x820.png](../../acceptance/wave13/u1/screenshots/2026-11-07T16-56-07.833Z-10644/v3-trends-1240x820.png) | 泄漏模板显示为 .tmp-checks；增长状态、曲线与数字保持。 |

## 6. 自行决定、边界与未验证项

- 选择复用 readConclusion 并在 removeSkip 局部处理 not_found；没有把所有结论读取的错误语义一起改掉。没有结论时不追加读取；已有结论但服务返回 not_found 时清空缓存并避免回到空结论渲染器。
- 保留冻结字典键、版本标识与既有服务字段，只修改字符串值；没有扩展样例结构或公开接口。额外匿名化了相对路径、私有工作树/临时目录、媒体里的个人标识及测试网址。
- 只调整跳过页的生效提示，没有改动整套设置页布局或视觉系统。
- 新增测试保留精确顺序、数量和内容比较。最初新导航步骤的竞态只修该步骤；旧查重等待失败按原样重跑处理。
- 真实冒烟：未运行，按票面 U1 只允许 IPC 夹具。所有清理、隔离、查重操作都是内存假宿主响应，未扫描、打开、删除或移动真实用户数据。
- 未运行真实服务联合接线、原生桌面、文件夹对话框、真实清理、macOS 或公开导出扫描；这些不能由本单的 Windows 浏览器结果代替。
- 没有启动子代理或其它实现者，没有安装或下载依赖。浏览器只由指定检查器启动，使用本树 .local 下隔离 profile。
- 交回前全部检查进程已经结束；只读按本树路径检查 Chrome/Edge/Node 进程，匹配数为 0，没有输出进程命令行，没有终止其它任务的进程。未删除浏览器 profile、历史失败或旧证据目录。
- 未发现剩余的本票实现阻塞。交回后停止本任务测试与后台活动。
