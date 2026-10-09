# V2 Budgets and Recurring Transactions

## Goal and status

Plan Phase 4 of the V2 frontend: manage monthly expense-category budgets and recurring income/expense rules using CoinTrail Clarity, exact financial transport and existing backend behavior. Budgets explain actual utilization; recurring rules explain future scheduling without promising posting or inventing forecasts.

**Planning only; implementation not authorized by this document.** Recommend two focused PRs, Budgets first and Recurring second. No production changes, dependencies, backend changes or delivery actions are part of this task.

## Existing state and verified baseline

Inspection on 2026-10-09 read AGENTS.md, the planning skill and backend testing guidance, Plans 006–008, controllers/DTOs/services/repositories, recurrence worker/calculator/configuration, migrations V11/V12, relevant test scenarios and current frontend conventions.

- GitHub PR #22 is **closed and merged**, verified through current PR metadata rather than assumed from previous delivery. Merge commit: `2ab8bd585387ee6cec2a57998eb6e4610fec52e3`, merged 2026-10-09.
- Fresh `git fetch origin develop` succeeded. Current branch remains **develop**; HEAD and origin/develop both equal **`bae03493d64f3bccdae210e695b0b5a84e9fd07a`**. Latest commit merges PR #23, the subsequent Dashboard documentation commit `b82d038`. No branch was created/switched. Working tree was clean before planning.
- Plan 008's “not merged” statement is historical and now stale; do not edit it or Plans 006/007 under this request. Actual source and verified merge history establish the baseline.
- Dashboard V2 exists at `/app/dashboard`; Accounts, Categories and Transactions already work. Neither budget nor recurring management services, DTO modules, pages or routes exist. Dashboard has read-only summaries and recurring preview IDs; it currently has no management links.
- React 19/Router 7/Axios/Tailwind 4/lossless-json/Recharts and Vitest/jsdom/RTL/user-event are already installed. No dependency is needed. Tests are colocated with source; pages use local state and domain services, not a query-cache library or generic CRUD framework.
- App.tsx's SiteLayout owns AppShell, skip target and pathname heading focus. AppLayout distinguishes legacy presentation. ProtectedRoute remounts by sessionVersion. `/dashboard`, `/expenses/*`, `/app` redirect and ordinary authenticated defaults remain unchanged.
- Reuse PageHeader, SurfaceCard, MetricCard, Button/ButtonLink, FormField, FormError, States, inline ConfirmationPanel, FinancialRow where its transaction semantics fit, CategorySelect and CategoryIcon. Category icons are generic monochrome tags; no reliable semantic glyph registry exists. Use ordinary budget rows rather than mislabeling a limit as an expense transaction.
- `api/financial.ts` supplies financialConfig, monetaryNumber, identifierNumber, longId and formatMoney. All numeric response tokens, including page metadata, become strings. `transactionService.transactionAmount` already wraps positive-money validation with amount-specific errors. Reuse it as a narrow existing helper initially; moving it to a shared helper is optional only if concrete reuse warrants a behavior-preserving, tested extraction. Do not expose openingBalance error text for budget amounts.
- `pages/dashboard/period.ts` provides validated year/month URL handling and exact inclusive month boundaries. Reuse it without moving every consumer. `pages/transactions/query.ts` supplies ISO calendar validation; use a small recurring query module following that pattern. Dashboard normalized chart geometry is available, but is not a budget percentage API.

Backend paths below are relative to `cointrail-api/src/main/java/com/deepak/cointrailapi/`; frontend paths are relative to `cointrail-frontend/`.

## Verified API contracts

All operations use bearer authentication and server-derived owner. No userId payload. Lists are raw arrays or Spring Pages; there is no success envelope. Shared errors use `{status,message,errors}` with nullable field map; bodyless security 401 is possible. Validation/domain errors return 400; absent/foreign owned records return indistinguishable 404; duplicate budget and recurring lifecycle/backlog conflicts return 409. Preserve shared Axios auth, cancellation and error normalization.

### Budgets

Sources: `budget/BudgetController.java`, DTOs, BudgetServiceImpl/BudgetRepository, transaction aggregation and V11. Contracts:

| Operation | Request | Success |
| --- | --- | --- |
| POST `/api/budgets` | `{categoryId:Long,year:Integer,month:Integer,amount:BigDecimal}` | 201 BudgetResponse |
| GET `/api/budgets?year=2026&month=10` | Both period parameters required | 200 BudgetResponse[] |
| GET `/api/budgets/{id}` | Owned positive Long | 200 BudgetResponse |
| PUT `/api/budgets/{id}` | `{amount:BigDecimal}` only | 200 BudgetResponse |
| DELETE `/api/budgets/{id}` | No payload | 204, empty body |

Exact response fields: `{id,categoryId,categoryName,year,month,amount,spentAmount,remainingAmount,overBudget,createdAt,updatedAt}`. IDs are Long; period integers; monetary fields BigDecimal; overBudget boolean; timestamps LocalDateTime strings, with no invented UTC offset. All numeric fields become frontend strings. No category active/system/type metadata, percentage, account association, budget name, pagination, account filter or sorting parameter is exposed.

Rules:

- Create requires active system or owned custom **EXPENSE** category. CategoryId positive; year 1–9999, month 1–12. Past/current/future budgets are supported; no current-month restriction.
- Amount is required, at least 0.01, at most 17 integer/2 fractional digits. One definition per owner/category/year/month; application check and named database uniqueness protect races (409). No rollover, overall/month-wide budget, copying or multi-category definition.
- List order is categoryId ascending then id ascending. Preserve it; no fictitious server sorting/filtering. Empty is `[]`.
- Update changes **amount only**. Category and period immutable. Existing definitions with inactive categories can still be read, amount-edited and deleted. Current category names are returned; no historical name snapshot or inactive flag is promised.
- spentAmount aggregates this owner's V2 EXPENSE actuals in the category from first-of-month inclusive to next-month exclusive. Includes inactive references and generated actuals once; excludes V1, income, opening balances and unposted rules. Transaction edits/deletes can change it.
- remainingAmount = amount minus spent, may be negative; overBudget is strictly spent > amount (equality is not over). Aggregate spending can exceed individual row precision; never cap/validate response totals to the request range.
- Delete hard-removes only the definition, regardless of period/utilization/inactive reference; transactions survive. Recreation is permitted. No restore API or deactivation state. No additional service restriction on deletion was found.

### Recurring transactions

Sources: `recurringtransaction/RecurringTransactionController.java`, DTOs, ServiceImpl/Resources/Specification/Repository, Calculator/Worker/Scheduler/Config and V12.

| Operation | Request | Success |
| --- | --- | --- |
| POST `/api/recurring-transactions` | CreateRecurringTransactionRequest below | 201 response |
| GET `/api/recurring-transactions` | Optional status/type/accountId/categoryId, page/size/sort | 200 raw Spring Page |
| GET `/api/recurring-transactions/{id}` | Owned positive Long | 200 response, including terminal rules |
| PUT `/api/recurring-transactions/{id}` | UpdateRecurringTransactionRequest below | 200 response |
| POST `/{id}/pause` under same base | No payload | 200 response |
| POST `/{id}/resume` under same base | No payload | 200 response |
| DELETE `/api/recurring-transactions/{id}` | No payload; **cancel**, not hard delete | 204, empty body |

Create: `{accountId:Long,categoryId:Long,type:EXPENSE|INCOME,amount:BigDecimal,description:string|null,frequency:DAILY|WEEKLY|MONTHLY|YEARLY,startDate:ISODate,endDate:ISODate|null}`. Description/endDate can be omitted; normalize deliberately without losing null description during repair. Update: **required accountId/categoryId/amount**, optional nullable description only. No type, frequency, date, status, cursor or userId fields in writes.

Exact response: `{id,accountId,accountName,categoryId,categoryName,type,amount,description,frequency,startDate,endDate,nextDueDate,status,blockedReason,createdAt,updatedAt}`. Long IDs/money numeric on wire, strings in frontend. Description/endDate/nextDueDate/blockedReason nullable; dates are YYYY-MM-DD, timestamps LocalDateTime. Dashboard currently declares frequency/status unions inline on PendingRecurringTransaction; reuse indexed property types or introduce matching management enum constants without assuming named exported enums already exist. Management DTO remains distinct from the compact preview. No active reference flags, worker enabled setting, rule timezone field, occurrence list, transaction IDs or generated-history counters.

List: status ACTIVE/PAUSED/BLOCKED/CANCELLED/COMPLETED; type EXPENSE/INCOME; accountId/categoryId exact IDs. Default page 0, size 20; allowed sorts createdAt/updatedAt/nextDueDate in either direction; controller appends id,desc tie-breaker. PaginationConfig clamps oversized size to 100 (controller test demonstrates size999 ->100); frontend accepts 1–100 explicitly and nonnegative int-range page. Raw page consumed fields content/number/size/totalElements/totalPages all numeric strings; do not reuse numeric V1 PageResponse. No date range, frequency, text search or rule-origin transaction filter. Backend nullable-next-due ordering is not overridden client-side.

### Recurrence and lifecycle rules

- Create requires active owned account and active system/owned category matching type. Money rules equal positive transaction money; optional description max500. No semantic/name uniqueness: duplicate-looking rules are allowed; block duplicate submit, but do not invent duplicate-rule detection.
- Start is today/future according to **configured recurring Clock**, within years 1–9999. Optional end on/after start and inclusive. Interval one only. DAILY daily, WEEKLY seven days, MONTHLY/YEARLY calculated from original anchor with month-end/leap clamping. Jan31 -> Feb28/29 -> Mar31; Feb29 yearly regains Feb29 in leap years. Do not derive a new anchor from last clamped occurrence.
- Create saves ACTIVE with nextDueDate=startDate; does **not post inline**. Type/frequency/start/end immutable. Response cursor is authoritative; frontend does not calculate replacement cursors, completion or predictions.
- Terminal CANCELLED/COMPLETED reject update/pause/resume (409). Pause is idempotent for PAUSED and supported for ACTIVE/BLOCKED; it clears blockedReason and retains cursor. Resume on ACTIVE is a no-op; frontend need not offer that redundant action.
- Resume PAUSED picks next anchored date on/after recurring today, **skipping paused dates**, and revalidates resources if another occurrence exists. If none remains, returns COMPLETED. BLOCKED resume conflicts; no “resume blocked” recovery control.
- Cancel is retained-template cancellation: stops future generation, clears cursor/reason, preserves posted actuals and occurrence identity. Repeated CANCELLED cancel is allowed. Backend also allows cancelling COMPLETED (changing status to CANCELLED); propose no redundant terminal cancel control in normal UI and document this API/UI distinction rather than asserting a backend prohibition.
- Update rejects changed amount/description when an unprocessed occurrence is due/overdue. Due association changes also conflict unless BLOCKED. PAUSED checks the anchor on/after today: paused history is skipped, but a due-today occurrence can still block edits. A processed occurrence whose transaction was deleted is not unprocessed backlog.
- BLOCKED association repair is supported even with backlog, **only with numerically unchanged amount and exactly unchanged description**. Revalidate replacement references/type. Repair does not advance cursor, clear BLOCKED, generate or recover inline. Future BLOCKED rules may technically allow broader edits when no unprocessed due date; conservative dedicated repair UI is still useful. Do not infer the server's backlog check from browser date alone.

### Scheduler, generated actuals and operational limits

Automatic processing exists: @EnableScheduling plus scheduler fixed-delay, worker transaction, row locking, occurrence uniqueness and bounded chronological batches. application.yml requires `RECURRING_TIMEZONE`, defaults `RECURRING_ENABLED=false`, poll PT1M, template batch100, occurrence batch50. Compose requires stable deployment timezone. Source/configuration do **not prove deployment enablement**.

Worker processes due ACTIVE/BLOCKED rules; inactive/ineligible resources make a rule BLOCKED with reason, preserving backlog. On a later worker cycle eligible repaired associations recover ACTIVE and catch up chronologically; batches may take multiple cycles. PAUSED/terminal rules are not posted. Read GETs never generate or repair. No public “run now”, “process backlog”, “retry recovery” or settings endpoint exists.

Generated rows are ordinary V2 transactions with financial snapshots and scheduled transactionDate; rule edits don't rewrite them. Backend occurrence table ties rule/date to transaction internally, retains processed identity with transaction_id null after normal transaction deletion, preventing reposting. Public TransactionResponse exposes **no recurring origin metadata** and no per-rule history endpoint exists. Link to general Transactions only, with truthful copy; never label filtered account/category actuals as a rule's generated history.

Plan006 explicitly gates recurring mutation rollout on operator confirmation of existing timezone/scheduler. Preserve that gate. Do not enable worker, pick/change timezone or add a client-generated fake enabled flag. Confirmation is a deployment decision before recurring mutations are released, not a reason to modify the APIs.

## Business invariants and acceptance criteria

- [ ] Preserve V1 paths/defaults/data/contracts; never import expenseService or numeric V1 models into these modules.
- [ ] All money and Long IDs remain strings in domain/forms/URLs/selectors. Numeric JSON payloads use LosslessNumber via monetaryNumber/identifierNumber; no Number/parseFloat/round/toFixed money conversion.
- [ ] Authoritative budget amounts/utilization/remaining/overBudget and recurring status/cursor/reason come from server; no synthetic totals, percentages or lifecycle transitions.
- [ ] Every create/update respects exact DTO fields; terminal views show unavailable actions and nullable fields safely.
- [ ] Read cancellation and session guards prevent stale values/user leakage; mutation failures retain inputs and never automatically replay writes.
- [ ] Destructive copy distinguishes **delete definition** from **cancel recurring rule**, preserving transactions in both cases.
- [ ] Recurring deployment gate is explicitly settled before enabling mutation rollout.

## Budget UX and technical design

Routes: protected `/app/budgets`, `/app/budgets/create`, `/app/budgets/:id`, `/app/budgets/:id/edit`. Routes are frontend screens backed by list/item/create/update endpoints, not new backend endpoints. Add Budgets to V2 navigation only when delivered.

List uses current browser-local month as explicit URL default (replace only when both period parameters absent). Reuse validated period helpers; malformed/partial/duplicate year/month displays correction, makes no request and does not silently reset. Apply selection pushes history; Back/Forward restores period. Keep query-aware create/detail/edit/back links with selected year/month, validating destination instead of accepting arbitrary return URLs. Budget item itself belongs to its response period even if navigation context differs.

Use PageHeader with Create budget and a native month/year form; white SurfaceCard list. Each row has neutral CategoryIcon, name, reporting month, exact “Limit / Spent / Remaining” labels, explicit “Over budget” when backend flag true. Remaining negative stays signed/red; planned limit is neutral, actual spending red. No category colors, fictional expense type badge for a limit, or required percentage. **First release utilization is exact text**, avoiding unnecessary progress calculation/percentages. Optional indigo bounded visual progress is deferred unless specifically approved/reviewed; no new chart dependency.

Detail repeats exact amounts, timestamps, period and category; amount edit and definition delete. Create selects active EXPENSE categories (system and custom) using existing CategorySelect; selector empty/error has retry and existing category navigation. Duplicate 409 preserves values and explains one definition per category/month; do not silently overwrite. It is not necessary to hide categories with budgets to implement authoritative duplicate handling. Edit locks category/year/month as text, not disabled submitted payload fields; no active category fetch required for editing a historical definition.

Do not infer inactive/system status from an absent category in active selectors: BudgetResponse does not expose it. Historical category name/ID remain readable. Transaction drill-down may use type=EXPENSE/categoryId/from/to from response period and exact ID; do not imply account-specific spending.

Deletion uses inline ConfirmationPanel: “Delete this budget definition? Existing transactions will remain.” Explicit keep/delete, pending guard, error retained, cancel focus restoration. Success returns to validated month list with notice and fresh data; adjust neither transactions nor dashboard totals locally. Dashboard summary gets “View budgets” with its selected period in first PR; budgets provide dashboard link with same period. Returning dashboard remount/refetch provides fresh values, no global financial cache.

## Recurring UX and technical design

Routes: protected `/app/recurring`, `/app/recurring/create`, `/app/recurring/:id`, `/app/recurring/:id/edit`. This is intentionally shorter than Plan006's originally suggested `/app/recurring-transactions`; backend stays `/api/recurring-transactions`. No route exists at either frontend path now, so no alias/redirect is necessary. Approve this naming in plan review. Add Recurring transactions V2 link only in its PR. Dashboard gets all-rules link and real preview-detail links using returned rule IDs; preserve server-window copy.

List query state: status/type/accountId/categoryId/page/size/sort. Default all statuses/types, page0,size20,createdAt,desc. Native filters, validated enums/IDs/int bounds/sort allowlist; reject ambiguous repeated recognized parameters rather than guessing; filter/size/sort changes reset page. Preserve query across create/detail/edit/back; browser history works. No frequency/date/text filter sent. Active selectors supply choices, but historical selected IDs must remain exact even if absent: show an explicit selected-ID option/context, not a silently cleared filter. Render paged empties separately from no rules and no matches. If cancellation/filter change makes page invalid, reload then offer a valid preceding/first page without pretending metadata is zero.

Financial rows can display EXPENSE/INCOME amounts with explicit badges plus red/green, generic neutral icons, description fallback, account/category names, frequency, status and nextDueDate or “No next due date”. Terminal rows retained; inactive refs remain readable. No inferred active badges. Detail displays original schedule/date range, latest cursor, status/reason and truthful lifecycle guidance; no generated-history table or speculative overdue flag based on local clock. If server clock metadata is unavailable, label “Next due” without calculating authoritative overdue state.

Create uses active accounts and matching categories, positive exact decimal text amount, optional500-character description, four frequencies, native start/end dates. Changing type clears mismatched category, keeps other form values. End blank -> null. Provide anchor/clamping and inclusive-end guidance; do not preview fabricated posting dates. Start required/calendar-valid and end>=start; backend validates today in deployment zone. Do not use browser-today as a hard `min` or reject a valid server-today date.

Recommended date context: optionally request existing GET `/api/dashboard` using current validated browser period to read pendingRecurringTransactions.asOfDate/timezone. Treat it as contextual clock information captured at response time, independent loading/retry, **not scheduler enablement**, live current time or required prerequisite for saving. If unavailable/stale, explain server-authoritative date check; still allow server validation. No new settings API or timezone configuration. Do not overfetch analytics or use monthly totals to determine schedule eligibility.

Ordinary edit requires account/category/amount/description replacement. Schedule/type displayed read-only. Show old names/IDs if no longer eligible; require active replacements for submit rather than sending disabled inactive options unnoticed. No due-state client prediction replaces 409; preserve inputs and offer explicit detail/resource refresh. Refresh must not silently overwrite dirty financial inputs or automatically resubmit. If status becomes terminal, keep entered values visibly but disable invalid writes with explanation.

For BLOCKED, offer a clearly named **Repair account/category** mode within edit: editable eligible references; read-only exact original amount and description. Submit full replacement payload preserving both, including null/empty distinction. If refreshed data differs, ask user to review current version before sending old values; no optimistic force-write or revision token exists. After success show returned BLOCKED/status, explain worker-managed recheck and manual refresh. No immediate recovered/posting success claim. Normal financial edits for a blocked rule can be omitted in this conservative initial UI; backend capabilities and this UI limitation are explicit.

Lifecycle action presentation:

| Status | Offered actions | Required explanation |
| --- | --- | --- |
| ACTIVE | Edit, Pause, Cancel | Due financial edits may conflict; pause skips dates on later resume |
| PAUSED | Edit, Resume, Cancel | Resume on/after recurring today; no catch-up of paused dates; may complete |
| BLOCKED | Repair references, Pause, Cancel; Refresh | Worker recovery preserves/catches up backlog; no resume |
| CANCELLED / COMPLETED | Read-only + Back/Transactions | No edit/pause/resume; generated actuals remain |

Pause/Resume use explicit inline confirmation describing skipped dates and possible completion; Cancel uses destructive confirmation and “Cancel rule” copy, never “Delete transactions”. On success use/refetch server response, no fabricated state. Cancellation returns to filtered list with notice; rule remains accessible via direct detail. Read failures expose retry; lifecycle/write errors stay local with inputs/actions available after pending settles. Never auto-retry a timed-out financial mutation: it may have committed; instruct refresh/review before another explicit attempt.

## Shared architecture, accessibility and responsive behavior

Create `types/budget.ts` and `types/recurringTransaction.ts` with the exact inventories above. Use strings for every financial/numeric response token, including year/month and Spring Page metadata; request period strings convert only validated bounded calendar integers if needed for numeric JSON (never money/ID). Keep DateOnly/LocalDateTime as strings rather than invented wrappers. Define concrete create/update/query interfaces and enum/sort constants; no unused occurrence DTO.

Services return typed raw response.data, use shared Axios with financialConfig for **every** operation (including deletes/lifecycle error bodies), exact longId URL segments, LosslessNumber monetary/FK payloads and AbortSignal on reads. POST pause/resume send no JSON object/body. Validate query/date boundaries before requests; backend authoritative. No global Axios transform changes, V1 transport edits, userId, API scope changes or additional dependencies.

Pages follow existing transaction request patterns: AbortController plus current-request/attempt guard, hide replaced resource/user data during load, independent retry for selectors/clock/detail, ignore axios cancellation, session-version remount and matching-session401 behavior. Mounted/session guards also prevent post-mutation navigation after logout/session changes. Disable duplicate submit and overlapping lifecycle actions; refresh eligible resources preserves edits. Concurrency can race scheduler/resource changes: show400/404/409 and refresh; do not add unsupported optimistic-lock semantics.

Clarity uses current token classes: off-white canvas/white cards, indigo primary/focus/selected nav, neutral icon tile/charcoal stroke, green actual income/red actual expense and over-budget text with labels. No global V1 restyle or new category colors. Semantic main/h1 per page, h2 sections, lists or description lists, associated native labels/hints/errors, unmatched-key summary, alert/status and busy regions. ConfirmationPanel is an **inline form, not modal**: keep initial focus, Escape/cancel restoration; do not nest it inside another form or add fake focus trapping.

320/375/390 mobile: stacked amounts/controls/actions without document overflow; tablet compact sidebar and wrapping filters; desktop readable aligned rows/cards. Reuse shell's menu/keyboard/skip behavior. Controls meet existing44px targets; long100-character names/500-character descriptions and 17-digit amounts wrap. Pending labels remain meaningful. Color isn't sole state cue. No hover-only financial information, animation dependency or inaccessible disabled link. Forced-colors/reduced-motion/text spacing/200% zoom use existing fallbacks.

## Recommended delivery strategy

**Option B: two focused PRs.** Budget CRUD is small and independent of recurring management; existing generated actuals already affect budget spending. Recurring includes immutable schedule, five statuses, asynchronous recovery, paused-date skipping, full replacement repairs, pagination, clock/deployment questions and greater test surface. Combining would obscure the operational gate and enlarge review without technical need. No shared framework needs to land first.

1. Budgets frontend PR: types/service contracts -> period-aware pages -> confirmations and dashboard link -> tests/browser checks/docs/verification. Existing recurring preview unchanged.
2. Recurring frontend PR based on current develop after Budget PR merge: confirm rollout gate -> types/service/query -> list/create/detail/edit/repair -> lifecycle confirmations and dashboard navigation -> tests/browser/config evidence/docs/verification.

Approve plan/route naming and split before implementation. Branch/commit/push/PR authorization is deferred to a future implementation request; no delivery now.

## Implementation phases and expected files

All items unchecked because code does not exist. No database/domain/repository/backend API phase is needed.

### Phase A — Budgets contracts and screens

- [x] Reverify develop/current contracts and baseline tests; establish approved feature delivery scope later.
- [x] Add exact DTO/service and raw transport tests for all five operations.
- [x] Add month URL list, create/detail/amount-only edit and definition-delete confirmation; inactive history and conflict handling.
- [x] Add Budgets AppShell navigation and selected-period dashboard/back links without changing defaults.
- [x] Verify behavioral tests, responsive/a11y checks, full frontend commands, required unchanged-backend verification, diff review; record evidence in this plan before future delivery.

Proposed new files: `src/types/budget.ts`, `src/services/budgetService.ts`, `src/services/budgetService.test.ts`; `src/pages/budgets/BudgetsPage.tsx`, `BudgetFormPage.tsx`, `BudgetDetailsPage.tsx`, `budgets.test.tsx`. A small `query.ts`/`query.test.ts` only if domain return/search validation cannot be expressed clearly using existing period helpers.

Expected edits: `src/App.tsx`, `src/App.test.tsx`, `src/components/Navbar.tsx`, `src/components/AppShell.test.tsx`, `src/pages/dashboard/DashboardPage.tsx`, its test; narrowly scoped `src/index.css` only for new budget rows/controls, frontend README and Plan009 evidence. Existing ui primitives/period helper need no assumed alteration.

### Phase B — Recurring contracts, clock context and list/create

- [ ] Operator confirms stable deployment timezone and scheduler rollout before mutation release; record outcome without secrets. Reverify deployment confirmation rather than infer enabled from ACTIVE rules.
- [ ] Add response/create/update/page/query DTOs, services for CRUD/cancel/pause/resume, enum/sort validation and exact serialization tests.
- [ ] Add protected query-aware list and create; resource selection, date guidance and independent optional dashboard clock context.

### Phase C — Recurring detail, edits, repair and lifecycle

- [ ] Add retained terminal detail, ordinary financial replacement edit and dedicated blocked association repair.
- [ ] Add Pause/Resume/Cancel confirmations and truthful returned-state/error behavior.
- [ ] Add navigation and dashboard preview detail/all-rules links while retaining reporting windows.
- [ ] Verify stale read/write/session safety, query restoration, pagination/filter interactions and accessibility.

Proposed new files: `src/types/recurringTransaction.ts`, `src/services/recurringTransactionService.ts`, `src/services/recurringTransactionService.test.ts`; `src/pages/recurring/RecurringTransactionsPage.tsx`, `RecurringTransactionFormPage.tsx`, `RecurringTransactionDetailsPage.tsx`, `query.ts`, `query.test.ts`, `recurring.test.tsx`. Extract domain-local `RecurringLifecycleActions.tsx`/test only if detail complexity justifies it; repair can remain an explicit mode in FormPage, not a new framework/route. Test-only fixtures may be colocated if reused.

Expected edits: same route/navigation/dashboard/test/CSS/README/Plan009 files as Budgets; `src/components/ui/Icon.tsx` only if a small recognizable navigation glyph is needed (existing glyph reuse preferred). Shared financial helper/tests only for a demonstrably necessary amount-validation extraction with V1 unchanged. No test-runner, package.json, lockfile, backend, migration, instructions or Plans006–008 edits.

### Phase D — Verification for each approved PR

- [ ] Targeted service/query/page/navigation tests during work, meaningful behavioral assertions and existing V1 regressions retained.
- [ ] `npm run test:run`, `npm run build`, `npm run lint` all pass; record totals/commands and inherited warnings separately.
- [ ] `mvn clean verify` for required backend regression evidence using existing Docker/PostgreSQL Testcontainers setup; no backend tests modified just to pass.
- [ ] Browser QA with available tooling/disposable resources; report missing checks honestly.
- [ ] Review complete diff, `git diff --check`, forbidden-scope paths and unrelated existing work; only later explicitly authorized delivery steps.

## Testing strategy

Existing backend evidence (inspection, not fresh execution): BudgetController/ServiceImpl/Repository/Integration tests cover flat contracts, validation, duplicate races, owner isolation, hard-delete/recreation, inactive references, spending changes and December9999. Recurring Controller/ServiceImpl/Resources/Repository/Calculator/Scheduler/SchedulingConfig/Integration tests cover DTO immutability, anchored dates, timezone boundaries, paused-today conflicts, blocked-only repair, cancellation, bounded catch-up, occurrence retention, worker rollback/concurrency and scheduler disabling. Controller slices disable filters; integration tests prove actual JWT/ownership. No new backend tests required for frontend-only delivery.

Automated frontend acceptance matrix:

- **Transport:** exact paths/methods/query/body/no-body and 204; real financial transforms, not only mocked service responses. Money max99999999999999999.99,0.01; zero/negative/excess precision rejected for new limits/rules. Signed negative remaining and aggregates >17 digits accepted on reads. Long IDs >MAX_SAFE_INTEGER through Long.MAX_VALUE preserved in route/select/filter/payload; numeric JSON fields unquoted and never Number-converted. Nullable descriptions/end/cursor/reason preserved; string page/count metadata. No userId/immutable fields/fictional wrappers.
- **Budgets:** browser-local explicit default vs malformed/partial/duplicate periods; years0001/0099/9999, leap centuries/February/December bounds; history; active matching system/custom choices; create success/409/field/unmatched validation; empty selectors/network/retry; amount-only edit of inactive historical definition; utilization zero/equal/over including negative remaining; delete not called until confirm, cancelled/failed/success notices, retained inputs/focus, exact drill-down and dashboard month navigation.
- **Recurring forms:** EXPENSE/INCOME and all four frequencies; type/category mismatch, inactive/missing resources, exact amount,500-character description, null vs empty, valid leap/calendar/end boundaries, no browser-today hard rejection; optional clock endpoint failure does not fabricate timezone/block eligible server validation. Immutable fields absent from update. Duplicate-submit prevention only, no invented uniqueness.
- **Lifecycle/repair:** action matrix all five statuses; terminal null rendering/direct link; pause/resume returned COMPLETED; BLOCKED no resume; repair sends unchanged original financial values and new exact associations, does not claim recovered; backend400/404/409/timeouts retain inputs and offer explicit refresh. Due/paused-today conflicts server-authoritative; concurrent status/resource change and completed cancellation API/UI difference documented.
- **List/session:** raw pagination, empty/no matches/out-of-range page, allowed sorting and server ordering preserved, filter resets, exact inactive selected-ID options, duplicate/invalid queries rejected, Back/Forward/context return, abort on query/unmount, out-of-order/retry/session changes ignored, stale401 cannot expire new session, logout/expiry clears data and pending mutation callbacks cannot navigate a new session.
- **Routing/accessibility/regression:** protected deep links through login, V2/Legacy nav distinction and /dashboard defaults, mobile disclosure Escape/focus, one main/h1/skip, native labels/describedby/errors, inline confirmation focus/pending/no nested forms. Existing Account/Category/Transaction/Dashboard/V1 suites pass without weakened assertions. No management link delivered before route works.

Manual QA checklist (record execution/unavailable checks later):

- [ ] 320/375/390,768/820,1024/1280/1440 and breakpoint edges; no document overflow, full large amounts/long names/descriptions, readable amount labels and mobile action wrapping.
- [ ] Real isolated API budget create/edit/duplicate/delete, exact monthly actuals including generated and inactive history, refresh/dashboard/drill-down; no V1 contribution.
- [ ] Recurring create/edit/pause/resume/cancel, blocked-repair states against controlled fixtures. Verify deployment config separately; use existing test worker/fixtures rather than new public processing endpoint or long sleeps. Scheduler-enabled QA only in explicitly approved disposable environment, not production.
- [ ] Keyboard-only navigation/filter/forms/confirm/retry, focus restoration, announcements,44px controls; contrast, neutral icons, non-color status, reduced motion, forced colors/text spacing/200% actual browser zoom.
- [ ] Available Chrome/Firefox/Safari/mobile/screen-reader checks; report untested environments honestly, jsdom isn't browser QA.
- [ ] V1 route/default/CRUD smoke, Dashboard month/context return, rapid query changes, network/server conflicts and session change during mutations.

## Risks, gaps and approval decisions

| Gap / decision | Recommendation and boundary |
| --- | --- |
| Combined vs split delivery | Approve two PRs, Budgets then Recurring. Both are frontend-only; no forced code dependency. |
| Frontend recurring route naming | Approve `/app/recurring` requested here rather than Plan006's original proposal. Existing backend route unchanged; no alias needed. |
| Scheduler disabled by default; deployment unknown | Operator must confirm existing stable timezone and enablement rollout before recurring mutations, as Plan006 requires. No frontend can discover enabled status from existing API. New operational settings contract or enablement/change to deployments requires separate approval. |
| Server today/zone absent on rule DTO | Optional dashboard-provided asOfDate/timezone context with freshness caveat; backend date validation authoritative. No browser-based hard past rejection; no new endpoint required. |
| No unprocessed-backlog/eligibility field | Avoid predictive disable logic. Handle409, conservative blocked repair, explicit refresh. Adding revision/backlog fields or inline processing would require separate API/business approval. |
| Pausing BLOCKED skips periods on subsequent resume | Explain clearly before confirmation; it changes recovery semantics by user choice. Worker repair/catch-up is the separate path. |
| No generated-rule history endpoint/origin fields | Ordinary Transactions navigation only. Per-rule history/origin badge/filter requires separately approved backend API extension. |
| Budget utilization percentage absent | Display exact limit/spent/signed remaining and server overBudget; no percentages or financial sums. Extra progress visuals are optional follow-up, not needed for core acceptance. |
| Budget DTO lacks category active/system metadata | Show returned names without invented badges; edit amount despite inactive history. Extra metadata/API changes require approval if later desired. |
| Immutable recurrence and budget identity | No changing budget category/month or schedule type/frequency/start/end, no restore/copy/archive/custom interval. Users may explicitly create a separate definition/rule; never cancel/recreate silently. |
| Concurrent writes/worker progress | No optimistic-lock token or synchronous recovery guarantee. Preserve inputs, refetch reads, warn timed-out writes may have committed; never automatic replay. |
| Large aggregates/Long IDs | Request row bounds differ from response aggregates; lossless transport throughout, no numeric PageResponse reuse. |
| Historical plan headers/manual QA | Old completion/merge assertions aren't live repository facts. Leave Plans006–008 untouched; carry current verified baseline and outstanding QA here. |

No backend/schema/security changes are necessary for the recommended conservative UI. Any new lifecycle action, processing API, scheduler setting, identity edit, generated-history API, auth/default change or dependency is outside approval and must stop dependent implementation for separate review.

## Planning verification

- [x] Verify PR22 merged and fetch/compare latest develop without branch changes.
- [x] Inspect instructions/plans, actual budget/recurring contracts/services/lifecycle/config/tests and available frontend primitives/precision/session conventions.
- [x] Document supported capabilities and missing fields without synthetic metrics or automatic-processing assumptions.
- [x] Create Plan009 only and review scope/whitespace.
- [ ] Obtain plan/split/route approval and settle recurring operational gate before authorized implementation.

This planning task does not run application tests/builds or claim fresh runtime verification. Existing Dashboard verification counts in Plan008 are historical evidence only. No production implementation, dependency installation, branch creation/switch, commit, push or PR is performed.

## Phase 4A — Budgets implementation and verification evidence (2026-10-09)

The subsequent implementation request approved **Budgets only**, the two-PR split and delivery on `feature/v2-budgets`. It supersedes the planning-only statement for Phase A; all Recurring tasks/gates remain untouched and unimplemented. Existing Plan009 was preserved. On entry the requested feature branch already existed at `bae03493d64f3bccdae210e695b0b5a84e9fd07a`; a fresh fetch confirmed identical origin/develop. The only uncommitted file was this plan. No branch was recreated/switched or user work discarded.

### Implemented budget behavior

- Exact BudgetResponse/CreateBudgetRequest/UpdateBudgetRequest and all five budget operations use shared Axios/financialConfig. IDs stay strings through selectors/routes/query and lossless numeric FK serialization. Amount validation reuses the existing positive transactionAmount helper without changing it. Only bounded calendar year/month become numeric JSON through Number; money/IDs never do. Response aggregates and signed remaining retain their complete precision, without row-range caps.
- Protected list/create/detail/edit routes, V2 Budgets navigation and Dashboard View budgets link are delivered. `/dashboard`, `/app` redirect, login/default routes and V1 financial models/requests stay unchanged. Recurring routes remain unavailable. The old unavailable-Budgets regression now checks the still-unimplemented Recurring route.
- List uses explicit validated year/month URL state, browser-local default, history, correction for invalid/partial/repeated periods, padded-period normalization and query-aware create/detail/edit/back/dashboard links. A new budget's success navigation uses its saved period if the form selection changed; historical details use their actual response period for expense drill-down, including leap-month boundaries.
- Create uses active matching system/custom EXPENSE categories. Eligible-resource loading/retry/refresh/empty and category deactivation between reads are handled without discarding amount/period edits. Duplicate409 and field/unmatched-key/network errors retain inputs; no automatic write retry. A timed-out/network write can have committed and the form tells the user to review before another explicit attempt.
- Historical detail/edit requires no active-category lookup; only amount is submitted on edit. Category/year/month remain read-only. Backend limit/spent/signed remaining/strict overBudget are displayed directly, with exact textual utilization and explicit equality/over-budget states. No sums, percentages, progress bars, invented active badges or budget charts.
- Inline definition deletion focuses Keep, restores trigger focus on Escape/cancel, requires explicit confirmation, prevents repeat pending actions, retains error feedback and returns to the contextual list with a notice. Confirmation explicitly preserves transactions. Read abort/attempt keys and session remount/shared transport plus mounted mutation guards protect stale resource/user data and late navigation.
- Small domain-local BudgetValues (list/detail) and PeriodFields (list/create) reuse concrete presentation. No generic abstraction or new dependency. CSS only adds scoped exact-value/list layout. New files: types/budget.ts; services/budgetService.ts and test; pages/budgets/BudgetsPage.tsx, BudgetFormPage.tsx, BudgetDetailsPage.tsx, BudgetValues.tsx, PeriodFields.tsx and budgets.test.tsx. Existing edits are routes/navigation, their tests, one Dashboard link/assertion, scoped CSS and README. AGENTS.md, skills, Plans006–008, backend/migrations/dependencies and V1 modules are unchanged.

### Automated verification

| Check | Actual result |
| --- | --- |
| Targeted contract/page/app suite | 3 suites / 92 passed before four additional pending/resource/period regressions; final budget page suite 30 passed. Initial three new assertions incorrectly expected retry label “Retry”; corrected to existing “Try again”, without changing shared component behavior. |
| Full frontend | `npm.cmd run test:run`: **33 suites / 427 passed**, exit0, **58.63s**. All 363 prior cases retained plus 64 added budget contract/precision/period/page/form/confirmation/session/protected-route regressions. No runner/timeouts/valid assertions weakened. |
| Final build | `npm.cmd run build`: **passed**, exit0; CSS33.55kB /7.70kB gzip, JS815.49kB /238.37kB gzip. Existing >500kB bundle warning remains. |
| Final lint | `npm.cmd run lint`: **passed**, exit0. Initial new-page JSX-in-try/catch finding fixed by limiting catch to URL parsing; no rule disabled. |
| Backend | `mvn.cmd clean verify`: **BUILD SUCCESS**, exit0, **529 tests**, zero failures/errors/skips, **9:08min**. Existing Java/toolchain and test-context/container teardown warnings remain; no backend modifications. |
| Scope/review | Complete tracked/new source/test/doc diff reviewed; `git diff --check` passed. Forbidden-scope diff (backend, migrations, dependencies, instructions, Plans006–008) empty. Only Budgets checkboxes/evidence in this existing plan updated. |

Coverage includes exact 99999999999999999.99,0.01/zero-spending/negative remaining/aggregate199999999999999999.98; Long IDs beyond MAX_SAFE_INTEGER through Long.MAX_VALUE; numeric create and amount-only update JSON; bodyless delete; period boundaries0001/0099/9999 and malformed/duplicate parameters; create/update/delete/400/404/409; active selectors/inactive historical edit; read cancellation, resource refresh, pending confirmations, unmounted writes/session replacement and existing V1 regression coverage. Existing shared period tests continue to verify inclusive calendar/leap-century month ranges.

### Browser and keyboard verification

Installed headless **Chrome155.0.8059.39**, existing Vite and an unchanged API with disposable PostgreSQL17 were used through browser debugging protocol, with no new dependency. Only disposable sequences/data were seeded for Long IDs above MAX_SAFE_INTEGER; API created actual expense, active/custom categories, budgets and deactivated historical category. Scheduler remained disabled and no Recurring feature was exercised. API/database were removed and the task Vite process stopped after QA.

Final full run passed:

- Real login returned to protected `/app/budgets?year=2024&month=2`.
- List widths320/375/390/767/768/820/1023/1024/1280/1440: no document overflow, one main/h1, complete huge signed financial text,44px controls and intact described-by references. Mobile/desktop screenshots visually inspected; neutral category icon, wrapped100-character name and exact labels remain readable.
- UI created a budget with exact maximum amount and 19-digit IDs; duplicate409 retained10.00 input. Create mobile layout and native Year->Month Tab/focus checked.
- Amount-only edit of inactive historical category yielded backend remaining0.00 and Within budget at equality. Mobile edit/confirmation screenshots inspected.
- Keep initial focus/Escape/trigger restoration and explicit deletion passed; real API confirmed its transaction remained accessible afterward.
- Selected-month history/Back, Dashboard View budgets round trip, invalid-period error without financial display and empty selected-month state passed.

Temporary evidence: Windows temp `cointrail-budgets-qa/results.json` and list-320/list-1280/create-320/edit-320/confirm-320/empty-320 PNGs. Earlier harness attempts selected the login navigation link instead of submit and contained a malformed selector; corrected only temporary harness code, then reran the complete flow successfully. No application fix was needed for those harness failures.

Uncompleted QA, recorded honestly: Firefox/Safari/iOS/physical devices, NVDA/VoiceOver, actual200% zoom, exhaustive keyboard/contrast/forced-colors/text-spacing/reduced-motion audit, browser-injected network/error/session variants, and full real-browser V1 CRUD. Existing automated regressions and prior Clarity fallbacks remain intact; these broader manual checks are follow-ups, not claimed as passed here. There is no unresolved budget API/business/security decision or feature blocker. Recurring operational approval remains a separate future milestone.
