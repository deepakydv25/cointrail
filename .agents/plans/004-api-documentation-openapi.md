# API Documentation / OpenAPI

## Goal

Provide an automatically generated OpenAPI contract and interactive documentation for the complete current V2 financial API, including its existing authentication endpoints. Document actual behavior without changing endpoint paths, DTO serialization, validation, ownership, financial rules or security responses.

Status: implementation and all five phases complete on `feature/api-documentation`. D1–D3 are preserved exactly. Targeted tests and browser UI smoke test passed; final `mvn clean verify` passed 482 tests with zero failures/errors/skips and BUILD SUCCESS. Complete diff reviewed; commit/push/PR delivery follows this verification. No production code, tests, dependencies or configuration were changed during the original planning step.

## Existing State

- Baseline: merged Analytics, commit `a5b5227`; existing plans are 000–003. Current branch is already `feature/api-documentation`.
- `cointrail-api/pom.xml` uses Spring Boot **4.1.1**, Java **25**, `spring-boot-starter-webmvc`, Jakarta validation, Spring Security, JJWT 0.13.0, PostgreSQL and Flyway. There is no OpenAPI dependency or documentation configuration. Tests use Jackson 3 (`tools.jackson`).
- Eight controller packages define **35 operations** in scope: `auth`, `account`, `category`, `transaction`, `budget`, `recurringtransaction`, `dashboard`, `analytics`. Authentication remains `/api/v1/auth`; financial endpoints use `/api/...`. Legacy `expense/ExpenseController` and Actuator are outside this documentation scope.
- `application.yml` uses port **8081**, no context path, no environment-specific profile files, and existing `info.app` metadata. Only the test profile has a separate configuration file. Docker/Compose do not establish a local-versus-production profile policy.
- `SecurityConfig` permits authentication and health/info, requires authentication elsewhere, disables CSRF and uses stateless JWT authentication. Its authentication entry point sends **401 with no JSON body**. `JwtAuthenticationFilter` leaves missing/invalid credentials unauthenticated. Existing CORS configuration must remain unchanged.
- `GlobalExceptionHandler` returns `common.exception.ErrorResponse`: `status`, `message`, and nullable `errors` (a field-to-message map). Validation/binding/business failures use 400, owned/not-found resources use 404, selected conflicts use 409; bad login credentials produce **401 with ErrorResponse**, unlike filter-level 401. Unexpected application failures use sanitized 500. There is no universal Problem Details response.
- `PaginationConfig` configures zero-based pages, fallback size 20 and maximum size 100. Controllers return Spring `Page` directly; there is no `VIA_DTO` serialization setting. Documentation must describe current serialization rather than introducing a page wrapper.
- Reference tests include `common/security/SecurityIntegrationTest`, each domain's controller/integration tests, and PostgreSQL Testcontainers integration tests. Existing `ANALYTICS_API.md`, `DASHBOARD_API.md` and `RECURRING_TRANSACTIONS.md` explain domain semantics and should remain useful linked references.

### Complete operation inventory

All financial operations require JWT; authentication operations are public. Every protected operation documents bodyless 401 in addition to the statuses below. All operations can encounter the existing sanitized 500; document it centrally without suggesting guaranteed successful execution. DTO names below are existing classes, not proposed replacements.

| Tag / operation | Success body/status | Application errors to document |
| --- | --- | --- |
| Authentication: POST `/api/v1/auth/register` | 201 `AuthResponse` | 400 validation/body, 409 email conflict |
| Authentication: POST `/api/v1/auth/login` | 200 `LoginResponse` | 400 validation/body, 401 JSON invalid credentials |
| Accounts: POST `/api/accounts` | 201 `AccountResponse` | 400, 409 name conflict |
| Accounts: GET `/api/accounts` | 200 array of `AccountResponse` | No domain 404/409 |
| Accounts: GET `/api/accounts/{id}` | 200 `AccountResponse` | 400 binding, 404 |
| Accounts: PUT `/api/accounts/{id}` | 200 `AccountResponse` | 400, 404, 409 |
| Accounts: DELETE `/api/accounts/{id}` | 204, no body | 400 binding, 404 |
| Categories: POST `/api/categories` | 201 `CategoryResponse` | 400, 409 name/type conflict |
| Categories: GET `/api/categories` | 200 array of `CategoryResponse` | No domain 404/409 |
| Categories: GET `/api/categories/{id}` | 200 `CategoryResponse` | 400 binding, 404 |
| Categories: PUT `/api/categories/{id}` | 200 `CategoryResponse` | 400, 404, 409 |
| Categories: DELETE `/api/categories/{id}` | 204, no body | 400 binding, 404 |
| Transactions: POST `/api/transactions` | 201 `TransactionResponse` | 400, 404 account/category |
| Transactions: GET `/api/transactions` | 200 page of `TransactionResponse` | 400 filters/pagination |
| Transactions: GET `/api/transactions/{id}` | 200 `TransactionResponse` | 400 binding, 404 |
| Transactions: PUT `/api/transactions/{id}` | 200 `TransactionResponse` | 400, 404 |
| Transactions: DELETE `/api/transactions/{id}` | 204, no body | 400 binding, 404 |
| Budgets: POST `/api/budgets` | 201 `BudgetResponse` | 400, 404 category, 409 duplicate period/category |
| Budgets: GET `/api/budgets` | 200 array of `BudgetResponse` | 400 required year/month |
| Budgets: GET `/api/budgets/{id}` | 200 `BudgetResponse` | 400 binding, 404 |
| Budgets: PUT `/api/budgets/{id}` | 200 `BudgetResponse` | 400, 404 |
| Budgets: DELETE `/api/budgets/{id}` | 204, no body | 400 binding, 404 |
| Recurring Transactions: POST `/api/recurring-transactions` | 201 `RecurringTransactionResponse` | 400, 404 account/category |
| Recurring Transactions: GET `/api/recurring-transactions` | 200 page of `RecurringTransactionResponse` | 400 filters/pagination |
| Recurring Transactions: GET `/api/recurring-transactions/{id}` | 200 `RecurringTransactionResponse` | 400, 404 |
| Recurring Transactions: PUT `/api/recurring-transactions/{id}` | 200 `RecurringTransactionResponse` | 400, 404, 409 lifecycle/backlog |
| Recurring Transactions: DELETE `/api/recurring-transactions/{id}` | 204, no body | 400, 404 |
| Recurring Transactions: POST `/api/recurring-transactions/{id}/pause` | 200 `RecurringTransactionResponse` | 400, 404, 409 |
| Recurring Transactions: POST `/api/recurring-transactions/{id}/resume` | 200 `RecurringTransactionResponse` | 400, 404, 409 |
| Dashboard: GET `/api/dashboard` | 200 `DashboardResponse` | 400 required year/month |
| Analytics: GET `/api/analytics/summary` | 200 `SummaryResponse` | 400 range |
| Analytics: GET `/api/analytics/categories` | 200 `CategoriesResponse` | 400 range |
| Analytics: GET `/api/analytics/accounts` | 200 `AccountsResponse` | 400 range |
| Analytics: GET `/api/analytics/trends` | 200 `TrendsResponse` | 400 range/grouping |
| Analytics: GET `/api/analytics/comparison` | 200 `ComparisonResponse` | 400 independent ranges |

### Parameters, schemas and business descriptions

- Path IDs are numeric resource identifiers. Do not universally add `minimum: 1` where the current controller/service does not enforce it. Ownership is derived from JWT, never a client user ID; foreign owned resources follow existing not-found behavior.
- Transaction list: optional `type`, `accountId`, `categoryId`, inclusive ISO `from`/`to`, and `page`, `size`, repeatable `sort`. Document accepted sorting (`transactionDate`, `amount`, `createdAt`, `updatedAt`), default date descending and existing pagination behavior. Filter IDs do not cause resource lookups: nonexistent/foreign IDs return an empty owned page, not 404.
- Recurring list: optional `status`, `type`, `accountId`, `categoryId`, pagination and sorting (`createdAt`, `updatedAt`, `nextDueDate`), default `createdAt` descending with controller-added ID descending tie-breaker. The same filter-versus-resource distinction applies.
- Budget list and Dashboard require both `year` (1–9999) and `month` (1–12); no current-month default. Preserve monthly budget calculations and Dashboard's balance, monthly totals, compact budgets, latest five transactions and pending recurring preview. Do not add Analytics sections to Dashboard.
- Analytics summary/categories/accounts require `from` and `to`; trends also requires `grouping` (`DAILY`, `WEEKLY`, `MONTHLY`); comparison additionally requires `compareFrom`, `compareTo`. Dates are inclusive, support public years 1–9999 and future persisted actuals, and require start <= end. Summary/breakdowns/comparison sides/monthly trends require end < start.plusYears(5); weekly trends require end < start.plusYears(2); daily trends permit at most 366 inclusive days. Preserve approved anniversary/leap-day semantics in plan 003 and actual validator. Describe stable-ID/current-metadata historical groups, inactive references, zero-filled clipped buckets, Monday weeks, raw totals and signed comparison deltas. No optional selectors, forecasts, percentages, pagination or inferred comparison periods.
- Accounts: creation includes name, type and opening balance; update includes name/type only. Listing returns active owned accounts; deletion deactivates. Do not invent currency fields or an amount precision/minimum constraint absent from the request DTO.
- Categories: active system categories are readable alongside active owned custom categories. Only owned custom active categories may be edited/deactivated; inaccessible/system mutations follow existing 404. Type is immutable. Transaction deletion is hard deletion; budget deletion removes its definition. Describe these differences in operation text.
- Recurring templates materialize ordinary editable/deletable transactions through an internal worker. No public worker endpoint. Describe interval-one frequencies, preserved calendar anchor/clamping, timezone-scoped start-date validation, inclusive optional end date, lifecycle states, paused skips versus blocked catch-up, terminal conflicts, future-only template edits and durable occurrence identity. Existing update behavior also restricts due-backlog association changes except BLOCKED repair; document actual implementation, without loosening it. Schedule/type fields are not update fields; deletion cancels and retains the template.

| Request metadata | Existing constraints to retain/document |
| --- | --- |
| Register | name nonblank/max100; email nonblank/email; password nonblank/8–100 |
| Login | email nonblank/email; password nonblank (no register minimum) |
| Account create/update | name nonblank/max100; type required; creation openingBalance required, signed values allowed |
| Category create/update | name nonblank/max100; creation type required; update name only |
| Transaction create/update | account/category/type/amount/date required; amount >=0.01; description optional/max500; date past-or-present under existing manual-transaction clock |
| Budget create/update | amount >=0.01, Digits(17,2); creation category positive, year1–9999/month1–12; update amount only |
| Recurring create/update | required positive account/category; amount >=0.01, Digits(17,2); optional description/max500; creation type/frequency/start required; schedule relationships checked by service; update financial payload uses existing required fields |

Infer DTO fields and enums from existing Java types and Bean Validation. Add documentation-only descriptions for constraints generation cannot express reliably (cross-field dates, lifecycle, ownership, timezone, immutable fields). Do not add validation annotations to make generated schemas prettier. Password is write-only/password-format in documentation; login returns accessToken/tokenType, whereas registration returns identity without a token.

Money stays JSON numeric/BigDecimal, without `double` format, currency claims or universal two-decimal restrictions on aggregate responses. IDs/counts use appropriate integer widths. Dates use ISO date; LocalDateTime timestamps are local ISO timestamps without an offset guarantee, not newly defined UTC instants. Preserve nullability of optional recurring dates/reasons and ErrorResponse.errors. Resolve all nested DTO schema references without collisions. Check actual page JSON: springdoc must not advertise a different PagedModel envelope; correct the schema with documentation-only customization if necessary, never change runtime pagination serialization.

## Library / UI Recommendation

Recommend pinned **`org.springdoc:springdoc-openapi-starter-webmvc-ui:3.1.1`**, generating OpenAPI with Swagger UI served by the backend. [Springdoc's documentation](https://springdoc.org/) identifies the WebMVC UI starter and Boot 4 support. The [3.1.1 release POM](https://raw.githubusercontent.com/springdoc/springdoc-openapi/v3.1.1/pom.xml) uses Boot **4.1.0**: this is concrete alignment with this application's 4.1.1 patch line, rather than an assumption that a Boot 3 starter works. Exact application compatibility remains an implementation smoke-test/dependency-resolution gate, not a claim of tests already run.

| UI | Assessment for this feature |
| --- | --- |
| Swagger UI — recommended | Bundled WebMVC starter, same-origin assets, interactive operations and Bearer Authorize; little integration code and no frontend application needed |
| Scalar | Valid alternative: springdoc 3.1.1 also contains a WebMVC Scalar starter. Its presentation is attractive, but switching UI brings no required contract capability advantage here |
| Redoc | Good reference-document presentation; introduces another page/hosting integration for this application. Redoc's project distinguishes its reference UI from additional hosted features including Try-it; it is less direct for this task's interactive JWT workflow |

Underlying OpenAPI remains independent of the chosen UI. See [Scalar's integration documentation](https://scalar.com/docs-for/spring-boot) and [Redoc's official project](https://github.com/Redocly/redoc); the springdoc release source is the compatibility reference for its own Scalar starter. Do not add multiple UIs, Springfox, client generation or a separate static specification maintenance pipeline.

## Documentation Architecture

Use one code-first generated document, filtered to the eight controller packages above, with eight logical tags matching the inventory. Do not create new API versions or expose legacy Expense/Actuator operations accidentally. Authentication is explicitly included despite its v1 path.

Propose `common/config/OpenApiConfig.java` for metadata, HTTP bearer/JWT security scheme, reusable error response components, and small documentation customizers. Reuse existing application info where appropriate; the document title can be CoinTrail V2 API without changing `info.app.version` or endpoint routing. Use relative same-origin server metadata, avoiding hard-coded deployment hosts.

Keep controllers readable: one tag per controller and concise operation summaries/descriptions, with targeted parameter documentation only where necessary. Infer request bodies, success schemas, DTO fields, enums and Bean Validation. Centralize repetitive ErrorResponse components and operation-specific response assignment in a small handler-aware customizer, using this explicit inventory rather than rules such as every GET has 404. Reuse components, not a repeated block of response annotations per method. Avoid duplicate annotated controller interfaces, a generic documentation framework, or annotation copies of every DTO property. Tests must catch missing operation metadata and status mistakes when endpoints change.

Set `springdoc.override-with-generic-response=false`: automatic ControllerAdvice expansion would misleadingly attach unrelated 404/409 errors to Analytics/Dashboard/authentication. Add only applicable responses, retaining declared 201/204 and removing inferred 200 from those operations if necessary. ErrorResponse is an object schema, not Problem Details; use separate reusable bodyless SecurityUnauthorized and JSON LoginUnauthorized responses, plus representative validation/business error examples. No real tokens or user data in examples.

The [springdoc properties reference](https://springdoc.org/properties.html) documents its generation/UI switches and customization settings. Implementation must verify generated behavior and property names against the pinned release. Do not replace the application's Jackson converters or upgrade Boot, Java, Security, Flyway or existing DTOs to resolve a documentation problem.

### Proposed URLs and configuration

| Purpose | Local URL when enabled |
| --- | --- |
| Interactive entry | `http://localhost:8081/swagger-ui.html` (redirects to `/swagger-ui/index.html`) |
| JSON contract | `http://localhost:8081/v3/api-docs` |
| YAML contract | `http://localhost:8081/v3/api-docs.yaml` |
| UI bootstrap configuration | `http://localhost:8081/v3/api-docs/swagger-config` |

The `/v3` prefix belongs to the documentation integration; it does not version CoinTrail endpoints. Keep these standard URLs unless approval changes D1. Configure explicit native `springdoc.api-docs.path` and `springdoc.swagger-ui.path`, package scanning, generic response behavior and nonpersistent authorization. Disable external validation requests and use locally served UI assets. Do not configure production host URLs or change CORS/forwarded-header policy.

Recommend one opt-in `app.api-docs.enabled=${API_DOCS_ENABLED:false}` switch, driving both `springdoc.api-docs.enabled` and `springdoc.swagger-ui.enabled`, conditional custom configuration and security access. Local/dev users enable it explicitly with `API_DOCS_ENABLED=true`; production leaves it false/unset. Existing environment configuration has no trustworthy profile boundary, so do not silently assume “no profile” means development. Do not introduce multiple independently conflicting exposure switches or a profile hierarchy just for documentation.

### JWT and exposure

Declare an OpenAPI HTTP security scheme (`type: http`, `scheme: bearer`, `bearerFormat: JWT`) and default Bearer requirement; override authentication operations with empty security requirements. [OpenAPI Bearer guidance](https://swagger.io/docs/specification/v3_0/authentication/bearer-authentication/) supports this model. Users log in, copy accessToken, and use Authorize; no OAuth flow or automatic token acquisition is implied. Keep authorization persistence disabled. Try-it is available for documented operations when enabled, including mutations, with no automatic execution and clear deletion/cancellation descriptions.

When enabled, allow anonymous GET/HEAD for documentation JSON/YAML, bootstrap and required UI paths/assets, so the page loads before Authorize. Restrict matchers to `/v3/api-docs`, `/v3/api-docs.yaml`, `/v3/api-docs/**`, `/swagger-ui.html`, `/swagger-ui/**`; verify actual asset routes and extend only if the starter requires a narrowly scoped additional route. Never permit `/api/**` or all `/webjars/**`. Keep financial APIs JWT-protected, auth/health/info access unchanged, and existing filter/entry-point behavior intact.

When disabled, disable generator and UI and deny documentation paths including assets, even to authenticated users. This avoids a packaged static UI remaining exposed. Under existing security this can yield anonymous 401/authenticated 403; do not promise a new JSON error or 404 contract. No new admin role, public production docs, gateway or documentation login feature is proposed. Production exposure later would require an explicit policy review.

## Business Rules

- [x] D1–D3 approved before implementation; preserve every existing financial/authentication contract.
- [x] Generated documentation covers exactly the eight approved domains and their 35 operations; no legacy Expense, Actuator, worker or documentation endpoints in the business specification.
- [x] Authentication operations remain public; all financial operations remain owner-isolated and JWT-protected.
- [x] Document actual validation, pagination, decimal/date semantics and distinct security/application error bodies.
- [x] Documentation does not introduce API versioning, client generation, DTO redesign, financial logic changes, migrations or frontend work.
- [x] Production is disabled by default; public documentation is available only under the approved opt-in policy.

## Approved Decisions

| ID | Final approved contract |
| --- | --- |
| D1 | Use generated OpenAPI with the pinned springdoc WebMVC Swagger UI starter, standard URLs and one same-origin interactive UI; permit Try-it for all documented methods, with nonpersistent Bearer authorization |
| D2 | Publish one V2-focused document with the eight tags/35 operations, explicitly including existing `/api/v1/auth` and excluding legacy Expense and Actuator |
| D3 | Public documentation only when explicitly enabled; one opt-in environment switch defaults false in every environment, local/dev enables it, production leaves it disabled; deny disabled documentation/asset paths even to authenticated users |

There are no unresolved product decisions. D1–D3 are final documentation scope/UI/exposure decisions, not permission to alter existing API behavior. Exact dependency compatibility, page schema shape and UI asset routes are technical verification tasks; if they require material scope or API/security changes, stop for approval rather than changing the design silently.

## Phase 1 — Database / Domain

- [x] Confirm approved D1–D3 and baseline inventory before implementation.
- [x] Add only the pinned WebMVC UI starter and resolve its dependency tree; smoke-test generated JSON under current Boot 4.1.1/Java25/Jackson3.
- [x] Identify inferred DTO/validation metadata gaps, actual page serialization and nested-schema collisions. Plan documentation-only overrides where required.
- [x] No entity, repository, schema, Flyway or financial domain changes are necessary; no migration is proposed.

## Phase 2 — Repository / Service

- [x] No repository queries or service business-logic changes. Keep generation independent of financial record loading and recurring processing.
- [x] Introduce OpenAPI metadata/security/error components and focused customizers in existing common configuration conventions.
- [x] Filter controller packages, maintain operation-specific response coverage, and preserve existing application converters/serialization.

## Phase 3 — API

- [x] Configure opt-in generation/UI and narrowly scoped conditional security matchers, without changing JWT/CORS/financial authorization.
- [x] Add concise tags/summaries/descriptions to all 35 operations; document query/path parameters, pageable defaults/sorts and applicable responses.
- [x] Add targeted documentation-only DTO schema metadata where inference is insufficient; preserve all runtime validation and return types.
- [x] Verify 201/204 bodies, login versus filter 401, reusable ErrorResponse shape, local timestamps, decimals, optional fields and page schema accuracy.
- [x] Add a concise README section with enabling instructions, URLs, login/Authorize workflow, production policy and links to existing domain documents.

## Phase 4 — Testing

- [x] Add enabled documentation integration tests using existing `@SpringBootTest`, MockMvc, real security, test profile and PostgreSQL Testcontainers conventions. Use class-local property overrides, not globally enabled docs in all tests.
- [x] Assert JSON and YAML contracts, UI redirect/HTML, bootstrap and real JS/CSS asset accessibility anonymously when enabled. Validate content types; test HEAD where relevant.
- [x] Assert exactly 35 expected operations/eight tags, exclusion of legacy/Actuator, bearer scheme and auth overrides, stable operation IDs, documented parameters/requiredness/enums/constraints, success/error statuses and schema references. Verify no User/password-hash/entity schema leakage.
- [x] Check generated page schemas against actual transaction/recurring page JSON, including pagination metadata, without introducing a wrapper. Check nested Dashboard/Analytics schemas, BigDecimal numeric representation and local-date/time descriptions.
- [x] Compare representative runtime 400/404/409 JSON and login 401 to ErrorResponse documentation; verify filter-level 401 has no claimed JSON body. Do not create artificial errors on operations that cannot produce them.
- [x] Ensure enabling public docs leaves financial routes protected: missing/malformed JWT fails, valid login-derived JWT succeeds, ownership remains unchanged. Registration/login and health/info remain accessible as before.
- [x] Add a separate default-disabled integration context: JSON/YAML/UI/bootstrap/assets are inaccessible for anonymous and authenticated requests, and no documentation content is served. Verify both native generation/UI switches follow the single opt-in switch.
- [x] Add focused customizer unit tests only if meaningful logic warrants them; no new domain service/repository tests for documentation-only work. Existing suites provide regression coverage.
- [x] Prefer structural assertions over a giant generated-document snapshot. Include coverage detection so adding a business operation later requires documentation maintenance.

## Phase 5 — Verification

- [x] Run targeted new documentation/security tests while implementing; inspect dependency tree for conflicting Spring/Boot/Jackson versions and unexpected integration dependencies.
- [x] Manually smoke-test same-origin Swagger UI and Authorize against a local disposable account, including a protected read; confirm required assets load without external UI hosting and tokens do not persist.
- [x] Run final `mvn clean verify` from `cointrail-api` with Java25 and Docker/Testcontainers available. Record actual results in this plan, not earlier feature results.
- [x] Inspect generated specification and complete diff; confirm no endpoint/DTO behavior, schema/migration, frontend, unrelated refactor or AGENTS/skills changes.
- [x] Record exact version, routes, security behavior, tests and any approved deviations; only mark tasks completed after implementation and validation.

## Expected Files

Existing files likely modified during approved implementation:

- `cointrail-api/pom.xml`: one integration dependency.
- `cointrail-api/src/main/resources/application.yml`: docs switches/settings only.
- `cointrail-api/src/main/java/com/deepak/cointrailapi/common/security/SecurityConfig.java`: conditional documentation matchers only.
- The eight existing domain controllers: documentation annotations/parameter metadata only.
- Selected existing request/response DTO files: documentation-only schema gaps; avoid blanket edits.
- `README.md`: concise API documentation usage section.
- This plan: execution and verification evidence.

Proposed new files, following existing common configuration/test package placement:

- `cointrail-api/src/main/java/com/deepak/cointrailapi/common/config/OpenApiConfig.java`.
- A small documentation helper under `common` only if customizer size requires it; do not pre-create a framework.
- `cointrail-api/src/test/java/com/deepak/cointrailapi/common/documentation/OpenApiDocumentationIntegrationTest.java`.
- `cointrail-api/src/test/java/com/deepak/cointrailapi/common/documentation/OpenApiDocumentationDisabledIntegrationTest.java`.
- Focused customizer test only if needed.

No production/test files were changed during original planning. Implementation changed only the listed documentation/configuration/security files and added the two documentation integration test classes. No migration, frontend change, generated client, new service/repository or build-time specification export was added. The test-only generated JSON artifact lives under ignored `target/` for inspection; it is not a shipped specification or export pipeline.

## Implementation Notes

Library evidence was inspected from official sources during planning on 2026-10-04. Subsequent implementation resolved the pinned starter and passed an isolated full-context compatibility gate on Boot 4.1.1 / Java 25.0.4 / Jackson 3.1.5, including Flyway/JPA, real login and generated JSON. Existing Boot/Jackson/Security versions and converters were preserved. Jackson 2 remains present for existing JJWT and Swagger internals; it does not replace the application's Jackson 3 mapper.

Documentation descriptions must follow actual code, especially subtle differences between inactive account/category access, list filters versus owned-resource lookup, recurring backlog edits, manual versus recurring clocks, and raw page serialization. Generated annotations alone do not fully capture these semantics.

Original planning verification: only this numbered plan changed; no tests were executed and no branch, commit, push or PR was created during planning. D1–D3 have subsequently been approved; implementation is authorized.

### Execution and verification evidence

- Initial compatibility gate: one integration test passed; Maven dependency resolution/compilation succeeded.
- Enabled/disabled structural suite: all eight tests passed in the final targeted packaging run, including direct-WebJar denial, zero failures/errors/skips; `mvn -B -Dtest=OpenApiDocumentation*Test package` reported BUILD SUCCESS.
- Generated OpenAPI is 3.1.0. Raw PageTransactionResponse/PageRecurringTransactionResponse schemas match existing Page JSON; no pagination override or runtime envelope change was needed.
- Generated success media types are documented as JSON instead of springdoc's inferred wildcard. Password metadata, local timestamp descriptions, nullable recurring fields and Digits descriptions are documentation-only; digit limits are read from existing annotations.
- Reusable map-valued ErrorResponse components are installed in the post-generation OpenApiCustomizer. This avoids a warning from the starter's initial metadata-cloning path without changing application Jackson configuration or HTTP behavior.
- Direct `/webjars/swagger-ui/**` access is denied in addition to documentation paths, preventing authenticated bypass of disabled asset exposure. Enabled UI uses the tested `/swagger-ui/**` paths; no broad WebJar allowlist is introduced.
- Browser UI smoke test passed with `API_DOCS_ENABLED=true`, a packaged application on disposable local port 18081 and a disposable PostgreSQL 17 container: Chromium displayed 35 operations; registration 201 and login 200 through Try-it; copied JWT into Authorize; protected GET accounts 200 with the expected Bearer header; reload cleared authorization and no browser errors occurred. Temporary browser tooling stayed outside the repository; application/database were stopped after the check.
- Final `mvn -B clean verify` passed: **482 tests, 0 failures, 0 errors, 0 skips**, BUILD SUCCESS, 8 minutes 58 seconds. Independently totaled all 39 Surefire XML reports to confirm the result. The existing 474-test baseline and eight new documentation tests all pass.
- Complete tracked diff and all new files were reviewed. `git diff --check` passed. No migrations, frontend, legacy implementation, repositories/services, existing validation/error handlers/JWT filter, AGENTS or skill files changed. No application converter/framework-version changes were necessary; no material compatibility deviations or unresolved decisions remain.
- Eight new integration tests cover generated operation/schema/security contracts, response distinctions, existing page serialization, public documentation routes, default-disabled routes/assets and real JWT/ownership behavior. Separate service/repository/customizer unit suites were unnecessary for metadata-only work; existing domain/security suites passed in full.
