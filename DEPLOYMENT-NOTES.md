# Findjob.ng v2.4.0 deployment notes

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
