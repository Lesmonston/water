# WATER-W13-R1 补单 01：清单补上规则数据的快照，重采负控证明

2026-11-08，总控（Claude）。本补单是 [WATER-W13-R1](WATER-W13-R1-RULES-20261108.md) 的一部分，范围、白名单、检查入口、门与交回方式都照原单。

- **在哪做**：原工作树 `F:/new/smaltalk/water/.worktrees/w13-r1`（分支 `worker/water-w13-r1`），从提交 `504bd856890e599b1dfa66260b64320dec79d53f` 接着做，开工时树必须干净。
- **新开的对话**：先读原单全文、两份规则（`docs/dispatch/WORKER-RULES.md`、`docs/dispatch/W13-WORKER-RULES.md`）、契约 `contracts/w13-v1/W13.md` 第 0、3 节、你的回执 `docs/dispatch/reports/WATER-W13-R1-REPORT.md`，再读本补单。

## 为什么补

受阻回执属实，原因在总控的清单，不在实现。

- **哪里漏了**：第十三波清单的 R1 项写了 `negativeControlPaths`（规则 JSON），却没有 `productionFiles`。检查器的生产快照只收 `productionFiles`、`src/` 和测试文件，规则 JSON 不在里面。
- **后果**：负控改了规则 JSON，红与恢复后的绿 `productionHash` 却一样，`test --final` 的证明审计就报 “Missing valid negative control nc1”。
- **对照**：前三波同类的规则单（W10-M12、W11-N4、W12-P5）都带这一项。
- **已改**：总控已在权威清单 `F:/new/smaltalk/water/docs/dispatch/wave13/manifest.json` 的 R1 项补上，与 W12-P5 相同：

  ```json
  "productionFiles": ["packages/junk-rules/Cargo.toml", "packages/junk-rules/Cargo.lock", "packages/junk-rules/README.md", "packages/junk-rules/rules/windows.json"]
  ```

  检查器、契约和你的实现都不改。
- **旧证明为什么不能用**：之前的红与绿是按旧快照算的，恢复后的绿 `productionHash` 与现在对不上，所以要按新快照重采一遍。

## 1. 要做的

实现不改，`5e833287` 起的三个产品文件保持原样。检查命令照原单第 4 节：

```powershell
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W13-R1 --mode <模式> [--final]
```

按顺序：

1. **nc1**：`--mode red-nc1`，只改 `rules/windows.json` 一处（可以照回执第 6 节 nc1 的改法）→ `git checkout -- packages/junk-rules/rules/windows.json` 恢复原字节 → 立即 `--mode test`。
2. **nc2**：`--mode red-nc2`，同样只改一处（照回执第 6 节 nc2）→ 恢复 → 立即 `--mode test`。
3. **final**：`--mode check --final`、`--mode test --final`、`--mode real --final`，再 `--mode archive`。

注意：
- 两条负控之间不要插别的红门；每条红门后的第一件事就是恢复原字节并跑 `test`。
- 恢复后核对规则 JSON 的 SHA-256 仍是 `e1966f126de76acf23fb46977bd9576284b1b0f234c9fc48e45ad5c144db4236`。
- 如果 `test --final` 仍报同样的错，不要自己改清单或检查器，照写受阻交回。

## 2. 回执

改同一份回执 `docs/dispatch/reports/WATER-W13-R1-REPORT.md`：

- **第一行**：照原单第 6 节。做完写“任务已完成”，仍受阻写“任务受阻”。
- **第 1、2 节**：改成现在的结论；第 2 节可以缩成一段，说明受阻原因与总控的修正。
- **新加一节“补单 01”**：
  - 新的 red-nc1、test、red-nc2、test、三个 final 与 archive 的日志前缀和检查器退出码；
  - 每条负控红门的 `productionHash` 与恢复后绿的 `productionHash`（两者应不同），并说明快照里已有规则 JSON；
  - `test --final` 的证明审计采用了哪两组红、绿回执（结果 JSON 的 `proofAudit`）。
- **旧证据**：之前两次失败的 `test --final` 回执和旧的红、绿回执都留着，不删、不改。
- **提交**：只提交回执和 `archive` 生成的证据。不改清单、检查器、契约或其它包。

## 3. 边界

同原单第 5 节。原生窗口 0、选择框 0、浏览器 0；cargo 离线、单线程、私有 target；不 merge、不 rebase、不 push。
