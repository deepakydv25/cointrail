# Budgets page redesign

## Goal
Implement the user-approved frontend Budgets redesign on feature/budgets-page-redesign from latest origin/develop. Deliver one PR to develop without merging.

## Existing state
BudgetsPage loads exact BudgetResponse strings from getBudgets; details already provide guarded deletion with ConfirmationPanel. Period helpers validate years 1-9999 and normalize month/year query values. Dashboard API exposes a backend budgetSummary with totalBudgetAmount, spentOnBudgetedCategories and remainingBudgetAmount. Shared Icon renders inline SVG; no Lucide package is installed.

## Business rules
- Preserve backend limits, spending, remaining values and overBudget flags. Use existing Dashboard budgetSummary for overview totals scoped to configured budgets; no frontend monetary aggregation.
- Reuse existing minorUnits only for utilization ratios; clamp visual bars to 100% but retain actual over-budget percentage. Keep formatMoney unchanged.
- Default current browser-local month at /app/budgets without URL mutation. Previous/Next update normalized year/month while retaining unrelated parameters. Support rollover and browser history; disable at validated calendar boundaries.
- Preserve creation/details/edit routes and explicit delete confirmation. Abort stale period reads and ignore mutations after unmount/session replacement.
- No backend/API/dependency/auth/precision utility changes. Reuse shared SVG Icon with official Lucide geometry and attribution for requested sidebar icons because there is no installed library.

## Implementation
- [x] Compact month navigation and labeled refresh icon; remove large period form, dashboard link and technical header description.
- [x] Backend overview totals and utilization; compact category cards and actions menu using existing components.
- [x] Centered empty state with first-budget action and retained month navigation; hide overview/refresh for empty months.
- [x] Distinct requested sidebar SVG icons; preserve navigation/collapse/mobile behavior.

## Verification and delivery
- [x] Update directly affected existing Budgets and AppShell assertions; add only essential new regression coverage where existing cases cannot cover behavior.
- [x] Run affected existing tests, frontend lint/build, review diff. No E2E/full suite or Maven for frontend-only changes.
- [ ] Commit, push requested branch, open one PR to develop, inspect CI. Never merge.

## Expected files
BudgetsPage.tsx; budget-specific presentation components if needed; components/ui/Icon.tsx; components/Navbar.tsx; index.css; budgets.test.tsx; AppShell.test.tsx; Lucide SVG license attribution.

## Verification results
Two affected suites: 41 tests passed. Existing assertions updated for default URL, month/year rollover/history, exact overview values, actual/capped utilization, empty state and distinct decorative navigation icons. One necessary new list-menu regression covers edit context, delete cancellation/focus, failure/retry and refreshed backend summary. Frontend lint/build and diff whitespace check passed; existing bundle-size warning remains. No backend, full suite or E2E tests run. No service, financial utility, dependency or authentication files changed.
