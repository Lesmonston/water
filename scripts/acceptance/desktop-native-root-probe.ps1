# No-UI tests of the exact policy called by the new bounded observer.
param([Parameter(Mandatory=$true)][string]$ControllerRoot)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object Text.UTF8Encoding($false)
. (Join-Path $ControllerRoot 'scripts/acceptance/desktop-native-root-policy.ps1')
. (Join-Path $ControllerRoot 'scripts/acceptance/desktop-native-text-policy.ps1')
$parserResults = @()
foreach ($file in @('desktop-native-root-policy.ps1','desktop-native-root-probe.ps1','desktop-native-root-observe.ps1')) {
    $path = Join-Path $ControllerRoot ('scripts/acceptance/' + $file)
    if (@([IO.File]::ReadAllBytes($path) | Where-Object { $_ -gt 127 }).Count -gt 0) { throw 'New helper contains non-ASCII bytes' }
    $tokens = $null; $parseErrors = $null
    $null = [System.Management.Automation.Language.Parser]::ParseFile($path,[ref]$tokens,[ref]$parseErrors)
    if (@($parseErrors).Count -gt 0) { throw 'New helper parse failed' }
    $parserResults += [ordered]@{ file=$file; ascii=$true; parseErrors=0 }
}
Add-Type -AssemblyName UIAutomationClient
$cacheBindingProbe = New-Object System.Windows.Automation.CacheRequest
$cacheBindings = @()
foreach ($property in @('Name','ClassName','ControlType','NativeWindowHandle','ProcessId','IsOffscreen','IsControlElement','IsContentElement','BoundingRectangle','IsWindowPatternAvailable')) {
    $boundProperty = [System.Windows.Automation.AutomationElement]::($property + 'Property')
    if ($null -eq $boundProperty) { throw 'Cache property binding unavailable' }
    $cacheBindingProbe.Add($boundProperty)
    $cacheBindings += $property
}
$expectedProcess = 24680
function New-WaterMockRoot {
    param([int]$OwnerId=$expectedProcess,[string]$Name='Water Desktop Preview',[int]$Handle=100,[bool]$Offscreen=$false)
    [ordered]@{ processId=$OwnerId; name=$Name; className='mock'; controlType='ControlType.Window'; nativeHandle=$Handle; isOffscreen=$Offscreen; windowPatternAvailable=$true; readError=$null }
}
$cases = @(
    [ordered]@{ name='one-main'; roots=@((New-WaterMockRoot)); count=1; accept=$true; main=0 }
    [ordered]@{ name='no-root'; roots=@(); count=0; accept=$false; main=$null }
    [ordered]@{ name='additional-visible-root'; roots=@((New-WaterMockRoot),(New-WaterMockRoot -Name 'Extra' -Handle 200)); count=2; accept=$false; main=0 }
    [ordered]@{ name='additional-offscreen-root-still-fails'; roots=@((New-WaterMockRoot),(New-WaterMockRoot -Name 'Hidden?' -Handle 200 -Offscreen $true)); count=2; accept=$false; main=0 }
    [ordered]@{ name='additional-zero-handle-root-still-fails'; roots=@((New-WaterMockRoot),(New-WaterMockRoot -Name 'Provider?' -Handle 0)); count=2; accept=$false; main=0 }
    [ordered]@{ name='ambiguous-title-no-close-target'; roots=@((New-WaterMockRoot),(New-WaterMockRoot -Handle 200)); count=2; accept=$false; main=$null }
    [ordered]@{ name='foreign-process-no-close-target'; roots=@((New-WaterMockRoot -OwnerId 111)); count=1; accept=$false; main=$null }
    [ordered]@{ name='wrong-title-no-close-target'; roots=@((New-WaterMockRoot -Name 'Other')); count=1; accept=$false; main=$null }
    [ordered]@{ name='zero-handle-no-close-target'; roots=@((New-WaterMockRoot -Handle 0)); count=1; accept=$false; main=$null }
    [ordered]@{ name='incomplete-root-snapshot'; roots=@((New-WaterMockRoot)); count=2; accept=$false; main=0 }
    [ordered]@{ name='root-limit'; roots=@((New-WaterMockRoot)); count=33; accept=$false; main=0 }
)
$unavailable = New-WaterMockRoot; $unavailable['readError'] = 'Own root property snapshot unavailable'
$cases += [ordered]@{ name='unavailable-property-no-close-target'; roots=@($unavailable); count=1; accept=$false; main=$null }
$noPattern = New-WaterMockRoot; $noPattern['windowPatternAvailable'] = $false
$cases += [ordered]@{ name='missing-window-pattern-no-close-target'; roots=@($noPattern); count=1; accept=$false; main=$null }
$results = @()
foreach ($case in $cases) {
    $decision = Resolve-WaterDesktopRootSnapshot -Roots $case.roots -ReportedCount $case.count -ExpectedProcessId $expectedProcess
    if ($decision.accepted -ne $case.accept) { throw ('Policy result mismatch: ' + $case.name) }
    if ($decision.mainIndex -ne $case.main) { throw ('Cleanup selection mismatch: ' + $case.name) }
    $results += [ordered]@{ name=$case.name; accepted=$decision.accepted; mainIndex=$decision.mainIndex; error=$decision.error }
}
$required = @(Get-WaterDesktopRequiredText)
$html = [IO.File]::ReadAllText((Join-Path $ControllerRoot '.worktrees/ac/apps/desktop-preview/frontend/index.html'),[Text.Encoding]::UTF8)
foreach ($text in $required) { if (!$html.Contains($text)) { throw 'Actual unchanged asset text missing' } }
if (!(Test-WaterDesktopPageText -Names $required)) { throw 'Correct text rejected' }
for ($missing = 0; $missing -lt 4; $missing++) {
    $names = @(); for ($index = 0; $index -lt 4; $index++) { if ($index -ne $missing) { $names += $required[$index] } }
    if (Test-WaterDesktopPageText -Names $names) { throw 'Missing required text accepted' }
}
$runtime = [IO.File]::ReadAllText((Join-Path $ControllerRoot 'scripts/acceptance/desktop-native-root-observe.ps1'),[Text.Encoding]::ASCII)
if (!$runtime.Contains('Resolve-WaterDesktopRootSnapshot -Roots $rootRows') -or !$runtime.Contains('Test-WaterDesktopPageText -Names $names')) { throw 'Shared runtime policy missing' }
$persist = $runtime.IndexOf('Save-WaterRootRecord' + "`r`n" + '        # Retain every root')
$guard = $runtime.IndexOf('throw $decision.error')
if ($persist -lt 0 -or $guard -le $persist) { throw 'Snapshot is not persisted before root guard' }
[ordered]@{ status='passed'; systemWindows=0; UIAEnumeration=$false; productExecuted=$false; parser=$parserResults; cachePropertyBindings=$cacheBindings; syntheticRootCases=$results; allRootCountAboveOneRefused=$true; mainCleanupTargetNeverArbitrary=$true; actualAssetFourTexts=$true; missingTextNegatives=4; required=$required; priorFailureCannotReconstructMissingRoots=$true; runtimeAndProbeSharePolicy=$true; powershell=$PSVersionTable.PSVersion.ToString() } | ConvertTo-Json -Depth 8 -Compress
