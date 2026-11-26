# Findjob.ng v2.6.10: Pay as you go and Unlimited access rules

## Pricing rules
- Pay as you go: ₦5,500 purchases one job-post credit. Multiple credits can be purchased in one Paystack transaction. Each successful job submission consumes exactly one credit.
- Unlimited Monthly: ₦50,500 for unlimited job posts and the full employer recruitment workspace while the subscription is active.
- Unlimited Yearly: ₦550,000 for unlimited job posts and the full employer recruitment workspace for 12 months.

## Access rules
- Pay as you go credits permit job posting only. They do not unlock applications management, candidate search, or other subscription-only recruitment tools.
- An active Unlimited subscription unlocks the full employer workspace.
- Expired Unlimited subscriptions no longer unlock the full workspace. Remaining Pay as you go credits, if any, still permit individual job posts.
- Job posting is checked server-side. An Unlimited subscription bypasses per-post wallet debit. Otherwise the server atomically debits ₦5,500 before creating the job and attempts a refund if job creation fails.
- Wallet balance is denominated in kobo. Available job credits are `floor(balance_kobo / 550000)`.

## Database
No new database migration is required. This release uses the existing employer_wallets, employer_subscriptions, employer_payments tables and wallet debit/credit RPCs installed by the previous migrations.
