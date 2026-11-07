# Flick 改名契约（w11-v1）

2026-11-07，总控（Claude），冻结。第十一波各单都引用本文件；工单对本文件的补充以工单为准。

- 来由：用户 11-07“然后软件名改成Flick，你再设计一下logo”；标志选 D“一笔弹出”，改名范围选“看得见的全改”（[Flick 品牌](../../docs/design/flick-brand/BRAND.md)）。
- [第十一波计划](../../docs/dispatch/wave11/PLAN.md)第 1 节的表在这里写成各包要遵守的精确规则。

## 1. 名字

| 项 | 旧 | 新 |
|---|---|---|
| 产品名、窗口标题 | `Water` | `Flick` |
| 网页标题 | `Water · 磁盘体检` | `Flick · 磁盘体检` |
| 顶栏品牌 | 冰山 `i-berg` + `Water` | 一笔弹出 `i-flick` + `Flick` |
| 程序文件 | `water.exe` | `flick.exe` |
| 应用图标 | 冰山 | `docs/design/flick-brand/flick-app-icon.ico`（sha256 `7e5f864ab2ec13be0981886c162c0c49566bbcbc578c07fa3dc25c66788709b1`，11,509 字节） |
| 数据目录（默认） | `%LOCALAPPDATA%\Water` | `%LOCALAPPDATA%\Flick` |
| 隔离区 | `<盘>:\.water-quarantine` | `<盘>:\.flick-quarantine` |
| 项目声明 | `.water-cleanup.json` | `.flick-cleanup.json` |

下文把 `.flick-quarantine` 叫“新隔离名”，`.water-quarantine` 叫“旧隔离名”；`.flick-cleanup.json` 叫“新声明名”，`.water-cleanup.json` 叫“旧声明名”。比较名字一律不区分 ASCII 大小写，与现在的做法一样。

## 2. 看得见的改，看不见的不改

**要改**：用户在界面、窗口、错误信息、对话框、规则说明（`*_zh` 字段）里能读到的 “Water”，一律改为 “Flick”。只是名字换掉，句子别的部分不改。

**不改**：
- 包名、crate 名、库名、仓库名（`water-desktop`、`water_desktop`、`water-service`、`water-junk-*`、`water-cleanup-manifest` 等），目录 `apps/water/`；
- Tauri 的 `identifier`（`app.water.desktop`）与 `version`；
- 开发用环境变量（`WATER_DATA_DIR` 等）；
- 数据目录里的文件与子目录名（`water.lock`、`activate.signal`、`settings.json`、`webview` 等）；
- IPC 命令名、错误码、JSON 字段名、内部版本串（如 `water.scan-result.v1`）；
- 已冻结的契约文件与其中的文字；
- 代码注释、测试名、失败标记；
- 规则数据里给开发者看的来源说明（`ref` 字段等非 `*_zh` 字段）。

README 可以顺手把产品名写成 Flick，但不要求。

## 3. 隔离区

### 3.1 执行器（`packages/junk-clean`）

1. **新移入的默认根**：没有给 `QuarantineTarget.base` 时，根是 `<条目所在卷>\.flick-quarantine`（现在是旧隔离名）。
2. **认两个名字**：凡是现在只认旧隔离名的地方，两个名字都认：
   - 隔离根的校验：根的最后一段是新隔离名或旧隔离名；
   - 编号目录的校验：父目录是上面那样的根；
   - 移入、复原、永久删除、查看、列出，都对两个名字下的根照常工作。
   调用方显式给了旧隔离名的 `base` 时照常移入（服务不会这样给，见 3.2）。
3. **挡住**：条目路径的任何一段是新隔离名或旧隔离名，记为 `Guarded`，与现在对旧隔离名的处理一样。
4. 同一次移入只进一个根的规则不变（第二个根照旧 `NotSameVolume`）。
5. 公开接口不变：不改函数签名、类型与字段，不给枚举加成员。

### 3.2 服务（`packages/water-service`）

1. **新移入**一律交给执行器 `<盘>\.flick-quarantine`（测试注册的 `quarantine_base` 照旧优先）。
2. **列出**：每个固定盘查新、旧两个名字；只有确实存在而且是普通目录的才算一个隔离根。隔离区页、常驻入口的总量、“打开隔离区文件夹”的列表都按这些根算；没有隔离根的盘不再列出。新移入不受这条限制：目标根不存在时照旧由执行器新建。
3. 旧隔离名下已有的批次照旧能列出、复原、永久删除、打开文件夹。
4. 空间分布里两个名字都标成隔离区。

### 3.3 扫描、查重、宿主

- **扫描**（`packages/junk-scan`）与**查重**（`packages/dup-finder`）：两个名字的目录都不进、不列为可清条目，与现在对旧隔离名一样。
- **宿主**（`apps/water/host`）“打开文件夹”：最后一段是新隔离名或旧隔离名的目录都认，别的校验不变。

## 4. 项目声明

1. **项目声明包**（`packages/cleanup-manifest`）：
   - 保留 `FILE_NAME`，值仍是旧声明名（服务照它编译）；
   - 新增 `pub const FILE_NAME_FLICK: &str = ".flick-cleanup.json";` 与 `pub const FILE_NAMES: [&str; 2] = [FILE_NAME_FLICK, FILE_NAME];`（新名字在前，即优先顺序）；
   - `read_manifest` 两个名字都认；别的校验与读法不变。
2. **扫描**：声明文件的位置，两个名字都报。同一目录两个都有就两个都报，由服务挑。
3. **服务**：
   - 同一目录里只有一个名字的，照它读；
   - 两个都有时只读新声明名那个；旧的那个不读、不信任、不进信任列表，扫描记录的声明列表里照样记一行，`valid` 为 `false`，`error_code` 为 `MANIFEST_SHADOWED`（这就是“旧的写一条备注”）。

## 5. 数据目录与单实例（宿主）

只在**没有** `WATER_DATA_DIR` 覆盖时做；有覆盖时完全照旧，不搬、不看旧目录。

`base` 是现在 `resolve_default_base` 得到的目录（`%LOCALAPPDATA%` 的规范化结果），`new = base\Flick`，`old = base\Water`：

1. `new` 已存在（任何种类）：照现在的做法检查并使用 `new`，不碰 `old`。
2. 否则，`old` 存在而且是普通目录（与现在 `check_directory` 一样：是目录、不是符号链接、没有重解析属性）：同一父目录内改名一次 `old` → `new`。
   - 成功：用 `new`。
   - 失败（例如旧程序还开着里面的文件）：先看 `new` 是否此刻已存在而且通过检查（另一个实例刚搬完），是就用 `new`；否则 `old` 仍通过检查就**这次用 `old`**，下次启动再试；都不是，按现在的数据目录错误处理。
3. 否则（`old` 不存在，或不是普通目录）：照现在的做法建 `new`。旧的联接或重解析点不跟随、不改名。
4. 任何情况下都不复制、不合并、不删除，也不新建 `old`。
5. WebView 数据目录仍是“所用数据目录\webview”，跟着整个目录一起搬。
6. 单实例与唤醒照旧：`water.lock`、`activate.signal` 在所用数据目录里。
7. `prepare_data_directories` 的签名与 `DataDirectories` 的字段不变。

## 6. 程序名、图标、标题（宿主与界面）

- `apps/water/host/Cargo.toml` 的 `[[bin]] name` 改为 `flick`，`path` 不变；`[package] name`、`[lib] name`、依赖与 `Cargo.lock` 不变。
- `tauri.conf.json` 的 `productName` 改为 `Flick`；别的字段不变。宿主自己的配置检查跟着改。
- 窗口标题 `Flick`。
- `apps/water/host/icons/icon.ico` 与第 1 节的图标逐字节相同。
- 界面：
  - `<title>Flick · 磁盘体检</title>`；
  - 顶栏品牌用 `i-flick` 加 “Flick”，雪碧图照 BRAND.md 的写法（实心、`fill="currentColor"`、`stroke="none"`，墨色）；
  - 冰山 `i-berg` 与它的 `mask` 从 `index.html` 删掉，界面里不再引用。

## 7. 出票前探针（总控，2026-11-07）

| 问题 | 做法 | 结果 |
|---|---|---|
| 旧程序开着数据目录里的文件时，能不能整目录改名 | 本机临时目录里建 `Water\water.lock` 并打开（共享读写；再试一次加共享删除），对目录改名 | 两种都失败；关闭句柄后改名成功。所以旧程序还在跑时会走第 5 节第 2 条的“这次用旧目录”，随后在旧目录里抢锁失败，照旧唤醒旧窗口 |
| 改 `productName` 与程序名后，WebView 数据与单实例是否照旧 | 读宿主代码：WebView 数据目录由 `data_directory(directories.webview)` 指定（`lib.rs`），单实例靠数据目录里的 `water.lock`（`startup.rs`） | 都不依赖产品名或程序名，改名后照旧；整机复验在第九次整合时再看 |
