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
