create extension if not exists pgcrypto;

create type public.app_role as enum ('professor', 'student');
create type public.note_item_type as enum ('info', 'task');

create or replace function public.set_current_timestamp_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.app_role not null default 'student',
  display_name text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  professor_profile_id uuid not null references public.profiles (id) on delete cascade,
  student_profile_id uuid unique references public.profiles (id) on delete set null,
  full_name text not null,
  email text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint students_email_present_if_linked check (
    student_profile_id is null or email is not null
  ),
  constraint students_professor_differs_from_student check (
    student_profile_id is null or professor_profile_id <> student_profile_id
  )
);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  meeting_date date not null,
  created_by uuid not null references public.profiles (id) on delete restrict,
  updated_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.note_items (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.notes (id) on delete cascade,
  position integer not null,
  item_type public.note_item_type not null,
  content text not null,
  completed_at timestamptz,
  completed_by uuid references public.profiles (id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint note_items_position_positive check (position > 0),
  constraint note_items_unique_position_per_note unique (note_id, position),
  constraint note_items_task_completion_consistent check (
    (completed_at is null and completed_by is null)
    or (
      item_type = 'task'
      and completed_at is not null
      and completed_by is not null
    )
  )
);

create index students_professor_profile_id_idx on public.students (professor_profile_id);
create index students_student_profile_id_idx on public.students (student_profile_id) where student_profile_id is not null;
create index notes_student_id_meeting_date_idx on public.notes (student_id, meeting_date desc, created_at desc);
create index note_items_note_id_position_idx on public.note_items (note_id, position);

create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_current_timestamp_updated_at();

create trigger set_students_updated_at
before update on public.students
for each row
execute function public.set_current_timestamp_updated_at();

create trigger set_notes_updated_at
before update on public.notes
for each row
execute function public.set_current_timestamp_updated_at();

create trigger set_note_items_updated_at
before update on public.note_items
for each row
execute function public.set_current_timestamp_updated_at();

create or replace function public.handle_new_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created_create_profile
after insert on auth.users
for each row
execute function public.handle_new_auth_user_profile();

insert into public.profiles (id)
select users.id
from auth.users as users
on conflict (id) do nothing;
