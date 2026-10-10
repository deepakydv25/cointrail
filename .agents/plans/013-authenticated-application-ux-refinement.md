# Plan 013 — CoinTrail Authenticated Application UX Refinement

## Goal and approval boundary

Make the authenticated application consistent, accessible and ready for real users, with Dashboard as its default destination, reliable reporting URLs, collapsible navigation and refined reporting/forms.

**Status: approved; PR 1 implemented and verified. PRs 2 and 3 remain deferred.** Approval authorizes a later frontend implementation, not changes in this planning task. No production code, existing plans, instructions, dependencies or backend files are changed. Implementation must begin from freshly fetched develop on a new feature branch. No branch, commit, push or PR is created during planning.

This plan deliberately supersedes earlier decisions to retain `/dashboard` as the authenticated default, canonicalize the default dashboard to explicit period parameters, and omit desktop collapse/mobile overlay navigation. It does not supersede reporting contracts, financial precision or the public visual design.

## Current implementation audit and baseline

Audit date: 2026-10-10. Read repository AGENTS.md and `.agents/skills/planning/SKILL.md`; reviewed frontend Plans 006–012, particularly Clarity (007), Dashboard (008), budgets/recurring (009), Analytics (010) and the merged visual work (012).

- Started on **develop with a clean working tree**. Fetched `origin/develop`; local HEAD and fetched develop both point to `41dd99db56a982bd2eed9e3f337cf42410ec0efa`.
- GitHub PR #28 is **merged**, not merely open/approved: merge commit is that same SHA, merged 2026-10-10 at 09:30:58 UTC. Its shared Brand, public header alignment, floating glass navigation, light glass buttons and rounded public actions are present in the audited develop source.
- Existing numbered plans run through 012; 013 is the next available number. No existing plan is edited.
- Audit is source/test inspection, not a fresh execution of tests or browser QA. Future verification requirements below must not be reported as already passed.

### Routing, authentication and navigation

`App.tsx` composes public navigation and protected AppShell; ProtectedRoute guards the protected layout and keys its Outlet by session version. SiteLayout owns skip navigation and pathname-change heading focus. Retain these ownership boundaries.

`returnPath.ts` validates protected return destinations but falls back to `/dashboard`. LoginPage calls this helper after login; PublicRoute also uses it for authenticated users opening login/register. `/app` currently redirects to `/dashboard`. Landing navigation, hero/final/footer dashboard actions and authenticated NotFound also link to `/dashboard`. Application Brand currently links to public `/`.

ProtectedRoute stores pathname plus search in login return state, omitting the hash. Its allowlisted helper supports search/hash and rejects external/protocol-relative paths, whitespace, backslashes, encoded pathname forms and paths resolving outside protected prefixes. Preserve that validation rather than broaden the allowlist.

Navbar's Clarity mode has a single labeled desktop sidebar: 192px at 768–1023px and 240px above. Below 768px it has an inline disclosure, not an overlay. It closes on Escape, route/history changes and breakpoint changes, with partial focus handling. There is no desktop collapse or stored preference. Logout uses `flushSync(logout)` then navigates to `/`, preventing a guard race; preserve this ordering and the public logout destination.

Navigation exposes group “V2” and “Dashboard V2”; legacy routes `/dashboard` and `/expenses/*` remain separate. Version terminology also appears in Dashboard, CategorySpending, Analytics, Transactions, Budgets, BudgetDetails and the legacy AppLayout notice. Internal file/type aliases are not user-facing and need not be renamed.

### Dashboard and reporting URLs

DashboardPage captures browser-local currentPeriod once per mount. A missing reporting pair causes a replace navigation adding `year` and `month`; Current month also writes an explicit pair. The default does not advance automatically at a calendar-month rollover.

`pages/dashboard/period.ts` validates years 1–9999 and months 1–12, normalizes integer strings, rejects partial/duplicate reporting pairs, and ignores unrelated query keys. It is also used by Budgets: changing shared helper defaults indiscriminately would change budget behavior. DashboardReport keys requests by effective period and aborts obsolete reads; refresh separately reloads dashboard and category spending, omitting stale figures while pending.

Reporting month/year use FormField, but the year-only hint combined with bottom alignment can offset the inputs. Dashboard cards mix all-date balance/recent activity with selected-month summaries and server-defined recurring windows; retain their truthful scope descriptions. Financial values use existing exact string formatting and backend calculations.

### Analytics

RangeForm lives inside `AnalyticsPage.tsx`, not a separate controls file. Its From/To fields have no hint while Trend grouping has a long technical limit hint. An additional permanent validation paragraph adds clutter. Native select labels expose enum values. Apply/optional comparison, URL history, request isolation, cancellation and session replacement already have focused tests.

Analytics currently canonicalizes an empty query to explicit browser-local dates/grouping. This plan changes only Dashboard default URL behavior; Analytics canonicalization and range validation remain unchanged.

AnalyticsTrendChart tooltip and exact table repeat raw ISO From/To even for DAILY buckets. Chart labels use bucket.from; chart coordinates reuse existing precision-safe normalization. Exact data is always available in semantic tables; charts are decorative. Backend buckets have inclusive bounds, Monday-based weekly grouping and clipped edge intervals. Do not infer replacement boundaries.

### Categories, controls and tests

`components/CategoryIcon.tsx` always renders the neutral tag glyph. `ui/Icon.tsx` contains a small local SVG path registry; extending it is sufficient. Inspected V7 seed migration contains the 15 system names listed below. Category and Analytics category DTOs expose `system`; Dashboard recent/pending rows, transaction/budget references and recurring references expose category names without that flag. No extra lookup/request should be added just for icons.

FormField correctly associates labels/hints/errors. `.ct-control` is opaque, at least 48px high, with the older 8px radius; `.ct-button` is pill-shaped, generally 44px high and 48px for primary form actions. The global native-button pill rule needs a deliberate authenticated override. Primary/secondary/ghost/danger, pending/disabled, glass support gates, reduced transparency/motion and forced-color rules already exist.

Reviewed relevant existing suites: App, Navbar, AppShell, LoginPage, PublicRoute, ProtectedRoute, returnPath, UI foundation/FormFeedback, DashboardPage/period/chart data, Analytics page/query/charts, financial services and reporting services. Existing tests explicitly assert the legacy fallback and explicit default dashboard month; those assertions must be changed intentionally, with their safety coverage retained.

## Business rules and exact proposed behavior

### A. Authenticated defaults and ordinary product language

Introduce one frontend authenticated-home constant, `/app/dashboard`, reused by fallback validation, `/app` redirect, authenticated public dashboard actions and NotFound. Application Brand becomes “CoinTrail dashboard” and links there; public Brand continues to link to `/`.

| Trigger | Proposed destination/behavior |
| --- | --- |
| Successful login without a valid explicit return | `/app/dashboard`, replace login history entry |
| Successful login with a safe protected return | Preserve validated pathname, search and hash exactly; replace login entry |
| Authenticated visit to login/register | Same safe-return helper; otherwise `/app/dashboard` |
| Authenticated `/app` | Replace with `/app/dashboard` |
| Application Brand or public “Go to Dashboard” | `/app/dashboard` |
| Logout | Keep `/`; clear session via existing mechanism; do not retain a stale implicit return |
| Next fresh login after logout | Default Dashboard unless a new safe protected return is supplied |
| Session expiry on a protected deep link | Reauthentication returns to that safe link, with existing expiry notice/session cleanup |
| Explicit `/dashboard` or `/expenses/*` | Remain guarded and functional; never automatically migrate or combine records |

Include location.hash in ProtectedRoute's captured return path. Do not implement arbitrary external return URLs, change token/session transport, weaken guards or change registration success behavior.

Navigation primary group is “Workspace”, with Dashboard, Transactions, Budgets, Analytics, Recurring transactions, Accounts and Categories. Secondary group is “Legacy expenses”, with “Expense overview” (`/dashboard`) and “Expense records” (`/expenses`). Preserve active descendant matching and real destinations. Legacy notice: “Legacy expense records remain available and are excluded from Dashboard and Analytics transaction reports.”

Copy replacements:

- Dashboard heading/loading: “Dashboard” / “Loading dashboard…”; introduction: “Review your recorded financial activity. Legacy expense records are reported separately.”
- “Recent transactions”; “No recent transactions”; category description: “Expense transactions for this month, including inactive categories.”
- Transactions: “Record income and expenses. Legacy expense records remain separate.”
- Budgets: “Monthly category limits and recorded expense spending.” Budget detail explains category/month scope without version numbers.
- Analytics: “Explore recorded income and expenses for a selected period.” Keep a concise report-scope note: “Excludes legacy expense records, opening balances and recurring rules that have not created transactions.”
- Empty states use “recorded transactions” or “expense transactions”, never V1/V2. Do not remove scope distinctions, invent forecasting/bank integrations or claim account activity is account balance.

### B. Dashboard period URL contract

| URL/action | Resolution and history behavior |
| --- | --- |
| `/app/dashboard` | Current browser-local calendar month; no URL rewrite and no extra history entry |
| One valid year/month pair | Explicit pinned reporting period, including a selected current month; retain supplied URL on load |
| Apply period | Validate drafts, write a canonical explicit pair and push only when URL changes |
| Current month | Remove all owned year/month parameters, clear period errors and return to rolling local current month; push only when URL changes |
| Refresh dashboard | Re-read current calendar if in default mode; refresh effective-period requests without changing URL or unsaved drafts |
| Back/Forward or reload | Derive committed mode/period from URL; restore matching form/report; no normalization history loop |
| Partial/duplicate/empty/out-of-range/noninteger pair | Accessible correction state, preserve URL/drafts; no dashboard or category report requests until corrected |
| Unrelated query keys | Preserve existing permissive policy: ignore for report selection, retain during Apply/reset, never forward them to reporting APIs |

Bare default links contain no reporting query. If unrelated metadata is present, Current month removes only owned parameters and preserves metadata/hash. Preserve hashes during period writes. Accept the current validator's supported leading-zero integers; use normalized values for requests, and normalize the URL only on a user Apply. Do not modify Analytics' stricter unknown-key policy or budget list default canonicalization.

Resolve one effective period for all Dashboard requests, labels and drill-down links. The API still receives required year/month; category spending and View analytics use exact monthRange and DAILY grouping. Month helpers remain calendar-only; monetary helpers are untouched.

Default mode must advance on month rollover while mounted: a small local-calendar hook rechecks on focus/visibility resume and uses one capped timer (at most 24 hours between checks, or sooner at the next local month boundary). Re-arm after each check; publish state only when year/month changes. Clean up listeners/timer on unmount; no API polling if period is unchanged. Explicit periods remain pinned. Refresh also rechecks immediately. Test December/January, leap February, sleep/resume and local timezone changes. Do not infer server recurring dates from this browser clock.

Keep draft edits independent from committed period. On rollover, update untouched default form fields; retain dirty drafts with a short “Current reporting month has changed” notice and Current month reset. Back/Forward intentionally restores committed form values. Invalid Apply focuses the first invalid field using existing feedback conventions.

### C. Collapsible navigation

AppShell owns desktop collapse state and the layout column; Navbar renders its controls/items. No second application navigation architecture or topbar is introduced.

| Width | Specification |
| --- | --- |
| Below 768px | Compact sticky glass header, full Brand plus 44px menu button; overlay drawer closed on entry; content uses 16px gutters |
| 768–1023px | Expanded sidebar initially 192px; optional 72px icon rail; content 24px gutters |
| 1024px and above | Expanded sidebar initially 240px; optional 72px icon rail; content 32px gutters |

Desktop choice persists across route/history navigation and breakpoint changes within the mounted authenticated shell. It resets to expanded on full reload or session remount. No localStorage/cookie/global store. Mobile open state is independent and always closes on navigation/history, logout and breakpoint changes. Expanded/collapsed widths change immediately without animation; grid columns and content stay synchronized, with min-width:0. This user-triggered resize is intentional, not an asynchronous layout shift.

Expanded sidebar shows the existing Brand typography/colors; rail shows the existing SVG mark with a full accessible home name. Separate collapse/expand button remains visible in either mode, labeled “Collapse navigation” / “Expand navigation”, with aria-expanded and aria-controls. Links retain icons, accessible names, active marker/background and aria-current. Rail labels have hover/focus hints that do not clip or obscure neighboring controls; implement without dependencies. Group headings become visually hidden in rail mode. Logout remains reachable and named.

Mobile drawer: prefer a native modal dialog containing the shared navigation item definitions, one active navigation tree at a time. Width min(320px, viewport minus 32px), max-height bounded by viewport, vertical scrolling, opaque navigation surface and subtle backdrop. Header includes “Navigation” and a 44px Close button. On open focus Close; Tab/Shift+Tab stay inside; background is inert while modal is open. Escape/Close/backdrop dismiss and return focus to the menu trigger. On destination selection close without restoring trigger focus over the existing route-heading focus. Resize closes cleanly and restores focus to a visible equivalent control if needed. Lock background scrolling while open and restore prior scroll/styles on all exits/unmount. Keep logout flushSync ordering. If dialog test/browser support needs adaptation, retain these semantics and document it rather than add a dependency.

Skip navigation targets main content, never the drawer. Use sticky-header scroll offsets on focus targets/anchors; no focus stealing on collapse, query refresh or data completion. Test route-heading focus coordination explicitly.

### D. Dashboard layout

Reporting card has heading “Reporting period” and visible committed month/year. Controls align labels and input tops in a two-column row when both have adequate width; helper/errors follow controls rather than move their baseline. On narrow available content width stack them. Put Apply period and Current month in a separate 12px-gap action row. Show concise help: “Without a selected period, Dashboard follows your device's current month.” Show year limit only as a short associated hint/error.

Keep Create transaction/View transactions in PageHeader. Refresh dashboard and View analytics form a separate reporting-action group aligned with the committed period; wrap naturally and stack below 480px. Use one primary action per action group; Current month/Refresh secondary, View analytics ghost. All text centered vertically, with matching 48px normal controls/actions.

Cards retain opaque white surfaces, existing 12px card radius, 20px mobile/24px larger padding, 24px section gap and existing typography. Metrics use available-content-aware grids: one column at narrow widths, two when readable, four only when complete values fit. Report sections stack until two columns are genuinely usable. Never truncate exact money, negative remaining amounts, IDs or long names. Retain separate empty states for budgets, category spending, recent and recurring activity; no fabricated zero placeholders while loading.

### E. Analytics presentation

From, To and Trend grouping share label/control rows and 48px height; use three columns only when each has adequate width (approximately 15rem), otherwise two then one. Helpers sit below the control row and never bottom-align whole field stacks. Apply range/Add comparison use a separate 12px-gap action row; comparison fields are grouped under “Comparison period”. Native options display “Daily”, “Weekly”, “Monthly” while submitted enums remain unchanged.

Always-visible help: “Dates are inclusive. Grouping changes the trend chart.” Put exact range/grouping limits in an accessible “Reporting limits” details disclosure; keep real validation errors inline, associated and focused on invalid Apply. Preserve the current 366-day daily limit and strict calendar-anniversary weekly/toplevel/monthly bounds, with no misleading fixed-day approximations.

Add a small presentation-only date-label helper using validated ISO calendar parts, browser locale and an explicit UTC formatting timezone. Construct dates without the year-0–99 constructor shortcut; never parse financial values or use local-midnight conversions that shift date-only labels. Pass locale explicitly in tests. Include the year on exact table/tooltip dates so historical ranges are unambiguous.

- DAILY: one localized date, e.g. “10 Oct 2026”, with one `<time datetime="2026-10-10">`.
- WEEKLY/MONTHLY: show the actual inclusive returned start and end, e.g. “28 Sep 2026 – 4 Oct 2026”; never replace clipped ranges with a full week/month name. If bounds coincide, one date is exact.
- Use the same helper in exact tables and tooltips; chart ticks may be shorter but exact dates remain available without hover. Do not alter chart scaling or backend buckets.

Table heading becomes “Date / period”. Numeric columns use tabular figures and consistent right alignment; row labels left-align, counts retain exact strings. Keep caption/scoped headers and all rows (including zero-filled buckets). At 320px only the labeled, keyboard-scrollable table region may scroll horizontally; the document must reflow. Use no fixed row heights, ellipses on money or fake pagination. Concise chart note: “Bars show relative scale; exact amounts are listed below.” Keep pattern/legend distinction and the accessible exact-data alternative.

### F. Category icon specification

Use local stroke SVGs in ui/Icon, currentColor, consistent 20px glyphs/neutral 40px tiles (16px/32px small variant). Decorative aria-hidden icons supplement visible category names and never encode financial semantics through color.

| Actual seeded system name | Proposed glyph |
| --- | --- |
| Food | Utensils |
| Travel | Suitcase |
| Shopping | Shopping bag |
| Entertainment | Film |
| Bills | Receipt/document |
| Health | Medical cross |
| Education | Graduation cap |
| Other | Tag fallback |
| Rent | House |
| Subscription | Repeat arrows |
| Salary | Briefcase |
| Bonus | Gift |
| Freelance | Laptop |
| Interest | Percent |
| Other Income | Tag fallback |

CategoryIcon accepts optional name/type/system plus existing size. Match trimmed, case-normalized seeded names and expected type; never map hardcoded IDs. With system=true use the mapping; with system=false always retain fallback, including custom “Food”. Where DTOs omit system metadata, a known name/type may receive a presentation-only glyph, without implying system status. Unknown names/missing metadata use tag. Do not fetch categories merely to decorate reports, and do not suppress inactive history. Pass available metadata at each category-bearing callsite; leave selectors native/textual. This reference-name fallback limitation is explicit and requires approval.

### G. Shared controls, design tokens and accessibility

Authenticated controls/buttons use **12px radius**, 48px normal minimum height, 16px/24px type, 12–16px horizontal padding and 12px action gaps. Icon actions remain 44px square with circular corners; compact navigation links retain >=44px targets. Inputs/selects/textareas and form surfaces remain opaque; textarea height grows naturally. Apply the authenticated shape through scoped shared tokens/classes, not page-specific overrides. Preserve pill-shaped public/login/register/footer buttons from Plan 012; do not silently reverse the public design.

Retain existing light indigo primary palette, glass highlights, secondary/ghost/danger semantics, native disabled/pending state and focus-visible ring (2px with 3px offset). Danger remains recognizably destructive, not pale neutral glass. Pending labels do not change heights or make full forms translucent. Hover/pressed states change color/border/shadow only; no transforms that shift button text. Consolidate within shared rules and avoid raising selector specificity repeatedly.

Native select closed controls can use shared radius/padding/focus styling. Expanded menus are browser/OS controlled and are not guaranteed to inherit popup radius or shadows. Keep native keyboard/mobile picker behavior; no custom dropdown dependency solely for rounded options. Browser QA records actual results rather than promises unsupported styling.

Reuse system fonts, Clarity semantic colors and spacing. Maintain WCAG AA text/control contrast; validate the actual glass composition over scrolling content. Header/button blur is progressive enhancement only, with opaque baseline and reduced-transparency/forced-color/print fallbacks. Sidebar/drawer navigation and all financial data/cards/forms stay readable and predominantly opaque. Reduced motion removes transitions; no width animation, animated backgrounds, large blur regions or financial count animations. No new dependencies or financial API contracts.

## Affected files/components

Paths below are relative to `cointrail-frontend/`; new files are proposals, not existing implementations.

| Area | Expected files |
| --- | --- |
| Default/return routing | `src/routes/returnPath.ts`, `ProtectedRoute.tsx`, `PublicRoute.tsx`, `src/App.tsx`; proposed `src/routes/destinations.ts`; LoginPage only if needed to share constant behavior |
| Authenticated public actions | `src/components/landing/PublicLandingNavigation.tsx`, `src/pages/LandingPage.tsx`, `NotFoundPage.tsx`; destination changes only |
| Shell/navigation | `src/components/AppShell.tsx`, `Navbar.tsx`, `Brand.tsx` only if compact mark presentation needs a prop; proposed mobile drawer/shared item helper adjacent to Navbar; `src/routes/AppLayout.tsx` notice |
| Dashboard | `src/pages/dashboard/DashboardPage.tsx`, `period.ts` only for compatible helpers, `CategorySpending.tsx`; proposed `useCurrentCalendarPeriod.ts` and tests |
| Analytics | `src/pages/analytics/AnalyticsPage.tsx`, `AnalyticsTrendChart.tsx`; proposed `dateLabels.ts` and tests; chartData label wiring only if needed, never coordinate calculations |
| Shared design | `src/index.css`, `src/components/ui/FormField.tsx`, `Button.tsx` only if shared presentation changes require markup; retain existing props/semantics |
| Category icons | `src/components/CategoryIcon.tsx`, `ui/Icon.tsx`, `ui/FinancialRow.tsx`; categories list/details, budgets list/details, transaction list/details, recurring details, dashboard rows and Analytics CategoryBreakdown callsites |
| Remaining public copy | TransactionsPage, BudgetsPage, BudgetDetailsPage, CategorySpending, AnalyticsPage and AppLayout; version wording only |
| Tests | Existing App/route/LoginPage/Navbar/AppShell/UI foundation/Dashboard/Analytics suites; new focused CategoryIcon/date-label/calendar tests and affected category/reference tests |

No changes to backend, migration seeds, DTO contracts, API/session transport, financial precision helpers, package manifests/lockfiles, AGENTS.md, skills or Plans 006–012. Preserve existing internal version-named types/import aliases when they do not affect visible copy.

## Risks and compatibility considerations

1. New default changes product navigation intentionally; preserve explicit legacy/deep-link returns and guard/logout ordering. Test both authenticated and anonymous public navigation.
2. Shared period helpers also serve Budgets; isolate Dashboard rolling/default behavior and retain explicit budget month URLs.
3. Browser-local month differs from server recurring window: never merge those clocks. Rollover cannot override pinned historical periods or erase dirty drafts.
4. Focus ownership can race dialog dismissal/route heading focus; specify dismissal reason and test keyboard, history, breakpoint and session exits. jsdom cannot prove real modal focus/inert behavior.
5. Rail changes available content width; test long amounts/names and 200% zoom with rail both open/closed. Use normal layout, not absolute content offsets.
6. Date localization must preserve calendar dates, early years and inclusive clipped edges. ISO datetime values remain exact.
7. Name-based icons are cosmetic; custom category identity and duplicate-name rows stay separate by exact IDs. Missing system metadata cannot establish category provenance.
8. Authenticated radius changes intentionally differ from public pills; avoid broad CSS overwriting landing/auth styles. Retain light glass and semantic danger/focus behavior.

## Tests, verification and acceptance criteria

### Automated regression strategy

- Routing: update returnPath/PublicRoute/LoginPage/App tests for fallback `/app/dashboard`; explicit modern and legacy paths including search/hash; unsafe/encoded/traversal/external returns still rejected. Assert `/app`, Brand, landing authenticated actions and NotFound destinations. Preserve public logout and fresh-login behavior, session expiry/replacement and protected-content cleanup.
- Dashboard: bare URL stays bare while API receives local year/month; no redundant history entry. Explicit pair including current month remains pinned; Apply/Current month/Refresh, hashes/unrelated keys, duplicate/partial/malformed errors, zero-padded input, bounds 0001–9999, leap centuries, Back/Forward/reload, rollover/sleep/visibility and dirty drafts. No request for invalid URL; unchanged stale-request/cancellation/session/precision assertions. Add a regression proving Budgets retain their URL behavior.
- Sidebar: expanded/rail geometry state classes, visible toggles, accessible names/active descendants, one active navigation tree, persistence across navigation and reset on reload/session. Mobile starts closed; Escape, Close, backdrop, route/history, breakpoint and logout close it; cleanup and focus return/heading coordination. Test dialog interactions in browser where DOM emulation is insufficient.
- Analytics: localized DAILY date once; exact clipped WEEKLY/MONTHLY bounds, year crossing, leap days, years 0001/0099/9999 and timezone independence. Same helper for tooltip/table; unchanged original datetimes, money/count strings, signed deltas, zero buckets, request isolation, query limits, comparison and stale-session tests. Visible option labels change, enum request values do not.
- Categories: table-driven tests for all seeded names/types, case/whitespace normalization, known custom-name fallback with system=false, metadata-absent fallback, unknown/inactive cases and decorative accessibility. Duplicate names/large IDs remain separate; no icon-triggered request.
- Controls/copy: shared authenticated radius/height classes and correct variant/focus/disabled/pending semantics; public pills preserved; visible text no longer exposes V1/V2 without renaming internal contracts. Use browser measurements for real alignment/contrast rather than pretend jsdom proves computed layout.

Run targeted suites during each implementation PR, then `npm run test:run`, `npm run lint`, `npm run build` in cointrail-frontend and `git diff --check` at repository root. Record actual pass/fail counts, warnings and uncompleted checks. Backend verification is not a gate for this frontend-only scope; backend files remain unchanged.

### Manual browser matrix

At **320, 390, 768, 1024 and 1440px**, inspect Dashboard, Analytics, Categories, Transactions and representative create/edit forms, both sidebar states where applicable, legacy routes and public login/landing regression. Use synthetic fixture data only.

- No document horizontal overflow; table overflow contained and keyboard-scrollable. Full exact large/negative amounts, long names and errors remain readable.
- 200% zoom including a 640px window yielding approximately 320 CSS-pixel content; reflow/mobile breakpoint and native date/select controls remain usable.
- Keyboard-only skip link, route focus, rail hints, active navigation, drawer trap/Escape/return, logout and form error correction. Sticky header never covers focus targets/anchors.
- Default login/deep-link return; session expiry; bare current-month reload; explicit historical bookmark; Back/Forward; mocked month rollover and resume.
- Matching field/action baselines, hover/pressed/pending/disabled/focus and destructive styles; glass while scrolling, reduced motion/transparency, forced colors and opaque fallback.
- Check native expanded selects on available desktop/mobile browsers; document differences. Inspect localized dates in multiple locale/timezone settings.
- Capture before/after screenshots for dashboard controls, analytics controls/table, expanded/rail sidebar and mobile drawer; record viewport, browser, fixture/session mode and limitations. Tests/screenshots must not expose real financial data.

### Completion acceptance

- Default authenticated destination is `/app/dashboard` throughout; explicit protected/legacy returns still work.
- Default Dashboard never auto-appends reporting parameters; historical/user-applied periods remain shareable and stable, with rollover limited to default mode.
- Navigation meets the desktop/mobile specification without new architecture/dependencies or hidden logout/focus traps.
- Dashboard/Analytics controls align, date labels are exact and concise, financial values/calculations are unchanged, and category icons follow the audited mapping/fallback policy.
- Authenticated controls are consistently 12px/48px, public pill/glass design remains intact, and financial surfaces remain opaque/readable.
- Required automated checks pass and real browser findings/any blocked checks are recorded before review. No backend/API/schema/precision/dependency changes.

## Recommended implementation PR sequence

After approval, re-fetch origin/develop and verify a clean tree before each branch. Create each branch from the latest develop after the preceding PR merges; do not implement on this planning checkout or assume unmerged work is available.

1. **Authenticated home, reporting URL behavior and copy** — new `feature/authenticated-dashboard-defaults`: shared destination, safe return/hash handling, all authenticated home links, ordinary product labels, Dashboard default/explicit period/rollover rules and regression coverage. Preserve legacy routes, budget/Analytics canonicalization and session semantics.
2. **Responsive application shell and control foundation** — new `feature/application-navigation-controls`: desktop rail, accessible mobile drawer, focus/scroll cleanup, scoped authenticated control tokens/height/radius and shared field layout foundation. Cover shell/variant regressions and browser keyboard/reflow QA. Public design unchanged.
3. **Reporting presentation and category icons** — new `feature/reporting-ux-refinement`: Dashboard/Analytics alignment/cards/help/date labels/exact tables, seeded icons and metadata-aware callsites, presentation regression tests and full responsive QA.

Keep every PR frontend-only, reviewable and independently verified. If shared form changes in PR2 already resolve a layout defect, PR3 uses them rather than adding duplicate CSS. Human review/merge boundaries remain intact; implementation verification should be appended to this plan only during the approved delivery task.

## Decisions requiring approval

Approval of this plan should explicitly cover:

1. New authenticated default and clean rolling Dashboard URL; Apply pins even the current month, while Current month restores rolling mode; unknown dashboard metadata remains permissive/preserved.
2. In-memory desktop collapse preference (expanded after reload), 72px rail, existing 768px mobile breakpoint and a modal mobile drawer.
3. **12px authenticated control/button corners** while retaining rounded public/auth-page pills; this is an intentional scoped refinement of prior button choices.
4. Seeded-name/type icon matching when system metadata is absent, with explicit custom-category fallback wherever system=false is known.
5. Three sequential frontend PRs rather than one large navigation/reporting redesign.

No implementation is authorized by creation of this document alone.

## PR 1 implementation and verification — 2026-10-10

Plan 013 was explicitly approved for implementation; this delivery implements **PR 1 only** on `feature/authenticated-dashboard-defaults`, based on freshly fetched develop `41dd99db56a982bd2eed9e3f337cf42410ec0efa`. PR #28 was rechecked as merged. The planning document was the only untracked file at preparation; it was preserved outside the checkout while the clean branch was created, then restored for inclusion with this evidence.

### Implemented

- [x] Shared `AUTHENTICATED_HOME` is `/app/dashboard`. Login/PublicRoute fallback, `/app`, authenticated landing header/hero/final/footer actions, NotFound and the application Brand use the current Dashboard. Public Brand and logout remain `/`.
- [x] Safe return-path validation is retained; ProtectedRoute now captures search **and hash**. Explicit modern/legacy protected destinations, session expiry/replacement and existing logout ordering remain supported.
- [x] Bare Dashboard resolves the browser-local current month without rewriting the URL. Explicit valid pairs remain pinned; Apply writes canonical year/month, Current month removes owned parameters, and both preserve unrelated metadata/hash without duplicate no-op history entries.
- [x] Invalid/partial/duplicate periods remain visible with associated correction feedback and no reporting reads. Invalid Apply focuses the first invalid field.
- [x] Default month rechecks on focus/visible resume and one capped local-calendar timer. Unchanged checks never poll reports; explicit periods have no calendar monitoring. Refresh checks immediately. Rollover preserves dirty drafts with a notice, updates pristine fields and aborts obsolete report reads. Returning from a long-lived pinned report resolves the new local month before children dispatch, avoiding a stale-month request.
- [x] User-facing version language is removed from scoped Dashboard/category spending/Transactions/Budgets/Analytics and the legacy notice. Navigation uses Workspace, Dashboard, Recurring transactions, Legacy expenses, Expense overview and Expense records. Internal aliases, routes and API contracts are retained.
- [x] Budget period helpers/default canonicalization and Analytics range/query behavior are unchanged; their existing regression suites remain passing.

No backend, database, schema, API contract, session transport, financial precision helper, dependency, CSS, sidebar architecture, control radius, Analytics date formatting or category icon change. AGENTS.md, skills and Plans 006–012 are untouched. PRs 2 and 3 remain deferred.

### Actual automated results

- Focused Dashboard/calendar/Navbar/Budget/Analytics run: **5 suites, 101 passed**, 29.96s, before the final pinned-to-default transition regression was added. Final full run includes that regression.
- Final full suite: **`npm run test:run -- --maxWorkers=2` — 44 suites, 704 passed**, 189.12s. All tests ran; no assertions/timeouts/configuration were weakened and no tests were skipped. Worker limiting is an invocation-only resource bound, not a repository configuration change.
- Requested default `npm run test:run` was also executed: first run **701 passed / 2 failed** from outdated navigation-label assertions, corrected to approved labels; second run **696 passed / 7 failed**, with 5-second test timeouts and asynchronous find failures across Dashboard, Analytics, App, Budgets and recurring flows under default parallelism. The bounded full run passed all of these cases. Default-parallel execution remains a resource-sensitive verification limitation on this workstation; do not describe it as a passing default run.
- Final `npm run lint`: **passed**.
- Final `npm run build`: **passed**; JS 867.67kB / 249.69kB gzip, CSS 44.80kB / 9.50kB gzip. The existing >500kB bundle warning was observed during build verification; code splitting is outside PR 1.
- `git diff --check`: **passed**. Git emits normal LF-to-CRLF advisory messages on this Windows checkout, without whitespace errors.

New/updated regression coverage includes authenticated fallback/legacy routes/public actions/Brand, modern and legacy search/hash returns, expired-session reauthentication, fresh login after logout, bare/current/pinned periods, canonical Apply/reset/no-op history/Back/Forward, invalid parameters, metadata/hash preservation, leading-zero periods, rollover/leap calendar/focus/visibility/timer cleanup, dirty/pristine drafts, refresh, stale request cancellation, session replacement and existing exact money/large-ID assertions.

### Actual browser QA and limits

Chrome **155.0.8059.39**, headless real browser, synthetic API responses intercepted locally; no real financial calls or customer data. **16 checks passed**, including Dashboard at **320, 390, 768, 1024 and 1440px** (no document horizontal overflow, Dashboard heading, application Brand destination, correct local year/month), Apply/reset/Back/Forward preserving metadata/hash, invalid-period correction feedback, unchanged Budget/Analytics explicit default URLs, `/app`, authenticated NotFound/landing destinations, legacy dashboard, public logout, fresh login and protected reporting deep-link return.

Reviewed screenshots at 320 and 1440px. Existing desktop reporting-field baseline misalignment remains intentionally deferred to PR 3; public pill controls and the existing sidebar are unchanged. Browser URL/reflow checks were completed before the final pinned-to-default calendar transition guard; the final automated test verifies that edge case. The browser checks are not a claim of real-backend E2E validation.

- [Dashboard at 320px](013-pr1-qa/dashboard-320.png)
- [Dashboard at 1440px](013-pr1-qa/dashboard-1440.png)
- [Browser measurements and synthetic request log](013-pr1-qa/results.json)

Not completed in PR 1: physical devices, Firefox/Safari, 200% browser zoom, screen-reader/contrast/forced-color audits and real-backend E2E. Calendar rollover is covered by controlled-clock automated tests rather than waiting for a real month boundary. The initial QA interceptor incorrectly matched frontend source modules; it was narrowed to actual API paths and the complete browser run then passed. No application fix was needed for that harness issue.

Full diff reviewed for frontend/PR 1 scope. Delivery is one feature PR targeting develop, with no automatic merge. Remaining product UX work is the approved PR 2/PR 3 sequence, not an expansion of this PR.

## Sidebar follow-up requested during PR #29 review

The user explicitly requested that full sidebar labels stop remaining visible on Dashboard and appear on hover. This authorizes the following narrow addition to PR 1; the original PR 1 evidence above describes its earlier scope.

- [x] Desktop (768px+) starts with a 72px icon rail. Hover on fine pointers or keyboard focus expands a 240px overlay without moving content. Accessible link names remain available while labels are hidden.
- [x] A visible pin toggle reserves a 240px column when pinned. Pin state survives navigation in the mounted application shell and resets on reload/remount; no persisted preference or dependency is introduced.
- [x] Mobile retains the existing closed-by-default menu and full brand. The desktop pin control is hidden. Existing active routes, links, session behavior and logout ordering are unchanged.
- [x] Labels and icons retain their vertical positions during expansion; no width animation is introduced. No financial logic or unrelated control redesign is included.

### Follow-up verification

- Targeted AppShell/Navbar/App run: 3 suites, 63 tests passed before adding the pin-state regression. The final full run includes that additional regression.
- Final full suite: `npm run test:run -- --maxWorkers=1`: **44 suites, 705 tests passed**, 221.01s. No tests, assertions or timeouts were weakened. Earlier two-worker run alongside browser QA had 701 passed / 4 failed from asynchronous timing failures; resource-sensitive parallel execution remains a workstation limitation.
- `npm run lint`, `npm run build`, and `git diff --check`: passed. Build retains the existing >500kB chunk warning (868.19kB JS, 249.82kB gzip).
- Real headless Chrome 155: **10 sidebar-specific checks passed at 320, 390, 768, 1024 and 1440px**, with synthetic intercepted API responses. No horizontal overflow; mobile open/close, desktop hover/out, focus expansion, pin/unpin and unchanged content position during hover verified.
- Reviewed [collapsed desktop](013-sidebar-qa/dashboard-1440.png), [expanded desktop](013-sidebar-qa/hover-1440.png) and [mobile](013-sidebar-qa/dashboard-320.png) screenshots. [Measurements and request log](013-sidebar-qa/results.json).
- The extended browser script did not complete its reporting-history check; it is not reported as passed. Reporting regressions passed in the final automated suite. Physical devices, Firefox/Safari, zoom and screen-reader/forced-color audits were not completed for this follow-up.

This supersedes the earlier statement that sidebar styling is entirely deferred. Mobile overlay/focus trapping, shared control redesign, Analytics presentation and category icons remain separate planned work. Full follow-up diff reviewed; delivery updates existing PR #29 without merging.
## Revised sidebar decision — explicit collapse (PR #29)

This latest user-approved refinement supersedes the hover/pin follow-up above and the original Section C initial expanded/192px desktop decisions. The remaining mobile modal/control work is still deferred.

- [x] AppShell owns one in-memory expanded boolean, initially false. At >=768px the rail is 72px and the expanded sidebar is 240px; one CSS width token drives both navigation and its allocated layout column. Expansion never overlays Dashboard content. Hover/focus never expands navigation; there is no pin preference or width animation.
- [x] A single desktop control has the accessible label/title Expand navigation / Collapse navigation and aria-expanded. The collapsed control combines the existing SVG mark with a small expansion chevron so two 44px targets need not be squeezed into a 72px row. Expanded mode puts the home-linked full Brand and collapse chevron on one row. Mobile keeps its separate existing menu trigger; desktop controls are hidden there.
- [x] Desktop header and logout are non-shrinking flex regions. Only the navigation panel scrolls, with min-height:0, overflow-y:auto and overflow-x:hidden; a thin thumb and transparent track appear only when necessary. Long labels wrap instead of creating horizontal scrolling. No links are removed or clipped without a scroll path.
- [x] Links retain accessible names, active backgrounds and aria-current. Native hover titles and visible keyboard-focus hints identify collapsed links; Logout also has a named hint. Hints never expand the rail. Choice remains stable across mounted-shell navigation/breakpoint changes and resets on full reload/session remount.
- [x] Mobile remains closed by default. Escape returns focus to the trigger; route/history changes close the menu, and the existing route-heading focus remains effective. Breakpoint changes move focus to a visible equivalent control. Logout retains flushSync ordering and its public destination.
- [x] No changes to authenticated-home defaults, Dashboard reporting URLs, deep-link validation, financial logic, backend/API/schema or dependencies. Shared control redesign, mobile modal drawer, Analytics formatting and category icons remain deferred.

### Actual verification for explicit navigation

- Final full suite: **44 suites / 706 tests passed**, `npm run test:run -- --maxWorkers=1`, **188.92s**. Includes explicit expansion/navigation/remount, active link and hint regressions plus existing mobile, logout, auth, reporting, cancellation and precision coverage.
- Requested default `npm run test:run` was run twice: first 701 passed / 5 failed with missing-matchMedia errors in the new focus handler; capability guards fixed that implementation defect. The second had **705 passed / 1 failed**, an asynchronous recurring cancellation-feedback lookup under parallel load. The unchanged test passed in the final complete single-worker run. No tests/assertions/timeouts/configuration were weakened or skipped; default parallel execution remains a workstation limitation.
- Preliminary targeted AppShell/Navbar run: 2 suites / 9 passed before the final hint regression/focus changes; final complete suite validates those additions.
- Final lint, build and git diff --check passed. Build: JS 869.35kB / 250.13kB gzip, CSS 46.77kB / 9.85kB gzip; existing >500kB chunk warning remains.
- Chrome 155 real headless browser, synthetic intercepted API fixtures only: **16 asserted normal-layout checks** at 320/390 mobile and 768/1024/1440 desktop, each at 900px and 360px viewport heights. Both desktop states have aligned allocated columns and no navigation horizontal overflow; header and Logout stay visible, navigation scrolls at short heights, mobile Escape returns focus and hover/focus do not expand the rail. Measurements follow a 250ms responsive-chart settling interval; immediate post-expansion document measurements transiently reported overflow before chart layout caught up, while sidebar horizontal measurements stayed clear.
- **10 actual 200% browser-zoom checks**: isolated Chrome profile default zoom configured from its [zoom preference implementation](https://raw.githubusercontent.com/chromium/chromium/main/chrome/browser/ui/zoom/chrome_zoom_level_prefs.cc), verified devicePixelRatio=2 without emulation scaling. Browser windows 768/1024/1440px correctly reflow to mobile at both 1000px and 600px heights; 1600px window verifies both desktop states at both heights, with header/Logout visible and no horizontal navigation overflow. The normal harness's shortcut-only zoom attempt did not change zoom and is not counted as zoom verification.
- **4 additional keyboard checks**: Enter expands/collapses, real Tab traverses all nine links and reaches Logout through a short-height scrolled rail, Enter on Logout returns to public home, and mobile destination selection closes the menu and focuses the new heading. Initial Enter harness omitted the Chromium keypress text payload; corrected harness passed without an application change.

Reviewed [collapsed](013-explicit-sidebar-qa/1440-900-collapsed.png), [expanded](013-explicit-sidebar-qa/1440-900-expanded.png), [short-height expanded](013-explicit-sidebar-qa/768-360-expanded.png), [short-height rail](013-explicit-sidebar-qa/1024-360-collapsed.png), [mobile](013-explicit-sidebar-qa/320-360-mobile.png), [200% expanded](013-explicit-sidebar-qa/zoom-1600-600-true.png) and [keyboard rail](013-explicit-sidebar-qa/keyboard-short-rail.png) screenshots against the prior hover-sidebar evidence. Measurements: [normal](013-explicit-sidebar-qa/results.json), [zoom](013-explicit-sidebar-qa/zoom-results.json), [keyboard](013-explicit-sidebar-qa/keyboard-results.json).

Remaining verification limits: physical devices, Firefox/Safari, screen-reader/forced-color audits and real-backend E2E were not performed. Financial fixtures contain only synthetic data. Full source diff reviewed for this narrow refinement; delivery remains existing PR #29 on feature/authenticated-dashboard-defaults, without merging.
## PR 2 implementation evidence - shared controls and mobile navigation

Implemented on `feature/application-navigation-controls` from latest `origin/develop` at `1629026125d28312beb59d1cf687402914d48a38`. PR #29 was verified merged (2026-10-10 12:20:55 UTC); the initial working tree was clean. This evidence supersedes the previous deferral of shared controls/mobile modality. Analytics date/table formatting and category icon mappings remain PR 3 work.

- [x] Authenticated shell and portal share scoped tokens: normal buttons/native inputs/selects/textareas use 12px radii, 48px minimum heights, 16px/24px typography and 12-16px horizontal padding. Textareas grow naturally; icon actions remain 44px circular targets. Landing/login/register/footer pill styling remains unchanged.
- [x] Existing glass-inspired button variants, destructive color, pressed/hover, focus, disabled and pending semantics are preserved. Financial cards and controls remain opaque; native disabled controls retain the opaque gray fallback. Native expanded select menus remain browser/OS controlled; no custom dropdown dependency was added.
- [x] Reviewed FormField: its existing labels, hint/error ordering, IDs and aria-describedby are correct. Shared field groups now align to their tops so asymmetric hints do not offset controls. Added native select/textarea feedback and keyboard-editing regressions. No unrelated page layout redesign.
- [x] Mobile navigation is one portaled native modal dialog, initially closed, with an accessible Navigation heading, Close control and backdrop. It focuses Close, wraps Tab/Shift+Tab, keeps the background inert, closes on Escape/Close/outside click, locks background scrolling and restores exact previous body styles on close/unmount. Links and Logout render once, with no duplicate IDs. Fixed header/footer and a min-height:0 scrollable link region retain access at short heights.
- [x] Destination selection closes synchronously; history changes release native modality before the existing route-heading focus. Breakpoint changes dismiss the drawer and focus a visible control. Logout ordering, public destination, routes, auth defaults/session handling, reporting URLs and precision remain unchanged.
- [x] Desktop AppShell remains unchanged: default collapsed 72px rail, explicit 240px expansion with allocated content width, no hover expansion/pinning, state retained during mounted navigation and reset on reload. Navigation horizontal scrolling remains prevented while vertical scrolling is accessible.

### Actual PR 2 verification

- Requested `npm run test:run`: 44 suites, 684 passed / 25 failed, 171.97s. Failures were async lookups/test timeouts under parallel workstation load. First single-worker run: 707 passed / 2 recurring creation heading-lookup failures, 316.41s. The unchanged recurring suite then passed all 65 tests in isolation (24.14s).
- Final full `npm run test:run -- --maxWorkers=1`: **44 suites / 709 tests passed**, 233.56s. No tests, assertions, timeouts or runner configuration were weakened/skipped. Includes auth, safe returns, reporting periods/history/rollover, request cancellation, precision, shared primitives, explicit desktop navigation, mobile modality/cleanup and logout regressions. Default parallel reliability remains a workstation limitation.
- `npm run lint`, `npm run build` and `git diff --check`: passed. Production bundle remains approximately 871kB JS (251kB gzip), with the existing large-chunk warning; no dependencies added.
- Real headless Chrome 155: **33 normal-layout assertions** at 320, 390, 768, 1024 and 1440px, with 900px/360px heights. Verified desktop 72px/240px allocated columns, no horizontal overflow, mobile Close autofocus, native background inertness, actual Tab boundaries, Escape/backdrop dismissal and focus return, short-height scrolling/Logout access, destination and breakpoint focus, public/logout behavior, shared dimensions, field alignment and unchanged public/login/register pills.
- **10 actual 200% browser-zoom assertions** using isolated Chrome profile zoom (devicePixelRatio=2): 768/1024/1440px browser windows reflow to mobile at 1000px/600px heights; a 1600px window checks both desktop states at both heights. No horizontal navigation overflow and header/Logout remain accessible. This is real browser zoom, not screenshot scaling.
- **4 supplementary browser assertions**: legacy form dimensions and real keyboard focus ring at 320/1024px, desktop Enter expand/collapse at short height, and native Back dismissal before destination-heading focus. These also verify the final authenticated focus-scope change.
- All browser APIs were intercepted with synthetic fixtures; no real financial data/API requests. Button-state CSS fixtures use the existing shared classes, while actual React variant/pending semantics are covered by component tests. Settled hover/color and responsive-chart transitions were measured. Initial harness assertions before transitions settled were corrected without weakening application tests. Native dialog Tab boundaries required an explicit wrapping handler after Chrome Shift+Tab escaped to browser chrome; the final real-keyboard assertions pass.
- jsdom lacks showModal/close: guarded test-only open-attribute stubs cover lifecycle; real Chrome verifies modality/inertness and focus behavior. Browser screenshot/zoom checks preceded the final legacy focus-ring scope extension; the supplementary legacy checks validate that extension.

Reviewed [mobile short drawer](013-pr2-qa/320-360-drawer.png), [mobile drawer](013-pr2-qa/390-900-drawer.png), [expanded short desktop](013-pr2-qa/768-360-expanded.png), [expanded desktop](013-pr2-qa/1440-900-expanded.png), [collapsed desktop](013-pr2-qa/1440-900-collapsed.png), [account controls](013-pr2-qa/account-form-390.png), [button/disabled states](013-pr2-qa/primitives-and-disabled-390.png), [200% mobile](013-pr2-qa/zoom-1440-600-mobile.png), [200% expanded desktop](013-pr2-qa/zoom-1600-600-true.png) and [legacy controls](013-pr2-qa/legacy-form-320.png) against the prior explicit-sidebar screenshots. Measurements: [normal](013-pr2-qa/results.json), [zoom](013-pr2-qa/zoom-results.json), [supplementary keyboard/history](013-pr2-qa/legacy-results.json).

Remaining checks: physical devices, Firefox/Safari, screen-reader testing, complete contrast/forced-color/reduced-transparency audits and real-backend E2E were not performed. Existing fallback CSS is retained, with Canvas/CanvasText modal styling added. Native dialog requires a modern supporting browser. Scope excludes backend/API/schema/dependencies, financial helpers, category icons and Analytics bucket/table presentation. Delivery is one new frontend PR targeting develop; do not merge.