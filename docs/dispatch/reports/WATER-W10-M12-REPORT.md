WATER-W10-M12 任务受阻，任务报告在 F:/new/smaltalk/water/.worktrees/w10-m12/docs/dispatch/reports/WATER-W10-M12-REPORT.md

日期：2026-11-07。执行者：Codex（GPT-6；未获得更细的运行模型标识），未使用子代理。

## 基线与现场

- 工作树：`F:/new/smaltalk/water/.worktrees/w10-m12`。
- 分支：`worker/water-w10-m12`。
- 首次 HEAD：`98f9678e6a49bb63b87272644dae15c721384d9c`，初始工作树干净；baseline 前后均为该 SHA、空 status。
- 实现提交 SHA：无。发现检查入口与票面冲突后即停止实现；本次只提交受阻回执和归档器生成的证据。
- M13 未开工、未改文件、未跑 baseline；只读核实其分支 `worker/water-w10-m13` 仍在同一初始 SHA，工作树干净。

## 阻塞：数据负控与检查器的源码改动要求不一致

权威工单 `F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W10-M12-RULES-FIX-20261107.md` 第 4 节明确：

> 本单的负控改的是 `rules/windows.json`，不是 `src/`（本单只改数据）。

其中 nc1 要在安装包第二个定位器加回 `*#*.exe`；nc2 要将数据版本退回 `2026-11-02.2`。第 1 节又要求：`src/` 不需要改，若发现非改不可，先写受阻回执；第 6 节禁止改检查器。

实际指定入口 `F:/new/smaltalk/water/scripts/checkup-wave-check.mjs` 第 188 行，在所有 Rust `red-ncN` 分支中先执行以下检查：

```javascript
assert.notEqual(
  git(['diff','--name-only','HEAD','--',task.outputRoot+'/src']),
  '',
  'A negative control needs an uncommitted change under '+task.outputRoot+'/src'
);
```

该文件没有针对 M12 的数据负控例外。M12 的 `outputRoot` 是 `packages/junk-rules`，所以只改 `rules/windows.json` 时，此处必然拒绝，尚未执行 cargo test。预期拒绝文字为：

```text
A negative control needs an uncommitted change under packages/junk-rules/src
```

这是静态核对得出的阻塞，**没有运行 red-nc1 / red-nc2，不把上述文字称为实测失败日志**。读取的检查器 SHA-256 为 `1ef6025b9865f789e6bdbf86088f1fd2d5cb2658499bf785a2ee391dc8b9cca3`。M12 的 manifest 虽将 `rules/windows.json` 列入 `productionFiles`，上述负控前置断言仍固定检查 `/src`。

在 `src/` 加无意义改动以满足检查器，既不符合票面，也不是有效负控；修改检查器则超出白名单。因此按用户“某一张受阻就停下写那张单的受阻回执，不要跳到下一张”及执行者通用规则第 4 节停在 M12。

最小补充：由总控修正指定检查入口，为 M12 的两条负控接受 `packages/junk-rules/rules/windows.json` 的真实未提交变异，保留禁止改测试、目标失败标记、源码哈希和立即恢复后变绿的核验。无需扩大产品范围或授权虚假的 `src/` 变异。续做入口还需允许从本次仅含回执与证据的提交继续，避免再次按“首次 HEAD 必须完全等于基线”重跑 baseline。

## 已执行的检查

命令均在 M12 工作树根目录执行：

| 命令 | 结果 |
|---|---|
| `git status --short`、`git rev-parse HEAD`、`git branch --show-current` | 初始状态干净，SHA、分支与票面一致 |
| `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W10-M12 --mode baseline` | exit 0，passed；离线缓存完整；无产品测试；已知目录存在性九项均为 true |
| `Get-Process -Name cargo,rustc,clippy-driver -ErrorAction SilentlyContinue` | 无匹配进程；没有启动 cargo 检查或产品测试 |
| `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W10-M12 --mode archive` | exit 0，passed；归档 8 个记录/日志，共 9,475 字节 |

本次 baseline 回执：`docs/acceptance/wave10/m12/receipts/2026-11-07T03-14-04.071Z-26168-baseline-result.json`；`productTestsRun` 与 `realDataRead` 都为 false。baseline 只做环境、冻结输入与已知目录存在性检查，不代表实现通过。

归档器同时原字节收录了 `.local` 内预先存在的总控 baseline（`2026-11-07T03-03-07.873Z-25592`）及本次 baseline（`2026-11-07T03-14-04.071Z-26168`），各一份 JSON 与三份日志。前者不是本执行者新跑的检查。索引和逐文件 SHA-256 见 `docs/acceptance/wave10/m12/ARCHIVE.json`。本次 archive 自身回执留在 `.local/checks/WATER-W10-M12/2026-11-07T03-14-40.352Z-20328-archive-result.json`，归档器本次不会收录自己尚未写出的回执。

## 工单逐项状态与未验证项

1. 安装包第二个定位器：未改；原模式、条件、深度和第一定位器均保持基线。
2. `why_zh`：未改。
3. `data_version` 与 README：未改。
4. 工单对 SPEC 的补充已读取；契约未改。
5. 新断言未添加；旧断言无迁移，因而没有原值/新值变更清单。
6. 负控未执行、未产生变异或恢复哈希；不宣称任何有效负控。
7. `lock`、`check`、`test`、`real`、三个 final 均未执行。真实安装程序匹配、M12/M13/M14 集成、macOS 均未验证。
8. 没有启动窗口、选择框、浏览器或后台服务；没有网络访问、下载、真实清理或合成夹具删除；没有修改主线、其它包、台账、契约、检查器、依赖、Git 配置或远端，没有 push 或改写历史。

本次结果仅为受阻交回，不能记为完成或验收通过。M13 按用户要求保持未开始。
