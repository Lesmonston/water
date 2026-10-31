# water-junk-scan

Read-only Windows junk scanner for Water checkup v1.

The crate locates entries from a scan plan, measures logical size and activity
without reading file contents, classifies cleanability, and emits snapshots.
It never writes, deletes, or changes attributes.
