# Findjob.ng v2.6.13

- All Users now shows row numbers, live search across name/email/role/status, role filter, and client-side pagination of 20 accounts per page.
- Add user manually is now a dismissible modal dialog.
- Manual employer plan assignment distinguishes Unlimited Monthly (1 month) and Unlimited Yearly (12 months), and stores both as Unlimited entitlements with the correct duration.
- Public applicant form replaces free-text work experience with a years-of-experience dropdown, and replaces free-text education with highest qualification and course of study fields.
- Cover letters can be uploaded as PDF/DOCX and stored in private object storage. Employers can download the attachment from the application record.

## Required Supabase migration
Run `sql/upgrade-v2.6.13-users-applicant-form.sql` once before deploying. It adds cover-letter attachment metadata columns to `job_applications`.
