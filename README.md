# Findjob.ng v2: Job Board + CMS

**Production-oriented application, not yet verified against live Supabase, Railway, third-party RSS or AdSense.** Public visitors search without sign-in. Supabase Auth is only for staff. The interface uses the approved neon-green/white design with the red Latest Jobs heading and left and right advertising columns.

## What's included

- Public homepage with free AI-style *keyword* search, 30 jobs per page, category filters and sorting. AI Search Mode does not yet call a generative AI model.
- Job detail pages with source attribution and `CLICK HERE TO APPLY` external destination. Importer does not promise direct employer URLs when feeds only offer a source listing URL.
- MyJobMag Nigeria RSS and Jobicy remote API importers. Duplicate protection and deterministic categorization. Manual verification of third-party vacancies remains important.
- Admin dashboard: sources, fetch now, status, adverts (4 left / 4 right), separate sidebar content widgets (2 left / 2 right), editor team, brand, logo, favicon, custom sidebar banners, header/footer menus, search metadata, Google codes, settings.
- Editor dashboard: pending/review/publish/reject jobs, create/edit pages and blog posts. Editors cannot alter sources, team, ads, site settings, or delete jobs/pages.
- CMS: public `/blog`, `/blog/post-slug`, `/about`, `/contact`, `/disclaimer`, `/privacy`, `/terms`, and newly created `/<slug>` pages; published-only API, server-rendered metadata and dynamic sitemap/robots.
- Mobile layout stacks job list before advertisements and keeps mobile nav, categories and ad slots available.
- Supabase database + Auth + image Storage; Docker for Railway, separate optional cron worker.

## 1. Supabase and SQL: do these before Railway

1. Create a new Supabase project at https://supabase.com/dashboard.
2. Open **SQL Editor** and run the entire contents of **`sql/schema.sql`**.
3. Then run the entire contents of **`sql/upgrade-v2.sql`**. For a v1 deployment with the schema already created, run only the upgrade SQL. The upgrade uses `IF NOT EXISTS` / `ON CONFLICT DO NOTHING` and does not delete existing jobs.
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
   SITE_URL=https://findjob.ng
   DISABLE_WEB_SCHEDULER=false
   ```
   `PORT` is supplied by Railway. The `SYNC_SECRET` environment variable is optional if an external process is going to call `/api/sync/cron`.
4. Deploy. Check `https://YOUR_RAILWAY_DOMAIN/api/health`, then `/api/config` (which confirms database access). Visit `/staff` to sign in using the Supabase admin email and password.
5. Visit Admin → Sources, click **Fetch latest vacancies now**, review imported jobs under Jobs → Pending, then publish appropriate listings.
6. Add your custom domain in **Railway → Service → Settings → Networking**. Set `SITE_URL=https://findjob.ng` after DNS works. DNS and domain approval are external steps.

## 3. Job fetching frequency and automation

- Default: **every 180 minutes (3 hours)**. In **Admin → Settings → Automatic Job Import**, change to **30, 60, 180, 360, 720 or 1440 minutes**, and set `auto_sync` true/false.
- **Admin → Sources → Fetch latest vacancies now** triggers a manual import immediately. Both MyJobMag and Jobicy can be individually enabled/disabled and can use auto-publish if you explicitly approve the source. **Auto-publish is off by default.**
- An always-running web service with `DISABLE_WEB_SCHEDULER=false` checks whether an import is due every minute. It also checks shortly after startup. Only use this on **one** web replica: independent app instances may race and a service restart can shift timing.
- For more reliable Railway scheduling, create a **second Railway service from the same repository** called `findjob-cron` and configure its **Start Command** as `node cron.mjs`, plus **Settings → Cron Schedule:** `*/15 * * * *` (UTC). Copy the same Supabase environment variables to this worker. In the *website* service set `DISABLE_WEB_SCHEDULER=true`. The worker runs at most every 15 minutes, checks the interval saved in Supabase, performs an import only when due, then **exits**. Do not set Cron Schedule on the website's long-running `node server.mjs` service. Railway cron does not guarantee exact-minute execution; scheduled runs can be skipped when a previous process is still active.
- Imported items are checked for source eligibility and duplicate fingerprint, then assigned a category. This is heuristic classification, not a guarantee. Editors should confirm titles, company, category, applicability, expiration, and application link.
- MyJobMag: https://www.myjobmag.com/feeds/ ; feed endpoint configured in `sources.mjs`. Make sure you have the right to syndicate descriptions before monetizing third-party content; linking/excerpts with attribution may be preferable. Jobicy's free public API generally returns its own job page URL, not employer ATS. We don't invent direct employer links.

## 4. Admin / Editor / authentication

- `/staff` is the login URL. The Admin password is the one you set in Supabase. No demo or hardcoded password.
- **Admin → Settings → Change Your Dashboard Password** changes your own password through Supabase Auth. The Supabase Dashboard can also help with account recovery.
- Admin controls jobs, sources, fetch schedule, adverts, footer/header Google snippets, brand, logo, Editor team, pages, and blog. Editor controls jobs and the content publishing workflow only. Removing content permanently is Admin-only.
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
- **SEO:** `/sitemap.xml` automatically includes published jobs, pages and blog articles; `/robots.txt` references the sitemap. `robots_extra` allows additional directives. There is no need to hand-write a sitemap. Content is plain text rather than rich HTML to avoid stored HTML injection; rich text blocks and image galleries can be added later.

## 6. Advertising

- Admin → Advertising: 4 left and 4 right advertising slots. Each supports *placeholder*, uploaded *banner* with destination URL, or *AdSense* slot ID. Toggle visibility per slot.
- **Admin → Widgets** manages regular left/right sidebar content independently from advertising: titles, descriptions, links, and visibility. Sidebar placements remain visible on desktop; mobile stacks content above ads instead of forcing horizontal scrolling. The AI Writer ad uses the separately configurable URL.
- Google AdSense approval, eligible content, privacy/cookie requirements and ad serving are determined by Google. Many ad placeholders do **not** guarantee ads will be shown or increase revenue. Do not artificially refresh or click ads.

## 7. Test and troubleshooting

```bash
npm test
npm start
# open http://localhost:3000
```

Without Supabase credentials, `/api/health` responds but `/api/jobs`, `/api/config`, staff and CMS endpoints will show a clear setup error. That is expected. No test creates a default account or fake published job data.

Before production launch manually verify: actual Admin and Editor sign-in; real RSS import, categorization and live job Apply links; banner image upload; page/blog save and public rendering; custom logo; dynamic sitemap; mobile display on physical phones; Google verification/analytics/ad serving in the browser. All require real external services and are not proven merely by passing local tests.

## File guide

- `server.mjs`: HTTP, public jobs, CMS, sitemap, protected dashboard API.
- `cms.mjs`: settings validation, content validation and scheduling check.
- `sources.mjs`: RSS/API importer, deduplication and classification.
- `cron.mjs`: short-lived Railway scheduled worker.
- `sql/schema.sql` then `sql/upgrade-v2.sql`: schema and v2 migration.
- `public/index.html`, `public/assets/app.js`, `public/assets/style.css`: browser UI.
- `tests`: automated checks.
