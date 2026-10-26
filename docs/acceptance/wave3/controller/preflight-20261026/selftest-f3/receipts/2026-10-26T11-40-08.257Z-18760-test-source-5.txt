# Water desktop host

Windows desktop host for the verified `../ui` frontend. F2 uses `UnavailableBackend`:
the page shows that the Water service cannot be reached. F3 will supply the actual
service through `run(Arc<dyn Backend>)`. This host does not scan or clean files.

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
extended by `Water`; WebView uses its `webview` child. Paths must be absolute local
disk paths. Metadata checks reject reparse points at every existing ancestor, at
the data directory and at the WebView directory. Creation proceeds one directory
at a time, with parent rechecks. This is not a handle-based guarantee against a
concurrent adversarial directory replacement. No other environment values are read
by host code, and host code does not launch processes or perform network requests.

`pick_folder(initial_directory)` is a Rust-only F3 integration point, not an IPC
command. It validates the initial directory, creates a one-slot local registry and
fixed opaque ID, calls the accepted native picker and returns its selected path or
cancellation. No picker state is retained. Its six error variants have the exact
Chinese mappings specified by addendum 01. Tests call it only with `"relative"`,
which fails before any dialog can open.

`icons/icon.ico` is an original 32×32 blue tile with a white water drop, encoded as
an ICO bitmap; it contains no third-party artwork. UI assets are read-only. The
current frontendDist also embeds frontend tests, as acknowledged by HOST section 7.

Run only the assigned controller gate from the worktree root:

```powershell
node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W3-F2 --mode check
node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W3-F2 --mode test
```

The unique `host_v1` target has four tests, with synthetic data only under this
worktree's `.local/w3-f2-fixtures/`. Each run removes only its newly created random
directory after verifying its parent and prefix and unlinking its own junction.
The native final gate has a separate, ticket-wide one-window budget. Do not launch
the binary or a picker manually. All dependencies are pinned to the accepted AC
lock and built offline with one job. macOS, release packaging, real picker UI and
service integration are not verified by this ticket's four tests.
