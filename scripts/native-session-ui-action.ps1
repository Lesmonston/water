param([Parameter(Mandatory=$true)][int]$TestProcessId,[Parameter(Mandatory=$true)][ValidateSet('cancel','select')][string]$Action)
$ErrorActionPreference = 'Stop'
& (Join-Path $PSScriptRoot 'picker-ui-action.ps1') -TestProcessId $TestProcessId -Action $Action
