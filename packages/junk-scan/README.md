# water-junk-scan

Read-only Windows junk scanner for Water checkup v1.

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
# M3.5 additions

`scan` remains the default-options wrapper around `scan_full`. All modes read names and metadata only; directory listings are shared across pattern, marker, discovery and measurement work. Allocation sizes and creation times come from the same directory enumeration, with file-identity deduplication within each item.

`scan_full` can additionally report leak clusters, junction references and declaration file locations. It never parses declaration contents or follows a reparse point. Cluster membership and names are descriptive; use checks, valuable-file decisions and actual cleaning belong to the service/executor. `.water-quarantine` and `.git` are never scan targets.

Six-character random suffixes require an ASCII uppercase letter and a digit or lowercase letter. File clusters exclude UUID tails and JSONL files; all clusters exclude templates containing `backup` or `bak`. A directory is excluded from cluster searches when its own name or one of its four nearest ancestors is `sessions`, `subagents`, `conversations`, `chats`, or `transcripts` (ASCII case-insensitive). Streaming candidates and final cluster assembly share these checks, including extra hash-file siblings; ordinary targets still run normally.

`space_overview` makes an independent read-only traversal of one directory, including quarantine storage, and reports its ten largest direct children by allocated bytes. Its result does not authorize cleaning. The real smoke example runs the ordinary scan, all three extras and the user-profile overview, emitting summaries and counts only.
