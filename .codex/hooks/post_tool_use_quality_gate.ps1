$ErrorActionPreference = "Stop"

$repoRoot = git rev-parse --show-toplevel
if (-not $repoRoot) {
  exit 0
}

$rawInput = [Console]::In.ReadToEnd()
if ([string]::IsNullOrWhiteSpace($rawInput)) {
  exit 0
}

try {
  $payload = $rawInput | ConvertFrom-Json
} catch {
  exit 0
}

if ($payload.tool_name -ne "apply_patch") {
  exit 0
}

$commandText = [string]$payload.tool_input.command
if ([string]::IsNullOrWhiteSpace($commandText)) {
  exit 0
}

$fileDirectivePattern = '(?m)^\*\*\* (?:Update|Add|Delete) File: (.+)$'
$relevantPaths = New-Object System.Collections.Generic.List[string]
$seenPaths = @{}
$repoRootNormalized = ([System.IO.Path]::GetFullPath($repoRoot)) -replace '\\', '/'

foreach ($match in [regex]::Matches($commandText, $fileDirectivePattern)) {
  $candidate = $match.Groups[1].Value.Trim()
  if (-not $candidate) {
    continue
  }

  $resolvedPath = $candidate
  if (-not [System.IO.Path]::IsPathRooted($resolvedPath)) {
    $resolvedPath = Join-Path $repoRoot $resolvedPath
  }

  try {
    $fullPath = [System.IO.Path]::GetFullPath($resolvedPath)
  } catch {
    continue
  }

  $normalizedFullPath = $fullPath -replace '\\', '/'
  if ($normalizedFullPath.StartsWith($repoRootNormalized + "/")) {
    $normalized = $normalizedFullPath.Substring($repoRootNormalized.Length + 1)
  } elseif ($normalizedFullPath -eq $repoRootNormalized) {
    $normalized = "."
  } else {
    continue
  }

  if ($normalized.StartsWith("../") -or $normalized -eq "..") {
    continue
  }

  if (-not $seenPaths.ContainsKey($normalized)) {
    $seenPaths[$normalized] = $true
    $relevantPaths.Add($normalized)
  }
}

if ($relevantPaths.Count -eq 0) {
  exit 0
}

$statePath = Join-Path $repoRoot ".tmp\posttooluse-last-run.json"
$stateDir = Split-Path -Parent $statePath
New-Item -ItemType Directory -Force -Path $stateDir | Out-Null

$state = [ordered]@{
  hookEventName = $payload.hook_event_name
  relevantPaths = @($relevantPaths)
  timestamp = [DateTime]::UtcNow.ToString("o")
  toolName = $payload.tool_name
}

$state | ConvertTo-Json -Depth 10 | Set-Content -Path $statePath -Encoding UTF8

$lintTargets = @(
  $relevantPaths | Where-Object {
    $_ -match '^(src|tests)/.*\.(ts|tsx|astro)$' -or
    $_ -match '^(astro\.config\.mjs|eslint\.config\.js|playwright\.config\.ts|vitest\.config\.ts)$'
  }
) | Select-Object -Unique

foreach ($target in $lintTargets) {
  & 'C:\Program Files\nodejs\npm.cmd' exec -- eslint $target
  if ($LASTEXITCODE -ne 0) {
    [Console]::Error.WriteLine("PostToolUse lint failed for $target")
    exit 2
  }
}

$integrationRelevant = $relevantPaths | Where-Object {
  $_ -eq 'src/lib/supervision.ts' -or
  $_ -eq 'src/lib/database.ts' -or
  $_ -eq 'vitest.config.ts' -or
  $_.StartsWith('tests/integration/')
}

if ($integrationRelevant.Count -gt 0) {
  & 'C:\Program Files\nodejs\npm.cmd' run test:integration
  if ($LASTEXITCODE -ne 0) {
    [Console]::Error.WriteLine("PostToolUse integration gate failed.")
    exit 2
  }
}
