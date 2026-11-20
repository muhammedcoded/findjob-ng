-- Run AFTER schema.sql for a new installation, or run this migration for an existing v1 project.
create table if not exists public.content (
 id uuid primary key default gen_random_uuid(), kind text not null check(kind in ('page','post')),
 title text not null, slug text not null, body text not null default '', summary text not null default '',
 image_url text, seo_title text, seo_description text,
 status text not null default 'draft' check(status in ('draft','published')),
 author_email text not null default '', created_at timestamptz not null default now(),
 published_at timestamptz, updated_at timestamptz not null default now(),unique(kind,slug)
);
create index if not exists content_pub_idx on public.content(kind,status,published_at desc);
alter table public.content enable row level security;
revoke all on public.content from anon,authenticated;
insert into public.site_settings(key,value) values
 ('site_title','Findjob.ng'),('site_description','Latest jobs in Nigeria, updated regularly.'),
 ('logo_url',''),('favicon_url',''),('footer_text','Findjob.ng is an independent job discovery platform by Remscorp Innovative Technologies.'),
 ('footer_links','[{"label":"About Us","url":"/about"},{"label":"Contact","url":"/contact"},{"label":"Blog","url":"/blog"},{"label":"Privacy","url":"/privacy"},{"label":"Terms","url":"/terms"}]'),
 ('contact_email','job-submission@findjob.ng'),('google_site_verification',''),('ga_measurement_id',''),
 ('header_code',''),('footer_code',''),('sync_interval_minutes','180'),('auto_sync','true'),('robots_extra','')
on conflict(key) do nothing;
insert into public.content(kind,title,slug,body,summary,status,author_email,published_at)
values
('page','About Findjob.ng','about','Findjob.ng is a Nigerian job-discovery platform by Remscorp Innovative Technologies. We bring together job listings from approved sources and link visitors to the source application page.','About our platform','published','system',now()),
('page','Contact Us','contact','For vacancies or recruitment submissions, email job-submission@findjob.ng.','Contact Findjob.ng','published','system',now()),
('page','Job Safety & Disclaimer','disclaimer','We are an independent job discovery service. Always confirm employer details before sharing personal information. Do not pay anyone to guarantee a job.','Job search safety','published','system',now()),
('page','Privacy Policy','privacy','Draft privacy policy. Replace with a policy reflecting your advertising, analytics, cookies and data processing before publishing.','Privacy policy','draft','system',null),
('page','Terms of Use','terms','Draft terms. Review and replace before publication.','Terms of use','draft','system',null)
on conflict(kind,slug) do nothing;

-- Independent sidebar content blocks, separate from paid advertisements.
create table if not exists public.widgets (
 slot text primary key, title text not null default '', body text not null default '',
 link_label text not null default '', link_url text, enabled boolean not null default false,
 updated_at timestamptz not null default now()
);
insert into public.widgets(slot,title) values ('left-widget-1','Career Tips'),('left-widget-2','Useful Links'),('right-widget-1','Findjob.ng News'),('right-widget-2','Career Resources') on conflict(slot) do nothing;
alter table public.widgets enable row level security;
revoke all on public.widgets from anon,authenticated;
insert into public.site_settings(key,value) values ('header_links','[{"label":"Home","url":"/"},{"label":"Latest Jobs","url":"/"},{"label":"Blog","url":"/blog"},{"label":"About","url":"/about"},{"label":"Contact","url":"/contact"}]') on conflict(key) do nothing;
