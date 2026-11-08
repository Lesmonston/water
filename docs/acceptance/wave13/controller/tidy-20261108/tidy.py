# Post-merge public wording tidy after wave 13 (run from the repo root). Every old text must occur exactly as often as
# stated, or nothing is written. Docs, test data, test comments, one product comment and one script assertion.
import sys

EDITS = {
    'contracts/checkup-v1/IPC.md': [
        ('2026-10-26 冻结。界面（WATER-W2-E）通过 Tauri `invoke` 调用下列命令；可信宿主（下一波的桌面接线票）实现它们，并在内部调用 A–D 四个 crate。界面只认这里的形状。',
         '2026-10-26 冻结。界面通过 Tauri `invoke` 调用下列命令；可信宿主实现它们，并在内部调用规则、扫描、进程与清理四个 crate。界面只认这里的形状。', 1),
        ('并按 [CLEAN](CLEAN.md) 逐项复核', '并按清理契约逐项复核', 1),
    ],
    'contracts/m35-v1/IPC-M35.md': [
        ('# IPC-M35：界面接口（第十波，设计 v2）', '# IPC-M35：界面接口（设计 v2）', 1),
        ('2026-11-05，总控（Claude）冻结（11-02 起草，11-05 按通读结果修订）。', '2026-11-05 冻结（11-02 起草，11-05 修订）。', 1),
        ('- 服务（M7，[SERVICE-M35](SERVICE-M35.md)）产出这些形状，宿主（M5，[HOST-M35](HOST-M35.md)）转发，界面（M6，[UI-M35](UI-M35.md)）消费。',
         '- 服务产出这些形状，宿主转发，界面消费。', 1),
        ('- 依据：[设计 v2](../../docs/design/water-ui-v2/DESIGN.md) 第 3～6 节，[第十波计划](../../docs/dispatch/wave10/PLAN.md)第 2 节。',
         '- 依据：界面设计 v2 第 3～6 节。', 1),
        ('冻结时由总控给出（照 IPC-M3C 的做法', '与本文一起冻结（照 IPC-M3C 的做法', 1),
    ],
    'contracts/m3c-v1/IPC-M3C.md': [
        ('2026-10-31，总控（Claude）冻结。补充 [IPC](../checkup-v1/IPC.md)（`water.ipc.v1`），冲突时以本文为准。依据：[第八波计划](../../docs/dispatch/wave8/PLAN.md)（已拍板）。',
         '2026-10-31 冻结。补充 [IPC](../checkup-v1/IPC.md)（`water.ipc.v1`），冲突时以本文为准。', 1),
        ('- 服务（W8-K4）产出这些形状，宿主（W8-K5）转发，界面（W8-K6）消费。', '- 服务产出这些形状，宿主转发，界面消费。', 1),
    ],
    'packages/cleanup-manifest/tests/manifest_v1.rs': [
        ('"project":"Water","producer":"总控与执行器"', '"project":"Flick","producer":"维护者与贡献者"', 1),
        ('{"path":".worktrees/w10-m1","note":"第十波 M1"}', '{"path":".worktrees/feature-a","note":"功能分支 A"}', 1),
    ],
    'packages/junk-clean/src/model.rs': [
        ('    /// W12: the journal stopped accepting lines after an action already ran; this item was not touched.\n'
         '    /// Interface landed by the controller in the wave 12 base; WATER-W12-P1 produces it.\n',
         '    /// The journal stopped accepting lines after an action already ran; this item was not touched.\n', 1),
    ],
    'scripts/browser-lab.mjs': [
        ("assert(relativePath.startsWith('docs/acceptance/wave1/c/') || relativePath.startsWith('.local/browser-lab/'));",
         "assert(!isAbsolute(relativePath) && !relativePath.startsWith('.git/'), 'Screenshot path must be relative to the worktree');", 1),
    ],
    'packaging/public/root/CONTRIBUTING.md': [
        ('2. 规则总数和数据版本 `data_version`（格式 `YYYY-MM-DD.N`）在测试里有断言，加规则后一起改。',
         '2. 规则总数和数据版本 `data_version`（格式 `YYYY-MM-DD.N`）各由 `tests/rules_v1.rs` 开头的一个常量断言（`EXPECTED_RULE_COUNT`、`EXPECTED_DATA_VERSION`），加规则后改这两处。', 1),
        ('update the asserted rule count and `data_version` too.',
         'update `EXPECTED_RULE_COUNT` and `EXPECTED_DATA_VERSION` at the top of that file too.', 1),
    ],
    'packages/junk-scan/tests/scan_v1.rs': [
        ('m13_expected_cluster_id', 'expected_cluster_id', 2),
    ],
    'packages/water-service/tests/service_v1.rs': [
        ('    // Addendum 05: commands that sync-write files in the same call get 200 ms.\n',
         '    // Commands that write files synchronously in the same call get 200 ms.\n', 1),
        ('    // Before W10-M12 the rules also took unins000.exe as an installer; since M12 it is no item at\n'
         '    // all. Either way it must never be clean-able.\n',
         '    // Older rules data took unins000.exe as an installer; now it is no item at all. Either way it\n'
         '    // must never be clean-able.\n', 1),
    ],
    'contracts/m35-v1/ui-fixtures-m35.json': [('Water 只', 'Flick 只', 18)],
    'contracts/m3c-v1/ui-fixtures-m3c.json': [('Water 只', 'Flick 只', 1)],
    'contracts/checkup-v1/ui-fixtures.json': [('Water 只', 'Flick 只', 1)],
}

out = {}
for path, edits in EDITS.items():
    raw = open(path, 'rb').read()
    crlf = b'\r\n' in raw
    text = raw.decode('utf-8').replace('\r\n', '\n') if crlf else raw.decode('utf-8')
    for old, new, n in edits:
        found = text.count(old)
        if found != n:
            sys.exit(f'{path}: expected {n} of {old[:60]!r}, found {found}')
        text = text.replace(old, new)
    out[path] = text.replace('\n', '\r\n') if crlf else text
for path, text in out.items():
    open(path, 'wb').write(text.encode('utf-8'))
    print('edited', path)
