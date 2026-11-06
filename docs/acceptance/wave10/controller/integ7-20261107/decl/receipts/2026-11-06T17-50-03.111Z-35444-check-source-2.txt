# water-cleanup-manifest

Independent, safe Rust implementation of MANIFEST-M35. Reads only an explicitly
supplied .water-cleanup.json (at most 64 KiB) or a worktree's .git file (1 KiB).
Windows opens carry FILE_FLAG_OPEN_REPARSE_POINT; reparse files are rejected before
opening. The gitdir target receives only an existence/directory metadata check.
No discovery, writes, command execution, networking or git invocation is provided.

Parsing validates the entire declaration before producing a Manifest. Untrusted
declarations produce no disposable scan targets; protected patterns apply without
a trust flag. SHA-256 is implemented locally, and trust must be bound by the caller
to the returned raw-byte hash. Display-only fields are never executed.

The real_smoke example only counts .git states in this repository's .worktrees and
optionally reads its root declaration once. Paths and declaration text are not
printed. Tests use fresh, individually owned directories under this tree's .local;
junctions are removed individually before the owned directory is reclaimed.
