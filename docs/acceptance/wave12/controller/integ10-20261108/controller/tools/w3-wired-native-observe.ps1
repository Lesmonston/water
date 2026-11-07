# ASCII-only bounded observer for the wave 3 wired desktop host (F3). Observes, drives and closes
# only its own window. Steps (UTF-8 JSON written by the gate from the manifest) wait for exact page
# texts (or for a named control to go), invoke named buttons, links or menu buttons through UI
# Automation, and take PrintWindow images of the own
# window. No mouse or keyboard input is synthesized. Page texts are only compared in memory; the
# evidence records which steps passed, their timing and the image files, never the page contents.
# Child processes are recorded by name and id; command lines are checked in memory, never written.
param(
    [Parameter(Mandatory=$true)][int]$TestProcessId,
    [Parameter(Mandatory=$true)][string]$EvidencePath,
    [Parameter(Mandatory=$true)][string]$ShotPrefix,
    [Parameter(Mandatory=$true)][string]$StepsPath,
    [Parameter(Mandatory=$true)][string]$ExpectedExe,
    [Parameter(Mandatory=$true)][string]$DataDir,
    [Parameter(Mandatory=$true)][string]$EvidenceRoot,
    [Parameter(Mandatory=$true)][string]$Title,
    [Parameter(Mandatory=$true)][int]$MaximumSeconds
)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object Text.UTF8Encoding($false)
$tree = (Resolve-Path -LiteralPath '.').Path
$root = [IO.Path]::GetFullPath($EvidenceRoot)
if (!$root.StartsWith([IO.Path]::GetFullPath((Join-Path $tree '.local\checks\')), [StringComparison]::OrdinalIgnoreCase)) { throw 'Evidence root outside tree checks' }
$fullEvidence = [IO.Path]::GetFullPath($EvidencePath); $fullPrefix = [IO.Path]::GetFullPath($ShotPrefix)
foreach ($p in @($fullEvidence, $fullPrefix)) { if (!$p.StartsWith($root, [StringComparison]::OrdinalIgnoreCase)) { throw 'Unexpected evidence output' } }
if ([IO.File]::Exists($fullEvidence)) { throw 'Unexpected evidence output' }
$steps = [IO.File]::ReadAllText([IO.Path]::GetFullPath($StepsPath), (New-Object Text.UTF8Encoding($false))) | ConvertFrom-Json
$process = Get-Process -Id $TestProcessId
$ownedHandle = $process.Handle
if ($process.Path -ine [IO.Path]::GetFullPath($ExpectedExe)) { throw 'Unexpected desktop executable' }
$dataFull = [IO.Path]::GetFullPath($DataDir)
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type -AssemblyName System.Drawing
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class W3Wired {
    [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
    [DllImport("dwmapi.dll")] public static extern int DwmGetWindowAttribute(IntPtr hwnd, int attr, out int value, int size);
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hwnd, out RECT rect);
    [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr hwnd, IntPtr hdc, uint flags);
    [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr hwnd);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hwnd, int command);
}
'@
$A = [System.Windows.Automation.AutomationElement]
$deadline = [DateTime]::UtcNow.AddSeconds($MaximumSeconds)
$window = $null; $children = @(); $failure = $null; $windowCount = 0; $closed = $false; $exitCode = $null
$record = [ordered]@{ startedAt=[DateTime]::UtcNow.ToString('o'); processId=$TestProcessId; title=$null; systemWindows=$null; directoryDialogs=0; stepCount=$steps.Count; steps=@(); screenshots=@(); restores=0; pageAccepted=$false; backdropType=$null; children=@(); privateWebviewObserved=$false; closeRequested=$false; exitCode=$null; error=$null }
function Save-Record {
    $record['children'] = $children; $record['updatedAt'] = [DateTime]::UtcNow.ToString('o')
    [IO.File]::WriteAllText($fullEvidence, ($record | ConvertTo-Json -Depth 8), (New-Object Text.UTF8Encoding($false)))
}
function Named([string]$name, [string]$type) {
    $byName = New-Object System.Windows.Automation.PropertyCondition($A::NameProperty, $name)
    if ($type) {
        $ct = [System.Windows.Automation.ControlType]::$type
        $cond = New-Object System.Windows.Automation.AndCondition($byName, (New-Object System.Windows.Automation.PropertyCondition($A::ControlTypeProperty, $ct)))
    } else { $cond = $byName }
    return $window.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $cond)
}
# Optional per-step "match" (exact, prefix, contains) and "pick" (first, last); defaults keep the exact first match.
# M3.5 (wave 10): a folder name carries the run stamp, and a page card and its confirm dialog share a button name.
function Find-Target([string]$name, [string]$type, [string]$match, [string]$pick) {
    if ((!$match -or $match -eq 'exact') -and (!$pick -or $pick -eq 'first')) { return Named $name $type }
    if ($type) { $cond = New-Object System.Windows.Automation.PropertyCondition($A::ControlTypeProperty, [System.Windows.Automation.ControlType]::$type) }
    else { $cond = [System.Windows.Automation.Condition]::TrueCondition }
    $hits = @()
    foreach ($e in $window.FindAll([System.Windows.Automation.TreeScope]::Descendants, $cond)) {
        # An element can leave the page while the list is walked (W12 integration 10).
        try { $n = [string]$e.Current.Name } catch { continue }
        if ($match -eq 'prefix') { $ok = $n.StartsWith($name, [StringComparison]::Ordinal) }
        elseif ($match -eq 'contains') { $ok = $n.Contains($name) }
        else { $ok = $n -ceq $name }
        if ($ok) { $hits += $e }
    }
    if ($hits.Count -eq 0) { return $null }
    if ($pick -eq 'last') { return $hits[$hits.Count - 1] }
    return $hits[0]
}
function Enabled($element) {
    if ($null -eq $element) { return $false }
    try { return [bool]$element.Current.IsEnabled } catch { return $false }
}
function Use-Control($target, [int]$index) {
    $pattern = $null
    # Buttons with aria-pressed (M3.5 location picks) are exposed as toggle buttons: toggle them instead.
    if ($target.TryGetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern, [ref]$pattern)) { $pattern.Invoke() }
    elseif ($target.TryGetCurrentPattern([System.Windows.Automation.TogglePattern]::Pattern, [ref]$pattern)) { $pattern.Toggle() }
    # W12 integration 10: a card's menu button (aria-haspopup) is exposed only as expand/collapse; Expand clicks it.
    elseif ($target.TryGetCurrentPattern([System.Windows.Automation.ExpandCollapsePattern]::Pattern, [ref]$pattern)) { $pattern.Expand() }
    else { throw ('Step ' + $index + ': control has no invoke, toggle or expand pattern') }
}
function Shot([string]$label) {
    if ($label -notmatch '^[a-z][a-z0-9-]{0,31}$') { throw 'Bad screenshot label' }
    $hwnd = [IntPtr]$window.Current.NativeWindowHandle; $rect = New-Object W3Wired+RECT
    # A minimized window prints only its caption (seen in the F3 run). Something outside the app (a user,
    # Win+D) can minimize it during a long scan: restore it without activation and record that it happened.
    $restored = $false
    if ([W3Wired]::IsIconic($hwnd)) {
        [void][W3Wired]::ShowWindow($hwnd, 4); $restored = $true; $record['restores']++
        $limit = [DateTime]::UtcNow.AddSeconds(5)
        while ([W3Wired]::IsIconic($hwnd) -and [DateTime]::UtcNow -lt $limit) { Start-Sleep -Milliseconds 100 }
        if ([W3Wired]::IsIconic($hwnd)) { throw 'Window stays minimized' }
        Start-Sleep -Milliseconds 900
    }
    if (![W3Wired]::GetWindowRect($hwnd, [ref]$rect)) { throw 'Window rectangle unavailable' }
    $w = $rect.Right - $rect.Left; $h = $rect.Bottom - $rect.Top
    if ($w -lt 800 -or $h -lt 600 -or $w -gt 8000 -or $h -gt 8000) { throw 'Window too small for a page screenshot' }
    $file = $fullPrefix + '-' + $label + '.png'; if ([IO.File]::Exists($file)) { throw 'Screenshot exists' }
    $bmp = New-Object System.Drawing.Bitmap($w, $h); $g = [System.Drawing.Graphics]::FromImage($bmp); $hdc = $g.GetHdc()
    $printed = [W3Wired]::PrintWindow($hwnd, $hdc, 2); $g.ReleaseHdc($hdc); $g.Dispose()
    if (!$printed) { $bmp.Dispose(); throw 'PrintWindow failed' }
    $bmp.Save($file, [System.Drawing.Imaging.ImageFormat]::Png); $bmp.Dispose()
    $record['screenshots'] += [ordered]@{ name=$label; file=[IO.Path]::GetFileName($file); width=$w; height=$h; restored=$restored }
}
try {
    while ([DateTime]::UtcNow -lt $deadline) {
        $condition = New-Object System.Windows.Automation.PropertyCondition($A::ProcessIdProperty, $TestProcessId)
        $windows = $A::RootElement.FindAll([System.Windows.Automation.TreeScope]::Children, $condition)
        # Tauri (tao) always owns one hidden event-target window; every other top-level window counts.
        $main = @(); $targets = 0
        foreach ($candidate in $windows) { if ($candidate.Current.ClassName -eq 'Tao Thread Event Target') { $targets++ } else { $main += $candidate } }
        $windowCount = $main.Count; $record['rawWindows'] = $windows.Count; $record['eventTargets'] = $targets
        if ($windowCount -gt 1 -or $targets -gt 1) { throw 'Unexpected own top-level window count' }
        foreach ($candidate in $main) { if ($candidate.Current.Name -eq $Title) { $window = $candidate } }
        if ($null -ne $window) { break }; Start-Sleep -Milliseconds 100
    }
    $record['systemWindows'] = $windowCount
    if ($null -eq $window) { throw 'Desktop window title not observed' }
    $record['title'] = $window.Current.Name
    $backdrop = 0
    if ([W3Wired]::DwmGetWindowAttribute([IntPtr]$window.Current.NativeWindowHandle, 38, [ref]$backdrop, 4) -eq 0) { $record['backdropType'] = $backdrop }
    $index = 0
    foreach ($step in $steps) {
        $index++; $began = [DateTime]::UtcNow; $entry = [ordered]@{ index=$index; kind=$null; passed=$false; ms=$null }
        $record['steps'] += $entry; Save-Record
        if ($step.invoke) {
            $entry['kind'] = 'invoke'
            $limit = [DateTime]::UtcNow.AddSeconds(15); $entry['retries'] = 0
            # A control found while the page is still busy may be disabled for a moment: keep looking until it is enabled.
            # W12 integration 10: a navigation renders the page twice (route, then data). A control found in the first
            # render is gone when used: UI Automation throws and nothing is clicked. Find it again and retry (same limit).
            while ($true) {
                $target = $null
                while (!(Enabled $target) -and [DateTime]::UtcNow -lt $limit -and [DateTime]::UtcNow -lt $deadline) { $target = Find-Target $step.invoke $step.type $step.match $step.pick; if (!(Enabled $target)) { Start-Sleep -Milliseconds 200 } }
                if ($null -eq $target) { throw ('Step ' + $index + ': control not found') }
                if (!(Enabled $target)) { throw ('Step ' + $index + ': control disabled') }
                try { Use-Control $target $index; break }
                catch { if ([DateTime]::UtcNow -ge $limit -or [DateTime]::UtcNow -ge $deadline) { throw }; $entry['retries']++; Start-Sleep -Milliseconds 300 }
            }
            # W12 integration 10: "then" names a menu item to use right after the invoke opened its menu. The menu closes
            # when focus leaves it (another window, the page rendering again), so the pair is retried together for 15 s.
            # When the trigger is gone after an attempt, the item's action is taken as done; the next steps check its effect.
            if ($step.then) {
                $useLimit = [DateTime]::UtcNow.AddSeconds(15); $entry['reopened'] = 0; $entry['itemErrors'] = 0; $used = $false
                while (!$used) {
                    $pause = [DateTime]::UtcNow.AddSeconds(2); $item = $null
                    while ($null -eq ($item = Named $step.then $null) -and [DateTime]::UtcNow -lt $pause) { Start-Sleep -Milliseconds 100 }
                    if ($null -ne $item) { try { Use-Control $item $index; $used = $true; break } catch { $entry['itemErrors']++ } }
                    if ([DateTime]::UtcNow -ge $useLimit -or [DateTime]::UtcNow -ge $deadline) { throw ('Step ' + $index + ': menu item not used') }
                    $target = Find-Target $step.invoke $step.type $step.match $step.pick
                    if ($null -eq $target) { $entry['assumedDone'] = $true; break }
                    if (Enabled $target) { try { Use-Control $target $index; $entry['reopened']++ } catch { $entry['retries']++ } }
                }
            }
            # W12 integration 10: "until" names a control the invoke must bring up (the next page; "untilMatch" works like
            # "match"). If it is not shown within 3 s the control is found and used again, 15 s in all.
            if ($step.until) {
                $untilLimit = [DateTime]::UtcNow.AddSeconds(15); $entry['reinvoked'] = 0
                while ($true) {
                    $pause = [DateTime]::UtcNow.AddSeconds(3); $shown = $null
                    while ($null -eq ($shown = Find-Target $step.until $null $step.untilMatch $null) -and [DateTime]::UtcNow -lt $pause) { Start-Sleep -Milliseconds 150 }
                    if ($null -ne $shown) { break }
                    if ([DateTime]::UtcNow -ge $untilLimit -or [DateTime]::UtcNow -ge $deadline) { throw ('Step ' + $index + ': invoke did not bring up the expected control') }
                    $target = Find-Target $step.invoke $step.type $step.match $step.pick
                    if (Enabled $target) { try { Use-Control $target $index; $entry['reinvoked']++ } catch { $entry['retries']++ } }
                }
            }
        } elseif ($step.wait) {
            $entry['kind'] = 'wait'
            $limit = [DateTime]::UtcNow.AddSeconds([int]$step.seconds); $found = $null
            while ($null -eq $found -and [DateTime]::UtcNow -lt $limit -and [DateTime]::UtcNow -lt $deadline) {
                if ($step.fail -and $null -ne (Named $step.fail $null)) { throw ('Step ' + $index + ': failure text shown') }
                $found = Find-Target $step.wait $null $step.match $step.pick; if ($null -eq $found) { Start-Sleep -Milliseconds 250 }
            }
            if ($null -eq $found) { throw ('Step ' + $index + ': expected text not observed') }
            if ($step.absent -and $null -ne (Named $step.absent $null)) { throw ('Step ' + $index + ': unexpected text shown') }
            if ($step.shot) { Start-Sleep -Milliseconds 700; Shot $step.shot }
        } elseif ($step.gone) {
            # W12 integration 10: wait until a control with this exact name has left the page (a card after "skip from now on").
            $entry['kind'] = 'gone'
            $limit = [DateTime]::UtcNow.AddSeconds([int]$step.seconds); $still = Named $step.gone $null
            while ($null -ne $still -and [DateTime]::UtcNow -lt $limit -and [DateTime]::UtcNow -lt $deadline) { Start-Sleep -Milliseconds 250; $still = Named $step.gone $null }
            if ($null -ne $still) { throw ('Step ' + $index + ': control still shown') }
            if ($step.shot) { Start-Sleep -Milliseconds 700; Shot $step.shot }
        } else { throw ('Step ' + $index + ': unknown step') }
        $entry['passed'] = $true; $entry['ms'] = [int]([DateTime]::UtcNow - $began).TotalMilliseconds; Save-Record
    }
    $record['pageAccepted'] = $true
    # Own descendants only, selected by verified parent PID chains.
    # W12 integration 10: Windows keeps a dead parent's id in ParentProcessId and ids are reused, so an older, unrelated
    # process can name one of ours as its parent. A child cannot be older than its parent: those are skipped and counted.
    $ids = @($TestProcessId); $born = @{}; $born[[int]$TestProcessId] = $process.StartTime.ToUniversalTime(); $record['olderThanParentSkipped'] = 0
    for ($depth = 0; $depth -lt 6; $depth++) {
        $next = @()
        foreach ($owner in $ids) {
            foreach ($child in @(Get-CimInstance Win32_Process -Filter ('ParentProcessId=' + $owner))) {
                if ($null -ne $child.CreationDate -and $born.ContainsKey([int]$owner) -and $child.CreationDate.ToUniversalTime() -lt $born[[int]$owner]) { $record['olderThanParentSkipped']++; continue }
                if ($child.Name -notin @('msedgewebview2.exe', 'conhost.exe')) { throw ('Unexpected desktop child process: ' + $child.Name) }
                if ($null -ne $child.CreationDate) { $born[[int]$child.ProcessId] = $child.CreationDate.ToUniversalTime() }
                if (@($children | Where-Object { $_.processId -eq $child.ProcessId }).Count -eq 0) {
                    if ($child.CommandLine -and $child.CommandLine.IndexOf($dataFull, [StringComparison]::OrdinalIgnoreCase) -ge 0) { $record['privateWebviewObserved'] = $true }
                    $children += [ordered]@{ processId=$child.ProcessId; parentProcessId=$child.ParentProcessId; name=$child.Name }
                    $next += $child.ProcessId
                }
            }
        }
        if ($children.Count -gt 32) { throw 'Unexpected desktop child process count' }
        if ($next.Count -eq 0) { break }; $ids = $next
    }
    Save-Record
} catch {
    $failure = $_.Exception.Message; $record['error'] = $failure
    # W12 integration 10: keep an image of the page a step failed on (best effort; the run has failed already).
    if ($null -ne $window) { try { Shot ('failed-step-' + $index) } catch {} }
}
finally {
    Save-Record
    if ($null -ne $window) {
        try { $record['closeRequested'] = $true; Save-Record; $wp = $window.GetCurrentPattern([System.Windows.Automation.WindowPattern]::Pattern); $wp.Close(); $closed = $true } catch { if (!$failure) { $failure = 'Own window close failed'; $record['error'] = $failure } }
    }
    if ($closed -and $process.WaitForExit(15000)) { $exitCode = $process.ExitCode; $record['exitCode'] = $exitCode } else { if (!$failure) { $failure = 'Desktop normal exit not observed'; $record['error'] = $failure } }
    if ($null -ne $exitCode -and $exitCode -ne 0 -and !$failure) { $failure = 'Desktop exited unsuccessfully'; $record['error'] = $failure }
    $record['endedAt'] = [DateTime]::UtcNow.ToString('o'); Save-Record
}
$record | ConvertTo-Json -Depth 8 -Compress
if ($failure) { exit 1 }
