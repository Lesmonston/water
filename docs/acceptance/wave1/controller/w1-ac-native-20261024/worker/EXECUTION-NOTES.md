# AC addendum 03 execution record

2026-10-24, original AC executor conversation, Codex / GPT-6; no finer model identifier exposed.
No agents/workers, product edits, network/download changes, configuration writes, merge/push or ledger edits.

Initial clean HEAD 82d04aaeef73030f65bc0a070b99a5517fd5d6a3 on worker/water-w1-ac; all 14 product/test/lock files unchanged from implementation eb7f80178191e233068015bbc26dc9798ac8cb22. Original report/archive/46 and addendum02 report/archive/189 remain read-only.
Initial focused reads guessed scripts/ac-cargo-arguments.mjs and looked for the later mirror SPEC in the original worker tree; those paths do not exist. Actual scripts/ac-clippy-arguments.mjs and controller absolute mirror SPEC were read. These inspection errors are not product/test failures.

- 04:33:17 resume: frozen absolute ac-final-check, exit 0; clean exact HEAD, 14 hashes unchanged, 523 constraints passed.
- 04:33:56 check --final: metadata, policy, old-proof audit, fmt and corrected Clippy all passed. Cargo/helper/launcher exits 0, before/after same clean HEAD. No cold dependency build or download.
- 04:35:09 test --final: all three named top-level tests passed; 0 ignored/measured/filtered; Cargo/helper/launcher exits 0, before/after same clean HEAD.
- 04:36:01 native --final: build exit 0. The frozen UIA helper reached its required-page-text assertion and returned 1; it had already found the own PID's fixed-title window. It did not return UIA text or a success record. The frozen outer helper terminated its own desktop process, logged ownedTermination=true, normal exit=null and returned 1. No retry or second launch.
- All three finals used the same clean 82d04aa and the unchanged product/test hashes approved by supplement03. The old AC_BEHAVIOR/nc1/nc2/immediate restore/test greens were read from the committed addendum02 archive by the frozen proof function, not rerun.

Native failure static diagnosis:

The frozen PS1's SHA remains 11ea5436c13b9a0c9aa77305eb6570f2fc60c5ca24215e8e64acedad1fbc6363. It is UTF-8 without BOM. Local Windows PowerShell 5.1.26100.8875 uses default encoding Windows-1252. A read-only Parser.ParseFile inspection, not execution of the helper, produced mojibake values for both Chinese regex literals. Original UTF-8 bytes contain the intended strings, but parsed literals do not. A subsequent in-memory test using exact required Unicode strings constructed from codepoints failed both parsed regex patterns. This verifies a checker decoding defect without opening a window. Actual WebView page text/rendering remains unverified; it was not preserved by the failed UIA helper. Do not replace this failure with a synthetic UI pass.

An 18-second process-only observer started after the desktop process had exited, captured no own in-flight process samples, and opened no UI/read no pixels. It proves no in-flight profile choice or lifecycle; final process inspection separately found no owned native/checker/Cargo/WebView process. The helper recorded one forced desktop termination; manual terminations were zero. A single new private profile directory whose name contains desktop PID41836 exists under the assigned tree. Only its directory metadata was read, no profile contents; it is retained and excluded from Git.

Window reservation is consumed: one native attempt, zero directory chooser launches, no screenshots/pixel reads. The record.systemNativeDialogs field remains its initial zero because it is only assigned after UIA succeeds; this is not evidence that no window appeared. The fixed-title search succeeded before the assertion failure. No normal exit0, complete UIA page verification or child process lifecycle pass is claimed.

Next action belongs to the controller: numbered additive fix for the native helper's string decoding, preserve old frozen bytes and failures, define a fresh explicit bounded window allowance and exact original-executor resume. No frozen helper edit, cache cleanup, global encoding/network setting or alternative UI command was applied. This supplement ends BLOCKED, not SUBMITTED/VERIFIED.
