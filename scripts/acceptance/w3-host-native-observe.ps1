# ASCII-only bounded observer for the wave 3 desktop host. Observes and closes only its own window.
# Records window title, page text match, system backdrop type, one PrintWindow image of the own window,
# and own child processes (names and ids only; command lines are checked in memory, never written).
param(
    [Parameter(Mandatory=$true)][int]$TestProcessId,
    [Parameter(Mandatory=$true)][string]$EvidencePath,
    [Parameter(Mandatory=$true)][string]$ScreenshotPath,
    [Parameter(Mandatory=$true)][string]$ExpectedExe,
    [Parameter(Mandatory=$true)][string]$DataDir,
    [Parameter(Mandatory=$true)][string]$EvidenceRoot,
    [Parameter(Mandatory=$true)][string]$Title
)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object Text.UTF8Encoding($false)
$tree = (Resolve-Path -LiteralPath '.').Path
$root = [IO.Path]::GetFullPath($EvidenceRoot)
if (!$root.StartsWith([IO.Path]::GetFullPath((Join-Path $tree '.local\checks\')), [StringComparison]::OrdinalIgnoreCase)) { throw 'Evidence root outside tree checks' }
$fullEvidence = [IO.Path]::GetFullPath($EvidencePath); $fullShot = [IO.Path]::GetFullPath($ScreenshotPath)
foreach ($p in @($fullEvidence, $fullShot)) { if (!$p.StartsWith($root, [StringComparison]::OrdinalIgnoreCase) -or [IO.File]::Exists($p)) { throw 'Unexpected evidence output' } }
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
public static class W3Native {
    [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
    [DllImport("dwmapi.dll")] public static extern int DwmGetWindowAttribute(IntPtr hwnd, int attr, out int value, int size);
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hwnd, out RECT rect);
    [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr hwnd, IntPtr hdc, uint flags);
}
'@
# Required page text: "Water", the sidebar subtitle and the unavailable state (char codes keep this file ASCII).
$required = @(
    'Water'
    (-join ([char[]]@(0x78c1,0x76d8,0x4f53,0x68c0)))
    (-join ([char[]]@(0x65e0,0x6cd5,0x8fde,0x63a5)))
)
$deadline = [DateTime]::UtcNow.AddSeconds(30)
$window = $null; $names = @(); $children = @(); $failure = $null; $windowCount = 0; $closed = $false; $exitCode = $null
$record = [ordered]@{ startedAt=[DateTime]::UtcNow.ToString('o'); processId=$TestProcessId; title=$null; systemWindows=$null; directoryDialogs=0; requiredCount=$required.Count; pageAccepted=$false; backdropType=$null; screenshot=$null; children=@(); privateWebviewObserved=$false; closeRequested=$false; exitCode=$null; error=$null }
function Save-Record {
    $record['children'] = $children; $record['updatedAt'] = [DateTime]::UtcNow.ToString('o')
    [IO.File]::WriteAllText($fullEvidence, ($record | ConvertTo-Json -Depth 8), (New-Object Text.UTF8Encoding($false)))
}
try {
    while ([DateTime]::UtcNow -lt $deadline) {
        $condition = New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::ProcessIdProperty, $TestProcessId)
        $windows = [System.Windows.Automation.AutomationElement]::RootElement.FindAll([System.Windows.Automation.TreeScope]::Children, $condition)
        $windowCount = $windows.Count
        if ($windowCount -gt 1) { throw 'Unexpected own top-level window count' }
        foreach ($candidate in $windows) { if ($candidate.Current.Name -eq $Title) { $window = $candidate } }
        if ($null -ne $window) { break }; Start-Sleep -Milliseconds 100
    }
    $record['systemWindows'] = $windowCount
    if ($null -eq $window) { throw 'Desktop window title not observed' }
    $record['title'] = $window.Current.Name
    while ([DateTime]::UtcNow -lt $deadline) {
        $names = @(); $elements = $window.FindAll([System.Windows.Automation.TreeScope]::Descendants, [System.Windows.Automation.Condition]::TrueCondition)
        if ($elements.Count -gt 3000) { throw 'Unexpected own automation tree size' }
        foreach ($element in $elements) { if ($element.Current.Name) { $names += $element.Current.Name } }
        $joined = $names -join "`n"
        $ok = $true; foreach ($r in $required) { if (!$joined.Contains($r)) { $ok = $false } }
        $record['pageAccepted'] = $ok; Save-Record
        if ($ok) { break }; Start-Sleep -Milliseconds 200
    }
    $hwnd = [IntPtr]$window.Current.NativeWindowHandle
    $backdrop = 0
    if ([W3Native]::DwmGetWindowAttribute($hwnd, 38, [ref]$backdrop, 4) -eq 0) { $record['backdropType'] = $backdrop }
    Start-Sleep -Milliseconds 800
    $rect = New-Object W3Native+RECT
    if ([W3Native]::GetWindowRect($hwnd, [ref]$rect)) {
        $w = $rect.Right - $rect.Left; $h = $rect.Bottom - $rect.Top
        if ($w -gt 0 -and $h -gt 0 -and $w -le 8000 -and $h -le 8000) {
            $bmp = New-Object System.Drawing.Bitmap($w, $h); $g = [System.Drawing.Graphics]::FromImage($bmp); $hdc = $g.GetHdc()
            $printed = [W3Native]::PrintWindow($hwnd, $hdc, 2); $g.ReleaseHdc($hdc); $g.Dispose()
            if ($printed) { $bmp.Save($fullShot, [System.Drawing.Imaging.ImageFormat]::Png); $record['screenshot'] = [IO.Path]::GetFileName($fullShot) }
            $bmp.Dispose()
        }
    }
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
    if (!$record['pageAccepted']) { throw 'Required page text not observed' }
} catch { $failure = $_.Exception.Message; $record['error'] = $failure }
finally {
    Save-Record
    if ($null -ne $window) {
        try { $record['closeRequested'] = $true; Save-Record; $pattern = $window.GetCurrentPattern([System.Windows.Automation.WindowPattern]::Pattern); $pattern.Close(); $closed = $true } catch { if (!$failure) { $failure = 'Own window close failed'; $record['error'] = $failure } }
    }
    if ($closed -and $process.WaitForExit(8000)) { $exitCode = $process.ExitCode; $record['exitCode'] = $exitCode } else { if (!$failure) { $failure = 'Desktop normal exit not observed'; $record['error'] = $failure } }
    if ($null -ne $exitCode -and $exitCode -ne 0 -and !$failure) { $failure = 'Desktop exited unsuccessfully'; $record['error'] = $failure }
    $record['endedAt'] = [DateTime]::UtcNow.ToString('o'); Save-Record
}
$record | ConvertTo-Json -Depth 8 -Compress
if ($failure) { exit 1 }
