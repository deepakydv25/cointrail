# V2 Frontend Foundation and Phased Migration

## Goal

Migrate the existing React + TypeScript frontend incrementally onto the stabilized V2 backend. Deliver a small shared foundation first, then domain screens in dependency order. Preserve working V1 expense CRUD, filters, pagination and summary throughout. No automatic conversion, merging or deletion of legacy records.

Status: **Phase 0 completed and merged in PR #18; Phase 1 completed and merged in PR #19 with the user-approved precision policy below. Phase 2 implemented and verified; commit/push/PR delivery to develop is explicitly authorized. Later phases remain unimplemented.** Original planning inspection used `89f9a9a` (PR #17); Phase 1 started from `0e421d5` (PR #18). Phase 2 starts from `528bed0` (PR #19), matching origin/develop, on `feature/v2-transactions`. Backend paths, business logic, migrations, AGENTS.md and skills remain unchanged. Do not merge the feature PR.

## Existing State

### Frontend evidence

Paths in this subsection are relative to `cointrail-frontend/`.

| Area | Inspected implementation | Migration implication |
| --- | --- | --- |
| Stack | `package.json`: React 19, TypeScript 6, Vite 8, React Router 7, Axios, Tailwind 4, Recharts; Vitest, jsdom and React Testing Library/user-event | Reuse these dependencies. No framework, state manager, query cache, form library or component kit is needed for foundation. |
| Organization | Flat `src/pages`, `services`, `types`, `components`, `routes`, `context`, `api`, `utils`; tests colocated with source | Extend these conventions with domain subdirectories as V2 arrives; do not relocate all existing files. |
| Routing | `src/main.tsx`: StrictMode → BrowserRouter → AuthProvider → App. `App.tsx` has public `/`, `/login`, `/register`; protected `/dashboard`, `/expenses`, `/expenses/create`, `/expenses/:id`, `/expenses/:id/edit`; wildcard NotFound | Preserve current URLs. ProtectedRoute/PublicRoute use Outlet/Navigate; login and authenticated public-route redirects currently hard-code `/dashboard`. |
| Authentication | `context/AuthContext.tsx` stores `accessToken` in localStorage and initializes authentication from presence alone | No expiration validation, response-401 handling, tab synchronization or refresh flow exists. |
| Transport | `api/axios.ts` has `VITE_API_BASE_URL`, JSON header, request interceptor reading localStorage | Existing `authService.ts` uses `/auth/*`; `expenseService.ts` uses `/expenses/*`, including POST `/expenses/create`. Both assume a base ending `/api/v1`. No response interceptor. |
| Data | `types/expense.ts` holds enum-based V1 category, numeric money and ISO date strings; `ExpensePage` is declared inside expenseService | Do not reuse V1 Expense as V2 Transaction or map enum names to category IDs. Introduce shared page contracts without an invented envelope. |
| Screens | DashboardPage calls legacy summary and five recent expenses concurrently. ExpensesPage uses five-item pagination, category and date/amount sorting. Create/Edit convert amount strings with Number. Details uses window.confirm for deletion | Keep these workflows. V2 totals must never silently replace legacy totals. Forms, cards and filters provide styling references. |
| Presentation | `index.css` imports Tailwind; pages use responsive utility classes and repeated cards/form controls. Navbar has desktop/mobile variants. CategorySpendingChart uses Recharts and the V1 enum | Reuse visual language; generalize only repeated V2 patterns. Navbar needs active navigation, expanded state and keyboard behavior. Retain the legacy chart adapter. |
| Formatters | `utils/formatters.ts`: INR/en-IN money; date-only values rendered at UTC midnight; enum title-casing | V2 category names are server strings. Local date-times have no offset guarantee. Currency choice is a product decision, not supplied by backend. |
| Tests | Nine colocated suites cover login, registration, route guards, Navbar, legacy dashboard/list/create and formatters (34 test cases by source inspection). Services/context are mostly mocked; chart is mocked in dashboard tests | Add actual AuthProvider + interceptor coverage. Existing suites do not cover expense detail/edit, transport or full-app navigation. Preserve assertions while adding regression coverage. |
| Build | `build`: tsc -b then Vite; app tsconfig has unused checks but no explicit strict setting; ESLint has TS/hooks/refresh rules; Vitest uses jsdom and `src/test/setup.ts` | Avoid a blanket compiler/lint modernization. Use explicit types and unknown narrowing in new boundaries. |
| Delivery | Dockerfile Node 22 → Nginx; build-time base URL defaults to localhost:8081/api/v1. `.env.example` and root `compose.yml` use the same path. Nginx has SPA try_files fallback. `.github/workflows/ci.yml` runs npm ci, tests, build and Docker builds, but no frontend lint step | URL changes must work for local env, Compose, image builds and hosted build variables. Never expose secrets through VITE variables. |

Frontend README remains template documentation; root README documents V1 and V2 API docs. No E2E runner is installed. Baseline test execution and limitations are recorded under Verification; source inspection is not proof of passing tests.

### Backend evidence and exact integration contracts

Inspected all eight V2/auth controllers plus ExpenseController, request/response DTOs, nested DashboardDetails/AnalyticsDetails, Account/Category/Transaction services, security/JWT/error handling, OpenApiConfig, application.yml, business-rule documents and documentation integration tests. All migrations V1–V12 were read; latest is V12. Legacy expenses and transactions are separate tables; no frontend migration needs schema work.

Java references below are relative to `cointrail-api/src/main/java/com/deepak/cointrailapi/`.

| Domain / source | Actual endpoints and response shape | Frontend dependency |
| --- | --- | --- |
| `auth/AuthController`, `auth/dto/*` | POST `/api/v1/auth/register` → 201 `{id,name,email,role}`; POST `/api/v1/auth/login` → 200 `{accessToken,tokenType}` | Registration is not login. No refresh/logout/current-user endpoint is present. JWT has subject=email and exp; configuration currently gives one hour, but client must read exp rather than hard-code lifetime. |
| `expense/ExpenseController` | `/api/v1/expenses`: GET page, GET summary, GET/PUT/DELETE `/{id}`, POST `/create`; DELETE → 204 | Preserve service paths including unusual create suffix. Legacy expense category remains its existing enum. Excluded from V2 OpenAPI. |
| `account/AccountController`, DTOs | `/api/accounts`: POST 201, GET array; `/{id}` GET/PUT 200, DELETE 204 | Response `{id,name,type,openingBalance,active,createdAt,updatedAt}`. Type BANK/CASH/CREDIT_CARD/WALLET. Create name/type/openingBalance; update name/type only. Active list, owned inactive detail allowed. No balance field or reactivation API. |
| `category/CategoryController`, DTOs | `/api/categories`: POST 201, GET array; `/{id}` GET/PUT 200, DELETE 204 | Response `{id,name,type,system,active,createdAt,updatedAt}`. Type EXPENSE/INCOME. Create name/type; update name only. Active system entries then active custom entries. Inactive detail and system mutation return 404. No reactivation API. |
| `transaction/TransactionController`, DTOs | `/api/transactions`: POST 201, GET raw Spring Page; `/{id}` GET/PUT 200, DELETE 204 | Create/update `{accountId,categoryId,type,amount,description,transactionDate}`; response adds id, accountName, categoryName, createdAt, updatedAt. No generated-origin/template ID field. List optional type/accountId/categoryId/from/to; inclusive dates; default page=0,size=20, transactionDate,desc; cap 100. Allowed sort transactionDate/amount/createdAt/updatedAt. |
| `budget/BudgetController`, DTOs | `/api/budgets`: POST 201, GET array requiring year/month; `/{id}` GET/PUT 200, DELETE 204 | Create categoryId/year/month/amount; update amount only. Response id/categoryId/categoryName/year/month/amount/spentAmount/remainingAmount/overBudget/createdAt/updatedAt. Depends on EXPENSE categories and persisted transactions. |
| `recurringtransaction/RecurringTransactionController`, DTOs | `/api/recurring-transactions`: POST 201, GET raw Page; `/{id}` GET/PUT 200, DELETE 204 cancellation; POST `/{id}/pause`, `/{id}/resume` → 200 | Create accountId/categoryId/type/amount/description/frequency/startDate/endDate. Update accountId/categoryId/amount/description only. Response adds id, names, nextDueDate/status/blockedReason/timestamps. List optional status/type/accountId/categoryId; default size20, createdAt,desc plus id,desc; allowed sort createdAt/updatedAt/nextDueDate; cap100. |
| `dashboard/DashboardController`, `DashboardDetails`, `DASHBOARD_API.md` | GET `/api/dashboard?year=&month=` → one object | year/month/totalActiveAccountBalance, monthlySummary(income/expense/netCashFlow), budgetSummary(budgetCount/totalBudgetAmount/spentOnBudgetedCategories/remainingBudgetAmount/overBudgetCount), recentTransactions, pendingRecurringTransactions(asOfDate/throughDate/timezone/items). Recent preview omits full transaction timestamps; pending item omits full schedule. Use separate preview DTOs. |
| `analytics/AnalyticsController`, `AnalyticsDetails`, `ANALYTICS_API.md` | GET `/api/analytics/summary`, `/categories`, `/accounts`, `/trends`, `/comparison` | Required from/to; trends also grouping; comparison also compareFrom/compareTo. Summary `{range,totals}`, breakdowns add items, trends adds grouping/items, comparison `{current,baseline,delta}`. range=from/to/dayCount; totals=income/expense/netCashFlow/transactionCount. No pagination or account/category/type filters. |

`common/exception/ErrorResponse` and GlobalExceptionHandler return `{status,message,errors}` with errors as field-message map or null. SecurityConfig returns bodyless protected 401; login bad credentials returns JSON 401. Handle both. Do not infer ownership from a 404. No success wrapper exists. OpenApiConfig documents eight tags/35 operations, bearer security, decimal JSON numbers, raw pages and nullable values. `API_DOCS_ENABLED` defaults false; use generated docs only in explicitly enabled local/dev environments. Runtime frontend must not depend on Swagger or scrape production docs.

## Business Rules

- [ ] Keep user ownership entirely server-derived; never send a userId or use decoded JWT claims for authorization.
- [ ] Preserve V1 expenses as separate records and screens. No auto-import, destructive cleanup, enum-to-ID conversion or combined V1/V2 totals.
- [ ] Account/category names max100; account names case-insensitively unique per owner, including inactive names. Custom category uniqueness is name/type with existing system-name checks. Display duplicate 409 without silently renaming.
- [ ] Account opening balance is signed, creation-only; account deletion means deactivation and history survives. Category type is immutable; system categories are read-only; custom deletion is deactivation. Do not expose unsupported restore actions.
- [ ] Manual EXPENSE/INCOME transactions require active owned account and active accessible category matching type. Amount >=0.01, max17 integer/2 fractional digits; description nullable/max500; date past-or-present under backend manual validation clock.
- [ ] Historical reads retain inactive references. Use names/IDs in returned DTOs even when absent from active selectors; editing must explicitly select eligible replacements. Backend remains authoritative for validation and midnight boundaries.
- [ ] Budgets require active EXPENSE category, one owner/category/year/month; year1–9999/month1–12 explicit. Remaining may be negative; overBudget means strictly spent > amount. Deleting a definition preserves transactions.
- [ ] Recurrence supports DAILY/WEEKLY/MONTHLY/YEARLY at interval one, anchored calendar clamping, start today/future in recurring zone and optional inclusive end. State ACTIVE/PAUSED/BLOCKED/CANCELLED/COMPLETED. Schedule/type immutable after create.
- [ ] Paused periods are skipped on resume; blocked periods catch up through worker-managed recovery. Terminal edits/pause/resume and BLOCKED resume conflict. Backlog prevents amount/description edits; blocked association repair must preserve financial values. Cancellation retains history; deleting a generated transaction never regenerates its processed occurrence.
- [ ] Dashboard balance uses active-account opening balances plus all persisted signed actuals, not selected-month balance. Monthly totals include inactive history. Recent five actuals span all dates; pending five cursors include ACTIVE/BLOCKED through recurring today+30 days and overdue backlog. They are not forecasts/posting promises.
- [ ] Analytics uses V2 actuals only, including generated transactions once; excludes opening balances, legacy expenses, budget limits and templates. Breakdown groups use stable IDs/current names and inactive metadata. Accounts breakdown is activity, not balance.
- [ ] Analytics ranges inclusive, year0001–9999, ordered; summary/breakdowns/comparison each end < start.plusYears(5); DAILY max366 inclusive days, WEEKLY <2 calendar years, MONTHLY <5 calendar years with leap-day clamping. Weeks start Monday, edge buckets clipped, gaps zero-filled. Comparison deltas signed current-minus-baseline; overlap/unequal duration allowed without normalization.
- [ ] GETs do not trigger generation or repair. READ_COMMITTED reports may briefly disagree during concurrent writes. No frontend summing, forecast or synchronous catch-up promise replaces backend reports.

## Proposed Architecture

Keep BrowserRouter, AuthProvider, Axios services, local component state, Tailwind and Recharts. Dependency direction: pages → domain services → shared Axios transport; pages → shared UI and DTOs. Auth owns session lifecycle; transport reports unauthorized-session events without importing React/router. No generic CRUD engine, dependency injection layer or global financial store.

```text
src/
  App.tsx, main.tsx             existing app composition
  api/                         axios.ts + configuration/error/session boundary helpers
  context/                     existing AuthContext.tsx
  routes/                      existing guards + shared protected application layout
  services/                    authService.ts, expenseService.ts; new domainService.ts files
  types/                       expense.ts retained; shared api.ts/auth.ts and domain DTO modules
  components/                  Navbar.tsx, legacy chart retained
    ui/                        small status/form/card/pagination patterns when actually reused
  pages/                       existing V1/auth pages retained
    accounts/, categories/, transactions/, dashboard/, budgets/, recurring-transactions/, analytics/
  utils/                       formatters.ts plus focused validation/date helpers as needed
  test/                        setup.ts; shared fixtures/render helpers only when needed
```

New paths are proposals following inspected page/service/type naming, not claims that files exist. Each V2 page lives in its domain folder with colocated tests; existing imports need not move. Build domain DTOs when their phase starts; foundation establishes shared contracts and a reviewed DTO inventory, not dozens of unused placeholders.

### Transport and TypeScript conventions

- Recommend a backend-origin `VITE_API_BASE_URL` (e.g. `http://localhost:8081`) and explicit full paths in services: `/api/v1/auth/*`, `/api/v1/expenses/*`, `/api/*`. One Axios instance shares timeout, token attachment, cancellation and error normalization. Do not prepend `/api` twice or put V2 under `/api/v1`.
- During transition, support the existing configured terminal `/api/v1` suffix by normalizing that exact suffix to the backend root before appending full service paths; document deprecation and test origin/trailing slash/legacy suffix plus any supported deployment path prefix. Update Docker default, tracked `.env.example`, Compose build argument and deployment instructions together. Never edit actual .env secret files. Reject malformed configuration clearly; never guess a production host or send bearer tokens to arbitrary service URLs.
- Public auth calls should not attach a stale bearer token. Protected calls read the current session token at request time. Use Axios AbortSignal support and a bounded timeout; do not automatically retry financial writes or replay them after login.
- Define explicit `CreateXRequest`, `UpdateXRequest`, `XResponse`, domain enum unions and distinct preview DTOs. Keep nullable fields as `string | null`/date | null; optional request fields may be omitted per DTO. Return typed `response.data` from services; DELETE returns Promise<void>. No fictional ApiResponse<T> success envelope.
- Shared `PageResponse<T>` initially includes content/number/size/totalElements/totalPages, matching consumed Spring Page fields; tolerate extra backend page metadata. Arrays stay arrays. Use typed params objects and backend sort allowlists; reset page when filters change; repeat sort parameters where needed.
- Calendar dates stay YYYY-MM-DD strings; local date-times stay strings without adding Z or converting to UTC. Reuse date-only rendering deliberately; validate year boundaries/leap dates. Never convert transaction dates through browser timezone shifts.
- Wire IDs/counts/money currently arrive as JSON numbers. Ordinary response DTOs can mirror this, but Java Long and BigDecimal ranges exceed JS safe precision. Do not pretend number aliases solve it. Preserve form decimal strings, validate without rounding, and settle the precision decision below before monetary V2 writes ship. Avoid client-computed authoritative totals.

### Session and errors

- Retain the existing localStorage accessToken mechanism for foundation compatibility; changing persistence is a separate decision. On hydration/login, decode payload defensively for finite exp and reject malformed/expired tokens. Decoding is a UX check; backend verifies signature/ownership.
- AuthProvider tracks initialization and current session. Guards do not render protected content before initialization. Expiration timer, focus/visibility checks and storage events keep reloads, suspended tabs and logout across tabs consistent. Clean up timers/listeners/interceptors for StrictMode.
- Protected 401 expires the matching session once, clears token and user-scoped displayed data, and routes to login with an accessible session-expired notice. Compare the token used by a failing request to the current token so an old response cannot log out a new session. Ignore canceled/stale data responses after logout/account switch.
- Login 401 remains a credential error; it must not create redirect loops. No refresh token exists: require login; do not fabricate silent refresh. Return to a validated same-origin protected pathname/search after successful login; fallback remains current `/dashboard` until approved default changes. Reject external/protocol-relative return locations and never resubmit pending mutations.
- Normalize unknown errors into a small `ApiError` with kind (validation/auth/forbidden/not-found/conflict/network/timeout/server), optional HTTP status, safe message and fieldErrors. Trust HTTP status over an inconsistent body. Accept missing/non-JSON response bodies and distinguish cancellation (no error UI).
- 400 maps known fields to controls and unknown keys to a form summary; 404 offers not-found/back navigation without revealing ownership; 409 preserves inputs and shows corrective explanation; 403 shows unavailable action without forced logout; network/timeouts/server errors offer explicit retry for reads. Avoid logging credentials/tokens/Axios configs. Render server messages as text, never HTML.

### Navigation and legacy access

Recommend protected V2 URLs under `/app`: `/app/accounts`, `/app/categories`, `/app/transactions` with create/detail/edit descendants, `/app/dashboard`, `/app/budgets`, `/app/recurring-transactions`, `/app/analytics`. This prevents collision with existing `/dashboard` and `/expenses` links.

Foundation preserves `/dashboard` as the legacy spending overview and every `/expenses/*` route. Label the legacy section **Legacy Expenses**, with **Legacy Overview** and an explanation that these records do not contribute to V2 reports. Keep add/edit/delete available unless an explicit product decision changes them. No retirement deadline is inferred.

Evolve Navbar into the shared navigation and use a protected Outlet layout with desktop navigation and a mobile disclosure. Add V2 links only when their screen is delivered; foundation may establish the layout without public dead links or fake feature pages. Accounts/Categories appear first; Transactions next; Dashboard once ready, then Budgets/Recurring and Analytics. All share one session. Until the landing/default decision is approved, ordinary login still opens `/dashboard`; direct V2 links survive login via return navigation. Keep an obvious Legacy Expenses link throughout later phases. Changing `/dashboard` to redirect or moving the old overview requires explicit approval and bookmark regression tests.

### Shared UI, responsive behavior and accessibility

- Reuse existing card spacing, blue primary actions, form labels and responsive list patterns. Extract only small patterns with concrete reuse: page heading, status/empty/error panel, form field/error, action button, card, pagination and confirmation behavior. Avoid a schema-driven form/table framework.
- Distinguish initial loading, refresh, empty dataset, empty filtered result, success, load failure and mutation failure. Keep filters visible during reload; provide retry/clear-filter/create-first-resource actions where meaningful. Keep inputs on failure; disable duplicate submits; refetch affected reads after successful writes. Cancel or sequence requests so fast filter changes cannot show stale data.
- Use semantic main/nav/headings/forms, linked labels, aria-invalid/describedby, alert/status announcements, aria-busy and visible focus. Add skip link and route-change heading focus. Navbar disclosure needs aria-expanded/controls, Escape/close behavior and active-link aria-current.
- Preserve native confirmation initially where suitable; any reusable dialog must handle focus trapping/restoration, Escape and keyboard confirmation. Destructive copy must distinguish deactivate, delete and cancel.
- Verify 320/375px mobile, tablet and desktop, keyboard-only and zoom200%. Controls wrap; long names and money values remain readable; tables can scroll within their own region. Aim for usable touch targets, contrast and reduced-motion behavior. Charts need textual totals/table equivalents and non-color-only distinctions; keep Recharts with responsive containers.

## Phase 0 — Foundation

- [x] Capture current frontend tests/build/lint baseline and existing route/API fixtures; separate inherited failures from phase regressions.
- [x] Implement root URL normalization and explicit V1/V2 service paths atomically, including legacy service preservation and build-variable documentation. Test exact outgoing auth/expense/V2 URLs and headers.
- [x] Add shared API error/page/auth conventions and session helper; integrate AuthProvider, guards and login return behavior. Cover malformed/expired tokens, bodyless 401 and concurrency/tab cleanup.
- [x] Establish protected layout and responsive navigation while retaining existing routes/default. Introduce shared loading/empty/error and form feedback patterns in auth/layout first; do not restyle every V1 page.
- [x] Document domain DTO mapping, nullable/date/precision rules and testing conventions in frontend README. Resolve or explicitly gate monetary precision before later write screens.
- [x] Add transport/AuthProvider/full-route tests and missing legacy detail/edit/delete regressions affected by shared transport/session changes. Keep existing tests passing.
- [x] Exit: V1 functionality passes regression checks, no stale-session content or redirect loops, configuration supports both namespaces, shared states work by keyboard/mobile, and no new financial domain feature is required to finish foundation.

### Phase 0 implementation evidence (2026-10-08)

The user explicitly approved and authorized Phase 0 only, including commit/push/PR targeting develop after verification. The planning-only status above records the original planning task; this section records the subsequent implementation authorization. Later phases and their checkboxes remain untouched. The repository's actual Plan 006 filename is `006-v2-frontend-foundation.md`; the longer filename cited in the authorization does not exist.

- Base: fetched origin/develop and confirmed zero commits ahead/behind at `89f9a9a`; work uses the existing dedicated `feature/v2-frontend-foundation` branch.
- Transport: origin/deployment-prefix configuration with exact terminal /api/v1 compatibility; all existing auth/Expense services now specify their unchanged full API paths. One Axios client supports future /api financial paths, 15-second timeout, AbortSignal cancellation, current-session bearer attachment, public auth without bearer, safe-path rejection and centralized typed errors. It never retries or replays writes.
- Session: localStorage accessToken retained; synchronous JWT payload/exp validation, expiration timers, focus/visibility/storage synchronization, matching-session protected 401 expiry, late-response cancellation and session-version page remounts. Auth context/hook/provider split fixes the inherited Fast Refresh lint error without disabling a rule. No refresh endpoint is invented.
- Routes/UI: all V1 URLs and /dashboard default retained; /app is a protected reserved namespace (/app returns to /dashboard; unavailable children use normal NotFound). Shared protected Outlet layout, Legacy Overview/Legacy Expenses navigation, responsive disclosure with expanded/controls/Escape/focus behavior, skip link, route focus and focus styles. No unfinished V2 feature links or screens.
- Shared conventions: raw generic PageResponse, backend ErrorResponse and typed auth request/response DTOs; small loading/empty/error/form-feedback components. Auth inputs retain values on failure and associate validation feedback accessibly; auth pages have main landmarks. V1 category enums remain independent.
- Legacy regressions: exact list/create/detail/update/delete/summary methods, payloads and query parameters retained. V1 INR/date formatting is unchanged; detail/edit/delete tests added. Read effects reject stale/unmounted results; expense filters remain usable during loading, with a deferred-response race test.
- Documentation/config: frontend README records architecture, contracts, sessions, testing and later gates; .env.example, frontend Docker build default and the root Compose frontend build argument use origin-only configuration. Actual .env files, backend files, migrations, AGENTS.md, skills, package manifests and dependency lockfile are unchanged.
- Approved decisions carried forward here: INR display, localStorage persistence, existing stack, V1 URLs, /app namespace and /dashboard default. Financial JSON precision remains an explicit release gate before V2 monetary screens; no precision dependency or narrowed financial contract was added.

Verification:
- Baseline: existing 9 suites / 34 tests passed; build passed with a >500 kB bundle warning. Lint failed only on AuthContext.tsx's mixed component/hook export (react-refresh/only-export-components).
- Final frontend: `npm.cmd run test:run` passed **18 suites / 115 tests**; `npm.cmd run build` passed; `npm.cmd run lint` passed. The pre-existing bundle-size warning remains; no dependency/framework or broad bundling refactor was added.
- Focused checks exercise exact V1/V2 transport URLs/headers/payloads/raw results, bodyless protected 401 versus credential 401, cancellation/old-session responses, fake-time expiration, cross-tab login/replacement/logout, route initialization/deep-link/default behavior, old-page data removal, mobile disclosure Escape/focus and legacy CRUD/filter races. Service adapter fixtures reflect real DTO/page/status shapes.
- Responsive Tailwind breakpoint behavior was reviewed and keyboard/disclosure/focus behavior tested in RTL/jsdom. Real-browser viewport/zoom visual QA and full browser E2E were not run; browser tooling remains a later approved phase. These unit/integration fixtures do not claim a live HTTP browser-to-backend test.
- Final focused transport recheck after tightening service fixtures: **11 tests passed**; final lint recheck passed. No production changes followed the successful full frontend run/build.
- The feature-delivery skill's unchanged-backend `mvn.cmd clean verify` passed: **529 tests, zero failures/errors/skips, BUILD SUCCESS and exit code 0**. The first sandbox attempt could not access Maven's cache; the escalated retry used the established cache/Docker. Surefire reproduced the 30-second fork-JVM shutdown warning already recorded in PR #17; tests and packaging still succeeded. No backend source/configuration was changed.
- Complete tracked/new-file diff reviewed for Phase 0 scope; `git diff --check` passes. Only frontend foundation/tests/docs, frontend build URL configuration and this Phase 0 plan evidence are intended for staging. No backend/legacy data conversion, V2 financial feature, agent instruction or unrelated production change is included.

## Phase 1 — Accounts and Categories

Precision gate approved by the user for this phase: preserve the full backend monetary range and Java Long IDs with one scoped, proven dependency if needed; money and IDs use frontend strings, while numeric request fields remain JSON numbers. No backend serialization/schema or V1 behavior change is authorized.

Implementation contract inspection (Phase 1): current Account/Category controllers, DTOs and services match the endpoint table above. Account updates allow owned inactive records; DELETE is repeatable soft deactivation. Categories allow active accessible details, active custom name-only edits and deactivation; system mutations and inactive details return 404. Names max100 and case-insensitive duplicate rules include inactive records. CreateAccountRequest has @Digits(integer=17,fraction=2), backed by NUMERIC(19,2).

Precision implementation: `lossless-json` is the sole added dependency. `api/financial.ts` overrides transforms per new V2 service request on the existing Axios instance. A custom library number callback returns numeric lexemes as strings before any Number conversion, including nested Long IDs/counts/monetary fields. Explicit LosslessNumber wrappers serialize money and future foreign-key fields as exact numeric JSON. Fixed-point input validation rejects excess digits; string-only INR grouping/padding preserves signs and full values. Positive resource ID validation uses BigInt against Long.MAX_VALUE. Booleans/nulls/timestamps remain unchanged; shared bearer/session/error/cancellation handling remains in force. V1 services, global Axios defaults and expense contracts retain ordinary numeric JSON behavior. Later V2 services must adopt these transforms and explicit numeric request mapping; approval does not authorize their screens in Phase 1.

- [x] Add domain DTOs/services/pages: active lists, create/detail/edit as supported, account deactivation and custom-category rename/deactivation. Show system category badges and prohibit mutation controls.
- [x] Use signed opening balance at creation only; do not label openingBalance as currentBalance. Show immutable fields on edits; handle reserved inactive names/duplicate409.
- [x] Provide account-first onboarding and type-aware category selectors reusable by Transactions. Existing V1 category selects stay independent.
- [x] Test create/update/deactivation, system restrictions, empty/error states, conflicts and inaccessible404. Inactive account detail is supported; category inactive detail is not.
- [x] Exit: users can establish eligible resources without changing financial history or losing legacy navigation.

Phase 1 verification evidence (2026-10-09):
- Final `npm.cmd run test:run`: **21 suites / 191 tests passed**, including all existing V1 suites. New financial service contract, resource page and category selector suites cover exact raw JSON numeric tokens, full signed monetary boundaries, zero/0.01, Long.MAX_VALUE/IDs above Number.MAX_SAFE_INTEGER, all actual API methods/paths/payloads, active arrays and 204 responses. Error tests retain 400 field feedback, 409 conflicts, 404 access behavior, non-JSON/bodyless401 handling, cancellation and session replacement. Page tests cover create/edit/deactivate/cancel, failed input preservation, immutable fields, system direct-edit restrictions, inactive account edits, list loading/empty/retry, category types, confirmation focus return and abandoned mutation/list responses. App tests add protection for every Phase 1 route, real-session V2 deep-link login and cross-tab data removal.
- Final `npm.cmd run build` and `npm.cmd run lint`: **passed, exit code 0**. The existing >500 kB bundle warning remains (708.80 kB main JS); no unrelated bundling change was added.
- Required feature-delivery `mvn.cmd clean verify` on the unchanged backend: **529 tests, zero failures/errors/skips; BUILD SUCCESS, exit code 0**. The initial sandbox attempt could not access Maven's repository; the escalated retry used the existing cache and PostgreSQL Testcontainers. The previously documented 30-second Surefire fork shutdown warning recurred without failing tests or packaging.
- **One additional live service contract test passed** against the just-built API and a fresh disposable PostgreSQL 17 container. The harness used the actual auth/account/category services and shared Axios client with its Node HTTP adapter, seeded only ID sequence values above JS safe range in the disposable database, and verified ±99999999999999999.99, 0.01/zero, exact large IDs, inactive owned account edits, reserved names/409, both category types, system PUT/DELETE404, inactive category404 and owner isolation404. This is actual HTTP API verification, not a browser E2E claim. Temporary frontend harness, API process and database container were removed before delivery; no application database or backend source/configuration was modified.
- Responsive layout classes, full-length value wrapping and desktop/mobile navigation were reviewed. RTL/jsdom verifies route/confirmation focus, labelled controls and feedback, type-aware string-ID selection, route protection and existing mobile disclosure behavior. Real-browser viewport/zoom visual QA and browser E2E remain unrun and deferred to Phase 6; no browser dependency was added.
- `npm audit` reports **two existing high-severity advisories** in unchanged brace-expansion and source-map-js versions. The lockfile diff adds only lossless-json 4.3.1 (no runtime transitive dependencies). Dependency remediation is a separate follow-up; no audit fix or unrelated upgrades were performed.
- Complete frontend/plan/dependency diff reviewed; `git diff --check` passes. Backend APIs, migrations, AGENTS.md, skills, V1 service/model/formatting contracts, /dashboard default and legacy routes remain unchanged. Transactions, V2 Dashboard, Budgets, Recurring, Analytics and deployment are outside this feature.

## Phase 2 — Transactions (Expense and Income)

Implementation contract (reinspected 2026-10-09 before production changes):

- `TransactionController` exposes POST/GET `/api/transactions`, GET/PUT/DELETE `/{id}`; POST returns 201, PUT is a full replacement, DELETE is bodyless 204. Lists return raw Spring Page. Default sort is transactionDate descending; allowed sort fields are transactionDate, amount, createdAt and updatedAt. Optional type/accountId/categoryId/from/to filters are server-side, date bounds inclusive, unknown IDs return empty pages, reversed ranges return 400. Default size is 20; Spring's resolver caps sizes above 100 (confirmed by existing controller tests).
- Both write DTOs require accountId/categoryId/type/amount/transactionDate. Amount has `@DecimalMin("0.01")` and `@Digits(integer=17,fraction=2)`; date uses `@PastOrPresent`; nullable description has maximum 500 characters. Services enforce active owned accounts, active accessible categories and matching category type. Inactive account writes return 400; inactive category writes return 404; inaccessible transactions retain owner-not-found 404 behavior. Reads preserve related names despite deactivation. Responses have no activity/origin/generated metadata.
- Reuse the existing shared Axios/session/error boundary and approved per-request `lossless-json` transport without another dependency. `transactionService` sends exact numeric JSON amounts and foreign-key IDs; frontend DTOs/forms/routes/selectors retain strings. TransactionPage numeric metadata stays strings without altering V1 PageResponse. Monetary input never passes through Number, rounds or truncates. Client checks calendar validity but leaves today's cutoff to the backend clock.
- Add the four protected `/app/transactions` routes, responsive navigation, shared UI/error/category-selector patterns, URL-owned filters, abort/late-response guards and permanent-delete confirmation. Full replacement edits require active reference selections while showing original names. Read current backend data after writes; no optimistic financial aggregates or generated badges.

- [x] Add one transaction workflow with EXPENSE/INCOME selector, active owned account and matching category, nullable description, decimal validation and date-only inputs. Do not reuse legacy Expense DTOs/forms as contracts.
- [x] Add server-paginated list/filter/sort, create/detail/edit/delete. Preserve query filters through navigation and reset pagination on filter changes; unknown filter IDs legitimately yield empty results.
- [x] Render historical names even when selectors omit inactive resources; require eligible replacements on edit. Do not invent generated badges: TransactionResponse has no origin field.
- [x] Confirm hard deletion and explain that generated occurrences are not regenerated. Refetch authoritative reads after mutations; avoid optimistic money totals.
- [x] Test outgoing replacement payloads, both types, mismatch/date400, inactive/history behavior, precision boundary, pagination/cap/sort, stale-request races and owner404.
- [x] Exit: V2 actuals are usable independently; legacy records/screens remain untouched.

Phase 2 verification evidence (2026-10-09):

- `npm.cmd run test:run`: **23 suites / 258 tests passed, exit code 0**, including all existing V1 regressions and 67 added cases. New coverage includes exact paths/query parameters/full POST/PUT numeric JSON, 99999999999999999.99 and 0.01, rejected zero/negative/excess precision, Long maximum/overflow, both transaction types, unavailable reference replacements, nullable descriptions, failed-write input retention, HTTP errors, URL navigation, sorting/filtering/pagination, custom page sizes, delete confirmation/focus, stale reads/saves and session changes. Four new protected-route cases retain the authenticated /dashboard default. Initial test timing/assertion failures were corrected by waiting for loaded detail content and setting up the precision-boundary input in one change event; assertions were retained.
- `npm.cmd run build` and `npm.cmd run lint`: **passed, exit code 0**. The inherited Vite chunk-size warning remains (main JS 727.73 kB); no dependency or lockfile changes were needed. Previously documented dependency advisories remain outside this feature.
- Required feature-delivery `mvn.cmd clean verify` on the unchanged backend: **529 tests, zero failures/errors/skips; BUILD SUCCESS, exit code 0**. The first attempt found the JAR locked by the leftover disposable Phase 1 API; the specifically identified test process was stopped and verification rerun successfully. The previously documented 30-second Surefire shutdown warning recurred without failing verification.
- **One additional live HTTP service contract test passed** against the freshly built API and a new disposable PostgreSQL 17 database. Actual auth/account/category/transaction services used the shared Axios client's Node HTTP adapter. Only sequences in that disposable database were seeded above JS safe range. The check verified exact maximum amount and minimum 0.01, large transaction/foreign IDs, Expense/Income creation, full replacement updates, raw Page pagination, all eight sorts, resolver size cap, inclusive filters/unknown IDs, date/type/description400, inactive-reference history, inactive account400/category404, owner isolation404 and DELETE204 followed by GET404. Temporary harness/API/database were removed; no backend source/configuration or application database was changed. This is actual HTTP integration evidence, not browser E2E.
- Complete feature diff reviewed and `git diff --check` passed. Responsive layouts were reviewed and keyboard/confirmation/route-focus behavior exercised in RTL/jsdom; navigation keeps the disclosure through tablet widths. Real-browser viewport/zoom QA and browser E2E remain deferred. Backend APIs, migrations, AGENTS.md, skills, V1 contracts/routes and /dashboard default remain unchanged. No V2 Dashboard, Budgets, Recurring or Analytics screens were implemented; no material decision remains blocked.

## Phase 3 — Dashboard

- [ ] Add `/app/dashboard` using only GET `/api/dashboard` with explicit selected year/month. Default month is a client UX selection, never an implicit API default.
- [ ] Render active ledger balance, monthly income/expense/net cash flow, budget summary, recent actuals and pending cursors using distinct DTOs and truthful labels. Preserve negative values, empty sections and zero totals.
- [ ] Show recurring preview timezone/asOfDate/throughDate, overdue and blocked states; avoid forecasting or reporting job status the API does not return. Hide unsupported detail actions until phase4 routes exist.
- [ ] Reuse card/chart styling; legacy overview remains on `/dashboard`. Obtain approval before changing the default entry point.
- [ ] Test selected-month requests, recent records outside selected month, null blockedReason, negative totals, empty data and honest preview navigation.
- [ ] Exit: report values come from backend without legacy aggregation or client balance recomputation.

## Phase 4 — Budgets and Recurring Transactions

- [ ] Budgets: explicit month selection, category definition/create, amount-only edit and definition delete; display spent/signed remaining/strict over-limit values from backend, including inactive historical names.
- [ ] Recurring: list filters/page, detail/create, future financial replacement edit, pause/resume/cancel and blocked repair. Display immutable schedule/type and nullable terminal fields. Explain skipped paused periods versus blocked catch-up.
- [ ] Use deployed recurring timezone and dashboard-provided clock metadata where available. There is no dedicated server-today/settings endpoint; do not assume browser today equals recurring today. Handle authoritative400/409 and refresh after a conflict; do not invent posting/recovery buttons or worker-enabled status.
- [ ] Enable recurring mutation UI only after operator confirms the existing scheduler/timezone rollout. A disabled worker can leave backlog; GET does not post it.
- [ ] Test duplicate budgets, equality versus over-budget, terminal transitions, blocked repair preserving financial values, conflict inputs, nulls and cancellation preserving posted actuals.
- [ ] Exit: schedule effects and destructive semantics are clear; no frontend attempt changes backend lifecycle rules.

## Phase 5 — Analytics

- [ ] Add explicit inclusive range selection and DAILY/WEEKLY/MONTHLY trends; mirror calendar-anniversary limits and leave backend validation authoritative.
- [ ] Render summary/category/account/trends and explicit two-range comparison. Use stable IDs, current metadata/inactive badges, zero-filled/clipped buckets and signed delta/count. No fabricated shares, account balances, top-N or forecast endpoints.
- [ ] Reuse Recharts plus accessible data tables; fetch sections with independent errors and cancellation so one failed breakdown does not erase successful results.
- [ ] Drill down through Transaction list date/account/category params where supported, without implying Analytics supports those filters. No pagination for analytics envelopes.
- [ ] Test leap-day limits/year boundaries, Monday weeks, empty gaps, repeated names/different IDs, inactive groups and unequal/overlapping comparison ranges.
- [ ] Exit: all five real contracts work without legacy inclusion or client financial aggregation.

## Phase 6 — End-to-End Testing and Deployment

- [ ] Choose a browser runner before adding a dependency; no existing E2E tool is available. Recommend Playwright for a later approved addition, not foundation installation.
- [ ] Run disposable PostgreSQL-backed journeys: register/login → resources → income/expense → dashboard → budget → recurring lifecycle → analytics; exercise owner isolation, expiry/return navigation and legacy CRUD/summary coexistence.
- [ ] Recurring tests use controlled backend test fixtures/worker execution, not long sleeps or a new public generation endpoint. Never test destructive flows against production legacy data.
- [ ] Verify npm ci/test:run/build/lint and container build, Nginx direct-route refresh, mobile/keyboard flows, build-time public API origin, HTTPS and deployed CORS origin. Keep production docs disabled and recurring timezone stable; rollout scheduler enablement separately.
- [ ] Add E2E CI after runner approval; retain existing backend clean verify and frontend/Docker gates. Verify deployed API supports both namespaces before releasing V2 UI.
- [ ] Release incrementally with available-screen navigation; rollback frontend image/config retains both data stores. No data migration or backend API change accompanies rollback.
- [ ] Exit: staging smoke tests and approved release/deployment checklist pass; product separately decides whether to retire legacy screens.

## Testing Strategy and Verification

Foundation uses existing Vitest/jsdom/RTL/user-event. Mock domain services for focused page tests; test Axios with a controlled adapter/fixtures for real request paths, headers, query serialization and normalized errors. Add AuthProvider with MemoryRouter integration tests instead of only mocked useAuth. Use fake timers for exp, storage events for tabs, and deferred promises for old-session401/filter races. Clean up state/listeners after each test.

Contract fixtures must match inspected DTOs/generated local OpenAPI: raw pages versus arrays, nullable fields, bodyless204/401, local timestamps, exact enums and report previews. A generic mock success response is insufficient evidence of backend integration. Validate representative raw JSON against a disposable backend during each feature phase. No backend test changes are required for frontend work; retain existing security/documentation tests as reference and existing CI clean verify. If scope ever introduces backend changes, stop/replan and apply backend skills/required Maven verification.

For each implemented phase run targeted suites, then `npm run test:run`, `npm run build` and `npm run lint`; perform relevant responsive/keyboard and local API checks. Add lint to CI once existing baseline issues are understood, without unrelated cleanup. New tests assert user behavior/contracts rather than private helper implementation. No production feature implementation or Maven verification is claimed by creating this plan.

Planning inspection started from a clean git status using a per-command safe.directory setting (no global config edit). PowerShell blocked npm.ps1; `npm.cmd run test:run` completed successfully: **9 suites, 34 tests passed**. Final git status shows only this new plan file. Build/lint/backend tests were not run for this planning-only task and are not represented as passed.

## Expected Files

All paths below are **likely implementation changes after approval**, not changes made by this task.

| Phase | Existing files likely to change | Proposed additions |
| --- | --- | --- |
| Foundation | `cointrail-frontend/src/api/axios.ts`, `context/AuthContext.tsx`, `routes/ProtectedRoute.tsx`, `routes/PublicRoute.tsx`, `App.tsx`, `components/Navbar.tsx`, `pages/LoginPage.tsx`, `pages/RegisterPage.tsx`, `services/authService.ts`, `services/expenseService.ts`, affected colocated tests; `main.tsx` only if layout/provider wiring requires it | Under frontend src: `api/config.ts`, `api/errors.ts`, `api/session.ts`, `types/api.ts`, `types/auth.ts`, `routes/AppLayout.tsx`, small `components/ui/*` and tests; `pages/ExpenseDetailsPage.test.tsx`, `pages/EditExpensePage.test.tsx`, transport/context/app integration tests |
| Foundation config/docs | `cointrail-frontend/.env.example`, `Dockerfile`, `README.md`; root `compose.yml` frontend build argument; `src/index.css`/`utils/formatters.ts` if shared presentation requires it | No backend configuration, actual .env, package upgrade or migration |
| Accounts/Categories | `App.tsx`, Navbar and relevant fixtures | `src/services/accountService.ts`, `categoryService.ts`; `types/account.ts`, `category.ts`; `pages/accounts/*Page.tsx`, `pages/categories/*Page.tsx` and colocated tests |
| Transactions | Routes/navigation and reused UI | `transactionService.ts`, `types/transaction.ts`, `pages/transactions/*Page.tsx`, domain form/filter components and tests |
| Dashboard | Routes/navigation and reusable chart patterns | `dashboardService.ts`, `types/dashboard.ts`, `pages/dashboard/DashboardPage.tsx` and tests; retain existing `pages/DashboardPage.tsx` as legacy |
| Budgets/Recurring | Routes/navigation and shared selectors | `budgetService.ts`, `recurringTransactionService.ts`, corresponding types/domain page folders and tests |
| Analytics | Routes/navigation/chart patterns | `analyticsService.ts`, `types/analytics.ts`, `pages/analytics/*`, report charts/tables and tests |
| E2E/Delivery | `.github/workflows/ci.yml`, frontend package.json/package-lock.json only for approved runner, deployment README; Nginx only if verification identifies a required hosting change | Browser test configuration/fixtures/specs, exact names settled with runner choice |

Service additions above live under `cointrail-frontend/src/services/`. Backend files are integration references only; none are scheduled for modification. Foundation should not touch all later feature files or relocate legacy pages speculatively.

## Implementation Notes: Dependencies and Approval Decisions

### Integration dependencies, not reasons to redesign the backend

1. API origin/build variables must resolve existing V1 auth/expense and unversioned financial endpoints. Root Compose and Docker defaults currently carry `/api/v1`; external hosted build settings require an operator update/test when adopting origin-only configuration.
2. Protected APIs require a current bearer JWT; no refresh endpoint exists. Login cannot supply an expiresIn field or user profile that its DTO lacks.
3. Transactions depend on eligible Accounts/Categories. Budgets depend on expense categories/actuals; Dashboard can show empty budget/recurring sections before phase4. Analytics depends on actuals only.
4. Active lists cannot retrieve all inactive resources for filter pickers; historical DTO names/IDs must remain usable. No frontend phase should demand a new inactive-list, restore, per-account balance or generated-origin API.
5. Manual date validation and recurring timezone differ. Recurring metadata is exposed via Dashboard preview but scheduler-enabled status is not. Confirm existing environment with operator; keep authoritative errors rather than adding backend settings endpoints.
6. OpenAPI is opt-in local/dev and excludes V1 Expenses. Compare V2 fixture shapes with generated docs and V1 fixture shapes with actual controller/DTO behavior. No runtime client generation/toolchain is required.
7. Money/Long JSON precision exceeds JS Number guarantees. This is a real release dependency, not resolved by TypeScript typing or formatting to two decimals.

### Genuine decisions requiring approval before dependent work

| Decision | Recommendation | Gate |
| --- | --- | --- |
| Default authenticated entry and legacy presentation | Keep `/dashboard` + `/expenses/*` intact during foundation; expose V2 under `/app`; later choose `/app/dashboard` default after phase3. Keep Legacy Expenses/Legacy Overview visible and fully editable until a separate product retirement decision | Approval before changing default or old overview URL/behavior. No approval needed merely to preserve V1 as requested. |
| Monetary unit shown in V2 | Retain current INR/en-IN display only if product confirms the backend's implicit unit is INR; otherwise choose a neutral amount label. Do not add currency conversion or multi-currency | Settle before shipping V2 monetary screens. |
| Large monetary values and IDs | Approved during Phase 1: use scoped lossless-json parsing/serialization with frontend decimal/ID strings and exact numeric JSON requests. Preserve the full backend range; never silently round or truncate. A decimal library after ordinary JSON parsing cannot recover lost digits | User approved the policy and one small maintained dependency. Boundary/Long transport tests belong to Phase 1; later report phases must add aggregate tests. Backend serialization remains unchanged. |
| Session persistence | Keep existing localStorage behavior for compatibility; no silent switch to cookies/sessionStorage | Only a requested change to persistence needs approval; expiry/error fixes do not. |
| Recurring rollout | Operator confirms stable existing timezone and explicit scheduler enablement before users create schedules expecting posting; explain pending cursors without inventing enabled status | Deployment approval/config confirmation before recurring rollout; never choose a new zone for existing series. |
| Browser runner and production release | Recommend Playwright only in phase6; approve added dependency/CI cost and staging/release target then | No package installation, deployment or external publication authorized by this plan. |

Routine folder naming, focused helper extraction, error normalization and tests are implementation choices, not separate permission requests. Legacy automatic conversion/deletion is out of scope regardless of these decisions; any future import needs its own explicit product proposal and plan.

## Plan Execution

After explicit implementation approval, execute one logical phase at a time, update checkboxes only for implemented and verified work, and preserve V1 regression gates in every phase. Later feature phases should receive detailed endpoint/screen checklists as they begin; revise this plan if the inspected contracts change. Completion of this planning task means the document exists and is reviewed for repository accuracy, not that its implementation checkboxes are complete.
