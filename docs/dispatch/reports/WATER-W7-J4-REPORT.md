WATER-W7-J4 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w7-j4/docs/dispatch/reports/WATER-W7-J4-REPORT.md

执行者：Codex（GPT-6；本会话未提供更细的后端型号标识）。单一执行者完成，未使用子代理。

工作树：F:/new/smaltalk/water/.worktrees/w7-j4；分支：worker/water-w7-j4。首次 HEAD 为 282876950df40a14b7abeec6ab27677ea0adc897，初始工作树干净。权威第七波 manifest 中 J4 为 DISPATCHED。

实现提交：8a3cc357a6fd85f2d302a6829dc4701af3055959（fix(rules): refine M3 explanations and provenance）。仅含 packages/junk-rules/rules/windows.json 与 packages/junk-rules/tests/rules_v1.rs；后续提交仅含本回执和归档器生成的证据。

## SPEC 逐项对照

| 条款 | 实际完成与证据 |
|---|---|
| 第 1 节 | 六处说明按表逐字替换：desktop-updater-residue、agent-cli-old-binaries、claude-code-old-versions、qoder-workspace-temp 的 why_zh，以及 agent-tool-logs 的 what_zh / why_zh。新断言同时核对原始规则字段和公开 RuleSet::text 返回的文案。 |
| 第 2 节 | opencode-sessions 第一个定位器末段改为 opencode.db*，保持两个定位器；计划中 opencode-sessions#1 的四段逐字断言为 .local、share、opencode、opencode.db*。 |
| 第 3 节 | electron-gpu-caches、kimi-code-sessions、workbuddy-memory-sessions、other-agent-sessions 的 local_observation.ref 按表逐字替换。四条 checked_on 原本已为 2026-10-28，核对并保留；其它来源和网址不动。 |
| 第 4 节 | data_version 为 2026-10-28.2；rules_version 仍为 water.junk-rules.v1。 |
| 第 5 节 | 精确四测且名称不变。新 RULES_M3_WORDING 断言覆盖六处文字、全规则 what_zh / why_zh / after_zh 不含“只列出”、in_use=none 的说明不含“被占用的文件会跳过”、OpenCode 四段、四条完整 ref 及日期、计划数据版本；另核对公开文案。规则 75 条，两个合成自定义根的计划目标 255 个。 |
| 第 6 节 | 不改 .grok# 保护优先策略；不改 Claude Code 旧版本的在用设置。 |
| 第 7 节 | 递归比较初始与交付 JSON 的键、数组及顺序，只发生授权的 12 个标量变化（版本 1、文案 6、定位段 1、出处 4）。其余字段、规则与顺序不变。所有 src/ 文件与 Cargo.toml / Cargo.lock 保持初始 Git 文件字节；格式版本、依赖不变。 |

## 获准修改的旧断言：原值与新值

依据 RULES-M3-FIX 第 5 节，仅修改下列旧期望；其它旧断言及其标记保留。

| 位置 / 适用规则 | 原值 | 新值 |
|---|---|---|
| rules_resolve_plan 的 plan.rules_data_version | 2026-10-28.1 | 2026-10-28.2；增加 RULES_M3_WORDING 失败说明 |
| agent_seed_table 中 opencode-sessions 的首个定位摘要 | pattern:user_profile:.local/share/opencode/opencode.db | pattern:user_profile:.local/share/opencode/opencode.db* |
| RULES_AGENT_TOOLS 逐目标段的上述种子派生期望 | .local/share/opencode/opencode.db | .local/share/opencode/opencode.db*（原逐目标断言不改，消费更新后的种子） |
| RULES_AGENT_TOOLS local_observation 的 ref 前缀，electron-gpu-caches | 2026-10-28 总控本机只读核查： | 2026-10-28 总控本机只读体检： |
| 同一 ref 前缀断言，kimi-code-sessions | 2026-10-28 总控本机只读核查： | 2026-10-28 总控本机只读体检： |

ref 前缀按规则 ID 选择，其他 12 条第六波规则仍为“核查”；日期、来源类型、官方网址断言和 RULES_AGENT_TOOLS 标记保留。workbuddy-memory-sessions 与 other-agent-sessions 的旧前缀未变，新增完整 ref 等值断言检查新内容。

## 检查命令与结果

全部从指定工作树根目录串行执行。每一行的完整命令为以下固定前缀加该行参数；回执均在证据目录 receipts/ 下，archive 自身的回执除外。

```powershell
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W7-J4
```

| 追加参数 | 结果 | 回执文件 |
|---|---|---|
| --mode baseline | 通过，退出 0 | 2026-10-28T14-36-13.184Z-21792-baseline-result.json |
| --mode lock | 通过，退出 0 | 2026-10-28T14-37-37.379Z-41568-lock-result.json |
| --mode test | 预期先红，检查器 1 / Cargo 101；2 通过、2 失败 | 2026-10-28T14-37-47.215Z-38384-test-result.json |
| --mode check | 通过，退出 0 | 2026-10-28T14-38-45.273Z-32816-check-result.json |
| --mode test | 通过，退出 0，4/4 | 2026-10-28T14-39-00.030Z-3044-test-result.json |
| --mode red-nc1 | 前置拒绝，退出 1，不计负控 | 2026-10-28T14-39-36.977Z-6180-red-nc1-result.json |
| --mode test | 恢复后通过，退出 0，4/4 | 2026-10-28T14-39-51.343Z-42836-test-result.json |
| --mode red-nc1 | 有效负控通过，检查器 0 / Cargo 101；3 通过、1 失败 | 2026-10-28T14-41-35.350Z-38304-red-nc1-result.json |
| --mode test | 恢复后通过，退出 0，4/4 | 2026-10-28T14-47-33.483Z-17952-test-result.json |
| --mode check --final | 通过，退出 0 | 2026-10-28T14-48-18.620Z-24400-check-result.json |
| --mode test --final | 通过，退出 0，4/4，proofAudit 绑定有效红绿 | 2026-10-28T14-48-31.457Z-43048-test-result.json |
| --mode real --final | 通过，退出 0，只读存在性检查 | 2026-10-28T14-48-42.826Z-26732-real-result.json |
| --mode archive | 通过，退出 0；184 份、3,365,486 字节 | 2026-10-28T14-48-53.740Z-15576-archive-result.json（本树 .local/checks/WATER-W7-J4/） |

Rust 1.95.0；Cargo 使用 --offline、--locked，CARGO_BUILD_JOBS=1，--test-threads=1；私有 Cargo home 为本树 .local/w2-cargo-home，target 为本树 .local/w2-target。check 的依赖、源码政策、cargo fmt --check 与 cargo clippy --all-targets -- -D warnings 全通过；没有另跑 Cargo 全仓检查。每次完整测试均为指定四测，无忽略或过滤。

第一次 test 在仅更新测试、尚未更新规则数据时执行，rules_resolve_plan 因数据版本、rules_seed_coverage 因旧说明失败，均含 RULES_M3_WORDING，另两测通过。这是实现前定向先红，不计作生产负控。

首次 red-nc1 的变异与后来的有效变异相同，但测试文件相对 HEAD 尚未提交，检查器以“Negative controls must not edit tests”前置拒绝，未运行产品测试，不计有效负控。随后下一条操作即 git checkout 恢复 src/rules.rs 并运行 test，全绿。为满足检查器相对 HEAD 的约束，先提交当前已绿的实现与测试，再执行有效负控；未改写提交或修改检查器。归档保留两次失败现场。

归档另含开工前已有的 2026-10-28T14-17-30.059Z-26708 总控派前 baseline，不冒充本执行者运行。archive 自身的 result.json 在归档结束后写入，不在本次归档索引内。

除上述检查器命令外，git diff --check 退出 0；Node 内存递归比对初始与交付 JSON 确认恰好 12 处变化、其余键及顺序不变。归档索引的每项大小 / SHA-256 / 原始文件字节、src/ 全部六个文件及 Cargo.toml / Cargo.lock 的初始 Git 字节，以及精确四个测试名称也单独复核。

## 有效负控 nc1 与恢复

只临时修改 packages/junk-rules/src/rules.rs 的 Rule::text 一处：

```diff
-            why_zh: self.why_zh.clone(),
+            why_zh: self.what_zh.clone(),
```

真实公开文案入口会把“这是什么”当作“为什么可以清”。没有修改规则数据、测试或添加开关。完整四测中前三测通过，rules_seed_coverage 被新增的公开文案等值断言抓到：

```text
assertion `left == right` failed: RULES_M3_WORDING: desktop-updater-residue public explanation
  left: "桌面应用自动更新时下载的安装包，安装完成后常留在原处。"
 right: "只清超过一天的更新包残留；正在使用的文件删不掉时会原样留下。"
test result: FAILED. 3 passed; 1 failed; 0 ignored; 0 measured; 0 filtered out
```

有效红回执：2026-10-28T14-41-35.350Z-38304-red-nc1-result.json。之后下一条操作为 git checkout -- packages/junk-rules/src/rules.rs，并紧接同一命令进程运行 --mode test（2026-10-28T14-47-33.483Z-17952-test-result.json），4/4 全绿。final test 的 proofAudit 明确绑定这一对红绿。

初始和恢复后 src/rules.rs 的 SHA-256 均为 b33066fe9066845257c1519aee657ec6c25da6b0a5bb172b95e2f38910b189aa。

| 哈希 | 值 |
|---|---|
| 最终源码集合 productionHash（恢复绿及三个 final 相同） | 98205919b390fd3a922608220b103b1eba6b0d7d8f1aa99e491818f7ce0e2ec0 |
| 负控源码集合 productionHash | f307ad68b5e468118513d78b90ba4907f29b2fa63b2ca09e79075ccec7937479 |
| 测试集合 testHash（红、绿及三个 final 相同） | c66a9ae5896e6de1a9e16d9e6ef8bd345ea80680af5352adef4254785791c36e |
| rules_v1.rs 文件 SHA-256 | 8eb53c2f770dc3a93b90928d32904f85ef3a5339c1d2dda97717f146f87702fb |
| windows.json 文件 SHA-256 | ee82a4b9513bddc3266a6fe3548a3c46c456412c80dc5c4085c84436e8b58d89 |

三个 final 均在干净的实现提交 8a3cc357a6fd85f2d302a6829dc4701af3055959 上执行，前后无未提交变化，之后未改产品或测试。

## 只读真实冒烟

real --final 使用既有 env-only 示例：加载规则，从已知目录环境信息构造位置，对 base / 字面前缀做元数据存在性检查。没有列举目录、读取用户文件内容或执行清理；输出只含 rule_id 与布尔值，没有真实路径或进程命令行。

75 条规则中 70 条至少一个 base 存在，60 条字面前缀存在。另 5 条是 marker 规则，未提供自定义根而返回 false，不表示缺失。本次 I1 的 14 条 Agent 工具规则均为 base_exists=true、literal_prefix_exists=true。非 marker 中前缀不存在的是五条 brave-* 规则、firefox-cache、uv-cache、huggingface-models、ollama-models、wer-user-reports。这仅说明前缀存在性，不代表通配目标实际命中、体量、WAL/SHM 实际占用或可清资格已验证。

75 条规则及 255 个目标由合成 KnownFolders 与两个自定义根的 rules_resolve_plan 验证；真实冒烟未做生产扫描或清理。

## 证据与未验证范围

归档器生成 [ARCHIVE.json](../../acceptance/wave7/j4/ARCHIVE.json)、.gitattributes 与 receipts/，索引共 184 份文件、3,365,486 字节，每份大小、SHA-256、与 .local 原始文件的字节一致。保留先红、首次负控前置拒绝、有效负控、恢复绿、三个 final 的完整日志及源码快照。

没有上网或修改出处网址，没有真实删除、创建删除夹具、原生窗口、选择框或浏览器。未改契约、检查器、台账、其它包、Git 配置或远端；没有 push、merge、rebase、amend、reset 或改写历史。提交身份仅在各提交进程设置为 Codex GPT-6 / codex-gpt6@localhost。

macOS、真实文件清理、实际数据库旁文件匹配与生产竞态未验证；第六波 .grok# 深层保护和 Claude Code 在用判断问题按 SPEC 原样保留。没有标记总控验收或主线集成通过。交回后停止本票测试；未启动持久后台进程。

## 修改后的十条规则完整 JSON

以下直接摘自最终 windows.json，按原顺序排列，包含全部字段。

```json
[
  {
    "rule_id": "desktop-updater-residue",
    "title_zh": "桌面应用更新包残留",
    "owner_zh": "Electron 应用",
    "category": "app_leftover",
    "level": "recommended",
    "locate": [
      {
        "kind": "pattern",
        "base": "local_app_data",
        "segments": [
          "*-updater",
          "pending"
        ]
      },
      {
        "kind": "pattern",
        "base": "local_app_data",
        "segments": [
          "*-updater",
          "installer.exe"
        ]
      }
    ],
    "item_type": "any",
    "min_age_hours": 24,
    "keep_newest": 0,
    "in_use": {
      "mode": "none",
      "processes": []
    },
    "growth": "slow",
    "what_zh": "桌面应用自动更新时下载的安装包，安装完成后常留在原处。",
    "why_zh": "只清超过一天的更新包残留；正在使用的文件删不掉时会原样留下。",
    "after_zh": "应用仍可使用；以后需要这些安装包时，会重新下载。",
    "fix_hint_zh": null,
    "sources": [
      {
        "kind": "local_observation",
        "ref": "2026-10-28 总控本机只读核查：Antigravity 更新包 166 MB 与 installer.exe 159 MB，ZCode 163 MB 与 156 MB，WorkBuddy 450 MB，OpenCode 两代 126 MB 与 237 MB，合计约 1.5 GB。",
        "checked_on": "2026-10-28"
      },
      {
        "kind": "official_doc",
        "ref": "https://github.com/electron-userland/electron-builder/blob/master/packages/electron-updater/src/DownloadedUpdateHelper.ts",
        "checked_on": "2026-10-28"
      },
      {
        "kind": "official_doc",
        "ref": "https://github.com/electron-userland/electron-builder/issues/8730",
        "checked_on": "2026-10-28"
      }
    ]
  },
  {
    "rule_id": "agent-cli-old-binaries",
    "title_zh": "命令行工具旧版本备份",
    "owner_zh": "Grok、Kimi Code",
    "category": "agent_tool",
    "level": "recommended",
    "locate": [
      {
        "kind": "pattern",
        "base": "user_profile",
        "segments": [
          ".grok",
          "bin",
          "*.old"
        ]
      },
      {
        "kind": "pattern",
        "base": "user_profile",
        "segments": [
          ".kimi-code",
          "bin",
          "*.bak"
        ]
      }
    ],
    "item_type": "file",
    "min_age_hours": 24,
    "keep_newest": 0,
    "in_use": {
      "mode": "none",
      "processes": []
    },
    "growth": "one_off",
    "what_zh": "命令行工具自更新后留下的旧程序备份，文件名以 .old 或 .bak 结尾。",
    "why_zh": "只清超过一天、以 .old 或 .bak 结尾的备份，当前程序不在清理范围内；正在使用的备份删不掉时会原样留下。",
    "after_zh": "当前程序仍可运行；若要回到旧版本，需要重新安装。",
    "fix_hint_zh": null,
    "sources": [
      {
        "kind": "local_observation",
        "ref": "2026-10-28 总控本机只读核查：.grok/bin/grok.exe.old 为 154 MB；.kimi-code/bin/kimi.exe.bak 为 152 MB，当前 kimi.exe 为 147 MB。",
        "checked_on": "2026-10-28"
      }
    ]
  },
  {
    "rule_id": "claude-code-old-versions",
    "title_zh": "Claude Code 旧版本",
    "owner_zh": "Claude Code",
    "category": "agent_tool",
    "level": "recommended",
    "locate": [
      {
        "kind": "pattern",
        "base": "user_profile",
        "segments": [
          ".local",
          "share",
          "claude",
          "versions",
          "*"
        ]
      }
    ],
    "item_type": "any",
    "min_age_hours": 24,
    "keep_newest": 1,
    "in_use": {
      "mode": "cmdline_references_item",
      "processes": [
        "claude.exe"
      ]
    },
    "growth": "slow",
    "what_zh": "Claude Code 原生安装目录里并排保留的旧版本程序。",
    "why_zh": "保留最新的一个版本，只清超过一天的旧版本。",
    "after_zh": "当前版本仍可使用；被清掉的旧版本需要重新安装才能使用。",
    "fix_hint_zh": null,
    "sources": [
      {
        "kind": "local_observation",
        "ref": "2026-10-28 总控本机只读核查：.local/share/claude 共 718 MB，versions 下有 2.1.285、2.1.287、2.1.296，各约 245 MB。",
        "checked_on": "2026-10-28"
      }
    ]
  },
  {
    "rule_id": "qoder-workspace-temp",
    "title_zh": "QoderWork 临时文件",
    "owner_zh": "QoderWork",
    "category": "agent_tool",
    "level": "confirm",
    "locate": [
      {
        "kind": "pattern",
        "base": "user_profile",
        "segments": [
          ".qoderworkcn",
          "tmp",
          "*"
        ]
      },
      {
        "kind": "pattern",
        "base": "user_profile",
        "segments": [
          ".qoderwork",
          "tmp",
          "*"
        ]
      }
    ],
    "item_type": "dir",
    "min_age_hours": 24,
    "keep_newest": 0,
    "in_use": {
      "mode": "none",
      "processes": []
    },
    "growth": "slow",
    "what_zh": "QoderWork 按工作区留下的临时目录。",
    "why_zh": "无法确定这些临时文件是否还要使用，需要你确认；只清超过一天的目录。",
    "after_zh": "清理后临时文件无法找回；确认工作区已不再需要它们后再清理。",
    "fix_hint_zh": null,
    "sources": [
      {
        "kind": "local_observation",
        "ref": "2026-10-28 总控本机只读核查：.qoderworkcn/tmp 下有两个按工作区命名的临时目录，时间为 7 月。",
        "checked_on": "2026-10-28"
      }
    ]
  },
  {
    "rule_id": "agent-tool-logs",
    "title_zh": "Agent 工具日志",
    "owner_zh": "多个 Agent 工具",
    "category": "agent_tool",
    "level": "recommended",
    "locate": [
      {
        "kind": "pattern",
        "base": "user_profile",
        "segments": [
          ".kimi-code",
          "logs",
          "*"
        ]
      },
      {
        "kind": "pattern",
        "base": "user_profile",
        "segments": [
          ".local",
          "share",
          "opencode",
          "log",
          "*"
        ]
      },
      {
        "kind": "pattern",
        "base": "user_profile",
        "segments": [
          ".copilot",
          "logs",
          "*"
        ]
      },
      {
        "kind": "pattern",
        "base": "user_profile",
        "segments": [
          ".workbuddy*",
          "logs",
          "*"
        ]
      },
      {
        "kind": "pattern",
        "base": "user_profile",
        "segments": [
          ".qoderwork*",
          "logs",
          "*"
        ]
      },
      {
        "kind": "pattern",
        "base": "user_profile",
        "segments": [
          ".antigravity_cockpit",
          "logs",
          "*"
        ]
      },
      {
        "kind": "pattern",
        "base": "user_profile",
        "segments": [
          ".codebuddy",
          "logs",
          "*"
        ]
      }
    ],
    "item_type": "any",
    "min_age_hours": 168,
    "keep_newest": 0,
    "in_use": {
      "mode": "none",
      "processes": []
    },
    "growth": "slow",
    "what_zh": "各个 Agent 工具自己的运行日志。",
    "why_zh": "只清一周以前的日志；旧日志通常可以清理，但排查过去的问题时可能用得上。",
    "after_zh": "工具会继续写新日志；被清理的旧日志无法找回。",
    "fix_hint_zh": null,
    "sources": [
      {
        "kind": "local_observation",
        "ref": "2026-10-28 总控本机只读核查：.workbuddy 与 .workbuddy-ai 的 logs 分别为 12 MB、9 MB；.local/share/opencode/log 为 5 MB。",
        "checked_on": "2026-10-28"
      },
      {
        "kind": "official_doc",
        "ref": "https://moonshotai.github.io/kimi-code/en/configuration/data-locations.html",
        "checked_on": "2026-10-28"
      },
      {
        "kind": "official_doc",
        "ref": "https://opencode.ai/docs/troubleshooting/",
        "checked_on": "2026-10-28"
      },
      {
        "kind": "official_doc",
        "ref": "https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-config-dir-reference",
        "checked_on": "2026-10-28"
      }
    ]
  },
  {
    "rule_id": "electron-gpu-caches",
    "title_zh": "应用的显卡着色器缓存",
    "owner_zh": "Electron 应用",
    "category": "app_leftover",
    "level": "recommended",
    "locate": [
      {
        "kind": "pattern",
        "base": "roaming_app_data",
        "segments": [
          "*",
          "DawnGraphiteCache"
        ]
      },
      {
        "kind": "pattern",
        "base": "roaming_app_data",
        "segments": [
          "*",
          "DawnWebGPUCache"
        ]
      },
      {
        "kind": "pattern",
        "base": "roaming_app_data",
        "segments": [
          "*",
          "GrShaderCache"
        ]
      },
      {
        "kind": "pattern",
        "base": "roaming_app_data",
        "segments": [
          "*",
          "GPUPersistentCache"
        ]
      },
      {
        "kind": "pattern",
        "base": "local_app_data",
        "segments": [
          "*",
          "DawnGraphiteCache"
        ]
      },
      {
        "kind": "pattern",
        "base": "local_app_data",
        "segments": [
          "*",
          "DawnWebGPUCache"
        ]
      },
      {
        "kind": "pattern",
        "base": "local_app_data",
        "segments": [
          "*",
          "GrShaderCache"
        ]
      },
      {
        "kind": "pattern",
        "base": "local_app_data",
        "segments": [
          "*",
          "GPUPersistentCache"
        ]
      }
    ],
    "item_type": "dir",
    "min_age_hours": 1,
    "keep_newest": 0,
    "in_use": {
      "mode": "none",
      "processes": []
    },
    "growth": "slow",
    "what_zh": "桌面应用网页引擎生成的显卡着色器缓存，用来加快画面显示。",
    "why_zh": "这些内容可以自动重建，只清超过一小时的缓存目录。",
    "after_zh": "应用会重新生成缓存，首次显示部分画面时可能稍慢。",
    "fix_hint_zh": null,
    "sources": [
      {
        "kind": "local_observation",
        "ref": "2026-10-28 总控本机只读体检：应用的显卡着色器缓存目录共 41 个，约 45 MB，其中可清的 34 个。",
        "checked_on": "2026-10-28"
      }
    ]
  },
  {
    "rule_id": "opencode-sessions",
    "title_zh": "OpenCode 会话与快照",
    "owner_zh": "OpenCode",
    "category": "agent_tool",
    "level": "protected",
    "locate": [
      {
        "kind": "pattern",
        "base": "user_profile",
        "segments": [
          ".local",
          "share",
          "opencode",
          "opencode.db*"
        ]
      },
      {
        "kind": "pattern",
        "base": "user_profile",
        "segments": [
          ".local",
          "share",
          "opencode",
          "snapshot"
        ]
      }
    ],
    "item_type": "any",
    "min_age_hours": 0,
    "keep_newest": 0,
    "in_use": {
      "mode": "none",
      "processes": []
    },
    "growth": "slow",
    "what_zh": "OpenCode 保存对话的数据库和用于找回改动的快照。",
    "why_zh": "这些内容用于续接会话与恢复改动，不能当作缓存清理。",
    "after_zh": "只统计占用，不提供清理，会话数据库和快照都会保留。",
    "fix_hint_zh": null,
    "sources": [
      {
        "kind": "local_observation",
        "ref": "2026-10-28 总控本机只读核查：.local/share/opencode 的 opencode.db 为 721 MB，snapshot 为 24 MB，数据库与快照受保护。",
        "checked_on": "2026-10-28"
      },
      {
        "kind": "official_doc",
        "ref": "https://opencode.ai/docs/troubleshooting/",
        "checked_on": "2026-10-28"
      }
    ]
  },
  {
    "rule_id": "kimi-code-sessions",
    "title_zh": "Kimi Code 会话",
    "owner_zh": "Kimi Code",
    "category": "agent_tool",
    "level": "protected",
    "locate": [
      {
        "kind": "pattern",
        "base": "user_profile",
        "segments": [
          ".kimi-code",
          "sessions"
        ]
      },
      {
        "kind": "pattern",
        "base": "user_profile",
        "segments": [
          ".kimi-code",
          "file-history"
        ]
      }
    ],
    "item_type": "dir",
    "min_age_hours": 0,
    "keep_newest": 0,
    "in_use": {
      "mode": "none",
      "processes": []
    },
    "growth": "slow",
    "what_zh": "Kimi Code 的对话记录与编辑文件的历史副本。",
    "why_zh": "这些记录用于续接对话和找回改动，不能作为运行日志清理。",
    "after_zh": "只统计占用，不提供清理，会话与文件历史继续保留。",
    "fix_hint_zh": null,
    "sources": [
      {
        "kind": "local_observation",
        "ref": "2026-10-28 总控本机只读体检：.kimi-code 的 sessions 与 file-history 共约 351 MB，受保护。",
        "checked_on": "2026-10-28"
      },
      {
        "kind": "official_doc",
        "ref": "https://moonshotai.github.io/kimi-code/en/configuration/data-locations.html",
        "checked_on": "2026-10-28"
      }
    ]
  },
  {
    "rule_id": "workbuddy-memory-sessions",
    "title_zh": "WorkBuddy 记忆与会话",
    "owner_zh": "WorkBuddy、CodeBuddy",
    "category": "agent_tool",
    "level": "protected",
    "locate": [
      {
        "kind": "pattern",
        "base": "user_profile",
        "segments": [
          ".workbuddy*",
          "memory"
        ]
      },
      {
        "kind": "pattern",
        "base": "user_profile",
        "segments": [
          ".workbuddy*",
          "sessions"
        ]
      },
      {
        "kind": "pattern",
        "base": "user_profile",
        "segments": [
          ".codebuddy",
          "sessions"
        ]
      },
      {
        "kind": "pattern",
        "base": "user_profile",
        "segments": [
          ".codebuddy",
          "file-history"
        ]
      }
    ],
    "item_type": "dir",
    "min_age_hours": 0,
    "keep_newest": 0,
    "in_use": {
      "mode": "none",
      "processes": []
    },
    "growth": "slow",
    "what_zh": "WorkBuddy 的长期记忆、对话，以及 CodeBuddy 的会话与文件历史。",
    "why_zh": "这些内容用于保留工具记忆、续接对话和找回改动，需要保护。",
    "after_zh": "只统计占用，不提供清理，记忆、会话和文件历史都会保留。",
    "fix_hint_zh": null,
    "sources": [
      {
        "kind": "local_observation",
        "ref": "2026-10-28 总控本机只读核查：.workbuddy 与 .workbuddy-ai 内有 memory、sessions、plans、plugins 等目录，其中 memory 与 sessions 受保护。",
        "checked_on": "2026-10-28"
      }
    ]
  },
  {
    "rule_id": "other-agent-sessions",
    "title_zh": "其它 Agent 工具会话",
    "owner_zh": "Gemini、Copilot、dsh",
    "category": "agent_tool",
    "level": "protected",
    "locate": [
      {
        "kind": "pattern",
        "base": "user_profile",
        "segments": [
          ".gemini",
          "tmp",
          "*",
          "chats"
        ]
      },
      {
        "kind": "pattern",
        "base": "user_profile",
        "segments": [
          ".copilot",
          "session-state"
        ]
      },
      {
        "kind": "pattern",
        "base": "user_profile",
        "segments": [
          ".dsh",
          "sessions"
        ]
      }
    ],
    "item_type": "dir",
    "min_age_hours": 0,
    "keep_newest": 0,
    "in_use": {
      "mode": "none",
      "processes": []
    },
    "growth": "slow",
    "what_zh": "Gemini、Copilot 和 DeepSeek Harness 保存的对话会话记录。",
    "why_zh": "这些记录用于续接对话，临时目录里的会话也不能当作缓存清理。",
    "after_zh": "只统计占用，不提供清理，已有会话记录会保留。",
    "fix_hint_zh": null,
    "sources": [
      {
        "kind": "local_observation",
        "ref": "2026-10-28 总控本机只读核查：.dsh 共约 3 MB，内有 profiles、sessions、storages 与 settings.yaml，其中 sessions 受保护。",
        "checked_on": "2026-10-28"
      },
      {
        "kind": "official_doc",
        "ref": "https://geminicli.com/docs/cli/session-management/",
        "checked_on": "2026-10-28"
      },
      {
        "kind": "official_doc",
        "ref": "https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-config-dir-reference",
        "checked_on": "2026-10-28"
      }
    ]
  }
]
```
