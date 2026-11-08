# 参与 Flick

欢迎提问题、提规则、提代码。中文或英文都可以。English is welcome too; a short summary is at the end.

## 开始之前

- 小改动直接提 PR；大一点的改动（新功能、改清理行为、改数据格式）先开 issue 说一下想法。
- Flick 会删除文件，所以宁可少清，不可错删。拿不准的条目放“要你判断”，不放“推荐”。
- 不要在 issue、PR、测试或规则里写真实的用户名、私人路径或邮箱。路径请换成 `C:\Users\alice\...` 这样的样子。

## 构建与测试

见 [README](README.md#从源码构建)。提 PR 前，在改过的包里运行：

```powershell
cargo fmt --manifest-path <包>/Cargo.toml -- --check
cargo clippy --locked --manifest-path <包>/Cargo.toml --all-targets -- -D warnings
cargo test --locked --manifest-path <包>/Cargo.toml
```

改了界面再运行 `node --test apps/water/ui/tests/unit.test.mjs`，并在 PR 里附上截图。

## 加一条规则

规则在 `packages/junk-rules/rules/windows.json`，一条规则说清楚一类可清理的东西。

### 先确认三件事

1. **它是什么**：哪个程序在什么时候写下的。
2. **删了会怎样**：会自动重新生成？要重新下载？会丢登录、会话或设置？
3. **依据**：官方文档、程序自己的说明，或你亲眼看到的情况（写清楚看到了什么、多大、哪天看的）。

丢登录、会话、设置或用户自己的文件的，不能做成可清规则；可以做成受保护规则（`protected`），让它只被列出来。

### 字段

| 字段 | 说明 |
|---|---|
| `rule_id` | 小写字母、数字和连字符，全表唯一 |
| `title_zh`、`owner_zh` | 界面上的名字、由哪个程序产生 |
| `category` | `agent_tool`（AI 编程工具）、`browser`、`system_temp`、`app_leftover`、`dev_cache`、`crash_log`、`gpu_system`、`custom`（你加的文件夹里按标记找） |
| `level` | `recommended`：删了只会重新生成，直接清理；`confirm`：要用户判断，清理时先进隔离区；`advisory`：只列出供参考；`protected`：受保护，永不可选 |
| `locate` | 怎么找到它，见下一节 |
| `item_type` | `dir`、`file` 或 `any` |
| `min_age_hours` | 至少多久没动过才算 |
| `keep_newest` | 同一位置下保留最新的几个（例如旧版本只清掉更旧的） |
| `in_use` | 正在使用时不清：`{"mode": "none" \| "process_running" \| "cmdline_references_item" \| "runs_from_or_references_item", "processes": [...]}` |
| `growth` | `one_off`、`slow` 或 `leak_prone`（会一直长，结论里会给出线索） |
| `what_zh`、`why_zh`、`after_zh` | 是什么、为什么能清、清了之后会怎样，写给普通用户看的一两句话 |
| `fix_hint_zh` | 可选：怎么让它别再长 |
| `sources` | 至少一条：`{"kind": "official_doc" \| "local_observation" \| "skill", "ref": "...", "checked_on": "YYYY-MM-DD"}` |

文案目前用中文。不会写中文的，可以先写英文，维护者会帮忙翻译。

### 定位

- **`pattern`**：从一个已知目录出发的路径段。`base` 取 `user_profile`、`local_app_data`、`roaming_app_data`、`user_temp`、`system_temp`、`windows`、`program_data`、`downloads`、`system_drive`；`segments` 里可以用 `*`（任意多个字符）、`?`（一个字符）、`#`（一个或多个数字），不分大小写。例如：

  ```json
  {"kind": "pattern", "base": "local_app_data", "segments": ["npm-cache"]}
  ```

- **`marker`**：在用户加的文件夹里，按标记找（例如带 `CACHEDIR.TAG` 的目录、名为 `__pycache__` 的目录），可以再加条件（父目录里有某个文件、路径里有某个名字等）。
- 已有的规则是最好的例子，照着相近的一条写。

### 测试

1. 在 `packages/junk-rules/tests/rules_v1.rs` 里给新规则加用例：该认出的路径认出，不该认的（同名但属于别的程序、受保护的数据）不认。
2. 规则总数和数据版本 `data_version`（格式 `YYYY-MM-DD.N`）各由 `tests/rules_v1.rs` 开头的一个常量断言（`EXPECTED_RULE_COUNT`、`EXPECTED_DATA_VERSION`），加规则后改这两处。
3. 运行 `packages/junk-rules` 与 `packages/water-service` 的测试。

## 提 PR

- 一个 PR 做一件事；写清楚改了什么、怎么验证的。
- 不需要签 CLA。除非你另外说明，你提交的贡献按本项目的许可证（MIT 或 Apache-2.0，任选其一）授权，不附加其它条款。

## In English

- Small changes: open a PR. Larger changes (new features, cleaning behaviour, data formats): open an issue first.
- Flick deletes files, so prefer cleaning less over deleting the wrong thing; anything uncertain is `confirm`, not `recommended`.
- Never put real user names, private paths or emails in issues, PRs, tests or rules; use paths like `C:\Users\alice\...`.
- Before a PR, run `cargo fmt --check`, `cargo clippy --all-targets -D warnings` and `cargo test` in the packages you changed, and the UI unit tests if you touched the interface.
- Rules live in `packages/junk-rules/rules/windows.json`; the table above describes each field. Every rule needs at least one source and test cases in `packages/junk-rules/tests/rules_v1.rs`; update `EXPECTED_RULE_COUNT` and `EXPECTED_DATA_VERSION` at the top of that file too. Rule texts are Chinese for now; write English and a maintainer will help translate.
- Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
