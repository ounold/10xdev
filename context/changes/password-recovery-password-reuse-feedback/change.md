---
change_id: password-recovery-password-reuse-feedback
title: Password recovery password reuse feedback
status: complete
created: 2026-06-11
updated: 2026-06-12
---

## Notes

Close the gap discovered during manual hosted recovery smoke: when Supabase rejects a reset because the new password matches the old one, the app should surface clear product-specific guidance instead of a raw provider error.
