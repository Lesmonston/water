# ASCII-only shared runtime/test policy. No UI, IO, or environment changes.
function Get-WaterDesktopRequiredText {
    @(
        'Water'
        (-join ([char[]]@(0x684c,0x9762,0x58f3,0x5df2,0x542f,0x52a8)))
        (-join ([char[]]@(0x5c1a,0x672a,0x63a5,0x5165,0x626b,0x63cf)))
        (-join ([char[]]@(0x53ea,0x8bfb,0x5f00,0x53d1,0x9884,0x89c8)))
    )
}
function Test-WaterDesktopPageText {
    param([string[]]$Names)
    $joined = $Names -join "`n"
    foreach ($required in @(Get-WaterDesktopRequiredText)) {
        if (!$joined.Contains($required)) { return $false }
    }
    return $true
}
