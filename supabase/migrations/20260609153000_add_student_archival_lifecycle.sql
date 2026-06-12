create type public.student_lifecycle as enum ('active', 'archived');

alter table public.students
add column lifecycle public.student_lifecycle not null default 'active',
add column archived_at timestamptz,
add column archived_student_profile_id uuid references public.profiles (id) on delete set null,
add constraint students_archived_timestamp_consistent check (
  (lifecycle = 'active' and archived_at is null)
  or (lifecycle = 'archived' and archived_at is not null)
),
add constraint students_archived_link_consistent check (
  lifecycle = 'active' or student_profile_id is null
),
add constraint students_archived_history_consistent check (
  lifecycle = 'active' or archived_student_profile_id is not null
),
add constraint students_archived_profile_differs_from_professor check (
  archived_student_profile_id is null or professor_profile_id <> archived_student_profile_id
);

create index students_professor_profile_id_lifecycle_idx
on public.students (professor_profile_id, lifecycle, full_name);

create or replace function public.can_access_student(target_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.students
    where id = target_student_id
      and (
        (
          professor_profile_id = auth.uid()
          and public.is_current_profile_role('professor')
        )
        or (
          lifecycle = 'active'
          and student_profile_id = auth.uid()
        )
      )
  );
$$;
