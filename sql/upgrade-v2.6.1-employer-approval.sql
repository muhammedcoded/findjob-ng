-- Findjob.ng v2.6.1 employer approval and user management prerequisites.
-- Run once in Supabase SQL Editor after v2.6.
alter table public.employers drop constraint if exists employers_status_check;
alter table public.employers alter column status set default 'pending';
alter table public.employers add constraint employers_status_check check(status in ('pending','active','suspended'));
update public.employers set status='pending' where status is null or status='';
insert into public.site_settings(key,value) values
 ('facebook_auto_post_enabled','false'),
 ('facebook_page_id',''),
 ('facebook_page_access_token',''),
 ('facebook_daily_jobs_per_hour','10')
on conflict(key) do nothing;
