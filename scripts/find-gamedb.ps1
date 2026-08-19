# Locate Forza gamedbRC.slt installs and check whether a file is already decrypted SQLite.
# Usage:
#   powershell -ExecutionPolicy Bypass -File scripts/find-gamedb.ps1
#   powershell -ExecutionPolicy Bypass -File scripts/find-gamedb.ps1 -Path "D:\Games\FH6\media\Stripped\gamedbRC.slt"

param(
  [string]$Path
)

function Test-SqliteHeader([string]$File) {
  if (-not (Test-Path -LiteralPath $File)) { return $false }
  $fs = [System.IO.File]::OpenRead($File)
  try {
    $buf = New-Object byte[] 16
    [void]$fs.Read($buf, 0, 16)
    $magic = [System.Text.Encoding]::ASCII.GetString($buf, 0, 15)
    return $magic -eq "SQLite format 3"
  } finally {
    $fs.Dispose()
  }
}

$candidates = @()
if ($Path) {
  $candidates += $Path
} else {
  $roots = @(
    "C:\XboxGames",
    "D:\XboxGames",
    "C:\Program Files\WindowsApps",
    "C:\Program Files (x86)\Steam\steamapps\common",
    "D:\SteamLibrary\steamapps\common",
    "E:\SteamLibrary\steamapps\common"
  )
  foreach ($root in $roots) {
    if (-not (Test-Path -LiteralPath $root)) { continue }
    Get-ChildItem -LiteralPath $root -Recurse -Filter "gamedbRC.slt" -ErrorAction SilentlyContinue |
      ForEach-Object { $candidates += $_.FullName }
  }
}

if (-not $candidates.Count) {
  Write-Host "No gamedbRC.slt found. Pass -Path to a known install."
  exit 1
}

foreach ($file in $candidates | Select-Object -Unique) {
  $decrypted = Test-SqliteHeader $file
  $sizeMb = [math]::Round((Get-Item -LiteralPath $file).Length / 1MB, 1)
  Write-Host ""
  Write-Host $file
  Write-Host ("  size: {0} MB" -f $sizeMb)
  if ($decrypted) {
    Write-Host "  status: DECRYPTED SQLite — ready for extract"
    Write-Host "  next: node scripts/extract-gamedb-slider-limits.cjs --db `"$file`" --merge"
  } else {
    Write-Host "  status: ENCRYPTED (or not SQLite) — decrypt first"
    Write-Host "  see: scripts/EXTRACT-GAMEDB.md"
  }
}
