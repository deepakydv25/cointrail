# CoinTrail — Public Landing Page Refresh

## Goal, status and verified baseline

**Approved, implemented and verified; delivery authorized.** Refresh the public `/` page to represent the delivered V2 product with the positioning **“CoinTrail — Understand where your money goes.”** One focused frontend PR targets develop. Implementation/delivery authorization comes from the user's explicit request; this document retains the original planning record.

Inspection date: 2026-10-09. Read AGENTS.md, the planning skill, Plans 006–010 and existing source/tests. Backend testing guidance was reviewed for applicability; no backend work or new backend tests are needed for this presentation-only scope. Existing plans contain historical status statements; current source and merge metadata govern current capabilities.

- GitHub confirms PR #26 is closed and **merged**, at 2026-10-09T16:41:54Z; merge commit `39441121b4aa38a516135735d80d4ed0e0f8f9e8`.
- Fresh `git fetch origin develop` succeeded. Current branch remains `develop`; HEAD and origin/develop both equal that merge commit. Entry working tree was clean. No branch creation/switch, production edits, dependency installation or delivery actions occurred.
- Preserve `/dashboard` as the authenticated default, all `/expenses/*` V1 routes and all protected `/app/*` V2 routes. Landing stays publicly available even to signed-in users.

## Existing page and architecture audit

Frontend paths below are relative to `cointrail-frontend/`.

| Area | Actual implementation | Implication |
| --- | --- | --- |
| Landing | `src/pages/LandingPage.tsx`: hero, three expense-oriented FeatureCards and dark final CTA; no preview, How It Works or footer | Replace this page's presentation and copy, rather than redesigning authenticated screens. Current headline is “Take control of your spending.” |
| Existing issues | Hero uses malformed `sm:px6`; feature description uses very light `text-gray-300` on grey; description has “expenses. understand” punctuation; expense-only messaging omits V2 income/accounts/budgets/recurring/analytics | Correct through scoped landing replacement; verify contrast rather than preserving these styles. |
| Public layout | `App.tsx` SiteLayout owns Navbar, skip link, `#main-content` and pathname heading focus. Landing supplies its own main | Keep one main/h1 and the existing focus owner. Do not nest AppShell or introduce a second skip/focus system. |
| Navigation | `Navbar.tsx` has classic default and Clarity application variants. Classic header is shared by landing, login/register and public NotFound; desktop links at 1024px, mobile disclosure below it, Escape returns focus | Landing needs a dedicated scoped header; leave classic/authentication and application variants unchanged. |
| Authentication | Landing currently branches on useAuth: anonymous Get Started → `/register`, Sign In → `/login`; signed-in Go to Dashboard → `/dashboard`. PublicRoute/login use safeReturnPath and preserve protected return destinations | Preserve these exact destinations/defaults. Do not route every signed-in landing CTA to Dashboard V2 or change guards/login redirects. |
| Clarity | `src/index.css` opt-in `.clarity-content`/`.ct-navigation`, tokenized white cards/off-white canvas/indigo controls, neutral category icons and exact amount tones | Reuse tokens under a new landing-only scope. Do not apply Clarity typography globally to login/register/V1. Tailwind 4 is imported directly; no separate Tailwind configuration is required for new tokens. |
| Shared components | `components/ui`: Button/ButtonLink, SurfaceCard, MetricCard, PageHeader, FormField, States, ConfirmationPanel, FinancialRow, Icon; CategoryIcon is a neutral tag | Reuse ButtonLink, cards, MetricCard and existing glyphs where semantics fit. Landing hero has its own h1 rather than forcing PageHeader's application composition. No fake transaction-detail links. |
| Real dashboard | `pages/dashboard/DashboardPage.tsx`: four overview metrics, income/expense chart, category spending, recent V2 transactions, budget summary, recurring previews and management/report links | Base preview labels and arrangement on this implementation; never import its live page/service into the public route. |
| Assets | `public/cointrail-mark.svg`, `icons.svg`, `site.webmanifest`; no `src/assets` directory or checked-in dashboard screenshot | Reuse the logo. No screenshot is presently available as a production asset; do not assume temporary QA images are approved/public-safe. |
| Metadata | `index.html`: lang=en, viewport, logo favicon/manifest, title CoinTrail, description “Track and understand your personal expenses.” and dark theme-color | Update description to current capabilities; propose scoped landing title. Deployment origin/social image are not verified. |
| Dependencies/tests | React 19/Router 7/Tailwind 4/Axios/lossless-json/Recharts; Vitest/jsdom/RTL/user-event. Navbar tests cover anonymous/authenticated links, logout, menu/Escape; App tests cover logout/cross-tab state and Get Started. No dedicated LandingPage test exists | Add focused landing/header tests and retain existing auth/navigation assertions. jsdom is not responsive-browser evidence. No dependency is needed. |

## Product truth and claim boundaries

- **Accounts:** users organize accounts and record opening balances; no bank connection/synchronization capability.
- **Transactions:** record, browse and manage income/expenses with account/category/date references. V1 expenses remain separate; landing describes V2, never implies migration or combination.
- **Budgets:** monthly expense-category limits with backend spent, remaining and over-budget state. No rollover, predictive budgeting or promised savings.
- **Recurring:** create/manage income and expense rules with supported frequencies and lifecycle controls. Plans 009/010 retain an outstanding operator scheduler/timezone release confirmation; deployment enablement has not been verified. Do not say transactions are automatically posted in production, bills are paid, or an ACTIVE rule guarantees processing.
- **Analytics:** existing overview, trends, category/account activity and explicit period comparison reports. No AI insights, forecasts, investment tracking, exports or account/category aggregate filters.
- Do not add invented customer counts, testimonials, awards, bank-grade security guarantees, pricing/free-forever claims, currency selection or legal/compliance promises. Existing INR display does not establish multi-currency support.

## Proposed structure and final copy

Use this copy as the implementation baseline, subject to approval. Feature navigation links scroll to page sections; auth CTAs are real Router links. No new marketing destination routes.

1. **Header:** CoinTrail logo/name; “Features” → `#features`; “How it works” → `#how-it-works`. Anonymous “Sign In” → `/login`, primary “Get Started” → `/register`. Signed-in variant replaces auth CTAs with “Go to Dashboard” → `/dashboard`. No duplicate application sidebar or logout implementation in this header.
2. **Hero:** small eyebrow “Personal finance, clearly organized”. One h1 **“Understand where your money goes.”** Description: **“Record income and expenses, organize your accounts, manage monthly budgets, and understand your financial activity—all in one clear workspace.”** Anonymous “Get Started” and “Sign In”; signed-in “Go to Dashboard”. Supporting line: “A clearer view starts with the transactions you record.”
3. **Product preview:** h2 **“Your financial activity, in focus.”** Description: “See account balances, monthly income and expenses, category spending, and recent transactions in Dashboard V2.” Visible caption: **“Illustrative Dashboard V2 preview · Example data, not a live account.”** Add scope text within the preview as specified below.
4. **Features:** h2 **“The tools to understand your everyday money.”** Description: “From recording a transaction to reviewing a month, keep your financial activity organized.” Five equal-priority cards:

| Title | Final description |
| --- | --- |
| Accounts | “Organize your accounts and review balances based on the opening balances and transactions you record.” |
| Transactions | “Record income and expenses with accounts, categories, dates, and optional descriptions.” |
| Budgets | “Set monthly limits for expense categories and review spending, remaining amounts, and over-budget indicators.” |
| Recurring Transactions | “Create recurring income and expense rules, manage their details, and pause or cancel them when plans change.” |
| Analytics | “Explore income and expense trends, category spending, account activity, and comparisons between periods.” |

5. **How It Works:** h2 **“A simple way to build a clearer picture.”** Ordered steps: **“1. Organize your accounts”** — “Add your accounts and opening balances.” **“2. Record your activity”** — “Add income and expenses with the right accounts and categories.” **“3. Review and plan”** — “Review your dashboard and analytics, and set monthly category budgets.” No claim that registration routes immediately into a V2 onboarding flow.
6. **Final CTA:** h2 **“Make your next money decision with a clearer view.”** Description: “Start recording your financial activity with CoinTrail.” Anonymous primary “Create your account” → `/register`, secondary “Sign In” → `/login`. Signed-in copy: “Continue reviewing the financial activity you record.” with “Go to Dashboard” → `/dashboard`.
7. **Footer:** logo/name, tagline “Understand where your money goes.”; section links Features/How it works and auth-aware entry links; “© {current year} CoinTrail.” No nonexistent Privacy/Terms/Support pages, social accounts or contact addresses. A copyright label is not a claim of a registered company.

## Visual direction and responsive behavior

Use existing tokens exactly: canvas `#F7F8FA`, surface `#FFFFFF`, subtle `#F1F3F5`, text `#20242C`, secondary `#4B5563`, muted `#626B78`, border `#E2E5EB`, indigo `#4F46E5` (hover `#4338CA`, pressed `#3730A3`), income `#15803D`, expense `#B91C1C`, category glyph `#343A46`. Income/expense previews carry text labels as well as color; category glyphs all share the same grey treatment. Chart accents stay indigo, with distinct labels/patterns where needed.

- System font `--ct-font-sans`; no downloaded fonts. Landing-only hero scale: 2.25rem/1.15 at mobile, 3rem at 768px and 3.5rem at 1024px, weight 600, tracking -.025em. Section titles 1.75rem/1.25 (2rem tablet+); body 1rem/1.5, lead 1.125rem/1.6. Do not mutate global application type tokens.
- Content maximum 75rem; gutters 1rem mobile, 1.5rem tablet, 2rem desktop. Section padding 3rem mobile, 4rem tablet, 5rem desktop; existing 4px spacing scale, 1–1.5rem grid gaps. Cards use existing .75rem radius, 1px borders and card shadow; preview frame may use 1rem floating radius/shadow. No gradients, rainbow features or decorative financial widgets.
- Desktop ≥1024px: full header links; centered hero then wide preview; feature grid three columns (five items in normal source order, no fabricated sixth feature), three-column steps. Tablet 768–1023px: disclosure header, two-column features/steps where readable; preview metrics two columns. Mobile <768px: disclosure header, stacked hero/CTAs/cards/steps; preview metric grid one column, compact readable chart and list. At 320px no document overflow, truncation of labels or image-style shrinking of text.
- Prefer ordinary non-sticky white header. No glass is needed; if later approved for sticky navigation, use existing near-opaque glass token and opaque fallback, test contrast and anchor/focus occlusion. No glass on body cards.
- Controls ≥44×44px, focus 2px indigo with 3px offset. Reuse hover states and 120/160ms color transitions; no parallax, autoplay, counting balances, carousels or entrance animation. Reduced-motion disables transitions; anchor scrolling is instant by default.
- Landing-specific classes scope typography, link/focus and layout. Public header gets its own scope. Existing global Clarity/legacy/auth styles and application breakpoints remain unchanged.

## Product preview decision

**Recommend a lightweight semantic HTML/CSS illustration**, based on the actual Dashboard V2 hierarchy, rather than a screenshot. It stays sharp and readable on mobile, can reuse existing cards, is accessible as text, avoids private data exposure and has no new image/download dependency. This is a consciously reduced product illustration, not an interactive dashboard or evidence of a populated user account.

Proposed immutable sample strings, explicitly labelled as examples: reporting month “September 2026”; Total active-account balance “₹42,500.00” with “All recorded dates · active accounts”; Monthly income “₹35,000.00”; Monthly expenses “₹12,500.00”; Monthly net cash flow “₹22,500.00”. Exact constants are display-only; do not derive live financial totals, use Number financial arithmetic or introduce a shared fake dashboard DTO/service. The all-date balance is not presented as monthly net cash flow.

Show labelled income/expense illustrative bars with predeclared bounded CSS widths and exact adjacent text, a small category expense list (Groceries ₹4,500.00; Transport ₹2,000.00; Other ₹6,000.00; all generic grey tags), and two example recent rows (Salary, INCOME ₹35,000.00; Groceries, EXPENSE ₹1,200.00). Recent rows are a subset, not the basis for totals. Category examples are not category percentages or claims about seeded system category names. Label recent activity “Across recorded dates”. No selectable reporting month, fake sidebar controls, tooltip-only data, fake links or demo-generated IDs. Omit recurring/budget previews from this reduced illustration to avoid implied scheduler guarantees and visual overload; features describe their actual capability.

Do not import Recharts, authenticated DashboardPage or report services for this preview. Illustration chart shapes are decorative; labelled text carries the information. Keep the preview dataset local to its component and inaccessible to real reports. Landing must issue no financial API requests; existing AuthProvider session behavior stays intact.

Screenshot alternative: an approved, anonymized capture of the current real V2 Dashboard using disposable example data, with explicit example caption, optimized responsive image, dimensions and meaningful textual equivalent. It offers literal fidelity but becomes stale, exposes smaller unreadable text on mobile and needs asset/privacy review. No existing screenshot meets those criteria. Choose this only on separate design approval; never capture a user's real financial records. No image-generation tooling or synthetic product capabilities are needed.

## Expected implementation scope and files

One focused public frontend PR. No changes to backend, APIs, migrations, dependencies, auth/session/financial helpers or V1/V2 screen behavior.

| File | Expected change |
| --- | --- |
| `src/pages/LandingPage.tsx` | Replace page composition/copy; retain auth-aware CTA behavior; scoped landing main and real section anchors. |
| `src/components/landing/PublicLandingNavigation.tsx` (new) | Landing-only responsive header with existing logo, ButtonLink/Icon, disclosure accessibility and auth-aware default destination. |
| `src/components/landing/DashboardPreview.tsx` (new) | Static semantic example preview, reused SurfaceCard/MetricCard and neutral CategoryIcon. No API or application state. |
| `src/App.tsx` | Select dedicated header only for exact `/` within public SiteLayout; preserve classic Navbar elsewhere, skip target, focus effect, route tree and guards. |
| `src/index.css` | Scoped landing/header/preview CSS and reduced-motion rules; reuse existing tokens without global restyling. |
| `index.html` | Product-accurate shared meta description; retain favicon, manifest, viewport and application title default. |
| `src/pages/LandingPage.test.tsx` (new) | Copy/sections/anonymous and authenticated CTAs/preview/no financial service calls. |
| `src/components/landing/PublicLandingNavigation.test.tsx` (new) | Disclosure/Escape/focus/selection/history/breakpoint behavior and CTA destinations. |
| `src/App.test.tsx` | Add real landing/header route and logout regressions; retain auth/default/V1/V2 assertions. Scope repeated Get Started assertions with `within(main)` rather than removing behavior checks. |

Keep existing `Navbar.test.tsx` expectations for the unchanged classic header and `AppShell.test.tsx` for application navigation. Do not extract a generic marketing CMS, redesign shared cards or create new abstraction/dependency. Add more landing files only where a real responsibility justifies them. No asset change is needed for the recommended HTML preview. README update is optional only if implementation introduces an illustration-maintenance convention worth documenting.

## Accessibility and SEO

- One main, one h1; h2 section hierarchy, h3 feature headings, semantic ordered steps, nav labels and footer landmark. Logo link accessible name “CoinTrail home”, decorative logo alt empty, fixed width/height to prevent layout shift.
- Mobile disclosure uses button, aria-expanded/controls and a uniquely identified panel; hidden links absent from tab order. Escape closes and returns focus; link selection and history close panel. Breakpoint changes must not leave focus in hidden navigation. No modal focus trap for a non-modal inline disclosure.
- Native same-page anchors preserve fragment history and readable targets; do not let route-heading focus steal focus during hash-only navigation. Preserve existing pathname focus and skip navigation. Browser-test keyboard scroll/focus, not only DOM attributes.
- Verify WCAG AA 4.5:1 normal/3:1 large text and 3:1 focus/control boundaries, actual 200% zoom, text spacing and forced colors. Focus and hover remain visible; chart text avoids color-only meaning. No inaccessible screenshot-only information or hover-only feature descriptions.
- Landing document title proposed “CoinTrail — Understand where your money goes.”; install/restore only while `/` is mounted using a narrow local effect, with StrictMode/unmount tests. Default title elsewhere stays CoinTrail.
- Shared meta description proposed “Record income and expenses, organize accounts, manage monthly budgets, and understand your financial activity with CoinTrail.” Keep static HTML description useful to crawlers; no SSR framework, prerender service or SEO package in this PR. SPA content indexing remains a tradeoff.
- Do not invent canonical origin, og:url, social preview URL, robots policy, structured pricing/reviews or organization details. Add canonical/social metadata only once public deployment origin and asset are verified and explicitly approved. Manifest/icon changes and a social image are outside the baseline scope.

## Implementation phases and acceptance criteria

- [x] **1 — Public composition:** confirm approved copy/preview/header decisions; add scoped landing header and page sections, real anchors and preserved anonymous/signed-in destinations. Exit: default `/dashboard`, login/register return destinations, NotFound and application shell unchanged.
- [x] **2 — Clarity and preview:** apply responsive tokens/layout; add explicitly illustrative static Dashboard preview and accessible exact text. Exit: no private API calls/sample-state leakage, no unsupported financial/scheduler claims, neutral categories and readable 320px layout.
- [x] **3 — Accessibility/metadata/tests:** implement disclosure focus/history, semantic landmarks, reduced-motion and narrow title restoration; focused component/App regressions. Exit: keyboard navigation works, one main/h1, metadata reflects V2 and original auth tests retain meaningful coverage.
- [x] **4 — Verification/review:** full frontend tests/build/lint, responsive browser and auth/default smoke; inspect complete diff and `git diff --check`. Update this plan with actual evidence and omissions before authorized delivery. The later implementation request explicitly authorizes delivery. Uncompleted manual checks and default-parallel failures are recorded below.

## Verification strategy for implementation

Automated: component tests for all approved copy/sections, correct hrefs, anonymous/signed-in/session-changing CTA variants, no synthetic app navigation and no dashboard/analytics/account/transaction/budget/recurring API calls. Assert illustrative caption/metric scopes/exact strings and neutral icons; do not test incidental CSS snapshots. Header tests cover expanded state, hidden panel, Escape return focus, selection/history closure and matchMedia transitions. App tests cover public `/`, login/register classic layout, protected deep-link return, legacy default, logout/cross-tab updates and repeated CTA semantics. Title tests cover mount/unmount/StrictMode. Existing Navbar/AppShell/auth/V1/V2 tests remain meaningful.

Run targeted tests, then `npm run test:run`, `npm run build`, `npm run lint` and `git diff --check`. Investigate default-parallel failures without weakening tests or increasing timeouts to hide them. Prior Plan 010 records 40 suites/665 passing, not a fresh result for this planning task. Track existing bundle warning; no unrelated code-splitting refactor. Backend `mvn clean verify` is not required for an untouched presentation-only backend by the testing skill; run it if future implementation instructions explicitly require it.

Manual browser checklist (record browser/tools/results and omissions honestly):

- [ ] 320/375/390/768/820/1024/1280/1440 widths: no page overflow, readable preview, sensible five-card wrap, header/CTA touch targets and footer.
- [ ] Keyboard-only skip, header toggle/Escape, anchors, section order, CTA routes and Back/Forward/hash behavior; focus never hidden or obscured.
- [ ] 200% zoom, reduced motion, forced colors, text spacing and contrast; screen-reader landmark/heading/preview reading order where available.
- [ ] Anonymous Get Started/Sign In, signed-in `/` CTA to `/dashboard`, session change/logout landing, login/register validation and protected return navigation; V1/V2 smoke.
- [ ] Network inspection confirms no financial report requests from `/`; illustration stays static after session changes, preview has no fake interactive controls.
- [ ] Inspect actual mobile/tablet/desktop visuals; check logo loads and dimensions prevent shift; retain image-failure text if screenshot alternative is approved.

## Risks and approval decisions

| Decision/risk | Recommendation / boundary |
| --- | --- |
| Design/copy/preview | Approve the copy, static labelled example preview and landing-only header before implementation. Alternative screenshot requires anonymized asset approval. |
| Signed-in destination vs V2 positioning | Keep Go to Dashboard → `/dashboard` to honor existing defaults, despite marketing V2. A default/CTA policy change is separate approval. |
| Recurring deployment | Current operator confirmation remains outstanding. Conservative rule-management copy needs no scheduler change; automatic-posting claims require actual deployment verification and separate copy approval. |
| Currency/examples | Use current INR presentation only in clearly illustrative preview; do not claim multi-currency. Sample figures are marketing illustration, not backend metrics or a live account. |
| Header scope | Root-only header avoids login/register/application regression; minimal SiteLayout selection is within proposed scope. No global Navbar rewrite. |
| SEO/social/legal | No verified public origin, social image or legal destinations. Defer these rather than create fake URLs or policy documents. Confirm separately if desired. |
| Performance | Avoid adding chart runtimes, screenshot weight, fonts or animation to the public page. Existing app bundle size remains a known limitation, not permission for unrelated refactoring. |
| Scope expansion | Any backend/API/security/dependency/deployment/default-route change requires separate approval; none is required for this proposal. |

## Planning completion evidence

- [x] Read repository instructions/applicable planning guidance and Plans 006–010; inspect actual public/auth/Clarity/dashboard/assets/tests/dependencies.
- [x] Fetch latest develop and independently verify PR #26 merged; record matching local/remote commit and clean entry tree.
- [x] Define truthful copy, preview strategy, responsive scope, exact expected files, tests and approval boundaries.
- [x] Create only Plan 011; no production implementation, branch changes, dependency installation, tests/build execution, commit, push or PR during planning.
- [x] User approves implementation and proposed decisions.

## Implementation evidence — 2026-10-09

The user approved this plan and explicitly authorized implementation, verification, commit, push and one PR targeting develop; merge remains prohibited. Preparation fetched origin/develop and confirmed HEAD/origin/develop at PR #26 merge commit `39441121b4aa38a516135735d80d4ed0e0f8f9e8`. The only entry change was this untracked approved plan; it was preserved when creating `feature/public-landing-refresh`. No unrelated work was overwritten.

### Delivered presentation

- Root-only PublicLandingNavigation retains anonymous registration/sign-in destinations and signed-in `/dashboard`, with inline disclosure, Escape focus return, route/history closure and breakpoint focus recovery. Classic Navbar and application navigation remain unchanged.
- Approved hero/copy, five feature cards, ordered three-step explanation, final CTA and footer use existing Clarity tokens/components. Scoped CSS adds mobile/tablet/desktop layouts, focus, forced-colors fallback and reduced motion without dependencies, fonts or animation.
- DashboardPreview is semantic display-only HTML with the approved exact example strings, all-date/month scopes, neutral category tags, labelled income/expense bars and recent rows. No live services, financial arithmetic, generated IDs, fake controls or private API requests. No automatic-posting or unsupported product claims.
- Static meta description accurately describes V2. Landing installs/restores its document title, tested through StrictMode and navigation to the unchanged auth layout. Existing SiteLayout remains the skip/route-heading focus owner; native fragment navigation does not trigger its pathname effect.
- Added landing/header/App tests for copy, labels, exact examples, CTAs, auth/session changes, no transport calls, title cleanup, disclosure/focus/history and route isolation. Existing App and Analytics logout checks scope repeated Get Started links to main content without weakening their behavior assertions.

### Browser QA

Installed **Chrome 155.0.8059.39** passed **15 checks** using the local frontend without a backend: widths320/375/390/768/820/1024/1280/1440 had no document overflow, one main/h1, readable exact metric text and visible controls at least44px; Escape closed mobile navigation and returned focus; section anchors received native focus; fragment Back/Forward restored history; no `/api/*` requests; Sign In retained classic auth layout and restored CoinTrail title; Get Started reached registration; reduced motion disabled link transitions. Mobile320 and desktop1280 full-page screenshots were visually inspected. Task Chrome was closed; temporary evidence is in Windows temp `cointrail-landing-qa/results.json` and landing-320/landing-1280 PNGs, not repository assets.

QA found and fixed a CSS cascade issue where shared `.ct-button` display overrode the desktop menu toggle's hide rule; landing-specific selector precedence resolves it without altering shared controls. Harness-only corrections distinguished Vite `/src/api/*` module downloads from real `/api/*` requests, waited for breakpoint media events before interacting, and used normal browser access after the sandboxed Chrome attempt failed. No business/security/deployment changes were needed.

Uncompleted manual checks: Firefox/Safari/physical devices, screen readers, actual200%zoom, exhaustive contrast/text-spacing/forced-colors audit, full keyboard Tab/skip sequence, real backend-authenticated session/logout and V1/V2 CRUD browser smoke. Automated tests cover auth/session/default/legacy and protected-report regressions, but do not replace these manual checks. No scheduler deployment was verified; conservative recurring copy and the prior operator gate remain unchanged.

### Automated verification and review

| Check | Actual result |
| --- | --- |
| Focused landing/header/App/classic Navbar | 4 suites / 57 passed, 24.26s. Final full suite also covers the subsequently corrected Analytics logout assertion. |
| Full frontend, final corrected source | `npm.cmd run test:run -- --maxWorkers=1`: **42 suites / 674 passed**, exit0, 212.62s. All665 baseline cases retained plus9 new cases; no runner configuration or timeouts changed. |
| Required default command | Executed repeatedly; did **not** obtain a passing default-parallel run locally. Investigation evidence below remains distinct from the full serial pass. |
| Build | `npm.cmd run build`: passed. Bundle867.78kB/249.51kB gzip; existing >500kB warning remains. No new dependency or unrelated bundle refactoring. |
| Lint | `npm.cmd run lint`: passed. |
| Backend | Not run locally: approved Plan011/request scope is frontend presentation only and requires frontend verification. Backend/source/config/API/migrations remain unchanged; repository PR CI independently runs backend verification. |
| Diff | Complete production, new component/test and document contents reviewed; `git diff --check` passed. Forbidden-scope diff (instructions, skills, Plans006–010, backend, package/lockfiles) is empty. |

Parallel investigation: first default run overlapped Chrome QA/build and had21 failures (653 passed). Subsequent default runs had8 failures (666 passed,147.81s) and7 failures (667 passed,121.32s). A normal-access default run outside the sandbox had42 failures (632 passed,183.85s), disproving a simple sandbox-only explanation. Failures include explicit5000ms test timeouts and delayed DOM/input updates across unchanged financial suites. Read-only diagnostics found approximately1.2–1.6GB free of8GB physical memory during investigation; machine contention is a plausible inference, not a proven root cause. Unrelated processes were preserved. Temporary task Chrome and Vite were stopped before final verification.

A diagnostic two-worker run passed673 cases, with one Analytics logout assertion failing. Real regression-test corrections were required because the approved landing has repeated Get Started/Sign In links and an Analytics feature h3: scope links to their main/hero/navigation context, assert absence of the protected Analytics h1, and additionally assert removal of the historical account report link. The last default attempts began before the final h1 correction and include that old assertion. Final corrected full serial verification passes all674 cases. Existing behavior assertions were retained; no tests disabled, timeout increased, runner config changed or financial logic altered. Default-parallel timing reliability remains an outstanding local QA issue; CI must provide independent default-command evidence.

Delivery scope is one focused public frontend feature on `feature/public-landing-refresh`. No unresolved API/business/security decision was discovered. The recurring operator gate, missing legal/social/canonical details, existing bundle warning and incomplete manual audits remain explicitly deferred. Do not merge the PR.
