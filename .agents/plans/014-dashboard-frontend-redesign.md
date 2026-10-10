# Dashboard frontend redesign

## Authorization and scope
The user approved the original redesign and then requested updates to the existing PR and branch. Frontend only: preserve APIs, authentication, currency precision, Analytics and sidebar behavior. The latest request supersedes Dashboard historical reporting and period controls.

## Existing state
DashboardPage owns dashboard requests and the local calendar hook. CategorySpending independently fetches category analytics. FinancialRow uses CategoryIcon. Navbar routes the app logo to landing; PublicLandingNavigation owns landing actions.

## Implementation
- [x] Remove all Dashboard reporting controls and always use the current local month, including older URLs. Keep historical reporting in Analytics.
- [x] Full-width Total Balance followed by Monthly Cash Flow with Money In, Money Out and Net Cash Flow; no Invested metric.
- [x] Accessible eye toggle masks only Total Balance, defaults to visible and remembers the device preference with graceful storage fallback.
- [x] Smaller borderless Refresh/Analytics icons; Refresh is busy only during explicit refresh and until both report requests settle.
- [x] Retain complete spending categories, latest five transactions across all dates, budget and recurring sections.
- [x] Improve authenticated landing header and profile dropdown padding/alignment without authentication changes.
- [x] Verify directly affected existing tests, lint and build. No E2E or full suite.
- [x] Review and commit the update, push to feat/dashboard-redesign and update PR 32 targeting develop without merging.

## Notes
Existing financial strings, formatMoney and all API contracts stay unchanged. Device storage contains only a visibility boolean. Month rollover/focus monitoring and refresh rechecks remain active. Dashboard query metadata is left intact but does not select the reporting month.

## Previous delivery
PR https://github.com/deepakydv25/cointrail/pull/32 is open on feat/dashboard-redesign. Original implementation commit 08132a9 and delivery notes 4738366. Original verification: seven directly affected suites / 121 tests passed, lint/build/diff checks passed with the existing bundle-size warning.

## Update verification
Five directly affected suites / 84 tests passed across targeted runs (Dashboard 19, App 55, dashboard charts 4, landing navigation 3, landing page 3). Lint, production build and git diff --check passed. The existing bundle-size warning remains. Two necessary visibility tests cover preference persistence and storage failure; obsolete period-control tests were replaced with current-month behavior checks. No full suite, backend or E2E tests run.

Update delivered in commit 9fc5398 on the existing feature branch. PR 32 title/description updated; CI for the implementation commit was in progress when checked. The PR remains open and unmerged.
