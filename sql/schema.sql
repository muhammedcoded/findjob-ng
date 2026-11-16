-- Run once in Supabase SQL Editor. Only server-side service_role can write.
create extension if not exists pgcrypto;
create table if not exists public.staff (
 id uuid primary key default gen_random_uuid(), user_id uuid not null unique references auth.users(id) on delete cascade,
 email text not null, role text not null check(role in ('admin','editor')), active boolean not null default true,
 created_at timestamptz not null default now()
);
create table if not exists public.jobs (
 id uuid primary key default gen_random_uuid(), slug text not null unique default gen_random_uuid()::text,
 title text not null, company text not null default 'Employer not specified', location text not null default 'Nigeria',
 category text not null default 'Other Jobs', excerpt text not null default '', description text not null default '',
 apply_url text not null, source_url text not null, source_key text not null default 'manual', external_id text,
 fingerprint text unique, eligibility text not null default 'unknown', remote boolean not null default false,
 status text not null default 'pending' check(status in ('pending','published','draft','rejected','expired')),
 verified boolean not null default false, verification_note text, posted_at timestamptz,
 published_at timestamptz, expires_at timestamptz, created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index if not exists jobs_feed_idx on public.jobs(status,published_at desc);
create index if not exists jobs_category_idx on public.jobs(category,status);
create index if not exists jobs_source_idx on public.jobs(source_key,external_id);
create table if not exists public.sources (
 source_key text primary key, title text not null, enabled boolean not null default false,
 auto_publish boolean not null default false, last_checked_at timestamptz,
 last_error text, last_imported integer not null default 0
);
insert into public.sources(source_key,title,enabled,auto_publish) values
 ('myjobmag','MyJobMag Nigeria RSS',true,false),('jobicy','Jobicy global remote API',true,false)
on conflict(source_key) do nothing;
create table if not exists public.ads (
 id uuid primary key default gen_random_uuid(), slot text not null unique,
 label text not null default 'Advertisement', mode text not null default 'placeholder' check(mode in ('placeholder','banner','adsense')),
 image_url text, click_url text, adsense_slot text, enabled boolean not null default true,
 updated_at timestamptz not null default now()
);
insert into public.ads(slot,label) values
 ('left-1','Left sidebar 1'),('left-2','Left sidebar 2'),('left-3','Left sidebar 3'),('left-4','Left sidebar 4'),
 ('right-1','Right sidebar 1'),('right-2','Right sidebar 2'),('right-3','Right sidebar 3'),('right-4','Right sidebar 4')
on conflict(slot) do nothing;
create table if not exists public.site_settings (
 key text primary key, value text not null default ''
);
insert into public.site_settings(key,value) values
 ('ai_writer_url',''),('adsense_client',''),('site_title','Findjob.ng'),('auto_sync','true')
on conflict(key) do nothing;
create table if not exists public.sync_runs (
 id uuid primary key default gen_random_uuid(),triggered_by text not null,result jsonb not null,created_at timestamptz not null default now()
);
-- Deny all browser-side data access. Node server uses service_role and enforces permissions.
alter table public.staff enable row level security;
alter table public.jobs enable row level security;
alter table public.sources enable row level security;
alter table public.ads enable row level security;
alter table public.site_settings enable row level security;
alter table public.sync_runs enable row level security;
revoke all on public.staff,public.jobs,public.sources,public.ads,public.site_settings,public.sync_runs from anon,authenticated;
-- Create the first admin in Supabase Auth > Users, then insert its real UUID:
-- insert into public.staff(user_id,email,role) values ('AUTH_USER_UUID','you@example.com','admin');

-- Public image banners only. Uploads use the backend service_role, never browser keys.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('findjob-ads','findjob-ads',true,2000000,array['image/png','image/jpeg','image/webp','image/gif'])
on conflict(id) do nothing;
