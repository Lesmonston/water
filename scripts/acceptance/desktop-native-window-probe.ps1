# No live UIA enumeration. Replay recorded roots and test classification boundaries.
param([Parameter(Mandatory=$true)][string]$ControllerRoot)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object Text.UTF8Encoding($false)
. (Join-Path $ControllerRoot 'scripts/acceptance/desktop-native-window-policy.ps1')
. (Join-Path $ControllerRoot 'scripts/acceptance/desktop-native-root-policy.ps1')
. (Join-Path $ControllerRoot 'scripts/acceptance/desktop-native-text-policy.ps1')
$parserResults = @()
foreach ($file in @('desktop-native-window-policy.ps1','desktop-native-window-probe.ps1','desktop-native-window-observe.ps1')) {
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
    $cacheBindingProbe.Add($boundProperty); $cacheBindings += $property
}
$replayPath = Join-Path $ControllerRoot '.worktrees/ac/docs/acceptance/wave1/ac/addendum-05/raw/2026-10-24T08-45-11.554Z-32552-uia.txt'
$prior = [IO.File]::ReadAllText($replayPath,[Text.Encoding]::UTF8) | ConvertFrom-Json
$expectedProcess = [int]$prior.processId
$old = Resolve-WaterDesktopRootSnapshot -Roots $prior.roots -ReportedCount $prior.rootCount -ExpectedProcessId $expectedProcess
$replay = Resolve-WaterDesktopWindowSnapshot -Roots $prior.roots -ReportedCount $prior.rootCount -ExpectedProcessId $expectedProcess -FrameworkVerified $true
if ($old.accepted -or !$replay.accepted -or $replay.rawRootCount -ne 2 -or $replay.applicationWindowCount -ne 1 -or $replay.frameworkEventTargetCount -ne 1) { throw 'Historical replay classification mismatch' }
function Copy-WaterReplayRoot { param([int]$Index) return ($prior.roots[$Index] | ConvertTo-Json -Depth 8 | ConvertFrom-Json) }
$cases = @(
    [ordered]@{ name='one-application-no-helper'; roots=@((Copy-WaterReplayRoot 0)); count=1; accept=$true; closeIndex=0; pin=$true }
    [ordered]@{ name='pinned-main-and-event-target'; roots=@((Copy-WaterReplayRoot 0),(Copy-WaterReplayRoot 1)); count=2; accept=$true; closeIndex=0; pin=$true }
    [ordered]@{ name='reordered-event-target-main'; roots=@((Copy-WaterReplayRoot 1),(Copy-WaterReplayRoot 0)); count=2; accept=$true; closeIndex=1; pin=$true }
    [ordered]@{ name='no-root'; roots=@(); count=0; accept=$false; closeIndex=$null; pin=$true }
    [ordered]@{ name='event-target-only'; roots=@((Copy-WaterReplayRoot 1)); count=1; accept=$false; closeIndex=$null; pin=$true }
    [ordered]@{ name='unverified-pin'; roots=@((Copy-WaterReplayRoot 0),(Copy-WaterReplayRoot 1)); count=2; accept=$false; closeIndex=$null; pin=$false }
    [ordered]@{ name='truncated-snapshot'; roots=@((Copy-WaterReplayRoot 0)); count=2; accept=$false; closeIndex=$null; pin=$true }
    [ordered]@{ name='over-32-root-budget'; roots=@((Copy-WaterReplayRoot 0)); count=33; accept=$false; closeIndex=$null; pin=$true }
)
foreach ($size in @(0,64)) {
    $helper = Copy-WaterReplayRoot 1; $helper.rectangle = @(0,0,$size,$size)
    $cases += [ordered]@{ name=('helper-size-boundary-' + $size); roots=@((Copy-WaterReplayRoot 0),$helper); count=2; accept=$true; closeIndex=0; pin=$true }
}
$variants = @(
    @{name='helper-nonempty-title'; field='name'; value='Other'; closeIndex=0}
    @{name='helper-class-case-change'; field='className'; value='tao Thread Event Target'; closeIndex=0}
    @{name='other-pane'; field='className'; value='Other Pane'; closeIndex=0}
    @{name='extra-application-window'; field='controlType'; value='ControlType.Window'; closeIndex=0}
    @{name='helper-window-pattern'; field='windowPatternAvailable'; value=$true; closeIndex=0}
    @{name='offscreen-is-not-a-generic-exemption'; field='isOffscreen'; value=$true; closeIndex=0}
    @{name='helper-not-control'; field='isControlElement'; value=$false; closeIndex=0}
    @{name='helper-not-content'; field='isContentElement'; value=$false; closeIndex=0}
    @{name='helper-wrong-pid'; field='processId'; value=12345; closeIndex=$null}
    @{name='helper-zero-handle'; field='nativeHandle'; value=0; closeIndex=$null}
    @{name='helper-origin-x'; field='rectangle'; value=@(1,0,18,18); closeIndex=0}
    @{name='helper-origin-y'; field='rectangle'; value=@(0,-1,18,18); closeIndex=0}
    @{name='helper-width-65'; field='rectangle'; value=@(0,0,65,18); closeIndex=0}
    @{name='helper-height-65'; field='rectangle'; value=@(0,0,18,65); closeIndex=0}
    @{name='helper-negative-width'; field='rectangle'; value=@(0,0,-1,18); closeIndex=$null}
    @{name='helper-runtime-provider'; field='runtimeId'; value=@(43,38930730); closeIndex=0}
    @{name='helper-runtime-handle-mismatch'; field='runtimeId'; value=@(42,999); closeIndex=0}
    @{name='helper-runtime-extra-id'; field='runtimeId'; value=@(42,38930730,1); closeIndex=0}
    @{name='helper-read-error'; field='readError'; value='unavailable'; closeIndex=$null}
    @{name='helper-missing-bounds'; field='rectangle'; value=$null; closeIndex=$null}
    @{name='helper-non-boolean'; field='isContentElement'; value='true'; closeIndex=$null}
    @{name='helper-null-name'; field='name'; value=$null; closeIndex=$null}
    @{name='helper-invalid-number'; field='rectangle'; value=@(0,0,[double]::NaN,18); closeIndex=$null}
)
foreach ($variant in $variants) {
    $helper = Copy-WaterReplayRoot 1; $helper.($variant.field) = $variant.value
    $cases += [ordered]@{ name=$variant.name; roots=@((Copy-WaterReplayRoot 0),$helper); count=2; accept=$false; closeIndex=$variant.closeIndex; pin=$true }
}
foreach ($field in @('name','className','windowPatternAvailable')) {
    $main = Copy-WaterReplayRoot 0
    if ($field -eq 'windowPatternAvailable') { $main.$field = $false } else { $main.$field = 'Wrong' }
    $cases += [ordered]@{ name=('wrong-main-' + $field); roots=@($main,(Copy-WaterReplayRoot 1)); count=2; accept=$false; closeIndex=$null; pin=$true }
}
$missing = Copy-WaterReplayRoot 1; $missing.PSObject.Properties.Remove('readError')
$cases += [ordered]@{ name='missing-required-field'; roots=@((Copy-WaterReplayRoot 0),$missing); count=2; accept=$false; closeIndex=$null; pin=$true }
$secondMain = Copy-WaterReplayRoot 0; $secondMain.nativeHandle = 3000; $secondMain.runtimeId = @(42,3000)
$cases += [ordered]@{ name='two-mains'; roots=@((Copy-WaterReplayRoot 0),(Copy-WaterReplayRoot 1),$secondMain); count=3; accept=$false; closeIndex=$null; pin=$true }
$secondHelper = Copy-WaterReplayRoot 1; $secondHelper.nativeHandle = 4000; $secondHelper.runtimeId = @(42,4000)
$cases += [ordered]@{ name='two-framework-targets'; roots=@((Copy-WaterReplayRoot 0),(Copy-WaterReplayRoot 1),$secondHelper); count=3; accept=$false; closeIndex=0; pin=$true }
$duplicateHandle = Copy-WaterReplayRoot 1; $duplicateHandle.nativeHandle = $prior.roots[0].nativeHandle; $duplicateHandle.runtimeId = @(42,$duplicateHandle.nativeHandle)
$cases += [ordered]@{ name='duplicate-native-handle'; roots=@((Copy-WaterReplayRoot 0),$duplicateHandle); count=2; accept=$false; closeIndex=$null; pin=$true }
$duplicateRuntime = Copy-WaterReplayRoot 1; $duplicateRuntime.runtimeId = @($prior.roots[0].runtimeId)
$cases += [ordered]@{ name='duplicate-runtime-id'; roots=@((Copy-WaterReplayRoot 0),$duplicateRuntime); count=2; accept=$false; closeIndex=$null; pin=$true }
$results = @()
foreach ($case in $cases) {
    $decision = Resolve-WaterDesktopWindowSnapshot -Roots $case.roots -ReportedCount $case.count -ExpectedProcessId $expectedProcess -FrameworkVerified $case.pin
    if ($decision.accepted -ne $case.accept -or $decision.mainIndex -ne $case.closeIndex) { throw ('Policy result or cleanup mismatch: ' + $case.name) }
    $results += [ordered]@{ name=$case.name; accepted=$decision.accepted; mainIndex=$decision.mainIndex; error=$decision.error }
}
$bindings = @()
$bindings += [ordered]@{ name='same-main-reordered-roots'; accepted=(Test-WaterDesktopMainBinding -Before $prior.roots[0] -After $prior.roots[0]) }
if (!$bindings[0].accepted) { throw 'Stable main rejected' }
foreach ($field in @('processId','nativeHandle','runtimeId')) {
    $changed = Copy-WaterReplayRoot 0
    if ($field -eq 'runtimeId') { $changed.runtimeId = @(42,1000) } else { $changed.$field = 1000 }
    $accepted = Test-WaterDesktopMainBinding -Before $prior.roots[0] -After $changed
    if ($accepted) { throw 'Changed main accepted' }
    $bindings += [ordered]@{ name=('changed-main-' + $field); accepted=$accepted }
}
$required = @(Get-WaterDesktopRequiredText)
$html = [IO.File]::ReadAllText((Join-Path $ControllerRoot '.worktrees/ac/apps/desktop-preview/frontend/index.html'),[Text.Encoding]::UTF8)
foreach ($text in $required) { if (!$html.Contains($text)) { throw 'Actual unchanged asset text missing' } }
if (!(Test-WaterDesktopPageText -Names $required)) { throw 'Correct text rejected' }
$omissions = @()
for ($missing = 0; $missing -lt 4; $missing++) {
    $names = @(); for ($index = 0; $index -lt 4; $index++) { if ($index -ne $missing) { $names += $required[$index] } }
    $accepted = Test-WaterDesktopPageText -Names $names
    if ($accepted) { throw 'Missing required text accepted' }
    $omissions += [ordered]@{ missingIndex=$missing; accepted=$accepted }
}
$runtime = [IO.File]::ReadAllText((Join-Path $ControllerRoot 'scripts/acceptance/desktop-native-window-observe.ps1'),[Text.Encoding]::ASCII)
foreach ($call in @('Resolve-WaterDesktopWindowSnapshot -Roots $rootRows','Test-WaterDesktopPageText -Names $names','Test-WaterDesktopMainBinding -Before $mainBinding',"Read-WaterWindowSnapshot -Phase 'before-close'")) {
    if (!$runtime.Contains($call)) { throw 'Shared runtime policy or before-close capture missing' }
}
if ($runtime.IndexOf("`$rootRows += `$row; `$snapshot['roots'] = `$rootRows; Save-WaterWindowRecord") -gt $runtime.IndexOf('$decision = Resolve-WaterDesktopWindowSnapshot')) { throw 'Snapshot must persist before classification' }
[ordered]@{ status='passed'; systemWindows=0; UIAEnumeration=$false; parser=$parserResults; cachePropertyBindings=$cacheBindings; historicalReplay=[ordered]@{ kind='recorded-data-only'; source=$replayPath; originalAccepted=$old.accepted; revisedDecision=$replay; liveNativePassed=$false }; syntheticWindowCases=$results; mainBindingCases=$bindings; required=$required; fullTextAccepted=$true; missingTextNegatives=$omissions; runtimeCallsSamePolicy=$true; beforeCloseSnapshotWired=$true } | ConvertTo-Json -Depth 10 -Compress
