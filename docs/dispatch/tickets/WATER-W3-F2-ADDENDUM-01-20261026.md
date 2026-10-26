# WATER-W3-F2 补单 01：选择框接线点的依赖与签名

2026-10-26，总控（Claude）。回应本票受阻回执（提交 `99766f6261958009a90c5b4fb7f0fa2db18cec7d`）。**可以新开对话执行。** 新执行者开工前依次读：

1. 原票 `F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W3-F2-DESKTOP-HOST-20261026.md`
2. 执行者规则 `F:/new/smaltalk/water/docs/dispatch/W3-DESKTOP-WORKER-RULES.md`
3. SPEC `F:/new/smaltalk/water/contracts/desktop-v1/HOST.md`
4. 本票受阻回执 `F:/new/smaltalk/water/.worktrees/w3-f2/docs/dispatch/reports/WATER-W3-F2-REPORT.md`
5. 最后读本补单

工作树、分支、检查入口都不变。文中的“你”指本票执行者，包括接手的新对话。

## 受阻结论

你的判断是对的。`select_scope` 需要 `Registry` 与 `OpaqueId` 两个参数，而 picker 没有转出这两个类型。HOST 第 1 节又只允许依赖 picker，所以按原契约写不出真实的选择框接线点。

这是总控契约的漏洞：总控自测用的桩宿主没有真正调用 `select_scope`。你在实现前停下交回，是规则要求的做法。

## 总控派前实测

总控在自测树 `.worktrees/w3-selftest-f2` 里按下面的条款给桩宿主加了依赖，写了一个真正调用 `select_scope` 的 `pick_folder`，然后跑了三个模式：

| 模式 | 结果 |
|---|---|
| `lock` | 通过。锁只给 `water-desktop` 多了两条依赖边，没有新增任何包，registry 包与 AC 锁逐个一致 |
| `check` | 通过（clippy 与 rustfmt）。前两次是总控桩代码的 rustfmt 格式没过，格式化后通过，与依赖无关 |
| `test` | 通过。四个测试都跑了，其中 `pick_folder("relative")` 返回 invalid，没有弹框 |

三次运行的窗口计数与选择框计数都是 0。证据在主线 `docs/acceptance/wave3/controller/preflight-20261026/addendum-f2-01/`。桩代码只用来证明这条路走得通，不是参考实现，请按本补单与 SPEC 自己写。

## 覆盖条款（冻结的 HOST.md 不改，以本补单为准）

### 1. 依赖（替换 HOST 第 1 节的依赖清单）

在原有依赖之外，增加恰好两个路径依赖：

```toml
water-contracts = { path = "../../../crates/water-contracts" }
water-scope-registry = { path = "../../../packages/scope-registry" }
```

- 它们只用来构造 `select_scope` 的参数，以及测试里的错误值。选择框本身仍只通过 `water_native_picker::v1::select_scope` 打开。
- 第 1 节其余要求不变：registry 包必须全部出自 AC 锁，不新增、不下载，不手工改锁。
- 检查入口的依赖白名单已在主线 manifest 里同步成这 7 项。

### 2. `pick_folder`（替换 HOST 第 4 节中它的签名与说明）

```rust
pub fn pick_folder(initial_directory: &str) -> Result<Option<String>, IpcFailure>;
pub fn picker_failure(error: &water_native_picker::v1::PickerError) -> IpcFailure;
```

- **初始目录由调用方传入。** 宿主不自己求用户主目录。生产代码仍只读 `WATER_DATA_DIR`，不要用 `std::env::home_dir`、`USERPROFILE` 一类。F3 接线时，由宿主把 Tauri 路径解析得到的主目录传进来。
- 做法固定为：
  1. `PickerOptions::new(initial_directory)`，出错时返回 `picker_failure` 的结果。
  2. 本次调用自建 `Registry::new(1)` 与 `OpaqueId::new("water-pick-folder")`。这两步出错时返回下表第一行的 unavailable。
  3. 调用 `select_scope`，按结果返回：
     - `Ok(None)` → `Ok(None)`（用户取消）；
     - `Ok(Some(selected))` → `Ok(Some(selected.root_path().to_owned()))`；
     - `Err(error)` → `Err(picker_failure(&error))`。
  4. `Registry` 是局部变量，调用结束即释放。宿主不保存选择结果，也不保存任何选择状态。
- `picker_failure` 精确映射如下。`match` 必须逐个列出全部六个变体，不用 `_`：

  | PickerError | code | message_zh |
  |---|---|---|
  | `UnsupportedPlatform`、`ApartmentUnavailable`、`DialogFailed` | `unavailable` | `系统文件夹选择框暂时打不开。` |
  | `Root(_)`、`Source(_)`、`InvalidSelection` | `invalid` | `这个文件夹不能加入体检，请换一个。` |

- 本票里 `pick_folder` 仍不接到任何 `#[tauri::command]` 上，也不在 `run` 或 `main` 里调用。

### 3. 选择框的测试（替换 HOST 第 4 节最后一句“检查它的错误映射”）

放在 `host_command_registry` 里，失败信息含 `HOST_COMMANDS`。要求：

- 六个变体逐个映射到上表，核对 code 与 message_zh：
  - `Root` 的值用 `PickerOptions::new` 传相对路径得到；
  - `Source` 的值用 `RegistryError` 的任一不带 `RootError` 的变体构造（例如 `RegistryFull`）；
  - 其余四个直接构造。
- `pick_folder("relative")` 返回 `invalid`。初始目录校验发生在打开选择框之前，所以这一步不会弹框。
- **测试里不得以任何合法目录调用 `pick_folder`**，选择框预算仍是 0。
- 仍是原来四个测试，不加不减。

## 续做与检查

- 同一工作树 `F:/new/smaltalk/water/.worktrees/w3-f2`、分支 `worker/water-w3-f2`，从你的受阻回执提交 `99766f6261958009a90c5b4fb7f0fa2db18cec7d` 接着做。
- **不要重跑 baseline。** 它要求首次 HEAD 干净地停在基点，你已在 08:51:58 跑过并通过。
- 其余命令顺序照原票：
  1. 写好 `Cargo.toml` 后跑一次 `--mode lock`；
  2. 反复使用 `--mode check` 与 `--mode test`；
  3. 跑两条负控 nc1、nc2；
  4. 提交干净实现后依次跑 `check --final`、`test --final`、`native --final`、`archive`。
- 原生窗口预算仍是整票 1 次，你还没用过。选择框 0 次。
- 改动范围不变：只限 `apps/water/host/`、本票回执与 `docs/acceptance/wave3/f2/`。

## 交回

改写同一份回执，第一行改为：

```text
WATER-W3-F2 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w3-f2/docs/dispatch/reports/WATER-W3-F2-REPORT.md
```

原有的受阻一节保留作为历史，新增“补单 01”一节，写清：

- 续做起点与实现提交；
- `pick_folder` 的做法与映射测试；
- 两条负控的红绿回执；
- 原生窗口检查的结果，以及你在截图里看到了什么；
- 没做或没验证的事。

原票要求回执写的其它内容照旧。仍然受阻时，第一行写“WATER-W3-F2 任务受阻”。
