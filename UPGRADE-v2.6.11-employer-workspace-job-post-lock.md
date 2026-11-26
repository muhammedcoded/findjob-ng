# Findjob.ng v2.6.11 Employer Workspace and Job Posting Access

## Behaviour changes
- Employer dashboard remains available regardless of current subscription or Pay as you go balance.
- Employers can view historical jobs, publication/review status, expiry dates and full job descriptions without an active plan.
- The only employer navigation action blocked for insufficient entitlement is creating a new job post. Selecting Post a Job with no active Unlimited subscription and no available Pay as you go credit shows an inline reminder with a link to Plans & Billing.
- Payment receipts are shown only in Plans & Billing, not in a blocking subscription reminder.
- The server no longer applies a global Unlimited-subscription gate to all employer APIs.
- The job creation endpoint still enforces entitlement: active Monthly/Yearly subscription permits unlimited posts; otherwise the wallet debit RPC must successfully deduct one ₦5,500 credit per job. Failed job creation triggers the existing refund attempt.
- Employer job history now returns and displays the stored description, with an expandable full-description view.
- Employer rich-text job description editor receives explicit full-width, responsive styling.

## Deployment
No database migration is required. Deploy the updated source package to Railway. Existing database tables, job records, payment records and wallet balances are retained.
