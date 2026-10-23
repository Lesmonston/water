param([Parameter(Mandatory=$true)][int]$TestProcessId)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
$waterProcess = Get-Process -Id $TestProcessId
$waterHandle = $waterProcess.Handle
$waterTree = (Resolve-Path -LiteralPath '.').Path
$waterExpected = Join-Path $waterTree '.local/desktop-target/debug/water-desktop-preview.exe'
if ($waterProcess.Path -ine $waterExpected) { throw 'Unexpected desktop executable' }
$waterEnd = [DateTime]::UtcNow.AddSeconds(15)
$waterWindow = $null
while ([DateTime]::UtcNow -lt $waterEnd) {
    $waterCondition = New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::ProcessIdProperty, $TestProcessId)
    $waterWindows = [System.Windows.Automation.AutomationElement]::RootElement.FindAll([System.Windows.Automation.TreeScope]::Children, $waterCondition)
    foreach ($waterCandidate in $waterWindows) {
        if ($waterCandidate.Current.Name -eq 'Water Desktop Preview') { $waterWindow = $waterCandidate; break }
    }
    if ($null -ne $waterWindow) { break }
    Start-Sleep -Milliseconds 100
}
if ($null -eq $waterWindow) { throw 'Desktop window title was not observed' }
$waterText = @()
while ([DateTime]::UtcNow -lt $waterEnd) {
    $waterText = @()
    $waterElements = $waterWindow.FindAll([System.Windows.Automation.TreeScope]::Descendants, [System.Windows.Automation.Condition]::TrueCondition)
    if ($waterElements.Count -gt 1500) { throw 'Unexpected desktop automation tree size' }
    foreach ($waterElement in $waterElements) { if ($waterElement.Current.Name) { $waterText += $waterElement.Current.Name } }
    if (($waterText -join "`n") -match '桌面壳已启动' -and ($waterText -join "`n") -match '尚未接入扫描') { break }
    Start-Sleep -Milliseconds 100
}
if (($waterText -join "`n") -notmatch '桌面壳已启动' -or ($waterText -join "`n") -notmatch '尚未接入扫描') { throw 'Required embedded read-only page text not observed' }
[ordered]@{ processId=$TestProcessId; title=$waterWindow.Current.Name; systemWindows=1; directoryDialogs=0; embeddedPageText=$waterText; screenshotsTaken=0 } | ConvertTo-Json -Depth 4 -Compress
$waterPattern = $waterWindow.GetCurrentPattern([System.Windows.Automation.WindowPattern]::Pattern)
$waterPattern.Close()
if (!$waterProcess.WaitForExit(10000)) { throw 'Desktop preview did not exit normally' }
if ($waterProcess.ExitCode -ne 0) { throw 'Desktop preview failed on exit' }
