# CoinTrail frontend

The existing React + TypeScript application is migrating in phases. Phase 0 establishes shared transport, session, routing and UI foundations; it does not add V2 financial screens.

## Run and verify

Use Node 22 and the existing lockfile:

```sh
npm ci
npm run dev
npm run test:run
npm run build
npm run lint
```

On Windows with PowerShell script execution restricted, use `npm.cmd` for these commands. Vitest uses jsdom and React Testing Library; tests are colocated with source. Build runs TypeScript checks before Vite. Nginx already supports SPA route refreshes through `try_files`.

## API configuration

Copy `.env.example` to a local `.env` and set `VITE_API_BASE_URL=http://localhost:8081`. This is the **public backend origin**, optionally followed by a deployment path prefix. It is compiled into the frontend at build time; restart Vite/rebuild the image after changes. Never put credentials or secrets in a VITE variable.

For compatibility, a terminal `/api/v1` (with optional trailing slash) is removed from an existing base. For example, both `https://api.example.com` and `https://api.example.com/api/v1` produce identical API requests. `https://example.com/cointrail/api/v1` becomes `https://example.com/cointrail`, retaining the deployment prefix. Missing values and non-HTTP(S) URLs, embedded credentials, query strings and fragments fail clearly; there is no fallback to an assumed production host.

Services specify complete paths:
- Authentication: `/api/v1/auth/register`, `/api/v1/auth/login`.
- Legacy expenses: `/api/v1/expenses`, `/summary`, `/{id}` and POST `/api/v1/expenses/create`.
- Future V2 financial services: `/api/accounts`, `/api/categories`, `/api/transactions`, etc., using the same Axios client.

The client only accepts local `/api/*` paths and its configured base; it never sends bearer tokens to arbitrary absolute URLs. It has a 15-second timeout, supports Axios AbortSignal cancellation, and never automatically retries/replays a mutation. Authentication requests do not send stored bearer tokens.

Docker defaults and root Compose use the origin-only convention. Hosted frontend builds must set the browser-reachable backend URL (not a Docker-internal service name), use HTTPS in production, and retain the backend's matching CORS origin. Existing hosted values ending `/api/v1` remain compatible. Backend routes/configuration are unchanged; production OpenAPI remains disabled by default.

## Sessions and routing

The existing `accessToken` localStorage key is retained. AuthProvider subscribes to a small browser session boundary; useAuth is in its own module to support Fast Refresh. Persisted tokens are checked synchronously for a well-formed payload and finite, unexpired `exp`. Payload decoding is only a UX check: backend signature/ownership verification remains authoritative.

Expiration timers, focus/visibility rechecks, and localStorage events synchronize login/replacement/logout between tabs. Monitoring cleans up on unmount and React StrictMode remount. A protected 401 expires only the session that issued the request, removes protected content and shows a login notice. Old-session responses are treated as cancellation, so they cannot log out a newer session or provide stale user data. Protected page state remounts when session identity changes. Login 401 is a credential error; 403 does not log out. There is no refresh endpoint or silent refresh.

All existing V1 URLs are retained:
- `/`, `/login`, `/register`.
- `/dashboard` remains the default after ordinary login and the legacy spending overview.
- `/expenses`, `/expenses/create`, `/expenses/:id`, `/expenses/:id/edit`.

A protected deep link returns to its validated local pathname/search after login; unsafe/external return locations fall back to `/dashboard`. Failed writes are never automatically resubmitted. Registration returns identity, not a token, and does not sign in.

The protected `/app/*` namespace is ready for later V2 routes. For now `/app` returns to `/dashboard`, and unavailable child routes show the normal protected not-found page. Navigation does not advertise unfinished screens. Legacy Overview and Legacy Expenses remain accessible on desktop/mobile. Their records remain editable and are neither converted nor deleted automatically; they do not contribute to V2 reports.

## Source conventions

Keep the current React Router, Axios, Tailwind, Recharts and local component state:
- `api/`: configuration, Axios, normalized errors and non-React session boundary.
- `context/`: AuthProvider, context type and useAuth.
- `routes/`: guards, protected Outlet layout and safe login return navigation.
- `services/`: existing auth/expense services; future small typed domain services.
- `types/`: shared raw `PageResponse<T>`, backend error/auth DTOs and existing V1 expense types.
- `components/ui/`: small loading/empty/error and form feedback components.
- `pages/`: retain current pages; later V2 pages use domain subdirectories with colocated tests.
- `utils/`: existing INR/en-IN and date-only formatting.

No global financial store, generic CRUD/form engine, new component framework or financial precision dependency is introduced.

Services return typed `response.data`; DELETE returns `Promise<void>`. Spring pages stay raw pages with content/number/size/totalElements/totalPages (additional metadata may exist); arrays remain arrays. No success envelope is invented. Future domain DTOs must follow the actual backend names/enums and use separate create/update/preview shapes. Nullable response fields are explicit `T | null`; an optional request field is distinct from a returned null.

V1 enum categories remain separate from V2 category IDs/names. Calendar dates stay YYYY-MM-DD strings; local date-time timestamps have no offset/UTC guarantee and must not acquire an invented Z suffix. Preserve server-owned totals and ownership; never send a client userId.

`ApiError` normalizes HTTP status, error kind, safe text message and string field errors. HTTP status wins over mismatched body status. Both JSON `{status,message,errors}` and bodyless/non-JSON failures work. Auth forms associate known field errors with inputs, keep values on failure and show unmatched validation errors in a summary. Network/timeouts are distinct from invalid credentials; cancellation is not a user error. Do not log tokens, credentials or Axios request configs, and render messages as text.

Shared UI uses semantic roles, live status/error messages, visible keyboard focus, labelled form errors, a skip link and route focus. The mobile navigation is one disclosure with expanded/control attributes and Escape/focus return. Keep responsive Tailwind patterns and textual equivalents for future charts.

## Testing and deferred gates

Transport tests use controlled Axios adapters to assert full paths, payloads, headers, raw results, status errors and cancellation without a network dependency. Provider/route tests exercise real sessions (fake timers and storage events) rather than only mocked useAuth. Deferred requests check late-response isolation. Preserve existing V1 tests and focused edit/delete regressions. Fixtures must match actual controllers/DTOs; local/dev OpenAPI can be enabled explicitly for future contract checks, but is not a runtime frontend dependency.

**Precision is a release gate before V2 monetary screens.** Backend money is BigDecimal/NUMERIC and JSON numbers allow 17 integer plus 2 fractional digits; aggregates can be larger. Long IDs/counts also exceed JavaScript's safe integer range. Ordinary JSON parsing into Number can lose digits before formatting or a decimal library can help. A precision-preserving policy/dependency or explicitly approved narrower UI contract must be decided and tested before V2 financial writes/reports ship. Phase 0 adds no financial JSON parser and does not silently narrow backend limits. INR is the approved monetary display convention; there is no currency conversion.

Accounts/Categories, Transactions, V2 Dashboard, Budgets/Recurring, Analytics, browser E2E and deployment remain later phases. Scheduler timezone/enablement, precision and any future legacy retirement/default landing change retain their approval gates.
