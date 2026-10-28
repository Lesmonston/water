# ASCII-only observer for the WATER-W6-I2 close-during-clean check (HOST-M3 section 2). Drives only its own
# Water window through UI Automation: checkup, clean the selected fixture, wait until the cleaning page
# shows its stop button, then request the window to close while the clean is running. Afterwards it
# samples every 50 ms whether the window still exists and when the process exits. No mouse or keyboard
# input is synthesized. Page texts come from a UTF-8 JSON file and are only compared in memory.
param(
    [Parameter(Mandatory=$true)][int]$TestProcessId,
    [Parameter(Mandatory=$true)][string]$ExpectedExe,
    [Parameter(Mandatory=$true)][string]$TextsPath,
    [Parameter(Mandatory=$true)][string]$EvidencePath,
    [Parameter(Mandatory=$true)][string]$ShotPrefix,
    [Parameter(Mandatory=$true)][string]$Title,
    [Parameter(Mandatory=$true)][int]$MaximumSeconds
)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object Text.UTF8Encoding($false)
$fullEvidence = [IO.Path]::GetFullPath($EvidencePath); $fullPrefix = [IO.Path]::GetFullPath($ShotPrefix)
if ([IO.File]::Exists($fullEvidence)) { throw 'Unexpected evidence output' }
$texts = [IO.File]::ReadAllText([IO.Path]::GetFullPath($TextsPath), (New-Object Text.UTF8Encoding($false))) | ConvertFrom-Json
$process = Get-Process -Id $TestProcessId
$ownedHandle = $process.Handle
if ($process.Path -ine [IO.Path]::GetFullPath($ExpectedExe)) { throw 'Unexpected desktop executable' }
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type -AssemblyName System.Drawing
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class W6Close {
    [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hwnd, out RECT rect);
    [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr hwnd, IntPtr hdc, uint flags);
    [DllImport("user32.dll")] public static extern bool IsWindow(IntPtr hwnd);
    [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hwnd);
}
'@
$A = [System.Windows.Automation.AutomationElement]
$deadline = [DateTime]::UtcNow.AddSeconds($MaximumSeconds)
$window = $null; $hwnd = [IntPtr]::Zero; $failure = $null
$record = [ordered]@{ startedAt=[DateTime]::UtcNow.ToString('o'); processId=$TestProcessId; steps=@(); screenshots=@(); deleteButtonName=$null; closeRequestedAt=$null; windowGoneAt=$null; exitAt=$null; exitCode=$null; openSamplesAfterClose=0; error=$null }
function Save-Record { $record['updatedAt'] = [DateTime]::UtcNow.ToString('o'); [IO.File]::WriteAllText($fullEvidence, ($record | ConvertTo-Json -Depth 6), (New-Object Text.UTF8Encoding($false))) }
function Step([string]$name, [scriptblock]$body) {
    $began = [DateTime]::UtcNow; $entry = [ordered]@{ name=$name; passed=$false; ms=$null }; $record['steps'] += $entry; Save-Record
    & $body
    $entry['passed'] = $true; $entry['ms'] = [int]([DateTime]::UtcNow - $began).TotalMilliseconds; Save-Record
}
function Named([string]$name, [string]$type) {
    $byName = New-Object System.Windows.Automation.PropertyCondition($A::NameProperty, $name)
    if ($type) { $cond = New-Object System.Windows.Automation.AndCondition($byName, (New-Object System.Windows.Automation.PropertyCondition($A::ControlTypeProperty, [System.Windows.Automation.ControlType]::$type))) } else { $cond = $byName }
    return $window.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $cond)
}
function PrefixedButton([string]$prefix) {
    $cond = New-Object System.Windows.Automation.PropertyCondition($A::ControlTypeProperty, [System.Windows.Automation.ControlType]::Button)
    foreach ($b in $window.FindAll([System.Windows.Automation.TreeScope]::Descendants, $cond)) { if ($b.Current.Name.StartsWith($prefix, [StringComparison]::Ordinal)) { return $b } }
    return $null
}
function WaitFor([string]$name, [string]$type, [int]$seconds, [string]$fail) {
    $limit = [DateTime]::UtcNow.AddSeconds($seconds)
    while ([DateTime]::UtcNow -lt $limit -and [DateTime]::UtcNow -lt $deadline) {
        if ($fail -and $null -ne (Named $fail $null)) { throw ('Failure text shown while waiting') }
        $found = Named $name $type; if ($null -ne $found) { return $found }; Start-Sleep -Milliseconds 200
    }
    throw 'Expected text not observed'
}
function Press($element) {
    if (!$element.Current.IsEnabled) { throw 'Control disabled' }
    $pattern = $null; if (!$element.TryGetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern, [ref]$pattern)) { throw 'Control has no invoke pattern' }
    $pattern.Invoke()
}
function Shot([string]$label) {
    $rect = New-Object W6Close+RECT; if (![W6Close]::GetWindowRect($hwnd, [ref]$rect)) { throw 'Window rectangle unavailable' }
    $w = $rect.Right - $rect.Left; $h = $rect.Bottom - $rect.Top; if ($w -lt 800 -or $h -lt 600) { throw 'Window too small for a page screenshot' }
    $file = $fullPrefix + '-' + $label + '.png'; if ([IO.File]::Exists($file)) { throw 'Screenshot exists' }
    $bmp = New-Object System.Drawing.Bitmap($w, $h); $g = [System.Drawing.Graphics]::FromImage($bmp); $hdc = $g.GetHdc()
    $printed = [W6Close]::PrintWindow($hwnd, $hdc, 2); $g.ReleaseHdc($hdc); $g.Dispose()
    if (!$printed) { $bmp.Dispose(); throw 'PrintWindow failed' }
    $bmp.Save($file, [System.Drawing.Imaging.ImageFormat]::Png); $bmp.Dispose()
    $record['screenshots'] += [ordered]@{ name=$label; file=[IO.Path]::GetFileName($file); at=[DateTime]::UtcNow.ToString('o'); width=$w; height=$h }
}
try {
    while ([DateTime]::UtcNow -lt $deadline -and $null -eq $window) {
        $condition = New-Object System.Windows.Automation.PropertyCondition($A::ProcessIdProperty, $TestProcessId)
        foreach ($candidate in $A::RootElement.FindAll([System.Windows.Automation.TreeScope]::Children, $condition)) { if ($candidate.Current.ClassName -ne 'Tao Thread Event Target' -and $candidate.Current.Name -eq $Title) { $window = $candidate } }
        if ($null -eq $window) { Start-Sleep -Milliseconds 100 }
    }
    if ($null -eq $window) { throw 'Desktop window title not observed' }
    $hwnd = [IntPtr]$window.Current.NativeWindowHandle
    Step 'home' { [void](WaitFor $texts.home $null 45 $null) }
    Step 'scan' { Press (WaitFor $texts.scanButton 'Button' 15 $null) }
    Step 'results' { [void](WaitFor $texts.results $null 240 $texts.scanFailed); Start-Sleep -Milliseconds 700; Shot 'results' }
    Step 'prepare' { Press (WaitFor $texts.cleanButton 'Button' 15 $null) }
    Step 'confirm' { [void](WaitFor $texts.confirm $null 60 $null); Start-Sleep -Milliseconds 700; Shot 'confirm' }
    Step 'delete' {
        $limit = [DateTime]::UtcNow.AddSeconds(15); $b = $null
        while ($null -eq $b -and [DateTime]::UtcNow -lt $limit) { $b = PrefixedButton $texts.deletePrefix; if ($null -eq $b) { Start-Sleep -Milliseconds 200 } }
        if ($null -eq $b) { throw 'Delete button not found' }
        $record['deleteButtonName'] = $b.Current.Name; Press $b
    }
    Step 'cleaning' { [void](WaitFor $texts.stopButton 'Button' 30 $null); Start-Sleep -Milliseconds 500; Shot 'cleaning' }
    $wp = $window.GetCurrentPattern([System.Windows.Automation.WindowPattern]::Pattern)
    $record['closeRequestedAt'] = [DateTime]::UtcNow.ToString('o'); Save-Record
    $closeAt = [DateTime]::UtcNow; $wp.Close()
    $shotTaken = $false
    while ([DateTime]::UtcNow -lt $deadline) {
        $open = [W6Close]::IsWindow($hwnd) -and [W6Close]::IsWindowVisible($hwnd)
        if ($open) {
            $record['openSamplesAfterClose']++
            if (!$shotTaken -and ([DateTime]::UtcNow - $closeAt).TotalMilliseconds -ge 400) { try { Shot 'closing' } catch { }; $shotTaken = $true }
        } elseif ($null -eq $record['windowGoneAt']) { $record['windowGoneAt'] = [DateTime]::UtcNow.ToString('o') }
        if ($process.HasExited) { $record['exitAt'] = [DateTime]::UtcNow.ToString('o'); break }
        Start-Sleep -Milliseconds 50
    }
    if (!$process.WaitForExit(15000)) { throw 'Desktop exit not observed' }
    $record['exitCode'] = $process.ExitCode
    if ($process.ExitCode -ne 0) { throw 'Desktop exited unsuccessfully' }
} catch { $failure = $_.Exception.Message; $record['error'] = $failure }
finally { $record['endedAt'] = [DateTime]::UtcNow.ToString('o'); Save-Record }
$record | ConvertTo-Json -Depth 6 -Compress
if ($failure) { exit 1 }
