$repo = "ounold/10xdev"

$milestones = @(
  "M1 Foundation",
  "M2 Professor Core Flow",
  "M3 Student Access",
  "M4 Shared Collaboration"
)

foreach ($title in $milestones) {
  & "C:\Program Files\GitHub CLI\gh.exe" api "repos/$repo/milestones" --method POST -f title="$title" 2>$null | Out-Null
}
