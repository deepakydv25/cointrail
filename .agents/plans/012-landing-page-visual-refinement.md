# CoinTrail — Landing Page Visual Refinement

## Goal and status

**Approved and implemented — verification passed; delivery authorized, awaiting PR review.** Refine the complete public experience before E2E testing, building on the merged landing refresh described in Plan 011. Produce one focused frontend PR after implementation is authorized. The subsequent user request explicitly approved all design decisions and authorized implementation, commit, push and one PR targeting develop; merge remains prohibited.

Audit date: 2026-10-10. Read repository AGENTS.md, `.agents/skills/planning/SKILL.md`, Plan 011, current landing/header/preview, both Navbar variants, AppShell, authentication pages, App routes, logo, CSS, package scripts and relevant tests. Plan 011 is a historical record; its initial audit describes the page before its refresh, whereas current source contains the implemented sections. Merge status is supplied by the user; no remote verification was needed for this planning task. Entry working tree was clean using a command-local Git safe-directory setting; no global configuration was changed. This is a source audit, not a browser-rendered visual audit or a claim that current tests have passed.

## Existing state and audit

Paths below are relative to `cointrail-frontend/`.

| Area | Current implementation | Proposed response |
| --- | --- | --- |
| Landing | `src/pages/LandingPage.tsx` has centered hero, separate preview section, five feature cards, three ordered steps, final SurfaceCard CTA and footer. Copy accurately describes recorded financial activity. | Improve hierarchy, composition and rhythm rather than add capabilities or sections. |
| Public header | `src/components/landing/PublicLandingNavigation.tsx` has monochrome CoinTrail text, SVG mark, Features/How it works links, anonymous auth actions and `/dashboard` authenticated action. Below 1024px it uses a disclosure with menu state, Escape, history and breakpoint focus handling. | Remove section links and disclosure from this component; keep two inline anonymous actions or one authenticated action at every width. |
| Branding | Landing header/footer and Clarity application navbar use single-color text. Classic Navbar uses blue Coin/dark Trail, a 40px mark and “Spend with intention.” Auth pages receive the classic header and do not have a dedicated logo lockup inside their forms. | One reusable wordmark, consistent colors/type/spacing, existing SVG unchanged; remove the legacy header tagline. |
| Authentication | Login says “Welcome Back” / “Login to continue using CoinTrail”; register says “Create Account” / “Start tracking your expenses with CoinTrail.” Login uses `safeReturnPath(location.state?.from)`; registration shows success and clears the form, without automatic login. | Align introductory copy and header branding only; retain submission labels, handlers, validation, session-expiry notice and registration success behavior. |
| Preview | `DashboardPreview.tsx` is semantic HTML with local fixed sample strings, four metrics, labelled bars, category spending and recent rows. “Dashboard V2” appears in heading/caption/intro; “Recent V2 transactions” appears in illustration. | Retain this lightweight implementation and example values; improve frame/cards and replace version terminology. |
| Footer | Inline in LandingPage, white background, generic brand paragraph, tagline, section/auth links and current-year copyright. | Explicit brand and navigation columns with quieter legal-free copyright strip. |
| CSS | `src/index.css` has isolated `.ct-landing*` rules, 75rem max width, 768/1024 layouts, system fonts, existing Clarity color/type tokens and reduced-motion/forced-color rules. Landing is flat and header non-sticky. Existing `--ct-glass-background` is white at .94; application mobile glass already exists. | Add public scoped tokens and styles; do not alter shared card/button primitives or application glass. |
| Routing/focus | `App.tsx` selects dedicated header only at exact `/`; other public pages use classic Navbar. SiteLayout owns skip target and pathname heading focus. `/` remains public when signed in. Protected `/dashboard`, `/expenses/*`, `/app/*` and `/app` redirect are established. | Preserve the route tree, layout selection, title restoration and focus owner. No App route change is expected. |
| Tests | Landing tests check sections, sample values, CTAs, exact icon count and title lifecycle. Public header tests currently center on disclosure/Escape/history/breakpoints. Navbar/AppShell tests check brand home link, application destinations and logout/menu behavior. Login/register tests cover forms, success/error and login dashboard redirect. App tests cover defaults, deep links, cross-tab sessions, logout and route focus. | Replace obsolete public disclosure assertions with inline-header behavior tests; retain application disclosure/auth regressions. Replace incidental icon-count assertions with semantic content checks if composition changes. |
| Tooling | React/Router/Tailwind, Vitest/jsdom/RTL/user-event; scripts `test:run`, `lint`, `build`. Existing SVG and glyph sprite are available; no new asset or dependency is needed. | Browser visual verification supplements DOM tests; do not add an E2E framework in this PR. |

Plan 011 records a default-parallel test reliability concern, a bundle warning and incomplete manual audits. These are historical notes to check during implementation, not newly reproduced failures. Do not weaken tests or change runner configuration to conceal failures.

## Business rules and scope

- [x] Keep spelling **CoinTrail**, current SVG and all current auth destinations. Anonymous Sign In → `/login`; Get Started/Create your account → `/register`; authenticated Go to Dashboard → `/dashboard`.
- [x] Preserve protected-route guards, safe return paths including query strings, default login destination, logout and cross-tab/session-expiry behavior.
- [x] Remove V1/V2 from public landing text, illustration and accessible labels only. Application route labels such as Dashboard V2/Legacy remain unchanged in this scope; application branding alone changes.
- [x] Keep example illustration independent of real account/session financial data. No financial service/API imports or calls, Recharts import or authenticated dashboard mount on `/`. Existing auth initialization remains allowed.
- [x] Describe manual records, opening balances, monthly category budgets, recurring-rule management and existing analytics truthfully. No bank sync, automatic bill payment, production scheduler guarantee, forecasts, AI insights, investments, exports or multi-currency claim.
- [x] No backend/database/API/dependency changes, invented testimonials/pricing/legal/support/social links, global style redesign or edits to AGENTS.md/previous plans.

## Proposed visual direction and design tokens

Quiet, polished depth: bright canvas, strong charcoal typography, blue/indigo accents, one translucent header and soft static hero shapes. Financial content stays on opaque surfaces. All new visual values are scoped to public landing/header; shared brand colors are the only intentionally cross-surface styling.

| Token / use | Proposed value |
| --- | --- |
| Canvas / cards / text | Reuse `--ct-canvas` #F7F8FA, `--ct-surface` #FFFFFF, `--ct-text` #20242C |
| Secondary / muted / borders | Reuse #4B5563 / #626B78 / #E2E5EB; use existing #858E9D when a control boundary needs stronger contrast |
| Coin / primary / hover / pressed | #4F46E5 / #4F46E5 / #4338CA / #3730A3; Trail #20242C |
| Header glass / scrolled | White .94 / white .98; opaque white fallback; optional 8px backdrop blur only on header |
| Hero decoration | At most two static radial gradients: blue #DBEAFE and indigo #E0E7FF fading to transparent; low opacity, no filter blur |
| Landing radii | Controls .5rem, cards 1rem, preview/final panel 1.5rem; no shared token override |
| Landing shadows | Cards `0 2px 8px rgb(32 36 44 / .04)`; preview `0 16px 48px rgb(32 36 44 / .08)`; scrolled header `0 2px 12px rgb(32 36 44 / .05)` |
| Spacing / container | Existing 4px scale; max 75rem, gutters 16px mobile/24px tablet/32px desktop; gaps 16–24px; section spacing 48/64/80px |
| Typography | Existing system font. Hero 36px/1.12 mobile, 48px tablet, 64px desktop, weight 600, tracking -.025em; h2 28/36px at 1.2; body 16px/1.6; lead 18px/1.6; no font downloads |
| Motion | Existing 120/160ms color, border and shadow transitions; no translation, spring, parallax, looping or entrance animation |

Decorations sit behind content, ignore pointer events and never lower text contrast. Feature cards gain a modest border/shadow hover response without implying clickability; they remain plain content. Buttons reuse ButtonLink semantics and established primary/secondary states; refine landing sizing through scoped classes rather than global primitive changes.

## Unified CoinTrail branding specification

Propose `src/components/Brand.tsx` as a small shared presentation component, colocated with existing shared components. It renders the unchanged `/cointrail-mark.svg` with explicit dimensions and empty alt, followed by adjacent `Coin` and `Trail` spans with no visible space. A contiguous accessible text name ensures screen readers announce CoinTrail as one name. The parent Link supplies “CoinTrail home”; footer uses the same linked lockup. This component owns no routing, authentication or tagline logic.

- Standard lockup: mark 32×32px, gap 8px, wordmark 20px/1.1, weight 700, tracking -.025em, no wrapping within the name. Minimum linked hit area 44px high.
- Compact lockup below 360px: mark 24×24px, gap 6px, wordmark 16px with identical colors/weight/spelling. Never use mark-only branding to solve width.
- Reuse in landing header/footer and both Navbar brand slots, thereby covering login/register and application navigation. Retain all application menu controls, links and focus behavior.
- Remove “Spend with intention” and the classic logo hover scale. No small uppercase tagline under any header wordmark. Footer alone carries “Understand where your money goes.” as separate supporting copy; prose mentions of CoinTrail need no colored spans.
- Keep auth form structure and established button labels. Suggested login intro: “Sign in to continue with CoinTrail.” Registration intro: “Create your account to organize your financial activity.” No form logo duplication or auth-card redesign.

## Exact public header layouts

**Desktop ≥768px:** 72px header, centered 75rem container, 24px gutters (32px ≥1024), single flex row. Left Brand home link; flexible empty space; right Sign In ghost link then Get Started primary link, 12px gap, 44px minimum height. Signed in: replace both with Go to Dashboard primary link. No Features/How It Works, hamburger or logout here.

**Mobile 360–767px:** 64px header, 16px gutters, same inline source order, standard Brand, 8px action gap, 14px action text and 8px horizontal action padding. Buttons/links stay ≥44px high. No disclosure and no duplicated hidden navigation tree.

**Compact 320–359px:** 64px header, 12px gutters, compact Brand, 8px gap between brand and action group, 4px action gap. Actions use 13px text, 6px horizontal padding and ≥44px height; Sign In hit width ≥44px. At 320px the 296px inner width allocates approximately 104px to Brand, 8px separation and ≤184px to actions. Use content-based layout with `min-width: 0`; verify actual system-font measurements in browser. Retain full “Get Started” and CoinTrail. Authenticated compact action may visibly say “Dashboard” with accessible name “Go to Dashboard”, still linking to `/dashboard`; desktop/full mobile say Go to Dashboard.

Keep these layouts at 200% zoom; if enlarged user text cannot fit a single row, permit a compact second inline action row rather than clipping, hiding controls or adding a menu. This is a reflow fallback, not the default 320px layout.

Propose sticky positioning on `/` only with constant height. At `scrollY > 8px`, increase white opacity and add the small shadow/border; do not resize or animate blur. Use one passive scroll listener with initial state evaluation and cleanup; update state only when the threshold boolean changes. No per-frame work. Support unsupported-backdrop-filter with opaque background; reduced motion removes all transitions. Ensure the existing skip link remains above the header and focused headings/anchors have adequate scroll margin (header height + 16px).

Login/register retain the classic navbar's action labels and disclosure behavior; only their shared branding changes. This keeps the simplified inline interaction scoped to the landing page as requested.

## Proposed sections, layout and revised copy

Maintain semantic/source order: hero → product preview → features → How It Works → final CTA → footer. No invented sixth feature.

1. **Hero:** a centered editorial composition, compact indigo eyebrow, headline max 17ch and lead max 42rem. Give the headline intentional natural wrapping, generous whitespace and the soft abstract background. Desktop primary/secondary CTAs in one centered row; below 640px stacked full-width within a max 22rem action block. Eyebrow: **“Personal finance, clearly organized”**. H1: **“Understand where your money goes.”** Lead: **“Record income and expenses, organize your accounts, and manage monthly budgets in one clear workspace.”** Support: **“A clearer view starts with the transactions you record.”** Anonymous Get Started / Sign In; authenticated Go to Dashboard.
2. **Dashboard illustration:** visually pull the preview closer to the hero through spacing, without negative overlap or absolute positioning. H2: **“Your financial activity, in focus.”** Intro: **“Review account balances, monthly income and expenses, category spending, and recent transactions in your dashboard.”** Caption: **“Illustrative dashboard preview · Example data, not a live account.”** Frame heading: **“Dashboard”**; recent panel: **“Recent transactions”**. Keep reporting month September 2026, existing eight distinct sample amounts and their scope labels. All-date active-account balance remains distinct from monthly net cash flow; recent rows remain a subset. Desktop four metrics, two lower panels, full-width recent rows; tablet two metrics per row; mobile one metric per row and stacked panels. At narrow widths amounts occupy their own row. Preserve readable text, not screenshot-like scaling; avoid fake controls or extra decorative financial widgets.
3. **Features:** H2 **“The tools to understand your everyday money.”** Intro **“Keep your financial activity organized, from your first transaction to your monthly review.”** Desktop a six-track grid: first three cards span two tracks each; last two span three each. Tablet two columns with final Analytics card spanning both; mobile one column. Source order unchanged; all cards share consistent padding, small neutral glyph container and title/body rhythm. No interactive card links.

| Feature title | Revised description |
| --- | --- |
| Accounts | Organize your accounts and review balances based on the opening balances and transactions you record. |
| Transactions | Record income and expenses with accounts, categories, dates, and optional descriptions. |
| Budgets | Set monthly limits for expense categories and review spending, remaining amounts, and over-budget indicators. |
| Recurring Transactions | Create recurring income and expense rules, and pause or cancel them when plans change. |
| Analytics | Explore income and expense trends, category spending, account activity, and comparisons between periods. |

4. **How It Works:** H2 **“A simple way to build a clearer picture.”** Three equal desktop columns, a vertical ordered sequence below 768px. Small indigo number badges visually separate step numbers from heading text; badge decoration must not duplicate spoken numbering. Subtle desktop connector is decorative; no connector across mobile content. Steps: **“Organize your accounts”** — “Add your accounts and opening balances.”; **“Record your activity”** — “Add income and expenses with the right accounts and categories.”; **“Review and plan”** — “Review your dashboard and analytics, and set monthly category budgets.” No promise of a new onboarding flow.
5. **Final CTA:** generous opaque white inset panel with quiet indigo border, rounded corners and no extra gradient. H2 **“Make your next money decision with a clearer view.”** Anonymous body **“Start recording your financial activity with CoinTrail.”**, Create your account / Sign In. Signed-in body **“Continue reviewing the financial activity you record.”**, Go to Dashboard. Keep actual destinations, consistent button hierarchy and mobile stack.
6. **Footer:** pale solid surface, top border and two desktop columns: Brand/tagline on left; labelled navigation groups on right (“Explore”: Features → #features, How It Works → #how-it-works; “Your account”: anonymous Sign In/Get Started or authenticated Go to Dashboard). At <768px stack brand then groups; at 320px groups stack as needed. A separate bottom copyright row says **“© {current year} CoinTrail.”** No empty legal columns, newsletter form, contact data or social badges. Section links remain available here even though removed from the navbar.

Keep existing landing title and metadata positioning. No canonical/social origin or new SEO infrastructure is needed. Capitalization “How It Works” is consistent in public labels; ordinary Dashboard/Transactions terminology applies to public content only.

## Accessibility, responsiveness and performance requirements

- [x] One main and h1, consistent h2/h3 hierarchy, semantic figure/caption and ordered steps, labelled primary/footer navigation. Preserve SiteLayout skip target, pathname focus and title cleanup under StrictMode. Hash-only section navigation must not trigger pathname focus.
- [x] Verify WCAG AA contrast on composited glass over the actual hero and at scrolled positions: 4.5:1 normal text, 3:1 large text and meaningful control/focus indicators. Keep income/expense labels alongside colors. Decorative shapes are inaccessible and inert.
- [x] Visible 2px focus outline with 3px offset; ≥44px control height/target; logical keyboard order and no fake controls. Sticky header cannot obscure focused targets, anchor sections or skip link.
- [ ] Browser checks at 320, 360, 390, 768, 1024 and 1440px, portrait/landscape and both auth states; 200% zoom, enlarged/text-spacing settings, keyboard, reduced motion and forced colors. No document horizontal overflow, cropped names, ellipsis on required content or scaled-down preview text. Use shrinkable grid tracks and content reflow; do not hide overflow on the document to mask bugs.
- [x] Use opaque fallback when blur is unsupported; forced colors remove decorative gradients/shadows and retain system-color boundaries. Reduced motion removes transitions, including button/card/header styles introduced here; no smooth scrolling requirement.
- [x] Only static CSS gradients, existing SVG/system fonts and HTML illustration; no raster generation, animation library, new packages, fetches or additional chart runtime. Header is the sole new blur surface. No filters on large hero/card regions, continuous scroll animation or layout-changing scroll state.
- [x] Explicit logo dimensions, in-flow preview and stable header height avoid layout shifts. Compare production output with pre-change build; document any size increase, ensure no new preview/chart library import and inspect network to confirm zero financial calls from landing.

## Expected implementation files

| File | Expected work |
| --- | --- |
| `src/components/Brand.tsx` (proposed new) | Shared presentation-only SVG/two-color wordmark using established component placement. |
| `src/components/Brand.test.tsx` (proposed new) | Contiguous accessible brand text, SVG source and decorative-image semantics. |
| `src/components/landing/PublicLandingNavigation.tsx` | Inline auth-aware actions, Brand, sticky scroll state; remove obsolete disclosure state/effects/refs and menu imports. |
| `src/pages/LandingPage.tsx` | Section copy/composition, feature/step layout classes and branded structured footer. |
| `src/components/landing/DashboardPreview.tsx` | Ordinary product labels and illustration hierarchy; keep fixed example strings/no data services. |
| `src/components/Navbar.tsx` | Brand in both variants and removal of classic legacy tagline/hover scale only; preserve menus and destinations. |
| `src/pages/LoginPage.tsx`, `src/pages/RegisterPage.tsx` | Introductory copy only; no form/auth behavior change. |
| `src/index.css` | Scoped public tokens/layout/glass/reflow/focus/reduced-motion rules and isolated shared wordmark styles. |
| `src/components/landing/PublicLandingNavigation.test.tsx` | Replace disclosure tests with inline controls, auth rerender/destinations, scroll initial/update/cleanup behavior. |
| `src/pages/LandingPage.test.tsx` | Revised copy, footer sections, sample semantics, no version wording; retain auth/title checks. |
| `src/components/Navbar.test.tsx`, `src/components/AppShell.test.tsx` | Unified brand/removed tagline assertions; keep existing application navigation/menu/logout expectations. |
| `src/pages/LoginPage.test.tsx`, `src/pages/RegisterPage.test.tsx` | Copy assertions as needed; retain success/error/payload/redirect checks. |
| `src/App.test.tsx` | Public route branding/CTA/no-financial-request integration coverage; retain existing session/deep-link regressions. |

No edits expected to App.tsx, AppShell.tsx, route guards, auth context/services, financial screens/helpers, public SVG, index.html, package manifests or backend. New Brand filenames are proposals, not claims of existing files. Avoid extracting a separate footer unless implementation demonstrates a useful responsibility beyond this page.

## Phase 1 — Branding and public header

- [x] Implement the approved Brand contract and use in the five requested surfaces through existing headers/footer.
- [x] Remove legacy header tagline and simplify landing header only; implement scoped scroll state/fallback/focus margins.
- [x] Run focused brand/header/Navbar/AppShell tests; browser-check inline header fit early at 320px.

## Phase 2 — Landing presentation and copy

- [x] Apply hero tokens/composition, static preview refinement, balanced five-card layout, numbered steps, final CTA and footer.
- [x] Remove public version terminology including accessible strings; align auth intro copy without touching form behavior.
- [x] Review all copy against capability boundaries and all illustration labels against existing sample meanings.

## Phase 3 — Testing and acceptance criteria

- [x] Targeted RTL tests cover a single contiguous CoinTrail name, correct home links and shared wordmark in public/application contexts; obsolete tagline absent.
- [x] Public header contains no Features/How It Works or menu button; both anonymous actions are rendered inline, authenticated dashboard action replaces them, and rerenders after session changes work.
- [x] Header scroll state initializes on a restored scrolled page, changes only across threshold and removes listener on unmount/StrictMode cycle. Reduced-motion and real layout are verified in browser, not inferred from jsdom.
- [x] Landing/preview contain no standalone V1/V2 in user-facing or accessible content; section/feature/step/caption semantics and static sample values remain meaningful. Footer retains section anchors and auth-aware real destinations.
- [x] App integration transport evidence shows no financial endpoint request on `/` for anonymous or authenticated sessions; do not rely solely on component mocks or absence of links. Existing session initialization requests are distinguished from financial traffic.
- [x] Existing login/registration, safe-return-path, PublicRoute/ProtectedRoute, application menu/logout, cross-tab state, default `/dashboard` and `/app` redirect regressions remain intact.
- [x] Browser screenshots cover full page plus header at top/scrolled states at listed widths/auth states. At 320px `document.documentElement.scrollWidth <= document.documentElement.clientWidth`; full CoinTrail/Sign In/Get Started remain visible without a menu at default text size. Check fallback text reflow separately.
- [ ] Complete exhaustive contrast/focus/actual browser zoom/text spacing/reduced motion/forced colors and browser financial-network audit. Scoped completed checks and manual omissions are recorded below; cards/illustration remain readable without hover or color alone.

## Phase 4 — Verification

From `cointrail-frontend/`, run targeted tests during changes, then required frontend checks:

```text
npm run test:run -- src/components/Brand.test.tsx src/components/landing/PublicLandingNavigation.test.tsx src/pages/LandingPage.test.tsx src/components/Navbar.test.tsx src/components/AppShell.test.tsx src/pages/LoginPage.test.tsx src/pages/RegisterPage.test.tsx src/App.test.tsx src/routes/returnPath.test.ts src/routes/PublicRoute.test.tsx src/routes/ProtectedRoute.test.tsx
npm run test:run
npm run lint
npm run build
```

- [x] Record actual results and resolve relevant failures; do not declare implementation complete with outstanding required checks.
- [ ] Complete manual browser/visual review before E2E testing starts; no E2E dependency addition in this change.
- [x] Compare before/after bundle and public network behavior; review final diff for strictly scoped changes.

Backend `mvn clean verify` is not applicable because no backend work is proposed. The original planning-only turn ran no tests/build; implementation results are recorded below.

## One focused PR delivery plan

After the user approves implementation, start from current develop and recheck the source against this plan. Use one branch such as `feature/landing-visual-refinement` and one PR targeting develop, titled **“Refine public landing visuals and unify CoinTrail branding.”** Deliver the phases together because header, wordmark and landing composition form one coherent visual change. Include concise problem/result copy, scope exclusions, test results, responsive top/scrolled/full-page screenshots and remaining limitations in the PR body. Follow the feature-delivery skill when delivery is authorized; do not infer commit/push/PR authorization from this planning request. No merge or deployment is included. Keep prior plans and AGENTS.md unchanged.

## Approved design decisions

1. Approve the restrained visual direction: sticky translucent landing-only header, optional bounded 8px blur, static blue/indigo hero shapes, opaque cards and refined spacing. This intentionally replaces Plan 011's earlier no-gradient/non-sticky direction for this new scope.
2. Approve one indigo Coin/charcoal Trail shared wordmark using the unchanged blue SVG, removal of the legacy header tagline, and the proposed auth introductory copy.
3. Approve the exact inline mobile header, including the compact authenticated visible label “Dashboard” below 360px while retaining `/dashboard` and accessible “Go to Dashboard.”
4. Approve revised public copy/layout and the retained HTML example illustration; no screenshot or generated asset is proposed.

All four decisions were explicitly approved in the implementation request. No product/API/security decision required broadening scope.

## Implementation and verification evidence — 2026-10-10

### Preparation and implemented scope

- Fetched origin/develop. GitHub confirms landing refresh PR **#27** merged on 2026-10-09 at 17:31:55Z; develop and origin/develop matched merge commit `850c17d3f7c869c14d45381c1e61593a63a65190`. Plan 011's earlier PR #26 reference concerns the preceding analytics merge.
- Tracked entry working tree was clean; the sole untracked file was this approved plan from the planning turn. Preserved it and created `feature/landing-visual-refinement` from develop. No unrelated work discarded.
- Brand uses the unchanged SVG and contiguous indigo Coin/charcoal Trail across landing header/footer and both Navbar variants. Classic tagline/hover scaling removed. Auth forms changed only introductory copy.
- Landing header is inline and sticky, with anonymous Sign In/Get Started and authenticated `/dashboard`. Removed only landing disclosure/section links; classic/application menus, guards, redirects and logout remain intact. Passive threshold-only scroll state and StrictMode cleanup tested; 8px glass confined to header, opaque fallbacks provided.
- Delivered approved hero/copy/static backgrounds, framed HTML preview, balanced five-card grid, ordered numbered steps, final CTA and structured footer. Public version labels removed; existing exact example amounts/scopes and all authenticated financial precision unchanged.
- Browser QA corrected one-pixel header border accounting and enlarged-text wrapping. Fixed compact pixel gutters/gaps keep actions together on a second inline row when text is enlarged. Default headers remain 64px mobile/72px desktop; no overflow masking or hidden actions.

### Automated verification

| Check | Actual result |
| --- | --- |
| Targeted component/integration/route tests | **11 suites / 88 tests passed**, 34.24s. Brand test added; obsolete root disclosure tests replaced by inline/session/scroll coverage; semantic footer/copy/branding assertions updated. |
| Final required default `npm run test:run` | **43 suites / 675 tests passed**, exit 0, 92.46s, outside sandbox after task Chrome/Vite shutdown. No CLI worker override or runner configuration change. Includes final auth intro assertions. |
| Diagnostic serial full suite | **43 suites / 675 passed**, 205.96s, `--maxWorkers=1`. PowerShell combined stderr redirection made the wrapper report exit 1 despite Vitest's all-pass summary; final default run explicitly propagated native exit and returned 0. |
| Initial default full suite | 652 passed / 23 failed across 9 suites, 172.52s, overlapping browser QA. Failures included 5000ms timeouts and delayed DOM across existing financial suites/AppShell. No valid assertions weakened or timeouts/config changed. Final default pass resolves the gate; contention/sandbox overhead is an inference, not a proven root cause. |
| `npm run lint` | Passed, including final repeat after responsive correction. |
| `npm run build` | Passed: JS **867.04 kB / 249.34 kB gzip**, CSS **41.11 kB / 9.01 kB gzip**. Baseline JS 867.78 / 249.51; CSS 38.68 / 8.50. JS decreased 0.74 kB; CSS added 2.43 kB (0.51 gzip). Existing >500 kB chunk warning remains. |
| `git diff --check` | Passed; full production/test/new-file diff reviewed. No backend/API/auth-handler/route/financial-helper/package/instruction/skill/Plans 006–011 changes. |
| Backend | Not run locally: frontend-only scope. Existing PR CI independently verifies backend. |

### Browser, accessibility and performance evidence

**Chrome 155.0.8059.39**, headless CDP against local Vite without backend: **22 checks passed**, exit 0. QA harness/artifacts remain in Windows temp, outside repository assets and dependencies.

- **320, 360, 390, 768, 1024, 1440px** each passed anonymous and locally simulated authenticated states (12 combinations): no document horizontal overflow, one main/h1, full CoinTrail and correct destinations/actions. All landing/header links ≥44px high. At 320px Brand width 92.66px, Sign In 54.84px, Get Started 80.98px; compact Dashboard retains accessible Go to Dashboard and `/dashboard`.
- All combinations checked top/scrolled states: header stays at top 0 with constant 64/72px height. Saved 12 full-page top and 12 scrolled screenshots. Visually inspected desktop 1440, mobile 320, scrolled mobile, forced-color and enlarged/text-spacing screenshots.
- Keyboard Shift+Tab from Brand reaches existing skip link above the header; Enter focuses `#main-content`; next Tab reaches hero registration CTA. Footer section anchor focuses target below sticky header; fragment Back/Forward works without pathname focus theft.
- Reduced motion removes header/card/button transitions. Forced colors removes hero decoration/blur and retains system boundaries. 200% root text enlargement and WCAG text-spacing overrides at 320px reflow without overflow. Root text enlargement is **not actual browser zoom**.
- Auth links retain classic navigation, unified branding, revised intro and title restoration. Authenticated visual QA uses only local synthetic valid session tokens, not backend login. Automated App tests cover existing session/transport/default/protected/deep-link/logout regressions.
- Network capture shows **zero `/api/*` requests** across both session states and auth-link navigation; Vite module downloads distinguished from API traffic. Illustration is static HTML with existing sample strings, no real financial records or new chart/runtime dependency.
- Conservative contrast bounds: indigo/charcoal/secondary/muted on white **6.29/15.55/7.56/5.39:1**; indigo/secondary on .94 white glass even over black **5.52/6.63:1**. Hero indigo/secondary exceed **5.10/6.13:1** on fully saturated pale #E0E7FF (actual gradients less intense). Income/expense on opaque white **5.02/6.47:1**. Secondary control border #858E9D on white **3.31:1**; indigo focus indicators exceed 3:1. Pale content-card borders are decorative.

Evidence directory `%TEMP%/cointrail-refinement-qa/`: `results.json`, `anon-320-top.png`, `anon-1440-top.png`, `anon-320-scrolled.png`, `auth-320-top.png`, `text-200percent.png`, `text-spacing.png`, `forced-colors.png` and other viewport images. Logs: `%TEMP%/cointrail-refinement-default-final.log`, `cointrail-refinement-serial.log`, `cointrail-refinement-browser-final.log`. Task servers/Chrome stopped before final default run; unrelated processes preserved. Initial harness failures involved extension-tab selection, CDP serialization, selector escaping and timing of React title cleanup; these were harness corrections, not application/auth changes.

### Remaining manual checks and delivery boundary

Comprehensive manual checklist remains open for **actual 200% browser zoom, landscape-specific runs, Firefox/Safari, physical devices, screen-reader audit, exhaustive keyboard traversal and real-backend authenticated CRUD smoke**. Completed Chrome checks cover requested width/session/scroll combinations and scoped accessibility behavior. Unsupported-backdrop-filter opaque fallback was source-reviewed; a second browser was unavailable to independently exercise it. Existing bundle warning remains.

User-authorized delivery: one commit/push and one PR targeting develop, without merge. PR URL and current CI state reported after creation. This evidence supersedes the original planning-only status while preserving prior plans.

## PR #28 visual review follow-up — 2026-10-10

This follow-up updates the existing `feature/landing-visual-refinement` branch and PR #28 targeting develop. Entry working tree was clean; fetched origin/develop and the feature branch and confirmed PR #27 remains merged (`850c17d`). No new branch/PR or merge. AGENTS.md, feature-delivery skill, applicable testing scope and Plans 011–012 were reviewed.

### Additional approved design decisions

The user explicitly approved shared public header geometry/glass controls, then requested **round buttons across every page**, **lighter matching liquid-glass primary actions including login/register**, and **visible content passing behind the translucent sticky header**. These decisions supersede the earlier root-only header treatment, unchanged shared-primitives constraint and solid-dark primary-button design. Scope remains presentation only; no auth handlers, routes, session logic, financial calculations, backend or dependencies changed.

- `PublicHeader` owns public container geometry and the passive scroll listener. Landing, login, registration and public NotFound use it. Anonymous classic actions stay inline with their existing Login/Register names/destinations; the landing retains Sign In/Get Started and authenticated `/dashboard`. Existing authenticated classic disclosure/Escape/logout behavior and application sidebar architecture remain.
- Header maximum **1280px**, gutters **12px below 360 / 16px below 768 / 24px below 1024 / 32px thereafter**, heights **64px mobile / 72px from 768** including border. Logo/wordmark use the existing shared Brand: 24px/16px below 360 and 32px/20px otherwise. Removed the obsolete classic/app image override. Public `scrollbar-gutter: stable` prevents short NotFound pages shifting the header edges.
- Shared glass header: **86% white / 88% scrolled**, **8px blur**, inset highlight with no visible bottom divider or outside shadow (the final user review explicitly requested removing the partition). Scrolling changes paint, not geometry. The application's existing top brand strip gets these shared tokens; its sidebar/menu, forms, cards, charts and financial tables remain opaque.
- Shared controls: **9999px pill radius**; square icon actions become circles. Pale indigo primary **#E0E7FF at .94**, hover **#C7D2FE at .98**, pressed **#A5B4FC at .98**, dark indigo text **#3730A3** and border **#818CF8**. Secondary/ghost use near-white glass with restrained highlight/borders; small controls blur **4px**. Danger remains recognizably red. Disabled/loading controls are opaque without blur/highlight; keyboard focus remains indigo. Login/register and legacy action buttons/links consume the same classes; existing event handlers and destinations are untouched.
- Opaque default declarations outside `@supports`, reduced-transparency/print overrides, reduced-motion overrides and system-color boundaries/focus under forced colors. No large-region blur, image dependency or animation introduced.

### Verification results

| Check | Actual result |
| --- | --- |
| Focused Navbar/landing navigation/UI foundation/App tests | **6 suites / 178 passed**, 38.50s in the final focused run (including recurring and transaction flows). Earlier four-suite run also passed 77 tests. Shared header/brand classes, inline anonymous behavior, existing authenticated disclosure/Escape, variants, keyboard activation, pending state and route regressions covered. The final focused run includes the auth-button style assertions. The first default full run passed 681/683; recurring cancellation and transaction-create async navigation checks failed, then passed in the focused rerun without changing financial code, assertions, timeouts or test configuration. |
| Final default `npm run test:run` | **43 suites / 683 passed**, exit 0, **109.51s** in the final default run; no worker override or test-configuration changes. |
| `npm run lint` | Passed, exit 0. |
| `npm run build` | Passed, exit 0: JS **866.21 kB / 249.23 gzip**, CSS **43.51 kB / 9.32 gzip**. Existing >500kB chunk warning remains. No dependency/config changes. |
| `git diff --check` | Passed; complete production/test/new-component diff reviewed. |
| Backend | Not run locally: frontend-only changes. |

**Real Chrome 155.0.8059.39**, headless CDP against local Vite: final **42 checks passed**, plus **7 checks at actual 200% browser zoom**, both exit 0. Full browser matrix completed before tests. One final zoom screenshot refresh was interrupted by premature Vite shutdown; it was rerun after the full suite, and is not counted as a successful check until completed. QA sessions use synthetic local JWTs for navigation and an empty account-creation form; no submission or real financial data.

All four public routes passed alignment, brand dimensions, vertically centered actions, 44px targets, one main, no horizontal overflow and top/scrolled stability at **320, 390, 768, 1024, 1280, 1440px**. Exact shared measurements (Chrome reserves 15px scrollbar):

| Viewport | Logo left | Action right | Header height |
| --- | --- | --- | --- |
| 320 | 12 | 293 | 64 |
| 390 | 16 | 359 | 64 |
| 768 | 24 | 729 | 72 |
| 1024 | 32 | 977 | 72 |
| 1280 | 32 | 1233 | 72 |
| 1440 | 104.5 | 1320.5 | 72 |

- Application account form checked at 320/390/768/1440: sidebar/navigation preserved, mobile Escape restores disclosure state, white opaque form card and no overflow. Authenticated landing preserves Go to Dashboard `/dashboard`.
- Real hover/pressed states, all shared variant colors/radii, pending opacity/no blur, reduced transparency, reduced motion and forced colors checked. Login/register native submit actions and public button links have the same pill radius and primary treatment. No API requests from the public route matrix.
- Skip navigation focuses main; footer anchor focuses a section below the sticky header; WCAG text-spacing overrides at 320px reflow without overflow. Actual browser zoom uses Chrome's persisted zoom preference: `outerWidth=1440`, `innerWidth=709`, `devicePixelRatio=2`, `visualViewport.scale=1`, with public pages and application form reflowing. This is browser zoom, not CSS text enlargement or pinch zoom.
- Conservative alpha-composited contrast over black: wordmark indigo on 86% white glass **4.55:1**; dark primary text on default/pressed pale glass **7.07 / 4.78:1**. Hover also exceeds 4.5:1. Financial values remain on opaque white.

### Review screenshots

Selected final and baseline images are committed beside this plan:

- [Before landing desktop](012-visual-qa/before-landing-desktop.png), [before login desktop](012-visual-qa/before-login-desktop.png): previous inconsistent widths/actions.
- [After desktop scrolling](012-visual-qa/after-landing-desktop-scrolled.png): blurred hero text visibly passes behind the glass header.
- [After landing at 320px](012-visual-qa/after-landing-mobile.png): full brand and inline actions, lighter round CTAs.
- [After registration desktop](012-visual-qa/after-register-desktop.png): aligned shared header and matching submit action.
- [Application mobile](012-visual-qa/after-app-mobile.png): existing architecture and opaque form with shared controls.
- [Login at 200% browser zoom](012-visual-qa/after-login-200percent.png).

Full viewport/scrolled images, network capture and measurement JSON remain in `%TEMP%/cointrail-glass-qa/{before,after,after-zoom}`. Final logs: `%TEMP%/cointrail-glass-{targeted-final,full-final,lint,build,after,zoom}.log` (stderr is preserved separately for the final test runs). Representative before/after public desktop/mobile, auth, application/button variants and scrolled screenshots were visually inspected.

### Limits and delivery

Firefox/Safari, physical devices, screen-reader audit, landscape-specific checks, exhaustive keyboard traversal and real-backend CRUD were not completed. Unsupported-backdrop-filter opaque fallback was source-reviewed; a CSSOM attempt to simulate unsupported filters was inconclusive and is **not** counted as a passed browser check. Initial harness retries corrected profile persistence, JavaScript serialization/selector quoting and the Chrome zoom preference format; they did not require auth/routing changes. The actual 200% zoom requirement previously open in this plan is now completed.

Delivery stays on existing PR #28, with one follow-up commit/push and updated description; do not merge.

### Final header/footer review correction — 2026-10-10

The user clarified that removing the divider was insufficient: the **full-width white header surface itself** still separated navigation from the page, and footer account buttons were not round. This final correction supersedes the public-header surface description in the previous follow-up.

- Public outer headers are transparent with no visible divider/shadow. At the top, navigation blends into the page; on scroll, the existing 1280px aligned container becomes a rounded glass panel (90% canvas tint, 8px blur). Existing height/gutters, actions, redirects and scroll-listener behavior stay unchanged. Expanded classic menus use the existing floating radius to avoid an oversized pill around the disclosure. Application sidebar/top-strip architecture remains as delivered.
- Landing decorative shapes now continue beneath the header as a static page background. Cards, preview values and auth/application forms remain opaque. Unsupported-filter and reduced-transparency modes use an opaque canvas container; forced colors removes decorations and retains focus/boundaries. The conservative scrolled canvas tint keeps indigo text above 4.5:1 even over black; the initial hero background stays pale.
- Footer account actions now share secondary Sign In / light-primary Get Started (or authenticated primary Go to Dashboard). Fixed the actual radius bug: `.ct-landing-footer-groups a` previously overrode shared ButtonLink radii, padding and hover colors; footer text-link styling now excludes `.ct-button`. Account actions have a wrapping inline group and the same pill radius, 4px control blur, focus and hover/pressed treatment as other CTAs.
- Footer uses a restrained translucent-white layer over static pale blue/indigo shapes with an inset highlight. No blur on the large footer region; only its small shared buttons use blur. Reduced-transparency/print/forced-color fallbacks are opaque.

Final focused verification: **5 suites / 80 passed**, 14.72s, including landing/footer variants, authenticated footer destination, public header, Navbar, shared controls and App auth/routing regressions. Final required default suite: **43 suites / 683 passed**, exit 0, **86.91s**, after browser/server shutdown with no runner/config/timeout changes. Final lint/build/diff-check pass; bundle is JS **866.28 kB / 249.22 gzip**, CSS **44.80 kB / 9.50 gzip**. Existing chunk warning persists.

Final Chrome QA: **43 checks passed**, exit 0, across all six requested widths; **7 checks at actual 200% browser zoom passed**, exit 0. Normal/scrolled public container blur, reduced-transparency/forced-color container fallbacks, header geometry, 320px text spacing, keyboard skip/anchors, opaque application form and zero public API calls remain verified. Added actual computed footer pill-radius/4px blur and transparent outer-header assertions; inspected desktop/mobile footer screenshots. All requested public alignment measurements remain identical to the table above.

Current screenshots supersede intermediate images: [top desktop without a white strip](012-visual-qa/after-landing-desktop.png), [rounded scrolling glass header](012-visual-qa/after-landing-desktop-scrolled.png), [footer at 320px](012-visual-qa/after-footer-mobile.png), [footer desktop](012-visual-qa/after-footer-desktop.png). The remaining selected after images were refreshed. Final logs: `%TEMP%/cointrail-glass-footer-{targeted,full}.log`, plus lint/build/after/zoom logs already described. Cross-browser/device/screen-reader/real-backend limitations remain as recorded above.

The earlier alignment/button commit `a7dd5fb` completed before the user's interruption, but its push did not complete. This focused header/footer correction is an additional commit on the same feature branch; both follow-up commits are delivered through the existing PR #28. No branch/PR creation or merge.
