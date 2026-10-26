# ASCII only. Starts the acceptance build of water.exe on a fresh private data dir (no scan), navigates with
# UIA Invoke and polls IsIconic every 100 ms. Mode A: no window-state changes. Mode B: minimize, restore
# without activation, then the same navigation. Prints one JSON line per phase.
param([Parameter(Mandatory=$true)][string]$Exe, [Parameter(Mandatory=$true)][string]$DataRoot,
      [Parameter(Mandatory=$true)][string]$NamesPath, [Parameter(Mandatory=$true)][ValidateSet('A','B')][string]$Mode)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class IcProbe {
    [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr hwnd);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hwnd, int command);
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
}
'@
$names = [IO.File]::ReadAllText($NamesPath, (New-Object Text.UTF8Encoding($false))) | ConvertFrom-Json
$data = Join-Path $DataRoot ($Mode + '-' + [DateTime]::UtcNow.ToString('yyyyMMddTHHmmss'))
New-Item -ItemType Directory -Force $data | Out-Null
$env:WATER_DATA_DIR = $data
$p = Start-Process -FilePath $Exe -PassThru
$A = [System.Windows.Automation.AutomationElement]
$window = $null; $limit = [DateTime]::UtcNow.AddSeconds(45)
while ($null -eq $window -and [DateTime]::UtcNow -lt $limit) {
    $c = New-Object System.Windows.Automation.PropertyCondition($A::ProcessIdProperty, $p.Id)
    foreach ($w in $A::RootElement.FindAll([System.Windows.Automation.TreeScope]::Children, $c)) { if ($w.Current.Name -eq 'Water') { $window = $w } }
    if ($null -eq $window) { Start-Sleep -Milliseconds 200 }
}
if ($null -eq $window) { throw 'no window' }
$h = [IntPtr]$window.Current.NativeWindowHandle
function Named([string]$name) {
    $c = New-Object System.Windows.Automation.AndCondition((New-Object System.Windows.Automation.PropertyCondition($A::NameProperty, $name)), (New-Object System.Windows.Automation.PropertyCondition($A::ControlTypeProperty, [System.Windows.Automation.ControlType]::Hyperlink)))
    $deadline = [DateTime]::UtcNow.AddSeconds(15); $t = $null
    while ($null -eq $t -and [DateTime]::UtcNow -lt $deadline) { $t = $window.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $c); if ($null -eq $t) { Start-Sleep -Milliseconds 200 } }
    return $t
}
function Poll([string]$label, [int]$ms) {
    $samples = @(); $end = [DateTime]::UtcNow.AddMilliseconds($ms)
    while ([DateTime]::UtcNow -lt $end) { $samples += [int][IcProbe]::IsIconic($h); Start-Sleep -Milliseconds 100 }
    [ordered]@{ mode=$Mode; phase=$label; iconicSamples=($samples | Measure-Object -Sum).Sum; samples=$samples.Count; foreground=([IcProbe]::GetForegroundWindow() -eq $h) } | ConvertTo-Json -Compress
}
Start-Sleep -Seconds 3
Poll 'start' 1500
if ($Mode -eq 'B') { [void][IcProbe]::ShowWindow($h, 6); Poll 'after-minimize' 1000; [void][IcProbe]::ShowWindow($h, 4); Poll 'after-restore' 1500 }
foreach ($n in $names) {
    $t = Named $n; if ($null -eq $t) { throw 'link not found' }
    $pattern = $null; [void]$t.TryGetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern, [ref]$pattern); $pattern.Invoke()
    Poll ('after-invoke-' + [array]::IndexOf($names, $n)) 2000
}
$wp = $window.GetCurrentPattern([System.Windows.Automation.WindowPattern]::Pattern); $wp.Close()
[void]$p.WaitForExit(15000)
[ordered]@{ mode=$Mode; phase='exit'; exitCode=$p.ExitCode } | ConvertTo-Json -Compress
