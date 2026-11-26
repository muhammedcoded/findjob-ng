-- Findjob.ng v2.6.13: structured applicant details and private cover-letter uploads
alter table public.job_applications add column if not exists cover_letter_object_path text;
alter table public.job_applications add column if not exists cover_letter_filename text;
alter table public.job_applications add column if not exists cover_letter_mime text;
