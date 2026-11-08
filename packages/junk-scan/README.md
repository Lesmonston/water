# water-junk-scan

Read-only Windows junk scanner for Flick checkup v1.

The crate locates entries from a scan plan, measures logical size and activity
without reading file contents, classifies cleanability, and emits snapshots.
It never writes, deletes, or changes attributes.

Items retain logical `total_bytes` and add `unique_bytes`: Windows directory
enumeration supplies volume serials and 128-bit file IDs, counted once within
each item. Missing IDs and non-Windows enumeration count the full length.
Groups sum `unique_bytes` and `eligible_unique_bytes` without deduplicating
across items. These sizes do not promise that deleting an item frees that space.
`result_from_json` supplies the logical totals for absent legacy fields; the
result version remains `water.scan-result.v1`.

Marker targets sharing a root use one iterative traversal, with independent
depth limits and branch stopping. Measurements reuse that traversal, while
per-target issues, overlap protection and output ordering retain their meaning.
The `runs_from_or_references_item` mode (including an empty process list) is
passed through to the group; this crate does not inspect processes.

Custom marker targets may add `conditions` for parent names and path text.
Parent conditions reuse the traversal's existing listing; at depth zero the
parent is unavailable. A target with `fallback_for` receives failed condition
matches from its primary and never starts its own search or progress. Every
marker match stops that primary's search inside the matched subtree, including
rejected matches without a fallback. Traversal and measurement stay the same;
fallback items use their own target's eligibility settings.

Snapshot growth requires at least 24 hours between observations. A leak hint
also requires increasing bytes, together with 20 additional recently active
items or at least 1 GiB per day. Rates still use the exact elapsed interval.

## Sizes, clusters and junction references

`scan` remains the default-options wrapper around `scan_full`. All modes read names and metadata only; directory listings are shared across pattern, marker, discovery and measurement work. Allocation sizes and creation times come from the same directory enumeration, with file-identity deduplication within each item.

`ScanObserver::on_root_done` receives a `RootProgress` for each distinct root in
`scan` and `scan_full`. Pattern bases and marker or discovery roots are deduplicated
without ASCII case sensitivity; fallback markers do not add roots. The event
preserves the first target's spelling, counts `roots_done` from 1 to the fixed
`roots_total`, and includes the current `visited_entries` count. Quarantine and
`.git` roots are reported first, in plan order. Other skipped roots are reported
when reached; walked roots are reported after their subtree finishes. Cancellation
or an exhausted budget leaves unfinished roots unreported. The callback defaults
to an empty implementation. Existing `on_progress` behavior is unchanged, and
`space_overview` does not emit root events.

`scan_full` can additionally report leak clusters, junction references and declaration file locations (`.flick-cleanup.json` and `.water-cleanup.json`, Flick first when both exist in one directory). It never parses declaration contents or follows a reparse point. Cluster membership and names are descriptive; use checks, valuable-file decisions and actual cleaning belong to the service/executor. `.flick-quarantine`, `.water-quarantine` and `.git` are never scan targets. Both quarantine names are matched without ASCII case sensitivity and remain included in `space_overview`.

Junctions with both hidden and system attributes are omitted from the reference index, including when used as scan roots. Junctions with only one of these attributes remain indexed. An item is referenced only when an external indexed junction's final target equals the item or lies inside it; targets above the item do not count. Comparisons follow path segments without ASCII case sensitivity.

`cache.db` directly inside `DawnCache`, `DawnGraphiteCache`, `DawnWebGPUCache`, `GraphiteDawnCache`, `GrShaderCache`, `GPUCache`, or `ShaderCache` is excluded from valuable-file counts. The file name and its immediate parent name are matched without ASCII case sensitivity. Other database names and `cache.db` under other immediate parents remain valuable under the existing rules. Classification uses names only.

Six-character random suffixes require an ASCII uppercase letter and a digit or lowercase letter. File clusters exclude UUID tails and JSONL files; all clusters exclude templates containing `backup` or `bak`. A directory is excluded from cluster searches when its own name or one of its four nearest ancestors is `sessions`, `subagents`, `conversations`, `chats`, or `transcripts` (ASCII case-insensitive). Streaming candidates and final cluster assembly share these checks, including extra hash-file siblings; ordinary targets still run normally.

`space_overview` makes an independent read-only traversal of one directory, including quarantine storage, and reports its ten largest direct children by allocated bytes. Its result does not authorize cleaning. The real smoke example runs the ordinary scan, all three extras and the user-profile overview, emitting summaries and counts only. It checks the indexed junction attributes and requires the hidden-and-system count to be zero. Junctions whose metadata is unavailable on re-read are skipped and counted separately.

The example independently checks the metadata of known Windows compatibility junctions within its scan roots. It reports how many hidden-and-system junctions it sees and how many are absent from the index, requiring these counts to match. Missing or unreadable candidates are not counted. A zero observation is allowed and explicitly reported as `none_seen`. The drive-root alias is checked only when a drive root is part of the scan; protected paths alone do not authorize that check. This observation uses junction metadata without following targets and does not attribute individual aggregated scan issues to paths.
