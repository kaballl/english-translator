-- LingoLeaf – Supabase schema (run in SQL Editor)

-- ── Profiles ────────────────────────────────────────────────────

create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text not null,
  full_name  text not null default '',
  role       text not null check (role in ('teacher', 'student')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- ── Exercises ───────────────────────────────────────────────────

create table public.exercises (
  id          uuid primary key default gen_random_uuid(),
  teacher_id  uuid not null references public.profiles (id) on delete cascade,
  title       text not null default 'Untitled exercise',
  prompt      text not null,
  answer_key  text not null,
  created_at  timestamptz not null default now()
);

create index exercises_teacher_id_idx on public.exercises (teacher_id);

alter table public.exercises enable row level security;

create policy "Teachers manage own exercises"
  on public.exercises for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'teacher'
    )
    and teacher_id = auth.uid()
  )
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'teacher'
    )
    and teacher_id = auth.uid()
  );

-- ── Submissions ─────────────────────────────────────────────────

create table public.submissions (
  id             uuid primary key default gen_random_uuid(),
  exercise_id    uuid not null references public.exercises (id) on delete cascade,
  student_id     uuid not null references public.profiles (id) on delete cascade,
  answer         text not null,
  score          int not null check (score between 0 and 100),
  missing_words  jsonb not null default '[]',
  extra_words    jsonb not null default '[]',
  submitted_at   timestamptz not null default now(),
  unique (exercise_id, student_id)
);

create index submissions_exercise_id_idx on public.submissions (exercise_id);
create index submissions_student_id_idx on public.submissions (student_id);

alter table public.submissions enable row level security;

create policy "Students read own submissions"
  on public.submissions for select
  using (student_id = auth.uid());

create policy "Teachers read submissions for own exercises"
  on public.submissions for select
  using (
    exists (
      select 1 from public.exercises e
      where e.id = exercise_id and e.teacher_id = auth.uid()
    )
  );

-- ── Auto-create profile on signup ───────────────────────────────

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    'student'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── RPC: student fetches prompt only (no answer_key) ────────────

create or replace function public.get_exercise_prompt(exercise_uuid uuid)
returns table (id uuid, title text, prompt text)
language sql
security definer
set search_path = public
as $$
  select e.id, e.title, e.prompt
  from public.exercises e
  where e.id = exercise_uuid;
$$;

grant execute on function public.get_exercise_prompt(uuid) to authenticated;

-- ── RPC: teacher views submissions with student names ───────────

create or replace function public.get_exercise_submissions(exercise_uuid uuid)
returns table (
  id uuid,
  student_name text,
  student_email text,
  answer text,
  score int,
  missing_words jsonb,
  extra_words jsonb,
  submitted_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    s.id,
    p.full_name,
    p.email,
    s.answer,
    s.score,
    s.missing_words,
    s.extra_words,
    s.submitted_at
  from public.submissions s
  join public.profiles p on p.id = s.student_id
  join public.exercises e on e.id = s.exercise_id
  where s.exercise_id = exercise_uuid
    and e.teacher_id = auth.uid()
  order by s.submitted_at desc;
$$;

grant execute on function public.get_exercise_submissions(uuid) to authenticated;

-- ── RPC: student views own submission history (no answer_key) ───

create or replace function public.get_student_submissions()
returns table (
  id uuid,
  exercise_id uuid,
  title text,
  score int,
  submitted_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select s.id, s.exercise_id, e.title, s.score, s.submitted_at
  from public.submissions s
  join public.exercises e on e.id = s.exercise_id
  where s.student_id = auth.uid()
  order by s.submitted_at desc;
$$;

grant execute on function public.get_student_submissions() to authenticated;
