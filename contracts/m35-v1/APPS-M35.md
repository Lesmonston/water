# APPS-M35：读已安装程序列表（W10-M9）

**草案，未冻结**（2026-11-02，总控 Claude 起草；与 m35-v1 其它契约一起冻结）。新建 `packages/installed-apps/`，只改这个目录。

来由：[ADR-019](../../docs/decisions/ADR-019-project-declarations-and-quarantine.md) 第 6 节（用户 11-02：“可以”），[第十波计划](../../docs/dispatch/wave10/PLAN.md)第 2 节第 9 行、第 4 节 M9。用途两个：认出“软件已经装好、安装包还在”（如 RX 11、Audition 的安装包），认出卸载后留下的应用数据（如 MiniMax Hub 的 `@hilo`，1.21 GB）。

## 1. 包的形状与边界

- crate `water-installed-apps`，lib 名 `water_installed_apps`；独立 workspace，edition 2024，rust-version 1.95，`autotests = false`；依赖只有 `serde = "=1.0.229"`（derive）与 `serde_json = "=1.0.151"`。
- `#![deny(unsafe_code)]`；只有 `native_windows.rs` 允许 unsafe，FFI（advapi32）只有 `RegOpenKeyExW`、`RegEnumKeyExW`、`RegQueryValueExW`、`RegCloseKey`。打开权限只有 `KEY_READ`（0x20019），可加 `KEY_WOW64_64KEY`（0x100）或 `KEY_WOW64_32KEY`（0x200）。
- 只读三处卸载登记：

| `scope` | 位置 |
|---|---|
| `machine` | `HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall`（64 位视图） |
| `machine_32` | 同一路径的 32 位视图（即 `WOW6432Node` 下） |
| `user` | `HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall` |

- 每个子键只读三个值：`DisplayName`、`DisplayVersion`、`InstallLocation`。不读别的值、别的键，不读这些程序的文件。
- 检查器按名字拒收 `RegSetValue`、`RegCreateKey`、`RegDelete`、`RegLoadKey`、`RegSaveKey`、`RegRestoreKey`、`RegOpenCurrentUser`、`RegConnectRegistry`、`ExpandEnvironmentStrings`、`std::fs`、`std::process`、`std::net`；核对 `RegQueryValueExW` 的值名只有上面三个字面量。

## 2. 接口

```rust
pub struct App {
    pub scope: String,                    // "machine"、"machine_32"、"user"
    pub key: String,                      // 子键名
    pub name: String,                     // DisplayName
    pub version: Option<String>,          // DisplayVersion
    pub install_location: Option<String>, // InstallLocation，见第 3 节
}
pub struct AppList {
    pub apps_version: String,             // "water.installed-apps.v1"
    pub collected_at: String,
    pub apps: Vec<App>,                   // 按 name 不分大小写、再按 scope、key 排序
    pub truncated: bool,
    pub unreadable_keys: u64,
}
pub fn read_installed(now: SystemTime) -> Result<AppList, AppsError>;
pub fn parse_entry(scope: &str, key: &str, values: &[(String, RegValue)]) -> Option<App>;
pub enum RegValue { Sz(String), ExpandSz(String), Other }
pub fn installer_tokens(file_name: &str) -> Vec<String>;
pub fn find(list: &AppList, query: &[String]) -> Vec<usize>;
pub fn list_to_json(list: &AppList) -> String;
pub fn list_from_json(s: &str) -> Result<AppList, AppsError>;
```

- `AppsError`：`Unsupported`（非 Windows）、`Json`。三处中某处打不开（例如没有 32 位视图）不是错误，就是那处没有条目；子键打不开计入 `unreadable_keys`。
- 最多 5000 条，超过 `truncated`。
- 类型派生 `Debug, Clone, PartialEq, Eq, Serialize, Deserialize`，结构带 `deny_unknown_fields`。

## 3. 一条登记怎么取

`parse_entry` 是纯函数，`read_installed` 读到每个子键的三个值后交给它：

- `DisplayName` 缺失、不是字符串、去掉首尾空白后为空：None（整条不要）。
- 字符串值只认 `REG_SZ` 与 `REG_EXPAND_SZ`，其他类型当作缺失。去掉结尾的 NUL 与首尾空白；超过 1024 个字符的当作缺失。不展开 `%变量%`（展开要另一个调用，不做），原样保留。
- `InstallLocation`：再去掉首尾的一对双引号与结尾的 `\`；必须形如 `X:\…`（盘符、冒号、反斜杠）且不含 `%`，否则当作缺失。
- 同一 `scope` 下子键名重复不会发生（注册表保证）；不同 `scope` 的同名程序都保留。

## 4. 认名字

```text
installer_tokens("Audition_2024_x64.zip") == ["audition", "2024"]
```

- 去掉扩展名（`.exe`、`.msi`、`.zip`、`.rar`、`.7z`，不分大小写；`.part`、`.crdownload` 先去掉再看一次）；按非字母数字切开（中日韩文字连续的一段算一个词）；转小写。
- 丢掉这些词：`setup`、`installer`、`install`、`x64`、`x86`、`amd64`、`arm64`、`win`、`win64`、`win32`、`windows`、`full`、`offline`、`online`、`portable`、`release`、`final`、`latest`、`v`，以及只有一个字符的词。
- 只剩数字时返回空（`setup.exe`、`2024.zip` 认不出是什么，不猜）。
- `find`：查询的每个词都能在某个程序的名字里找到（名字同样切词、转小写；词与名字里某个词相等即可；查询词至少 3 个字符且不全是数字时，是名字里某个词的前缀也算，如 `photoshop` 不算 `photo` 的匹配、`photo` 算 `photoshop` 的匹配），就算匹配；返回所有匹配的下标，按 `apps` 顺序。查询为空返回空。
- 服务（M7）用它做两件事：
  - 7 天以上的安装包：`find(installer_tokens(文件名))` 非空，卡片写“对应的软件已经装好：<名字> <版本>”。
  - 规则（M1）给出的“某程序的应用数据目录”：程序名的词在列表里找不到，卡片写“<程序> 似乎已卸载，这是它留下的数据”，仍是需要确认。

## 5. 测试

`tests/apps_v1.rs` 精确三个测试：

| 测试 | 标记 | 内容 |
|---|---|---|
| `apps_read_real` | `APPS_READ` | 读本机注册表（只读）；用 `powershell -NoProfile -Command` 的 `Get-ItemProperty` 分别数三处里有非空 `DisplayName` 的子键，个数与 `(scope, key)` 集合都与本包结果相等；连读两次结果相同；排序对；所有 `install_location` 都形如 `X:\…` |
| `apps_entry_rules` | `APPS_ENTRY` | 第 3 节每条一例：缺名字、空白名字、`REG_DWORD` 的名字、`REG_EXPAND_SZ` 原样保留、引号与结尾反斜杠、相对路径与带 `%` 的位置当作缺失、超长 |
| `apps_match` | `APPS_MATCH` | 用合成列表：`Audition_2024_x64.zip` 认出 `Adobe Audition 2024`；`iZotope_RX_11_Audio_Editor_setup.exe` 认出 `iZotope RX 11 Audio Editor`；`RX 10 setup.exe` 认不出 RX 11；`setup.exe`、`2024.zip` 返回空；`MiniMax Hub` 在与不在；大小写；中文名一例；`.crdownload` 后缀一例 |

## 6. 负控与真实冒烟

- **nc1**：不读 32 位视图，测试以 `APPS_READ` 失败。
- **nc2**：`find` 改成任一词匹配即可，测试以 `APPS_MATCH` 失败。
- 负控只认 `src/` 里的改动。
- **真实冒烟**（只读）：只输出三处各几条、`truncated` 与 `unreadable_keys`，不输出程序名。
