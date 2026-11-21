-- Findjob.ng v2.6 employer application forms, private CV storage, and resume matching.
-- Run after upgrade-v2.5-employers-navigation-ads.sql. Safe to re-run.

alter table public.employers add column if not exists first_name text not null default '';
alter table public.employers add column if not exists middle_name text not null default '';
alter table public.employers add column if not exists last_name text not null default '';

alter table public.jobs add column if not exists application_method text not null default 'external';
alter table public.jobs add column if not exists application_form_config jsonb not null default '{"collect_cv":true,"cv_required":true,"collect_cover_letter":true,"collect_education":true,"collect_experience":true,"additional_questions":[]}'::jsonb;
alter table public.jobs drop constraint if exists jobs_application_method_check;
alter table public.jobs add constraint jobs_application_method_check check(application_method in ('external','internal'));

create table if not exists public.job_applications (
 id uuid primary key default gen_random_uuid(),
 job_id uuid not null references public.jobs(id) on delete cascade,
 employer_id uuid not null references public.employers(id) on delete cascade,
 first_name text not null,
 middle_name text not null default '',
 last_name text not null,
 email text not null,
 phone text not null,
 cover_letter text not null default '',
 education text not null default '',
 work_experience text not null default '',
 additional_answers jsonb not null default '{}'::jsonb,
 cv_object_path text,
 cv_filename text,
 cv_mime text,
 cv_size bigint,
 resume_text text not null default '',
 match_score integer not null default 0 check(match_score between 0 and 100),
 match_details jsonb not null default '{}'::jsonb,
 status text not null default 'new' check(status in ('new','shortlisted','rejected','reviewed')),
 consent_at timestamptz not null default now(),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(job_id,email)
);
alter table public.job_applications add column if not exists consent_at timestamptz not null default now();
create index if not exists job_applications_employer_idx on public.job_applications(employer_id,created_at desc);
create index if not exists job_applications_job_score_idx on public.job_applications(job_id,match_score desc,created_at desc);

alter table public.job_applications enable row level security;
revoke all on public.job_applications from anon,authenticated;
grant all on public.job_applications to service_role;

-- Private bucket. CVs must never be publicly readable.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('findjob-private','findjob-private',false,5242880,array['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict(id) do update set public=false,file_size_limit=5242880,allowed_mime_types=excluded.allowed_mime_types;

-- Keep employer navigation on the new, distinct URL scheme.
update public.site_settings set value=replace(value,'/employers','/become-an-employer') where key in ('header_links','footer_links');


do $$
declare r record; arr jsonb;
begin
 for r in select key,value from public.site_settings where key in ('header_links','footer_links') loop
  begin arr:=case when btrim(coalesce(r.value,''))='' then '[]'::jsonb else r.value::jsonb end;
  exception when others then continue; end;
  if jsonb_typeof(arr)<>'array' then continue; end if;
  if r.key='header_links' and not exists(select 1 from jsonb_array_elements(arr) as x(value) where value->>'url'='/login') then
   arr:=arr||jsonb_build_array(jsonb_build_object('label','Employer Login','url','/login'));
  end if;
  update public.site_settings set value=arr::text where key=r.key;
 end loop;
end $$;
