# Water desktop host

Windows desktop host for the verified `../ui` frontend. `run(service_backend)`
wires the 17 IPC commands to `water_service::Service` through `ServiceBackend`.
M1 enables read-only checkups; `CLEAN_ENABLED` is fixed to false, so attempts to
prepare or start cleanup return the specified Chinese availability message.

Startup validates configuration, builds the Tauri app, prepares the private data
directories, acquires the single-instance lock, resolves the home directory,
constructs and manages the backend, creates the window, then enters the event
loop. Data-directory, lock and Tauri preparation failures return `StartupError`
without a setup callback; the entry point prints its fixed Chinese message and
exits with status 1. Backend creation goes through `backend_or_unavailable`:
failure supplies `UnavailableBackend` and the existing connection-error UI.
A Windows
`water.lock` handle with `share_mode(0)` stays open through the event loop. The
lock file stays empty and is retained after exit. A second instance writes an
empty `activate.signal` and exits successfully. The first instance consumes the
signal every 300 ms and schedules unminimize, show and focus on the main thread.
Directories and reparse points at the signal name are retained and ignored.
Signal writes also open the reparse point itself and check the handle before
resetting the file. `run_return` allows normal teardown: the activation thread is
stopped and joined before releasing the instance lock, with normal exit status 0.

The single `main` window is 1240×820 (minimum 1040×720), centered, transparent,
with Mica and the system title bar. Tauri applies Mica on supported Windows systems
and leaves unsupported systems without that effect. JavaScript and the 17 IPC v1
commands are enabled. Developer tools, drag-and-drop, external navigation, new
windows, downloads and permission requests are disabled. Only the bundled root
and index page can be navigated to. The sole frontend window permission is dragging.

`cmd_*` adapters reconstruct camelCase argument objects and pass backend values
and failures through unchanged. Configuration is embedded and checked before the
Tauri runtime starts; capability validation rejects extra permissions and fields.

`WATER_DATA_DIR` overrides the data location. Otherwise Tauri's local-data path is
resolved once to its real local disk path, stripping a verbatim disk prefix,
then extended by `Water`; WebView uses its `webview` child. Override paths are
never resolved through links. Paths must be absolute local disk paths; UNC and
device namespaces are rejected. Metadata checks reject reparse points beneath
the resolved base, at the data directory and at the WebView directory. Creation proceeds one directory
at a time, with parent rechecks. This is not a handle-based guarantee against a
concurrent adversarial directory replacement. No other environment values are read
by host code, and host code does not launch processes or perform network requests.

`HostPicker` connects the service's folder-picker interface to
`pick_folder(initial_directory)`, using the Tauri-resolved home directory. An
atomic flag and RAII guard reject concurrent picks with the specified busy error
and reset after success, cancellation or error. The underlying picker validates
the initial directory, creates a one-slot local registry and
fixed opaque ID, calls the accepted native picker and returns its selected path or
cancellation. No picker state is retained. Its six error variants have the exact
Chinese mappings specified by addendum 01. Tests call it only with `"relative"`,
which fails before any dialog can open.

`icons/icon.ico` retains the accepted G4 iceberg application icon. UI assets are read-only. The
current frontendDist also embeds frontend tests, as acknowledged by HOST section 7.

Run only the assigned controller gate from the worktree root:

```powershell
node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W4-G6 --mode check
node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W4-G6 --mode test
```

The unique `host_v1` target has five tests, with synthetic data only under this
worktree's `.local/w3-f3-fixtures/`. Each run removes only its newly created random
directory after verifying its parent and prefix and unlinking its own junction.
Parent creation tolerates competing tests. Fixture teardown reports errors without
panicking in `Drop`, and the test body explicitly checks cleanup. Tests inspect
the real Tauri wrapper signatures and handler registry, exercise the exclusive
lock and activation signal, and use a real Service with a synthetic Platform.
They directly construct `service_backend` in a fixture data directory, check its
state and disabled cleanup, and verify backend fallback and default-base junctions.
They never
open a window or picker and never scan real user locations.

The native final gate has a ticket-wide one-window budget. It completes one real
read-only checkup through the UI, confirms cleanup is disabled, and visits trends,
history and locations. It archives six window screenshots and verifies one scan
and snapshot, zero plans, cleans and journals, a private WebView profile and child
process exit. Do not launch the binary or a picker manually. All registry packages
come from the accepted AC lock and build offline with one job. macOS, release
packaging and the real picker UI remain unverified. Known M1 limitations are in
`contracts/desktop-v1/WIRING.md` section 7, as superseded by
`contracts/m2-prep-v1/HOST-FINISHING.md`. Foreground activation and backend-failure
UI are covered by code and unit tests; the single native gate exercises the
normal backend. It does not launch a second instance or inject startup failure.
