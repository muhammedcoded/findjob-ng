-- Findjob.ng v2.3: in-content and sidebar advertising, automatic rotation, and first-party metrics.
-- Run once in Supabase SQL Editor after schema.sql, upgrade-v2.sql and upgrade-v2.2-free-remote.sql.

alter table public.ads add column if not exists adsense_code text;
insert into public.ads(slot,label,mode,enabled) values
 ('post-top','Article / job description top','placeholder',false),
 ('post-middle','Article / job description middle','placeholder',false),
 ('post-bottom','Article / job description bottom','placeholder',false),
 ('center-banner','Wide centered banner','placeholder',false)
on conflict(slot) do nothing;

insert into public.site_settings(key,value) values
 ('ad_rotation_seconds','15'),
 ('ai_writer_label','CV AI Writer')
on conflict(key) do nothing;

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
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
 select jsonb_build_object(
  'views',count(*) filter(where event_type='page_view'),
  'apply_clicks',count(*) filter(where event_type='apply_click'),
  'today_views',(select count(*) from public.page_events where event_type='page_view' and created_at>=p_today_start),
  'today_apply_clicks',(select count(*) from public.page_events where event_type='apply_click' and created_at>=p_today_start),
  'daily',coalesce((
   select jsonb_agg(jsonb_build_object('day',day,'views',views,'apply_clicks',apply_clicks) order by day)
   from (
    select (created_at at time zone 'Africa/Lagos')::date::text as day,
     count(*) filter(where event_type='page_view') as views,
     count(*) filter(where event_type='apply_click') as apply_clicks
    from public.page_events where created_at>=p_start and created_at<p_end
    group by (created_at at time zone 'Africa/Lagos')::date
   ) daily_rows
  ),'[]'::jsonb),
  'top_jobs',coalesce((
   select jsonb_agg(jsonb_build_object('title',title,'slug',slug,'apply_clicks',apply_clicks) order by apply_clicks desc)
   from (
    select j.title,j.slug,count(*) as apply_clicks
    from public.page_events e join public.jobs j on j.id=e.job_id
    where e.event_type='apply_click' and e.created_at>=p_start and e.created_at<p_end
    group by j.id,j.title,j.slug order by count(*) desc limit 10
   ) job_rows
  ),'[]'::jsonb),
  'top_pages',coalesce((
   select jsonb_agg(jsonb_build_object('path',path,'views',views) order by views desc)
   from (
    select path,count(*) as views from public.page_events
    where event_type='page_view' and created_at>=p_start and created_at<p_end
    group by path order by count(*) desc limit 10
   ) page_rows
  ),'[]'::jsonb)
 )
 from public.page_events
 where created_at>=p_start and created_at<p_end;
$$;
revoke all on function public.findjob_metrics(timestamptz,timestamptz,timestamptz) from public,anon,authenticated;
grant execute on function public.findjob_metrics(timestamptz,timestamptz,timestamptz) to service_role;

-- Replace the original placeholder privacy page with a policy that describes the new first-party metrics.
update public.content
set title='Privacy Policy',
 body='<h2>Information we collect</h2><p>Findjob.ng records basic website activity, including page views and clicks on job application buttons. These records help us understand which pages and vacancies are useful. Our first-party activity records include the page address, page title, job reference when an application button is clicked, and the time of the event. They are not designed to identify individual visitors.</p><h2>Job applications</h2><p>Findjob.ng does not receive job applications or CVs through the job listings. When you select an application link, you are sent to the employer website or an email application service. The employer or service provider controls the information you submit there.</p><h2>Advertising and cookies</h2><p>Findjob.ng may display third-party advertising, including Google AdSense, if enabled by the site administrator. Third-party advertising providers may use cookies or similar technologies under their own privacy policies. You can manage cookie and advertising preferences through the relevant provider and your browser settings.</p><h2>External websites</h2><p>Job listings and social sharing links may take you to websites that Findjob.ng does not operate. Review their privacy notices before sharing personal information.</p><h2>Data retention and contact</h2><p>Website activity records are retained in the site database for operational reporting. For privacy questions, contact job-submission@findjob.ng.</p><p>This policy should be reviewed and updated if the site begins collecting additional personal information or enables additional analytics and advertising services.</p>',
 summary='How Findjob.ng handles basic website metrics, advertising and external job application links.',
 status='published',seo_title='Privacy Policy | Findjob.ng',seo_description='Learn how Findjob.ng records website activity, handles advertising and links to external job application services.',updated_at=now(),published_at=coalesce(published_at,now())
where kind='page' and slug='privacy' and (author_email='system' or body ilike 'Draft privacy policy%');


update public.content
set title='Terms of Use',
 body='<h2>Using Findjob.ng</h2><p>Findjob.ng is a job discovery platform. You may browse vacancies and follow application links for your personal job search. Do not misuse the website, interfere with its operation, attempt unauthorized access, or submit unlawful content.</p><h2>Job listings and applications</h2><p>Vacancies are provided by employers and approved public job sources. Listings may change, close or expire without notice. Findjob.ng does not guarantee that a vacancy is still open, that an applicant will be contacted, or that an applicant will receive an offer. Check the employer details and application requirements before applying.</p><p>Applications are submitted to employers or third-party services. Those services control their own application processes and terms. Findjob.ng does not collect or decide applications submitted through external destinations.</p><h2>Safety</h2><p>Never pay anyone to get a job or pay to get into a job. Be careful with requests for money, banking details or sensitive personal information. Confirm that an opportunity and its application destination are genuine.</p><h2>Website availability</h2><p>We may update, correct or remove listings and website content. The website is provided for general information and job discovery. We do not promise uninterrupted availability or error-free information.</p><h2>Contact</h2><p>For questions about these terms, contact job-submission@findjob.ng.</p><p>This general site-use notice is not legal advice and should be reviewed by a qualified legal professional before final production use.</p>',
 summary='Basic terms for using Findjob.ng and following external job application links.',
 status='published',seo_title='Terms of Use | Findjob.ng',seo_description='Read the terms for using Findjob.ng, browsing job listings and following external employer application links.',updated_at=now(),published_at=coalesce(published_at,now())
where kind='page' and slug='terms' and (author_email='system' or body ilike 'Draft terms%');

update public.site_settings
set value='Findjob.ng helps job seekers discover opportunities across Nigeria and worldwide remote roles. We connect candidates with employer application destinations. Job seekers do not pay Findjob.ng to apply.'
where key='footer_text' and (value='' or value like 'Findjob.ng is an independent job discovery platform by Remscorp%');

update public.site_settings
set value=(value::jsonb || '[{"label":"Job Safety","url":"/disclaimer"}]'::jsonb)::text
where key='footer_links' and value not like '%/disclaimer%';
