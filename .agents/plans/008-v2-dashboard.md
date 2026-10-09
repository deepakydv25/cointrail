# Dashboard V2

## Goal

Give users a truthful overview of their V2 finances: active-account ledger balance, selected-month income, expense and net cash flow, category spending, recent actuals, and compact supported budget/recurring summaries. Make the differing reporting scopes visible and provide useful paths to existing V2 screens. Use CoinTrail Clarity without importing or combining legacy Expenses.

**Status: implemented, verified and delivered in PR #22; not merged.** The user explicitly approved the read-only category analytics integration and precision-safe normalized chart geometry, then authorized implementation, verification, commit/push and a PR against develop. Preserve the original planning record below; completed checkboxes reflect actual implementation and verification. No merge is authorized.

## Existing State and Inspection Evidence

Planning baseline: inspected on 2026-10-09. A fresh `git fetch origin develop` confirmed HEAD and origin/develop both at **`dfb2d59228356c677ce2751a8677454503455741`**, the PR #21 merge. The checkout was already named `feature/v2-dashboard`; this task did not create or switch branches. Working tree was clean before planning. Do not treat that existing branch name as implementation approval.

Read AGENTS.md, planning/testing skills, feature-delivery's future approval/verification boundaries, and Plans 006/007. Their original Existing State sections are historical; current source and completed-phase evidence govern current facts. Plan 006 Phase 3 specifies **only GET /api/dashboard**; category spending requested here needs the explicit scope choice below. Plans 006/007 remain unchanged.

### Inspected source

- Backend: `dashboard/DashboardController.java`, `DashboardDetails.java`, `dto/DashboardResponse.java`, `DashboardServiceImpl.java`; `account/AccountRepository.java` aggregation as referenced by the service; `transaction/TransactionRepository.java` owner/date/group queries; `budget/BudgetServiceImpl.java`; recurring repository, frequency/status enums; AnalyticsController/Details/Range/ServiceImpl and response DTOs. Java paths are relative to `cointrail-api/src/main/java/com/deepak/cointrailapi/`.
- Contract documentation: `cointrail-api/DASHBOARD_API.md`, `ANALYTICS_API.md`.
- Backend tests: DashboardControllerTest, DashboardServiceImplTest, DashboardRepositoryTest, DashboardIntegrationTest and corresponding analytics controller/service/repository/integration/range tests. Evidence includes owner isolation, zero data, inactive history, deterministic bounded previews, generated actuals counted once, no writes on GET, zone boundaries, public date extremes and aggregates exceeding individual row precision. Controller slice tests disable filters; integration tests supply real JWT/security coverage. Inspection is not a fresh test execution.
- Frontend: App.tsx, AppShell, Navbar, AppLayout/ProtectedRoute, Clarity index.css/components, legacy DashboardPage/chart/tests, transaction pages/query/service/types/tests, Axios/session/error and financial helpers, package.json. Frontend paths below are relative to `cointrail-frontend/`.

There is **no V2 dashboard page/service/type/chart**, budget/recurring frontend, or analytics frontend. Existing `src/pages/DashboardPage.tsx` is V1: legacy expense summary and five recent expenses; its numeric model and rainbow `CategorySpendingChart` stay isolated and unchanged. Current protected routes expose Accounts, Categories and Transactions; `/app` and ordinary authenticated entry still resolve to `/dashboard`.

Reusable foundation actually exists: AppShell (240px desktop / 192px tablet sidebar and mobile disclosure via Navbar), PageHeader, SurfaceCard, MetricCard (formatted string value; neutral/income/expense tones), Button/ButtonLink, FormField, States, FinancialRow, CategoryIcon, Icon (`overview` glyph exists). SiteLayout already owns skip target and route-heading focus; ProtectedRoute remounts its Outlet by sessionVersion. Do not add a second shell/main/focus owner. FinancialRow requires a real destination; recurring previews without routes should use ordinary semantic list markup rather than fake links.

Dependencies already include React 19, Router 7, Axios, lossless-json 4, Recharts 3, Tailwind 4, Vitest/jsdom/RTL/user-event. No new dependencies, chart framework, query cache, global financial store or generic reporting engine are needed.

## Verified API Contracts

All calls are protected GETs on the **existing shared Axios instance**, using explicit `/api/...` paths and scoped `financialConfig`. Authenticated ownership is server-derived; never send userId. Responses are raw objects, not a success envelope. Shared application errors use `{status: integer, message: string, errors: Record<string,string>/null}`; protected security 401 may have no body. The financial transform also stringifies numeric error-body tokens, while Axios HTTP status remains numeric and existing normalization handles both.

### Primary request: GET /api/dashboard

Required query: `year` integer 1–9999, `month` integer 1–12, e.g. `/api/dashboard?year=2026&month=10`. Past/current/future months accepted. No account/category/type filter, date-range parameter, pagination, preview limit or sort parameter. Missing/malformed/out-of-range parameters return 400; unauthenticated requests return 401. Empty owner returns 200 with zero summaries/empty lists.

Exact object inventory (wire money/IDs/counts are JSON numbers; frontend financial parser returns their lexemes as strings):

| Field | Shape / wire type |
| --- | --- |
| year, month | Integer |
| totalActiveAccountBalance | signed BigDecimal |
| monthlySummary | `{income: BigDecimal, expense: BigDecimal, netCashFlow: BigDecimal}` |
| budgetSummary | `{budgetCount: int, totalBudgetAmount: BigDecimal, spentOnBudgetedCategories: BigDecimal, remainingBudgetAmount: BigDecimal, overBudgetCount: long}` |
| recentTransactions | array of `{id: Long, type: EXPENSE/INCOME, amount: BigDecimal, description: string/null, transactionDate: ISO date, accountId: Long, accountName: string, categoryId: Long, categoryName: string}` |
| pendingRecurringTransactions | `{asOfDate: ISO date, throughDate: ISO date, timezone: string, items: PendingRecurringTransaction[]}` |
| each pending item | `{id: Long, type: EXPENSE/INCOME, amount: BigDecimal, description: string/null, frequency: DAILY/WEEKLY/MONTHLY/YEARLY, nextDueDate: ISO date, accountId: Long, accountName: string, categoryId: Long, categoryName: string, status: recurring status enum, blockedReason: string/null, overdue: boolean}` |

Recent preview omits createdAt/updatedAt and active/system metadata. Pending preview omits startDate/endDate/full schedule, enabled-worker state and generated transaction IDs. Full recurring status enum is ACTIVE/PAUSED/BLOCKED/CANCELLED/COMPLETED, but this query only returns ACTIVE/BLOCKED. Do not reuse the full TransactionResponse or invent preview fields.

### Narrow category integration proposed for approval: GET /api/analytics/categories

Required inclusive ISO `from` and `to`, e.g. `/api/analytics/categories?from=2026-10-01&to=2026-10-31`. Years 0001–9999, from <= to, to < from.plusYears(5); calendar anniversary/leap-day clamping, not a fixed day limit. A single selected month satisfies this limit. No account/category/type filter, pagination, sort, top-N or shares.

Exact response:

- `range: {from: ISO date, to: ISO date, dayCount: long}`.
- `totals: {income: BigDecimal, expense: BigDecimal, netCashFlow: BigDecimal, transactionCount: long}`.
- `items: [{categoryId: Long, categoryName: string, categoryType: EXPENSE/INCOME, system: boolean, active: boolean, totals: same totals shape}]`.

Groups include only activity-bearing categories, use stable IDs/current names, retain inactive history, and arrive ordered by category ID ascending. Same names with different IDs must remain separate. Filter returned groups to EXPENSE for the spending widget; display each group's exact `totals.expense`. An empty response has zero totals and `items: []`. Missing/invalid ranges return 400; JWT required. Do not fetch active Categories and discard historical groups.

### Other existing reporting endpoints (not required by recommendation)

`/api/analytics/summary?from&to` returns `{range,totals}`; `/accounts?from&to` returns `{range,totals,items}` with accountId/name/type/active and totals; `/trends?from&to&grouping` returns `{range,grouping,totals,items:[{from,to,totals}]}`; `/comparison?from&to&compareFrom&compareTo` returns `{current:{range,totals},baseline:{range,totals},delta:totals}`. DAILY trends max366 inclusive days, WEEKLY <2 calendar years, MONTHLY <5; Monday weeks, clipped boundaries and zero-filled buckets. Account totals are activity, not balances. These APIs support future analytics but are unnecessary for a two-total income/expense chart. No trends/comparison/account-analytics page is proposed.

Budget and recurring CRUD APIs exist at `/api/budgets` (list requires year/month) and `/api/recurring-transactions` (paged list), but the dashboard already supplies the requested summaries. Do not implement those domains or their services/screens merely to render dashboard previews.

## Business Rules and Data Availability

- [x] Balance uses currently active owned account opening balances plus **all persisted signed income/expense for those active accounts**, all stored dates. Credit cards have no special debt treatment. Label “Total active-account balance”; explain “All recorded dates · active accounts”, not selected-month closing balance, available cash or net worth.
- [x] Monthly totals use stored transaction dates within selected calendar month, including inactive account/category history. Net cash flow is backend income minus expense, possibly negative. Generated actuals count once; templates, opening balances and V1 Expenses do not contribute.
- [x] Budget summary covers selected-month budget definitions and spending on their expense categories only. Remaining may be negative; over-budget means strictly spent > amount. Zero budgets can coexist with nonzero monthly expenses. Aggregate remaining does not imply every individual budget is safe; show overBudgetCount independently.
- [x] Recent list is latest **up to five across all dates**, order transactionDate DESC, createdAt DESC, id DESC. Do not month-filter it or claim there are exactly five total records/hasMore.
- [x] Pending list is up to five ACTIVE/BLOCKED **next-due cursors**, order nextDueDate ASC, id ASC, through recurring today+30 inclusive (clamped to 9999-12-31), including overdue backlog. Due today is not overdue. It is not five future occurrences or an exhaustive forecast.
- [x] Render returned names as current historical reference names; do not claim immutable name snapshots or infer active status from dashboard previews. Analytics category `active` can be shown explicitly.
- [x] GETs never post/generate/repair/replay/resume anything. READ_COMMITTED queries/requests can differ briefly during concurrent writes. No client reconciliation replaces backend figures.

| Requested widget/data | Support and proposed presentation |
| --- | --- |
| Total balance, monthly income/expense/net | Supported directly by dashboard; four MetricCards |
| Income vs expense visualization | Supported by monthlySummary; two labeled horizontal Recharts bars, not an invented time series |
| Spending by category | Not in dashboard; supported by narrow existing categories analytics call if scope approved |
| Recent transactions | Supported dashboard preview; FinancialRow with existing transaction detail links |
| Budget summary | Supported; read-only count/planned/spent-on-budgeted-categories/signed-remaining/over-budget-count, no management links |
| Upcoming recurring | Supported only as pending due cursors; title “Pending recurring transactions”, date window/zone/status/overdue explained |
| Account/category dashboard filters | Unsupported. Omit controls; existing Transaction list drill-down filters remain usable |
| Daily trend, comparison, category shares | Some analytics primitives exist, but unnecessary here; omit time-series/percentage/trend claims |
| Historical balance, forecasting, multiple currencies, bank reconciliation, scheduler health | Unavailable; no substitute values. Any API support requires separate approved backend work |

Never page through transactions to compute report totals or infer category spending from five recent rows. If category integration is not approved, ship dashboard-only overview/two-bar chart/previews and defer spending-by-category; alternatively extend DashboardResponse in a **separately approved backend change**, not this frontend phase.

## Dashboard Experience and Behavior

### Reporting period and navigation

Propose `/app/dashboard?year=2026&month=10`, with a “Dashboard V2” navigation link in the V2 group, existing overview icon and page h1 “Dashboard V2”. Preserve `/dashboard`, its Legacy Overview link, `/expenses/*`, login/public-route fallback and `/app` redirect. Do not change authenticated defaults.

Default UX selection is the browser's local current year/month captured on initial entry; backend has no implicit default or general reporting timezone. Label selected month/year. Default selection must not masquerade as backend server-today. Canonicalize a URL with neither parameter to explicit year/month using replace; reject partial/invalid supplied parameters visibly rather than silently substitute another month. Native labeled month selector and numeric year input with Apply preserve edits until valid; validate integer/range without locale ambiguity. Keep selection in URL, support back/forward/reload/bookmarks, and label invalid controls via FormField. Provide “Current month” reset; disable month-stepping at 0001-01/9999-12 if stepping is included.

Use calendar-string helpers for padded YYYY-MM-DD month bounds, including leap years/year1/year9999; avoid new Date(year,...) treating 0–99 as 1900–1999 or ISO conversion shifting dates. Stored dates stay date-only, timestamps without invented Z. Pending dates/overdue always come from server metadata, not browser inference; display “As of ... through ... (timezone)” even when empty.

PageHeader actions: Create transaction and View transactions (existing routes). Monthly income/expense cards may have adjacent explicit “View income/expenses for this month” links using type/from/to/page=0. Do not make MetricCard itself a fake interactive element. Category rows drill down to `/app/transactions?type=EXPENSE&categoryId=<exact-id>&from=<first>&to=<last>&page=0`; inactive ID filters already work. Recent detail links go to exact `/app/transactions/:id` without applying month filters that would hide an outside-month item. Preserve the dashboard return period through Router location state only with a validated `/app/dashboard` return path if a small TransactionDetailsPage change is approved; otherwise existing “Back to transactions” remains truthful and browser Back restores dashboard URL. No invented budget/recurring routes or disabled coming-soon navigation.

### Layout and styling

Keep AppShell breakpoints: mobile below768, tablet768–1023, desktop1024+. Page max-width75rem and16/24/32px gutters. Proposed content sequence: header/period; four overview cards; income-vs-expense and spending-category surfaces; recent actuals; compact budget/pending surfaces. Mobile single column, tablet2-column metric grid with chart surfaces stacked where widths require, desktop4-column metrics and2-column surfaces. Do not force four columns if maximum amounts overflow; min-width:0, wrapping full exact values and names, no financial ellipsis. Charts have explicit heights, minimum sizes and responsive containers; long categories wrap in the accompanying list instead of tiny truncated labels. DOM order stays meaningful at all widths.

Use existing --ct tokens, white cards/off-white canvas, charcoal/neutral-grey category tiles with generic tag, indigo chart/primary/selected accents. Income amount text green, expense amount text red; balance and signed net cash flow neutral (net is a derived result, not a transaction type). Budget remaining can use red plus explicit “Over budget” text when negative; progress, if later introduced, remains indigo. Recommended first version shows exact budget values without a percentage/progress calculation. No rainbow category palettes, glass financial cards, gradients or count animation.

### Loading, empty, error, retry and consistency

- Dashboard is one atomic HTTP payload: its five sections share loading/error/retry. Categories is independent; never use Promise.all failure to erase successful overview data. Separate AbortController/attempt state per endpoint or one controller with independent outcomes.
- Associate each result/error with period and request generation. On period change hide prior-period figures and render section LoadingState; canceled/stale results never render. On retry/Refresh hide replaced payload and show explicit loading, or clearly label retained data stale if approved; prefer the existing page pattern of hiding it. No fake zero cards while loading/failing.
- One dashboard error displays ErrorState/retry in its region while successful category data may remain; category failure displays its own error/retry without replacing income/expense metrics. Page header/date controls remain usable. Error messages use normalizeApiError; bodyless401 expires only the matching session and normal login return behavior applies. Do not retry authentication automatically or bypass guards. A 404 means unavailable endpoint/data, not permission proof.
- Successful zero totals render as exact INR0.00. Separate empty copy: no category spending in this month; no recent V2 transactions; no budgets for this month; no pending cursors in returned window. No “no accounts” inference from a zero balance. No whole-page empty state solely because one widget has no items.
- Refresh action reloads both sources for the selected period, with no polling/cache/worker side effects. Refetch on page remount after navigation. Independent retry refreshes only its endpoint. Do not force sums from category items to match dashboard expense during concurrent writes or claim synchronized snapshots.

## Precision and Technical Design

Use `api/financial.ts` financialConfig with the existing shared Axios client. It parses **all numeric lexemes as strings**, including year/month/counts/IDs/aggregates. New response types must reflect that, not generic PageResponse's numeric metadata. Keep booleans/null/ISO strings unchanged; all request IDs/route keys stay strings. GET year/month/from/to query strings are validated parameters; no monetary request body is needed. Preserve existing LosslessNumber numeric serialization for any existing writes; no V1 parser changes.

Use `formatMoney(string)` for exact INR/en-IN grouping/padding, including negative/zero and aggregates with **more than17 integer digits**. Do not run returned totals through monetaryNumber/transactionAmount (input row constraints), Number, parseFloat, toFixed or numeric Intl formatters. Tests must cover signed row limits, 0.01/0, `199999999999999999.98` aggregate and larger sums, IDs/long counts above MAX_SAFE_INTEGER. Installed lossless-json exports `splitNumber`, but no ready-made plain-decimal expansion function; LosslessNumber.toString preserves its lexeme. If a valid backend lexeme arrives in exponent notation, a focused exact lexical expansion using its existing utilities at this boundary may be needed; never Number-convert it. Existing documented BigDecimal scale2 examples and NUMERIC(19,2) storage use plain decimals; verify real responses before broadening helpers and add regression coverage if expansion is required. No silent rounding, truncation or row-range restriction on aggregates.

### Chart approach: geometry is approximate; financial labels remain exact

Use installed Recharts BarChart with labeled rows, neutral grid/axis, indigo bars and textual Income/Expense labels; no color-only legend. For category spending, same indigo horizontal bars aligned with neutral tag/name/list, never one color per category. Do not reuse V1 CategorySpendingChart or its Number-based tooltip. Two-total chart uses monthlySummary directly; no trends request needed.

Recharts needs finite numeric coordinates. Propose a focused tested adapter: convert canonical nonnegative amount strings to exact BigInt minor units, find max across the displayed dataset, and derive a bounded normalized integer coordinate `value * 1_000_000n / max` (zero denominator yields all zero). Convert **only that bounded coordinate** to Number for geometry. Keep original exact amount strings and IDs attached to each data item. Coordinate quantization is explicitly approximate graphical resolution, never stored money or financial display. Do not format coordinates as INR, reconstruct money from them, show monetary numeric-axis ticks, or infer percentages. Use “Relative amount” axis with descriptive text, custom tooltips/data labels reading original strings, and an always-visible exact-value list/table. Tiny0.01 next to a huge total may have no visible length; its exact text must remain accessible. No fabricated minimum bar value. If this approximation policy is not accepted, defer numeric charts and show exact textual totals/category lists until separately approved precision-compatible visualization.

Chart animation off (also honors reduced motion). Prefer decorative/aria-hidden chart SVG when the complete labeled exact table is its accessible equivalent; keyboard users must not require hover to obtain any data. Tooltips are supplementary and refer to exact values. Test the pure adapter separately; jsdom mocks of ResponsiveContainer do not prove layout/accessibility. Installed Recharts behavior must be checked in a real browser. Category list includes every expense group, stable ID keys, current inactive label and exact amount; retain server ID order for first version, no invented top-N/Other bucket or percent shares. Large category sets may use an explicitly labeled collapsed list with accessible Show all/Show fewer rather than claiming completeness of a shortened chart; decide after browser stress testing.

### Request/session implementation

Proposed `getDashboard({year,month}, signal?)` and, only if approved, `getCategoryBreakdown({from,to}, signal?)`. Return typed response.data. Use page-local useEffect/state like TransactionsPage: AbortController cleanup, axios.isCancel suppression, period-keyed data/error, request-attempt counters and signal checks before commits. Shared Axios already protects session token+version, timeout15s, bearer paths and normalized errors; ProtectedRoute already remounts on session changes. Do not duplicate auth logic or introduce caches retaining previous-user data.

## Implementation Phases After Explicit Approval

### Phase 1 — Route and API integration

- [x] Recheck latest develop, approved scope/chart decisions, clean workspace and relevant skills before implementation; preserve unrelated existing work.
- [x] Add distinct dashboard preview DTOs, dashboard service and exact contract tests with AbortSignal. Add narrow categories DTO/service only if approved.
- [x] Add protected /app/dashboard and V2 Dashboard V2 link without changing legacy links/defaults. Add period parsing/calendar bounds and URL behavior tests.
- [x] Acceptance: exact endpoint/query, no V1 calls, both sources bounded to selected month where appropriate, authenticated/deep-link/back behavior and stale-session protections work.

### Phase 2 — Financial overview cards

- [x] Render four MetricCards from dashboard fields with scope explanations; exact signed strings and long aggregates.
- [x] Add accessible period form, explicit refresh, loading/error/retry/zero states; income/expense drill-down links.
- [x] Acceptance: no client balance/net recomputation, no loading zeros, full values survive narrow screens; balance remains all-date when month changes.

### Phase 3 — Charts and category breakdown

- [x] Implement reviewed normalized-geometry adapter and two-total Recharts chart with exact textual equivalent.
- [x] If approved, render expense groups from category API with independent states, generic neutral icons, inactive names and exact-ID transaction links. Otherwise defer widget explicitly.
- [x] Acceptance: no Number conversion of money/IDs; tiny/huge/zero ratios finite; tooltips/tables exact; no guessed category colors/shares, hidden income categories or lost historical expenses.

### Phase 4 — Recent actuals and supported summaries

- [x] Render backend-ordered recent FinancialRows; label all dates/up to5; safe description fallback and exact detail IDs.
- [x] Render budget summary and empty state, signed remaining and explicit over-budget count without management UI.
- [x] Render read-only pending list with server date/zone/window, frequency/status/overdue/nullable blockedReason and no invalid destinations or posting guarantee.
- [x] Acceptance: outside-month recent rows and overdue/blocked cursors stay visible; empty widgets truthful; no inferred total counts, generated metadata or worker state.

### Phase 5 — Responsive, accessibility, regression and verification

- [x] Complete below tests/browser checks; record actual results and tooling gaps in this plan rather than asserting unperformed QA.
- [x] Run npm run test:run, npm run build, npm run lint from frontend; run mvn clean verify from API as required by feature-delivery even with unchanged backend.
- [x] Review complete diff/check, verify unchanged V1/API/precision/auth/defaults/dependencies/backend/migrations/instructions and update this plan only. Updating Plans006/007 needs explicit approval.
- [x] Only following implementation authorization and successful verification: commit/push/create focused PR targeting develop, inspect CI, do not merge. These actions are not authorized by this planning task.

## Expected Files After Approval

Proposals follow actual flat service/type and domain-page conventions; these files do not yet exist unless listed as existing.

| New files | Purpose |
| --- | --- |
| src/types/dashboard.ts | Full dashboard response and distinct compact preview types, numeric strings |
| src/services/dashboardService.ts and dashboardService.test.ts | Shared-client lossless GET contract/cancellation/error tests |
| src/pages/dashboard/DashboardPage.tsx and DashboardPage.test.tsx | V2 orchestration/period/overview/previews/page behavior |
| src/pages/dashboard/period.ts and period.test.ts | Validated URL month and inclusive calendar bounds |
| src/pages/dashboard/IncomeExpenseChart.tsx | Two-total presentation; small scope, no generic engine |
| src/pages/dashboard/chartData.ts and chartData.test.ts | Exact minor units and bounded geometry only |
| src/pages/dashboard/charts.test.tsx | Exact labels/data equivalents/zero and chart accessibility |
| src/types/analytics.ts, src/services/analyticsService.ts and analyticsService.test.ts | **Conditional approved addition:** category response and getCategoryBreakdown only, not all analytics endpoints |
| src/pages/dashboard/CategorySpending.tsx | **Conditional:** independent category chart/list; private dashboard widget |

Existing edits: `src/App.tsx`, `components/Navbar.tsx` for route/link; `App.test.tsx`, `components/AppShell.test.tsx` for routing/nav/session/default regressions; `src/index.css` for narrowly namespaced dashboard grids/chart layout using current tokens; frontend README for dashboard contracts/precision/scope; this Plan008 evidence. Reuse MetricCard/SurfaceCard/PageHeader/FormField/Button/States/CategoryIcon/FinancialRow as-is unless an identified accessibility defect needs a scoped fix. Optional dashboard return-state enhancement would touch TransactionDetailsPage and its tests only after that choice is approved; not required for the recommended baseline.

Explicitly unchanged: V1 DashboardPage/chart/expense services/types/pages, AuthProvider/session/guards behavior, shared Axios defaults, existing financial writes, package/lockfiles, backend/docs/migrations, AGENTS.md/skills, Plans006/007. No Dashboard V2 mutations, Budget/Recurring/Analytics routes, dark mode, new deps, chart exports or deployment.

## Acceptance Criteria and Test Strategy

Use existing Vitest, RTL/user-event and controlled Axios adapters with real financial response text. Assertions test user-visible behavior/paths/payloads rather than broad snapshots or decorative CSS implementation.

- [x] Service contracts: exact GET paths/query params, required period validation, raw objects/no envelope, AbortSignal and bearer headers, bodyless401/400/403/404/409/500/network/timeout/malformed JSON via existing normalization; no monetary request serialization or V1 calls introduced.
- [x] Precision: ±99999999999999999.99,0.01,0, aggregates beyond17 digits, negative net/balance/budget remaining, Long.MAX_VALUE and9007199254740993 IDs/counts remain strings end-to-end; safe query/detail hrefs; no exponent ambiguity in supported fixtures. Preserve existing outgoing numeric-money/ID regressions.
- [x] Period: default explicit local month under controlled clock, URL/back/forward/invalid partial parameters, leap February, December rollover, years0001/0099/9999; inclusive category query and monthly drill-down bounds; future period accepted without forecast claims.
- [x] Page: four values/scopes, monthly change and all-date previews, successful zeros/empty sections, income-only/expense-only/mixed months, negative net, budgets absent despite expenses, per-budget overrun count despite positive aggregate remaining, no fake account-empty inference.
- [x] Previews: at most returned5 with original order, null/long descriptions/names, current historical names/inactive category labels, recurring overdue vs due-today, blocked/null reason, metadata timezone differing from browser, no forecast/job/generated-ID fields/actions.
- [x] Independent failures/retries: category failure preserves dashboard; dashboard failure preserves category; retry uses current period, refresh replaces old figures; abort/unmount and out-of-order period/attempt responses ignored; logout/relogin/account switch clears prior-owner data and old401 cannot expire newer session.
- [x] Chart adapter/components: exact original labels/tooltips, full data equivalent, zero denominator, tiny/max/dominant/equal aggregates, finite bounded coordinates, no currency labels derived from normalized numbers, uniform icon styling, no color-only meanings and no animation dependency.
- [x] Routing/navigation: protected deep link returns through login; Dashboard V2 and Legacy Overview distinct; original default /dashboard and /app redirect remain; skip target/one main/one h1, mobile toggle Escape/focus/route close unchanged. Existing V1 dashboard/expense and all foundation/service suites pass without weakened assertions.

Manual browser checklist after implementation, using existing installed tooling rather than adding a runner:

- [ ] 320/375/390 mobile,768/820 tablet,1024/1280/1440 desktop; breakpoint edges767/1023; chart/card/nav reflow, no document horizontal overflow, long100-char names/500-char descriptions and huge signed values visible.
- [ ] Real API empty owner and seeded V2 actuals, inactive history, budgets and pending ACTIVE/BLOCKED cursors; verify API numbers match visible exact values; no shared/production data mutation merely for QA.
- [ ] Keyboard-only period controls/retry/refresh/drill-down/skip/mobile menu, visible focus44px targets, native field associations/error announcements, no unexpected focus movement on query refresh. Page sections labeled h2; table/list captions expose month and exact values without hover.
- [ ] Text-spacing override, actual200% browser zoom/320CSS-pixel reflow separately, reduced motion, opaque navigation fallback/forced-colors, contrast using existing tokens; charts usable with textual equivalent and patterns/text labels.
- [ ] NVDA/VoiceOver and Chrome/Firefox/Safari/iOS where available; record unavailable checks honestly. jsdom does not establish responsive/chart/screen-reader success.
- [ ] Smoke-test V1 dashboard/chart/expense CRUD and login/default/session expiry; no visual token leakage or V1/V2 API mixing. Back from transaction detail restores dashboard period via browser history.

Backend tests are evidence for semantics and remain unchanged. A frontend-only implementation needs no new backend test files. Run required Maven verification later, investigate environment failures rather than modifying correct tests; current planning does not execute builds/tests or claim current pass counts.

## Risks, Tradeoffs and Approval Decisions

| Decision / risk | Recommendation / gate |
| --- | --- |
| Plan006 dashboard-only constraint vs category widget | Approve **one read-only /api/analytics/categories integration** within Dashboard V2 through approval of Plan008. No Analytics route/trend feature. If not approved, defer widget and keep dashboard-only release. Do not alter Plan006 automatically. |
| Charts cannot use arbitrary-precision amounts directly | Approve approximate normalized geometry with exact original labels/table as above. No loss of financial data. If rejected, text/list-only first version; do not silently Number-convert. |
| Reporting month timezone | Browser-local month is explicit UX default; recurring metadata is server-zone. A server-reporting clock/settings contract would require separate backend approval. |
| Return navigation | Baseline uses existing detail navigation and browser Back. Optional direct “Back to dashboard” needs narrowly approved TransactionDetailsPage return-state extension with validation/regressions; no silent replacement of existing transaction return paths. |
| Unfiltered/all-date sections vs monthly cards | Visible scope explanations and server metadata; no resource filters/fake harmonized figures. Adding filtered dashboard APIs/historical balances/forecasting needs separate backend approval. |
| READ_COMMITTED/concurrent generation | Independent read results may differ temporarily; manual refresh, no summed correction or generation promises. Scheduler rollout/configuration remains separate from read-only preview. |
| Many categories/large aggregates | Full exact list is authoritative; chart can be secondary/collapsible with explicit completeness labels after stress testing. Never top-N/Other aggregation without reviewed exact behavior. |
| Existing build/tooling/manual-QA gaps | Preserve inherited bundle/toolchain warnings distinctly, use existing browser tools and report gaps. No new runner, dependency cleanup or CI changes under this phase. |
| Authenticated default | Keep /dashboard. Changing it to /app/dashboard requires separate explicit approval; not needed for this proposal. |

No backend/API/schema change is required for the recommended dashboard plus narrow category-read option. Unsupported capabilities remain out of scope. Decisions above are proposals for implementation review, not approval granted during planning.

## Planning Verification

- [x] Read instructions/skills and Plans006/007; inspect implementation, DTOs/services/query semantics/tests and actual reusable components.
- [x] Fresh-fetch develop and verify identical inspected HEAD; record existing branch without creating one.
- [x] Document supported widgets, missing filters/data, exact numeric-string contracts and separate approval gates.
- [x] Review Plan008 implementation approval and settle category-read/chart-geometry choices before dependent code.
- [x] Implement/verify later phases and record actual results here after authorization.

Original planning-only validation: source/contract review, not fresh runtime/test evidence. Final workspace review shows only this new untracked plan; tracked diff and `git diff --check` are clean. No changes to Plans006/007, frontend/backend code, dependencies or instructions; no delivery actions.


## Implementation and Verification Evidence - 2026-10-09

The implementation request explicitly approved the category read and normalized chart geometry, superseding the planning-only record. Stayed on existing `feature/v2-dashboard`; fresh-fetch HEAD/develop matched `dfb2d59228356c677ce2751a8677454503455741`. Only Plan008 was untracked before edits. No unrelated work, Plans006/007, AGENTS.md or skills changed.

### Delivered behavior

- Protected /app/dashboard and Dashboard V2 navigation reuse AppShell and the existing overview glyph. /dashboard, /app redirect, login/default behavior and V1 bodies/contracts remain intact. Transaction details remain unchanged; browser Back restores dashboard period.
- New dashboard/compact-preview/category DTOs use numeric strings. Two read-only services reuse shared Axios/financialConfig/signals/auth/error handling; no new dependencies, backend/schema/API changes, forecast metrics or management routes.
- Native reporting controls validate partial/ambiguous/invalid URL periods and form values, preserve invalid edits, synchronize history and build exact inclusive bounds through years 0001/0099/9999 and leap centuries. Missing period makes the device-local current month explicit.
- Four MetricCards and read-only summaries use backend amounts, never client-computed financial totals. All-date balance/recent actuals, selected-month actuals/budgets and server recurring dates/zone/status/overdue/reasons are distinctly labeled. Category metadata retains inactive history and exact-ID transaction drill-down.
- Chart BigInt minor units become bounded relative coordinates only. Original strings drive exact labels/tooltips; full category names remain available. Indigo bars, neutral tags and income/expense text tones match Clarity. More than 12 expense groups show the complete exact list with an explicit omitted-chart notice; tiny amounts can have zero-length bars but visible exact text. Real API aggregates were plain scale 2 decimals, so no exponent expansion/helper or row-range cap was introduced.
- Independent requests/retries and period/attempt keys hide replaced data while loading; abort cleanup, session-version remounts and shared stale-session transport protect previous-user data. Refresh reloads both sources. Empty widgets do not infer nonexistent accounts or synthesize zeros during failures.
- Dashboard-scoped CSS uses two metric columns on tablet/narrow desktop and four at 1280px where width permits; other surfaces split at 1024px. Full long names/descriptions/values wrap. Shared focus/skip/shell/primitives are unchanged.
- Added test-only pages/dashboard/fixtures.ts (not imported by application code). The obsolete unavailable-dashboard regression now targets still-unimplemented /app/budgets; existing V1 assertions remain.

### Automated verification

| Check | Result |
| --- | --- |
| Final standard frontend suite | npm.cmd run test:run: **31 suites / 363 passed**, zero failures/skips; **57.70s**, exit 0. Includes all 285 foundation cases and 78 added contract/precision/calendar/chart/page/navigation/session cases. |
| Final build | npm.cmd run build: **passed**, exit 0. CSS 33.18 kB / 7.64 kB gzip; JS 803.16 kB / 235.97 kB gzip. Inherited >500kB chunk warning remains; no unrelated splitting/dependency changes. |
| Final lint | npm.cmd run lint: **passed**, exit 0. |
| Backend | mvn.cmd clean verify: **BUILD SUCCESS**, **529 tests**, zero failures/errors/skips; **8:28 minutes**. Initial sandbox attempt lacked Maven-cache access; authorized retry with existing cache/Docker completed. Java/Jansi/Unsafe warnings remain; backend source/tests unchanged. |
| Review | All new source/tests and tracked route/navigation/CSS/README edits reviewed; git diff --check passed, and forbidden-scope path diff is empty. Only Plan008 is updated. |

A full frontend run overlapped with browser QA and hit timing failures in new/existing suites. The standard run on its own passed all 363 tests including affected cases. No assertions, test timeouts, worker settings or runner configuration were weakened/changed. Final source includes tooltip name/tone refinement and exact 500-character description retention coverage.

### Browser verification

Installed headless **Chrome 155.0.8059.39**, existing Vite, isolated PostgreSQL 17 and the unmodified API on 18081 were used via Chrome's debugging protocol. Disposable sequences generated 19-digit IDs above MAX_SAFE_INTEGER; real API-created actuals included maximum income/expense amounts, inactive history, budgets and a separately excluded V1 expense. Two income rows yielded `199999999999999999.98`. A BLOCKED/overdue operational cursor was seeded only in the disposable DB with scheduling disabled; this checks reporting, not scheduler execution. Each attempt removed its own API/container. No shared/production data changed and no browser dependency was installed.

The final complete browser run passed:

- Ten viewports: 320x568,375x812,390x844,767x800,768x1024,820x1180,1023x800,1024x800,1280x800,1440x900. One main/h1/navigation, intact described-by references, no document horizontal overflow, 44px controls, neutral icons, appropriate sidebar widths and exact financial text/tones.
- Both charts had visibly sized bars after ResizeObserver settled; original SVG-only checks were strengthened. Exact aggregate hover tooltip checked. Final mobile/desktop screenshots were visually inspected with bars present; tiny-category values stayed in the exact list.
- Real Login returned to the selected reporting URL. Native period Apply/browser Back, inactive category Long-ID/date-filter drill-down, outside-month transaction detail/browser return, mobile Escape/trigger focus and native period Tab order passed.
- Reduced motion, forced-colors, opaque fallback and text-spacing reflow passed. Independent endpoint 500/retry was injected through CDP only and preserved the other successful real-API region.
- Empty owner returned exact zeros and separate widget empties. V1 overview/expense list/create/detail/edit routes loaded, /app still reached /dashboard, and real Logout removed the session.

Temporary evidence: Windows temp cointrail-dashboard-qa/results.json and PNGs (dashboard-320.png, dashboard-1280.png, forced-colors.png, text-spacing.png, empty.png), not repository assets/credentials. Early harness issues (system category name collision, Windows encoding, old disposable profile and period-render waits) were corrected without application changes. Early snapshots preceded chart resize settlement under CPU load; a rendered diagnostic confirmed correct dimensions, and the final real-API run waited for painted bars before capturing screenshots.

Manual checklist remains **partially open**: Firefox/Safari/iOS/physical devices, NVDA/VoiceOver, actual 200% browser zoom (320 CSS-pixel reflow was checked), exhaustive keyboard/hover/contrast audits, full manual legacy CRUD/error/filter/session variants, and exact 500-character browser stress (100-character names and descriptions approaching 500 were browser-tested; exact 500 retention is automated). These are reported QA follow-ups, not completed checks or implementation blockers.

### Delivery

Feature commit `c9927a3c8f43f3237e66a1dca72b28c7ad657bbd` was pushed on `feature/v2-dashboard`. [PR #22](https://github.com/deepakydv25/cointrail/pull/22) is open against develop, mergeable and **not merged**. Available CoinTrail CI was inspected and is running; final status must be reviewed on GitHub. This documentation follow-up records delivery only; no production code changed after verification. Remaining manual QA is documented above. Do not merge.
