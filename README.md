# Findjob.ng v2.3: Job Board + CMS + Advertising + Metrics

**Production-oriented application. External service behaviour still needs to be verified after deployment.** Public visitors search without sign-in. Supabase Auth is only for staff. The public website uses the green/white design and advertising columns. The staff area uses a separate full-width dashboard layout without public ad sidebars.

## What's included

- Public homepage with keyword search, 30 jobs per page, category filters and sorting. The public copy does not describe ordinary keyword search as an AI service.
- Job detail pages retain full formatted vacancy descriptions. Apply Now opens an extracted employer application page or a Gmail compose window for email applications. If no direct employer destination is available, the page does not redirect applicants to the source job board.
- MyJobMag Nigeria RSS importer that opens each original job page to extract the full description, job metadata and direct employer application email/link. Existing imported records are enriched by fingerprint instead of duplicated. Worldwide remote jobs are fetched from free public employer career feeds on Greenhouse, Lever and Ashby. No paid API key is required. The default employer boards are Canonical and Welo Global, and only fully remote jobs explicitly open Worldwide, Anywhere or Work from Anywhere are accepted.
- Admin dashboard: job sources, job moderation, advertising placements, automatic sidebar ad rotation, metrics, separate sidebar widgets, editor team, branding, header/footer menus, custom pages, blog, SEO and settings.
- Editor dashboard: pending/review/publish/reject jobs, create/edit pages and blog posts. Editors cannot alter sources, team, ads, site settings, or delete jobs/pages.
- CMS: public `/blog`, `/blog/post-slug`, `/about`, `/contact`, `/disclaimer`, `/privacy`, `/terms`, and newly created `/<slug>` pages; published-only API, server-rendered metadata and dynamic sitemap/robots.
- Responsive public and staff layouts. The staff dashboard is full-width and does not display public advertising sidebars.
- Supabase database + Auth + image Storage; Docker for Railway, separate optional cron worker.

## 1. Supabase and SQL: do these before Railway

1. Create a new Supabase project at https://supabase.com/dashboard.
2. Open **SQL Editor** and run the entire contents of **`sql/schema.sql`**.
3. Then run the entire contents of **`sql/upgrade-v2.sql`**, **`sql/upgrade-v2.2-free-remote.sql`**, and **`sql/upgrade-v2.3-ads-metrics.sql`**, in that order. For an existing v2.2 deployment, run only the new v2.3 migration. These migrations preserve existing jobs and content.
4. Open **Authentication → Users → Add user**, create your own admin user (email and strong password), and copy its **user UUID**. There is **no default admin username/password** and no public admin registration.
5. In SQL Editor run, replacing both placeholders:
   ```sql
   insert into public.staff (user_id,email,role,active)
   values ('YOUR_REAL_AUTH_USER_UUID','your-email@example.com','admin',true)
   on conflict (user_id) do update set role='admin',active=true;
   ```
6. In Supabase Project Settings / API Keys obtain the **Project URL** and the server-only **service_role/secret key**. Do **not** expose the key in the browser or commit it to GitHub. Use a secret/service key with service_role privileges supported by your project.
7. Supabase Storage bucket `findjob-ads` is created by the v1 schema. It is public for uploaded images only; uploads require Admin authentication through the application server.
8. For additional Editors, create their account under Supabase Auth, then open Admin → Team and assign their UUID and role `editor`.

## 2. Deploy the website on Railway

1. Create a **new** GitHub repository for Findjob.ng, separate from DownloadQ. Upload the project files. If the repository contains a nested `findjob-ng` folder, Railway **Root Directory** should be `/findjob-ng`; if the files are at the root, choose `/`.
2. Create a Railway service connected to the new repo. Select **Dockerfile** builder, using `Dockerfile` inside the configured root.
3. Set Railway **Variables**:
   ```env
   SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVER_ONLY_SECRET
   SITE_URL=https://YOUR-RAILWAY-DOMAIN.up.railway.app
   SYNC_SECRET=YOUR_PRIVATE_RANDOM_SECRET
   SYNC_INTERVAL_MINUTES=180
   DISABLE_WEB_SCHEDULER=false
   REMOTE_GREENHOUSE_BOARDS=canonical
   REMOTE_LEVER_SITES=weloglobal
   ```
   `PORT` is supplied by Railway. Keep `SITE_URL` set to the Railway-generated public URL until the final custom-domain release. `SYNC_SECRET` is required if an external scheduler calls `/api/sync/cron`. The remote-feed variables are optional lists of public employer ATS board names. They do not require API keys or paid subscriptions. The defaults above fetch Canonical (Greenhouse) and Welo Global (Lever). You can add more comma-separated board names after checking that each employer publishes a public board on the relevant ATS.
4. Deploy. Check `https://YOUR_RAILWAY_DOMAIN/api/health`, then `/api/config` (which confirms database access). Visit `/staff` to sign in using the Supabase admin email and password.
5. Visit Admin → Sources, click **Fetch latest vacancies now**, review imported jobs under Jobs → Pending, then publish appropriate listings.
6. Add your custom domain in **Railway → Service → Settings → Networking**. Set `SITE_URL=https://findjob.ng` after DNS works. DNS and domain approval are external steps.

## 3. Job fetching frequency and automation

- Default: **every 180 minutes (3 hours)**. In **Admin → Settings → Automatic Job Import**, change to **30, 60, 180, 360, 720 or 1440 minutes**, and set `auto_sync` true/false.
- **Admin → Sources → Fetch latest vacancies now** triggers a manual import immediately. MyJobMag and the free employer ATS remote feeds can be individually enabled/disabled and can use auto-publish if you explicitly approve the source. **Auto-publish is off by default.**
- An always-running web service with `DISABLE_WEB_SCHEDULER=false` checks whether an import is due every minute. It also checks shortly after startup. Only use this on **one** web replica: independent app instances may race and a service restart can shift timing.
- For more reliable Railway scheduling, create a **second Railway service from the same repository** called `findjob-cron` and configure its **Start Command** as `node cron.mjs`, plus **Settings → Cron Schedule:** `*/15 * * * *` (UTC). Copy the same Supabase environment variables to this worker. In the *website* service set `DISABLE_WEB_SCHEDULER=true`. The worker runs at most every 15 minutes, checks the interval saved in Supabase, performs an import only when due, then **exits**. Do not set Cron Schedule on the website's long-running `node server.mjs` service. Railway cron does not guarantee exact-minute execution; scheduled runs can be skipped when a previous process is still active.
- Imported items are checked for source eligibility and duplicate fingerprint, then assigned a category. This is heuristic classification, not a guarantee. Editors should confirm titles, company, category, applicability, expiration, and application link.
- MyJobMag: https://www.myjobmag.com/feeds/ . The importer uses the public Nigeria RSS feed, then fetches the linked public vacancy page to extract the full job content and the employer's application email or external URL. The public MyJobMag job pages are allowed by the current robots.txt rules, but confirm the feed and content redistribution terms before monetizing copied vacancy content. If a direct employer destination cannot be extracted, the job stays pending and Apply Now is not pointed at MyJobMag. Worldwide remote roles: Findjob.ng reads public employer career feeds from Greenhouse, Lever and Ashby. These endpoints are published for employer job boards and do not require paid API credentials. Default boards are Canonical and Welo Global. A role is imported only when the employer listing explicitly says Worldwide, Anywhere, or Work from Anywhere, identifies the role as fully remote, and provides an employer-hosted job or application URL. Country-restricted roles and roles labelled only Remote without worldwide eligibility are skipped. No aggregator source credit is required because these records come directly from employer ATS boards.

## 4. Admin / Editor / authentication

- `/staff` is the login URL. The Admin password is the one you set in Supabase. No demo or hardcoded password.
- Staff login includes password visibility controls, forgot-password email recovery and a reset-password page. Add the exact Railway URL `https://YOUR-RAILWAY-DOMAIN.up.railway.app/staff/reset-password` to Supabase Authentication → URL Configuration → Redirect URLs. Replace the example with your actual Railway domain. Admin → Settings → Change Your Dashboard Password also changes your password through Supabase Auth.
- Admin controls jobs, sources, fetch schedule, adverts, AdSense publisher/slot configuration, footer/header Google snippets, brand, logo, Editor team, pages, blog and site metrics. The Metrics tab reports page views and employer Apply button clicks, including today's totals and selectable ranges. The Jobs screen supports selecting multiple records for bulk publishing and Admin-only bulk deletion. Bulk publishing is blocked when selected imported jobs do not have direct employer application destinations. Editor controls jobs and the content publishing workflow only.
- Supabase secrets are never sent to the browser. Public tables are protected by RLS and no direct anonymous grants. To improve security further before large-scale use, enable staff MFA, consider audit logs and rate limiting through a proxy/CDN.

## 5. Content Management System

- **Admin / Editor → Pages**: create/update pages. Enter title, slug (`about`, `faq`, `scholarships`, etc.), body (plain text, blank lines for paragraphs), summary, SEO title/description and `Draft`/`Published`. Published custom pages appear at `https://findjob.ng/<slug>`. Draft pages do not appear publicly. System routes (`staff`, `api`, `jobs`, `blog`, `assets`, `robots`, `sitemap`) are reserved.
- **Admin / Editor → Blog**: create/update articles the same way. Each appears at `/blog/<slug>`; the public index is `/blog`. Upload a featured image from the editor, then Save.
- **Admin → Settings → Branding**: upload Site Logo or Favicon, or paste a public HTTPS URL. Logo uploads are PNG/JPEG/WebP/GIF under 2 MB. Update site name, description, and email. Branding images use the same Supabase Storage bucket as adverts.
- **Header:** edit `header_links` as a JSON array of `{label,url}`. These become the top navigation menu. **Footer:** edit `footer_text` and `footer_links` from the dashboard. `footer_links` is a JSON array. Example:
  ```json
  [{"label":"About","url":"/about"},{"label":"Blog","url":"/blog"},{"label":"Contact","url":"/contact"}]
  ```
  Add the URLs of published custom pages to the list. The footer renders links without a full-page reload for internal navigation.
- **Search Console / Analytics:** set `google_site_verification` to the verification token only, and `ga_measurement_id` to a `G-...` ID. **AdSense** is configured separately in the Advertisements dashboard with `ca-pub-...` and the real slot IDs. You can also add certain Google script snippets through `header_code` or `footer_code`; only approved Google script hosts are allowed. Adding a snippet may still require a valid Google account/property.
- **SEO:** `/sitemap.xml` automatically includes published jobs, pages and blog articles; `/robots.txt` references the sitemap. `robots_extra` allows additional directives. There is no need to hand-write a sitemap. Job descriptions and CMS pages use a strict HTML allowlist for headings, paragraphs, lists and safe links.

## 6. Advertising

- Admin → Advertising: 4 left and 4 right sidebar slots, 3 in-content placements (top, middle and bottom), and one wide centered banner. Each slot supports a placeholder, uploaded banner with destination URL, AdSense slot ID, or a pasted standard Google AdSense snippet. Sidebar adverts rotate automatically when multiple enabled adverts are available. Set the rotation interval in the Advertising screen.
- **Admin → Widgets** manages regular left/right sidebar content independently from advertising: titles, descriptions, links, and visibility. Public sidebar placements remain separate from the full-width staff dashboard.
- Google AdSense approval, eligible content, privacy/cookie requirements and ad serving are determined by Google. Many ad placeholders do **not** guarantee ads will be shown or increase revenue. Do not artificially refresh or click ads.

## 7. Site metrics and sharing

- **Admin → Metrics** records page views and clicks on job application buttons. Date ranges include today, yesterday, 3 days, 7 days, 14 days, 30 days, 12 months and all time. Reporting uses Nigeria time (WAT). These are aggregate first-party event counts, not unique-person counts.
- Job details, blog articles and CMS pages include WhatsApp, Facebook, X, LinkedIn and copy-link sharing.
- The sitemap at `/sitemap.xml` includes published jobs, pages and blog posts. `/robots.txt` references it. Submit the sitemap URL in Google Search Console after deployment.
- Published CMS pages and the blog use a full-width content layout. Admin → Pages and Admin → Blog let authorized staff create, edit, publish, unpublish and delete content.
- Configure the CV AI Writer destination and button label in Admin → Settings → Branding & Contact. When configured, a CV AI Writer link appears in the main navigation.

## 8. Test and troubleshooting

```bash
npm test
npm start
# open http://localhost:3000
```

Without Supabase credentials, `/api/health` responds but `/api/jobs`, `/api/config`, staff and CMS endpoints will show a clear setup error. That is expected. No test creates a default account or fake published job data.

Before production launch manually verify: actual Admin and Editor sign-in; real RSS import, categorization and live job Apply links; banner image upload; page/blog save and public rendering; custom logo; dynamic sitemap; mobile display on physical phones; Google verification/analytics/ad serving in the browser. All require real external services and are not proven merely by passing local tests. The test suite validates MyJobMag HTML extraction using a fixture, not a live MyJobMag fetch. Verify real source imports and employer links in Railway before publishing.

## File guide

- `server.mjs`: HTTP, public jobs, CMS, sitemap, protected dashboard API.
- `cms.mjs`: settings validation, content validation and scheduling check.
- `sources.mjs`: MyJobMag detail-page enrichment, free Greenhouse / Lever / Ashby employer remote feeds, deduplication and classification.
- `cron.mjs`: short-lived Railway scheduled worker.
- `sql/schema.sql` then `sql/upgrade-v2.sql`: schema and v2 migration.
- `public/index.html`, `public/assets/app.js`, `public/assets/style.css`: browser UI.
- `tests`: automated checks.
