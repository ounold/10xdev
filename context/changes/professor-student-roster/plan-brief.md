# Professor student roster - brief

- Extend the existing professor dashboard instead of creating a new roster surface.
- Add professor-owned student creation inline on the dashboard.
- Require `full_name`, keep `email` optional, and leave account linking out of scope.
- Preserve the current roster list and links into `/dashboard/students/[studentId]`.
- Verify the write path against hosted Supabase before closing the slice.
