# water-native-scan

Windows x64 read-only native metadata under a real `water-scope-registry`
registration. The trusted Rust host prepares and confirms a scope, then calls
`v1::scan_registered` with that registry, scope, candidate root, scan ID, explicit
budgets and cancellation token. The candidate and actual root handles must match
the permit. Descendants open by live parent handle and one validated UTF-16
component. Reparse points are recorded as links and never traversed.

The scanner lists complete bounded directory batches, sorts raw UTF-16 names and
visits in preorder. Only attributes, real Windows 128-bit IDs and logical file
lengths are observed. There is no ordinary file content read, write, cleanup,
CLI, HTTP, WebView or picker. Cancellation and observer unwind release this
attempt; failed begin never cancels another host attempt.

`NativeScan::report()` returns a validated A report. All findings stay
unknown/protected. Recorded protected descendants add `protected_descendant`
after the two base reasons, as required by addendum01. Unvisited descendants do
not contribute reasons. Totals, allocated and reclaimable bytes remain unknown;
hardlinks retain one observation per path. Coverage does not imply a consistent
snapshot, volume-unique size or a safe cleanup decision.

Use `v1::redacted_json` for the default in-memory export; it calls the real Q
redactor and serializer. `v1::to_json` returns the complete native sidecar with
relative paths and Windows IDs, and is not a default public export. Neither API
writes a file or guarantees anonymity. P confirmation remains a trusted host
declaration; native gesture authentication and race verification remain false.
Non-Windows-x64 scan entry points return `UnsupportedPlatform`; memory decoding
and name validation remain available without granting access.

The only unsafe code is in `src/native_windows.rs`: two fixed Windows FFI
declarations, asserted x64 C layouts, initialized aligned buffers and success-only
HANDLE ownership transfer to `File`. Other modules forbid unsafe code.

The five integration tests consume only the helper-validated synthetic R index
and frozen in-memory decoder cases. Run targeted gates from the assigned R tree:

```powershell
node scripts/native-scan-addendum-check.mjs --task WATER-W1-R --mode suite
```

Real user directories, other Windows/filesystem versions, native selection,
malicious concurrent replacement/rename, macOS, desktop save and deletion remain
unverified. M1 is not complete.
