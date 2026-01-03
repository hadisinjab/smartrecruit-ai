-- ========================================
-- Migration: Add hr_evaluations.next_action_date (date-only)
-- ========================================

alter table public.hr_evaluations
  add column if not exists next_action_date date;

-- ========================================
-- Migration Complete!
-- ========================================





