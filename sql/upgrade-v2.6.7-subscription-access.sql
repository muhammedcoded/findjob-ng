-- Findjob.ng v2.6.7: subscription-controlled employer access
-- Run once in Supabase SQL Editor. Existing employer records and payments are preserved.
alter table public.employers drop constraint if exists employers_status_check;
alter table public.employers alter column status set default 'active';
alter table public.employers add constraint employers_status_check check(status in ('pending','active','suspended'));
-- Existing pending accounts are no longer held for manual approval. Supabase email confirmation
-- remains the authentication gate; payment entitlement controls employer hiring features.
update public.employers set status='active' where status='pending';
