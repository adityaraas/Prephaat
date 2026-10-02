$ErrorActionPreference = 'Stop'
$catalog = Get-Content -LiteralPath 'public/data/resource-library.json' -Raw -Encoding UTF8 | ConvertFrom-Json
$ids = @('ncert-fecu1', 'ncert-gecu1', 'ncert-hecu1', 'ncert-iesc1', 'ncert-jesc1', 'ncert-keps2', 'ncert-kegy2', 'ncert-lebo1', 'vajiram-recitals-august-2026', 'vajiram-recitals-january-2026', 'survey-environment-2025-26')
$results = foreach ($id in $ids) {
  $resource = $catalog.resources | Where-Object { $_.id -eq $id }
  if (-not $resource) { throw "Missing resource: $id" }
  $url = if ($resource.pdfUrl) { $resource.pdfUrl } else { $resource.chapters[0].url }
  try {
    $response = Invoke-WebRequest -Uri $url -Method Head -UseBasicParsing -TimeoutSec 15
    $type = [string]$response.Headers['Content-Type']
    [pscustomobject]@{id=$id; url=$url; status=[int]$response.StatusCode; contentType=$type; ok=($type -match 'pdf|octet-stream'); checkedAt=(Get-Date).ToUniversalTime().ToString('o')}
  } catch {
    [pscustomobject]@{id=$id; url=$url; status=0; contentType=''; ok=$false; error=$_.Exception.Message; checkedAt=(Get-Date).ToUniversalTime().ToString('o')}
  }
}
$results | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath 'tmp/resources/link-check.json' -Encoding UTF8
$results | Select-Object id,status,contentType,ok | Format-Table -AutoSize
if ($results | Where-Object { -not $_.ok }) { exit 1 }
