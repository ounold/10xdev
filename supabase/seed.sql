-- Minimal development seed for the supervision-domain foundation.
-- This seed assumes local Supabase auth users already exist and links the first
-- professor/student pair it can find. It is intentionally small and only meant
-- to validate schema shape plus RLS relationships during development.

do $$
declare
  professor_user_id uuid;
  student_user_id uuid;
  professor_student_id uuid;
  seeded_note_id uuid;
begin
  select id
  into professor_user_id
  from auth.users
  order by created_at, id
  limit 1;

  if professor_user_id is null then
    raise notice 'Skipping supervision seed: no auth.users records exist yet.';
    return;
  end if;

  update public.profiles
  set role = 'professor'
  where id = professor_user_id;

  select id
  into student_user_id
  from auth.users
  where id <> professor_user_id
  order by created_at, id
  limit 1;

  if student_user_id is not null then
    update public.profiles
    set role = 'student'
    where id = student_user_id;
  end if;

  if student_user_id is not null then
    insert into public.students (professor_profile_id, student_profile_id, full_name, email)
    values (
      professor_user_id,
      student_user_id,
      'Seed Student',
      'seed-student@example.com'
    )
    on conflict (student_profile_id) do update
    set
      professor_profile_id = excluded.professor_profile_id,
      full_name = excluded.full_name,
      email = excluded.email,
      updated_at = timezone('utc', now())
    returning id into professor_student_id;
  else
    select id
    into professor_student_id
    from public.students
    where professor_profile_id = professor_user_id
      and student_profile_id is null
      and email = 'seed-student-unlinked@example.com'
    order by created_at, id
    limit 1;

    if professor_student_id is null then
      insert into public.students (professor_profile_id, student_profile_id, full_name, email)
      values (
        professor_user_id,
        null,
        'Seed Student (unlinked)',
        'seed-student-unlinked@example.com'
      )
      returning id into professor_student_id;
    end if;
  end if;

  select id
  into seeded_note_id
  from public.notes
  where student_id = professor_student_id
    and meeting_date = current_date
  order by created_at desc, id desc
  limit 1;

  if seeded_note_id is null then
    insert into public.notes (student_id, meeting_date, created_by, updated_by)
    values (
      professor_student_id,
      current_date,
      professor_user_id,
      professor_user_id
    )
    returning id into seeded_note_id;
  end if;

  insert into public.note_items (note_id, position, item_type, content, completed_at, completed_by)
  values
    (seeded_note_id, 1, 'info', 'Discuss the current thesis milestone and blockers.', null, null),
    (
      seeded_note_id,
      2,
      'task',
      'Prepare the next experiment summary before the next meeting.',
      null,
      null
    )
  on conflict (note_id, position) do update
  set
    item_type = excluded.item_type,
    content = excluded.content,
    completed_at = excluded.completed_at,
    completed_by = excluded.completed_by,
    updated_at = timezone('utc', now());
end
$$;
