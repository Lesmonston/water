# Water 总控交接报告（2026-11-06 第 21 份）

2026-11-06 23:50 JST，总控（Claude）。上一份：[第 20 份](CONTROLLER-HANDOFF-20261106-20.md)（`fd88a6d6`，开头有 22:55 的更新段）。用户要压缩上下文，写本份。**接手先读本份，再按需翻第 20 份。**

## 0. 一句话现状

- 第十波：
  - 已合入 7 张：M1、M2、M3、M4、M5、M8、M9；
  - M6 已验收，等 M7；
  - **M7 补单 06 已交回、正在验收**，后台还在跑变异；
  - M10 HOLD。
- M7 至今通过的项（详见第 2 节）：审计、lock／check／real 三个 final、独立复查都过了。只差变异与 test final。
- 都过就合入 M7，再合入 M6。
- 主线 `340199f4` 之后还有一个本份交接的提交，五步推送完成。

## 1. 这一段的提交（第 20 份 `fd88a6d6` 之后）

| 提交 | 内容 |
|---|---|
| `1c692377` | M7 补单 05 验收：REWORK（验收报告第 13.5 节），出补单 06 |
| `2f96db5c` | 第 20 份交接加 22:55 更新段 |
| `340199f4` | 补单 06 派给 sol（用户：“给sol了”）；补单里写的执行者从 Grok 改为 sol |

## 2. M7 补单 06 的验收（进行中）

- **交回**：sol（Codex GPT-6），回执 `84f76974`，实现提交 `db9c9185`、`d2f642a4`（最终干净实现 `d2f642a4`）。
  - 七项都做了：
    - 不能放隔离区的盘：准备时排除，开始前每批再查；
    - 查重同理；
    - `common` 编号保留并迁移；
    - 默认体检跳过拔掉的盘；
    - `inspect` 出错不删记录；
    - 还原先存记录再标空闲；
    - 补两处测试。
  - 测试 +535/−0，仍是 12 个。
- **审计**（`.local/w10-accept/audit-m7-2.json`）：0 个问题。
- **门禁**：验收树 `accept-w10-m7` 已快进到 `84f76974`（上一轮证据在 `.local/w10-accept/round7-evidence/m7/`，`heads.json` 的 m7 已改）。lock、check final、real final 都通过（`.local/w10-accept/logs/m7-1.txt`）。
- **独立复查**（同一个只读审查员）：
  - 修复正确完整，没有新的高危或中等；
  - 能调 `clean::quarantine` 的入口只有一处，由 `registered_target` 守着，与 `save_moves` 用同一个检查，不可能先挪后查；
  - Windows 仍传 `base: None`；
  - 新断言确实能抓住每处修复。
- **新的四条低**已写进 `record-verified.cjs` 的 m7 遗留：
  1. 全部“你选的”项都不能隔离时，预览是 0 字节的隔离块，`irreversible` 却为真；
  2. 整批被拒时，结果和记录页的说明别扭；
  3. 还原后写记录出错时不刷新；
  4. `common` 迁移后旧记录对不上。

  另外还有上一轮留下的四条低。
- **变异**（`mutations.json` 的 m7：nc1～nc3、c4～c15，共 15 条；c10～c15 专打补单 06）：
  - 第一次跑（`logs/m7-controls-run2.txt`）nc1 抓住。恢复原字节后的测试因 `skip_add` 超过 200 ms 失败，脚本按旧规则停下。
  - 照用户“计时失败可重跑”的规矩，`controls.mjs` 已改成：只因计时失败（`SERVICE_RETURN_BUDGET`、`took … ms` 等）的测试，最多重跑 3 次。旧版备份在 `controls.mjs.bak-20261106`。
  - 补跑一次完整测试，已绿（作为 nc1 恢复后的绿灯）。
  - **从 nc2 起的续跑正在后台**：`node .local/w10-accept/controls.mjs m7 nc2`，输出在 `.local/w10-accept/logs/m7-controls-run3.txt`，逐行日志追加在 `logs/m7-controls.txt`。大约 40 分钟（23:45 开始）。跑完会自动接着跑 `test --final`。
  - 预期全部抓住。上次没抓住的 nc2（线索上限）、c4（`\\?\` 前缀）应该被补单 06 的新断言抓住。
- 观察：这台机器上 `skip_add` 偶尔要 120～200 多毫秒（sol 的负控那次与总控恢复那次各一回），已记进 m7 遗留。

## 3. 下一步（按顺序）

1. **看续跑结果**：`grep -E "KILLED|SURVIVED|survived|--final|timing-only" .local/w10-accept/logs/m7-controls-run3.txt`。
   - 如果后台进程还在（`Get-Process node,cargo`），就等它跑完，不要同时跑别的重活。
   - 有变异没抓住：看日志，判断是测试缺口（记遗留，或出小补单）还是编译失败（改锚点重跑）。
   - `test --final` 必须通过；只因计时失败可再重跑。
2. **存证据**：
   - `bash .local/w10-accept/run.sh m7 archive`；
   - 把验收树的 `docs/acceptance/wave10/controller/accept-20261105/m7/` 复制到主线同名目录；
   - 把 `audit-m7-2.json`／`.err`、`logs/m7-controls.txt`（另存为 `m7-controls-2.txt`）、`logs/m7-1.txt`（另存为 `m7-gates-2.txt`）、`manifest.json`、`mutations.json` 复制到 `controller/`；
   - `git add -f`。
3. **写验收报告第 13.6 节**（M7 通过），格式照第 13.1 节。**写这节用 Python 或 Write，不要用不带引号的 heredoc**（反引号和反斜杠会被 bash 吃掉，这次出过错）。
4. **补 `record-verified.cjs` 的 m7 审查摘要**（`review` 里加 `m7: '...'`）。impl、self、遗留都已预填。m6 全部预填。
5. **合入**：先 M7，再 M6，都用 `--no-ff`，提交信息写进 scratchpad 文件用 `-F`。
   - M7：`git merge --no-ff worker/water-w10-m7`；
   - M6：`git merge --no-ff worker/water-w10-m6`（预检过，与 M7 无冲突）。
   - 核对 `git diff 84f76974 HEAD -- packages/water-service docs/acceptance/wave10/m7` 与 `git diff dbcf3366 HEAD -- apps/water/ui docs/acceptance/wave10/m6` 都为空。
   - 然后 `node .local/w10-accept/record-verified.cjs '{"m7":"<M7 合入>","m6":"<M6 合入>"}'`。
   - 合入后在主线上把服务与界面的测试各跑一遍（一次只跑一个 cargo）：照第 11.2 节的做法，或直接进第七次整合。
6. **STATUS 加一条、五步推送。**
7. **派 M10**：
   - 建 `.worktrees/w10-m10`（基线可改为合入后的主线），从工作树重算冻结哈希；
   - 跑 baseline；
   - 给用户粘贴语（后端单，用户选模型，常用 sol）。
   
   可同时出 M6 四条低的界面小单给 astra。
8. 照[收尾清单](dispatch/wave10/CLOSE-CHECKLIST.md)：M10 合入 → 第七次整合（开窗前告诉用户）→ release → M3.5 收口报告。

## 4. 教训（已写进验收报告第 13.4、13.5 节与记忆）

- 契约写“隔离根只在固定盘”时，要同时写清“其它盘上选了隔离怎么办”；先做不可逆动作、后做检查的顺序，要在契约里点名禁止。
- 不要无效的硬卡（用户 11-06）：只对纯计算路径定严格时限，写盘的命令给宽松上限，计时失败允许重跑。总控自己的变异脚本也要照这条（已改）。
- 换执行者时，把补单里写死的执行者名字一起改掉（这次补单 06 写的是 Grok，派给了 sol）。
- 回执交回先查编码；同一工作树一次只能有一个执行者。

## 5. 粘贴语

接手：

```text
交接里写了（F:/new/smaltalk/water/docs/CONTROLLER-HANDOFF-20261106-21.md）：读交接报告，准备接手 Water 总控，从第 3 节继续。
```

没有待外派的执行者粘贴语。
