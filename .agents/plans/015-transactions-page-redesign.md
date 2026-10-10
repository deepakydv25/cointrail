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
