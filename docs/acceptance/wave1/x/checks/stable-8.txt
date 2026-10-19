# Native scan host

`water-scan-host <initial_directory>` runs the frozen interactive-host v1 stdio
protocol. The argument only sets S's initial directory. Every accepted job opens
the real S picker and calls V's capture and serializer on a dedicated thread.
Registry and picker capabilities stay on that thread; stdout has a single writer.

Only one job can be active. Up to 32 distinct start IDs may be accepted during a
process lifetime. IDs cannot be reused. Progress contains only the two real R
observer counts. Cancel matches the active ID and changes the same shared R token
that V receives. Cancel does not close a native dialog: the user must confirm or
cancel the selection. Shutdown or EOF cancels cooperatively, waits for the active
job, emits its terminal event, and then emits `stopped`.

Input is compact UTF-8 JSON plus LF, at most 4096 body bytes. Bad complete frames
produce fixed `InvalidRequest` events; oversize, truncated or unreadable streams
end with exit 2 and `Host unavailable.` on stderr after cooperative shutdown.
Argument errors exit 64 with `Invalid host arguments.`. There is no environment
input, shell, path command, injected scanner, filesystem write or deletion API.

The four assigned tests exercise the production parser, framing, state, shared
token and wire serializer without opening a picker. The frozen native gate runs
three real host jobs in one process: selection cancellation, completion, and
cancel before confirming selection. Tests use only this tree's authorized
synthetic fixtures. Windows controlled validation does not establish real user
scope, production race protection, native gesture authentication, macOS, desktop
packaging or M1 acceptance. Actual X-to-Y integration is a controller follow-up.
