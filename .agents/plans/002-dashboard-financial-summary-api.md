# Dashboard / Financial Summary API

## Goal

Provide one authenticated, owner-only V2 read endpoint that consolidates financial totals and small activity previews from existing sources of truth. Compute values at read time; do not persist balances, dashboard snapshots, duplicated transactions, or summary totals.

Status: implemented and verified on feature/dashboard-api. D1-D7 are preserved with no unresolved product decisions or business contract deviations. All five implementation phases are complete. Targeted Dashboard tests and full mvn clean verify pass; delivery is proceeding through commit, push and PR creation. No migration was required.

Planning baseline: repository inspected on 2026-10-04, following AGENTS.md and the planning skill, with backend and testing skills consulted for implementation conventions. Existing plans are 000-monthly-budget-api.md and 001-recurring-transactions-backend.md; 002 is the next available number. No production code or tests were changed or executed during planning.

## Existing State

Paths below are relative to the repository root. Java packages reside under `cointrail-api/src/main/java/com/deepak/cointrailapi/`.

### Account and Category

- `account/Account` stores owner, name, BANK/CASH/CREDIT_CARD/WALLET type, signed `openingBalance` (NUMERIC(19,2)), active flag, and timestamps. It has no current balance, currency, opening-balance effective date, credit limit, or account reconciliation model.
- `AccountServiceImpl` lists active accounts; deletion deactivates an account. Opening balance is set on creation and is not changed by account updates. Account updates may change type. Transaction creation/update/deletion does not mutate account balances.
- `AccountRepository` has owner-aware lookup and active-account listing, but no monetary aggregation method. Summing its current response's opening balances alone would not produce a current ledger balance.
- `category/CategoryRepository` and `CategoryServiceImpl` expose active system categories and active owner custom categories. Categories have EXPENSE/INCOME types; custom category deletion deactivates them. Historical Transactions and Budgets retain their category references and remain readable after deactivation.
- Account/Category services resolve authentication name through `UserRepository`. Newer Transaction/Budget/Recurring services use the authenticated `User` principal directly. Follow the newer pattern for Dashboard; do not refactor older services.

### Transaction

- `transaction/Transaction` is the V2 actual financial source: owner, account, category, EXPENSE/INCOME type, positive BigDecimal amount, description, `transactionDate` (DATE), and created/updated timestamps. Account and category associations are lazy.
- `TransactionServiceImpl` validates owner and active account, accessible active category, and matching category/type for writes. Reads preserve historical inactive references. Normal transactions are fully editable and hard deletable.
- `TransactionRepository` extends JpaRepository and JpaSpecificationExecutor. Its only monetary query is `sumExpensesByCategory(userId, categoryIds, from, to)`, returning `CategoryExpenseTotal` projections. It filters owner and EXPENSE, groups by category, and uses inclusive start/exclusive end; it does not filter active account/category state.
- `TransactionSpecification` provides owner, type, account, category, and inclusive date filters. `TransactionServiceImpl.getTransactions(...)` returns a Page, maps account/category names, and does not explicitly fetch those associations in its list repository query. Reusing this pagination route for a tiny preview can add count and association queries; do not load all pages to compute dashboard totals.
- `TransactionResponse` is an existing flat DTO with IDs/names and financial/date fields. Dashboard may use smaller preview records rather than expose entities or refactor this DTO.
- Existing V2 routes use `/api/transactions`, not an `/api/v2` prefix. Manual request dates use `@PastOrPresent` with existing validation clock behavior.

### Budget

- `budget/Budget` stores owner/category/year/month/amount; the category-period key is unique per owner. Budget amount is editable; category and period are immutable; deletion is hard deletion.
- `BudgetRepository.findByUserIdAndYearAndMonthOrderByCategoryIdAscIdAsc(...)` fetches category through EntityGraph. `BudgetService.getBudgets(year, month)` returns `List<BudgetDetails>`.
- `BudgetServiceImpl` obtains monthly spending with one grouped `TransactionRepository.sumExpensesByCategory(...)` call for all budget categories, not one query per budget. An empty budget list avoids the spending query.
- Spending includes ordinary and generated Transactions, on any account including inactive accounts, by transaction date. Only EXPENSE on budgeted categories contributes; income, opening balances, templates, and legacy expenses do not.
- Existing remaining amount is signed `amount - spentAmount`; over-budget means strictly spent > amount (equal spending is not over-budget). These meanings should be reused, including inactive budget category history.
- Existing Budget period validation permits years 1-9999 and months 1-12. Its next-month exclusive boundary is constructed with Java YearMonth. Exercise December 9999 explicitly when implementing new aggregate queries against PostgreSQL; do not silently narrow the dashboard period range or change Budget behavior.

### Recurring Transactions

- `recurringtransaction/RecurringTransaction` stores an owner template and durable `nextDueDate` cursor. Lifecycle states are ACTIVE, PAUSED, BLOCKED, CANCELLED, COMPLETED. Frequencies are DAILY/WEEKLY/MONTHLY/YEARLY, interval one, anchored/clamped by `RecurrenceCalculator`.
- `RecurringTransactionGenerationWorker` materializes due occurrences as ordinary V2 Transactions with scheduled date as transaction date. Template, generated transaction, occurrence marker, and cursor changes commit together. Dashboard actuals must count the Transaction once, never also count the template or occurrence marker.
- Generated Transactions can be edited/deleted normally. Durable occurrence identity survives deletion (`transaction_id` becomes null); deleted actuals disappear from financial totals and must not be treated as pending or regenerated by Dashboard.
- ACTIVE downtime backlog catches up. BLOCKED retains due dates and is automatically rechecked; repaired resources allow chronological catch-up. User PAUSED periods are skipped on resume. Paused cursors are therefore not reliable upcoming commitments. CANCELLED/COMPLETED have null cursors.
- Amount/description edits are rejected while unprocessed occurrences are due; BLOCKED account/category repair does not recover/post inline. A preview shows current template values and persisted cursor, not immutable future transactions or a guarantee of posting.
- `RecurringTransactionRepository` has owner EntityGraph lookup and paginated specification listing. Its `findCandidates(...)` query is GLOBAL, ACTIVE/BLOCKED, due through today, keyset ordered. It is an internal worker query and must NOT be reused as an owner dashboard query. Locking methods are for writes; Dashboard must not acquire generation locks.
- `RecurringTransactionSchedulingConfig` provides qualified `recurringClock` using required `app.recurring.timezone` / RECURRING_TIMEZONE. Worker is configurable and defaults disabled. The approved timezone boundary is recurring only: existing domain timestamps and manual transaction date validation were deliberately not refactored. Deployment must keep this timezone stable.

### Database, security, API and tests

- All migrations V1-V12 were inspected. V1-V5 cover legacy expenses/users; V6-V7 categories/seeds; V8 accounts; V9 transactions; V10 category uniqueness; V11 budgets; V12 recurring templates/occurrences. V12 is currently latest. No summary table or stored current balance exists.
- Useful indexes: accounts(user_id); transactions(user_id, transaction_date), account_id and category_id; budgets(user_id, year, month), unique(owner, category, period); recurring(owner, created_at DESC, id DESC) and (status, next_due_date, id). There is no owner/status/due composite index for the approved recurring preview.
- PostgreSQL amounts use decimal storage; aggregate totals may exceed an individual row's 19-digit precision. Keep BigDecimal end to end; do not round to integers, use doubles, or impose row-value precision limits on sums.
- `common/security/SecurityConfig` authenticates every route except auth and health/info. JWT uses User principal. No user ID belongs in dashboard request or response. Each query needs its own owner predicate; ownership must not rely on joins alone.
- `GlobalExceptionHandler` supports ErrorResponse, missing parameters, binding/method validation (400), expected domain failures, and sanitized unexpected failures (500). Prefer parameter constraints for simple range failures; add a dashboard-specific 400 exception only for service-level failures needing it, rather than reusing InvalidBudgetException semantically.
- Java 25, Spring Boot 4.1.1, Maven, Flyway, PostgreSQL. Backend tests use Mockito service tests, Boot 4 WebMvcTest/MockitoBean controller slices, DataJpaTest/PostgreSQL 17-alpine Testcontainers, and SpringBootTest/MockMvc real JWT integration tests. See Budget and Transaction test suites; Recurring integration tests demonstrate controlled recurringClock and worker posting.
- `cointrail-frontend/src/pages/DashboardPage.tsx` currently reads legacy expense summary and five recent expenses, and displays a category breakdown. It is context only, not a V2 contract or a requirement to duplicate its charts. No frontend change or legacy/V2 data migration is included.

## Business Rules

- [x] Read-only aggregation from existing owner data; no persisted financial duplication, cache infrastructure, write endpoint, generation call, or cursor/lifecycle side effect.
- [x] Mandatory authenticated owner scope for every aggregate and preview; no client-controlled user selection or global totals.
- [x] V2 actuals derive exclusively from `transactions`, including generated rows exactly once. Legacy `expenses` are excluded. Editing/deleting actual Transactions updates the next dashboard response naturally.
- [x] Keep historical inactive account/category activity in month totals and budget spending, consistent with existing Budget behavior (approved D2).
- [x] Use BigDecimal, normalize empty sums to 0.00, preserve negative balances/net flow/remaining amounts, and return empty preview arrays for empty data.
- [x] Net cash flow is income minus expense; do not call this savings, savings rate, available credit, net worth, or reconciled bank balance.
- [x] Balance includes signed opening balances and all persisted actual dates on currently active owned accounts, including CREDIT_CARD without special treatment; no selected-month, today or account-creation-date cutoff. Accept the existing implicit monetary unit without introducing currency modeling.
- [x] Require year and month with no current-month default; valid past/current/future months are actual-only. Selected month affects monthlySummary and budgetSummary, not balance or either activity preview.
- [x] Return at most five recent Transactions across all dates ordered transactionDate DESC, createdAt DESC, id DESC, and at most five ACTIVE/BLOCKED template cursors ordered nextDueDate ASC, id ASC through recurring today + 30 days inclusive, including overdue cursors.
- [x] Use recurringClock only for recurring preview metadata/window/overdue; retain normal read-only READ_COMMITTED behavior, with no locks, snapshots or REPEATABLE_READ.
- [x] Keep period-based actuals and present-day previews explicitly separate. Do not project template amounts into actuals or expand recurrence series into forecasts.
- [x] Implement the approved D1-D7 contract below: one authenticated GET, active-account ledger balance, explicit required period, compact Budget summary, fixed deterministic previews, and normal read-only READ_COMMITTED consistency.

### Approved decisions D1-D7

All seven decisions are resolved by explicit user approval. This table records the implementation contract, not alternatives requiring another decision.

| ID | Decision | Approved contract and consequence |
| --- | --- | --- |
| D1 | Included sections and endpoint | One authenticated GET `/api/dashboard` returns the full response below: period metadata, active-account balance, monthly summary, Budget summary, recent Transactions and pending recurring preview. No separate summary/preview endpoints. Recurring is a pending preview, with no forecast. |
| D2 | Balance semantics, account scope and currency assumption | `totalActiveAccountBalance` = opening balances + all persisted income - all persisted expense attached to currently active owned accounts, across all account types. Include all stored actual dates without an additional today cutoff; selected month does not affect this value. Negative CREDIT_CARD balances participate with their stored sign, with no special debt/credit calculation. This is ledger balance, not bank-reconciled cash or net worth. The current single implicit monetary-unit limitation is accepted; do not introduce currency modeling or invent a currency code. Month totals include all owned accounts/categories even inactive. Opening balance has no effective date, so exclude historical balance snapshots from this feature. |
| D3 | Month selection, defaults and future months | Require both year (1-9999) and month (1-12), matching Budget list, with no implicit current-month default or new application-wide timezone. Allow valid past/current/future selected months; future months show stored actuals only and configured budgets, never forecast income/expense. Months use transactionDate, not createdAt. |
| D4 | Budget summary fields and empty meaning | Include budgetCount, totalBudgetAmount, spentOnBudgetedCategories, remainingBudgetAmount and overBudgetCount. Preserve signed remaining and per-category strict over-budget comparison. Empty month: count/amounts all zero. Clearly distinguish budgeted-category spending from total month expense; no combined overall overBudget flag, percentage or category breakdown. |
| D5 | Recent transaction scope, size and ordering | Latest five owned Transactions across all dates, independently of selected month; order transactionDate DESC, createdAt DESC, id DESC. Include income/expense and inactive historical references. This is latest financial dates, not latest edits. Fixed preview, no client sort/pagination/limit knobs; existing Transaction API supports drill-down. |
| D6 | Upcoming/pending recurring visibility and date window | Include earliest five template cursors in ACTIVE or BLOCKED through recurring today + 30 days inclusive, with no lower date bound so overdue backlog is visible. One row per template, ordered nextDueDate ASC, id ASC; include both income and expense. Exclude PAUSED/CANCELLED/COMPLETED. Name section `pendingRecurringTransactions` because it includes overdue and blocked work. Expose status, blockedReason and overdue flag (date < today); due today is not overdue. Do not hide BLOCKED resources by filtering account/category active state. Use existing recurringClock solely for this recurring preview, capture today once, and return its asOfDate/throughDate/timezone. A stale ACTIVE template may become BLOCKED on the next worker run; do not promise resource eligibility. |
| D7 | Cross-section read consistency | Use normal @Transactional(readOnly = true) READ_COMMITTED behavior: each query reads committed data; concurrent edits/posting can briefly produce differences between sections within a response. No locks, snapshots, persisted summaries, REPEATABLE_READ or guarantee of worker catch-up. |

### Approved response contract

```text
DashboardResponse
  year, month
  totalActiveAccountBalance: decimal
  monthlySummary
    income: decimal
    expense: decimal
    netCashFlow: decimal
  budgetSummary
    budgetCount: integer
    totalBudgetAmount: decimal
    spentOnBudgetedCategories: decimal
    remainingBudgetAmount: decimal
    overBudgetCount: integer
  recentTransactions: list (0..5)
    id, type, amount, description, transactionDate
    accountId, accountName, categoryId, categoryName
  pendingRecurringTransactions
    asOfDate, throughDate, timezone
    items: list (0..5)
      id, type, amount, description, frequency, nextDueDate
      accountId, accountName, categoryId, categoryName
      status, blockedReason (nullable), overdue
```

Names above are approved new DTO fields, not existing repository methods. Monetary fields are JSON numbers following existing APIs; clients must handle decimal money appropriately. Names are current referenced names, not new historical name snapshots. Preview totals/count-of-all-matching rows, hasMore and pagination metadata are omitted under approved D1/D5/D6. Existing paginated `/api/transactions`, `/api/recurring-transactions`, and monthly `/api/budgets` remain detailed domain endpoints.

## Phase 1 - Database / Domain

- [x] Implement the domain/detail DTOs against the approved D1-D7 contract; preserve its fields, temporal scopes and exclusions throughout all phases.
- [x] Create a `dashboard` package following existing domain layout, with service/detail and response records. Do not create a Dashboard entity, balance field, occurrence projection table or persisted summary.
- [x] Define year/month validation and month-start/next-month-start range. PostgreSQL DATE supports year 10000 as an exclusive boundary for December 9999; verify driver/JPA binding against the real database rather than assume Java-to-SQL handling. Keep preview horizon arithmetic within recurring dates through 9999-12-31, clamping its upper bound if needed.
- [x] No Flyway migration is expected for correctness. Evaluate query plans after queries exist using representative data. If an index is justified, re-inspect latest versions and add a new migration (currently next V13), never alter V8/V9/V11/V12. Record evidence and scope; no speculative index/cache infrastructure now.

## Phase 2 - Repository / Service

- [x] Add owner-scoped scalar SUM of active-account opening balances to AccountRepository. Do not load account collections for this calculation.
- [x] Add a TransactionRepository projection query for signed totals on active owned accounts, constrained by both Transaction owner and Account owner/active. All dates under approved D2, with no selected-month or today cutoff. Combine its income-minus-expense with the independent opening SUM. Never sum opening balances after a one-to-many transaction join, which would multiply opening balances; include accounts with no transactions through the independent SUM.
- [x] Add one owner/month TransactionRepository grouped-by-type or conditional-SUM aggregate for monthly income and expense. Use `[monthStart, nextMonthStart)`, no account/category active filter, no YEAR/MONTH function on transactionDate, and no full Transaction collection. Missing income/expense groups map to zero. Calculate net flow in service.
- [x] Reuse `BudgetService.getBudgets(year, month)` and reduce BudgetDetails into the compact summary. This loads the selected month's budget records and grouped expense totals only, not full Transactions, and preserves Budget semantics. Do not reimplement per-budget spending or query one category at a time. If scale later warrants direct summary projections, treat that as measured optimization with equivalent tests, not an additional initial design.
- [x] Add owner-limited recent Transaction query with the approved order and fixed PageRequest limit, returning List/projection (no Page/count query). Fetch account/category names in the same projection/query or to-one EntityGraph to avoid N+1; no collection fetch joins.
- [x] Add a NEW owner-scoped pending recurring query matching D6, with fixed List/projection limit and names/status/cursor in one query. Do not reuse global findCandidates or invoke worker/resources validation. No locks, state changes, recurrence expansion, or occurrence-table scan are needed for this cursor preview.
- [x] Implement DashboardService / DashboardServiceImpl using constructor injection and normal @Transactional(readOnly = true) READ_COMMITTED behavior (D7), with no locks, snapshots or REPEATABLE_READ. Derive authenticated User from SecurityContext as Budget/Transaction do. Map aggregates/projections to immutable detail DTOs; current user ID is internal only.
- [x] Capture recurring date once from qualified recurringClock for horizon/overdue, without extending that clock to financial month selection, account balance, other service timestamps or manual transaction validation. Document timezone stability and the existing midnight compatibility boundary: a valid recurring generated date can be ahead of JVM-local manual date validation.
- [x] Keep aggregate precision; null sums become 0.00. No-budget summaries are zero regardless of non-budgeted month expenses. Calculate overBudgetCount from each existing BudgetDetails.overBudget, not net aggregate remaining.

### Expected query shape and efficiency

| Section | Source | Expected data queries |
| --- | --- | --- |
| Active account balance | New Account opening SUM + Transaction signed aggregate joining active owned accounts | 2 scalar/projection queries |
| Month income/expense/net | New owner/date-range Transaction aggregate | 1 query |
| Budget summary | Existing BudgetService/BudgetRepository + sumExpensesByCategory | 1 budget query + 1 grouped spending query, or only 1 when no budgets |
| Recent actuals | New owner-limited Transaction query with names | 1 bounded query, no count |
| Pending recurring | New owner/status/cursor-range query with names | 1 bounded query, no count |

Approved contract: approximately seven data queries with budgets, six without, excluding security/UserDetails loading and framework overhead. Number of queries must not grow per transaction, account, budget or preview row. Only the budget collection grows with the number of budgets in that selected month; both previews are bounded, and transaction totals stay in PostgreSQL.

Inspect EXPLAIN (ANALYZE, BUFFERS) against representative owner distributions/history for monthly aggregates, active-account aggregation and deterministic preview sorts. Existing owner/date and budget-period indexes are relevant; all-time balances inherently require reading relevant ledger data. Small table sequential scans are not proof an index is missing. In particular evaluate owner/status/due ordering for recurring, and transaction date ties, before proposing a new index. Do not set arbitrary latency guarantees from small test fixtures.

## Phase 3 - API

- [x] Implement thin authenticated DashboardController GET `/api/dashboard?year=2026&month=10`, returning 200 DashboardResponse. Both year and month are required, with no default; valid past/current/future periods are accepted. Jakarta method constraints follow BudgetController; service validation also protects non-HTTP calls.
- [x] Missing/malformed/out-of-range periods return existing ErrorResponse-style 400. Introduce InvalidDashboardException plus a GlobalExceptionHandler 400 handler only if needed for service validation. Do not add a dashboard not-found result for an owner with no data: return zero summaries and empty previews.
- [x] Preserve current JWT authentication (missing/invalid token 401) with no public dashboard matcher or client userId. There are no owner-selecting resource IDs or alternate-owner endpoints in this contract.
- [x] Map detail records to response DTOs as Budget/Recurring do; never serialize JPA objects, User, associations or internal exception details.
- [x] Document every field's temporal scope and exclusions, fixed limits/order, decimal handling, pending cursor semantics, timezone boundary, worker lag/disabled behavior, and consistency approved in D7. GET does not synchronously process outstanding recurring work.

## Phase 4 - Testing

- [x] DashboardServiceImplTest: authenticated user/invalid principal, period validation, empty totals, exact decimal/negative calculations, budgeted vs all expense distinction, zero/equal/over-budget cases, DTO mapping, deterministic window/overdue calculation using controlled recurringClock. Exercise maximum date boundary without extending clock scope.
- [x] DashboardControllerTest: Boot 4 WebMvcTest with mocked service/JWT dependency following BudgetControllerTest; valid response shape, decimals/empty arrays/null blocked reason, required/malformed/out-of-range year/month, no service call for binding failures. Do not mistake filters-disabled controller slices for authentication evidence.
- [x] DashboardRepositoryTest covers Account/Transaction queries with real PostgreSQL aggregates: owner isolation, signed opening balances, active/inactive accounts, account with zero/multiple Transactions (no duplicated opening balance), income/expense, inactive category history, exact month boundaries/leap February/December 9999, SUM beyond individual monetary precision, and bounded recent ordering including equal date/time IDs. Clear persistence context to detect association query issues.
- [x] DashboardRepositoryTest covers Recurring queries for owner/status/window predicates, overdue/today/horizon boundary, BLOCKED inclusion, PAUSED/CANCELLED/COMPLETED exclusion, deterministic tie IDs and fixed limit. Do not use global worker candidates as a dashboard fixture shortcut.
- [x] DashboardIntegrationTest: SpringBootTest/MockMvc/JWT/PostgreSQL Testcontainers with test profile and scheduler disabled. Validate owner A and owner B receive only their own data, missing/invalid JWT 401, and empty owner data returns 200. Real account/category/budget/Transaction data proves cross-domain calculations.
- [x] Exercise valid past/current/future selected months, no implicit period default, and actual-only future totals. Changing selected month changes only monthly/Budget summaries; ledger balance and recent/pending preview scopes remain independent. Include actual dates before account creation and credit-card signed balances to prove D2 without a hidden cutoff or type-specific calculation.
- [x] Prove recurring horizon is inclusive at today + 30 and excludes day + 31; overdue is strictly before today. BLOCKED entries retain visibility with inactive referenced resources, and preview metadata uses the controlled recurringClock zone even when it differs from the JVM zone. Enforce both five-item caps with more than five matching rows.
- [x] Verify read-only Dashboard does not acquire generation locks, invoke worker recovery, persist summaries or alter isolation to REPEATABLE_READ. Under approved READ_COMMITTED, do not assert one cross-query snapshot or synchronous catch-up during concurrent writes.
- [x] Prove actual Transaction edits/deletion, date/account reassignment, and account/category deactivation have the approved effects on next summary. Include negative active balance and budget equality/mixed over-budget categories.
- [x] Create a recurring template: preview present but actual totals unchanged. Invoke real worker deliberately in test: actual totals include generated row exactly once and pending cursor advances. Delete generated Transaction: actual totals decrease; durable marker prevents regeneration; GET leaves cursor/occurrences/lifecycle unchanged. Test BLOCKED backlog and PAUSED exclusion without changing existing lifecycle rules.
- [x] Observe SQL/statistics for a representative populated request to verify bounded preview reads, no per-row queries/count queries, and aggregates rather than full transaction materialization. Compare small/larger fixtures for query-count growth; avoid fragile assertions on incidental authentication SQL or an exact provider-specific query order.
- [x] Integration cleanup respects occurrence -> recurring template -> budget/Transaction -> account/custom category -> User dependencies and preserves system category seeds. Existing Recurring tests demonstrate this ordering and clock mocking; tests must be independent of execution order.

## Phase 5 - Verification

- [x] Run targeted new/changed service, controller, repository and integration tests from cointrail-api while implementing.
- [x] Run `mvn clean verify` with required Java 25 and working Docker/PostgreSQL Testcontainers. Verify existing domains remain green.
- [x] Review the complete diff: no unrelated refactor, frontend work, existing migration edits, AGENTS.md/skills edits, worker behavior/security changes or persisted financial duplication.
- [x] Review aggregation owner filters, decimal correctness, dates/maximum boundary, bounded query behavior and response names/scopes against approved D1-D7. Check representative query plans where optimization is proposed.
- [x] Update this plan only for work actually implemented and verified; record final contract, file changes and verification evidence. Commit, push and PR creation targeting develop are authorized by the user's feature-delivery instruction; do not merge.

## Expected Files

Implementation note: new aggregate and preview queries are tested together in DashboardRepositoryTest using shared DashboardFixtures, rather than modifying three existing domain repository suites. This keeps the cross-domain read contract and SQL-count checks together without changing existing tests or product behavior.

Implemented names follow existing domain service/implementation/controller and record DTO patterns. The files listed below now exist; optional migration work was not needed.

- New under `cointrail-api/src/main/java/com/deepak/cointrailapi/dashboard/`: DashboardService.java, DashboardServiceImpl.java, DashboardController.java, DashboardDetails.java and `dto/DashboardResponse.java`; compact nested records may represent sections/previews without one file per field group.
- New TransactionTypeTotal.java aggregate projection, plus query methods in AccountRepository.java, TransactionRepository.java and RecurringTransactionRepository.java. Bounded previews use to-one EntityGraphs rather than additional projection interfaces.
- New `common/exception/InvalidDashboardException.java` and a GlobalExceptionHandler.java 400 handler for service-level period validation.
- New `cointrail-api/src/test/java/com/deepak/cointrailapi/dashboard/`: DashboardServiceImplTest.java, DashboardControllerTest.java, DashboardIntegrationTest.java.
- New DashboardRepositoryTest.java and shared DashboardFixtures.java exercise all newly added cross-domain queries; existing domain repository suites remain unchanged.
- Optional new index migration only with evidence and rechecked numbering; none expected by default. No new entity/table, application-wide Clock/configuration, frontend changes or changes to existing domain write contracts.
- Updated this plan and added `cointrail-api/DASHBOARD_API.md` documenting the approved contract and compatibility boundaries.

## Implementation Notes

### Dashboard versus future Analytics

Dashboard supplies one selected-month summary plus current bounded operational previews. Existing domain list APIs provide drill-down; this feature does not introduce another transaction-search API.

Future Analytics owns category/account breakdown charts, day/week/month time series, custom ranges and comparisons, trends, savings rates/ratios, budget history, recurring series forecasts, historical balances/net worth, exports, and richer filtering/pagination. These need separate contracts and potentially further query/index work. Currency conversion, bank reconciliation/execution, transfers, notification delivery and frontend work are also excluded. Existing legacy category chart does not bring V2 detailed Analytics into this scope.

### Compatibility and correctness boundaries

- Reads do not alter schedules, repair resources, generate due occurrences or reconstruct missing deleted transactions. Persisted cursors are operational state, not a forecast of all dates within a month. Scheduled financial data becomes actual only after worker commit; eventual catch-up/disabled worker may leave dashboard actuals incomplete relative to pending commitments.
- Avoid misleading alignment: selected month applies only to monthlySummary and budgetSummary; balance and recent actuals are all-ledger/current-active scopes, and recurring preview is relative to recurring today. Include explicit recurring preview dates to make this visible.
- No current balance effective date exists, so backdated transactions before account creation still participate under D2. Do not invent a cutoff from createdAt or silently change account business rules.
- All queries scope owner independently; the active-account transaction aggregate additionally scopes account owner. Historical category names follow current existing references, without new snapshots.
- Per-user timezone, global date-validation refactoring, monetary unit fields and legacy Expense migration remain excluded. Feature branch work, tests, commits, push and PR creation are authorized for this delivery.

### Implementation readiness and remaining decisions

D1-D7 are approved and resolved. No genuinely unresolved product decision is required before implementation; this plan is implementation-ready. The separation between Dashboard and future Analytics remains unchanged. Query syntax, projection layout, maximum-date binding verification and evidence-based index tuning remain normal implementation choices within the approved contract. If implementation reveals a material API, schema, security or business-rule change is necessary, stop for approval rather than change this contract. The subsequent user delivery instruction authorizes implementation, tests, commit, push and PR creation targeting develop; merging remains excluded.


## Execution evidence

- Base: feature/dashboard-api HEAD initially matched fetched origin/develop at ecdec35 (merged Recurring PR #13). Plan 002 was the only existing uncommitted file.
- Phases 1-3: nested immutable detail/response records, domain exception, owner-scoped aggregate and EntityGraph bounded-list queries, read-only service and GET API implemented. Compilation passed with Java 25.0.4.
- Phase 4 targeted run: DashboardServiceImplTest 10, DashboardControllerTest 10, DashboardRepositoryTest 6, DashboardIntegrationTest 9; all pass, zero failures/errors/skips. December 9999 binds an exclusive 10000-01-01 boundary successfully, including Budget spending. Preview queries each use one statement; a complete populated service read stays at seven statements after additional transactions/accounts/categories/templates, with no writes.
- EXPLAIN (ANALYZE, BUFFERS), PostgreSQL 17, fixture of 5,000 Transactions and 1,000 recurring templates: monthly aggregation used an existing date index; recent preview used backward idx_transactions_user_date plus incremental sorting; recurring preview used a top-N sort. Local execution times were approximately 0.215 ms, 2.275 ms, 0.525 ms and 1.744 ms for monthly, all-ledger, recent and pending queries respectively. These are diagnostic fixture results, not production guarantees. No evidence requires another index, so no Flyway migration was added or modified.
- Layout choices within scope: nested section records are shared by internal DashboardDetails and the explicit DashboardResponse boundary; TransactionTypeTotal is the sole new aggregate projection. Repository coverage is grouped in DashboardRepositoryTest rather than editing existing domain suites. No business contract deviation.
- Final mvn clean verify: BUILD SUCCESS, 412 tests, zero failures/errors/skips; 35 Dashboard tests plus the 377 existing tests. Java 25.0.4/Maven 3.9.4/PostgreSQL 17 Testcontainers; completed 2026-10-04 18:20:06 +05:30 (6:15). Includes the minimum year 1 date-binding check added during final review.
- Complete feature diff reviewed: only Dashboard domain/DTO/service/controller, three repositories, aggregate projection, Dashboard exception handler, tests/fixtures, API documentation and this plan. No frontend, legacy functionality, AGENTS.md, skills, existing migration, security-rule or worker changes. git diff --check passes. D7 uses default read-only transaction behavior; no locking or persisted Dashboard data.
- Delivery: conventional commit feat: add dashboard API; push feature/dashboard-api and create concise PR targeting develop, following recent feature PR #13. Final commit/PR identifiers and CI status are reported in the delivery completion report; the PR must not be merged.
