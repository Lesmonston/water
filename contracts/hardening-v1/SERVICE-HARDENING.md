# WATER-W4-G2 服务加固 SPEC（`water-service` 第 2 版）

2026-10-26 冻结，总控（Claude）。M2 打开清理之前，服务核心必须先补上 F1 验收时记下的 6 处问题，另加 F1 移交的占用提示改用产品名。本文在 [SERVICE](../desktop-v1/SERVICE.md) 之上逐条覆盖；没提到的地方 SERVICE 原文继续有效。SERVICE 文件本身不改，它仍在第三波清单里冻结。

## 1. 范围与不变的东西

- 只改 `packages/water-service/`。依赖、允许的系统函数、公开 API 的签名都与 SERVICE 第 1、2 节完全相同，**不新增公开项**。
- IPC 的 17 个命令、参数、返回形状、错误码一律不变。界面与宿主都不用改。
- 清理开关的规则不变：关闭时 `clean_prepare`、`clean_start` 最先返回 unavailable 的固定句子。
- 已验收 crate（`junk-rules`、`junk-scan`、`process-scan`、`junk-clean`）只读。D 加固（WATER-W4-G1）与本票同时进行，本票不依赖它的任何新行为。

## 2. 任何 panic 都不让服务卡死

现状：
- 扫描线程只把 B 的 `scan` 包在 `catch_unwind` 里。之后的快照、增长、视图与存盘一旦 panic，`busy` 永远停在 `scanning`；清理线程同理。
- 状态锁一旦中毒，之后每个命令都返回 unavailable。

要求：
1. **`Service::call` 不向外 panic**。命令处理中任何 panic 都变成 `Err(IpcError)`，code `unavailable`，message_zh 取 SERVICE 第 3 节的句子。
2. **状态锁中毒后照常使用**：取锁遇到中毒时取回内部数据继续用，不再返回 unavailable。
3. **后台任务从头到尾受保护**：扫描线程与清理线程整个任务体内任何位置 panic，都要做到：
   - `busy` 回到 `idle`，取消令牌与停止信号清空；
   - 对应进度的 `state` 为 `failed`；
   - 失败的扫描不成为 `last_scan`；
   - 清理若已开始执行，日志文件原样保留。
   之后的命令照常可用，包括马上再开始一次扫描。
4. 观察者回调（扫描进度、清理进度）里也一样，不允许因 panic 让锁永久不可用。

## 3. 信任边界：清理依据只来自本进程

现状：
- 重启后从 `scans\` 读回的扫描记录，可以直接拿来 `clean_prepare`。
- 从 `plans\` 读回的计划，也可以拿来 `clean_start`。

这两类文件都在数据目录里，被改动后，会删除什么就不再由 Water 自己的扫描决定。

要求：
1. **只有本进程内完成的扫描才能作为清理来源。**
   - 启动时读回的扫描记录照常用于显示、趋势、记录与 `last_scan`。
   - 对它调用 `clean_prepare`，返回 code `stale`、message_zh “结果已过期，请重新体检后再清理。”。
   - 本进程内再完成一次扫描后，才能 prepare。
2. **启动时读回的计划永远不能执行**：对它调用 `clean_start` 返回 `stale`。
3. **执行只用内存里的计划**：`clean_start` 执行的是本进程 `clean_prepare` 时生成并留在内存里的那份计划。
   - 计划文件只作记录，执行前后都不再读回它。
   - 执行前改动磁盘上的计划文件，不影响实际删除的内容。
4. 扫描记录里的“已消耗”标记仍照常写盘，但它只用于显示。授权以内存为准，所以异步写不再影响安全。这一条消解 F1 审查记下的“旧扫描已消耗标记异步写”。

## 4. 存储整理

`Service::new` 读完记录后整理一次存储。删除只针对下面明确列出的文件：
- 只删数据目录根下与五个子目录（`scans`、`snapshots`、`plans`、`cleans`、`journal`）里的平铺普通文件；
- 不递归；
- 遇到目录或重解析点就跳过；
- 删除失败也跳过，不改变状态，不让启动失败。

1. **残留临时文件**：文件名完全匹配 `^\.[A-Za-z0-9._-]+\.[0-9a-f]{32}\.tmp$` 的删除。这正是本服务写入时所用临时文件的形式。不匹配的文件一律不动，例如 `.notes.tmp`、`keep.txt`。
2. **计划文件上限 60**：
   - 范围：`plans\` 下文件名为 `plan-…json`、ID 合法的文件；
   - 按 ID 排序，只保留最新的 60 个；
   - 内存里被删掉的计划同时作废。
3. **日志上限 60**：
   - 范围：`journal\` 下文件名为 `clean-…jsonl`、ID 合法的文件；
   - 按 ID 排序，只保留最新的 60 个。

以上 ID 合法性沿用现有的 `scan-`、`plan-`、`clean-` 格式判断。

## 5. 自定义文件夹按规范路径判断

现状：
- 自定义根与已知目录、Windows 目录的包含关系只按文本比较。
- 用 8.3 短名或另一种写法指向同一目录时，能绕过“包含已知目录”的拒绝。

要求：
1. 添加与读回设置时，先用标准库 `std::fs::canonicalize` 求自定义根的规范路径，并去掉 `\\?\` 前缀：
   - 求不出来，或与给出的路径不相同（按 ASCII 大小写不敏感比较），都按不合格拒绝，用 SERVICE 第 6 节的句子；
   - 这样短名、别名、带多余写法的路径都进不来。
2. 包含判断改为与已知目录、Windows 目录的**规范路径**比较：
   - 每个已知目录能求出规范路径就用规范路径，求不出（例如不存在）就用原文；
   - 文本规则不变，按段比较，ASCII 大小写不敏感。
3. 其余规则不变：
   - 不是存在的普通目录或盘根到它有重解析点、是盘根、至多 16 个，都照旧拒绝；
   - 重复添加返回已有项；
   - root_id 规则不变。

## 6. 部分完成的扫描能否作为清理来源

现状：B 的状态为 `partial` 时，服务照样允许 prepare。预算耗尽时，后面没扫到的受保护位置不会进入 `protected_paths`。

要求：`last_scan` 的状态为 `partial` 时，只有同时满足下面两条才允许 `clean_prepare`：
- 扫描结果的 issues 里**没有** `budget_exhausted`；
- 受保护（protected）组上**没有任何** issue。

否则返回 code `stale`，message_zh “这次体检没有完整完成，请重新体检后再清理。”。状态为 `completed` 的扫描不受影响。

说明：真实机器上 `partial` 很常见，例如系统临时目录里有拒绝访问的子目录。它们只影响所在的那个组，D 执行时还会逐项复核，所以不因此禁止清理。

## 7. 占用提示用产品名

`process_label_zh` 的进程名部分改用产品名，按进程名（ASCII 大小写不敏感，含 `.exe`）对照：

| 进程 | 显示 |
|---|---|
| `chrome.exe` | Chrome |
| `msedge.exe` | Edge |
| `brave.exe` | Brave |
| `firefox.exe` | Firefox |
| `claude.exe` | Claude |
| `chrome-headless-shell.exe` | Chrome 无头浏览器 |
| 其它 | 去掉 `.exe` 的原名（同 SERVICE） |

完整句子仍是 “<名称> 正在运行，将跳过占用的项”。“暂时无法确认是否在运行，清理时会再次检查” 不变。已经存盘的旧记录保持原样，不改写。

## 8. 测试

唯一测试文件仍是 `tests/service_v1.rs`，测试由 5 个变为**精确 6 个**：原有 5 个不改名，新增 `service_hardening`。

原有 5 个测试的断言继续成立，唯一例外是 `service_scan_views` 里那条占用提示：随第 7 节由 “chrome 正在运行，将跳过占用的项” 改为 “Chrome 正在运行，将跳过占用的项”，不得借机改动其它断言。夹具规则不变（本树 `.local/w3-f1-fixtures/` 下随机目录，测试自己的 Platform，不读真实位置，不启动进程）。

`service_hardening` 至少覆盖下面 6 组，失败信息含对应标记：

| 标记 | 断言 |
|---|---|
| `SERVICE_PANIC_IDLE` | 1. 测试平台的 `drives()` 在扫描线程里 panic 一次（只在后台线程里触发，例如按线程名判断，避免被调用方线程上的 `app_state` 先用掉）：扫描进度最终为 failed，`app_state` 的 busy 为 idle，随后再开始一次扫描能正常完成。<br>2. 测试平台的 `now()` 在某个命令（例如 `trends`）里 panic 一次：该次 `call` 返回 unavailable 而不是 panic（测试用 `catch_unwind` 包住调用来判断），之后 `app_state` 正常。 |
| `SERVICE_TRUST_BOUNDARY` | 1. 清理开启：本进程扫描后 prepare；在 start 之前改写磁盘上的计划文件，加入夹具里一个“受害”文件；start 后受害文件完好，被删的只有原计划条目。<br>2. 重建 Service（同一数据目录）：对读回的 last_scan 调 prepare 返回 stale 与指定句子；用重启前的计划与令牌调 start 返回 stale；夹具一个字节都没删。<br>3. 重启后在本进程里再扫一次，prepare 恢复正常。 |
| `SERVICE_STORE_TIDY` | 预先放入：3 个匹配临时文件形式的文件、1 个 `.notes.tmp` 与 1 个 `keep.txt`、70 个合法 ID 的计划文件、70 个合法 ID 的日志文件。`Service::new` 之后：<br>- 匹配的临时文件没有了，不匹配的两个还在；<br>- 计划与日志都只剩 ID 最新的 60 个；<br>- 除这些之外，数据目录的文件清单不变。 |
| `SERVICE_CANONICAL_ROOT` | 用非 ASCII 字母的大小写做别名（NTFS 不区分大小写，文本比较只忽略 ASCII 大小写）：<br>1. 夹具里建目录 `Kf-Ä\profile`；另建一个 Service，测试平台把某个已知目录写成 `…\kf-ä\profile`（小写 ä）。<br>2. picker 返回磁盘上的真实写法 `…\Kf-Ä`：必须被拒绝（它按规范路径包含那个已知目录）。<br>3. picker 返回 `…\kf-ä`（与磁盘写法不同）：也被拒绝（规范路径与给出的不同）。 |
| `SERVICE_PARTIAL_SOURCE` | 1. 用 `std::os::windows::ffi::OsStringExt::from_wide` 在某个受保护组的目录里建一个名字含未配对代理项的文件；扫描为 partial 且 issue 落在受保护组上；清理开启时 prepare 返回 stale 与第 6 节句子，夹具不变。<br>2. 另一次扫描只把这种文件放在一个推荐组的目录里，prepare 正常。 |
| `SERVICE_PRODUCT_NAME` | 测试平台的 `in_use` 依次返回 `msedge.exe`、`Chrome.exe`、`chrome-headless-shell.exe`、`other.exe`，对应组的 `process_label_zh` 分别为 “Edge …”“Chrome …”“Chrome 无头浏览器 …”“other …”。 |

测试不得启动进程，所以别名只用标准库能建出来的东西：上面的非 ASCII 大小写，以及用 `std::os::windows::ffi::OsStringExt` 造的文件名。总控验收时会另用联接补合成用例。

## 9. 负控（检查器只认这 3 条）

每条只改生产代码里真正被调用的一处：

| 负控 | 让什么失效 | 标记 |
|---|---|---|
| nc1 | 去掉后台任务的整体保护（例如只保护 `scan` 调用本身） | `SERVICE_PANIC_IDLE` |
| nc2 | 允许对启动时读回的扫描 prepare | `SERVICE_TRUST_BOUNDARY` |
| nc3 | 去掉第 6 节的部分完成判断 | `SERVICE_PARTIAL_SOURCE` |

总控验收时还会对第 4、5、7 节与原有标记另做变异。

## 10. 真实只读冒烟

`examples/service_smoke.rs` 照旧（清理关闭、五件事、不打印路径），只在输出的 JSON 里加一个字段：
- `in_use_labels`：本次结果里所有组的 `process_label_zh` 去重后按字典序排列，没有则为空数组。

这些文字不含路径。
