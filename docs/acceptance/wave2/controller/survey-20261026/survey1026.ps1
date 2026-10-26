param([string]$Out)
# Read-only metadata survey of candidate junk locations. Names, sizes and times only; no file contents.
$ErrorActionPreference = 'SilentlyContinue'
[Console]::OutputEncoding = [Text.Encoding]::UTF8
function Walk([string]$p) {
  $t=[int64]0; $n=0; $newest=[datetime]::MinValue; $st=New-Object System.Collections.Generic.Stack[string]; $st.Push($p)
  while ($st.Count) { $d=$st.Pop(); try { $di=New-Object IO.DirectoryInfo($d) } catch { continue }
    try { foreach ($f in $di.EnumerateFiles()) { $t+=$f.Length; $n++; if ($f.LastWriteTime -gt $newest) { $newest=$f.LastWriteTime } } } catch {}
    try { foreach ($s in $di.EnumerateDirectories()) { if (($s.Attributes -band [IO.FileAttributes]::ReparsePoint) -eq 0) { $st.Push($s.FullName) } } } catch {} }
  [pscustomobject]@{Bytes=$t; Files=$n; Newest=$newest} }
$rows = New-Object System.Collections.Generic.List[object]
function Add($label, $path) {
  if (-not (Test-Path -LiteralPath $path)) { $rows.Add([pscustomobject]@{Label=$label; Path=$path; GB='-'; Files=0; Newest=''}); return }
  $it = Get-Item -LiteralPath $path -Force
  if ($it.Attributes -band [IO.FileAttributes]::ReparsePoint) { $rows.Add([pscustomobject]@{Label=$label; Path=$path; GB='junction'; Files=0; Newest=''}); return }
  $w = Walk $path
  $rows.Add([pscustomobject]@{Label=$label; Path=$path; GB=[math]::Round($w.Bytes/1GB,3); Files=$w.Files; Newest=$(if($w.Newest -gt [datetime]::MinValue){$w.Newest.ToString('MM-dd HH:mm')}else{''})}) }
function Group([string]$root, [int]$top=15) {
  $g=@{}; $di=New-Object IO.DirectoryInfo($root); if (-not $di.Exists) { return }
  foreach ($s in $di.EnumerateDirectories()) { if (($s.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { continue }
    $key = $s.Name -replace '[-_.]?[A-Za-z0-9]{6,}$','*' -replace '\d+','#'
    if (-not $g.ContainsKey($key)) { $g[$key]=[pscustomobject]@{Key=$key;Count=0;Bytes=[int64]0;Oldest=[datetime]::MaxValue;Newest=[datetime]::MinValue} }
    $x=$g[$key]; $x.Count++; $x.Bytes += (Walk $s.FullName).Bytes; if ($s.LastWriteTime -gt $x.Newest){$x.Newest=$s.LastWriteTime}; if ($s.LastWriteTime -lt $x.Oldest){$x.Oldest=$s.LastWriteTime} }
  $fb=[int64]0;$fc=0;$fnew=[datetime]::MinValue; foreach ($f in $di.EnumerateFiles()) { $fb+=$f.Length;$fc++ }
  "## group $root (loose files $fc, $([math]::Round($fb/1GB,3)) GB)"
  $g.Values | Sort-Object Bytes -Descending | Select-Object -First $top Key,Count,@{n='GB';e={[math]::Round($_.Bytes/1GB,3)}},@{n='Oldest';e={$_.Oldest.ToString('MM-dd')}},@{n='Newest';e={$_.Newest.ToString('MM-dd HH:mm')}} | Format-Table -AutoSize | Out-String -Width 220 }
$L=$env:LOCALAPPDATA; $R=$env:APPDATA; $U=$env:USERPROFILE
$res = @()
$res += "# survey $(Get-Date -Format s)"
$res += (Get-PSDrive -PSProvider FileSystem | Select-Object Name,@{n='UsedGB';e={[math]::Round($_.Used/1GB,1)}},@{n='FreeGB';e={[math]::Round($_.Free/1GB,1)}} | Format-Table | Out-String)
$res += Group 'C:\Windows\Temp'
$res += Group $env:TEMP
foreach ($b in @(@('Chrome',"$L\Google\Chrome\User Data"),@('Edge',"$L\Microsoft\Edge\User Data"),@('Brave',"$L\BraveSoftware\Brave-Browser\User Data"))) {
  $ud=$b[1]; if (-not (Test-Path -LiteralPath $ud)) { continue }
  foreach ($n in 'ShaderCache','GrShaderCache','GraphiteDawnCache','Crashpad','component_crx_cache','extensions_crx_cache','OptGuideOnDeviceModel','optimization_guide_model_store','Safe Browsing','BrowserMetrics','Subresource Filter') { Add "$($b[0]) /$n" (Join-Path $ud $n) }
  foreach ($p in Get-ChildItem -LiteralPath $ud -Directory -Force | Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName 'Preferences') }) {
    foreach ($n in 'Cache','Code Cache','GPUCache','DawnCache','DawnGraphiteCache','DawnWebGPUCache','Service Worker\CacheStorage','Service Worker\ScriptCache','Media Cache') { Add "$($b[0]) $($p.Name)/$n" (Join-Path $p.FullName $n) }
    foreach ($n in 'Network','Local Storage','IndexedDB','Login Data','History') { Add "$($b[0]) $($p.Name)/[protected] $n" (Join-Path $p.FullName $n) } } }
foreach ($p in Get-ChildItem -LiteralPath "$L\Mozilla\Firefox\Profiles" -Directory -Force) { Add "Firefox $($p.Name)/cache2" (Join-Path $p.FullName 'cache2') }
Add 'CrashDumps' "$L\CrashDumps"; Add 'WER user' "$L\Microsoft\Windows\WER"; Add 'WER system' 'C:\ProgramData\Microsoft\Windows\WER'
Add 'INetCache' "$L\Microsoft\Windows\INetCache"; Add 'D3DSCache' "$L\D3DSCache"; Add 'NVIDIA DXCache' "$L\NVIDIA\DXCache"; Add 'NVIDIA GLCache' "$L\NVIDIA\GLCache"
Add 'Explorer thumbcache' "$L\Microsoft\Windows\Explorer"
Add 'npm-cache' "$L\npm-cache"; Add 'pip cache' "$L\pip\cache"; Add 'uv cache' "$L\uv\cache"; Add 'pnpm store' "$L\pnpm\store"; Add 'yarn cache' "$L\Yarn\Cache"; Add 'bun cache' "$U\.bun\install\cache"
Add 'gradle' "$U\.gradle"; Add 'cargo registry' "$U\.cargo\registry"; Add 'ms-playwright' "$L\ms-playwright"; Add 'node-gyp' "$L\node-gyp"; Add 'electron cache' "$L\electron\Cache"
Add 'codex staging' "$U\.codex2\.tmp\marketplaces\.staging"; Add 'codex runtimes' "$U\.cache\codex-runtimes"; Add 'claude projects (protected)' "$U\.claude\projects"; Add 'claude file-history' "$U\.claude\file-history"
Add 'cursor chats (protected)' "$U\.cursor\chats"; Add 'grok sessions (protected)' "$U\.grok\sessions"; Add 'grok downloads' "$U\.grok\downloads"
Add 'AnthropicClaude' "$L\AnthropicClaude"; Add 'Windows SoftwareDistribution Download' 'C:\Windows\SoftwareDistribution\Download'; Add 'DeliveryOptimization' 'C:\Windows\ServiceProfiles\NetworkService\AppData\Local\Microsoft\Windows\DeliveryOptimization'
Add 'Windows Installer patch cache' 'C:\Windows\Installer\$PatchCache$'; Add 'Downloaded Program Files' 'C:\Windows\Downloaded Program Files'
foreach ($d in Get-ChildItem -LiteralPath $L -Directory -Force) { foreach ($n in 'packages','Update','updater','Cache','GPUCache','Code Cache','CachedData','CachedExtensionVSIXs') { $p=Join-Path $d.FullName $n; if (Test-Path -LiteralPath $p) { Add "LocalAppData $($d.Name)/$n" $p } } }
foreach ($d in Get-ChildItem -LiteralPath $R -Directory -Force) { foreach ($n in 'Cache','GPUCache','Code Cache','CachedData','CachedExtensionVSIXs','Service Worker\CacheStorage','logs') { $p=Join-Path $d.FullName $n; if (Test-Path -LiteralPath $p) { Add "RoamingAppData $($d.Name)/$n" $p } } }
$dl = "$U\Downloads"; if (Test-Path $dl) { $inst = @(Get-ChildItem -LiteralPath $dl -File -Force | Where-Object { $_.Extension -match '^\.(exe|msi|msix|msixbundle|appx|zip|7z|iso|apk|dmg)$' }); $res += ('## Downloads installers/archives: {0} files, {1:N3} GB, older than 7d: {2}' -f $inst.Count, (($inst | Measure-Object Length -Sum).Sum/1GB), @($inst | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-7) }).Count)
  $res += ($inst | Group-Object Extension | Select-Object Name,Count,@{n='GB';e={[math]::Round((($_.Group|Measure-Object Length -Sum).Sum)/1GB,3)}} | Format-Table | Out-String) }
$res += '## locations'
$res += ($rows | Where-Object { $_.GB -ne '-' } | Sort-Object { if ($_.GB -is [double]) { -$_.GB } else { 0 } } | Format-Table -AutoSize | Out-String -Width 260)
$res | Out-File -FilePath $Out -Encoding utf8
