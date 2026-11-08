# 11-08 account rename: copy of observe-installed.ps1 that starts the given flick.exe with WATER_DATA_DIR = -DataDir (a fresh
# folder), so only the About page is checked and the real Flick data folder is never opened.
# Release prep 11-08: copy of the M3.5 close observer for the installed Flick. It starts the installed flick.exe the
# way the Start menu shortcut does (no WATER_DATA_DIR, so the default data folder and the first-run move apply);
# -DataDir names that default folder for the WebView leftover check only.
# Starts the release build with a fresh
# WATER_DATA_DIR, drives only its own window through UI Automation (steps from a UTF-8 JSON file), takes
# PrintWindow images of that window and dumps the page texts into the local output folder, which stays
# under .local (real paths and names are redacted before anything is committed).
# Read-only: an invoke step whose text holds the words for clean or delete is refused before the window
# opens. No mouse or keyboard input is synthesized.
param(
    [Parameter(Mandatory=$true)][string]$Exe,
    [Parameter(Mandatory=$true)][string]$DataDir,
    [Parameter(Mandatory=$true)][string]$OutDir,
    [Parameter(Mandatory=$true)][string]$StepsPath,
    [int]$MaximumSeconds = 900,
    [string]$Title = 'Flick'
)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object Text.UTF8Encoding($false)
$utf8 = New-Object Text.UTF8Encoding($false)
$tree = (Resolve-Path -LiteralPath '.').Path
$local = [IO.Path]::GetFullPath((Join-Path $tree '.local\'))
$out = [IO.Path]::GetFullPath($OutDir); $data = [IO.Path]::GetFullPath($DataDir)
foreach ($p in @($out)) { if (!$p.StartsWith($local, [StringComparison]::OrdinalIgnoreCase)) { throw 'Output folder outside .local' } }
if (![IO.Directory]::Exists($out)) { throw 'Output folder missing' }
$steps = [IO.File]::ReadAllText([IO.Path]::GetFullPath($StepsPath), $utf8) | ConvertFrom-Json
$cleanWord = [string][char]0x6E05 + [char]0x7406; $removeChar = [string][char]0x9664; $menuWord = [string][char]0x83DC + [char]0x5355
foreach ($s in $steps) { if ($s.invoke -and ($s.invoke.Contains($cleanWord) -or $s.invoke.Contains($removeChar))) { throw 'A step would start a clean or a delete' } }
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type -AssemblyName System.Drawing
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class M35Close {
    [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hwnd, out RECT rect);
    [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr hwnd, IntPtr hdc, uint flags);
    [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr hwnd);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hwnd, int command);
    [DllImport("user32.dll")] public static extern bool SetProcessDpiAwarenessContext(IntPtr value);
    [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
}
'@
# Per-monitor DPI awareness, so the window rectangle and the PrintWindow image are in real pixels.
try { if (![M35Close]::SetProcessDpiAwarenessContext([IntPtr](-4))) { [void][M35Close]::SetProcessDPIAware() } } catch { [void][M35Close]::SetProcessDPIAware() }
$A = [System.Windows.Automation.AutomationElement]
$Scope = [System.Windows.Automation.TreeScope]::Descendants
$record = [ordered]@{ startedAt=[DateTime]::UtcNow.ToString('o'); exe=[IO.Path]::GetFullPath($Exe); dataDir=$data; steps=@(); screenshots=@(); dumps=@(); restores=0; exitCode=$null; webviewLeft=$null; error=$null }
$evidence = Join-Path $out 'observe.json'
function Save-Record { $record['updatedAt'] = [DateTime]::UtcNow.ToString('o'); [IO.File]::WriteAllText($evidence, ($record | ConvertTo-Json -Depth 8), $utf8) }
function Find-Target([string]$name, [string]$type, [string]$match, [string]$pick) {
    if ($type) { $cond = New-Object System.Windows.Automation.PropertyCondition($A::ControlTypeProperty, [System.Windows.Automation.ControlType]::$type) }
    else { $cond = [System.Windows.Automation.Condition]::TrueCondition }
    $hits = @()
    foreach ($e in $window.FindAll($Scope, $cond)) {
        $n = [string]$e.Current.Name
        if ($match -eq 'prefix') { $ok = $n.StartsWith($name, [StringComparison]::Ordinal) }
        elseif ($match -eq 'contains') { $ok = $n.Contains($name) }
        else { $ok = $n -ceq $name }
        if ($ok) { $hits += $e }
    }
    if ($hits.Count -eq 0) { return $null }
    if ($pick -eq 'last') { return $hits[$hits.Count - 1] }
    return $hits[0]
}
function Shot([string]$label) {
    if ($label -notmatch '^[a-z][a-z0-9-]{0,31}$') { throw 'Bad screenshot label' }
    $hwnd = [IntPtr]$window.Current.NativeWindowHandle; $rect = New-Object M35Close+RECT; $restored = $false
    if ([M35Close]::IsIconic($hwnd)) {
        [void][M35Close]::ShowWindow($hwnd, 4); $restored = $true; $record['restores']++
        $limit = [DateTime]::UtcNow.AddSeconds(5)
        while ([M35Close]::IsIconic($hwnd) -and [DateTime]::UtcNow -lt $limit) { Start-Sleep -Milliseconds 100 }
        if ([M35Close]::IsIconic($hwnd)) { throw 'Window stays minimized' }
        Start-Sleep -Milliseconds 900
    }
    if (![M35Close]::GetWindowRect($hwnd, [ref]$rect)) { throw 'Window rectangle unavailable' }
    $w = $rect.Right - $rect.Left; $h = $rect.Bottom - $rect.Top
    if ($w -lt 400 -or $h -lt 300 -or $w -gt 8000 -or $h -gt 8000) { throw 'Window too small for a page screenshot' }
    $file = Join-Path $out ($label + '.png'); if ([IO.File]::Exists($file)) { throw 'Screenshot exists' }
    $bmp = New-Object System.Drawing.Bitmap($w, $h); $g = [System.Drawing.Graphics]::FromImage($bmp); $hdc = $g.GetHdc()
    $printed = [M35Close]::PrintWindow($hwnd, $hdc, 2); $g.ReleaseHdc($hdc); $g.Dispose()
    if (!$printed) { $bmp.Dispose(); throw 'PrintWindow failed' }
    $bmp.Save($file, [System.Drawing.Imaging.ImageFormat]::Png); $bmp.Dispose()
    $record['screenshots'] += [ordered]@{ name=$label; width=$w; height=$h; restored=$restored }
}
# Page texts in tree order. With expand, collapsed disclosure rows (folds) are opened first; card and
# location menus (names ending in the word for menu) are left closed.
function Dump([string]$label, [bool]$expand) {
    if ($label -notmatch '^[a-z][a-z0-9-]{0,31}$') { throw 'Bad dump label' }
    $opened = 0
    if ($expand) {
        $cond = New-Object System.Windows.Automation.PropertyCondition($A::IsExpandCollapsePatternAvailableProperty, $true)
        foreach ($e in $window.FindAll($Scope, $cond)) {
            if (([string]$e.Current.Name).EndsWith($menuWord)) { continue }
            $p = $e.GetCurrentPattern([System.Windows.Automation.ExpandCollapsePattern]::Pattern)
            if ($p.Current.ExpandCollapseState -eq [System.Windows.Automation.ExpandCollapseState]::Collapsed) { try { $p.Expand(); $opened++ } catch { } }
        }
        Start-Sleep -Milliseconds 800
    }
    $rows = New-Object System.Collections.ArrayList
    foreach ($e in $window.FindAll($Scope, [System.Windows.Automation.Condition]::TrueCondition)) {
        $n = [string]$e.Current.Name; if ($n.Trim().Length -eq 0) { continue }
        [void]$rows.Add([ordered]@{ type=($e.Current.ControlType.ProgrammaticName -replace '^ControlType\.', ''); name=$n })
    }
    [IO.File]::WriteAllText((Join-Path $out ('dump-' + $label + '.json')), (ConvertTo-Json -InputObject @($rows) -Depth 4), $utf8)
    $record['dumps'] += [ordered]@{ name=$label; rows=$rows.Count; expanded=$opened }
}
$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = [IO.Path]::GetFullPath($Exe); $psi.UseShellExecute = $false; $psi.WorkingDirectory = $tree
$psi.EnvironmentVariables['WATER_DATA_DIR'] = $data
$deadline = [DateTime]::UtcNow.AddSeconds($MaximumSeconds)
$process = [System.Diagnostics.Process]::Start($psi); $record['processId'] = $process.Id; Save-Record
$window = $null; $failure = $null; $closed = $false
try {
    while ($null -eq $window -and [DateTime]::UtcNow -lt $deadline) {
        $condition = New-Object System.Windows.Automation.PropertyCondition($A::ProcessIdProperty, $process.Id)
        foreach ($candidate in $A::RootElement.FindAll([System.Windows.Automation.TreeScope]::Children, $condition)) {
            if ($candidate.Current.ClassName -ne 'Tao Thread Event Target' -and $candidate.Current.Name -eq $Title) { $window = $candidate }
        }
        if ($null -eq $window) { Start-Sleep -Milliseconds 100 }
    }
    if ($null -eq $window) { throw 'Desktop window not observed' }
    $index = 0
    foreach ($step in $steps) {
        $index++; $began = [DateTime]::UtcNow; $entry = [ordered]@{ index=$index; kind=$null; passed=$false; ms=$null; at=$began.ToString('o') }
        $record['steps'] += $entry; Save-Record
        if ($step.invoke) {
            $entry['kind'] = 'invoke'; $limit = [DateTime]::UtcNow.AddSeconds(15); $target = $null
            while (($null -eq $target -or !$target.Current.IsEnabled) -and [DateTime]::UtcNow -lt $limit) { $target = Find-Target $step.invoke $step.type $step.match $step.pick; if ($null -eq $target -or !$target.Current.IsEnabled) { Start-Sleep -Milliseconds 200 } }
            if ($null -eq $target) { throw ('Step ' + $index + ': control not found') }
            if (!$target.Current.IsEnabled) { throw ('Step ' + $index + ': control disabled') }
            $pattern = $null
            if ($target.TryGetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern, [ref]$pattern)) { $pattern.Invoke() }
            elseif ($target.TryGetCurrentPattern([System.Windows.Automation.TogglePattern]::Pattern, [ref]$pattern)) { $pattern.Toggle() }
            else { throw ('Step ' + $index + ': control has no invoke or toggle pattern') }
            Start-Sleep -Milliseconds 300
        } elseif ($step.wait) {
            $entry['kind'] = 'wait'; $limit = [DateTime]::UtcNow.AddSeconds([int]$step.seconds); $found = $null
            while ($null -eq $found -and [DateTime]::UtcNow -lt $limit -and [DateTime]::UtcNow -lt $deadline) {
                if ($step.fail -and $null -ne (Find-Target $step.fail $null $null $null)) { throw ('Step ' + $index + ': failure text shown') }
                $found = Find-Target $step.wait $null $step.match $step.pick; if ($null -eq $found) { Start-Sleep -Milliseconds 250 }
            }
            if ($null -eq $found) { throw ('Step ' + $index + ': expected text not observed') }
            if ($step.absent -and $null -ne (Find-Target $step.absent $null $null $null)) { throw ('Step ' + $index + ': unexpected text shown') }
            $entry['ms'] = [int]([DateTime]::UtcNow - $began).TotalMilliseconds
            if ($step.shot) { Start-Sleep -Milliseconds 700; Shot $step.shot }
        } elseif ($step.dump) {
            $entry['kind'] = 'dump'; Dump $step.dump ([bool]$step.expand)
            if ($step.shot) { Shot $step.shot }
        } else { throw ('Step ' + $index + ': unknown step') }
        $entry['passed'] = $true; if ($null -eq $entry['ms']) { $entry['ms'] = [int]([DateTime]::UtcNow - $began).TotalMilliseconds }; Save-Record
    }
} catch { $failure = $_.Exception.Message; $record['error'] = $failure }
finally {
    Save-Record
    if ($null -ne $window) { try { $wp = $window.GetCurrentPattern([System.Windows.Automation.WindowPattern]::Pattern); $wp.Close(); $closed = $true } catch { if (!$failure) { $failure = 'Own window close failed'; $record['error'] = $failure } } }
    if ($closed -and $process.WaitForExit(15000)) { $record['exitCode'] = $process.ExitCode } elseif (!$failure) { $failure = 'Desktop normal exit not observed'; $record['error'] = $failure }
    # WebView children of this run carry the private data folder on their command line.
    $limit = [DateTime]::UtcNow.AddSeconds(10)
    do { $left = @(Get-CimInstance Win32_Process -Filter "Name='msedgewebview2.exe'" | Where-Object { $_.CommandLine -and $_.CommandLine.IndexOf($data, [StringComparison]::OrdinalIgnoreCase) -ge 0 }); if ($left.Count -eq 0) { break }; Start-Sleep -Milliseconds 200 } while ([DateTime]::UtcNow -lt $limit)
    $record['webviewLeft'] = $left.Count
    $record['endedAt'] = [DateTime]::UtcNow.ToString('o'); Save-Record
}
$record | ConvertTo-Json -Depth 8 -Compress
if ($failure) { exit 1 }
