# CoinTrail Clarity Design Foundation

## Goal and authorization

Establish a clean, minimal, accessible visual foundation for CoinTrail's delivered V2 Accounts, Categories and Transactions. Use white surfaces on an off-white canvas, restrained indigo accents, neutral category icons, and clear financial hierarchy. Deliver the implementation in **one focused design-foundation PR**, following approval of this plan; the phases below are reviewable steps within that PR, not separate product milestones.

**Status: implementation authorized, 2026-10-09.** The user approved this plan and requested implementation on `feature/clarity-design-foundation`, verification, commit/push and one PR targeting develop. Merging and deployment remain excluded. The original planning findings below are retained as the inspected baseline; implementation evidence is recorded at the end.

Repository inspected on clean `develop`, HEAD and local `origin/develop` both `ab1dbcd07aedf849c8112d28337fee5a3b4d860f`, the merge of [PR #20](https://github.com/deepakydv25/cointrail/pull/20). GitHub metadata independently confirms that PR #20 is merged into develop. This is a snapshot, not a guarantee that develop will remain unchanged before implementation.

Instructions consulted: `AGENTS.md`, `.agents/skills/planning/SKILL.md`, the existing feature-delivery/testing workflows, and Plan `006-v2-frontend-foundation.md`. Plan 006's early Existing State describes its original pre-foundation inspection; the source and its Phase 0–2 implementation evidence take precedence for current UI facts. Phase 2 is now merged; V2 Dashboard, Budgets, Recurring and Analytics are still absent. This design milestone does not implement those domains or check off their Plan 006 tasks.

Existing instructions and source establish **`/dashboard`** as the authenticated default; preserve it. Proposed visual scope keeps legacy page bodies unchanged and changes their shared application navigation only. A broader legacy refresh is an explicit approval decision below, not an implicit part of the design foundation.

## Existing State — inspected implementation

Frontend paths below are relative to `cointrail-frontend/`.

| Area | Actual source and behavior | Limitation / implication |
| --- | --- | --- |
| Application composition | `src/main.tsx` uses StrictMode, BrowserRouter and AuthProvider. `src/App.tsx` contains SiteLayout, route-heading focus via requestAnimationFrame, one skip link to `#main-content`, public guards and protected AppLayout routes | Keep one focus owner and one skip target. A new shell must not duplicate navigation or nest main landmarks. |
| Routes | Public `/`, `/login`, `/register`; protected `/dashboard`, `/expenses`, `/expenses/create`, `/expenses/:id`, `/expenses/:id/edit`; `/app` redirects to `/dashboard`; all four list/create/detail/edit routes in each of `/app/accounts`, `/app/categories`, `/app/transactions`; protected `/app/*` not-found | Preserve paths, guard behavior, search strings, direct-link login return and wildcard behavior. Do not advertise unavailable future destinations. |
| Navbar | `src/components/Navbar.tsx`: one responsive navigation tree, V2 links followed by “Legacy”, Legacy Overview, Legacy Expenses, Logout. Horizontal navigation at `lg` (1024px); disclosure below, expanded/control attributes, Escape focus return, active NavLink state. Navbar is keyed by pathname in SiteLayout | No sidebar exists. Top navigation becomes crowded; selection currently uses blue text and underline. Public and protected navigation currently share the component. |
| Protected layout | `src/routes/AppLayout.tsx` adds the legacy notice and Outlet; no surface/layout system. `ProtectedRoute.tsx` keys Outlet by sessionVersion | Keep the notice and session remount boundary. Shell extraction must not preserve old-owner page state across login/logout/replacement. |
| Styling / Tailwind | `src/index.css` imports Tailwind and adds a global blue `:focus-visible` outline. `vite.config.ts` installs `@tailwindcss/vite`. No project Tailwind JS/TS configuration file or custom theme token layer was found | Use Tailwind 4 CSS-first theme configuration. Do not generate a v3 config or override Tailwind's default palette globally. |
| Shared UI | `components/ui/States.tsx` exports LoadingState (status/polite), EmptyState (section/h2) and ErrorState (alert/optional retry). `FormFeedback.tsx` exports FieldError and FormError, including unmatched errors rendered as text. `CategorySelect.tsx` filters active matching types and keeps IDs as strings; `CategoryTypeSelect.tsx` is a native select | Feedback/select primitives exist, but cards, buttons, headers and field wrappers are repeated. Preserve existing exports and semantics; legacy and auth consumers must not change unintentionally. |
| Accounts | Three `pages/accounts/*Page.tsx` files: two-column card list; create/edit form; detail and inline deactivation confirmation. Signed exact opening balance on create, immutable later; owned inactive details/name/type edits supported | Presentation can change, but opening balance must not become “current balance”, and inactive accounts must not acquire restore/select actions. |
| Categories | Three `pages/categories/*Page.tsx` files: local type filter, two-column cards, neutral System/Custom labels, native create/type controls, rename and inline custom deactivation. System direct-edit URLs show read-only content | No category icons currently exist. Preserve system restrictions and immutable category type; do not replace text badges with color-only distinctions. |
| Transactions | Three `pages/transactions/*Page.tsx` files plus query helper: two-column cards; URL filters/sort/page/size; exact Page counts; create/full-replacement edit with active references; historical names; detail and explicit permanent deletion. Positive amounts currently use normal text, not income/expense color differentiation | Adopt a financial row hierarchy without changing query ownership, allowed sorting, precision, historical references, mutation sequencing or confirmation copy. |
| V1 overview | `pages/DashboardPage.tsx` reads legacy expense summary/recent expenses. `components/CategorySpendingChart.tsx` renders a Recharts donut/legend/tooltip with an eight-color palette; dashboard also has textual category amounts | This is a legacy chart, not a V2 dashboard. Its palette conflicts with the future Clarity chart direction; retain it in the isolated legacy area under the recommended scope, explicitly gated for later visual migration. |
| V1 expenses | `ExpensesPage.tsx`: page size five, local category/date-or-amount sort controls, cards. Create/Edit use numeric V1 inputs and Number conversions; detail uses native window.confirm, formatCurrency and formatDate | Preserve these screens, routes, native confirmation and numeric contracts. Do not route legacy data through V2 formatting/transport or replace it with transactions. |
| Public screens / brand | Landing/Login/Register retain blue styles; shared feedback is used by auth. `public/cointrail-mark.svg` is the existing blue brand asset; `public/icons.svg` contains social/documentation symbols, not finance/category icons | No category sprite or icon library can be assumed. Retain public pages and existing logo/favicon assets; do not reuse the purple documentation symbols as finance icons. |
| Tests | `App.test.tsx`, `Navbar.test.tsx`, guard/context/API tests, `pages/resources.test.tsx`, `pages/transactions/transactions.test.tsx`, CategorySelect and FormFeedback tests; V1 overview/list/create/edit/detail tests | Existing coverage includes route protection, /dashboard default, disclosure/Escape, heading focus, exact values, readonly categories, failures, confirmation focus, query preservation and session/stale-request isolation. There are no AppShell/PageHeader/Card/Button/FormField tests because those components do not exist yet. |
| Dependencies | React/React DOM 19, React Router 7, TypeScript 6, Vite 8, Tailwind 4 with Vite plugin, Axios, lossless-json, Recharts; Vitest 5, jsdom, RTL, user-event, ESLint. No form framework, icon library, dialog library, Storybook, browser test runner or theme manager is declared | Reuse current dependencies. Native controls, small SVGs and inline confirmation avoid new runtime libraries and tooling scope. |

Current repetition is concrete: blue primary/link classes, varying `rounded`/`rounded-lg`/`rounded-xl`, gray borders, local inputClass strings, different max widths, and repeated confirmation action markup. There is no enforced typography/spacing scale, financial row primitive, semantic money tone or reduced-motion policy beyond the logo's motion-safe hover. This is source inspection, not completed browser visual QA.

## Business and scope invariants

- [x] Preserve all V1 URLs, CRUD/filter/pagination/summary behavior, numeric contracts, chart data and `/dashboard` default. Retain visible Legacy Overview / Legacy Expenses destinations and the explanation that legacy records do not contribute to V2 reports.
- [x] Preserve V2 services, DTOs, financial helpers, exact decimal/Long strings, lossless numeric JSON, currency/date formatting, validation, ownership and session rules. A visual component accepts already formatted display text; it never parses or aggregates money.
- [x] Keep backend-authoritative date/type validation, failed-input retention, duplicate-submit protection, stale-request cancellation and full replacement transaction writes.
- [x] Preserve custom/system category restrictions, inactive reference history, immutable category type and creation-only opening balance. Icons convey presentation only, never eligibility or persisted metadata.
- [x] Distinguish account/category deactivation from permanent transaction deletion. Keep existing history/reserved-name/no-restore explanations and the conditional recurring occurrence warning; do not invent transaction origin fields.
- [x] Implement light theme only. Prepare semantic variables, but add no dark palette, switch, preference persistence or automatic dark-mode activation.
- [x] Add no backend/API/schema/migration changes, no edits to AGENTS.md or skills, no financial domain features, no extra fetching for icon resolution, and no generated metrics/demo data on user routes.
- [x] Keep this PR focused on the shell, small primitives and the nine delivered V2 page files. No wholesale V1/auth/landing redesign, dependency upgrades, routing retirement, generic CRUD engine, global state store or table/form framework.

## Clarity visual principles

1. **Financial clarity:** lead with a truthful page title and one primary action; use explicit amount/type/date/account/category labels. Preserve complete amounts and meaningful empty/error states. Density comes from aligned rows and hierarchy, not tiny typography.
2. **Calm surfaces:** white cards, off-white canvas, fine neutral borders, limited shadows. No gradients, rainbow badges, colored category backgrounds, decorative charts, hover lifts or celebratory animations.
3. **Intentional color:** indigo for primary actions, selected navigation and future chart/progress accents. Green for income amounts; red for expense amounts and destructive/error semantics. Account starting balances remain neutral signed values, not mislabeled income/expense.
4. **Monochrome categories:** every category icon uses the same charcoal stroke and grey container, regardless of type, system/custom status, selection, category name or domain. Selected navigation icons may be indigo; category data icons never are.
5. **Navigation continuity:** a labeled sidebar inspired by Linear's hierarchy; financial row readability inspired by Fold; restrained structure inspired by Stripe. These are user-approved design references, not copied assets, exact layouts or new integrations.
6. **Subtle glass:** an optional progressive enhancement for navigation/floating chrome only. Content, forms, metrics, financial rows and confirmations remain opaque. Clarity must remain complete without blur.

### Exact light-theme colors

These are proposed implementation values, not a claim that tokens already exist. CSS variable prefix is `--ct-`; all colors below are hexadecimal unless noted. Do not replace global `--color-blue-*`, `--color-gray-*` or `--font-sans` values.

| Token | Value | Use |
| --- | --- | --- |
| `--ct-canvas` | `#F7F8FA` | V2 application canvas |
| `--ct-surface` | `#FFFFFF` | Cards, fields, opaque navigation fallback |
| `--ct-surface-subtle` | `#F1F3F5` | Category icon tiles, neutral badges, inactive/disabled backgrounds |
| `--ct-surface-hover` | `#F5F6F8` | Secondary/ghost hover and row hover |
| `--ct-surface-selected` | `#EEF2FF` | Selected navigation background; never category icon fill |
| `--ct-text` | `#20242C` | Headings, body, neutral amounts |
| `--ct-text-secondary` | `#4B5563` | Descriptions/metadata |
| `--ct-text-muted` | `#626B78` | Hints, secondary labels; not low-contrast light grey |
| `--ct-icon` | `#343A46` | All category strokes, default navigation/control icons |
| `--ct-border` | `#E2E5EB` | Decorative card borders/dividers only |
| `--ct-border-control` | `#858E9D` | Essential input/button outlines when boundary identifies the control |
| `--ct-primary` | `#4F46E5` | Indigo primary fill, focus, selected navigation, future chart/progress |
| `--ct-primary-hover` | `#4338CA` | Primary hover |
| `--ct-primary-pressed` | `#3730A3` | Primary pressed; informational text |
| `--ct-on-primary` | `#FFFFFF` | Primary button text/icons |
| `--ct-income` | `#15803D` | Income amount text |
| `--ct-expense` / `--ct-danger` | `#B91C1C` | Expense text; danger action/error text |
| `--ct-danger-hover` | `#991B1B` | Danger hover |
| `--ct-danger-pressed` | `#7F1D1D` | Danger pressed |
| `--ct-danger-surface` | `#FEF2F2` | Error/confirmation emphasis, not category tiles |
| `--ct-success-surface` | `#F0FDF4` | Meaningful success feedback only |
| `--ct-warning` / `--ct-warning-surface` | `#92400E` / `#FFFBEB` | Actual warnings; no ornamental amber badges |
| `--ct-backdrop` | `rgb(32 36 44 / 0.32)` | Reserved for a later approved modal; not used by the inline disclosure/confirmation in this PR |

Reference contrast calculations performed during planning with the WCAG sRGB luminance formula: text/canvas **14.64:1**, muted/canvas **5.08:1**, white/primary **6.29:1**, primary/selected **5.62:1**, income/white **5.02:1**, expense/white **6.47:1**, control-border/white **3.31:1**, control-border/canvas **3.11:1**, category-icon/subtle **10.26:1**. These are static opaque pairs; verify actual rendered states and composited glass backgrounds during implementation. Decorative borders are intentionally lighter and cannot substitute for essential control/focus boundaries. Acceptance follows [WCAG 2.2 contrast guidance](https://www.w3.org/WAI/WCAG22/quickref/#contrast-minimum).

### Typography, spacing and geometry

Use `--ct-font-sans: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`. No downloaded font is required. Apply it only to Clarity navigation/content; preserve the legacy/public typography defaults. Tabular lining numerals apply to financial values/counts, not all prose. Do not substitute a monospaced display font or animate counters.

| Typography token / role | Exact size / line height / weight | Tracking |
| --- | --- | --- |
| `--ct-type-caption` | 12px / 16px / 500 | 0 |
| `--ct-type-meta` | 14px / 20px / 400 | 0 |
| `--ct-type-label` | 14px / 20px / 500 | 0 |
| `--ct-type-body` | 16px / 24px / 400 | 0 |
| `--ct-type-control` | 16px / 24px / 500 | 0 |
| `--ct-type-section` | 20px / 28px / 600 | -0.01em |
| `--ct-type-title` | 28px / 36px / 600 below 768px; 32px / 40px / 600 above | -0.02em |
| `--ct-type-metric` | 28px / 36px / 600; 32px / 40px / 600 where width permits | -0.02em |
| Financial row amount | 16px / 24px / 600 | 0; tabular numerals |

Implement font sizes/line heights as equivalent rem values at a normal 16px root; never set a reduced html font size. Captions are supplementary, not primary control labels; input text stays at least 16px. Heading semantics are independent of visual size.

Spacing tokens `--ct-space-1` through `--ct-space-12`: **4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48px**, expressed as equivalent rems. Standard field stack gap 20px; label-to-control/hint gap 8px; adjacent action gap 12px; page sections/card grids 24px. Page gutters: **16px mobile, 24px tablet, 32px desktop**; page vertical padding 24px mobile / 32px otherwise. Card padding 20px mobile / 24px otherwise. Financial row padding 16px mobile / 20px otherwise, with at least 12px between content groups.

Radii: `--ct-radius-control` **8px**, `--ct-radius-card` **12px**, `--ct-radius-floating` **16px**, `--ct-radius-pill` **9999px** for compact status labels only. Category tile radius **8px**, tile sizes **32px/40px**, icon **16px/20px** respectively. Control/action height minimum **44px**; primary form buttons 48px; icon buttons need a 44px hit area even with 20px glyphs.

Borders: **1px solid** border token. No stacked borders around every label. Shadows: `--ct-shadow-card: 0 1px 2px rgb(32 36 44 / 0.04)`; `--ct-shadow-floating: 0 4px 16px rgb(32 36 44 / 0.08)`; navigation separation uses a border, not a dark shadow. Static rows have no shadow. Avoid applying shadow, border and blur together to each content card.

### Interaction and motion tokens

- Focus: **2px solid `--ct-primary`, 3px outline offset**; use `:focus-visible`, never hide the outline. Fields retain an indigo boundary when focused. Error borders remain red while the separate focus ring stays visible. Scope overrides to Clarity navigation/content; retain the existing global focus rule for untouched surfaces.
- Selected navigation: selected background, indigo text/icon and 500 weight, plus `aria-current="page"`; color is not the only cue. Text links remain underlined with a 3px underline offset; hover uses primary-hover.
- Hover: neutral surface-hover for row/secondary/ghost actions. Pointer affordance only on interactive elements; static cards do not lift or pretend to be buttons. Pressed primary/danger uses the corresponding pressed token.
- Disabled: native disabled buttons/controls; subtle background, muted text, no hover, explanatory pending/read-only text when useful. Do not disable a link by styling alone, or make entire forms translucent. Pending action text remains specific: Saving / Deactivating / Deleting.
- `--ct-motion-fast` **120ms**, `--ct-motion-normal` **160ms**, easing **cubic-bezier(0.2, 0, 0, 1)**. Transition color/background/border/opacity only. No bounce, parallax, financial count animation, shimmer or continuous spinner requirement.
- Under `prefers-reduced-motion: reduce`, remove these transitions/animations and use static loading indicators. Focus, expanded state and feedback appear immediately. Smooth scrolling is not introduced.

### Glass surface rules and theme preparation

Default all surfaces to opaque white. Only the compact application topbar and its expanded navigation panel may opt into `--ct-glass-background: rgb(255 255 255 / 0.94)`, **blur(12px)**, 1px neutral border and floating shadow where appropriate. Desktop/tablet sidebar, row/card content, forms and confirmation panels remain opaque. No saturation amplification, colored haze, gradients or glass behind financial text.

Gate blur behind CSS `@supports` for backdrop-filter (and the prefixed property where needed); the baseline must already work without it. Force opaque surfaces and no blur in forced-colors, print, and reduced-transparency where supported. Do not depend on reduced-transparency media support for correctness. Blur support is progressive enhancement, as documented in [MDN backdrop-filter](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/backdrop-filter). Check worst-case scrolled/composited content manually; increase opacity to 1 rather than reducing text contrast. If blur causes mobile scrolling problems, use the opaque baseline.

Keep semantic `--ct-*` variables separate from their light values; map them to namespaced Tailwind utilities with top-level `@theme inline`, for example `--color-ct-surface: var(--ct-surface)` and `--color-ct-primary: var(--ct-primary)`. [Tailwind's theme documentation](https://tailwindcss.com/docs/theme#referencing-other-variables) supports this CSS-first mapping. Do not redefine default breakpoints or global typography. Provide light values only; no `.dark`, prefers-color-scheme dark rules, theme context or toggle. Components should refer to roles, so a later approved dark palette can change variables without changing domain code.

## Responsive application layout

### Ownership and routing integration

Propose `components/AppShell.tsx` for protected navigation and layout; it accepts children, not a service/data dependency. Keep `routes/AppLayout.tsx` as the Outlet/legacy notice boundary. Refactor the existing SiteLayout composition in App.tsx so public routes still use the current public Navbar, while protected routes use AppShell. Keep the current heading-focus/skip-link logic in one shared SiteLayout path (with an application variant), rather than adding a competing effect in AppShell or PageHeader.

ProtectedRoute must still surround the protected layout and retain its sessionVersion-keyed Outlet. A public login/registration page must not render protected sidebar controls. Each rendered page retains one main landmark and one h1; the shell content target remains a focusable `#main-content` container around the page, not another nested main. Make page headings programmatically focusable for the existing route-focus behavior.

AppShell owns the navigation column/topbar and available content width. V2 page containers own content gutters/max widths; remove their old duplicate outer padding when adopting the new pattern. AppLayout applies a Clarity content wrapper only to delivered V2 pages; legacy content retains a white, unmodified page-body wrapper and the existing notice. Do not style legacy/public descendants through broad shell CSS selectors.

| Viewport | Layout proposal | Content behavior |
| --- | --- | --- |
| Desktop: at least 1024px (`lg`) | **240px labeled sidebar**, sticky at top, height 100dvh with 100vh fallback, overflow-y auto; opaque neutral/white surface with right border. Main column has min-width:0; no duplicate horizontal Navbar | V2 list/detail-wide max 1200px; forms/detail-narrow max 560px; 32px gutters. Sidebar remains scrollable at short heights. |
| Tablet: 768–1023px (`md` to `lg`) | **192px labeled compact sidebar**, same destinations, no icon-only rail or hover-only tooltip dependency | 24px gutters; filter grids at most two columns; page actions wrap. At 768px, narrow main area is expected—rows stack amounts below metadata when necessary. |
| Mobile / reflow: below 768px | **64px compact topbar** with home mark/title and a 44px menu button. Navigation opens inline below the header, pushes content down and uses the same grouped links; no modal overlay/bottom tabs | 16px gutters; single-column forms/cards/rows. Expanded navigation has a bounded height with internal scroll so its final action remains reachable; no body scroll lock. |

Keep desktop sidebar and mobile menu based on one navigation tree where practical; responsive visibility must not leave duplicate accessible destinations or hidden focusable controls. Navigation ordering is stable across sizes. On breakpoint change, reset disclosure state safely and avoid focus remaining in hidden controls. Sticky mobile header is allowed only with scroll-padding/scroll-margin sufficient to keep focused fields/headings visible; use `min-height`, not clipped fixed viewport content.

Navigation groups: **V2** with Transactions (`/app/transactions`), Accounts (`/app/accounts`), Categories (`/app/categories`); **Legacy Expenses** with Legacy Overview (`/dashboard`), Legacy Expenses (`/expenses`); separate Logout action. Keep exact accessible link names used by existing tests. Highlight a domain for its create/detail/edit descendants; avoid prefix collisions. No disabled “coming soon” links to Dashboard V2, Budgets, Recurring or Analytics. Home still links to `/`; `/app` still resolves to `/dashboard`.

Accessibility: nav landmark label “Primary navigation”; real links/NavLink for destinations; real button for menu/logout. Menu preserves “Toggle navigation menu”, aria-expanded and aria-controls with an existing target. Escape closes it and returns focus to the trigger; clicking a destination closes it; browser navigation also closes it. Opening this **non-modal inline disclosure** does not trap focus; Tab follows normal DOM order. Do not add role=menu/menuitem or a modal dialog role. Skip link reaches main content before navigation tabbing; logout/session expiration removes protected content immediately.

## Reusable component specifications

These are **proposed new components**, except the explicitly existing feedback/select components. Create small presentational components in the inspected `components/` and `components/ui/` convention; do not create a schema-driven rendering layer. APIs below describe responsibilities, not an obligation to add every conceivable prop.

| Component | Proposed contract and rendering | States / constraints |
| --- | --- | --- |
| AppShell | Protected children, existing Navbar in application appearance, responsive sidebar/topbar, canvas and content column | No fetching/auth duplication. All chrome accessibility and responsive behavior above; no persistent layout preference. |
| PageHeader | `title`, optional `description`, optional back-link node and action nodes. Render one h1; description below; action area wraps/aligns to title on wide screens | Preserve actual route title and query-aware links supplied by page. Do not move focus or manufacture breadcrumbs. |
| SurfaceCard | Children, optional section label/heading association, bounded padding choice (normal/compact/none) | Default opaque white/card border/radius/shadow. Render div by default; section only when meaningfully labeled. Never imply clicking on a static card. |
| MetricCard | `label`, **formatted value string**, optional explanatory text, tone neutral/income/expense | Small tested future-reuse primitive only; no dashboard page, remote data, trends, percentage calculation, synthetic totals or demo widgets. Full value remains visible. No chart/sparkline API. |
| Button / ButtonLink | Primary, secondary, ghost, danger; optional pending/disabled; bounded normal/icon size | Default native button type=button; submit explicit. Primary indigo; secondary white/control border; ghost neutral; danger red only for destructive actions. Pending keeps an accessible specific label and blocks repeat submits. ButtonLink wraps Router Link separately; no generic polymorphic `as` engine and no disabled anchors. |
| FormField | Stable id, label, hint and field error; wraps native control using a narrow render callback supplying id/aria-invalid/describedby | Does not own value, onChange, validation or submitting. Only reference hint/error IDs that exist; preserve supplied aria-describedby tokens. Native input/select/textarea, no cloned mystery children or custom dropdown. Label/hint/error remain visible and associated. |
| Existing FieldError / FormError | Retain error boundary and unmatched-key text summary; add explicit Clarity appearance when needed | Preserve default legacy/auth styling. Render strings as text, never server HTML. No new error normalization layer. |
| Existing EmptyState | Title/body with optional page-supplied action; neutral icon and whitespace in a surface | Distinguish no data vs no matching filters using caller copy. No fake illustration, sample data or future-page CTA. |
| Existing LoadingState | Preserve role=status/polite and meaningful text; optional small static visual marker | No financial placeholder values. Avoid repeated announcements on every render; aria-busy belongs on the refreshing region, with filters still usable. Skeleton animation is unnecessary. |
| Existing ErrorState | Alert, safe message, optional explicit read retry | Clarity border/neutral layout with red message/icon emphasis. Failed mutations stay on page and retain inputs; never replay writes through a retry abstraction. |
| ConfirmationPanel | Inline titled region, explanation, supplied keep/confirm labels, pending/error presentation and callbacks; initial focus on keep, restored focus to trigger on cancel | **Not a modal**: no focus trap or inert background. Escape cancels when idle and restores focus. No outside-click dismissal. Page owns action/confirmation state and mutation. Preserve current messages and refetch/navigation outcomes; no submit until explicit confirm. |
| FinancialRow | Presentational title link, category icon/label, page-supplied metadata, formatted amount and type label/tone; optional trailing action slot | Semantic list item remains page-owned. No DTO fetching, row-owned sorting, money parsing or HTML table abstraction. Links have meaningful names; nested buttons/links never sit inside one enclosing link. |
| Icon / CategoryIcon | Small local SVG set for menu/close, account, category tag, transaction arrows, legacy overview/receipt, status/check/error. CategoryIcon enforces neutral tile/stroke | 24-unit viewBox, rounded line caps/joins, 1.75-unit stroke, currentColor, no emoji or external network asset. Decorative beside text: aria-hidden/focusable=false. Icon-only actions need explicit accessible labels. |

Existing feedback defaults are used by legacy/auth screens and guards. Prefer a small explicit `appearance="clarity"` opt-in with legacy default for those exports, rather than changing every consumer or using global descendant overrides. New V2 primitives opt in naturally. CategorySelect/CategoryTypeSelect keep native options, filters, Long string values and labels while adopting the shared field/control presentation; native option rendering does not require embedded SVGs.

ConfirmationPanel extraction must preserve the current safe-focus behavior, failed mutation visibility and mounted/stale-session guards. Successful account deactivation refetches owned inactive details; category deactivation returns to its active list; transaction deletion returns to the filtered list with a notice. The primitive must not generalize those outcomes into one CRUD behavior. Legacy ExpenseDetailsPage's native window.confirm remains unchanged.

### Financial lists and page adoption

- Transactions become one aligned white row/list surface instead of independent two-column transaction cards. On wide content widths: icon/title/type and metadata on the left, date/account/category in readable secondary positions, amount at the right. At narrow widths: title/metadata first and a full-width amount line; keep complete grouped currency strings visible, including the 17.2 maximum.
- Amount color follows transaction type, with the explicit INCOME/EXPENSE label. Backend amounts are positive: **do not add a minus sign to expense values or a plus sign to income values in this PR**. Formatting/copying still yields the existing exact amount representation. Color is presentation, not a new numeric contract.
- Category list/detail uses the monochrome tile beside actual category names and neutral System/Custom/Read-only labels; retain EXPENSE/INCOME text. Account cards keep account type, active/inactive explanations and accurately labeled signed Opening balance. Do not add available/current balance cards.
- Transaction filters remain native controls, visible during loading/error, with all current query fields and four sorting fields. Apply/Clear, previous/next page and size controls use button/field patterns; don't add search, grouping, bulk selection, exports or infinite scrolling.
- Forms/details adopt PageHeader, SurfaceCard, FormField and Button; preserve values, required/read-only text, field errors, refresh/onboarding actions and all supported edits. Align action groups and collapse them vertically on small widths. There is no form model or new server validation policy.

## Unified monochrome category icon policy

The current CategoryResponse exposes id/name/type/system/active/timestamps, **no icon key**. TransactionResponse contains categoryId/categoryName, **no system flag or icon metadata**, and historic references may be absent from active category lists. Therefore the foundation uses **one consistent category-tag glyph for every category**, system/custom, Expense/Income and active/historical. This is deliberate: no keyword guessing, per-user ID mapping, name hashes, inferred merchant icons or extra category detail fetches.

CategoryIcon uses the same 32/40px neutral tile, charcoal 16/20px stroke, border/radius and decorative semantics in Categories and Transactions. Future Budget and Spending by Category implementations must import it rather than choose colors independently. Neither selection nor over-budget status recolors category icons. Type/system status is text beside the icon. Custom, Unicode and renamed category names work without registry changes.

Future chart convention: **indigo data bars/lines/progress, neutral category icons/labels**; use labels/table equivalents rather than a per-category rainbow donut. Over-budget information may use red text with an explicit label while its icon stays neutral and its progress accent stays indigo. This is a specification for future domain phases; no budget/progress/chart component or V2 chart screen is added here.

The current V1 CategorySpendingChart's rainbow palette is an explicit legacy exception under the recommended preservation scope, not the standard for Clarity. Do not copy it to V2. If the user chooses legacy visual adoption, amend scope/files/tests before implementation to replace that palette with a clearly labeled accessible indigo/neutral presentation while retaining exact V1 data/formatting/tooltip behavior. Semantic per-category glyph selection or persisted custom icon selection likewise needs a later approved design/data decision; the foundation's uniform tag requires no backend contract change.

## Implementation sequence — one focused PR after approval

### Phase A — establish baseline and tokens

- [x] Recheck develop, clean workspace, current Plan 006/007 and relevant skills; prepare a feature branch such as `feature/clarity-design-foundation` after implementation approval.
- [ ] Run existing frontend tests/build/lint and capture representative V2/V1/public screenshots before changes. Record existing warnings separately.
- [x] Add namespaced light tokens, CSS-first mappings, scoped content/control/focus rules, reduced-motion/forced-colors/opaque-glass fallbacks to index.css. Keep default Tailwind palette/global legacy styles intact.
- [x] Verify token pairs and actual control states; introduce no dark-mode behavior, font download or new dependency.

### Phase B — small primitives and protected shell

- [x] Build PageHeader, SurfaceCard, Button/ButtonLink, FormField, Icon/CategoryIcon and FinancialRow with bounded responsibilities and focused behavioral tests. Add the small MetricCard specification as a tested presentational primitive; no live metrics page.
- [x] Add opt-in Clarity presentation to existing States/FormFeedback without changing legacy/auth defaults; extract the inline ConfirmationPanel behavior.
- [x] Build AppShell and refactor App.tsx/SiteLayout, Navbar and AppLayout composition. Retain the session remount boundary, one skip target/focus owner, all routes and public navigation.
- [x] Implement labeled sidebar/tablet layout and mobile inline disclosure; test selection, keyboard close/focus, route close, resize cleanup, logout and guard isolation before page adoption.

### Phase C — adopt delivered V2 screens

- [x] Accounts list/create/edit/detail: consistent headers/cards/buttons/fields and deactivation panel, with exact starting balance/immutable/inactive behavior unchanged.
- [x] Categories list/create/rename/detail: shared controls/neutral icons/badges, readonly system and immutable type unchanged.
- [x] Transactions list/create/edit/detail: financial row styling and amount tones, consistent filter/pagination/fields, unavailable reference explanations and permanent-delete panel. Preserve every query string and authoritative read after mutation.
- [x] Remove only styling/markup duplication replaced by these primitives. Leave service hooks, models, API/session boundaries and V1 page bodies untouched; no product features or speculative routes.

### Phase D — regression and browser acceptance

- [x] Run targeted shared component/navigation/domain suites, then full `npm run test:run`, `npm run build`, `npm run lint` (Windows: npm.cmd).
- [ ] Execute the manual browser matrix below on real browsers; record viewports, states, evidence and any gaps. Do not call jsdom assertions responsive/browser QA.
- [x] Smoke-test delivered V2 and legacy flows against the existing local/disposable API with real sessions. Confirm native form/payload/precision behavior was not altered; do not modify a shared/production database for QA.
- [x] Review the full diff for scope, API/formatter/route invariants, CSS leakage, dependency changes and untouched backend/instruction files. Update only implemented/verified checklist items and evidence in this plan.

### Phase E — delivery gate

- [x] Follow feature-delivery after explicit implementation approval; it currently requires `mvn clean verify` even with unchanged backend. Record result/warnings without modifying backend tests just for a visual change.
- [x] Commit/push/create one concise PR targeting develop only when separately authorized and all required verification succeeds. Do not merge. Delivery is explicitly authorized by the implementation request; do not merge.

## Expected files

The planning task initially created only this document. The approved implementation adds the primitives and modifies the bounded files below. Purely presentational component tests are consolidated in `components/ui/foundation.test.tsx`, as permitted below.

### Existing files to modify after approval

| Exact path relative to frontend | Expected change |
| --- | --- |
| `src/index.css` | Namespaced light tokens/utilities, scoped foundations, focus/motion/forced-colors/glass rules |
| `src/App.tsx` | Public/protected shell composition, retain routes and shared skip/focus ownership |
| `src/components/Navbar.tsx` | Application navigation appearance/layout, groups and responsive disclosure; preserve public behavior |
| `src/routes/AppLayout.tsx` | V2/legacy presentation boundary and existing legacy notice, no routing/session logic change |
| `src/components/ui/States.tsx` | Opt-in Clarity feedback presentation; compatible exports |
| `src/components/ui/FormFeedback.tsx` | Compatible opt-in field/form error presentation |
| `src/components/CategorySelect.tsx` | Shared native field/control presentation, existing eligibility/ID contract |
| `src/components/CategoryTypeSelect.tsx` | Shared type-filter presentation, existing local filter contract |
| `src/pages/accounts/AccountsPage.tsx` | Header, list surfaces/actions |
| `src/pages/accounts/AccountFormPage.tsx` | Shared form presentation; existing create/update semantics |
| `src/pages/accounts/AccountDetailsPage.tsx` | Detail surface, confirmation extraction |
| `src/pages/categories/CategoriesPage.tsx` | Header, monochrome category list, neutral badges/filter |
| `src/pages/categories/CategoryFormPage.tsx` | Shared create/rename fields; readonly/immutable behavior |
| `src/pages/categories/CategoryDetailsPage.tsx` | Monochrome detail and custom confirmation |
| `src/pages/transactions/TransactionsPage.tsx` | Rows/amount tones, filter/pagination surfaces |
| `src/pages/transactions/TransactionFormPage.tsx` | Shared form presentation, historical reference instructions |
| `src/pages/transactions/TransactionDetailsPage.tsx` | Financial hierarchy and confirmation panel |
| `src/App.test.tsx` | Shell/route/focus/default/session regressions |
| `src/components/Navbar.test.tsx` | Grouped app/public navigation and disclosure regressions |
| `src/components/ui/FormFeedback.test.tsx` | Opt-in/default/error association compatibility |
| `src/components/CategorySelect.test.tsx` | Native matching selection, exact IDs and field association |
| `src/pages/resources.test.tsx` | Existing lifecycle/readonly/inactive behavior with new markup |
| `src/pages/transactions/transactions.test.tsx` | Existing query/mutation/history/error/session behavior, row tones/labels |
| `README.md` | Design conventions, scope, manual QA evidence and future reuse rules |
| `.agents/plans/007-clarity-design-foundation.md` (repository root) | Approved decisions, implementation checkboxes and verification evidence |

### Proposed new frontend files

- `src/components/AppShell.tsx`, `src/components/AppShell.test.tsx`.
- `src/components/ui/PageHeader.tsx`, `src/components/ui/PageHeader.test.tsx`.
- `src/components/ui/SurfaceCard.tsx`, `src/components/ui/SurfaceCard.test.tsx`.
- `src/components/ui/MetricCard.tsx`, `src/components/ui/MetricCard.test.tsx`.
- `src/components/ui/Button.tsx` (Button and ButtonLink exports), `src/components/ui/Button.test.tsx`.
- `src/components/ui/FormField.tsx`, `src/components/ui/FormField.test.tsx`.
- `src/components/ui/ConfirmationPanel.tsx`, `src/components/ui/ConfirmationPanel.test.tsx`.
- `src/components/ui/FinancialRow.tsx`, `src/components/ui/FinancialRow.test.tsx`.
- `src/components/ui/Icon.tsx`, `src/components/CategoryIcon.tsx`, `src/components/CategoryIcon.test.tsx`.
- `src/components/ui/States.test.tsx` for existing feedback semantics/appearance compatibility.

Use colocated suites only where the component has meaningful semantics/state; purely visual card/header cases may be covered in a combined foundation suite instead of shallow duplicate tests. Do not introduce Storybook or a publicly routed component gallery to justify unused primitives.

**Explicitly unchanged:** `src/pages/DashboardPage.tsx`, all V1 expense page/test behavior contracts, `src/components/CategorySpendingChart.tsx`, Landing/Login/Register, API/services/types/formatters/query helpers/session/guards, main.tsx, Vite/Tailwind plugin setup, package.json/lockfile, public assets, backend/migrations/AGENTS.md/skills/Plan 006. Existing V1 tests still run even if their files need no edits. Investigate rather than broaden scope if a styling change unexpectedly requires transport/model edits. A user-approved legacy visual scope expansion changes this file list before implementation.

## Accessibility and responsive acceptance criteria

- [x] Target WCAG 2.2 AA: normal text at least 4.5:1, large text at least 3:1, essential control/icon/focus boundaries at least 3:1. Income/expense, selected nav, system/read-only and error states have text/semantic cues beyond color. [WCAG 2.2 reference](https://www.w3.org/WAI/WCAG22/quickref/).
- [x] Main actions/control targets are at least 44×44 CSS px (project usability requirement); no touch-only interaction, hover-only essential content or keyboard trap. Focus remains visible and unobscured by sticky navigation.
- [x] Each route has one page h1/main, one accessible navigation tree, a working skip link and current-page semantics. Protected deep links/login return preserve pathname/search; ordinary login and `/app` still resolve to `/dashboard`.
- [x] All fields use visible labels, correctly combined hint/error associations, native selection/validation affordances, preserved inputs on failed requests, and specific pending labels. Read-only restrictions are stated, not merely greyed out.
- [x] Inline confirmation announces title/explanation, focuses the safe keep action, cancels with Escape when idle, restores trigger focus, retains failure feedback and never submits by opening/closing it. Successful navigation/refetch maintains useful page focus.
- [ ] Layout works at 320px without document horizontal scrolling. At 200% zoom and a 320 CSS px reflow viewport, menus/filters/actions remain reachable; text-spacing overrides do not clip labels. Break money into a separate row rather than ellipsizing or shrinking it to unreadability.
- [ ] Exercise 100-character account/category names, 500-character descriptions, absent descriptions, maximum positive/negative opening balances, 17.2 transaction amount and 19-digit IDs. Copyable display values remain complete; DOM/service values remain exact strings.
- [x] Glass disabled/unsupported, reduced motion and forced-colors preserve affordances; no meaning depends on shadows/translucency. Neutral category icons remain consistent in normal mode; forced-colors may use system colors for access.
- [x] Existing V1 actions/values/notices/chart remain available in the legacy area. No inaccessible placeholder links or fabricated metrics appear in navigation or content.

## Automated test strategy

Use existing Vitest/jsdom/RTL/user-event and controlled Axios adapters. Test roles, accessible names/associations, exact text/value payloads and user behavior rather than snapshots of every Tailwind class. Keep existing service precision/auth/ownership and V1 regression tests unchanged wherever possible.

1. **Primitives:** buttons do not submit accidentally; disabled/pending prevent actions; ButtonLink preserves href/query. FormField combines descriptions and errors only when rendered. Feedback retains alert/status/heading roles, retry behavior and safe string rendering, including legacy default appearance. PageHeader has one meaningful h1; MetricCard/FinancialRow render the supplied complete formatted value without conversion or fabricated trends. Icons are decorative beside labels and unknown/custom category names do not demand lookup state.
2. **Shell/navigation:** public vs protected destinations, grouped exact routes, descendant selection/aria-current, skip target, heading focus, one accessible navigation tree, open/close/Escape focus, navigation/resize cleanup, logout and remount on session change. Mock matchMedia deliberately where resize logic exists; jsdom does not prove CSS breakpoints or layout.
3. **Confirmation:** opening does not mutate; keep/Escape restores focus; explicit confirm only once; pending behavior; operation-specific copy; failed delete/deactivate retains the panel and the record. Test the actual domain integration as well as the primitive.
4. **Domain adoption:** preserve existing Accounts/Categories/Transactions assertions for full payloads, input retention, exact money/IDs, system direct-edit restrictions, inactive accounts/history/replacements, nullable description, filtered pagination/sorting/navigation and abandoned reads/saves/session replacements. Add explicit Income/Expense labels and complete amount display; avoid assertions that infer financial signs from CSS color.
5. **V1/auth regression:** all existing overview/expense/create/edit/detail, formatter, auth/guard/context/API tests. Keep native window.confirm assertions, page-size/sort behavior and `/dashboard` default. Do not rewrite fixtures to claim that legacy expenses are V2 transactions.
6. **Verification:** targeted suites then required full tests/build/lint. Use contrast calculations and browser inspection for rendered tokens/hover/selection; do not claim CSS contrast/glass/focus visibility from jsdom alone. No new Playwright/axe/visual snapshot dependency in this milestone; browser automation can be approved separately.

## Manual browser QA checklist and evidence

Use a local/dev or disposable backend and test-owned data. Record browser/version, viewport/zoom, scenario, expected/actual result and screenshot or notes per scenario; do not include credentials/tokens or unredacted financial data in evidence.

| Matrix | Checks |
| --- | --- |
| Desktop Chrome/Edge + Firefox; Safari where available | 1280×800 and 1440×900: sidebar, page widths, row alignment, hover/focus, opaque/glass fallback, all delivered routes |
| Tablet | 768×1024, 820×1180 and 1023/1024px boundary: compact sidebar, wrapping filters/actions, readable full amounts, navigation scroll at short heights |
| Mobile Chrome + Safari/iOS where available | 320×568, 375×812, 390×844, 767/768px boundary; portrait/landscape, expanded menu, long strings, safe browser chrome/keyboard behavior and 16px native inputs |
| Accessibility preferences | Keyboard-only Tab/Shift+Tab/Enter/Space/Escape; 200% zoom; 320 CSS px reflow; reduced motion; forced-colors/high contrast; disable backdrop-filter; screen-reader smoke test with NVDA/Firefox or VoiceOver/Safari |

- [ ] Navigate V2 and legacy routes directly, refresh deep links, login return with filters, Logout, expired session and cross-tab session replacement. Check page-heading focus and absence of old-owner content.
- [ ] Create/edit both transaction types with 0.01 and maximum amount; verify exact displayed/retained values and authoritative errors without rounding. Exercise filters, all sorting choices, custom page size, empty results and back/edit/cancel preservation.
- [ ] Exercise active/inactive accounts, system/custom categories, unavailable historical references, initial load failure, retry, failed write, and long/null descriptions. Confirm all actions remain keyboard reachable.
- [ ] Keep/confirm deactivation and permanent deletion; verify distinct copy, focus restoration, duplicate-submit prevention, error retention and refreshed destinations.
- [x] Inspect all category icon tiles for the same neutral background/charcoal stroke, with Income green/Expense red limited to amount meaning. Verify no selection changes the category tile color.
- [ ] Smoke-test V1 overview/category chart, list/category/sort/page controls, create/edit/native-confirm delete, public login/register and original default. Compare legacy page-body screenshots for unintended token leakage.
- [ ] Inspect contrast on actual composited surfaces; scroll under sticky chrome and focus lower inputs to ensure they are not obscured. Check no clipped full monetary values, nav items or vertical action groups.

If a listed browser/device is unavailable, record the gap explicitly; do not replace the missing manual result with a jsdom test claim. Approval can decide whether that gap blocks release. This planning task does not claim any manual QA has been run.

## Risks, tradeoffs and approval decisions

| Decision / risk | Proposed resolution | Approval boundary |
| --- | --- | --- |
| Legacy visual scope and existing rainbow chart | Default to shared Clarity app chrome + delivered V2 bodies; isolate original V1 bodies/chart. Its palette is a documented legacy exception, not a pattern to reuse | User may choose full legacy visual adoption before implementation. Amend exact files/test checklist then; do not silently redesign the legacy chart to resolve the conflict. |
| New shared component abstraction cost | Small presentational primitives and bounded props; preserve default feedback appearance; future MetricCard is explicitly requested, but no demo metrics/page | Approve this component inventory with the plan. Adding a generic framework, icon package, dialog package or component gallery is outside the proposal. |
| Labeled tablet sidebar consumes width | Use 192px at md, row stacking and mobile disclosure below md; no icon-only rail or tooltip machinery | Review during real browser QA; minor spacing/breakpoint tuning preserving behavior is routine. A different navigation model or persistent preferences requires revising the plan. |
| Uniform tag icon vs semantic category recognition | One neutral tag avoids guesses, works for arbitrary custom/inactive names and is stable across all future domains | Category-specific glyph selection/custom icon metadata needs a separately approved rule; backend changes are not authorized. No approval needed to keep all category colors neutral. |
| Existing blue brand vs indigo UI | Preserve current logo/favicon asset; app action/selection styles become indigo and text hierarchy becomes neutral | Logo/public brand asset redesign or public/auth page restyling is not included. |
| Blur compatibility/performance/contrast | Opaque baseline, supports checks and accessible overrides; no content blur | Disable blur if it fails acceptance rather than adding a browser compatibility library. |
| Focus and state regression from layout extraction | One existing route-focus owner, native inline disclosure, protected session remount boundary and domain-held mutation state | A modal drawer/dialog would add focus trapping/inert/background/scroll behavior and needs an updated, tested design proposal. |
| Precision regressions from “smart” financial components | Pass exact formatted strings; do not alter transport/formatters or add signs/totals | Monetary/backend contract changes require explicit approval and are outside this milestone. |
| Dark-mode preparation grows into implementation | Semantic variables and light values only | Dark values, toggle/persistence and full dark QA require a later approved milestone. |
| Verification scope / inherited issues | Keep baseline warnings distinct; existing Plan 006 records >500kB build warning, unchanged dependency advisories and Surefire shutdown warning | No unrelated dependency/build/backend cleanup. Browser runner/CI/deployment additions require approval; feature-delivery verification still applies after implementation approval. |

Unless legacy visual scope is expanded during review, the narrower recommendation above stands, with the chart exception clearly recorded. Approval of this document authorizes only its chosen scope; it does not change the authenticated landing route, approve later Plan 006 domains, or authorize merging/deployment. Material discoveries affecting APIs, security, finances or scope require stopping dependent implementation and requesting approval.

## Planning verification and next step

Source, routes, styles, dependency inventory and relevant tests were inspected; PR #20 merge metadata was checked; proposed color contrast pairs were calculated; official Tailwind/WCAG/CSS references were consulted. The source review supports this plan, not a claim of a completed design implementation.

Plan 006 records the prior Phase 2 verification of **23 frontend suites / 258 tests**, frontend build/lint, **529 backend tests**, and a disposable HTTP contract check. These are historical results for that delivered feature, **not tests rerun for this planning-only change**. No npm/Maven/build/browser run or new runtime dependency is needed merely to create this document.

The subsequent implementation request approves the narrower legacy scope: shared Clarity application chrome and delivered V2 bodies. Legacy page bodies/chart, public/auth screens, financial contracts and the default route are preserved. Checkboxes reflect actual implementation and verification; partially exercised manual checks remain open with their gaps recorded below.

## Implementation and verification evidence - 2026-10-09

### Delivered scope

Implementation was explicitly authorized by the user's subsequent request. `feature/clarity-design-foundation` was already checked out at the merged PR #20 commit `ab1dbcd07aedf849c8112d28337fee5a3b4d860f`; fetching origin confirmed the latest develop base before edits. The only initial untracked file was this previously prepared plan. No unrelated user changes were discarded.

- Added the exact light Clarity tokens and CSS-first Tailwind mappings, scoped typography/control/focus rules, responsive spacing, neutral surfaces, financial tones, reduced-motion and opaque/forced-colors fallbacks. No dark theme, font download or dependency change.
- Added AppShell, PageHeader, SurfaceCard, MetricCard, Button/ButtonLink, FormField, FinancialRow, ConfirmationPanel, Icon and CategoryIcon. Visual primitive tests are consolidated in `components/ui/foundation.test.tsx`; AppShell has its own suite. MetricCard remains an unrouted presentational primitive.
- Protected routes share the 240px desktop / 192px tablet sidebar and one inline mobile disclosure. Public navigation retains its classic appearance. Route focus, skip target, session remounts and all existing paths/defaults remain intact. Real-session Logout regressions verify the original public landing destination: resolving the synchronous session/guard update before navigating prevents a guard redirect from overriding it.
- Applied the primitives to the nine V2 page files. Lists, fields, feedback and destructive confirmations share the foundation; income/expense amounts have their respective tones without invented signs. Account opening balances remain exact neutral signed starting amounts. All categories use the same neutral tag because no reliable icon mapping exists.
- Confirmation focuses its safe action immediately, avoiding a delayed focus change during a subsequent click. Route-heading focus does not override a field/confirmation control already focused in the newly mounted page. Account deactivation restores heading focus while retaining its authoritative inactive-detail refetch.
- Kept V1 page bodies/chart, public/auth bodies, financial transport, services, types, query helpers, session/guards, dependencies, backend, migrations, AGENTS.md, skills and Plan 006 unchanged. README documents reuse and the legacy chart exception. No unavailable financial domains or generated metadata were added.

### Automated verification

| Verification | Result |
| --- | --- |
| Baseline frontend before production edits | `npm.cmd run test:run`: 23 suites / 258 passed; build and lint passed. Baseline JS chunk 727.73 kB; existing >500 kB warning recorded. Pre-change browser screenshots were not captured; that combined baseline checkbox remains partially open. |
| Targeted component/navigation/domain suites | Passed during adoption; existing contracts, system/inactive restrictions, failed-input retention, confirmation outcomes, query preservation and stale/session regressions retained. |
| Final standard frontend tests | `npm.cmd run test:run`: **25 suites / 285 tests passed**, no failures or skipped tests, 42.82 seconds. Added 27 focused cases. A full two-worker run also passed before the final focus case was added. |
| Final frontend build | `npm.cmd run build`: **passed**; CSS 31.95 kB / 7.44 kB gzip, JS 730.14 kB / 218.20 kB gzip. The inherited >500 kB chunk warning remains; no unrelated bundle/dependency cleanup. |
| Final frontend lint | `npm.cmd run lint`: **passed**. |
| Required backend | `mvn.cmd clean verify`: **BUILD SUCCESS**, **529 tests**, zero failures/errors/skips, 9:58. Backend source/tests were unchanged. The initial clean failure was a leftover Phase 2 disposable API holding the JAR; that specific process was stopped before the successful run. Java/Jansi/Unsafe toolchain warnings remain. |
| Final diff review | Complete tracked/new file review and `git diff --check` passed. A comparison verified that all six V2 asynchronous submit/confirmation handlers retain their original business operations; account deactivation adds only focus restoration. No API/formatter/dependency/backend/instruction changes. |

The expanded shell made the first full transaction-create journey occasionally exceed Vitest's default five-second deadline under parallel jsdom load. Only that Expense/Income journey now has a bounded ten-second deadline; every payload, exact-value, category-matching and query/navigation assertion remains. No global timeout/worker setting, assertion removal, disabled test or new runner was introduced. Both discovered interaction regressions (delayed focus and protected Logout navigation) were fixed and covered before delivery.

### Browser and real-API evidence

Used installed **headless Chrome 155.0.8059.39** through its debugging protocol, the existing Vite dev server, and an isolated PostgreSQL 17 / unmodified Spring API on port 18081. This uses existing local tooling, not a new project browser dependency or CI runner. Disposable sequence fixtures generated exact 19-digit IDs above Number.MAX_SAFE_INTEGER; names were 100 characters and descriptions approached the 500-character limit. Only test-owned data was created; the API/database were removed after the successful run.

| Scenario | Actual result / evidence |
| --- | --- |
| All 12 delivered V2 routes: list/create/detail/edit for each domain | Passed at **320x568, 375x812, 390x844, 767x800, 768x1024, 820x1180, 1023x800, 1024x800, 1280x800, 1440x900**. DOM checks found no document horizontal overflow, one main/h1/navigation, no dangling described-by IDs, and the expected 192/240px sidebar and mobile toggle breakpoints. |
| Visual stress cases | Full positive/negative maximum monetary values and Long route/select IDs remained visible/exact; Income/Expense amount RGB values matched the tokens. Category icons stayed neutral. Representative mobile/desktop screenshots were visually inspected. CSS establishes 44px action targets and 48px/16px native form controls. |
| Login / navigation / confirmation | Real browser Login returned to the filtered transaction deep link. Mobile disclosure and deletion confirmation passed Escape/safe-focus/trigger-focus checks. |
| Native financial write / mutation | Created Income through the actual controlled native form with amount 99999999999999999.99 and 19-digit account/category IDs; an authoritative API read confirmed exact values. Explicit permanent deletion returned to the filtered list. Account deactivation refetched inactive details; edit required an active replacement for the unavailable historical account. |
| Accessibility preferences | Reduced-motion computed transitions were zero; forced-colors removed blur; an explicitly opaque fallback and text-spacing overrides preserved 320 CSS-pixel reflow without horizontal scrolling. |
| Legacy / public / authentication | Real API-backed dashboard and expense list/create/detail/edit routes loaded. Legacy body wrapper remained isolated. Logout removed the token and reached the public landing page; public Login and Register screens were then captured. No V1 contracts/page bodies changed. |
| Local evidence | Temporary `cointrail-clarity-qa/results.json` and PNGs in the Windows temp directory record browser/version, matrix and scenario results. Images include `transactions-320.png`, `transactions-1280.png`, `mobile-menu.png`, `delete-confirmation-320.png`, `forced-colors.png`, `text-spacing-reflow.png` and public/legacy screens. These local artifacts are not packaged as application assets or committed credentials. |

This is real rendered Chromium QA plus screenshot inspection, not a claim that jsdom proves responsiveness. The full manual matrix remains **partially open**: Firefox, Safari/iOS/physical devices, NVDA/VoiceOver, actual browser 200% zoom, touch keyboard/landscape, exhaustive manual legacy CRUD/chart interaction, all filter/sort/error/session variants, and pre-change screenshot comparison were not completed. Their behavior is covered where applicable by the existing/new automated suites, but that is not a substitute for those manual results. Browser automation covered 320 CSS-pixel reflow rather than claiming actual 200% browser zoom. No implementation blocker remains; these are explicitly reported QA follow-ups.

Opaque token contrast was recalculated from the implemented CSS: text/canvas 14.64:1, muted/canvas 5.08:1, white/primary 6.29:1, primary/selected 5.62:1, income/white 5.02:1, expense/white 6.47:1, control-border/white 3.31:1, control-border/canvas 3.11:1 and category-icon/subtle 10.26:1. The light surfaces meet the targeted token thresholds; this is not a screen-reader audit or a blanket WCAG certification.

### Delivery

Implementation and required verification are complete. Feature commit `3f9ef9224ad5d4f8b379117a60fa036ac528e4ef` was pushed on `feature/clarity-design-foundation`. [PR #21](https://github.com/deepakydv25/cointrail/pull/21) is open against develop and has not been merged. This documentation follow-up records successful delivery; no production code changed after final verification. Remaining unchecked items are partial/manual QA gaps documented above, including exact 500-character browser stress and exhaustive composited hover/focus inspection. Merge and deployment remain excluded.
