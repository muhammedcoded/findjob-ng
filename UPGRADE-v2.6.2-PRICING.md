# Findjob.ng v2.6.2 Pricing Update

## Employer plan prices
- Pay as you go: NGN 5,500 per job credit.
- Unlimited Monthly: NGN 50,500 per month.
- Unlimited Yearly: NGN 550,000 for 12 months.

The yearly price is discounted against 12 monthly payments:
- 12 monthly payments: NGN 606,000.
- Yearly payment: NGN 550,000.
- Savings: NGN 56,000, equal to 9.24% (displayed as 9.2%).

## Changes
- Employer billing now offers Monthly and Yearly selection.
- The yearly selection displays the discount and savings.
- The server calculates the yearly charge as NGN 550,000 (55,000,000 kobo). The browser does not determine the charge.
- The employer plans landing page displays both monthly and yearly prices.
- Pay as you go remains NGN 5,500 per job credit.

## Deployment
Replace the application source with this v2.6.2 package and redeploy Railway. No Supabase schema migration is required for this pricing-only update. Do not rerun earlier SQL migrations.
