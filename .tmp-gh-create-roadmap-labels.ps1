$repo = "ounold/10xdev"

$labels = @(
  @{ name = "type:foundation"; color = "1D76DB"; description = "Foundational enabling work" },
  @{ name = "type:slice"; color = "0E8A16"; description = "User-visible product slice" },
  @{ name = "status:ready"; color = "0E8A16"; description = "Ready to plan or implement" },
  @{ name = "status:proposed"; color = "FBCA04"; description = "Sequenced but not yet ready" },
  @{ name = "status:blocked"; color = "B60205"; description = "Blocked by an unresolved dependency or question" },
  @{ name = "stream:core-professor-flow"; color = "5319E7"; description = "Core professor workflow stream" },
  @{ name = "stream:student-visibility"; color = "0052CC"; description = "Student visibility stream" },
  @{ name = "stream:shared-follow-up"; color = "C2E0C6"; description = "Shared collaboration and follow-up stream" },
  @{ name = "north-star"; color = "D93F0B"; description = "The roadmap north-star slice" },
  @{ name = "blocker"; color = "B60205"; description = "Primary blocker or prerequisite" }
)

foreach ($label in $labels) {
  & "C:\Program Files\GitHub CLI\gh.exe" label create $label.name --repo $repo --color $label.color --description $label.description 2>$null
  if ($LASTEXITCODE -ne 0) {
    & "C:\Program Files\GitHub CLI\gh.exe" label edit $label.name --repo $repo --color $label.color --description $label.description | Out-Null
  }
}
