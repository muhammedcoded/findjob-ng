# Findjob.ng v2.6.0 deployment notes

## What changed

- MyJobMag imports fetch the original vacancy page and extract the full formatted job description, job metadata, expiry date when present, and an employer application email or external URL.
- Existing MyJobMag records are matched by source ID or source URL before fingerprint matching. The importer enriches existing records instead of intentionally duplicating them.
- If an existing published MyJobMag record only points to the MyJobMag listing and no employer destination can be found, the importer clears that source-as-apply URL and returns the job to Pending.
- Email application buttons open a Gmail compose window with the recipient and subject prefilled. External employer URLs open in a new tab.
- The public job detail page does not print a generic source disclaimer. It displays the short job-safety warning near the application button.
- Removed Jobicy and its paid API requirement completely.
- Added free public employer career-feed adapters for Greenhouse, Lever and Ashby. The default boards are Canonical and Welo Global. No API keys or paid subscriptions are needed.
- Remote ATS jobs are accepted only when the employer marks the role fully remote and the listing explicitly says Worldwide, Anywhere, Work from Anywhere, or equivalent. Country-restricted jobs and remote jobs without explicit global eligibility are skipped.
- Remote Apply Now links point to the employer's own Greenhouse, Lever or Ashby job/application page. No aggregator source credit is shown.
- The staff dashboard is full width, hides the public site header/footer/ad sidebars and does not load AdSense scripts.
- Added password visibility, forgot-password email recovery, bulk job selection, bulk publishing and Admin-only bulk deletion.
- Removed the public AI-search explanation and AI promotional panel.

## Deployment

1. Replace the current GitHub repository files with the contents of this ZIP and commit/push.
2. For an existing v2.1 Supabase database, run `sql/upgrade-v2.2-free-remote.sql` in Supabase SQL Editor. It creates the new remote ATS source record and removes the old Jobicy source configuration. Existing job records are retained unchanged, including any legacy Jobicy attribution.
3. Railway should redeploy from the connected repository. Keep the existing Supabase and Railway variables.
4. Remove any old `JOBICY_API_KEY` Railway variable. It is no longer used.
5. Optional Railway variables for the free feeds:
   - `REMOTE_GREENHOUSE_BOARDS=canonical`
   - `REMOTE_LEVER_SITES=weloglobal`
   - `REMOTE_ASHBY_BOARDS=`
   These are comma-separated employer board names, not API keys. The defaults in the code are Canonical and Welo Global, so the variables can be omitted unless you want to change or extend the list.
6. Keep `SITE_URL` set to your Railway-generated URL until the final custom-domain release.
7. In Supabase Authentication → URL Configuration → Redirect URLs, keep/add the exact Railway URL `https://YOUR-RAILWAY-DOMAIN.up.railway.app/staff/reset-password`.

## Free remote source details

- Greenhouse public job board: `https://boards-api.greenhouse.io/v1/boards/{board}/jobs?content=true`
- Lever public postings: `https://api.lever.co/v0/postings/{site}?mode=json`
- Ashby public job board: `https://api.ashbyhq.com/posting-api/job-board/{board}`
- The endpoints are public employer job-board feeds. The app does not use paid credentials or a per-job billing API.
- Default monitored boards: Canonical on Greenhouse and Welo Global on Lever. Add other board slugs only after confirming the employer's official careers page and ATS provider.
- A job is not treated as worldwide merely because it says Remote. The importer requires explicit worldwide wording and rejects country restrictions. New jobs enter Pending Review unless Auto-publish is deliberately enabled in Admin → Sources.

## Post-deploy checks

1. Open `/api/health`.
2. Sign in at `/staff`.
3. Open Jobs and inspect an enriched MyJobMag listing. Confirm the full description appears and Apply Now opens the employer email or application page, not MyJobMag.
4. Run Sources → Fetch latest vacancies now. The free remote source should report successful Greenhouse and Lever board requests if those public boards are available.
5. Review pending remote jobs. Confirm the employer listing explicitly allows worldwide applicants and that the application link opens the employer's own ATS page.
6. Confirm country-restricted or generic Remote-only roles were skipped.
7. Test password recovery after confirming the Supabase redirect URL.

## Testing status

The local automated tests and syntax checks are run before packaging. Live MyJobMag fetches, live employer feed requests, Supabase password recovery email, Railway deployment and browser-level checks must still be confirmed in the deployed environment. The public feed endpoints are keyless, but their availability and each employer's hiring eligibility can change.


## v2.3 additions

- Run `sql/upgrade-v2.3-ads-metrics.sql` once after the v2.2 migration. It adds three in-content ad placements, a wide center banner, AdSense snippet storage, ad rotation settings, first-party page/apply event metrics, and publishes the default privacy policy.
- Admin → Advertising now controls left/right sidebar rotations, job/article top/middle/bottom ads, and the wide center banner. Each slot supports an uploaded banner with a destination URL or a standard Google AdSense code/slot.
- Admin → Metrics shows aggregate page views and employer application-button clicks for today, yesterday, 3 days, 7 days, 14 days, 30 days, 12 months, or all time. Counts are events, not unique visitors.
- Admin → Pages and Blog now accept safe rich text (headings, paragraphs, lists and links). Public pages and blog posts use a full-width layout and social share links.
- Admin → Settings lets you set the CV AI Writer link label and destination. It appears in the main navigation when configured.
- Footer is dark green with About, Blog, Contact, Privacy, Terms and Job Safety links. The public Staff access footer link has been removed.


## v2.4.0 Admin and importer repair

1. Deploy the v2.4.0 project files to the existing GitHub `main` branch.
2. In Supabase SQL Editor, run `sql/upgrade-v2.4-admin-repair.sql`. This migration is idempotent. It adds the recoverable Trash status, ensures all 12 ad placements exist, creates/updates the `findjob-ads` storage bucket, and installs the first-party metrics table/function.
3. Wait for Railway to finish the deployment, then hard-refresh `/staff/dashboard` with Ctrl+Shift+R.
4. In Jobs, use **Clean imported descriptions** once to clean existing MyJobMag descriptions and fill application emails found in the Method of Application section. Review each extracted destination before publishing.
5. Check Advertising by saving a banner. The file upload can also happen automatically when you save an advert after selecting a file.

The dashboard now uses a left-side navigation panel on desktop and a compact responsive section menu on phones. Job status counts include Published, Pending Review, Draft, Rejected, Expired and Trash. Trash is recoverable; permanent deletion is restricted to admins.

The job-description editor includes a visual editor and HTML source mode. Imported descriptions are sanitized to remove source-site navigation, social-sharing controls, Telegram promotions, unrelated signup fragments and unsafe HTML. Application emails or employer application links are extracted only when they appear in application instructions or relevant context. A job without a genuine destination remains pending for manual review.


## v2.5.0 deployment checklist

1. Run `sql/upgrade-v2.5-employers-navigation-ads.sql` in Supabase SQL Editor after v2.4.
2. Add Railway variable `SUPABASE_ANON_KEY` using the Supabase anon/publishable key.
3. Add `PAYSTACK_SECRET_KEY` and `PAYSTACK_WEBHOOK_SECRET` (same secret value). Use Paystack test credentials first.
4. Set the Paystack webhook URL to `https://YOUR-RAILWAY-DOMAIN/api/payments/paystack/webhook`.
5. Set Supabase Auth Site URL to your Railway URL and allow employer signup/confirmation redirects.
6. Deploy and verify `/api/health`, `/advertise`, `/employers`, `/employer`, staff dashboard, menu settings, and advertising placements.
7. Complete a Paystack test wallet top-up and Unlimited subscription. Verify that webhook retries do not duplicate wallet credit or subscriptions.
8. Submit a test employer job. Confirm it is charged once, appears in the employer's dashboard as Pending Review, and after admin approval is published with a 3-month default expiry and 3-week featured period.

Candidate search credits are stored and decremented only when results are returned. A candidate profile onboarding and CV upload flow is not included in this release, so no candidate search results should be expected until opt-in profiles are populated.

## Employer service scope

The website automatically gives approved featured employer listings priority in Findjob.ng job feeds. Email, partner-site and social promotion are manually coordinated by the Findjob.ng team, not automatically sent by the app. Candidate search credits are tracked and consumed only when opt-in candidate profiles are returned. The public candidate signup/CV onboarding flow is not included yet, so populate the opt-in candidate directory before advertising candidate search as immediately available.


## v2.6.0: employer URLs, internal application forms and resume review

### New employer URLs

- `/become-an-employer`: public employer plans and pricing.
- `/employersignup`: employer registration with first, middle and last name, password confirmation, and show/hide password controls.
- `/login`: employer sign-in.
- `/employer-dashboard`: private employer workspace.
- Old `/employers` and `/employer` links redirect to the new public pricing and login URLs.

### Supabase steps

1. Confirm v2.5 and v2.4 migrations are installed.
2. Run `sql/upgrade-v2.6-employer-applications.sql` in Supabase SQL Editor.
3. The migration adds employer contact-name fields, per-job application method/form settings, a private `job_applications` table, and the private `findjob-private` Storage bucket for applicant CVs.
4. Keep the `findjob-private` bucket private. Do not make it public. The application server uses the Supabase service-role key to upload CVs and create short-lived employer-authorized download links.
5. In Supabase Authentication → URL Configuration, set the Site URL to the live site URL and add the exact redirect URL `https://YOUR-RAILWAY-DOMAIN.up.railway.app/login?confirmed=1` to the Redirect URLs allowlist.
6. In Supabase Authentication → Providers → Email, enable email confirmations. Check the confirmation email template uses Supabase's `{{ .ConfirmationURL }}` link. For dependable delivery, configure your own SMTP provider in Supabase Auth settings. Supabase's default email service may have low sending limits.

### Railway variables

Keep existing variables. Ensure these are present:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only, never commit to GitHub)
- `SUPABASE_ANON_KEY` (public project anon/publishable key, required by employer signup/login)
- `SITE_URL` (the current production URL, used for confirmation redirects and Paystack callback)
- `PAYSTACK_SECRET_KEY` (use Paystack test secret key for testing first)
- `PAYSTACK_WEBHOOK_SECRET` (optional; if set, use the same Paystack secret key because Paystack signs webhooks with the account secret key)

The Docker build installs the open-source `pdf-parse` and `mammoth` packages for extracting searchable text from PDF and DOCX CVs. This is local processing. No paid AI API is used.

### Paystack webhook

Configure the Paystack webhook URL as:

`https://YOUR-RAILWAY-DOMAIN.up.railway.app/api/payments/paystack/webhook`

Test wallet top-up and Unlimited subscription with Paystack test credentials. Confirm that a successful transaction is verified server-side, a wallet balance is credited only once, and an Unlimited subscription has the correct start and end dates. Do not switch to live keys until the test transaction and webhook have both been verified.

### Internal job applications

When an employer creates a job, they can choose:

- Findjob.ng internal form: first name, middle name, last name, email and phone are collected, with optional CV, cover letter, education, work experience and up to five employer-defined questions.
- External application: the employer supplies their own email address or direct application URL.

CV upload accepts PDF and DOCX up to 5 MB and is stored in a private bucket. Employers can see their own applications in the dashboard, download individual CVs, export application details to `.xlsx`, and download a ZIP of CV files. Application records and CV downloads are restricted to the employer that owns the vacancy.

Resume match uses keyword overlap from the job description, extracted CV text, cover letter, education, work experience and additional answers. It is an assistive ranking only, not an automated hiring decision. Employers must review applicants themselves. Scanned image-only PDFs may not contain extractable text and can receive a low match score even when visually relevant.

### Subscription rules

- Pay as you go: each submitted vacancy costs one ₦5,500 wallet credit. Once approved, the vacancy is active for up to 90 days or until the employer's chosen deadline, and is featured for 21 days.
- Unlimited: new vacancies are covered only while an Unlimited subscription is active. The employer dashboard shows the expiry date and remaining days. After expiry, new vacancies require a renewed subscription or Pay as you go wallet credits. Existing approved jobs retain their own job expiry dates.

### Required live checks after deployment

1. Confirm `/become-an-employer`, `/employersignup`, `/login`, and `/employer-dashboard` load correctly.
2. Register a test employer, confirm the email, then sign in.
3. Create one internal-form job, approve it in the staff dashboard, and submit a test application with a PDF or DOCX CV.
4. Confirm the application appears in the correct employer inbox, download its CV, export XLSX, and download the CV ZIP.
5. Create one external-form job and confirm its email or URL opens as entered.
6. Test Paystack in test mode, including the webhook. Check subscription start/end dates and the posting lock after expiry.

Live email delivery, Paystack settlement, Supabase storage, and Railway deployment cannot be certified from local tests. Verify these in the live project before accepting real employer payments or candidate documents.
