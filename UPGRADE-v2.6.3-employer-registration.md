# Findjob.ng v2.6.3 Employer Registration Update

## Changes

- Employer signup now offers a starting plan selection: Pay as you go, Unlimited Monthly, or Unlimited Yearly.
- The selected plan is saved in the Supabase Auth user's `user_metadata.selected_plan` field during signup.
- The signup success message is now exactly: `Check your email to confirm your email address.`
- Added an employer confirmation-email resend API endpoint using Supabase Auth's signup resend flow.
- Added a resend confirmation email action to the employer login screen. The employer enters their email address first.
- Confirmation and resend redirects continue to use `SITE_URL`, so the deployed Railway URL is used when that variable is configured.

## Important scope note

This update does not automatically charge the selected plan after email confirmation. The existing application requires admin approval before an employer can sign in, and its payment initialization endpoint requires an active employer profile. The post-confirmation payment handoff therefore still needs a separate workflow change before it can be described as complete. No existing employer or job data is migrated or deleted by this update.

## Deployment

1. Replace the current application files with this package and deploy through Railway.
2. Keep `SITE_URL` set to `https://findjob-ng-production.up.railway.app` until the custom domain is connected.
3. In Supabase Auth, keep Confirm email enabled and allow the Railway URL as a redirect URL.
4. Test a new employer signup, email confirmation, login, and resend confirmation from a test account.

## Validation

- `node --check server.mjs`
- `node --check public/assets/app.js`
- `npm test` (61 tests passed in the packaged source environment)
