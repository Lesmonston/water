# ASCII only. Waits for the acceptance tree's own water.exe window, lets the scan start, then minimizes
# that one window once (SW_MINIMIZE) to prove the wired observer restores it before screenshots.
param([Parameter(Mandatory=$true)][string]$ExePrefix, [int]$DelaySeconds = 25, [Parameter(Mandatory=$true)][string]$LogPath)
$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class MinOnce {
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hwnd, int command);
    [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr hwnd);
}
'@
$deadline = [DateTime]::UtcNow.AddSeconds(900); $proc = $null
while ($null -eq $proc -and [DateTime]::UtcNow -lt $deadline) {
    $proc = Get-Process -Name water -ErrorAction SilentlyContinue | Where-Object { $_.Path -and $_.Path.StartsWith($ExePrefix, [StringComparison]::OrdinalIgnoreCase) -and $_.MainWindowHandle -ne [IntPtr]::Zero } | Select-Object -First 1
    if ($null -eq $proc) { Start-Sleep -Milliseconds 500 }
}
if ($null -eq $proc) { "no window" | Out-File -Encoding ascii $LogPath; exit 1 }
$seen = [DateTime]::UtcNow
Start-Sleep -Seconds $DelaySeconds
$h = $proc.MainWindowHandle
[void][MinOnce]::ShowWindow($h, 6)
Start-Sleep -Milliseconds 500
("windowSeen=" + $seen.ToString('o') + " minimizedAt=" + [DateTime]::UtcNow.ToString('o') + " iconic=" + [MinOnce]::IsIconic($h)) | Out-File -Encoding ascii $LogPath
