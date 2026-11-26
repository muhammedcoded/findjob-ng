-- Findjob.ng v2.6.7: subscription-controlled employer access
-- Run once in Supabase SQL Editor. Existing employer records and payments are preserved.
alter table public.employers drop constraint if exists employers_status_check;
alter table public.employers alter column status set default 'active';
alter table public.employers add constraint employers_status_check check(status in ('pending','active','suspended'));
-- Existing pending accounts are no longer held for manual approval. Supabase email confirmation
-- remains the authentication gate; payment entitlement controls employer hiring features.
update public.employers set status='active' where status='pending';


-- Persist the plan selected during registration on the employer profile.
alter table public.employers add column if not exists selected_plan text not null default 'wallet';
alter table public.employers drop constraint if exists employers_selected_plan_check;
alter table public.employers add constraint employers_selected_plan_check check (selected_plan in ('wallet','unlimited_monthly','unlimited_yearly'));
update public.employers e
set selected_plan = case
  when (u.raw_user_meta_data->>'selected_plan') in ('wallet','unlimited_monthly','unlimited_yearly')
    then u.raw_user_meta_data->>'selected_plan'
  else coalesce(e.selected_plan,'wallet')
end
from auth.users u
where u.id = e.id;
