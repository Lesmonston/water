# ASCII only. Runs a water.exe build (fresh private data dir, no scan) next to charmap.exe and records every
# minimize of either window for a fixed time, restoring each one without activation after it is minimized.
param([Parameter(Mandatory=$true)][string]$Exe, [Parameter(Mandatory=$true)][string]$DataRoot, [int]$Seconds = 60)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName UIAutomationClient
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class IcPair {
    [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr hwnd);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hwnd, int command);
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hwnd, out uint pid);
}
'@
$data = Join-Path $DataRoot ('P-' + [DateTime]::UtcNow.ToString('yyyyMMddTHHmmssfff'))
New-Item -ItemType Directory -Force $data | Out-Null
$env:WATER_DATA_DIR = $data
$t0 = [DateTime]::UtcNow
$water = Start-Process -FilePath $Exe -PassThru
$chars = Start-Process charmap.exe -PassThru
$A = [System.Windows.Automation.AutomationElement]; $hw = [IntPtr]::Zero; $window = $null
while ($hw -eq [IntPtr]::Zero -and ([DateTime]::UtcNow - $t0).TotalSeconds -lt 30) {
    $c = New-Object System.Windows.Automation.PropertyCondition($A::ProcessIdProperty, $water.Id)
    foreach ($w in $A::RootElement.FindAll([System.Windows.Automation.TreeScope]::Children, $c)) { if ($w.Current.Name -eq 'Water') { $hw = [IntPtr]$w.Current.NativeWindowHandle; $window = $w } }
    if ($hw -eq [IntPtr]::Zero) { Start-Sleep -Milliseconds 50 }
}
while ($chars.MainWindowHandle -eq [IntPtr]::Zero -and ([DateTime]::UtcNow - $t0).TotalSeconds -lt 30) { Start-Sleep -Milliseconds 50; $chars.Refresh() }
$hc = $chars.MainWindowHandle
"water window at {0:N0} ms, charmap window at {1:N0} ms" -f ([DateTime]::UtcNow - $t0).TotalMilliseconds, ([DateTime]::UtcNow - $t0).TotalMilliseconds
$end = [DateTime]::UtcNow.AddSeconds($Seconds); $counts = @{ water = 0; charmap = 0 }
while ([DateTime]::UtcNow -lt $end) {
    foreach ($pair in @(@('water', $hw), @('charmap', $hc))) {
        if ([IcPair]::IsIconic($pair[1])) {
            $fg = [IcPair]::GetForegroundWindow(); $fpid = 0; [void][IcPair]::GetWindowThreadProcessId($fg, [ref]$fpid)
            $fname = try { (Get-Process -Id $fpid -ErrorAction Stop).ProcessName } catch { '?' }
            $counts[$pair[0]]++
            "{0,6:N0} ms  {1} minimized; foreground={2}" -f ([DateTime]::UtcNow - $t0).TotalMilliseconds, $pair[0], $fname
            [void][IcPair]::ShowWindow($pair[1], 4)
        }
    }
    Start-Sleep -Milliseconds 100
}
"minimize counts: water=" + $counts.water + " charmap=" + $counts.charmap
$wp = $window.GetCurrentPattern([System.Windows.Automation.WindowPattern]::Pattern); $wp.Close()
[void]$chars.CloseMainWindow()
[void]$water.WaitForExit(15000); [void]$chars.WaitForExit(5000); "exit water=" + $water.ExitCode + " charmap=" + $chars.HasExited
