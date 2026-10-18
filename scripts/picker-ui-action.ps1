param([Parameter(Mandatory=$true)][int]$TestProcessId,[Parameter(Mandatory=$true)][ValidateSet('cancel','select')][string]$Action)
$ErrorActionPreference = 'Stop'
Add-Type -Path 'C:/Windows/Microsoft.NET/Framework64/v4.0.30319/WPF/UIAutomationTypes.dll'
Add-Type -Path 'C:/Windows/Microsoft.NET/Framework64/v4.0.30319/WPF/UIAutomationClient.dll'
$deadline = [DateTime]::UtcNow.AddSeconds(12)
$window = $null
while ([DateTime]::UtcNow -lt $deadline) {
    $windows = [System.Windows.Automation.AutomationElement]::RootElement.FindAll([System.Windows.Automation.TreeScope]::Children,[System.Windows.Automation.Condition]::TrueCondition)
    foreach ($candidate in $windows) {
        if ($candidate.Current.ProcessId -eq $TestProcessId -and $candidate.Current.Name -eq 'Water - Select a read-only directory') { $window = $candidate; break }
    }
    if ($null -ne $window) { break }
    Start-Sleep -Milliseconds 50
}
if ($null -eq $window) { throw 'Controlled picker window not found' }
Write-Output ('WATER_UI_WINDOW ' + $TestProcessId + ' ' + $window.Current.ClassName + ' visible=' + (-not $window.Current.IsOffscreen))
$buttonId = if ($Action -eq 'cancel') { '2' } else { '1' }
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class WaterControlledButton {
 [DllImport("user32.dll")] public static extern IntPtr GetDlgItem(IntPtr parent,int id);
 [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hwnd,out uint process);
 [DllImport("user32.dll")] public static extern bool IsWindowEnabled(IntPtr hwnd);
 [DllImport("user32.dll")] public static extern bool PostMessage(IntPtr hwnd,uint msg,IntPtr w,IntPtr l);
}
'@
$buttonHandle = [IntPtr]::Zero
while ([DateTime]::UtcNow -lt $deadline) {
    $buttonHandle = [WaterControlledButton]::GetDlgItem([IntPtr]$window.Current.NativeWindowHandle,[int]$buttonId)
    if ($buttonHandle -ne [IntPtr]::Zero -and [WaterControlledButton]::IsWindowEnabled($buttonHandle)) { break }
    Start-Sleep -Milliseconds 50
}
if ($buttonHandle -eq [IntPtr]::Zero -or -not [WaterControlledButton]::IsWindowEnabled($buttonHandle)) { throw 'Controlled picker button unavailable' }
[uint32]$buttonProcess = 0
$null = [WaterControlledButton]::GetWindowThreadProcessId($buttonHandle,[ref]$buttonProcess)
if ($buttonProcess -ne $TestProcessId) { throw 'Controlled picker button PID mismatch' }
if (-not [WaterControlledButton]::PostMessage($buttonHandle,0x00F5,[IntPtr]::Zero,[IntPtr]::Zero)) { throw 'Controlled button click failed' }
Write-Output ('WATER_UI_ACTION ' + $TestProcessId + ' ' + $Action)
