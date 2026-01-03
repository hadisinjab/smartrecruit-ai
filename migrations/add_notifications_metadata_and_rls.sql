-- ========================================
-- Migration: Notifications metadata + SaaS-grade RLS
-- ========================================

-- Step 1: extend table
alter table public.notifications
  add column if not exists metadata jsonb;

-- Step 2: indexes for scalability
create index if not exists notifications_user_id_idx on public.notifications (user_id);
create index if not exists notifications_is_read_idx on public.notifications (is_read);
create index if not exists notifications_type_idx on public.notifications (type);
create index if not exists notifications_created_at_idx on public.notifications (created_at desc);

-- Step 3: enable RLS
alter table public.notifications enable row level security;

-- Step 4: replace policies
drop policy if exists "Users can view own notifications." on public.notifications;
drop policy if exists "Users can update own notifications." on public.notifications;

-- SELECT policy
create policy "Staff can read allowed notifications"
on public.notifications
for select
using (
  exists (
    select 1
    from public.users me
    where me.id = auth.uid()
      and (
        -- Super Admin can read all notifications
        me.role = 'super-admin'

        -- Admin: can read notifications for users in the same org (or only their own if org-less)
        or (
          me.role = 'admin'
          and (
            (me.organization_id is null and notifications.user_id = me.id)
            or (
              me.organization_id is not null
              and exists (
                select 1
                from public.users receiver
                where receiver.id = notifications.user_id
                  and receiver.organization_id = me.organization_id
              )
            )
          )
        )

        -- Reviewer: can read ONLY their own notifications, and only allowed types
        or (
          me.role = 'reviewer'
          and notifications.user_id = me.id
          and notifications.type in (
            'new_application',
            'application_completed',
            'incomplete_application',
            'duplicate_application',
            'ai_evaluation_ready',
            'interview_scheduled',
            'interview_uploaded',
            'interview_analysis_ready',
            'assignment_submitted',
            'status_changed',
            'reminder'
          )
        )
      )
  )
);

-- INSERT policy (optional; service role bypasses RLS anyway)
drop policy if exists "Staff can insert notifications" on public.notifications;
create policy "Staff can insert notifications"
on public.notifications
for insert
with check (
  exists (
    select 1
    from public.users me
    where me.id = auth.uid()
      and (
        me.role = 'super-admin'
        or me.role = 'admin'
        or (me.role = 'reviewer' and notifications.user_id = me.id)
      )
  )
);

-- UPDATE policy: only the receiver can mark as read/unread
drop policy if exists "Users can update is_read on own notifications" on public.notifications;
create policy "Users can update is_read on own notifications"
on public.notifications
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Step 5: prevent title/content mutation after creation (column-level privileges)
-- By default, Supabase grants UPDATE on all columns to "authenticated".
-- We revoke and re-grant UPDATE only for is_read.
revoke update on table public.notifications from authenticated;
grant update (is_read) on table public.notifications to authenticated;

-- ========================================
-- Migration Complete!
-- ========================================







