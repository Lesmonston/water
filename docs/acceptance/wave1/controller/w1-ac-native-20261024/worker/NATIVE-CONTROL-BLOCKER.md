# Native helper encoding blocker

Observed failure: native helper exit1 at required embedded read-only page text assertion, after fixed-title own window was found. The original window attempt is consumed and not repeated.

The read-only parser and no-UI evidence distinguish two facts:

- **Proved checker defect:** the unchanged UTF-8-without-BOM helper, parsed by this Windows PowerShell5.1/Windows-1252 host, has two corrupted Chinese regex values. The exact required Unicode strings do not match these parsed values even in memory. Evidence includes original script SHA/BOM/host encoding, parsed literal codepoints, and both false regex results.
- **Still unknown:** the actual UIA descendant text and page rendering during PID41836. The frozen helper only writes collected text after its assertion succeeds, so no actual text snapshot exists for this failure. It is not legitimate to infer a successful page, screenshot or normal close from the encoding finding.

Minimal controller correction, not applied/executed:

1. Add a newly frozen native helper/entry preserving PID/title bounds, original required text, no pixel capture and 30-second limit; make expected Chinese patterns independent of legacy script decoding (for example, construct the same Unicode values from ASCII codepoints). Preserve the old frozen PS1 and all previous failures. An explicitly defined UTF-8 loading mechanism is another controller choice; no system/global encoding change is needed.
2. Persist the bounded own-window text and timestamps before assertion, including failure, so a failed check is reviewable. Record actual process cleanup/normal versus forced exit. Do not loosen or remove the text assertion to pass.
3. Issue a numbered supplement with original worker resume SHA, proof-reuse rules, and an explicit fresh bounded single-window authorization. This execution cannot assume the spent reservation resets itself. Source/test hashes are unchanged, final check/test passed; their reuse is a controller decision.

No alternative live helper invocation, native rerun, product mutation or permission request to relax scope occurred. Existing profile and logs remain. Product desktop acceptance, AA/AD/scan connection, real user scope, macOS and M1 remain unverified.
