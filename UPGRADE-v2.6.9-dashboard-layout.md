# Findjob.ng v2.6.9 Dashboard Layout Update

This release aligns the staff and employer dashboard presentation with the supplied SaleSight reference. It changes the dashboard shell and visual navigation only. Existing dashboard tabs, routes, API calls, permissions, forms, tables, filters, and actions are retained.

## Dashboard layout

- Staff Admin and Editor dashboards now use a fixed left navigation panel, green active navigation state, staff identity area, top page header, role indicator, and content workspace.
- Employer dashboard retains its employer-specific left navigation, company identity, top header, plan status, and workspace.
- Both dashboards use the same visual language: white sidebar/header, light neutral workspace, green accents, compact icon navigation, and responsive mobile navigation.
- At narrow widths, the sidebar navigation becomes a horizontally scrollable navigation strip.

## Deployment

Replace the existing application source with this package and redeploy. No database migration is required for this dashboard-only visual update. Hard-refresh the browser after deployment.
