# Keeper 可并入 Water 的部分与停用清单（2026-10-29）

用户原话：“之前本来是把keeper想要做成本地知识库建立整理的角色的，但是用了一段时间觉得有点鸡肋，所以放弃进一步开发了，你看看她这边有没有知识管理相关的代码，或者功能可以融进water里的，后续就直接放弃keeper”。

## 做法

- Keeper（`F:\new\VaultSystem\keeper`，Node.js，7 月共 110 次提交，7-30 冻结为“资源管理器”）由两个只读子 agent 分头细读：
  - 一个看知识库部分：摄入、元数据刷新、链接、技能登记、项目知识、上下文包；
  - 一个看会话采集和安全工具：脱敏、哈希、备份、审计，以及外部登记项。
- 总控抽查了关键结论，都属实：
  - 整页丢弃规则 `PATH_LIKE`；
  - 读热缓存和索引时只截前 800 字；
  - 矛盾检测从未实现；
  - 归档脚本的页首匹配有问题；
  - 衰退度最后一次计算在 6-29；
  - 5 个 Grok 钩子文件、空的路由目录、`F:\new\CLAUDE.md` 的启动段都存在。
- 全程没有改 Keeper、没有调用 7890 接口、没有打开密钥文件。

## 结论

- **代码一行都不搬。** Water 的核心是 Rust，只依赖 serde，不联网，不读文件内容（ADR-018）。
- **能带走的是三样：** 几个做法、一份脱敏规则数据、一批可以改写成 Rust 夹具的测试用例。
- **Keeper 的问题在于没在真实数据上跑通**，见“Keeper 的教训”。

## 可带走的部分（按 Water 的“清、压、炼”三层）

### 炼（会话提炼稿）

1. **只写自己目录，默认只出计划。** `lib/vault-ingest.js:216-248`：
   - 每次写之前逐条断言路径在允许范围内；
   - 只允许一个规范目标；
   - 默认只出计划、不落盘。
   - 测试用例：`test/regression.test.js:833`（越界、多余、类型错误的目标）。
2. **引用锚和幂等指纹。** `lib/project-knowledge.js:471-574`：
   - 引用锚包括路径、标签、会话 ID、消息 ID；
   - 按指纹幂等，同一请求 ID 冲突时拒绝；
   - 条数有上限。
   - 可直接对应“工具 + 会话 ID + 消息锚点”。
3. **相对路径规范化。** 拒绝绝对路径、UNC、`..`、控制字符。
   - 代码：`lib/project-knowledge.js:163-192`、`lib/agent-completion-report.js:152-159`。
   - 测试：`test/agent-completion-report.test.js:187、401、441`。
   - 用于提炼稿里“改了哪些文件”一栏。
4. **拒收原始对话。** `lib/project-knowledge.js:642-654`：用结构判定挡住整段对话原文，保证提炼稿里不混进大段工具输出。
5. **脱敏规则数据。** 目前散在 5 处，覆盖面各不相同，要合并去重成一张规则表：
   - `lib/key-inventory.js:107-115`：各家密钥前缀；字符集含 `*`，所以已经打码的值也会被替换；
   - `lib/key-inventory.js:798-869`：环境变量写法，以及占位值过滤（your、example、placeholder、changeme 等）；
   - `lib/vault-ingest.js:163-169`：邮箱、凭据行；
   - `lib/agent-run-safety.js:1-89`：“标签 + 连接词 + 值”的写法，并放过 rotated、stored 这类良性描述；
   - `lib/skill-registry.js:40-45`：Bearer、`key: value`。
   
   还要补的缺口：`:`、空格和 JSON 写法，GitHub、AWS、Slack 令牌，JWT，PEM 私钥块，URL 里的账号密码，Cookie，`sk_live_`。
   
   注意：命中后要**替换**，不能**整条丢弃**。
6. **键名拒绝表。** `lib/storage/sanitizer.js:3-33`：用在 Water 写出的元信息和 JSON 键上，挡住 secret、token、transcript 这类键。注意它的误伤：`envelope` 会命中 env，`stackId` 会命中 stack。
7. **按边界读会话，只读末尾一段。** `lib/grok-session-report.js`：
   - 只读末尾 512 KB，并丢掉开头的半行；
   - 只认运行开始后新建的会话目录。
   - Grok 的会话路径布局和行格式（`~\.grok\sessions\<编码后的项目路径>\<会话id>\chat_history.jsonl`）可以登记进 Water 的位置表。
8. **热缓存和索引在写入端硬性限长。** Keeper 只在读的时候截断，hot.md 因此涨到了 11 KB。

### 压（归档压缩与恢复）

1. **清单与校验。** `lib/storage/backup.js:211-475`：
   - 清单格式为 `{version, id, createdAt, files:[{relativeName, role, size, hash}]}`，另附一份清单摘要；
   - 校验遇错即失败，错误码齐全：清单缺失、摘要不符、成员名不是纯文件名、哈希格式不对、文件缺失、不可读、哈希不符。
   - 测试：`test/storage-post-a3-op-followup.test.js:105-152`，可改写成恢复测试。
   - Keeper 的不足要避开：哈希在复制后才对目标算、没和源比对；清单直接写、没有先写临时文件再改名；没有真正的恢复，只有校验。
2. **归档后做清单集合相等校验。** `lib/vault-metadata-refresh.js:164-250`：要求清单和磁盘上的实际文件集合完全相等，并单独覆盖三类失败——数量相同但集合不同、有重复、不可读。
3. **先写临时文件再改名。** `lib/grok-hook-installer.js:64-75`。
4. **分阶段日志。** 用“预留 → 完成”加幂等键，记下计划、已压缩、已校验、已删除几步，崩溃后不留半成品（`lib/storage/outbox.js:205-273`）。只追加的审计日志：同一 ID 内容不同就报冲突（`lib/storage/audit.js:16-89`）。
5. **规范化 JSON 哈希**：各层键排序（`lib/storage/hash.js:18-31`）。
   - 待定：Water 现在只依赖 serde，sha256 和 zstd 要另外解决，这需要一个新的依赖决策（ADR）。Keeper 用的是 Node 自带的库，没有可搬的实现。

### 清与在用检测

1. **按进程命令行识别 agent。** `lib/external-agent-observer.js:20-87`。
   - 注意：Claude Code 的命令行一般不带项目路径，归属要改看文件修改时间或锁文件；Grok 有现成的 `active_sessions.json` 和 `.lock`。
2. **执行前重算计划哈希。** `lib/project-knowledge-api.js:839-861`：计划过期就拒绝执行。这和 Water 执行前重新核对年龄、在用状态的做法一致，可以加强。

## 不带走

- `librarian`：会联网调用模型。
- `linker`、`watcher`、`auto-align`：会写用户项目。
- 上下文包：读的时候截断。
- 审批签名和 SQLite 双写。
- Keeper 自己的聊天账本。
- Grok 钩子采集：Water 离线，也没有服务进程。
- `local-progress`。
- `vault.js`：正文子串匹配。
- `skill-registry`：只有技能目录根可以当位置参考。

## Keeper 的教训（为什么用着鸡肋）

- **衰退度形同虚设。** `recent_refs_30d` 没有任何代码更新。阈值有三套，互相矛盾：Vault 约定、元数据配置、Keeper 各一套。最后一次计算在 6-29；1,138 页里 1,127 页是 fresh，最大衰退度只有 0.302。
- **矛盾检测从未实现。** 报告里恒为 0。去重只看一级标题是否完全相同。
- **归档一次都没执行过。** 归档和恢复脚本一来一回会弄坏页首；在 PowerShell 5.1 下没有指定编码，中文会乱码；页首匹配认不出 CRLF 文件。
- **检索在真实数据上大面积失效。** `PATH_LIKE` 规则只要看到 `a/b` 这种写法，就把整页判为不安全。实测 1,138 页里丢掉了 1,010 页，剩下的连 0 分的页面也会被返回。
- **摄入更新时整页重写**，旧正文全丢。索引只追加，没有上限。旧接口还能绕过提案直接提交。计划哈希里包含了 log.md，所以任何一次写日志都会让所有待决提案作废。
- **给 Water 的启示：**
  - 每个机制都要有能在真实数据上量出来的结果，并且实际跑过；
  - 先把少量固定规则的功能做实，再考虑审批、数据库这类治理机制；
  - 本次另外测得：Vault 里引用的本机路径有 31% 已经失效，index.md 有 650 KB，远超约定。

## 停用 Keeper 的清单（未执行，等用户决定）

顺序很重要：

1. 停掉 Keeper 服务进程。
2. 删除 5 个 Grok 钩子文件：
   - `~\.grok\hooks\keeper-harness.json`
   - `~\.grok2\.grok\hooks\keeper-harness.json`
   - `~\.grok3\.grok\hooks\keeper-harness.json`
   - `~\.grok4\.grok\hooks\keeper-harness.json`
   - `~\.grok5\.grok\hooks\keeper-harness.json`
   
   现状：Keeper 每次启动都会重写这些文件；Grok 每个事件都要拉起一次 node 跑钩子，总控的下属 grok4 也一样。必须先停 Keeper 再删钩子，最后才删脚本。
3. 删除两个开机启动快捷方式：“Vault Keeper Service”，以及失效的“Keeper Volcengine Router”（它指向的目录是空的）。
4. 清掉共享说明文件里连 Keeper 的段落：
   - `F:\new\AGENTS.md` 第 1～24 行的 `VAULT_KEEPER_GATEWAY` 块，以及第 44～51 行的启动说明；
   - `F:\new\CLAUDE.md` 的启动说明；
   - `F:\new` 下 75 份项目说明文件里的副本。
   
   这是所有项目共用的文件，要用户点头。Vault 的查询、摄入流程本身不依赖 Keeper，可以保留。
5. Water 自己的 AGENTS.md 里“完成摘要供 Keeper 摄入”这句要改写。
6. 凭据和备份由用户处理：`.keeper\credentials.json`、`operator-approval.key`、`config.json` 及其备份，还有 `.keeper\backups\`（里面有配置和凭据的副本）。
7. 次要项：
   - `~\.codex2\config.toml` 里有一条信任项目条目；
   - `%APPDATA%\vault-keeper`；
   - Vault 的 `runtime\` 下 Keeper 用的几个目录。
8. 仓库本身归档保留。
