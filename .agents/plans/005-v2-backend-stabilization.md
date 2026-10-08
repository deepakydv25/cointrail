# V2 Backend Stabilization

## Goal

Make the smallest backend corrections needed before frontend V2 migration: forward required Compose settings, reject monetary values that cannot be preserved by existing storage, return documented conflicts for narrowly identified uniqueness races, correct Dashboard nullability documentation, align pagination testing with production, and use the required Maven verification lifecycle in CI.

Status: **implemented and verified; ready for pull request review**. The user approved the scoped implementation and authorized commit, push and PR creation targeting develop after successful verification. Never merge.

## Existing State

Inspection baseline: clean checkout at `f689d8f` (PR #16 merge). Existing plans are numbered 000–004; 005 is the next number. Paths below are repository-relative; Java paths use `cointrail-api/src/main/java/com/deepak/cointrailapi/`, with equivalent test paths under `src/test/java/`.

### Verified audit findings

| Area | Repository evidence | Proposed correction |
| --- | --- | --- |
| Compose | Both `compose.yml` and `cointrail-api/compose.yml` forward JWT/database settings but no recurring or documentation settings. `cointrail-api/src/main/resources/application.yml` requires `${RECURRING_TIMEZONE}` and defaults scheduler/docs to false. `recurringtransaction/RecurringTransactionSchedulingConfig.java` constructs a Clock and validates the zone even when scheduling is disabled. | Forward an explicitly required timezone and opt-in booleans in both Compose files. |
| Money | `transaction/dto/CreateTransactionRequest.java` and `UpdateTransactionRequest.java` have `@NotNull`/`@DecimalMin("0.01")`, but no digit limit. `account/dto/CreateAccountRequest.java` has only `@NotNull` on openingBalance. V8/V9 store both as NUMERIC(19,2). Budget/Recurring DTOs already use `@Digits(integer=17, fraction=2)`. | Add the same digit limits at these request boundaries; retain existing minimum and signed-balance behavior. |
| Duplicate races | `account/AccountServiceImpl.java`, `category/CategoryServiceImpl.java` and `auth/AuthServiceImpl.java` check existence then save. Database uniqueness prevents duplicate data, but there is no narrow integrity-error translation. `common/exception/GlobalExceptionHandler.java` already maps the three domain duplicate exceptions to JSON 409 and falls back to generic 500 for other exceptions. | Flush within scoped write catches and translate only the relevant named unique violations to the existing domain exceptions. |
| OpenAPI | `dashboard/DashboardDetails.java` defines `PendingRecurringTransaction.blockedReason`; ACTIVE items have no blocked reason. `common/config/OpenApiConfig.java` explicitly marks blockedReason nullable only for RecurringTransactionResponse. | Extend documentation-only nullability to the Dashboard pending item. Verify its generated schema reference rather than guessing schema naming. |
| Pagination | `common/config/PaginationConfig.java` caps resolved sizes at 100. `transaction/TransactionControllerTest.java` imports only PageableValidator and expects size=101 to return 400. Production and OpenAPI promise capping. | Import production PaginationConfig in the slice and assert size=100 reaches the service with HTTP 200. |
| CI | `.github/workflows/ci.yml` runs `./mvnw clean test`. Backend Docker packaging runs `clean package -DskipTests`; image builds depend on backend/frontend jobs. The POM has the Spring Boot Maven plugin and no explicit Failsafe configuration; existing IntegrationTest classes run through Surefire. | Change only the backend verification command to `./mvnw clean verify` and its step label if helpful. Preserve triggers, frontend job, Docker jobs/dependencies and Dockerfiles. |

### Database inspection

All existing migrations V1–V12 were read. Latest numeric migration is **V12**. V1–V5 establish legacy Expenses and Users; V6–V7 establish and seed Categories; V8 Accounts; V9 Transactions; V10 category uniqueness; V11 Budgets; V12 recurring templates/occurrences. No schema change or new migration is needed.

| Write boundary | Actual migration declaration / name | Translation scope |
| --- | --- | --- |
| Account create/update | V8: unique expression index `uq_accounts_user_name` on `(user_id, LOWER(name))` | SQLSTATE 23505 plus this exact name, only around Account create/update persistence. |
| Custom Category create/rename | V10: partial unique index `uq_categories_user_name_type` on `(user_id, LOWER(name), type)` WHERE system=false | SQLSTATE 23505 plus this exact name, only around custom Category create/update persistence. |
| System Categories | V10: `uq_categories_system_name_type` WHERE system=true | Record as a real index, but do not add public system-category mutation or catch unrelated system writes. Existing system-name duplicate prechecks remain. |
| Registration | V3: inline unnamed `users.email ... UNIQUE` | PostgreSQL normally assigns `users_email_key`. This is a derived name, not an explicitly named SQL constraint: confirm it from a Flyway-created PostgreSQL catalog and real duplicate exception before relying on it. Translate only that exact confirmed name and 23505 in registration. |

Database case-insensitive Account/Category uniqueness and case-sensitive email uniqueness remain unchanged, including inactive-name reservation and current system-name eligibility checks. Do not normalize emails, rename indexes, change category ownership/type rules, or try to enforce a new cross-system/custom uniqueness policy.

### Reference patterns and tests

`budget/BudgetServiceImpl.java` uses `saveAndFlush`, catches DataIntegrityViolationException, walks causes for Hibernate ConstraintViolationException, and matches both SQLSTATE 23505 and its constraint name. Reuse that small approach locally rather than building a global translation framework. The three existing duplicate exceptions currently have message-only constructors; cause-preserving constructors may be added if needed without changing response messages.

Account/Category service tests use MockitoExtension and clear the security context; controller slices use Boot 4 WebMvcTest/MockMvc with mocked services. Account/Category repository tests use PostgreSQL 17 Testcontainers, ServiceConnection, Flyway and saveAndFlush. Existing Account/Category/Transaction integration suites and common/security/SecurityIntegrationTest exercise real JWT flows. There is no existing dedicated AuthServiceImplTest; a small proposed auth unit suite should follow these existing service conventions.

`common/documentation/OpenApiDocumentationIntegrationTest.java` already validates the 35 operations/eight tags, security, response envelopes, UI assets, nullable recurring fields and actual raw page serialization. Its companion DisabledIntegrationTest covers disabled generator/UI/assets for anonymous and authenticated callers.

Historical plan 004 records 482 passing tests for PR #16. The previous audit also found later local Surefire artifacts with 18 Docker/Testcontainers initialization errors. Neither is a new verification run for this plan. Docker availability/image access is a verification prerequisite, not evidence of an application failure or a reason to skip database tests.

## Business Rules

- [x] Transaction amount remains required and at least 0.01; add at most 17 integer and 2 fractional digits to create/update requests.
- [x] Opening balance remains required, accepts negative/zero/positive values, and gains the same digit limits. It remains creation-only.
- [x] Reject excess scale/precision with existing validation ErrorResponse/400; do not round silently, clamp amounts, change serialization, or alter existing stored rows.
- [x] Preserve request ownership derivation, 404 isolation, category/account eligibility, manual dates and recurring timezone boundaries.
- [x] Preserve duplicate prechecks/messages; translate only confirmed domain-specific unique violations to existing JSON 409 responses. Rethrow all other integrity exceptions.
- [x] Keep timezone explicit and stable for existing recurring series. Scheduler enablement and public documentation remain opt-in and false by default.
- [x] Keep raw pages, size cap 100, default size 20, zero-based pages, allowed sorting and all API paths unchanged.
- [x] OpenAPI fixes are metadata-only; pending ACTIVE items permit null blockedReason and BLOCKED items retain their existing reason.
- [x] No existing migration edits, new migration, dependency/framework upgrade, frontend implementation or legacy Expense conversion.

## Phase 1 — Database / Domain

- [x] Reconfirm V12 is latest at implementation start; keep migrations/entities/repositories' public contracts unchanged.
- [x] In a disposable migrated PostgreSQL database, confirm unique names via pg_constraint/pg_indexes and inspect real Hibernate exception metadata, especially the generated email name.
- [x] Add `@Digits(integer = 17, fraction = 2)` with clear field-specific messages to Transaction create/update amount and Account openingBalance. Reuse the Budget DTO convention; no minimum annotation on signed openingBalance.
- [x] Preserve current @NotNull, @DecimalMin, date and description validation; do not add unrelated ID/date restrictions or introduce a money abstraction.

## Phase 2 — Repository / Service

- [x] Account create/update: use saveAndFlush within a narrow DataIntegrityViolationException catch; map only 23505/uq_accounts_user_name to AccountAlreadyExistsException with the current duplicate message.
- [x] Custom Category create/update: likewise map only 23505/uq_categories_user_name_type to CategoryAlreadyExistsException with the current message.
- [x] Registration: flush within the service's transactional method and map only 23505/the confirmed users email constraint to EmailAlreadyExistsException with the current message.
- [x] Walk the cause chain using the existing Budget implementation pattern. Do not parse error-message substrings, translate all 23505 errors, or register a generic integrity handler.
- [x] Let translated exceptions propagate out of the transactional boundary for rollback; do not query/retry/continue in a transaction after a failed flush. Flushing inside the catch is essential because deferred update errors at transaction commit otherwise escape service translation.
- [x] Keep other saves, deactivation, login, prechecks and uniqueness semantics intact. Use small private methods/constants in the affected services; add message/cause exception constructors only if used.

## Phase 3 — API / Configuration / CI

- [x] Add this environment mapping to the API service in **both** Compose files:

  ```yaml
  RECURRING_TIMEZONE: ${RECURRING_TIMEZONE:?Set RECURRING_TIMEZONE to the stable IANA timezone for this deployment}
  RECURRING_ENABLED: ${RECURRING_ENABLED:-false}
  API_DOCS_ENABLED: ${API_DOCS_ENABLED:-false}
  ```

- [x] Keep application.yml's existing required zone and false defaults. Do not silently choose UTC for an existing deployment or enable job/docs in production. Document UTC as a disposable/local example, not a production fallback.
- [x] Leave cadence/batch defaults, CORS settings, ports, JWT/database wiring and frontend build arguments unchanged. Do not alter tracked/untracked .env secrets. Add concise README startup instructions for the required setting, optional opt-ins and stable-zone warning.
- [x] Extend OpenApiConfig's existing targeted nullability customization for Dashboard pending blockedReason. Resolve the actual schema through the Dashboard response during verification. Extend its existing Digits documentation loop to the three modified money DTOs if inference lacks an accurate limit description; do not change runtime DTO serialization.
- [x] Import PaginationConfig alongside PageableValidator in TransactionControllerTest; replace the misleading over-size rejection test with a cap assertion. Keep the production validator and resolver unchanged.
- [x] Change the backend CI command to `./mvnw clean verify`; retain Java 25, cache, wrapper permissions, triggers and all Docker/frontend build behavior. Do not add Failsafe, coverage gates, deployment infrastructure or a new CI job.

## Phase 4 — Testing

- [x] Controller validation: Transaction POST/PUT reject 3 fractional digits and 18 integer digits with 400 before service invocation; accept 0.01 and 99999999999999999.99. Retain zero/negative rejection. Account POST accepts signed limits, zero and ordinary negatives; rejects excess precision/scale and null. Keep dates/resources otherwise valid.
- [x] Persist/read representative valid boundary values through real PostgreSQL integration paths to prove exact storage and API behavior. Avoid adding a redundant database rounding-policy test or weakening existing constraints.
- [x] Service tests: after duplicate precheck reports false, inject real-shaped wrapped Hibernate unique exceptions at flush. Cover Account create/update, Category create/rename and registration. Assert existing duplicate exception/message; mismatched constraint, wrong SQLSTATE, missing metadata and foreign-key/check/overflow exceptions remain unhandled by translation.
- [x] Extend existing Account/Category repository uniqueness tests to assert actual 23505/index names. Prove registration's actual constraint name in the existing security integration context or a narrowly scoped fixture; no new schema or standalone repository abstraction.
- [x] Real PostgreSQL race checks: in existing Account/Category integration suites and SecurityIntegrationTest, coordinate independent requests/transactions so both duplicate prechecks see absence before persistence. Assert one create/register succeeds, the other returns 409, and exactly one row remains. For rename collisions, coordinate two distinct owned resources targeting the same name; assert one rename succeeds and the losing write rolls back. Use bounded coordination and isolated unique test data, not timing sleeps; do not bypass authentication. Reuse existing fixture/cleanup conventions and avoid a generic concurrency framework.
- [x] Pagination: capture the service Pageable for size=101 and assert 100 with 200; retain size=20/page=0/default sort, size=100 and invalid-sort rejection. Include a full-context cap assertion in TransactionIntegrationTest if not already present.
- [x] Documentation: resolve the pending item schema from DashboardResponse and assert blockedReason permits string/null. Assert a runtime ACTIVE item has null and a BLOCKED item has its reason, using existing Dashboard integration fixtures. Verify monetary schema descriptions/limits reflect the new validation while signed opening balances remain allowed.
- [x] Run existing enabled/disabled Swagger suites unchanged except focused new schema assertions. Preserve route/assets denial, JWT protection, 35 operations, paths, raw page envelopes and security/application error distinctions.

## Phase 5 — Verification

- [x] Prerequisites: Java 25, Maven/wrapper, working Docker and postgres:17-alpine access. Investigate infrastructure failures without disabling/skipping Testcontainers tests.
- [x] Run focused unit/controller suites from cointrail-api:

  ```bash
  mvn -Dtest=AccountControllerTest,TransactionControllerTest,AccountServiceImplTest,CategoryServiceImplTest,AuthServiceImplTest test
  ```

- [x] Run affected PostgreSQL suites:

  ```bash
  mvn -Dtest=AccountRepositoryTest,CategoryRepositoryTest,AccountIntegrationTest,CategoryIntegrationTest,TransactionIntegrationTest,SecurityIntegrationTest,DashboardIntegrationTest,OpenApiDocumentationIntegrationTest,OpenApiDocumentationDisabledIntegrationTest test
  ```

- [x] Run mandatory final `mvn clean verify`; record actual totals, failures/errors/skips and packaging result. Do not reuse historical plan results or pre-existing target reports as the result.
- [x] For each Compose configuration, verify missing/empty timezone fails interpolation with a clear message; configured valid zone renders correctly and omitted booleans resolve false. Inspect only selected settings/redact secrets; do not publish complete rendered environment output.
- [x] Build/start both configurations sequentially against disposable data with explicit timezone/JWT. Use isolated project volumes and a temporary override outside tracked files if needed for fixed container names/ports. Never remove or reuse the user's existing database volume. Confirm Flyway V12, JPA validation, actuator health and correct clock configuration. Root stack still builds/serves the existing frontend without changing its API wiring.
- [x] Smoke-test scheduler false then explicit true on disposable data: false produces no automatic actuals; true posts one due occurrence without duplication. Account for normal poll cadence and preserve the selected zone between restarts.
- [x] JWT smoke: public registration/login, protected read missing/malformed token => bodyless 401, valid token => 200, second user's resource => 404. Check duplicate conflicts and precision errors use existing JSON envelopes.
- [x] Docs false/unset: JSON/YAML/UI/bootstrap/assets inaccessible for anonymous and authenticated callers. Explicit development true: Swagger redirect/UI/bootstrap/JS/CSS and JSON/YAML load; all financial routes remain protected. Browser Authorize enables a protected read and reload clears authorization. Return docs to disabled after the check.
- [x] Review complete diff and `git diff --check`; confirm only this plan and approved scoped implementation files changed, with no old migration/API path/business semantics/frontend/legacy/AGENTS/skill changes. Record results and any deviations before checking tasks complete.

## Expected Files

Existing files expected to change **only after plan approval**:

- `compose.yml`, `cointrail-api/compose.yml`, `.github/workflows/ci.yml`, and `README.md`.
- `cointrail-api/src/main/java/com/deepak/cointrailapi/transaction/dto/CreateTransactionRequest.java` and `UpdateTransactionRequest.java`.
- `cointrail-api/src/main/java/com/deepak/cointrailapi/account/dto/CreateAccountRequest.java`.
- `cointrail-api/src/main/java/com/deepak/cointrailapi/account/AccountServiceImpl.java`, `category/CategoryServiceImpl.java`, and `auth/AuthServiceImpl.java` (the latter two under the same package root).
- `cointrail-api/src/main/java/com/deepak/cointrailapi/common/config/OpenApiConfig.java`.
- The three existing `common/exception/*AlreadyExistsException.java` classes, only if cause constructors are used.
- Existing Account/Category service, repository and integration tests; AccountControllerTest; TransactionControllerTest/TransactionIntegrationTest; common/security/SecurityIntegrationTest; DashboardIntegrationTest; common/documentation/OpenApiDocumentationIntegrationTest, all under the inspected test package root.
- This plan, for implementation tracking and evidence.

Proposed new file: `cointrail-api/src/test/java/com/deepak/cointrailapi/auth/AuthServiceImplTest.java`, because no auth unit suite exists; follow the inspected Mockito service-test style. No other new production classes are anticipated. Existing DisabledIntegrationTest is a verification target, not an expected modification.

## Implementation Notes / Approval Decisions

1. **Plan and delivery approved.** The user authorized implementation and, after successful verification, commit/push/PR creation targeting develop. Never merge.
2. **Intentional validation tightening:** values exceeding 17 integer or 2 fractional digits will become 400 instead of database rounding/overflow behavior. This is the requested storage-alignment correction, not a change to sign/minimum semantics. Plan approval accepts that boundary; no additional monetary product decision is needed.
3. **Timezone/enablement are deployment choices:** the configuration requires an explicit stable zone and keeps both booleans false. No new business approval is needed to forward settings. Before deployment, obtain/confirm the existing zone; do not infer it from developer location or choose a different zone for existing series. Enabling scheduling is an explicit rollout action; production docs remain disabled absent separately approved exposure policy.
4. **Constraint metadata is a verification gate, not a product decision.** If a deployed schema genuinely differs from Flyway's declared/derived names, investigate rather than broadening translation or modifying applied migrations. Material schema/contract/security scope changes require a revised approved plan.
5. **Frontend API routing decision (deferred):** auth stays `/api/v1/auth`, V2 finance stays `/api/...`. Frontend migration must choose service/client URL construction that preserves both. Do not change frontend base URLs, services or backend routes here.
6. **Legacy Expense rollout decision (deferred):** legacy Expenses remain separate and absent from V2 totals. Before replacing existing screens, the user must choose legacy visibility and whether a separate, explicitly designed migration is wanted. No backfill, guessed account/category mapping or legacy endpoint removal is included here.
7. Deferred forecasts, transfers, banking/imports, currency conversion, notifications and other V3 capabilities remain out of scope. Health/logging hardening, auth-session redesign and release-version cleanup are also outside these seven stabilization items.

## Planning Verification

Only repository reads and creation of this plan were performed in the original planning turn. Implementation and delivery were subsequently explicitly approved; actual completion is tracked below.

## Execution Evidence

- Branch `fix/v2-backend-stabilization`; fetched origin/develop remains f689d8f. Original untracked Plan 005 retained and updated.
- Disposable PostgreSQL 17 catalog created from unchanged V1–V12 SQL confirmed users_email_key and all three Account/Category unique index names. No existing database volume used.
- Both Compose configurations reject missing timezone and render UTC plus scheduler/docs false for disposable local verification.
- Scoped DTO, service, documentation, pagination-test, Compose and CI corrections implemented. Focused regression verification passed: 130 tests, zero failures/errors/skips. Earlier enabled/disabled documentation, Dashboard, Transaction and Account repository suites also passed; the final full lifecycle passed as recorded below. Initial new-test fixture failures were diagnosed and corrected (Mockito re-stubbing, repository interface delegation and decimal JSON parsing) without changing application semantics or reducing assertions.
- Final `mvn -B clean verify` on Java 25 completed on 2026-10-08: **529 tests, zero failures/errors/skips; BUILD SUCCESS**, including JAR creation and Spring Boot repackaging (11:37). Fresh Surefire results include all existing and new suites. Log: `%TEMP%/cointrail-005-full-verify.log`; focused final log: `%TEMP%/cointrail-005-targeted-final.log`.
- Verification observation: Surefire forcibly terminated the fork after its 30-second JVM exit timeout following completed tests; shutdown logs also contain closed Testcontainers database connection warnings. Maven returned zero and packaged successfully. No test was skipped or configuration weakened; test-context shutdown cleanup can be investigated separately if this recurs in CI.
- Both Compose configurations rejected missing and empty timezone, rendered explicit UTC correctly, and kept omitted scheduler/docs flags false. Both built and started against an isolated project with temporary external overrides, distinct container names/ports and PostgreSQL tmpfs data; unchanged Flyway reached V12 successfully and JPA validation/health passed. The root stack also built and served the unchanged frontend.
- Disposable HTTP checks passed for registration/login, bodyless missing/malformed JWT 401, valid-token protected read 200, cross-user resource 404, duplicate 409, precision 400 and signed opening balances. Both configurations passed disabled documentation checks; packaged error dispatch returns bodyless 401/403 for authenticated denied docs depending on route.
- Explicit development opt-ins passed: scheduler posted due occurrences without duplicate occurrence keys; JSON/YAML and Swagger UI/bootstrap/assets loaded with 35 documented operations while financial routes remained JWT protected. Headless Chromium verified registration/login, Authorize and a protected read with the correct Bearer token; reload cleared authorization with no browser errors.
- All disposable catalog/root/backend-only containers and the isolated Compose network were removed after checks. No existing user database volume was used, deleted or recreated; smoke databases were tmpfs and overrides/scripts remained outside the repository.
- Complete production/test diff reviewed; `git diff --check` passed. Only approved stabilization files, the new auth unit test and this plan changed. No API paths, ownership/financial semantics, migrations, frontend files, legacy Expense production code, AGENTS.md or skills changed. No material design deviation required further approval. Frontend routing and legacy Expense migration remain explicit deferred decisions above.
