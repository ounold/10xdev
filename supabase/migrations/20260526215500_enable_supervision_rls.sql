create or replace function public.is_current_profile_role(expected_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = expected_role
  );
$$;

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
        or student_profile_id = auth.uid()
      )
  );
$$;

create or replace function public.can_access_note(target_note_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.notes
    where id = target_note_id
      and public.can_access_student(student_id)
  );
$$;

create or replace function public.can_access_note_item(target_note_item_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.note_items
    where id = target_note_item_id
      and public.can_access_note(note_id)
  );
$$;

alter table public.profiles enable row level security;
alter table public.students enable row level security;
alter table public.notes enable row level security;
alter table public.note_items enable row level security;

create policy "profiles_select_self"
on public.profiles
for select
to authenticated
using (id = auth.uid());

create policy "profiles_update_self"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "students_select_accessible"
on public.students
for select
to authenticated
using (public.can_access_student(id));

create policy "students_insert_professor_owned"
on public.students
for insert
to authenticated
with check (
  professor_profile_id = auth.uid()
  and public.is_current_profile_role('professor')
);

create policy "students_update_professor_owned"
on public.students
for update
to authenticated
using (
  professor_profile_id = auth.uid()
  and public.is_current_profile_role('professor')
)
with check (
  professor_profile_id = auth.uid()
  and public.is_current_profile_role('professor')
);

create policy "students_delete_professor_owned"
on public.students
for delete
to authenticated
using (
  professor_profile_id = auth.uid()
  and public.is_current_profile_role('professor')
);

create policy "notes_select_accessible"
on public.notes
for select
to authenticated
using (public.can_access_note(id));

create policy "notes_insert_professor_owned"
on public.notes
for insert
to authenticated
with check (
  created_by = auth.uid()
  and updated_by = auth.uid()
  and exists (
    select 1
    from public.students
    where id = student_id
      and professor_profile_id = auth.uid()
      and public.is_current_profile_role('professor')
  )
);

create policy "notes_update_accessible"
on public.notes
for update
to authenticated
using (public.can_access_note(id))
with check (
  public.can_access_note(id)
  and updated_by = auth.uid()
);

create policy "notes_delete_professor_owned"
on public.notes
for delete
to authenticated
using (
  exists (
    select 1
    from public.students
    where id = student_id
      and professor_profile_id = auth.uid()
      and public.is_current_profile_role('professor')
  )
);

create policy "note_items_select_accessible"
on public.note_items
for select
to authenticated
using (public.can_access_note_item(id));

create policy "note_items_insert_accessible"
on public.note_items
for insert
to authenticated
with check (
  public.can_access_note(note_id)
  and (
    completed_by is null
    or completed_by = auth.uid()
  )
);

create policy "note_items_update_accessible"
on public.note_items
for update
to authenticated
using (public.can_access_note_item(id))
with check (
  public.can_access_note(note_id)
  and (
    completed_by is null
    or completed_by = auth.uid()
  )
);

create policy "note_items_delete_accessible"
on public.note_items
for delete
to authenticated
using (public.can_access_note_item(id));
