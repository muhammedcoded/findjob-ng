-- Upgrade Findjob.ng v2.1 to v2.2.
-- Replaces the paid Jobicy importer with free public employer career feeds.
-- Existing job records are retained unchanged. Legacy Jobicy listings keep
-- their existing source attribution on the public job detail page.

insert into public.sources(source_key,title,enabled,auto_publish)
values ('remote_ats','Free employer remote career feeds',true,false)
on conflict(source_key) do update
set title=excluded.title, enabled=true;

delete from public.sources where source_key='jobicy';
