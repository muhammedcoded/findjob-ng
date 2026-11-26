# Findjob.ng v2.6.8: subscription lock and employer workspace

## What changed
- The employer profile stores the plan selected during registration (`wallet`, `unlimited_monthly`, or `unlimited_yearly`).
- Employer login remains available after email confirmation. The employer dashboard checks active subscription dates or available Pay as you go credit.
- Without a valid entitlement, the employer sees a blocking subscription screen. Only plan payment and receipt access remain available; recruitment tools are hidden in the navigation.
- Employer APIs for jobs, applications, candidate search and other paid workspace functions reject requests without an active entitlement.
- The payment initializer defaults to the employer's selected plan when the request does not explicitly choose a payment type. Monthly/yearly term is preselected from the saved profile.
- The employer workspace uses the sample-inspired left navigation rail, green active state, company identity panel, top header and account status.
- Static asset versions are bumped to prevent old dashboard JS/CSS being reused from browser cache.

## Deployment
1. Back up the current project and database.
2. Run `sql/upgrade-v2.6.7-subscription-access.sql` in Supabase SQL Editor. This migration now also adds and backfills `employers.selected_plan` from Supabase Auth metadata where available.
3. Deploy this project to Railway.
4. Hard refresh the employer dashboard (Ctrl+Shift+R) after deployment.
5. Test with an employer that has no active subscription and a zero wallet balance. They should see the blocking subscription screen and the jobs APIs should return HTTP 402 until payment is verified.
6. Test Pay as you go with one ₦5,500 credit and verify that the credit is consumed once per submitted job. Test monthly and yearly subscriptions and confirm `ends_at` controls access after expiry.

## Notes
- The server-side API entitlement check is authoritative. Hiding dashboard navigation is only the user interface layer.
- Pay as you go access is represented by wallet balance in units of ₦5,500 per job post. An active Unlimited subscription covers posting while `starts_at <= now < ends_at`.
- Existing payment and subscription records are preserved.
- Live Paystack and Supabase transactions cannot be exercised from this local build environment. Perform the deployment tests above before announcing production readiness.
