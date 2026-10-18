param([Parameter(Mandatory=$true)][int]$TestProcessId,[Parameter(Mandatory=$true)][ValidateSet('nested','cancel')][string]$Action)
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
if ($null -eq $window) { throw 'Review controlled window missing' }
if ($Action -eq 'nested') {
    $item = $null
    $nameCondition = [System.Windows.Automation.PropertyCondition]::new([System.Windows.Automation.AutomationElement]::NameProperty,'nested')
    while ([DateTime]::UtcNow -lt $deadline) {
        $items = $window.FindAll([System.Windows.Automation.TreeScope]::Descendants,$nameCondition)
        foreach ($candidate in $items) {
            $selection = $null
            if ($candidate.TryGetCurrentPattern([System.Windows.Automation.SelectionItemPattern]::Pattern,[ref]$selection)) { $item = $candidate; $selection.Select(); break }
        }
        if ($null -ne $item) { break }
        Start-Sleep -Milliseconds 50
    }
    if ($null -eq $item) { throw 'Controlled nested directory item missing' }
    Write-Output ('WATER_REVIEW_SELECTED ' + $TestProcessId + ' nested')
}
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class WaterReviewButton {
 [DllImport("user32.dll")] public static extern IntPtr GetDlgItem(IntPtr parent,int id);
 [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hwnd,out uint process);
 [DllImport("user32.dll")] public static extern bool IsWindowEnabled(IntPtr hwnd);
 [DllImport("user32.dll")] public static extern bool PostMessage(IntPtr hwnd,uint msg,IntPtr w,IntPtr l);
}
'@
$buttonId = if ($Action -eq 'cancel') { 2 } else { 1 }
$button = [WaterReviewButton]::GetDlgItem([IntPtr]$window.Current.NativeWindowHandle,$buttonId)
if ($button -eq [IntPtr]::Zero -or -not [WaterReviewButton]::IsWindowEnabled($button)) { throw 'Review controlled button unavailable' }
[uint32]$buttonProcess = 0
$null = [WaterReviewButton]::GetWindowThreadProcessId($button,[ref]$buttonProcess)
if ($buttonProcess -ne $TestProcessId) { throw 'Review controlled PID mismatch' }
if (-not [WaterReviewButton]::PostMessage($button,0x00F5,[IntPtr]::Zero,[IntPtr]::Zero)) { throw 'Review controlled click failed' }
Write-Output ('WATER_REVIEW_ACTION ' + $TestProcessId + ' ' + $Action)
