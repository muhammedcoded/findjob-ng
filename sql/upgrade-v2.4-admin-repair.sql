-- Findjob.ng v2.4 admin, advertising, metrics and trash repair.
-- Run once in Supabase SQL Editor after the base schema and v2.2 upgrade.
-- This is idempotent and includes the v2.3 ad/metrics database pieces in case they were missed.

-- Job statuses now include a recoverable Trash state.
alter table public.jobs drop constraint if exists jobs_status_check;
alter table public.jobs add constraint jobs_status_check
  check (status in ('pending','published','draft','rejected','expired','trashed'));
create index if not exists jobs_status_updated_idx on public.jobs(status, updated_at desc);

-- All twelve ad placements and AdSense snippet storage.
alter table public.ads add column if not exists adsense_code text;
insert into public.ads(slot,label,mode,enabled) values
 ('left-1','Left sidebar 1','placeholder',false),
 ('left-2','Left sidebar 2','placeholder',false),
 ('left-3','Left sidebar 3','placeholder',false),
 ('left-4','Left sidebar 4','placeholder',false),
 ('right-1','Right sidebar 1','placeholder',false),
 ('right-2','Right sidebar 2','placeholder',false),
 ('right-3','Right sidebar 3','placeholder',false),
 ('right-4','Right sidebar 4','placeholder',false),
 ('post-top','Job description top','placeholder',false),
 ('post-middle','Job description middle','placeholder',false),
 ('post-bottom','Job description bottom','placeholder',false),
 ('center-banner','Wide centered banner','placeholder',false)
on conflict(slot) do nothing;

insert into public.site_settings(key,value) values
 ('ad_rotation_seconds','15'),('ai_writer_label','CV AI Writer'),('adsense_client','')
on conflict(key) do nothing;

-- Storage bucket used by banner, logo and page image uploads.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('findjob-ads','findjob-ads',true,2000000,array['image/png','image/jpeg','image/webp','image/gif'])
on conflict(id) do update set public=true,file_size_limit=2000000,
 allowed_mime_types=array['image/png','image/jpeg','image/webp','image/gif'];

-- First-party metrics tables and function.
create table if not exists public.page_events (
 id uuid primary key default gen_random_uuid(),
 event_type text not null check(event_type in ('page_view','apply_click')),
 path text not null default '/',
 page_title text not null default '',
 job_id uuid references public.jobs(id) on delete set null,
 created_at timestamptz not null default now()
);
create index if not exists page_events_date_idx on public.page_events(created_at desc,event_type);
create index if not exists page_events_job_idx on public.page_events(job_id,event_type,created_at desc);
alter table public.page_events enable row level security;
revoke all on public.page_events from anon,authenticated;

create or replace function public.findjob_metrics(p_start timestamptz,p_end timestamptz,p_today_start timestamptz)
returns jsonb language sql stable security invoker set search_path=public as $$
 select jsonb_build_object(
  'views',count(*) filter(where event_type='page_view'),
  'apply_clicks',count(*) filter(where event_type='apply_click'),
  'today_views',(select count(*) from public.page_events where event_type='page_view' and created_at>=p_today_start),
  'today_apply_clicks',(select count(*) from public.page_events where event_type='apply_click' and created_at>=p_today_start),
  'daily',coalesce((select jsonb_agg(jsonb_build_object('day',day,'views',views,'apply_clicks',apply_clicks) order by day) from (
   select (created_at at time zone 'Africa/Lagos')::date::text as day,
    count(*) filter(where event_type='page_view') as views,
    count(*) filter(where event_type='apply_click') as apply_clicks
   from public.page_events where created_at>=p_start and created_at<p_end
   group by (created_at at time zone 'Africa/Lagos')::date
  ) daily_rows),'[]'::jsonb),
  'top_jobs',coalesce((select jsonb_agg(jsonb_build_object('title',title,'slug',slug,'apply_clicks',apply_clicks) order by apply_clicks desc) from (
   select j.title,j.slug,count(*) as apply_clicks from public.page_events e join public.jobs j on j.id=e.job_id
   where e.event_type='apply_click' and e.created_at>=p_start and e.created_at<p_end
   group by j.id,j.title,j.slug order by count(*) desc limit 10
  ) job_rows),'[]'::jsonb),
  'top_pages',coalesce((select jsonb_agg(jsonb_build_object('path',path,'views',views) order by views desc) from (
   select path,count(*) as views from public.page_events where event_type='page_view' and created_at>=p_start and created_at<p_end
   group by path order by count(*) desc limit 10
  ) page_rows),'[]'::jsonb)
 ) from public.page_events where created_at>=p_start and created_at<p_end;
$$;
revoke all on function public.findjob_metrics(timestamptz,timestamptz,timestamptz) from public,anon,authenticated;
grant execute on function public.findjob_metrics(timestamptz,timestamptz,timestamptz) to service_role;
