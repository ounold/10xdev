---
starter_id: 10x-astro-starter
package_manager: npm
project_name: post-meeting-notes
hints:
  language_family: js
  team_size: solo
  deployment_target: cloudflare-pages
  ci_provider: github-actions
  ci_default_flow: auto-deploy-on-merge
  bootstrapper_confidence: first-class
  path_taken: standard
  quality_override: false
  self_check_answers: null
  has_auth: true
  has_payments: false
  has_realtime: false
  has_ai: false
  has_background_jobs: false
---

## Why this stack

Post-meeting notes is a small web app with a three-week, after-hours MVP and a clear need for authentication from day one. The recommended Astro starter fits that profile well because it is TypeScript-first, convention-driven, and already includes the core building blocks for a solo project: UI structure, auth, database support, and a straightforward deployment path. Cloudflare Pages keeps the default deploy path simple, while GitHub Actions with auto-deploy matches the goal of moving quickly without extra release ceremony. This gives the project a pragmatic full-stack base with low setup friction and enough structure to keep implementation focused on the product workflow rather than infrastructure assembly.
