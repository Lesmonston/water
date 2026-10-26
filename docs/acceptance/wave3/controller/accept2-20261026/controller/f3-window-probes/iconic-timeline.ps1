# ASCII only. Launches a water.exe build on a fresh private data dir and records, every 50 ms for a few
# seconds, whether its window is minimized, which process owns the foreground window, and the window's
# show state. No input, no navigation, no scan. Closes the window at the end.
param([Parameter(Mandatory=$true)][string]$Exe, [Parameter(Mandatory=$true)][string]$DataRoot, [int]$Seconds = 8)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName UIAutomationClient
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class IcTime {
    [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr hwnd);
    [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hwnd);
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hwnd, out uint pid);
}
'@
$data = Join-Path $DataRoot ('T-' + [DateTime]::UtcNow.ToString('yyyyMMddTHHmmssfff'))
New-Item -ItemType Directory -Force $data | Out-Null
$env:WATER_DATA_DIR = $data
$t0 = [DateTime]::UtcNow
$p = Start-Process -FilePath $Exe -PassThru
$A = [System.Windows.Automation.AutomationElement]; $h = [IntPtr]::Zero
while ($h -eq [IntPtr]::Zero -and ([DateTime]::UtcNow - $t0).TotalSeconds -lt 30) {
    $c = New-Object System.Windows.Automation.PropertyCondition($A::ProcessIdProperty, $p.Id)
    foreach ($w in $A::RootElement.FindAll([System.Windows.Automation.TreeScope]::Children, $c)) { if ($w.Current.Name -eq 'Water') { $h = [IntPtr]$w.Current.NativeWindowHandle; $window = $w } }
    if ($h -eq [IntPtr]::Zero) { Start-Sleep -Milliseconds 50 }
}
$found = ([DateTime]::UtcNow - $t0).TotalMilliseconds
"window found at {0:N0} ms" -f $found
$last = ''; $end = [DateTime]::UtcNow.AddSeconds($Seconds)
while ([DateTime]::UtcNow -lt $end) {
    $fg = [IcTime]::GetForegroundWindow(); $fpid = 0; [void][IcTime]::GetWindowThreadProcessId($fg, [ref]$fpid)
    $fname = try { (Get-Process -Id $fpid -ErrorAction Stop).ProcessName } catch { '?' }
    $state = 'iconic=' + [IcTime]::IsIconic($h) + ' visible=' + [IcTime]::IsWindowVisible($h) + ' foreground=' + $fname
    if ($state -ne $last) { "{0,6:N0} ms  {1}" -f ([DateTime]::UtcNow - $t0).TotalMilliseconds, $state; $last = $state }
    Start-Sleep -Milliseconds 50
}
$wp = $window.GetCurrentPattern([System.Windows.Automation.WindowPattern]::Pattern); $wp.Close()
[void]$p.WaitForExit(15000); "exit " + $p.ExitCode
