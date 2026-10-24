# No-UI controller preflight for the shared runtime policy and parser boundary.
param([Parameter(Mandatory=$true)][string]$ControllerRoot)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object Text.UTF8Encoding($false)
. (Join-Path $ControllerRoot 'scripts/acceptance/desktop-native-text-policy.ps1')
$files = @('desktop-native-text-policy.ps1','desktop-native-text-probe.ps1','desktop-native-observe.ps1')
$parsers = @()
foreach ($file in $files) {
    $path = Join-Path $ControllerRoot ('scripts/acceptance/' + $file)
    $bytes = [IO.File]::ReadAllBytes($path)
    if (@($bytes | Where-Object { $_ -gt 127 }).Count -ne 0) { throw 'Helper must contain only ASCII bytes' }
    $tokens = $null; $errors = $null
    $null = [System.Management.Automation.Language.Parser]::ParseFile($path,[ref]$tokens,[ref]$errors)
    if (@($errors).Count -ne 0) { throw 'Native helper parse error' }
    $parsers += [ordered]@{ file=$file; ascii=$true; parseErrors=0 }
}
$required = @(Get-WaterDesktopRequiredText)
if ($required.Count -ne 4) { throw 'Required text count changed' }
$html = [IO.File]::ReadAllText((Join-Path $ControllerRoot '.worktrees/ac/apps/desktop-preview/frontend/index.html'),[Text.Encoding]::UTF8)
foreach ($text in $required) { if (!$html.Contains($text)) { throw 'Required text missing from actual unchanged asset' } }
if (!(Test-WaterDesktopPageText -Names $required)) { throw 'Correct required text rejected' }
$negatives = @()
for ($i=0; $i -lt $required.Count; $i++) {
    $names = @(); for ($j=0; $j -lt $required.Count; $j++) { if ($j -ne $i) { $names += $required[$j] } }
    if (Test-WaterDesktopPageText -Names $names) { throw 'Missing required text accepted' }
    $negatives += [ordered]@{ missingIndex=$i; accepted=$false }
}
$oldPath = Join-Path $ControllerRoot 'scripts/acceptance/delivery-desktop-native.ps1'
$tokens = $null; $errors = $null
$oldAst = [System.Management.Automation.Language.Parser]::ParseFile($oldPath,[ref]$tokens,[ref]$errors)
$old = @($oldAst.FindAll({ param($n) $n -is [System.Management.Automation.Language.StringConstantExpressionAst] },$true) | Where-Object { $_.Extent.StartLineNumber -eq 31 -and $_.Value.Length -gt 10 -and $_.Value -ne 'Required embedded read-only page text not observed' })
$oldMatches = @($old | ForEach-Object { ($required -join "`n") -match $_.Value })
$runtime = [IO.File]::ReadAllText((Join-Path $ControllerRoot 'scripts/acceptance/desktop-native-observe.ps1'),[Text.Encoding]::ASCII)
if (!$runtime.Contains('Test-WaterDesktopPageText -Names $names')) { throw 'Runtime shared policy not called' }
[ordered]@{ status='passed'; systemWindows=0; productExecuted=$false; powershell=$PSVersionTable.PSVersion.ToString(); codePage=[Text.Encoding]::Default.CodePage; parser=$parsers; required=$required; positiveAccepted=$true; missingTextNegatives=$negatives; originalParsedPatterns=$old.Count; originalMatches=$oldMatches; runtimeCallsSamePolicy=$true; screenshots=0 } | ConvertTo-Json -Depth 7 -Compress
