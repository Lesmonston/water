# water-dup-finder

Explicitly invoked, read-only Windows duplicate discovery (DUP-M35, addendum 01).
The caller obtains user consent before calling; this package has no background
scan, cleanup, selection, process launch, network, or filesystem mutation API.

Traversal is depth first with sorted names. Reparse entries, reserved directories,
offline/recall files, empty and small files are excluded. Only size candidates are
opened, with share mode 7, OPEN_REPARSE_POINT and SEQUENTIAL_SCAN. Native queries
use only GetFileInformationByHandleEx classes 0/1/9/18 and the 32-bit volume serial
from GetVolumeInformationByHandleW. File metadata is never obtained by File::metadata.
Result creation and modification times consistently come from class 0.

Distinct identities are filtered by a 64 KiB prefix digest, then fully hashed in
1 MiB blocks with the local streaming SHA-256 implementation. Prefix handles are
closed; a full pass reopens and verifies the same identity, length and modification
time, then checks length/time on that same handle after reading. hashed_bytes counts
all actual content reads (prefix plus full passes, excluding hard-link aliases).
bytes_to_hash starts as a conservative upper bound and becomes actual bytes at
completion. Content is discarded; only metadata and digests survive.

Hard-link aliases share a copy, with up to eight displayed alias paths. Protection
and preference apply to aliases too. Cancellation is checked per block and empties
all result groups. Results suggest a keep order and expose no selected state.
Non-Windows discovery returns Unsupported; pure hashing/JSON remain available.

The four integration tests use only uniquely owned directories under this tree's
.local. real_smoke reads the main repository's docs once and prints counts only.
