# Transactions page redesign

## Authorization and scope
Implement the user-approved Transactions list redesign on feature/transactions-page-redesign from latest develop. Frontend only. Preserve server filtering/pagination, exact amounts, query navigation, authentication and existing Create/Details pages.

## Existing state
TransactionsPage requests a backend TransactionPage using transactionQuery and independently loads account/category choices. FinancialRow already uses CategoryIcon. Filters are always visible and pagination currently appears even for empty or single-page results.

## Implementation
- [x] Clean first-use empty state with prominent creation action and no filters/pagination. Filtered emptiness offers Clear filters.
- [x] Group transaction-date sorts by calendar date with Today/Yesterday/full-date headings. Preserve explicit ascending sort; default remains newest first. Non-date sorts remain a simple server-ordered list.
- [x] Collapsed Filters disclosure, all existing controls, visible active filters and clear action. Preserve unrelated query parameters when applying/clearing filters.
- [x] Whole-row detail navigation with existing FinancialRow and CategoryIcon; exact money remains unchanged.
- [x] Compact accessible arrow pagination only for nonempty multiple-page results.
- [x] Directly affected existing tests, lint, build and diff review. No E2E or full suite.
- [x] Commit, push and open one PR to develop; do not merge.

## Expected files
cointrail-frontend/src/pages/transactions/TransactionsPage.tsx
cointrail-frontend/src/pages/transactions/transactions.test.tsx
cointrail-frontend/src/index.css

## Notes
Use existing filtered total metadata to distinguish first-use emptiness from no matches without extra API calls. Group only the currently returned server page; do not fetch or reorder other pages. Calendar dates are formatted without timezone shifts. Out-of-range empty pages offer clear/reset instead of pagination, per requested zero-result rule.

## Verification
Transactions UI and existing transport/query suites: 2 suites / 69 tests passed. Existing filter tests now open the disclosure and verify query metadata, pagination and no-match recovery. Two necessary list cases cover first-use emptiness and date groups/one-page pagination/detail navigation. Frontend lint, production build and git diff --check passed; existing bundle-size warning remains. No full suite, E2E or backend tests run.

## Delivery
Implementation commit bc7492b pushed on feature/transactions-page-redesign. PR https://github.com/deepakydv25/cointrail/pull/33 targets develop and remains open/unmerged.

## Approved compact-layout revision
The user requested an update on the existing branch and PR 33. Keep financial calculations, APIs, query behavior and unrelated pages unchanged.
- [x] Compact FinancialRow option used only by Transactions: small category icon, description title, inline category/account metadata, no visible type badge and right-aligned colored exact amount.
- [x] Compact filter panel in Type/Account/Category then From/To/Sort order; Clear all header action, bottom-right Apply, auto-collapse and trigger focus.
- [x] Removable active-filter chips resetting page to zero while preserving remaining query parameters.
- [x] Page size outside the panel beside pagination; preserve custom sizes and existing active query values.
- [x] Directly affected existing tests, lint/build and diff review; no E2E/full suite.
- [ ] Commit/push updates and revise existing PR 33 without creating or merging a PR.

Latest user refinements: show the three-horizontal-line sliders glyph beside the visible Filter label. Group headings show the month/year and Today/Yesterday with day/month (for example October 2026 then Today - 10 October). Expenses use a visual minus prefix and income a plus prefix, retaining the exact currency formatter and decimals. No financial data or calculations change.

Compact revision verification: 3 directly affected suites / 89 tests passed across targeted runs (Transactions 38, transport/query 31, UI foundation 20). The initial parallel run had one 5-second filter journey timeout; it passed unchanged in isolation and in serial Transactions runs. Final Transactions suite: 38 passed with one worker after final layout/icon changes. No new test cases or increased timeouts. Existing assertions updated for signed amounts, date/month headings, labels, removable chips, page-size placement and auto-collapse/focus. Final lint, production build and diff whitespace check passed; existing bundle-size warning remains.
