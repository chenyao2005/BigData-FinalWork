# 将散落目录收拢到 apps/ 下（仅在本仓库根目录执行一次）
$ErrorActionPreference = "Stop"
$base = $PSScriptRoot
if ([string]::IsNullOrWhiteSpace($base)) {
  $base = [System.IO.Path]::GetDirectoryName($MyInvocation.MyCommand.Path)
}

New-Item -ItemType Directory -Path (Join-Path $base "apps") -Force | Out-Null

$moves = @(
  @{ From = "nyc-viz-summary\apps\viz-population-yearly-change"; To = "apps\01-population-yearly" },
  @{ From = "nyc-viz-summary\apps\viz-population-zip-rings"; To = "apps\02-population-rings" },
  @{ From = "nyc-viz-summary\apps\viz-education-level"; To = "apps\03-education-level" },
  @{ From = "nyc-viz-summary\apps\viz-safety-borough-linebox"; To = "apps\04-safety-linebox" },
  @{ From = "nyc-pulse"; To = "apps\05-economy" },
  @{ From = "Visualization-Work3"; To = "apps\06-transport" },
  @{ From = "nyc-urban-environment"; To = "apps\07-environment" }
)

foreach ($m in $moves) {
  $src = Join-Path $base $m.From
  $dst = Join-Path $base $m.To
  if (-not (Test-Path $src)) {
    throw "Missing source: $src"
  }
  if (Test-Path $dst) {
    throw "Destination already exists: $dst"
  }
  $parent = Split-Path $dst -Parent
  if (-not (Test-Path $parent)) {
    New-Item -ItemType Directory -Path $parent -Force | Out-Null
  }
  Move-Item -Path $src -Destination $dst
}

# 删除已无内容的汇总目录
if (-not [string]::IsNullOrWhiteSpace($base)) {
  $leftover = Join-Path $base "nyc-viz-summary"
  if ($leftover -and (Test-Path -LiteralPath $leftover)) {
    Remove-Item -LiteralPath $leftover -Recurse -Force
  }
}

Write-Host "Done. Apps live under $(Join-Path $base 'apps')"
