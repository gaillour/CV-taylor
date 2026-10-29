-- =============================================================================
-- CV Tailor — Slice 9B: Supabase Auth, Postgres & Immutable Storage
-- Ejecutar en el SQL Editor del proyecto de Supabase
-- =============================================================================

-- 1. Tabla de Perfil Maestro (1 por usuario)
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 2. Tabla de Snapshots Inmutables
create table if not exists public.snapshots (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  parent_id text references public.snapshots(id),
  company text,
  role text,
  lang text not null default 'es',
  theme text not null default 'classic',
  pdf_sha256 text not null,
  ats_score double precision,
  snapshot_data jsonb not null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_snapshots_user_created
  on public.snapshots (user_id, created_at desc);

alter table public.snapshots enable row level security;

drop policy if exists "snapshots_select_own" on public.snapshots;
create policy "snapshots_select_own"
  on public.snapshots for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "snapshots_insert_own" on public.snapshots;
create policy "snapshots_insert_own"
  on public.snapshots for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "snapshots_soft_delete_own" on public.snapshots;
create policy "snapshots_soft_delete_own"
  on public.snapshots for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 3. Trigger SQL Anti-Mutación para Snapshots
create or replace function public.enforce_snapshot_immutability()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Snapshots are immutable and cannot be physically deleted. Use soft delete (deleted_at).';
  end if;

  if tg_op = 'UPDATE' then
    if new.id is distinct from old.id
       or new.user_id is distinct from old.user_id
       or new.parent_id is distinct from old.parent_id
       or new.company is distinct from old.company
       or new.role is distinct from old.role
       or new.lang is distinct from old.lang
       or new.theme is distinct from old.theme
       or new.pdf_sha256 is distinct from old.pdf_sha256
       or new.ats_score is distinct from old.ats_score
       or new.snapshot_data is distinct from old.snapshot_data
       or new.created_at is distinct from old.created_at
    then
      raise exception 'Snapshots are immutable: only deleted_at can be updated.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_snapshot_immutability on public.snapshots;
create trigger trg_enforce_snapshot_immutability
  before update or delete on public.snapshots
  for each row
  execute function public.enforce_snapshot_immutability();

-- 4. Bucket de Storage Inmutable para JSON y PDF de Snapshots
insert into storage.buckets (id, name, public)
values ('cv-snapshots', 'cv-snapshots', false)
on conflict (id) do nothing;

drop policy if exists "cv_snapshots_select_own" on storage.objects;
create policy "cv_snapshots_select_own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'cv-snapshots'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "cv_snapshots_insert_own" on storage.objects;
create policy "cv_snapshots_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'cv-snapshots'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
