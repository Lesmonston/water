# Controller check for WATER-W4-G6 SPEC section 2 in a real window: start Water on a fixture data
# directory, minimize its window, start a second Water on the same directory, and record whether the
# second exits 0 and the first window comes back (not minimized, foreground). Then close the first
# window normally and record its exit code (SPEC section 1). Nothing outside -DataDir is written.
param(
  [Parameter(Mandatory)][string]$Exe,
  [Parameter(Mandatory)][string]$DataDir,
  [Parameter(Mandatory)][string]$EvidencePrefix,
  # Wave 11 renamed the window to Flick; older runs keep the default.
  [string]$Title = 'Water'
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class W {
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int cmd);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr h, IntPtr hdc, uint flags);
  [DllImport("user32.dll")] public static extern bool SetProcessDpiAwarenessContext(IntPtr value);
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
}
'@
# DPI-unaware, GetWindowRect returns the pre-scaling size (1254x858 for a 1568x1072 window at 125 %) and the
# screenshot misses the right fifth (sixth integration, 2026-11-02). Become per-monitor aware before any window call.
$dpiAware = [W]::SetProcessDpiAwarenessContext([IntPtr](-4))
if (-not $dpiAware) { $dpiAware = [W]::SetProcessDPIAware() }
# PrintWindow renders only Water's own window. Copying the screen rectangle (the earlier version) captured
# whatever covered the window, once another app's page with personal content (2026-11-01 release smoke).
function Shot([IntPtr]$h, [string]$name) {
  $r = New-Object W+RECT; [void][W]::GetWindowRect($h, [ref]$r)
  $w = $r.Right - $r.Left; $hh = $r.Bottom - $r.Top
  if ($w -le 0 -or $hh -le 0) { return $null }
  $bmp = New-Object System.Drawing.Bitmap $w, $hh
  $g = [System.Drawing.Graphics]::FromImage($bmp); $hdc = $g.GetHdc()
  $printed = [W]::PrintWindow($h, $hdc, 2); $g.ReleaseHdc($hdc); $g.Dispose()
  if (-not $printed) { $bmp.Dispose(); return $null }
  $file = "$EvidencePrefix-$name.png"; $bmp.Save($file, [System.Drawing.Imaging.ImageFormat]::Png); $bmp.Dispose()
  return [ordered]@{ file = (Split-Path $file -Leaf); width = $w; height = $hh }
}
New-Item -ItemType Directory -Path $DataDir | Out-Null
$env:WATER_DATA_DIR = $DataDir
$out = [ordered]@{ exe = $Exe; dataDir = $DataDir; started = (Get-Date).ToString('o'); dpiAware = $dpiAware }
$first = Start-Process -FilePath $Exe -PassThru
$out.firstPid = $first.Id
$h = [IntPtr]::Zero; $deadline = (Get-Date).AddSeconds(30)
while ((Get-Date) -lt $deadline) {
  $first.Refresh(); $h = $first.MainWindowHandle
  if ($h -ne [IntPtr]::Zero -and [W]::IsWindowVisible($h) -and $first.MainWindowTitle -eq $Title) { break }
  Start-Sleep -Milliseconds 100
}
if ($h -eq [IntPtr]::Zero) { throw 'first window never appeared' }
Start-Sleep -Seconds 4
$out.firstShot = Shot $h 'first'
[void][W]::ShowWindow($h, 6)
Start-Sleep -Milliseconds 800
$out.minimized = [W]::IsIconic($h)
$out.foregroundIsWaterBefore = ([W]::GetForegroundWindow() -eq $h)
$t0 = Get-Date
$second = Start-Process -FilePath $Exe -PassThru
$exited = $second.WaitForExit(20000)
$out.secondExited = $exited
$out.secondExitCode = if ($exited) { $second.ExitCode } else { $null }
$out.secondMs = [int]((Get-Date) - $t0).TotalMilliseconds
if (-not $exited) { $second.Kill() }
$restored = $false; $deadline = (Get-Date).AddSeconds(5)
while ((Get-Date) -lt $deadline) {
  if (-not [W]::IsIconic($h) -and [W]::IsWindowVisible($h)) { $restored = $true; break }
  Start-Sleep -Milliseconds 50
}
$out.restored = $restored
$out.restoredMs = [int]((Get-Date) - $t0).TotalMilliseconds
Start-Sleep -Milliseconds 600
$out.foregroundIsWater = ([W]::GetForegroundWindow() -eq $h)
$out.signalLeft = Test-Path -LiteralPath (Join-Path $DataDir 'activate.signal')
$out.afterShot = Shot $h 'after'
$closed = $first.CloseMainWindow()
$out.closeRequested = $closed
$out.firstExited = $first.WaitForExit(20000)
$out.firstExitCode = if ($out.firstExited) { $first.ExitCode } else { $null }
if (-not $out.firstExited) { $first.Kill() }
$out.lockLeft = Test-Path -LiteralPath (Join-Path $DataDir 'water.lock')
$out.top = @(Get-ChildItem -LiteralPath $DataDir -Force | ForEach-Object Name)
$out | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath "$EvidencePrefix-second-instance.json" -Encoding utf8
$out | ConvertTo-Json -Depth 4 -Compress
