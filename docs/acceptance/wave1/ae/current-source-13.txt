# Desktop Bootstrap v1 — AC

2026-10-23。目标是Windows桌面依赖/最小只读壳的可复现基础，尚未接AA/AB，不宣称M1完成。唯一新增依赖初始化者AC；AD/AE不等待它。强依赖的桌面扫描整链另波，须等AC验收后正式冻结。

## 产品与依赖

独立workspace apps/desktop-preview，crate water-desktop-preview，lib water_desktop_preview，bin water-desktop-preview。edition2024/rust-version1.95/publish=false，autobins/autotests/autoexamples/autobenches=false。只有一个lib、一个显式bin、一个显式test bootstrap_v1和build.rs；不加其它targets。直接依赖tauri=2.12.5（default-features=false，features恰wry/common-controls-v6）、serde=1.0.229（derive）、serde_json=1.0.151，唯一build dependency tauri-build=2.7.4。不得加入npm、Tauri CLI、插件、git/path dependencies或改根Cargo。build.rs仅调用tauri_build::build()。配置文件/自有代码可实现上述语义，不复制第三方应用代码。

AC的mode dependencies是全波唯一允许crates.io在线resolve/fetch入口，受CARGO_HOME=.local/desktop-cargo-home、target=.local/desktop-target、TEMP/TMP=.local/desktop-tmp、Rust1.95/jobs1约束；不安装系统软件/全局CLI、不改global config、不下载SDK/运行upstream研究脚本。新锁生成后fetch --locked；缺失许可证/GPL类无可选宽松许可则受阻，记录精确crate与最小需求，不临时换版本。新传递依赖锁/来源/许可证清单入回执。锁后check/test/native离线，禁止root锁或旧cache改写。

## 桌面边界

tauri.conf.json为应用id dev.water.desktop.preview、version0.1.0、productName Water Desktop Preview。build.frontendDist=frontend；bundle.active=false；app.windows=[]，Rust在setup中创建唯一main窗口，title严格Water Desktop Preview、默认1000x760。withGlobalTauri=false；security.capabilities=[]；assetProtocol.enable=false；plugins={}；无capabilities文件/远程权限、invoke_handler、shell/fs/dialog/opener/updater插件、任意命令/路径/网络功能。自有Rust代码forbid unsafe。

固定CSP至少精确包含default-src 'self';script-src 'none';style-src 'self';img-src 'self';connect-src 'none';form-action 'none';frame-ancestors 'none';base-uri 'none'。frontend只有自有静态index.html/styles.css，无JavaScript、iframe、远程字体、资源、链接或文件拖放。正文可见“Water”“桌面壳已启动”“尚未接入扫描”“只读开发预览”；不出现假扫描结果/权限或已支持macOS的宣称。默认系统装饰与现有Water暖色/字样即可，不开展全产品设计或造logo。

公开v1::validate_preview_config(raw:&str)->Result<(),PreviewError>，拒绝上述权限/CSP/窗口/资源矛盾，错误Display仅Desktop preview unavailable.；v1::is_bundled_navigation(url:&str)->bool只接受无用户名/口令/端口/query、精确tauri://localhost或http://tauri.localhost的/index.html（允许规范内部根/fragment），其它http(s)、127.0.0.1、file、data、javascript、about及lookalike全部拒绝。main真正调用同一配置validator，on_navigation真正调用同一导航validator，拒绝新窗口/外部导航。不能只在测试中检而生产不接。

WebView2数据目录在窗口创建之前显式设为该工作树.local/desktop-webview/下新私有目录（不使用用户profile/默认AppData）；TEMP等由helper限定。不扫描、选择或读取任何真实用户目录；没有Node子进程/AA/AB启动或报告下载。本票是桌面初始化，不是产品完整闭环。关闭main时正常退出，子WebView进程和自有资源结束，原profile/日志不清理。

## 验证

tests/bootstrap_v1.rs恰desktop_config_boundary、desktop_navigation_boundary、desktop_embedded_page三顶层，通过真实公开validator、拒绝变体以及真实内嵌资产/配置保持证明。先完整可运行骨架+三测试命中AC_BEHAVIOR，不能缺文件/编译红。稳定nc1真正绕过配置权限拒绝→AC_CAPABILITIES，恢复原字节/test绿；nc2真正让导航放行外部URL→AC_NAVIGATION，恢复原字节/test绿。编译/超时/假生产开关不算负控。

同一干净实现SHA final check/test/native。check fmt+clippy all-targets，test三测。native总票只允许一个桌面窗口、0目录对话框、一次最多30秒，冻结UIA仅观察自有PID/固定title和嵌入文本并关闭、正常exit0；不截桌面像素、不再跑一轮弹窗。失败保留日志并受阻，无自动重试。baseline只编译/运行无UI MSVC小探针及检查已装WebView2，不build Tauri、不运行新壳，不能当产品通过。首次冷构建每命令600秒、单jobs1；普通命令180秒。

??.gitattributes????LF?icons/icon.ico?Windows?????????????????64KiB??????????????????.gitignore??gen/?LF????????schema?????/??/???
