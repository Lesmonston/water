# Actual static native result under supplement06

Frozen native gate passed at clean8a3b475; implementation eb7f801 bytes unchanged.
Raw count remains2 in both snapshots. Each snapshot classifies application1, source-pinned framework1, unclassified0, invalid0, accepted=true; neither snapshot is truncated or has a property read error.

| Field | Application main | Pinned framework target |
|---|---|---|
| PID | 6856 | 6856 |
| Name | Water Desktop Preview | empty |
| Class | Tauri Window | Tao Thread Event Target |
| UIA type | ControlType.Window | ControlType.Pane |
| HWND | 61933540 | 29231650 |
| RuntimeId | [42,61933540] | [42,29231650] |
| IsOffscreen | false | false |
| Control/content | true/true | true/true |
| WindowPattern | true | false |
| Bounds | [128,83,1268,997] | [0,0,18,18] |

The initial and before-close main identities are exactly equal. The native window policy did not remove the second raw root; its exact attributes and framework archive/source pins matched the revised contract. IsOffscreen=false and the raw values are preserved, without claiming physical pixel visibility.

Real UIA names contain Water, 只读开发预览, 桌面壳已启动 and 尚未接入扫描. No synthetic data was substituted for page text. WindowPattern.Close was requested only for the revalidated application main; observer exitCode0/cleanupError null, outer nativeExit0/signal null, native wall5510ms, no termination. All7 captured child PIDs were absent in the frozen child-close query. Actual WebView commandlines selected preview-6856-1792909338074288100/EBWebView inside this worktree's private profile root.

No screenshots, image viewing, pixel reads, native retry, product changes or extra test runs. Earlier failed native attempts remain failed. Two samples plus PID-close checks prove only this bounded run, not every transient window, user scope, production races, macOS or desktop-to-scan/report integration. Handoff status is SUBMITTED, not controller VERIFIED.
