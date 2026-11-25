# Findjob.ng v2.6.7: Employer subscription access and dashboard

## Changes
- Employer signup creates a usable employer profile without a manual approval hold. Supabase email confirmation remains required for login.
- Existing pending employer profiles are migrated to active profile status. This does not grant paid access.
- Employer dashboard is accessible after email-confirmed login. Without an active Unlimited subscription or at least one ₦5,500 wallet credit, the employer is restricted to the subscription page.
- Employer API routes that expose hiring workspace actions require an active subscription or available wallet credit. Payment initialization, payment verification, account overview, and receipt downloads remain available so an employer can pay or retrieve receipts.
- Employer dashboard now uses a left navigation sidebar, top header, active-plan indicator, and responsive layout.
- Successful subscription payments have downloadable PDF and CSV receipts showing reference, paid amount, payment date, plan, employer and payment status.

## Deployment
1. Back up your current project and database.
2. Deploy this source package to Railway.
3. In Supabase SQL Editor, run `sql/upgrade-v2.6.7-subscription-access.sql` once.
4. Confirm `SITE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `PAYSTACK_SECRET_KEY`, and Paystack webhook configuration are present in Railway.
5. Test with a confirmed employer account that has no payment, then complete a test Paystack payment and verify dashboard access.

Job publication review remains separate. Staff may still review submitted job listings before publication. They no longer approve employer account access.
