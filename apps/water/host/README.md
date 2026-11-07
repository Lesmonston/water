# Flick desktop host

Windows desktop host for the verified `../ui` frontend. `run(service_backend)`
wires 39 IPC commands: 37 thin adapters to `water_service::Service` through
`ServiceBackend`, the guarded `quarantine_reveal` adapter described below, and
the host-owned `app_info` response.
`CLEAN_ENABLED` is true: cleanup uses the service's existing plan and confirmation
flow.

Startup validates configuration, builds the Tauri app, prepares the private data
directories, acquires the single-instance lock, resolves the home directory,
constructs the backend and manages a forwarding `BackendSlot`, creates the window, then enters the event
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
Signal writes also open the reparse point itself and check the handle; an existing
ordinary signal keeps its content and length and only its modification time changes.
`run_return` allows normal teardown: join the close-wait thread, take and drop the
backend from its slot, stop and join the activation thread, then release the
instance lock, with normal exit status 0.

`Backend::available` defaults to true. `UnavailableBackend` and a taken backend
slot report false; a populated slot forwards availability without holding its
mutex while calling the backend. `clean_state` returns non-cleaning immediately
for an unavailable backend without querying or stopping it. An available backend
whose state query fails still reports unknown.

`clean_state` treats both cleaning and purging as cleaning; deduping is read-only.
It distinguishes cleaning, confirmed non-cleaning and an unknown state.
The close guard permits immediate closing only for confirmed non-cleaning. For
cleaning or unknown states it prevents the request and calls
`stop_cleaning_and_wait` on a background thread before closing. Repeated close
requests do not send repeated stops. Both wait functions send `clean_stop` once,
continue through cleaning, and give up after five consecutive seconds of unknown
state; a confirmed cleaning state resets that unknown interval. Only a confirmed
non-cleaning state produces `CleanStop::Stopped`. The bounded function reports
`TimedOut` when either waiting limit expires; the boolean function returns true
when it requested stopping, including an initially unknown state.

Inside the `RunEvent::Exit` callback, `stop_cleaning_within` synchronously polls the
backend every 200 ms with a ten-second total limit starting before the first
state query, covering system session exit
as well as normal closing. The callback only calls the backend and does not post
window operations to the event loop. If the first query exhausts the limit while
cleaning or unknown, it still sends one stop and returns `TimedOut` without
querying again. These limits bound polling waits, not an
individual synchronous backend call that itself fails to return.

The single `main` window is 1240×820 (minimum 1040×720), centered, transparent,
with Mica and the system title bar. Tauri applies Mica on supported Windows systems
and leaves unsupported systems without that effect. JavaScript and the 39 IPC
commands are enabled. Developer tools, drag-and-drop, external navigation, new
windows, downloads and permission requests are disabled. Only the bundled root
and index page can be navigated to. The sole frontend window permission is dragging.

`cmd_*` adapters reconstruct camelCase argument objects and pass backend values
and failures through unchanged. Configuration is embedded and checked before the
Tauri runtime starts; capability validation rejects extra permissions and fields.
`clean_prepare` forwards `excludeItemIds` only when the optional list is nonempty;
omitted and empty lists retain the original `groupIds`-only request bytes.
`skip_add` and `skip_remove` forward `itemId` and `skipId` respectively. The host
does not validate IDs or interpret the service's responses.

`scan_start` omits `locationIds` for None, preserving the original `{}` bytes;
provided lists, including empty lists, pass through. `clean_prepare` accepts
optional groups, exclusions, conclusion version/mode and dedupe ID/version. It
omits absent keys and empty exclusions, preserving legacy request bytes.
The 17 additions follow IPC-M35 section 1 in both registries; `group_items`
preserves explicit nulls for omitted row/search values.

The three W12 commands follow those additions in both registries:
`skip_unit_add` forwards exactly `conclusionVersion` and `unitId`,
`diagnostics_get` forwards `{}`, and `app_info` returns the Flick name, host
package version, `MIT OR Apache-2.0` license and project homepage without a
service call. The bundle publisher is `Flick`; bundling remains disabled.

`quarantine_reveal` privately calls `quarantine_locate` with a target ID and
validates its returned path before opening anything. Only absolute disk paths
ending in `.flick-quarantine` or `.water-quarantine`, or their 1–48 character alphanumeric/hyphen ID child
are accepted, case insensitively. Ambiguous spellings, shell delimiters, traversal,
files and leaf reparse points are rejected. The real `ExplorerOpener` in
`src/opener.rs` rechecks the folder, reads `SystemRoot`, checks its `explorer.exe`
is an ordinary file, and spawns it with the single folder argument without a
shell or waiting. Locate failures pass through; unsafe paths return `invalid`;
opener failure returns `unavailable`; success returns `{}`. The internal locate
command is absent from all frontend registries and wrappers. Metadata validation
does not provide a handle-based guarantee against concurrent path replacement.

`WATER_DATA_DIR` overrides the data location. Otherwise Tauri's local-data path is
resolved to its real local disk path, stripping a verbatim disk prefix and
canonicalizing again to verify the meaning is unchanged, then extended by
`Flick`; WebView uses its `webview` child. If Flick is absent and the sibling
`Water` is a plain directory, the host attempts one rename of Water to Flick.
If that fails, an existing valid Flick wins; otherwise a still-valid Water is
used for this launch and migration is retried next time. The fallback never
recreates a missing Water root. Existing Flick directories take priority without
inspecting Water; old links are neither followed nor renamed. No contents are
copied, merged or deleted. Overrides bypass migration entirely. Override paths are
never resolved through links. Paths must be absolute local disk paths; UNC and
device namespaces are rejected. Metadata checks reject reparse points beneath
the resolved base, at the data directory and at the WebView directory. Creation proceeds one directory
at a time, with parent rechecks. This is not a handle-based guarantee against a
concurrent adversarial directory replacement. The only additional environment
value read is `SystemRoot`, and only `src/opener.rs` launches Explorer as above.
Host code performs no network requests.

`HostPicker` connects the service's folder-picker interface to
`pick_folder(initial_directory)`, using the Tauri-resolved home directory. An
atomic flag and RAII guard reject concurrent picks with the specified busy error
and reset after success, cancellation or error. The underlying picker validates
the initial directory, creates a one-slot local registry and
fixed opaque ID, calls the accepted native picker and returns its selected path or
cancellation. No picker state is retained. Its six error variants have the exact
Chinese mappings specified by addendum 01. Tests call it only with `"relative"`,
which fails before any dialog can open.

`flick.exe` uses the Flick window title and the exact icon from
`docs/design/flick-brand/flick-app-icon.ico`. Package and library names remain
`water-desktop` and `water_desktop`. UI assets are read-only. The
current frontendDist also embeds frontend tests, as acknowledged by HOST section 7.

Run only the assigned controller gate from the worktree root:

```powershell
node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W12-P3 --mode check
node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W12-P3 --mode test
```

The unique `host_v1` target has five tests, with synthetic data only under this
worktree's `.local/w3-f3-fixtures/`. Each run removes only its newly created random
directory after verifying its parent and prefix and unlinking its own junction.
Parent creation tolerates competing tests. Fixture teardown reports errors without
panicking in `Drop`, and the test body explicitly checks cleanup. Tests inspect
the real Tauri wrapper signatures and handler registry, exercise the exclusive
lock and activation signal, and use a real Service with a synthetic Platform.
They directly construct `service_backend` in a fixture data directory, check its
state and enabled cleanup, and verify backend fallback and default-base junctions.
The trailing-dot fixture also creates the ordinary spelling so both
canonicalizations succeed before their results are compared. Scripted cleanup
only counts down after receiving stop; tests cover bounded exit, unknown-state
waiting, unknown intervals interrupted by cleaning, unavailable backends, and a
slow initial state query. Token-based source checks distinguish `Exit` from
`ExitRequested`, scope its stop call and ordered poll/deadline arguments to the
actual branch, and require the close
guard to let only confirmed non-cleaning pass before preventing the close.
The tokenizer handles character and raw-string literals and reports non-ASCII
code explicitly. A partial initial query also consumes the bounded wait's limit.
They never
open a window or picker and never scan real user locations.

The native final gate has a ticket-wide one-window budget. Its 17 steps run a
checkup, preview, confirmation, cleanup, quarantine and permanent purge through the UI. The seven
categories are disabled and only a synthetic fixture under this worktree's
`.local/w12-p3-native/` is selectable; protected locations are measured read-only.
It archives the assigned window screenshots and verifies fixture deletion and retained
guard files, one scan, snapshot, plan and clean, the clean and purge journals, a private WebView profile
and child process exit. Do not launch the binary or a picker manually. All registry packages
come from the accepted AC lock and build offline with one job. macOS, release
packaging and the real picker UI remain unverified. Known M1 limitations are in
`contracts/desktop-v1/WIRING.md` section 7, as superseded by
`contracts/m2-prep-v1/HOST-FINISHING.md`, `contracts/m2-v1/HOST-M2.md` and
`contracts/m3-v1/HOST-M3.md` and `contracts/m3-v1/HOST-M3-FIX.md`. Foreground activation and backend-failure
UI are covered by code and unit tests; the single native gate exercises the
normal backend. It does not launch a second instance, inject startup failure,
request a real system shutdown or close the window during active cleanup.
Tests use a recording Opener, including an owned junction rejection fixture;
neither tests nor the native gate click “打开文件夹” or launch Explorer.
The baseline UI and service are unchanged in this host-only native check.
The fixture enters the baseline service's `.flick-quarantine` before
permanent purge. Exclusions and persistent skips are not exercised by this flow.
