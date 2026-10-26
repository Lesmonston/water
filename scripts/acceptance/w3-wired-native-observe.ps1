# ASCII-only bounded observer for the wave 3 wired desktop host (F3). Observes, drives and closes
# only its own window. Steps (UTF-8 JSON written by the gate from the manifest) wait for exact page
# texts, invoke named buttons or links through UI Automation, and take PrintWindow images of the own
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
}
'@
$A = [System.Windows.Automation.AutomationElement]
$deadline = [DateTime]::UtcNow.AddSeconds($MaximumSeconds)
$window = $null; $children = @(); $failure = $null; $windowCount = 0; $closed = $false; $exitCode = $null
$record = [ordered]@{ startedAt=[DateTime]::UtcNow.ToString('o'); processId=$TestProcessId; title=$null; systemWindows=$null; directoryDialogs=0; stepCount=$steps.Count; steps=@(); screenshots=@(); pageAccepted=$false; backdropType=$null; children=@(); privateWebviewObserved=$false; closeRequested=$false; exitCode=$null; error=$null }
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
function Shot([string]$label) {
    if ($label -notmatch '^[a-z][a-z0-9-]{0,31}$') { throw 'Bad screenshot label' }
    $hwnd = [IntPtr]$window.Current.NativeWindowHandle; $rect = New-Object W3Wired+RECT
    if (![W3Wired]::GetWindowRect($hwnd, [ref]$rect)) { throw 'Window rectangle unavailable' }
    $w = $rect.Right - $rect.Left; $h = $rect.Bottom - $rect.Top
    if ($w -le 0 -or $h -le 0 -or $w -gt 8000 -or $h -gt 8000) { throw 'Unexpected window size' }
    $file = $fullPrefix + '-' + $label + '.png'; if ([IO.File]::Exists($file)) { throw 'Screenshot exists' }
    $bmp = New-Object System.Drawing.Bitmap($w, $h); $g = [System.Drawing.Graphics]::FromImage($bmp); $hdc = $g.GetHdc()
    $printed = [W3Wired]::PrintWindow($hwnd, $hdc, 2); $g.ReleaseHdc($hdc); $g.Dispose()
    if (!$printed) { $bmp.Dispose(); throw 'PrintWindow failed' }
    $bmp.Save($file, [System.Drawing.Imaging.ImageFormat]::Png); $bmp.Dispose()
    $record['screenshots'] += [ordered]@{ name=$label; file=[IO.Path]::GetFileName($file) }
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
            $limit = [DateTime]::UtcNow.AddSeconds(15); $target = $null
            while ($null -eq $target -and [DateTime]::UtcNow -lt $limit -and [DateTime]::UtcNow -lt $deadline) { $target = Named $step.invoke $step.type; if ($null -eq $target) { Start-Sleep -Milliseconds 200 } }
            if ($null -eq $target) { throw ('Step ' + $index + ': control not found') }
            if (!$target.Current.IsEnabled) { throw ('Step ' + $index + ': control disabled') }
            $pattern = $null
            if (!$target.TryGetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern, [ref]$pattern)) { throw ('Step ' + $index + ': control has no invoke pattern') }
            $pattern.Invoke()
        } elseif ($step.wait) {
            $entry['kind'] = 'wait'
            $limit = [DateTime]::UtcNow.AddSeconds([int]$step.seconds); $found = $null
            while ($null -eq $found -and [DateTime]::UtcNow -lt $limit -and [DateTime]::UtcNow -lt $deadline) {
                if ($step.fail -and $null -ne (Named $step.fail $null)) { throw ('Step ' + $index + ': failure text shown') }
                $found = Named $step.wait $null; if ($null -eq $found) { Start-Sleep -Milliseconds 250 }
            }
            if ($null -eq $found) { throw ('Step ' + $index + ': expected text not observed') }
            if ($step.absent -and $null -ne (Named $step.absent $null)) { throw ('Step ' + $index + ': unexpected text shown') }
            if ($step.shot) { Start-Sleep -Milliseconds 700; Shot $step.shot }
        } else { throw ('Step ' + $index + ': unknown step') }
        $entry['passed'] = $true; $entry['ms'] = [int]([DateTime]::UtcNow - $began).TotalMilliseconds; Save-Record
    }
    $record['pageAccepted'] = $true
    # Own descendants only, selected by verified parent PID chains.
    $ids = @($TestProcessId)
    for ($depth = 0; $depth -lt 6; $depth++) {
        $next = @()
        foreach ($owner in $ids) {
            foreach ($child in @(Get-CimInstance Win32_Process -Filter ('ParentProcessId=' + $owner))) {
                if ($child.Name -notin @('msedgewebview2.exe', 'conhost.exe')) { throw 'Unexpected desktop child process' }
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
} catch { $failure = $_.Exception.Message; $record['error'] = $failure }
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
