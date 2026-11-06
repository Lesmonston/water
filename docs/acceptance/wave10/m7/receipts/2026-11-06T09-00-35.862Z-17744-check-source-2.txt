# Water service

Windows IPC v1 service library, independent of Tauri. `Service::new(ServiceConfig)` accepts the application's private data directory, a `Platform`, and a `FolderPicker`; the host forwards the 17 commands to `Service::call`. JSON arguments have exact camelCase keys; responses use the frozen snake_case views.

Scanning and cleaning run on owned background threads. The service serializes task starts and location edits, keeps view projections in memory, persists settings/records through flushed temporary files and rename, and bounds retained scan/clean records to 60. Process command lines remain inside the accepted process-scan snapshot. Callers must keep the service alive until a task completes or cancel/stop and poll it to completion before shutting down.

M1 hosts must set `clean_enabled: false`. With cleaning enabled, selection consists only of known group IDs; the service derives paths, identities, protection boundaries and rules from its latest scan, validates the plan with junk-clean, persists a SHA-256 token digest, consumes confirmation once, and flushes each journal record to disk. Token entropy comes from fresh standard-library `RandomState` instances; no time/PID seeds or extra FFI are used. The F1 smoke always disables cleaning and emits only aggregate JSON.

Run the controller-owned `scripts/desktop-wave-check.mjs --task WATER-W3-F1` entry from the assigned worktree. The five integration tests create and remove only their own freshly generated `.local/w3-f1-fixtures/service-*` directory. No product window, picker, browser, network access, or process spawning is needed. macOS support is not implemented or verified by this Windows ticket.
