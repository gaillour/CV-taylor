-- =============================================================================
-- CV Tailor — 004: Cuota de adaptaciones IA por cuenta
-- Ejecutar en el SQL Editor del proyecto de Supabase
-- =============================================================================

create table if not exists public.tailor_quotas (
  user_id uuid primary key references auth.users(id) on delete cascade,
  used_count integer not null default 0,
  has_active_pass boolean not null default false,
  pass_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tailor_quotas enable row level security;

drop policy if exists "tailor_quotas_select_own" on public.tailor_quotas;
create policy "tailor_quotas_select_own"
  on public.tailor_quotas for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "tailor_quotas_insert_own" on public.tailor_quotas;
create policy "tailor_quotas_insert_own"
  on public.tailor_quotas for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "tailor_quotas_update_own" on public.tailor_quotas;
create policy "tailor_quotas_update_own"
  on public.tailor_quotas for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
