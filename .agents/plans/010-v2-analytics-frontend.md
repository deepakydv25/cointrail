# CoinTrail V2 Frontend — Phase 5: Analytics

## Goal and approval boundary

Help users understand recorded V2 income and expenses over explicit periods, see category/account activity, inspect calendar trends and compare two periods. Reports explain persisted actuals, not balances, forecasts or recurring promises.

**Implementation approved as one focused frontend PR by the subsequent user request.** The original planning-only boundary applied to plan creation; it is superseded for Analytics implementation, verification and delivery. No dependency, backend/API/schema, instructions or Plans 006–009 changes are authorized. Do not merge the PR.

## Existing state and verified baseline

Inspected on 2026-10-09: AGENTS.md, planning skill, applicable feature-delivery/testing guidance, Plans 006–009, actual analytics controller/DTOs/service/range validation, TransactionRepository analytics queries/projections and analytics tests; frontend routing/authentication, Clarity UI, Dashboard charts/period helpers, financial transport and analytics service/tests.

- Fresh `git fetch origin develop` succeeded. Entry working tree was clean; branch stayed **develop**. HEAD and origin/develop both equal `5ca30ffa3fcdb619fc39859f29744f40b1f4210b`.
- GitHub metadata confirms **PR #25 is closed and merged** at that commit, merged 2026-10-09T13:03:15Z; its merge commit was verified as an ancestor of origin/develop. Do not infer current state from historical plan delivery notes.
- Accounts, Categories, Transactions, Dashboard V2, Budgets and Recurring management exist. `/app/analytics` does not exist; an unavailable-Analytics regression currently verifies NotFound. `/dashboard` is V1 and remains the authenticated default, including `/app` redirect.
- `src/services/analyticsService.ts` currently implements only `getCategoryBreakdown(range, signal)` for Dashboard V2. It validates calendar syntax/order, but not the five-year anniversary bound. `src/types/analytics.ts` currently contains AnalyticsTotals, CategoryGroup and CategoriesResponse only. Do not assume other reports already have frontend DTOs or pages.
- Existing React/Router/Axios/Tailwind/Recharts/lossless-json and Vitest/jsdom/RTL/user-event are sufficient. No new dependency or global query store is needed.
- Clarity provides AppShell, PageHeader, SurfaceCard, MetricCard, Button/ButtonLink, FormField, FormFeedback and Loading/Empty/Error states. CategoryIcon is a generic neutral-grey tag, not a category color registry. Dashboard owns `chartData.ts` and `IncomeExpenseChart.tsx`/AmountChart; its adapter accepts nonnegative decimal strings and has a fixed 0–1,000,000 normalized coordinate range.
- Existing backend tests cover range boundaries, DTO binding, owner isolation, inactive/current metadata, SQL grouping, zero filling, precision, V1 exclusion, generated actuals and read-only behavior. Inspection is evidence of contracts, not a fresh test pass. No implementation test/build/backend run is claimed for this planning-only task.

All frontend paths below are relative to `cointrail-frontend/`. Java paths are relative to `cointrail-api/src/main/java/com/deepak/cointrailapi/`.

## Verified backend capabilities and contracts

Sources: `analytics/AnalyticsController.java`, `AnalyticsServiceImpl.java`, `AnalyticsRange.java`, `AnalyticsDetails.java`, `AnalyticsGrouping.java`, `analytics/dto/*`, `transaction/TransactionRepository.java` and `Analytics*Projection.java`.

All five operations are authenticated, read-only GETs returning HTTP200 objects. Owner comes from the authenticated User, never a client userId. Query dates are required ISO calendar dates. Decimal amounts and Java long IDs/counts/dayCount are JSON numbers on the wire; lossless frontend transport represents all numeric tokens as strings. Names/dates/enums are strings; flags are booleans. No success wrapper, mutation, resource-detail endpoint or pagination exists.

### Shared exact response structures

```text
Range = { from: ISODate, to: ISODate, dayCount: long }
Totals = { income: BigDecimal, expense: BigDecimal,
           netCashFlow: BigDecimal, transactionCount: long }
Summary = { range: Range, totals: Totals }
CategoryGroup = { categoryId: Long, categoryName: string,
                  categoryType: EXPENSE|INCOME, system: boolean,
                  active: boolean, totals: Totals }
AccountGroup = { accountId: Long, accountName: string,
                 accountType: BANK|CASH|CREDIT_CARD|WALLET,
                 active: boolean, totals: Totals }
Bucket = { from: ISODate, to: ISODate, totals: Totals }
```

Money and counts are non-null; backend normalizes missing sums to 0.00. netCashFlow is income minus expense, signed. Category/account groups contain actual activity only, not unused resources. IDs are stable keys; metadata uses **current names**, including inactive historical references, rather than immutable name snapshots. Account totals are transaction activity and exclude opening balance. No currency field is returned; retain existing INR/en-IN presentation policy.

| Endpoint | Exact required query | Exact response | Ordering and limit |
| --- | --- | --- | --- |
| GET `/api/analytics/summary` | `from`, `to` | Summary | Inclusive range; end strictly before start.plusYears(5) |
| GET `/api/analytics/categories` | `from`, `to` | `{range,totals,items:CategoryGroup[]}` | Complete groups, categoryId ascending; same five-year bound |
| GET `/api/analytics/accounts` | `from`, `to` | `{range,totals,items:AccountGroup[]}` | Complete groups, accountId ascending; same five-year bound |
| GET `/api/analytics/trends` | `from`, `to`, `grouping` | `{range,grouping,totals,items:Bucket[]}` | DAILY/WEEKLY/MONTHLY uppercase; chronological ascending, zero-filled and clipped |
| GET `/api/analytics/comparison` | `from`, `to`, `compareFrom`, `compareTo` | `{current:Summary,baseline:Summary,delta:Totals}` | Each range independently obeys five-year bound; raw signed current-minus-baseline |

Example request: `/api/analytics/trends?from=2024-02-01&to=2024-02-29&grouping=DAILY`. Comparison uses explicit baseline query names; do not invent previous-period or normalization parameters.

### Calendar rules

- Public dates have years0001–9999, real Gregorian days and from<=to. Endpoints are inclusive; queries internally use to.plusDays(1) exclusive, even beyond public year9999. Do not impose a browser-today maximum: future ranges are allowed and show persisted actuals only.
- Summary/categories/accounts/comparison: `to < from.plusYears(5)`, with Java LocalDate leap-day clamping. From2024-02-29 allows through2029-02-27 and rejects2029-02-28. Calendar anniversaries are not fixed 1825-day caps.
- DAILY trends: at most366 inclusive days. WEEKLY: `to < from.plusYears(2)`; from2024-02-29 rejects2026-02-28. MONTHLY: same exclusive five-year anniversary. A two-year weekly range can span731 days; monthly range can touch61 clipped calendar buckets.
- Weeks start Monday; months use calendar month boundaries. First/last buckets clip to the selected inclusive range. Sparse gaps are zero-filled by the backend; render returned buckets, never independently rebucket or fetch transactions to aggregate.
- Dates are stored transaction dates; repository buckets do not convert them through a timezone. Analytics exposes no reporting timezone or asOf timestamp. It is independent of recurring Clock and worker configuration.
- Comparison supports unequal lengths and overlapping ranges. Deltas are raw values/counts, can be negative, and have no percentage or per-day normalization. Always show both ranges/dayCounts and warn when durations differ/overlap without prohibiting valid comparisons.

### Data inclusion, security and errors

- Only this user's persisted V2 transactions contribute, including generated actuals once and inactive references. V1 expenses, account opening balances, budget limits, unposted templates and forecasts are excluded.
- Edits, reassignment, deletes and renames change current reports of historical activity. A deleted generated transaction stays absent; reads never process, regenerate or repair recurrence.
- Service transactions are read-only READ_COMMITTED. Totals and groups within a report and separate reports are not guaranteed one synchronized snapshot during concurrent writes. Do not enforce client reconciliation, hide real rows to make totals match or claim atomic refresh.
- Missing/malformed dates/grouping and domain bounds return400. Shared JSON errors are `{status,message,errors}` with nullable field map; protected401 may be bodyless. Preserve Axios matching-session401 handling and normalization for403/404/unexpected409/5xx/network/timeout as applicable; analytics has no domain mutation-conflict workflow.
- There are **no** analytics accountId/categoryId/type filters, custom sort, pagination, search, top-N, percentages, balance history, forecast, export or origin/generated-versus-manual breakdown parameters. Sending unknown query keys must not be represented as supported filtering.

## Proposed Analytics experience

Protected main route: **`/app/analytics`**, within existing SiteLayout/AppShell/AppLayout/ProtectedRoute. Add one Analytics V2 navigation entry using an existing recognizable glyph; do not change Legacy destinations or login/default redirects. Use one page with report sections, not five independently routed screens.

### Range and URL state

- Canonical main URL keys: `from`, `to`, `grouping`; optional `compareFrom`, `compareTo` together. No account/category/type/sort/page keys. A comparison exists only when both baseline dates are supplied; removing comparison removes both keys.
- With an empty search only, replace with the browser-local current month's complete inclusive bounds and `grouping=DAILY`, reusing currentPeriod/monthRange. This is a navigation default, not a claim about server timezone/current day. Calendar years0001–9999 remain valid.
- For explicit valid from/to with absent grouping, use DAILY if<=366 inclusive days, otherwise MONTHLY, and replace with explicit grouping. An explicitly invalid grouping or a grouping incompatible with the range must show correction, never silently coarsen it.
- Reject unknown, partial, duplicate and malformed parameters. Keep invalid query visible, show accessible correction form, and make no report requests until corrected. Validate the main range and grouping consistently before dispatch; validate optional baseline independently. Do not silently drop an invalid baseline or substitute a different period.
- Native labelled From/To dates and grouping select with visible limit guidance. Form drafts preserve input; Apply validates then pushes history and loads committed URL state. Draft edits alone do not change displayed report labels or fetch. Back/Forward restore committed controls/results; cover native browser form restoration rather than relying only on jsdom.
- Comparison is opt-in: Add comparison reveals draft baseline fields but makes no request until Apply. Users choose both dates explicitly; no automatic prior month or equal-duration calculation. Remove comparison updates history. Main-range application with an existing baseline must validate all requested state.
- New ranges immediately stop displaying old-period financial values as current. Request keys include committed range, grouping/baseline as relevant and refresh attempt. Changing grouping only refetches trends; changing baseline only refetches comparison; changing main range refetches all applicable reports. Abort obsolete reads.

### Sections and exact presentation

1. **Overview:** four MetricCards from summary: Income (green), Expenses (red), Net cash flow (neutral signed) and Transactions (exact integer string). Label the inclusive dates; this is activity, not total balance. Zero is valid. Link income/expense to existing `/app/transactions?from=&to=&type=INCOME|EXPENSE&page=0`.
2. **Income vs expense trend:** grouped Recharts bars for each backend bucket, with paired income/expense series, one shared normalization maximum and labelled legend/pattern distinction. Indigo chart accents, green/red exact amounts; category colors never vary. Show a visible relative-scale explanation and exact accessible bucket table including from/to, income, expense, net and count. Partial weeks/months display actual returned bounds. Net is textual for this release; no signed-money chart adapter is required.
3. **Category activity:** category-type presentation toggle (Expense spending / Income by category) changes only which returned category rows are displayed; explicitly label it a breakdown view, not a global report filter. No request type filter. Indigo horizontal relative bars and generic neutral CategoryIcon; exact amount, type, system/custom, active/inactive and count on rows. Keep complete groups in backend ID order, including equal names with different IDs; no top-N or synthetic percentages. Category row drill-down links to Transactions with exact categoryId, type and main dates. Do not use category detail as the sole link: inactive category detail can be inaccessible.
4. **Account activity:** accessible responsive table/cards showing name, type, active/inactive, exact income/expense/net and count for all returned groups in backend order. This is not an account balance chart. Link to Transactions with accountId and selected dates; historical IDs need not appear in active selectors. A separate account chart adds little value here and is deferred.
5. **Compare periods:** optional SurfaceCard, separate request and independent status. Show current/baseline inclusive ranges/dayCounts and income/expense/net/count in three columns or stacked labelled rows: Current, Comparison, Delta. Render backend signed deltas exactly, with explicit +/−/zero semantics and no automatic good/bad interpretation. Keep delta styling neutral: a positive expense delta is not income. No percentage/normalized comparison chart in this release.

Each report has independent LoadingState, ErrorState/Try again and explicit Refresh. Refresh all reloads current applicable reports without resetting range drafts or attempting any writes; disable duplicate pending refresh actions. A successful report remains usable if another fails. During refresh show loading semantics and omit stale monetary values for that request; cancellation is not an error. Summary zeros, empty group arrays and zero-filled trend buckets are distinct valid states. Keep zero-filled bucket table available with a “No recorded transactions in this range” message. Comparison with an empty baseline remains valid zero/delta data, never divide by zero.

Navigation to Transactions carries supported exact date/type/account/category filters only. Preserve the existing transaction module's navigation conventions; do not promise an automatic return-to-Analytics feature absent from that module. Browser Back returns to the committed Analytics URL. An optional small Dashboard “View analytics” link should pass its selected monthRange and DAILY grouping; include only this navigation change, preserving Dashboard scopes and requests.

### Clarity, responsiveness and accessibility

Reuse white SurfaceCards on existing soft canvas, typography/spacing/borders/focus tokens; indigo actions/chart accents; green income and red expense amounts; charcoal icons on neutral category surfaces. No donut shares, rainbow category palettes, gradients or new glass surfaces. No dark-mode implementation.

Desktop uses overview grid and spacious full-width trend; category/account sections may use two columns where complete exact values fit. Tablet stacks dense breakdowns. Mobile320px uses labelled vertical controls/cards and wraps long names/max aggregates without document overflow. Tables remain semantic; a labelled horizontally scrollable region is permitted only when necessary, while surrounding content reflows. Full tables expose all groups and up to366 daily buckets; no fake server pagination or truncation. Measure render cost before introducing virtualization.

One main/h1, section h2s, labelled controls, linked validation messages, sensible focus on invalid Apply and no focus theft on refresh. Status/error announcements use existing live-region conventions without reading hundreds of rows. Exact tables provide all data by keyboard/screen reader; decorative chart geometry is aria-hidden as Dashboard currently does, with tooltips only a visual supplement. Tables use captions, scoped headers and an accessible disclosure if collapsed; chart data never requires hovering. Use legend labels/patterns rather than color alone; no animation, reduced-motion/forced-colors fallbacks inherited and manually checked. Targets>=44px, visible focus, 200%zoom/reflow and readable contrast.

## Financial precision and charts

- All services use shared Axios plus `financialConfig` with AbortSignal. Every monetary value, Long ID, transactionCount and dayCount remains an exact string. Do not use V1 numeric Expense types/formatCurrency or JSON.parse on financial responses.
- Reuse `formatMoney` for exact INR text; no Number/parseFloat/toFixed/round on amounts, totals, net or delta. Aggregate responses may exceed a single transaction's17-digit bound; do not apply transactionAmount/monetaryNumber request validation to report totals.
- Reuse `minorUnits` and chartData from Dashboard without moving or changing existing consumers unless a concrete, tested minimal extraction is needed. The actual helper is nonnegative only; input it only income/expense/category amounts. Keep signed net/delta as exact text. IDs remain strings in keys/routes/drill-downs; day/count comparison can use BigInt.
- Trend adapter flattens both series across **all returned buckets** into one normalization operation, preserving exact strings and bucket identity, then pairs coordinates by bucket. Category adapter normalizes the currently displayed category-type rows. Never normalize each bucket separately, sum rows for report totals, derive category shares or label coordinates as currency.
- Existing rule: `coordinate = Number(minorUnits(amount) * 1_000_000n / maximumMinorUnits)`; only this bounded integer geometry becomes Number. All-zero maximum gives zero. Rounding/truncation applies exclusively to relative geometry; tiny amounts may plot at zero and remain exact/nonzero in table/tooltip. Explain this limitation. Numeric axes are hidden or labelled relative units, never fabricated rupee ticks.
- Every tooltip uses original amount and exact date range/name, not a reverse conversion of the coordinate. Chart extent covers one shared scale, supports empty/all-zero data and remains finite for arbitrarily large aggregate strings.

## Technical architecture and expected files

Keep pages → existing domain services → shared transport. Local React state/effects, attempt keys and AbortControllers follow Dashboard conventions; no generic report framework/global cache/form library. AppLayout/ProtectedRoute matching-session remount remains authoritative. Mounted/request-key guards and cleanup ignore obsolete responses and late errors even if a test adapter ignores abort. No polling or automatic request retries.

| File | Proposed change |
| --- | --- |
| `src/types/analytics.ts` | Add AnalyticsRange, AnalyticsGrouping union/constants, SummaryResponse, AccountGroup/AccountsResponse, AnalyticsBucket/TrendsResponse, ComparisonResponse and request range types. Reuse existing AnalyticsTotals/CategoryGroup; every numeric field string. |
| `src/services/analyticsService.ts` | Keep getCategoryBreakdown signature for Dashboard; add getAnalyticsSummary, getAccountBreakdown, getAnalyticsTrends, getAnalyticsComparison. Match exact paths/query allowlists, shared financialConfig and optional signal; use endpoint-appropriate range validation without leaking grouping/baseline into other GETs. |
| `src/services/analyticsService.test.ts` | Extend real Axios-adapter contract/auth/precision/cancellation coverage to all five reports; preserve current Dashboard contract tests. |
| `src/pages/analytics/query.ts` and `query.test.ts` (new) | Committed URL parsing/serialization, ISO calendar/range/grouping/comparison validation and default canonicalization. Reuse existing isDate and currentPeriod/monthRange; small domain-local calendar day/anniversary helpers mirror LocalDate without timezone shifts. |
| `src/pages/analytics/AnalyticsPage.tsx` (new) | PageHeader, draft/committed range and comparison controls, keyed independent report requests, exact overview/account/comparison views and supported drill-downs. |
| `src/pages/analytics/AnalyticsTrendChart.tsx` (new) | Paired relative bars plus exact semantic bucket table, legend and empty/captured-range explanations. |
| `src/pages/analytics/CategoryBreakdown.tsx` (new) | Expense/income presentation switch, neutral icons, complete exact rows/table and relative bars, inactive/system metadata and drill-downs. |
| `src/pages/analytics/chartData.ts`, `chartData.test.ts`, `charts.test.tsx` (new) | Thin analytics-specific paired-series adapter reusing Dashboard geometry; tests for scales/exact values/table presentation. No independent financial calculator. |
| `src/pages/analytics/analytics.test.tsx` (new) | Full-page ranges/history, independent statuses/retries, metadata/drill-downs, comparison, abort/stale/session behavior. |
| `src/App.tsx`, `src/App.test.tsx` | One protected analytics route and authentication/deep-link coverage; replace obsolete unavailable-Analytics assertion with supported behavior without dropping NotFound coverage. |
| `src/components/Navbar.tsx`, `src/components/AppShell.test.tsx` | V2 Analytics navigation and responsive/menu/active-link assertions. |
| `src/pages/dashboard/DashboardPage.tsx` and its test | Optional selected-month View analytics link only; preserve current chart/financial/report-window behavior. |
| `src/index.css` | Narrow `.ct-analytics-*` responsive chart/table/control rules only if existing classes do not cover actual layouts. Reuse tokens; no design foundation rewrite. |
| `README.md`, this plan | Document report semantics/precision/limits and actual implementation/verification evidence after approval. |

These new names are proposals following inspected colocated domain-page conventions, not claims they currently exist. Split a concrete section into an additional local component only if the page becomes unwieldy; do not prebuild a universal analytics widget engine. No backend/migration/configuration/package/lockfile or Plans006–009 changes expected.

Calendar validation implementation must avoid JS Date year0–99 coercion/local DST. Use bounded calendar integers only for date arithmetic, with leap rules and anniversary clamp; allow validation anniversary comparison beyond public year9999 without exposing that date as a selectable public bound. Test exact LocalDate fixtures from AnalyticsRangeTest. No new Temporal/polyfill dependency is justified.

## Delivery strategy and implementation phases

Recommend **one focused Analytics frontend PR**: five read-only reports share range/state, precision and navigation; backend capabilities already exist and there are no mutation/lifecycle dependencies. Deliver reviewable commits/steps within that PR rather than a partially useful public route with temporary placeholders. If measured implementation scope grows, request approval to split core summary/trends/breakdowns from comparison before changing delivery scope.

### Phase 1 — Contracts, calendar and protected shell

- [x] Add exact DTOs and four missing service operations; retain Dashboard category behavior.
- [x] Implement tested endpoint-specific calendar bounds and validated committed URL state.
- [x] Add protected route and Analytics navigation; preserve defaults and V1 separation.
- [x] Establish independent request/session/cancellation/retry behavior.

Exit: actual five service contracts tested; invalid queries dispatch nothing; deep link/history/defaults behave as specified, no invented filters.

### Phase 2 — Overview and trends

- [x] Render four authoritative overview metrics and supported transaction links.
- [x] Add shared-scale income/expense trend geometry plus exact accessible bucket table.
- [x] Preserve zero-filled/clipped backend buckets and independent loading/error/retry states.

Exit: same-day,366-day, weekly cross-year and monthly leap-edge fixtures display all exact values with no financial Number conversion or client aggregation.

### Phase 3 — Breakdowns and explicit comparison

- [x] Add complete category expense/income views with neutral icons and supported drill-downs.
- [x] Add activity-only account breakdown, inactive/current metadata and exact IDs.
- [x] Add opt-in explicit baseline controls and raw signed delta comparison.
- [x] Add selected-month Dashboard link if accepted as part of plan approval.

Exit: all five reports work; same-name groups remain separate; empty/inactive groups and unequal/overlapping comparisons are truthful; no balance/share/forecast claims.

### Phase 4 — Responsive/accessibility and verification

- [x] Run targeted service/query/chart/page/navigation tests while implementing.
- [x] Run `npm run test:run`, `npm run build`, `npm run lint` and regression `mvn clean verify`.
- [x] Perform browser QA below where tools are available; record omissions honestly.
- [x] Review complete diff; run `git diff --check`; confirm forbidden-scope files untouched.
- [x] Update only this plan/README with actual evidence; delivery actions require an implementation request, not this planning task.

Exit: all required checks pass or unresolved failures are reported and resolved before delivery; unchanged V1/V2 assertions retained, no weak tests/timeout increases or runner changes to conceal failures.

## Automated test strategy

1. **Transport:** real shared Axios adapter asserts exact five paths/methods/query serialization, bodyless GETs, signal/token and financialConfig. Include maximum row99999999999999999.99, aggregate199999999999999999.98,0.01/0, signed net/delta/count, IDs aboveMAX_SAFE_INTEGER/Long.MAX_VALUE and numeric counts/dayCount parsed to strings. Assert no filter/pagination/baseline leak into unsupported endpoints; errors/bodyless401/400/404/5xx/timeouts/stale-session responses use existing normalization.
2. **Calendar/URL:** years0001/0099/9999, leap centuries1900/2000/2100, same-day/reversal/malformed/duplicate/partial/unknown params, explicit invalid enum/lowercase,366vs367inclusive days, weekly two-year and five-year exclusive anniversaries including2024-02-29, public max-year validation and default no-timezone-shift month bounds. Comparison independently validates both ranges, permits overlap/unequal lengths and uses correct query keys. Preserve Back/Forward and unsaved drafts.
3. **Geometry:** cross-series/common-maximum normalization (no per-bucket rescale), huge/tiny/equal/zero/empty, complete buckets, no NaN/Infinity, exact amounts retained, no sign-bearing values passed to nonnegative adapter, no currency/percentage ticks. Verify chart tooltips and accessible table show original strings, not reconstructed coordinates.
4. **Pages/components:** summary, independent partial failures/retry/refresh, pending guards, empty groups vs zero-filled trends, invalid URL makes no requests, grouping/baseline changes refetch only relevant data. Same names/different IDs, current renamed/inactive/system metadata, neutral icons, no top-N truncation, comparison signed deltas and duration caveats, all exact drill-down params.
5. **Safety/regressions:** cleanup AbortSignal, slow first period resolves after second, adapter ignoring cancellation, stale errors/refresh and auth/session replacement/unmount. Protected auth return route, unchanged `/dashboard` default, sidebar mobile disclosure/focus/history, Dashboard existing window semantics/category service and all existing V1/V2 suites. Never import expenseService/V1 amounts to these reports.

Prior Plan009 records intermittent local default-parallel frontend timing failures, with a full564-case bounded-worker pass. This is a known baseline risk, not permission to alter valid tests or claim a new pass. Run required default command, investigate failures and transparently distinguish execution-only bounded follow-up evidence from default results. Existing >500kB build warning is also historical; measure/report current results without unrelated bundle refactoring.

## Manual browser QA checklist

- [ ] Real authenticated direct route/refresh and login return, expired/logout/session-replacement behavior; Legacy and V2 remain separate.
- [ ] Widths320/375/390/768/820/1024/1280/1440; full sidebar/tablet/mobile disclosure, no document overflow, readable huge values/100-character names and same-name groups.
- [ ] Keyboard range/grouping/comparison Apply, error focus, retry/refresh, data-table disclosure/scroll and drill-down; native Back/Forward restoration agrees with URL and committed report labels.
- [ ] Actual200%zoom, text spacing, forced colors, reduced motion, focus/contrast, screen reader captions/headers/live states; never claim jsdom proves responsive behavior.
- [ ] Sparse/empty/income-only/expense-only and huge/tiny exact values; clipped Monday-week/month/leap edge labels; relative geometry caveat, tooltip/table exact text and no noisy color categories.
- [ ] Unequal/overlapping/empty-baseline comparison displays exact signed server delta and durations without percentages or inferred forecasts.
- [ ] Throttled/failed section and retries leave successful sections usable; rapid ranges/grouping/baseline changes do not flash stale financial values as current.
- [ ] Historical inactive account/category drill-down carries exact IDs and returns to Analytics via browser Back; renamed metadata and transaction edits/deletes affect refreshed current reports.
- [ ] Real Dashboard selected-month link retains its existing balances/month/window semantics; smoke legacy expenses/dashboard plus existing V2 navigation.

Use installed browser/debugging tooling and an unchanged disposable API/database if available; no dependency installation and no production data writes. Scheduler stays unchanged/disabled for report QA; generated-actual coverage can use existing backend test fixtures. Record browser versions/results and all uncompleted Firefox/Safari/mobile/assistive checks.

## Risks, gaps and decisions requiring approval

| Issue | Recommendation / approval boundary |
| --- | --- |
| Scope and delivery | Approve one frontend PR with all five reports and optional Dashboard link before implementation. This document alone does not authorize coding/delivery. |
| Chart accuracy | Approve reuse of relative normalized geometry with shared trend scale and exact textual tables; no currency ticks, financial Number conversion, category percentage or signed-net chart. This extends the previously approved Dashboard approach, not financial computation. |
| Default UX | Approve browser-local current calendar month/DAILY default, explicit custom ranges, opt-in explicit comparison and category-type presentation toggle. Future dates allowed; no prior-period inference. |
| Unsupported analytics filters | Omit account/category/global type controls. Use supported Transactions drill-down. Adding filtered aggregate/trend APIs requires separately approved backend/API work; never filter breakdown rows and claim summary/trends are filtered. |
| Missing metrics/features | No balances over time, net worth, savings rate, category shares, budgets vs actual report, predictions, generated-origin analysis, export or top-N endpoints. Defer; no client aggregation or fabricated substitutes. Existing Dashboard/Budgets/Recurring remain their own pages. |
| Ordering/large breakdowns | No server pagination/sorting. Preserve complete ID/chronological order; measure DOM cost of up to366 buckets and unbounded group count. Server pagination/custom sorting or snapshot API is separate approval. |
| READ_COMMITTED consistency | Explain refresh is not a synchronized snapshot; display actual envelopes independently, do not reconcile/sum locally. Backend snapshot changes require separate approval. |
| Historical metadata | Current names/inactive flags are available; historical name snapshots are not. Do not call names immutable historical snapshots. |
| Validation/shared consumer | Category service currently lacks anniversary check. Adding the true bound must keep valid Dashboard monthly requests/signature unchanged and regression-tested; avoid moving unrelated date/financial helpers. |
| Operational safety | Analytics GETs never drive workers. PR25's operator timezone/scheduler release confirmation remains separate and unresolved; this frontend analytics plan does not settle or change it. |
| Dependencies/business/security | None needed or proposed. Stop for separate approval if implementation requires API/schema, currency policy, deployment settings, authentication/security or broader scope changes. |

## Planning completion evidence

- [x] Verified PR25 merged and current develop equals freshly fetched origin/develop; clean entry tree and no branch changes.
- [x] Inspected real five endpoints, exact records, range/calendar logic, aggregation queries and relevant backend/frontend tests.
- [x] Documented current frontend gaps, proposed reusable UI/precision approach, files, phases, acceptance, tests and approval decisions.
- [x] Created only this plan; no implementation/test execution/dependency installation/delivery actions performed during planning.
- [x] User approves implementation scope and UX decisions above.

Planning evidence above is historical. Implementation progress is recorded below; Plans006–009 retain their original evidence unchanged.

## Phase 5 implementation and verification — 2026-10-09

Preparation fetched origin/develop and verified PR25 merge commit `5ca30ffa3fcdb619fc39859f29744f40b1f4210b` as its ancestor. Local develop matched that latest commit. The only uncommitted file was this approved plan; it was preserved when creating `feature/v2-analytics` from origin/develop. No unrelated work was overwritten. The user explicitly approved all four phases, relative chart geometry and the selected-month Dashboard link.

### Implemented behavior

- Exact DTOs and all five read-only services match existing controller/records/queries. Every GET uses shared Axios/financialConfig/AbortSignal and explicit query allowlists. Dashboard category signature is retained; valid month requests remain unchanged. Monetary aggregates, IDs, dayCounts and transaction counts stay strings, with no request-row precision cap on responses.
- Protected Analytics route, V2 sidebar entry and Dashboard View analytics link are delivered. V1 routes/models/financial APIs/defaults remain unchanged. No dependency, backend/configuration/schema, shared financial/session transport, instructions or Plans006–009 changes.
- Calendar-only ordinal/anniversary validation mirrors inclusive366-day and exclusive two-/five-year LocalDate bounds, including leap clamps and validation beyond year9999. No date timezone conversion for grouping. Empty URL gets an explicit browser-local calendar month; valid explicit dates missing grouping get the approved default. Unknown/duplicate/partial/invalid query parameters require correction without fetching reports.
- Range/comparison drafts remain independent from committed URL state. Apply pushes history; default canonicalization replaces history. The native popstate reconciliation follows the existing Recurring pattern and never refetches unchanged report data. Grouping changes load only trends; baseline changes load only comparison; period changes abort affected reads. Optional comparison has explicit paired dates, no inferred prior period.
- Four MetricCards display server income/expense/net/count. Trends render returned buckets only, including zero-filled gaps and clipped bounds, with exact scoped-header table and original-value tooltip. Income and expense share one normalization maximum across all buckets, using existing Dashboard chartData; only bounded coordinates become Number. Solid/striped indigo series provide non-color differentiation. Signed net/deltas remain textual; no shares/currency ticks or financial totals are computed.
- Complete category groups use stable ID keys, neutral tags, current names/system/active metadata and an expense/income presentation switch that does not filter other reports. Account activity shows exact income/expense/net/count and inactive metadata, never balance. Drill-downs send only supported Transaction date/type/account/category parameters, not response dayCount or Analytics-only keys. Comparison displays exact backend signed deltas/count with explicit positive sign, overlap/unequal-duration caveats and no normalization/percentages.
- Domain-local Report handles the identical five independent read lifecycles, keyed attempts/load identity, retry/refresh pending guards and abort cleanup. Matching-session transport and protected session remount remain unchanged. Late success/error from old ranges/attempts/sessions cannot overwrite current data; refresh suppresses old financial values while preserving drafts. Errors remain local and retry only on explicit action. No polling, writes, worker control or fictitious scheduler status.
- Reused existing Clarity cards/headers/fields/feedback/metric/navigation/chart helpers. Scoped Analytics CSS adds responsive controls/comparison and a labelled focusable table scroll region. New production files are AnalyticsPage, AnalyticsTrendChart, CategoryBreakdown, chartData and query; test fixtures are colocated in fixtures.ts. README documents exact semantics and limitations.

### Automated verification

| Check | Actual evidence |
| --- | --- |
| Targeted | Final focused analytics service/query/chart/page plus App/Dashboard/AppShell run: **8 suites / 171 passed**, with execution-only `--maxWorkers=2`. Earlier calendar/geometry/current category transport run:3 suites/45 passed. |
| Full default frontend | Final `npm.cmd run test:run` after the card layout refinement: **40 suites / 665 passed**, exit0, **82.09s**. Previous default run after backend verification also passed665 in82.20s. All564 baseline cases retained plus101 added cases. No runner configuration, timeouts or valid assertions weakened. |
| Final build/lint | Final `npm.cmd run build` and `npm.cmd run lint`: **passed**, exit0. CSS34.58kB/7.93kB gzip; JS861.45kB/248.23kB gzip. Existing >500kB bundle warning remains. |
| Backend | `mvn.cmd clean verify`: **BUILD SUCCESS**, exit0, **529 tests**, zero failures/errors/skips, **14:59min**. Existing test-context/connection teardown/toolchain warnings, including Surefire fork shutdown warning, remain; no backend changes. Initial sandbox attempt could not access Maven cache; required verification reran with normal cache/Docker access. |

Default-parallel investigation: first full run overlapped Maven/Testcontainers and had30 timing/DOM failures across13 new and unchanged suites, plus worker-shutdown timeouts. Read-only Windows inspection found ~335MB free physical memory out of ~8GB. Resource pressure is an inference consistent with broad failures and slow test/process startup, not a demonstrated application defect. After Maven finished, the unchanged default command passed all665 cases. A new large-group chart test was scoped to its list/last row to avoid repeatedly scanning unrelated chart DOM; meaningful complete120-group assertion retained. Chart mocking follows existing Dashboard tests; real chart rendering is separately exercised in browser QA.

Initial new-test/build corrections: use the actual CategoryIcon default export; fix a typed never-resolving union-service mock; table date labels now explicitly say “through” for accessibility, and assertions target semantic row headers. These were corrected without disabling tests or changing backend behavior.

### Browser and keyboard evidence

Full **23-check** browser flow passed in installed **Chrome155.0.8059.39**, against the unchanged API and a disposable PostgreSQL17 database. Large ID sequences were seeded only in that disposable database; all financial actuals were created through existing APIs with exact numeric JSON. The recurring scheduler stayed disabled with disposable UTC configuration; no source/deployment settings changed.

- Real protected Analytics reporting deep link returned after login. Report includes two maximum expense actuals plus0.01: exact expense aggregate199999999999999999.99 and signed net-100000000000000000.00; opening balance is excluded and count is4. Routes/selectors/drill-downs preserve19-digit Long IDs.
- Reports at320/375/390/768/820/1024/1280/1440: no document overflow, one main/h1, complete exact aggregate text, minimum visible controls>=44px and intact described-by targets. Mobile320 and desktop1280 screenshots visually inspected. A scoped auto-fit overview grid gives large financial values wider cards rather than four cramped desktop columns.
- Real weekly report exposed five Monday/clipped buckets with exact table; monthly grouping reduced to the one returned bucket; daily report exposed29 February buckets. Category view switched to income without pretending to filter overview/trends. Inactive current account/category metadata and neutral icon styling retained.
- Grouping Apply and actual Back/Forward restored URL/control/table state. Explicit unequal overlapping comparison displayed server signed deltas and caveats, at desktop/mobile widths; removal cleared both baseline parameters.
- Native date-field segmented Tab sequence reached To; invalid Apply focused To and preserved the draft From. Unsupported accountId query showed correction without displaying financial reports. Empty January report retained31 backend zero-filled daily buckets.
- Real historical account Transactions drill-down retained its exact ID/date context and browser Back returned to Analytics. Dashboard View analytics preserved the selected February month. Mobile navigation closed on Analytics selection; legacy `/dashboard` still rendered its separate legacy body.

Temporary evidence: Windows temp `cointrail-analytics-qa/results.json` plus reports-320/reports-1280/comparison-320/comparison-1280/empty-320 PNGs. Earlier harness attempts collided with seeded Salary system category, assumed a single Tab skipped all native date segments, and clicked comparison before a history-restoration task settled. Only disposable fixture/harness code was corrected; no backend or business behavior change was made to satisfy those harness errors. The final full flow passed. Task API/database/browser were removed and task Vite stopped; unrelated processes preserved.

Uncompleted manual QA: Firefox/Safari/iOS/physical devices, NVDA/VoiceOver, actual200%zoom, exhaustive contrast/text-spacing/forced-colors/reduced-motion and keyboard audit; browser-injected network/slow/session-replacement variants; full real-browser V1 CRUD; very large group/bucket performance profiling. Automated coverage includes independent errors/retry/refresh, stale reads/errors, session replacement, complete120-category groups and calendar extremes; it does not substitute for those manual checks. The corresponding broad manual checklist remains partially open.

No unresolved Analytics API/business/security decision or feature blocker was found. Missing filters/shares/balances/forecast/export/pagination remain deliberately excluded as approved. Existing bundle warning and recurring operator confirmation remain separate known follow-ups. Complete production/test/document diff and all22 staged files reviewed; `git diff --check` and `git diff --cached --check` passed. Forbidden-scope diff is empty. Final frontend rerun after the card layout refinement passed as recorded above. Delivery is authorized on `feature/v2-analytics` targeting develop; merge remains excluded.
