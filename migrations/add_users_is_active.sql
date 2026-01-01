-- ========================================
-- Migration: Add users.is_active (account enabled/disabled)
-- ========================================

alter table public.users
  add column if not exists is_active boolean not null default true;

-- Backfill safety (older rows shouldn't exist with NULL because of NOT NULL,
-- but keep this for environments where the column was added without NOT NULL).
update public.users
set is_active = true
where is_active is null;

-- ========================================
-- Migration Complete!
-- ========================================



