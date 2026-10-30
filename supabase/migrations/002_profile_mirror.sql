-- =============================================================================
-- CV Tailor — Perfil monolingüe + espejo derivado (otro idioma)
-- Ejecutar en el SQL Editor del proyecto de Supabase
-- =============================================================================

alter table public.profiles
  add column if not exists mirror jsonb;
