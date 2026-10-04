# Analytics API

## Goal

Provide authenticated historical analysis of actual V2 Transactions: overall income, expense, net cash flow and count; category/account breakdowns; time series; and period comparison. Calculate results in PostgreSQL from existing financial records without persisting Analytics data.

Status: implementation complete on feature/analytics-api. A1-A7 and calendar rules are preserved. All 62 targeted Analytics tests pass; final mvn clean verify passed 474 tests with zero failures/errors/skips and BUILD SUCCESS. All five implementation phases are complete; commit/push/PR delivery follows final diff review.

## Existing State

Investigation baseline: current local HEAD `f2bdf80`, merge of Dashboard PR #14, following merged Budget and Recurring work. Working tree was clean before this plan. Existing plans 000-002 make 003 the next available number. Read AGENTS.md and planning skill; consulted spring-backend-feature and testing skills for prospective implementation. Paths are repository-relative; Java packages are under `cointrail-api/src/main/java/com/deepak/cointrailapi/`.

### Actual financial sources and domain semantics

- `transaction/Transaction` stores owner, account/category references, positive NUMERIC(19,2) amount, INCOME/EXPENSE type, DATE transactionDate, description and timestamps. Both referenced associations are lazy. `TransactionServiceImpl` obtains the authenticated User principal, validates account ownership/active state and accessible active category/type for writes, and permits normal edits and hard deletion. Its historical reads do not remove inactive references.
- `TransactionSpecification` has owner/type/account/category predicates and inclusive from/to dates. `TransactionController` uses ISO DATE binding and owner-only paginated GET `/api/transactions`; its date bounds are optional and it rejects reversed ranges. This is the existing drill-down API, not an aggregation engine.
- `TransactionRepository` at the investigation baseline had: `sumByTypeForPeriod(userId, from, to)` returning TransactionTypeTotal (type/amount) with inclusive start/exclusive end; `sumExpensesByCategory(...)` returning CategoryExpenseTotal for Budget; `sumActiveAccountNetFlow(...)` for Dashboard balance; and a bounded EntityGraph recent list. It did not yet have a transaction-count aggregate, full category/account breakdown, trend or comparison query; Analytics now adds these projections without changing the existing methods. Reusing paginated entity lists to sum Analytics would be inefficient and incorrect across pages.
- `account/Account` stores signed openingBalance and BANK/CASH/CREDIT_CARD/WALLET type, with active flag. Opening balance is immutable through normal updates; type/name can change, deletion deactivates. AccountRepository has active opening SUM and owned lookup including inactive accounts. There is no currency, opening effective date, historical balance snapshot or bank reconciliation model. Analytics account breakdown should measure period activity, not account balance or opening amounts.
- `category/Category` distinguishes global system categories (null owner) and owner custom categories. CategoryServiceImpl renames custom categories, preserves type, and deactivates custom categories on deletion. Names and active state are current metadata, not historical snapshots. CategoryRepository's public lookups generally require active state; do not use these to drop historical Analytics groups. Group by stable IDs, not category names: multiple owners and system/custom categories can have similar names.
- `budget/BudgetServiceImpl.getBudgets(year, month)` uses BudgetRepository's category EntityGraph plus ONE grouped expense query for all relevant categories. Spending includes actual expense transactions on inactive accounts/categories; remaining is signed and over-budget is strictly spent > limit. Budgets are category/month limits, not actual income/expense. There is no demonstrated need to repeat Budget summaries in this Analytics contract.
- RecurringTransactionGenerationWorker atomically posts ordinary Transactions with the scheduled occurrence date as transactionDate; persisted template/cursor/occurrence identity is operational state. Count generated Transactions once, through the actual table. Editable/deletable generated actuals affect historical analysis just like manual actuals. A deleted actual's durable occurrence marker is not an expense and must not resurrect it. Worker downtime/BLOCKED catch-up can add backdated actuals later; user-paused dates are skipped. Analytics does not invoke the worker or project templates.

### Dashboard boundary and available reuse

- `/api/dashboard?year=...&month=...` returns one monthly actual summary plus Budget summary, current active-account ledger balance and five-item recent/pending previews. `DashboardServiceImpl` combines independent opening/transaction SUMs, reuses Budget service and uses qualified recurringClock only for the pending preview. It uses normal read-only READ_COMMITTED semantics.
- DashboardDetails/response records show the existing internal detail -> API DTO mapping convention. Dashboard's grouped-by-type projection can inform new queries, but lacks counts; its active-account balance query is unsuitable for Analytics historical totals because it excludes inactive accounts and includes a different financial scope.
- Reuse Transaction semantics and query patterns, not Dashboard service orchestration or its previews. Do not change Dashboard fields/queries or expand this work into shared generic reporting infrastructure.
- Analytics dates are already financial calendar dates, not instants. No application-wide or per-user timezone is needed for explicit range filtering or date buckets. RecurringClock and existing manual @PastOrPresent/timestamp behavior remain untouched.

### Schema, indexes and testing

- Inspected Flyway V1-V12: V1-V5 legacy Expenses/users, V6-V7 categories/seeds, V8 accounts, V9 transactions, V10 category uniqueness, V11 budgets, V12 recurring templates/occurrences. Dashboard added no migration; V12 is latest. Existing applied migrations must remain unchanged. No Analytics table/view/cached aggregate exists or is required.
- V9 provides transactions(user_id, transaction_date), user_id, account_id, category_id and transaction_date indexes. V8 indexes account ownership; Budget and Recurring indexes are not Analytics activity indexes. DATE, type, required FKs and positive decimal amount support direct grouping/counting without new financial invariants.
- DashboardRepositoryTest verifies owner/date aggregates, inactive history, decimal SUM beyond individual row precision, year 1 and December 9999 with an exclusive year-10000 bound, and no N+1 preview queries. DashboardIntegrationTest verifies real JWT, live edits/deletes, generated actuals, seven bounded data queries, and EXPLAIN with 5,000 Transactions. Those diagnostic timings do not establish performance for new Analytics grouping workloads.
- Existing service tests use MockitoExtension, User principal and SecurityContext cleanup. Controller slices use Boot 4 WebMvcTest, MockitoBean/JWT mock and filters disabled; authentication is proven by real-JWT integration tests. Repository suites use DataJpaTest, PostgreSQL 17-alpine Testcontainers/ServiceConnection and real Flyway migrations. Integration suites use SpringBootTest/MockMvc, Jackson 3 (`tools.jackson`), scheduler-disabled test profile and explicit dependent-row cleanup.
- Java 25, Spring Boot 4.1.1, Maven, Flyway 12.8.1/PostgreSQL. The recorded merged Dashboard verification passed 412 tests; the implementation verification result is recorded below.
- SecurityConfig permits auth and health/info only; new `/api/analytics/**` stays authenticated automatically. GlobalExceptionHandler maps binding/missing/method-validation failures to ErrorResponse 400 and sanitizes unexpected 500 failures. Analytics service errors should use a new domain-specific 400 exception, not InvalidDashboardException or InvalidBudgetException.

## Business Rules

- [x] Derive owner ID exclusively from authenticated User; scope every query/subquery by Transaction owner. No client userId, global aggregate, public endpoint or JPA entity serialization.
- [x] Calculate actuals from V2 transactions only; exclude legacy Expenses, account opening balances, Budget limits, recurring templates/cursors/occurrence markers and hypothetical future postings.
- [x] INCOME and EXPENSE remain positive totals; netCashFlow = income - expense may be negative. transactionCount counts persisted rows of BOTH types, not categories or occurrences and not monetary units.
- [x] Include inactive historical account/category references. Edits, deletion and worker-posted backdated actuals affect subsequent reads; this is live analysis of the current ledger, not an immutable audit history.
- [x] Use BigDecimal and database SUM/count projections; normalize empty money to 0.00 and counts to 0. Use long counts. Preserve aggregate precision beyond individual NUMERIC(19,2) values; never cast SUM back to NUMERIC(19,2) or use floating-point money.
- [x] Retain current implicit single monetary-unit limitation, no currency field/conversion, savings metric, net worth or reconciliation semantics.
- [x] Implement approved A1-A7 below, with endpoint/grouping-specific limits: five calendar years for summary/categories/accounts and each comparison range; 366 inclusive days for DAILY trends, two calendar years for WEEKLY trends, five calendar years for MONTHLY trends. Apply the precise anniversary-boundary rule below.
- [x] Require explicit inclusive dates and grouping where applicable, retain current metadata/inactive history, produce complete ordered breakdowns and zero-filled clipped buckets, and preserve raw signed comparison deltas and normal read-only READ_COMMITTED behavior.

### Approved decisions A1-A7

All seven decisions are resolved. The following table records the approved implementation contract.

| ID | Decision | Approved contract |
| --- | --- | --- |
| A1 | Endpoint and filter scope | Five GET endpoints under `/api/analytics`: summary, categories, accounts, trends, comparison, as below. No optional accountId/categoryId/type filters, top-N, client sort, pagination or all-in-one endpoint. Both financial types are represented. Existing Transaction list supports drill-down. This avoids adding selector ownership/error contracts and computing unused sections. |
| A2 | Date ranges and guardrail | Require explicit ISO `from` and `to`, inclusive dates within years 1-9999; from <= to, same-day valid. Summary/categories/accounts and each explicit comparison range allow up to five calendar years independently. Trends limits depend on required grouping: DAILY <=366 inclusive days, WEEKLY <=two calendar years, MONTHLY <=five calendar years. Calendar-year limits use the precise exclusive anniversary rule below. No default current period or unbounded all-time range. Permit valid future dates but return stored actuals only, consistent with Dashboard, without clock-based rejection or forecasting. No universal day cap applies; use calendar-date limits rather than approximate 730/1825-day constants. |
| A3 | Breakdown content, ordering and metadata | Return all groups having at least one matching actual, no zero-activity groups and no truncation. Each group has stable ID, current name/active metadata and totals (income, expense, netCashFlow, transactionCount). Categories also include categoryType/system; accounts include current accountType. Sort categoryId/accountId ascending for deterministic output, not spending rank. No shares/percentages or opening/current balances. Include all inactive history. Names/account type reflect current metadata even for older Transactions; no new snapshots. |
| A4 | Trend grouping and gaps | Require grouping=DAILY/WEEKLY/MONTHLY; no implicit grouping. Calendar weeks start Monday, months on day 1. Return ascending date buckets including zeros for gaps, with edges clipped to requested dates. All buckets have explicit inclusive from/to and the four totals. No fiscal calendar, YEARLY grouping, rolling intervals or cumulative balances. Approved A2 limits yield at most 366 DAILY, 106 WEEKLY or 61 MONTHLY buckets, including clipped edge buckets. These are derived response-size bounds, not additional range restrictions. |
| A5 | Period comparison | Require explicit from/to and compareFrom/compareTo; no automatically inferred previous period. Each independently validated range may overlap or have different lengths. Return current and baseline totals with ranges/dayCount, plus signed current-minus-baseline deltas for all four metrics. Do not normalize by duration or include percentage change, averages, growth labels, or zero-baseline division. Comparing unequal calendar months is permitted but the raw totals are not daily averages. |
| A6 | Response envelopes and empty data | Every endpoint includes explicit range/dayCount metadata and totals. Breakdown/trend envelopes include overall totals for that same range plus items; zero data returns 200/zero totals, empty dimension arrays, and fully zero-filled trend buckets. Comparison always returns both ranges/zero totals and signed deltas. Monetary fields are decimal JSON numbers, counts/dayCount integers, no user fields. |
| A7 | Read consistency | Normal @Transactional(readOnly=true) READ_COMMITTED, matching Dashboard: concurrent writes may briefly make envelope totals differ from groups/buckets or comparison periods between queries. No locks, snapshots, REPEATABLE_READ, persisted summaries or synchronized recurring catch-up. This consistency boundary is explicitly approved for Analytics. |

### Approved API and response contract

| Endpoint | Required parameters | Response |
| --- | --- | --- |
| GET /api/analytics/summary | from, to | range, totals |
| GET /api/analytics/categories | from, to | range, totals, items[category group] |
| GET /api/analytics/accounts | from, to | range, totals, items[account group] |
| GET /api/analytics/trends | from, to, grouping | range, grouping, totals, items[date bucket] |
| GET /api/analytics/comparison | from, to, compareFrom, compareTo | current{range,totals}, baseline{range,totals}, delta |

```text
Range: from, to, dayCount
Totals: income, expense, netCashFlow (decimal); transactionCount (long)
Category group: categoryId, categoryName, categoryType, system, active, totals
Account group: accountId, accountName, accountType, active, totals
Date bucket: from, to (inclusive clipped dates), totals
Delta: income, expense, netCashFlow (signed decimal), transactionCount (signed long)
```

Field names above are approved new DTO fields, not existing methods. Positive expense delta means higher spending, not an automatic improvement/deterioration assessment. A category has a fixed financial type today, so normally one side of its totals is zero; keeping a uniform Totals shape makes rows, accounts and trends comparable without relying on names or inferring signs. Do not merge separate category IDs with the same name.

Example weekly range 2024-02-01..2024-02-10 returns clipped buckets 02-01..02-04 and 02-05..02-10. Example monthly range 2024-01-31..2024-03-01 returns 01-31..01-31, 02-01..02-29 and 03-01..03-01. There are no outside-range transactions in edge buckets, even when the calendar grouping boundary lies outside the requested range. Empty buckets count zero; same-day range yields one bucket under every grouping.

### Precise range validation (approved A2)

First require both dates, supported public years 1-9999 and from <= to. Compute dayCount = ChronoUnit.DAYS.between(from, to) + 1 using LocalDate, without timezone conversion. Same-day ranges have dayCount=1. No endpoint defaults or current-date rejection apply.

| Endpoint/grouping | Maximum range rule |
| --- | --- |
| Summary, categories, accounts | to < from.plusYears(5) |
| Comparison current AND baseline independently | to < from.plusYears(5) and compareTo < compareFrom.plusYears(5) |
| Trends DAILY | dayCount <= 366 |
| Trends WEEKLY | to < from.plusYears(2) |
| Trends MONTHLY | to < from.plusYears(5) |

Calendar-year limits are anniversary-based half-open windows translated to inclusive public bounds: the last permitted inclusive date is from.plusYears(N).minusDays(1), also constrained by the public 9999-12-31 maximum. Use ISO proleptic Gregorian LocalDate.plusYears: retain month/day when valid; February 29 clamps to February 28 in a non-leap anniversary year. Apply the subtraction AFTER anniversary clamping. Do not use Period.getYears, year-number subtraction, fixed day constants or to.minusYears(N) to decide validity.

Examples (the next date after each permitted end is rejected for that limit):
- Five years from 2020-01-01: through 2024-12-31 inclusive (1827 days); 2025-01-01 rejected.
- Two years from 2023-01-01: through 2024-12-31 inclusive (731 days); 2025-01-01 rejected.
- Two years from 2024-02-29: plusYears(2) is 2026-02-28, so permitted through 2026-02-27; 2026-02-28 rejected.
- Five years from 2024-02-29: plusYears(5) is 2029-02-28, so permitted through 2029-02-27; 2029-02-28 rejected.
- DAILY from 2024-01-01: through 2024-12-31 is 366 days and accepted; 2025-01-01 is 367 days and rejected for DAILY, while still valid for WEEKLY/MONTHLY and five-year endpoints.

Compute the anniversary in Java LocalDate even if its internal year exceeds 9999 (for supported public starts, adding at most five yields at most year 10004, within Java's range). Do not clamp the anniversary BEFORE subtracting a day: that would incorrectly reject public 9999-12-31. Validate public dates first, then compare to the true internal anniversary. For example, from=9998-12-31 allows to=9999-12-31 for two-/five-year limits despite an anniversary beyond public years. Those internal anniversaries never appear in responses or go to SQL. The separate SQL exclusive upper bound to.plusDays(1) may be 10000-01-01, as already documented.

Output bounds follow these calendar rules: two years contain at most 731 days and may intersect up to 106 Monday weeks; five years contain at most 1827 days and may intersect up to 61 calendar months. Zero-fill by actual intersecting calendar buckets, not by allocating a hard-coded count or generating one row per day for weekly/monthly output. Reject over-limit requests with ErrorResponse 400 before any aggregation; error text identifies the relevant daily/two-year/five-year limit.

## Phase 1 - Database / Domain

- [x] Implement domain/DTO contracts against the resolved A1-A7 decisions and precise validation rules; preserve the approved endpoint fields, grouping and comparison semantics.
- [x] Create analytics package, immutable service result/API DTO records and a small AnalyticsGrouping enum. Follow Dashboard/Budget detail-to-response conventions; no entity or generic reporting framework.
- [x] Define shared validated date-range value/logic: required bounds, supported years, ordering, inclusive dayCount and endpoint/grouping-specific approved limit. Use the 366-day check only for DAILY trends; use from.plusYears(N) anniversary comparison for all two-/five-year checks, including both comparison sides. Require grouping before selecting the trend limit. Validate before repository access; protect service calls as well as HTTP binding.
- [x] Translate inclusive to into exclusive to.plusDays(1) for financial predicates; maximum to=9999-12-31 becomes 10000-01-01 only as internal bound, already supported by existing PostgreSQL tests. Keep public fields in years 1-9999.
- [x] Design bucket iteration safely at minimum/maximum dates: do not construct public year-0 bucket starts or year-10000 ends, and do not overflow advancing beyond last clipped bucket. Week/month keys may be internal calendar anchors; response uses clipped supported dates. Validate real PostgreSQL native date-trunc/DATE binding at year 1 and year 9999 for all supported groupings.
- [x] No migration needed for correctness. Do not introduce summary tables/materialized views/caches. Any new index needs actual EXPLAIN evidence from implemented queries and representative owner/history/cardinality data; inspect migration directory again if justified (currently next would be V13). Never modify applied migrations.

## Phase 2 - Repository / Service

- [x] Add Analytics aggregate methods and interface projections on TransactionRepository, following existing @Query and projection patterns. All predicates use explicit userId and `[fromInclusive, toExclusive)` on raw transaction_date; no active-state restriction.
- [x] Overall aggregate: conditional SUM for income/expense and COUNT in one query, with null sums normalized; existing TransactionTypeTotal method contracts used by Dashboard are unchanged.
- [x] Category aggregate: join Category, group by category ID plus returned metadata and Transaction type or conditional SUM expressions; count rows without one-to-many joins. Never aggregate by name alone or query every category individually. Return scalar projections rather than managed Transactions or category entities.
- [x] Account aggregate: corresponding account ID/current metadata grouping, with signed net derived from income/expense, no opening balance. Retain inactive rows and account type changes as current metadata. There are no resource-ID request filters under A1, so Account/Category lookup services are not needed to enumerate groups.
- [x] Trend query: database grouping by financial DATE with controlled grouping enum. Use bound PostgreSQL native @Query for date_trunc('day'/'week'/'month', transaction_date cast to timestamp without time zone) cast back to DATE; keep grouping outside WHERE so the owner/date index remains usable. Use fixed queries or safe bound/allowlisted grouping, never raw client SQL/function fragments. Map bucket keys to LocalDate projections and verify Hibernate/driver conversions.
- [x] Aggregate sparse bucket results in SQL; zero-fill only bounded date buckets in Java. No full Transaction rows, one query per day/week/month, or recurring calculator reuse. Sum/count exact actuals inside the approved range, independent of calendar edges.
- [x] Comparison: validate BOTH explicit ranges independently against the five-calendar-year limit before executing either query, then reuse the same overall aggregate for each (two bounded aggregate queries); calculate four signed deltas in service. Overlap is intentional: an actual in both periods counts once in each, without deduplication across periods or UNION count mistakes. No percentage computation/division.
- [x] Implement AnalyticsService/AnalyticsServiceImpl with constructor injection, authenticated User principal and normal read-only READ_COMMITTED transaction, without locks, snapshots or REPEATABLE_READ. Centralize owner/range validation and Totals mapping within Analytics without refactoring existing domain services.
- [x] Use overall query plus grouped query for breakdown/trend envelopes (two data queries), following A6/A7. Document potential committed-read mismatch during concurrent writes instead of promising reconciliation across SQL snapshots.
- [x] Ensure only owner data contributes to every aggregate, grouped join and comparison range. System categories are shared metadata but their sums/counts remain owner-specific. No calls to Dashboard, Budget service, recurring worker/candidates/resources or active-account-only lists.

### Expected aggregation cost

| Request | Expected data queries | Returned database rows |
| --- | --- | --- |
| Summary | 1 | one aggregate or at most two type totals |
| Categories | 2 | overall aggregate + matching distinct category groups |
| Accounts | 2 | overall aggregate + matching distinct account groups |
| Trends | 2 | overall aggregate + populated buckets (DAILY <=366, WEEKLY <=106, MONTHLY <=61) |
| Comparison | 2 | current and baseline aggregates |

These counts exclude JWT/UserDetails loading. Counts do not grow per Transaction or group; group arrays grow with distinct dimensions present in the requested range. Existing accounts/categories have no owner dimension-count cap, so the approved complete breakdown arrays are intentionally not globally size-bounded; approved A3 accepts that tradeoff. Do not silently implement top-N truncation, hard row cutoffs or percentages of incomplete groups. If measurements show breakdown pagination is necessary, obtain approval for that API change.

SUM, COUNT and GROUP BY execute in PostgreSQL, not by streaming every entity into Java. Index(user_id,transaction_date) is a sensible existing starting point; daily/monthly date extraction belongs only in SELECT/GROUP BY. Functions on the WHERE date column could prevent normal range-index use. Avoid duplicate-producing joins to occurrences/budgets and lazy metadata fetches.

During implementation inspect EXPLAIN (ANALYZE, BUFFERS) on actual SQL with multiple owners, dense/sparse days, large transaction history and many matching account/category groups, including full five-year summary/breakdown/comparison ranges, two-year weekly trends and five-year monthly trends. Assess selected range vs owner history, sorts/hash aggregates and memory/spill behavior. A sequential scan on a tiny table or a broad matching range is not proof an index is missing. Consider (user_id, category_id, transaction_date) or account equivalent only if real evidence justifies them; they are not assumed migrations or replacements for the existing owner/date index. Do not add infrastructure or arbitrary latency guarantees from fixture timings.

## Phase 3 - API

- [x] Implement thin AnalyticsController using the approved five authenticated GET routes and ISO LocalDate binding, with all required range/grouping parameters explicit. No writes, export route, selectors, frontend route changes or implicit date defaults.
- [x] Response DTOs serialize flat metadata plus Totals records, never User/JPA objects. Stable order: ascending dimension ID and ascending clipped bucket dates. No trend bucket before/after the requested public range.
- [x] Bind missing/malformed dates and invalid enum values through existing ErrorResponse 400 behavior. Add InvalidAnalyticsException/GlobalExceptionHandler handler for reversed range, invalid supported years, endpoint/grouping-specific limit violation or other service range validation; do not reuse another feature's domain exception.
- [x] Return 200 for empty owner data, including zeros/empty groups/zero-filled trends; no not-found for a valid empty financial range. Missing/invalid JWT remains 401 via existing security configuration, with no permitAll change.
- [x] Document inclusive ranges and the exact daily/calendar-anniversary limits (including leap-day clamping), grouping/partial edges, zero filling, comparison direction/durations, future-actual-only behavior, decimal/count representation, current dimension metadata, generated actual inclusion, live edits/deletes and READ_COMMITTED consistency approved in A7.
- [x] Leave /api/dashboard unchanged. Existing /api/transactions is the drill-down mechanism, with its existing filters/pagination rather than new Analytics Transaction lists.

## Phase 4 - Testing

- [x] AnalyticsServiceImplTest (Mockito): authenticated principal/missing/wrong principal, required dates and grouping, from>to, same-day, year bounds, endpoint/grouping-specific boundary validation (DAILY 366 accepted/367 rejected; two-/five-year last permitted date accepted and anniversary rejected), mapping, empty totals, counts of both types, exact decimal/negative net, sparse zero filling, stable order and signed comparison deltas. Clear SecurityContext after tests.
- [x] Trend unit cases: Monday week starts across calendar years, partial first/last weeks/months, leap February, all empty ranges, same-day for each grouping and minimum/maximum supported dates without unsafe iteration. Compare explicit examples in contract. Cover full two-year WEEKLY and five-year MONTHLY windows with clipped edges and zero filling, up to 106/61 buckets as derived, without imposing a universal 366-day cap.
- [x] Calendar guardrail unit cases: each endpoint dispatches the correct limit; WEEKLY accepts a 731-day two-year range; five-year endpoints accept a valid 1827-day range; DAILY rejects them. Verify leap/non-leap and century years (2000 leap, 2100 non-leap), February-29 start clamping/subtraction order, non-first-of-month starts, last permitted end vs anniversary, supported year 1, internal anniversary beyond 9999 and accepted public 9999-12-31. Same dates may be accepted for MONTHLY/summary but rejected for DAILY/WEEKLY as their limits differ. All rejected requests must avoid repository access.
- [x] Comparison unit cases: identical/overlapping/disjoint periods, unequal durations, missing/reversed/over-five-year current or baseline (each independently), zero baseline/current/both, negative net and signed count delta. Prove there is no implicit previous-period calculation, percentage or duration normalization.
- [x] AnalyticsControllerTest (Boot 4 WebMvcTest/MockitoBean): all five routes, exact response envelopes including long counts/current metadata, 200 empties, required parameters, invalid ISO/year/range/grouping binding, ErrorResponse 400, and no service call on binding rejection. Test endpoint/grouping-specific service validation error mapping; authentication evidence belongs to integration, not filters-disabled slices.
- [x] AnalyticsRepositoryTest (DataJpaTest/PostgreSQL 17 Testcontainers/Flyway): actual SQL SUM/COUNT/grouping and LocalDate projection binding, inclusive external boundaries/exclusive internal boundary, all types/counts, leap/month/year/week edges, year 1 and December 9999, exact large sums beyond row precision, owners sharing system categories, stable IDs with identical category names, zero/no rows and independent account/category groups without join multiplication.
- [x] Prove inactive account/category history is retained; current names/type/active metadata reflects existing reference updates without changing totals. Empty-activity dimensions are absent. Groups/buckets reconcile to overall totals when reads are not concurrently mutated.
- [x] AnalyticsIntegrationTest (SpringBootTest/MockMvc/real JWT/PostgreSQL): owner A/B isolation across every route and each comparison side, missing/invalid JWT 401, valid empties, required endpoint/grouping-specific ranges and current-ledger edit/delete/type/date/account/category reassignment effects on analysis. Include valid future range with persisted actual, never forecasts or opening amounts.
- [x] Integration range dispatch: prove summary/categories/accounts and each comparison side accept full valid five-year ranges; WEEKLY accepts two years and MONTHLY five years while DAILY rejects ranges over 366 days. Last permitted calendar end returns 200, the anniversary date returns 400, and an invalid comparison side prevents both aggregation queries. Include February-29 starts and public year-9999 boundary cases.
- [x] Cross-feature integration: generated actual counts once in totals/dimensions/trends; template-only/Budget-only/legacy Expense-only data does not contribute. Backdated worker catch-up appears in the scheduled historical bucket after commit. Generated actual deletion removes it while occurrence marker remains and cannot regenerate. Analytics GET never advances cursor/lifecycle or creates rows. Use scheduler-disabled test profile and deliberately invoked worker, following Recurring/Dashboard fixtures.
- [x] Verify constant query count and projection-only materialization for aggregate requests on small/larger ledgers and the approved maximum multi-year windows; no full Transaction collection, per-dimension/bucket query, EntityGraph entity load or count-pagination query. Observe SQL/Hibernate statistics and representative plans without brittle assumptions about incidental JWT SQL/order or planner node choice on tiny fixtures.
- [x] Integration cleanup: occurrences before templates, Budgets/Transactions before accounts/custom categories/Users; preserve system seeds and legacy dependencies if that test creates Expenses. Tests remain isolated and order-independent.

## Phase 5 - Verification

- [x] Run targeted Analytics service/controller/repository/integration suites while implementing, fix genuine defects without weakening assertions.
- [x] Run `mvn clean verify` from cointrail-api with Java 25 and Docker/PostgreSQL Testcontainers; verify Dashboard, Transaction, Budget and Recurring compatibility.
- [x] Inspect complete diff: only Analytics DTO/controller/service/projections/query additions, Analytics validation handler, appropriate tests/documentation/plan, and evidence-justified new index migration if any. No frontend, existing migration, AGENTS.md/skills, unrelated refactor, financial write or security/lifecycle rule changes.
- [x] Verify approved A1-A7 contract, owner predicates, date/bucket boundaries, decimal precision, count semantics, incomplete-period labels, response ordering and bounded query/materialization behavior; record EXPLAIN evidence and migration decision.
- [x] Update this plan with only completed/verified work and any implementation choices. Delivery commit/push/PR targeting develop is authorized by the user's implementation instruction; do not merge.

## Expected Files

Implemented names follow the inspected domain package/service/controller/detail/DTO conventions. Avoid creating unused layers solely to match a list.

- `cointrail-api/src/main/java/com/deepak/cointrailapi/analytics/`: AnalyticsGrouping.java, AnalyticsService.java, AnalyticsServiceImpl.java, AnalyticsDetails.java and AnalyticsController.java; an internal validated range helper only if useful.
- `analytics/dto/`: explicit response records for summary, category breakdown, account breakdown, trends and comparison, sharing immutable Range/Totals structures where appropriate. Final filenames follow the approved contract; no persistence entity or generic reporting abstraction.
- `transaction/TransactionRepository.java` plus required scalar aggregate/group projections alongside TransactionTypeTotal/CategoryExpenseTotal. Existing query signatures and Dashboard callers stay unchanged. Native trend queries are limited to Analytics needs.
- `common/exception/InvalidAnalyticsException.java` and small GlobalExceptionHandler.java addition for expected service-level 400 failures.
- `cointrail-api/src/test/java/com/deepak/cointrailapi/analytics/`: AnalyticsServiceImplTest.java, AnalyticsControllerTest.java, AnalyticsRepositoryTest.java, AnalyticsIntegrationTest.java, and explicit shared fixtures if needed (Dashboard grouped repository suite is a useful pattern).
- `cointrail-api/ANALYTICS_API.md`, consistent with DASHBOARD_API.md and RECURRING_TRANSACTIONS.md, plus updates to this plan. New Flyway index migration only if actual evidence warrants it and numbering is rechecked; no migration is assumed.

## Implementation Notes

### Scope separation

Analytics owns historical actual totals/dimensions/time series/comparisons. Dashboard retains present active-account balance, compact monthly/Budget summary, recent Transactions and pending recurring preview. Similar monthly totals can agree because both use the same ledger/date semantics, but no existing Dashboard contract or service needs to change. Budget performance/history is not included without a separate demonstrated requirement; current Budget management and Dashboard Budget summary remain their sources.

Excluded: forecasting, AI-generated insights, bank-import analytics, currency conversion/modeling, net-worth/history of balances, recurring projections or series expansion, Budget summaries, dashboard previews, notifications, exports and frontend work. Rates/shares/percentages, selector filters, reporting horizons beyond the approved endpoint/grouping-specific limits and richer pagination remain outside the approved contract.

### Technical choices versus approval

Query syntax, projection class layout, fixed grouping dispatch and equivalent SQL expressions are ordinary implementation choices within the approved A1-A7 contract. Financial range cap, grouping/edge rules, filters, breakdown completeness, comparison arithmetic and consistency are product/API choices recorded explicitly above. Current data can support the approved contract without schema changes; native projection/date conversions have been verified in PostgreSQL tests, including the public date extremes and a non-UTC database timezone.

No new global Clock or timezone is needed: a stored DATE has no timezone conversion, and explicit ranges/grouping have no notion of today. Current resource labels cannot reconstruct past names or account types; building that history is outside this feature. Financial counts reflect the current table, not cumulative created/deleted events or occurrence identities.

Implementation readiness: A1-A7 are resolved and implemented, with no additional necessary product/API decision discovered. Delivery is authorized by the user's feature-delivery instruction. Calendar-anniversary validation, leap-day clamping, public-year boundaries and grouping-specific limits are specified above. Dashboard separation and all existing exclusions remain preserved. If implementation later uncovers a material API/schema/security/business-rule change beyond this approved contract, stop for approval.


## Implementation evidence

- Analytics uses one conditional-SUM/COUNT aggregate, current-metadata category/account JPQL groups and one bound PostgreSQL date_trunc query for day/week/month. Explicit timestamp-without-time-zone casting keeps stored DATE grouping independent of database timezone. All queries retain owner and raw half-open date predicates; existing Dashboard query contracts are unchanged.
- The complete targeted suite passed: 62 tests (20 range, 11 service, 18 controller, 5 PostgreSQL repository and 8 JWT integration), no failures/errors/skips. Two initial Mockito nested-stubbing errors and a zero-scale expectation were corrected in test setup. No production fix or business/API change was required. Full verification also passed the final assertion that each large-fixture aggregate uses one SQL statement and zero entity loads.
- EXPLAIN (ANALYZE, BUFFERS) used the exact SQL captured from the executed Hibernate/native queries, with identical parameters, on 180,000 Transactions across three owners, 60,000 per owner, ten years of dense/sparse dates and 12 accounts/categories per owner. Summary/comparison, both breakdowns, five-year MONTHLY, two-year WEEKLY, 366-day DAILY and a selective month were inspected after ANALYZE.
- Five-year queries matched 29,137 owner rows, WEEKLY 11,103 and DAILY 5,358. Broad queries chose existing idx_transactions_user_id scans, with small in-memory hash aggregates and ID/bucket sorts. Breakdown hashes used 32kB; trend hashes 177-625kB; one batch and no disk spill. The selective month used idx_transactions_user_date with owner and both date bounds in Index Cond (403 rows). Representative executions were approximately 0.3ms selective / 16-26ms broad in that local run; fixture timings are evidence, not an SLA.
- Migration decision: no migration or index is justified. Existing indexes support selective ranges, and broad matching ranges aggregate in memory without spill. No concrete missing-index bottleneck was demonstrated. Flyway remains V1-V12 unchanged.


### Final verification and delivery preparation

- `mvn clean verify` from cointrail-api, Java 25.0.4/Maven 3.9.4 with Docker/PostgreSQL 17 Testcontainers: BUILD SUCCESS; 474 tests, zero failures/errors/skips. Completed 2026-10-04 19:15:31 +05:30 (9:44). All existing Account, Category, Transaction, Budget, Recurring, Dashboard, Security and legacy Expense tests remain unchanged and pass.
- New tests: AnalyticsRangeTest (20), AnalyticsServiceImplTest (11), AnalyticsControllerTest (18), AnalyticsRepositoryTest (5), AnalyticsIntegrationTest (8); AnalyticsFixtures follows the existing shared-fixture pattern. Test SQL capture/EXPLAIN instrumentation is confined to AnalyticsRepositoryTest.
- Complete staged diff reviewed: 26 intended files, only Analytics contracts/service/controller/projections, additive TransactionRepository queries and Analytics exception handling, new Analytics tests, ANALYTICS_API.md and this plan. git diff --cached --check passes. No Dashboard, frontend, legacy production, security configuration, migrations, AGENTS.md or skills changes. No material approved-contract deviation or unresolved product decision remains.
- Delivery branch: feature/analytics-api; target: develop. Use the recent CoinTrail feature PR Summary/Changes/Testing/Notes format. Commit, push, PR URL and available CI status are reported in the delivery completion report; do not merge.
