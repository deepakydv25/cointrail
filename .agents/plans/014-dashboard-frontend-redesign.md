# Dashboard frontend redesign

## Authorization and scope
The user explicitly approved this redesign and delivery. Frontend only: preserve APIs, authentication, currency precision, reporting URLs, Analytics and sidebar behavior.

## Existing state
DashboardPage owns period validation and rolling calendar behavior. CategorySpending independently fetches category analytics. FinancialRow uses CategoryIcon. Navbar owns the app logo and PublicLandingNavigation owns landing actions.

## Implementation
- [x] Compact header, period controls and accessible Refresh/Analytics icons.
- [x] Compact exact metrics; replace charts with every spending category sorted by exact amount, icons and percentage bars.
- [x] Preserve recent transactions, budget and recurring behavior in the requested responsive order.
- [x] Logo routes to landing; authenticated profile disclosure contains Dashboard and Logout.
- [x] Verify directly affected existing tests, lint and build. No E2E or full suite.
- [ ] Review scope, commit, push and open one PR targeting develop without merging.

## Notes
Reuse existing minorUnits for sorting and bounded presentation percentages from displayed category spending; preserve financial strings and formatMoney. Keep Apply/Current month actions to preserve reporting URL and rolling-calendar behavior.

Verification: seven directly affected existing suites, 121 tests passed across targeted runs; lint, build and diff whitespace check passed. Existing bundle-size warning remains. Backend and E2E tests were not run.
