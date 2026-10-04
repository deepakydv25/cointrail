# CoinTrail V2 Recurring Transactions Backend

## Goal

Allow users to manage repeatable income/expense transaction templates and automatically materialize due occurrences as ordinary V2 Transactions. Preserve ownership isolation, historical transactions and live Budget calculations.

Status: implemented and verified on `feature/recurring-transactions`. All approved implementation phases and required checks are complete. D1-D10/R1-R3 remain unchanged; no unresolved product decisions. Commit, push and PR delivery targeting develop are authorized, with outcomes reported in the delivery report; never merge.

## Existing State

Investigation date: 2026-10-04. References below are relative to `cointrail-api/`, unless specified. Current working tree was clean before this plan (checked with a command-scoped Git safe.directory override; no Git configuration changed).

### Architecture and domains

- `src/main/java/com/deepak/cointrailapi/` uses domain packages `account`, `category`, `transaction`, `budget`, their `dto` subpackages, shared `common/exception`, `common/security`, and `user`. Entities are mutable JPA classes with identity Long IDs, lazy relationships, explicit accessors and service-assigned LocalDateTime timestamps. Services use constructor injection and write/read-only transactions; controllers are thin.
- Account: `AccountServiceImpl` trims names, checks case-insensitive owner uniqueness including inactive accounts, and resolves authentication by email through UserRepository. `AccountRepository.findByIdAndUserId` hides foreign resources. DELETE deactivates, list selects active accounts, and owned inactive accounts remain retrievable. Updates change name/type, not opening balance. There is no current-balance mutation in Transaction creation.
- Category: `CategoryServiceImpl` exposes active system plus owned custom categories. Creation checks system/custom duplicate names by type; updates change only custom names. DELETE deactivates custom categories. `findByIdAndActiveTrue` plus access validation allows a system category or the user's custom category; inaccessible/inactive categories return 404. Category type cannot be edited through current APIs.
- Transaction: `TransactionServiceImpl` resolves an authenticated `User` principal directly from SecurityContextHolder (also the Budget pattern). Create/update require an owned active Account and active accessible Category with matching EXPENSE/INCOME type. Both category enums and TransactionType have EXPENSE/INCOME; no transfer type exists. Descriptions are copied without trimming. Transaction deletes are hard deletes; historical reads do not filter out deactivated related resources.
- `transaction/dto/CreateTransactionRequest` and `UpdateTransactionRequest` require account/category/type/amount/date, amount >= 0.01, description <= 500 and `@PastOrPresent` transactionDate. They do not have Budget's @Digits protection; direct service calls do not run controller Bean Validation. Do not assume calling createTransaction internally enforces monetary precision or date rules.
- `TransactionRepository` supports owner lookup, JpaSpecificationExecutor and `sumExpensesByCategory`; `TransactionSpecification` combines owner, type, account, category and inclusive date filters. There is no recurring linkage, occurrence identity, locking query or idempotency key.
- Budget is implemented, not merely planned: `Budget`, `BudgetRepository`, `BudgetServiceImpl`, `BudgetDetails`, DTOs and controller exist. Budgets have immutable category/year/month and editable amount, hard deletion, named database uniqueness and targeted unique-violation translation after saveAndFlush. Records separate internal service results from HTTP DTOs. Budget validates monetary scale/range in service and DTO (@Digits 17/2).
- Budget progress uses owner's EXPENSE Transactions by transactionDate in `[month start, next month start)`, across accounts including inactive ones. INCOME, legacy Expense and opening balances do not contribute. Updates/deletes change the next read. Generated expense transactions should participate through this existing query, without counters or special Budget storage.
- No recurring implementation, `@Scheduled`, `@EnableScheduling`, injected Clock or user timezone field was found in backend source/configuration. `CointrailApiApplication` has only @SpringBootApplication. There is no existing scheduler/worker pattern to copy. README describes the legacy expense application; `.agents/plans/000-monthly-budget-api.md` is the only existing numbered plan and documents approved Budget rules, not Recurring rules.

### Security, API and exceptions

- `SecurityConfig` permits `/api/v1/auth/**`, health and info; all other routes require authentication. JWT filter loads UserDetails from the user service; `User` implements UserDetails. Missing/invalid authentication is tested as HTTP 401 with real filters. Do not create a public generation endpoint or accept request userId for ownership.
- V2 domain routes are `/api/accounts`, `/api/categories`, `/api/transactions`, `/api/budgets`; there is no `/api/v2` prefix. POST returns 201, GET/PUT 200, DELETE 204. Account/Category/Budget list responses are arrays; Transaction returns Page. `PaginationConfig` uses zero-based pages, default size 20, cap 100; `PageableValidator` checks sort allowlists and size (resolver can clamp inputs).
- `GlobalExceptionHandler` returns ErrorResponse(status, message, optional errors): domain not-found 404, InvalidTransaction/InvalidBudget 400, duplicate conflicts 409, binding/validation errors 400 and generic failures sanitized to 500. It includes missing query parameters and Boot method validation handlers. AccessDeniedException has no explicit advice handler; do not promise new service-auth error mapping without inspection/testing. Preserve indistinguishable foreign/missing resource 404 behavior.

### Database/Flyway

All current migrations were inspected. Latest is V11, so V12 is the next candidate; recheck immediately before implementation.

| Migration | Current role |
| --- | --- |
| V1, V2 | Legacy expenses table and category/date indexes |
| V3 | Users, unique email and timestamps |
| V4, V5 | Expense user FK, then required ownership |
| V6 | Categories; EXPENSE/INCOME check; system/null-owner versus custom/required-owner check |
| V7 | System expense/income seeds, including Rent, Subscription and Salary |
| V8 | Accounts; user FK, type check, NUMERIC(19,2) opening balance, active flag; owner/lower-name uniqueness |
| V9 | Transactions; required user/account/category FKs; EXPENSE/INCOME and amount > 0 checks; NUMERIC(19,2), description 500, DATE, timestamps; owner/date and relationship indexes |
| V10 | Partial unique system name/type and user/lower-name/type category indexes |
| V11 | Budgets; user/category FKs, year 1..9999/month 1..12/positive amount checks, unique owner/category/period, owner/period index |

Existing FKs have restrictive default deletion behavior. Plain FKs do not enforce cross-table ownership, active eligibility or category/type matching; services enforce these. PostgreSQL NUMERIC(19,2) can round excess fractional digits, so precision checks must precede persistence. Existing transaction dates and timestamps have no scheduling timezone semantics. Flyway owns schema and JPA ddl-auto is validate.

### Testing/build references

- Maven specifies Java 25, Spring Boot 4.1.1, Flyway 12.8.1; PostgreSQL runtime and Testcontainers dependencies are already present. No separate Failsafe configuration exists; existing `*IntegrationTest` classes run with normal test discovery.
- Account, Category, Transaction and Budget each have service, controller, repository and integration tests. Service tests use MockitoExtension, mocks, SecurityContext setup and teardown; Budget/Transaction use a User principal while Account/Category resolve email.
- Controller slices use Boot 4 WebMvcTest, MockitoBean, MockMvc, Jackson 3 `tools.jackson`, disabled filters and mocked JwtAuthenticationFilter. Transaction imports PageableValidator. These slices do not prove JWT enforcement.
- Repository tests use Boot 4 DataJpaTest, AutoConfigureTestDatabase(replace=NONE), PostgreSQLContainer("postgres:17-alpine"), ServiceConnection, Testcontainers, test profile, saveAndFlush, and entity-manager clearing. Budget also uses JdbcTemplate/native inserts to prove NOT NULL/FK constraints independently of JPA.
- Integration tests use SpringBootTest, AutoConfigureMockMvc and real PostgreSQL/JWT registration/login. Budget covers owner isolation, spoofed userId, inactive history, monetary/date boundaries, live spending edits/deletes and invalid tokens. Cleanup explicitly deletes dependencies before parents; new recurring FKs require reviewing those helpers.
- No tests were executed for this documentation-only investigation; this plan makes no claim about current baseline test results.

## Business Rules

### Repository-derived requirements to preserve

- [x] User ownership comes from authentication for public CRUD; foreign IDs use the same not-found result as absent IDs.
- [x] Template creation/new associations use owned active Account and accessible active matching Category. Preserve EXPENSE/INCOME model and BigDecimal monetary semantics.
- [x] Future schedule dates are separate from posted transactionDate; no future ledger entries. Revalidate eligibility at posting time.
- [x] Templates alone do not affect spending. Posted transactions affect Budget through the existing aggregate; no Budget counters or account opening-balance writes.
- [x] Server owns IDs, owner, timestamps, posting cursor and occurrence identity. DTOs never authorize client ownership/progress fields.

### Approved V2 decisions - D1-D10 resolved

| ID | Decision | Approved contract |
| --- | --- | --- |
| D1 | Behavior | Automatically materialize due occurrences as ordinary V2 Transactions. |
| D2 | Calendar | DAILY, WEEKLY, MONTHLY and YEARLY, interval 1 only. Preserve original startDate anchor and clamp invalid monthly/yearly dates to month-end without drift. Jan 31 -> Feb 28 -> Mar 31; yearly Feb 29 returns to Feb 29 in leap years. |
| D3 | Dates/zone | startDate must be today or future at creation in configurable V2 application timezone. Optional endDate is inclusive and >= startDate. No per-user timezone. |
| D4 | Downtime | Catch up missed occurrences chronologically through today/inclusive end, in bounded batches without dropping unfinished work. |
| D5 | Lifecycle | ACTIVE, PAUSED, BLOCKED, CANCELLED, COMPLETED. PAUSED is user initiated. Resume skips paused periods and chooses next anchored occurrence on/after resume date; no paused-period catch-up. |
| D6 | Edits | Amount/description edits affect future occurrences only and are rejected while any unprocessed occurrence is due today or overdue. Account/category repair changes are allowed while BLOCKED with backlog, subject to R2. Frequency, startDate and anchor immutable; schedule changes require cancellation/new template. Later template edits never modify generated snapshots. |
| D7 | Blocking | BLOCKED means unusable account/category or equivalent recoverable resource condition prevents generation; distinct from user PAUSED. Never post against unusable resources. |
| D8 | Identity/history | Generated Transactions remain normally editable/deletable. Deletion never regenerates processed occurrence. Retain durable occurrence identity/database uniqueness. |
| D9 | Listing/uniqueness | No semantic/name uniqueness for templates. Owner-only paginated listing. |
| D10 | Execution/scope | Internal configurable scheduled job, no public global generation endpoint. Retain occurrence table and multi-instance-safe database design with minimal correctness infrastructure. |

Excluded: frontend, notifications, transfers, bank execution, variable amounts, currency conversion, RRULE/cron-expression UI and historical series-wide edits.

### Concrete implementation contract

These details make the approved rules concrete using repository conventions; they are technical design choices, not unresolved alternatives.

- startDate is first occurrence and sole immutable calendar anchor; no interval/extra anchor field. Type is immutable since only four financial fields are editable. endDate is immutable too because changing schedule requires cancellation/new template. Supported years 1..9999 follow V2 Budget boundaries; complete rather than overflow when no later representable date exists.
- Create ACTIVE with nextDueDate=startDate; scheduled job handles today's occurrence, without inline posting. Initial Transaction.transactionDate is occurrence scheduledDate, not execution date. Later normal Transaction edits can change that date without changing occurrence identity.
- DELETE cancels and retains template/occurrence history; never deletes generated Transactions. Retained terminal rows remain owner-readable/listable. Repeated cancel returns 204; foreign/missing returns 404. Terminal edits/pause/resume return 409. ACTIVE/BLOCKED may be user-paused; repeated pause is idempotent. PAUSED resume recalculates next anchored date >= today or COMPLETED; ACTIVE resume is idempotent. BLOCKED recovery is automatic in the worker, retaining and catching up blocked dates (R2). POST resume on BLOCKED returns 409; no explicit recovery endpoint.
- Listing defaults to all statuses, optional status/type/accountId/categoryId filters; default createdAt DESC/id DESC, size 20/cap 100. Sort allowlist createdAt/updatedAt/nextDueDate with ID tie-breaker. No name field, due-date filters, preview/manual generation/skip endpoint or extra template-create idempotency infrastructure.
- Flat response includes id, financial values, account/category IDs and current names, schedule, nextDueDate, status, safe blockedReason and timestamps. No public Transaction provenance extension or second financial snapshot/audit subsystem; internal occurrence table supplies linkage.
- Nonterminal ACTIVE/PAUSED/BLOCKED retain cursor; CANCELLED/COMPLETED use null cursor. BLOCKED requires safe bounded reason, cleared on exit. Worker never processes PAUSED. Resume recalculates cursor, skipping even pre-pause overdue dates because approved boundary is on/after resume date. No occurrence marker is needed for skipped dates; cursor exclusion persists.
- Configure validated application ZoneId, injected Clock, scheduler enabled flag, positive polling duration and positive batch limits. Invalid configuration fails startup; scheduler disabled in tests. Deployment must explicitly select timezone and operational values; development machine zone is not a default. Revalidate resource eligibility within posting transaction; no new cross-domain locking guarantee for deactivation racing with an already-running posting.

### Approved follow-up decisions - R1-R3 resolved

No unresolved product decisions remain. These approved rules refine D6/D7 and define the timezone compatibility boundary.

| ID | Detail | Approved contract |
| --- | --- | --- |
| R1 | Due-backlog edit guard | Reject actual amount/description changes with 409 while any unprocessed scheduled occurrence is due today or overdue, using recurring application today. After backlog is processed, future financial edits are allowed. No effective-dated template versioning. Apply the guard under the same template lock as posting; inspect durable occurrence identity/cursor, not whether a generated Transaction still exists. |
| R2 | Automatic BLOCKED recovery | Worker automatically rechecks BLOCKED templates. Revalidate account ownership/active state and category ownership/access/active/type compatibility. If still unusable, retain BLOCKED/reason/cursor. Once eligible, transition to ACTIVE, clear blockedReason and catch up original blocked dates chronologically; never skip/re-anchor them. While BLOCKED with backlog, allow account/category changes needed to repair the condition, but reject amount/description changes until backlog is processed. Repair saves associations without moving cursor, posting inline or forcing ACTIVE; worker performs recovery. |
| R3 | Recurring-only clock scope | Configurable ZoneId/injected Clock changes apply only to Recurring Transactions (schedule validation, edit guard, resume, worker cutoff and recurring timestamps). Do not refactor Account/Category/Transaction/Budget timestamps or manual Transaction validation. Deployment must keep recurring timezone stable. |

Update contract: PUT retains the four-field accountId/categoryId/amount/description DTO. Compare supplied values to persisted values before applying R1, so unchanged amount/description in an account/category repair request are not mistaken for financial edits. Compare amounts numerically, not by BigDecimal scale. A repair plus changed amount/description with due backlog fails atomically with 409; no partial association update. Outside the BLOCKED repair exception, due backlog prevents association changes as well, preserving future-only edits. Resource errors preserve existing 404 ownership/not-found and 400 active/type validation conventions. Missing/foreign templates are resolved before edit conflicts.

Due backlog means an unprocessed scheduled date <= recurring today within the inclusive schedule end; a durable processed marker excludes that occurrence even when its transaction link is null. For PAUSED templates, elapsed dates that approved resume will skip are not posting backlog, but an unprocessed anchored occurrence today is eligible on resume and still guards financial edits; never catch them up or use them to re-anchor the series. Terminal templates remain noneditable. BLOCKED catch-up continues beyond endDate if eligible historical scheduled dates <= endDate remain unprocessed, then completes.

Compatibility boundary: a date can be today in recurring timezone and tomorrow in the JVM/manual validation timezone near midnight. Generated posting uses recurring cutoff and scheduledDate directly, not the manual DTO @PastOrPresent clock. Later normal Transaction API edits still use existing manual validation and may temporarily reject that date until the manual clock catches up. This is documented accepted behavior, not a reason to shift occurrence date or skip posting. Ordinary Transaction createdAt/updatedAt retain existing timestamp behavior; template/occurrence timestamps use the scoped recurring Clock. No global ClockProvider, JVM timezone override or cross-domain timestamp refactor.

## Phase 1 — Database / Domain

- [x] Implement the settled D1-D10/R1-R3 contract and acceptance cases; no product approval gaps remain. Recheck repository state before coding.
- [x] Confirmed V11 was latest; added `V12__create_recurring_transactions_tables.sql`. Never modify V1-V11. Keep Transaction HTTP provenance unchanged; internal occurrence linkage is sufficient.
- [x] `recurring_transactions` table: identity ID; required user/account/category FKs; TransactionType; amount NUMERIC(19,2); optional description VARCHAR(500); frequency; start_date; optional end_date; nullable next_due_date; lifecycle status (ACTIVE/PAUSED/BLOCKED/CANCELLED/COMPLETED); bounded blocked reason required only for BLOCKED; created_at/updated_at TIMESTAMP. Start date preserves calendar anchor; next_due_date is server-managed, nullable for terminal states. No name uniqueness, interval or per-user zone. No effective-dated template versions or edit-history infrastructure; the locked backlog guard implements R1.
- [x] Named checks: positive amount, allowed type/frequency/status, end >= start, date range, and cursor required for ACTIVE/PAUSED/BLOCKED and null for CANCELLED/COMPLETED; blocked reason present only for BLOCKED. Required FKs/columns; owner-list index and due-work index (status,next_due_date,id). Keep template parent FKs restrictive and avoid redundant indexes.
- [x] Add `recurring_transaction_occurrences`: identity ID, required template FK, scheduled_date DATE, nullable unique transaction FK, posted timestamp; unique `(recurring_transaction_id, scheduled_date)`. Retain rows on transaction deletion via ON DELETE SET NULL. FK deletion of templates remains restrictive. Do not conflate posted transactionDate (editable) with immutable scheduled_date.
- [x] Create domain entities/enums following existing identity/lazy mapping/timestamp patterns. No cascade remove of transactions, accounts, categories or users. Cross-table ownership and active/type eligibility remain service rules; a CHECK cannot validate another table.

## Phase 2 — Repository / Service

- [x] Add RecurringTransactionRepository owner-scoped lookup/list and fetch Account/Category for response names (Budget's EntityGraph is a reference). Use specifications for status/type/account/category filters. Enforce ownership in every read/write and validate access before type errors.
- [x] Add RecurringTransactionService/Impl with create/get/list/update/cancel and pause/resume operations, automatic worker-owned BLOCKED recovery per approved R2, with no recovery API. Prefer Budget-style record requests/internal Details/API response separation, preserving constructor injection and transaction boundaries. Validate monetary precision 17/2, minimum 0.01, IDs, descriptions and schedules in both boundary and service paths.
- [x] Isolate pure anchored recurrence calculation in RecurrenceCalculator. Inject a Clock into recurring code for deterministic today/timestamps; use explicitly configured zone, without refactoring unrelated existing clocks. Handle month-end/leap-year and representable-date exhaustion without cursor loops.
- [x] Implement locked due-backlog checks: reject actual amount/description changes until backlog is processed; permit BLOCKED account/category repair with unchanged amount/description and unchanged cursor/status. Reject mixed repair/financial changes atomically. No effective-dated versions. Keep type/frequency/startDate/endDate/anchor immutable. PAUSED resume skips paused dates; automatic BLOCKED recovery retains/catches up dates. Transient errors roll back without changing status to user PAUSED.
- [x] Use an internal generation service independent of request SecurityContext. Derive owner from persisted locked template, never from a scheduler-supplied client ID or fabricated authentication. Resolve/revalidate account/category ownership/type/active state within occurrence transaction. Select both ACTIVE due work and BLOCKED recheck candidates in bounded fair batches, so BLOCKED is never stranded by an ACTIVE-only query. Lock/recheck BLOCKED eligibility; commit recovery/clear reason and process unchanged chronological backlog. If still unusable, persist BLOCKED with safe reason and no cursor advancement. Include blocked backlog even after endDate; finish historical eligible dates before COMPLETED.
- [x] Do not call TransactionController or assume TransactionServiceImpl.createTransaction can execute in a background thread: it requires authenticated principal and lacks direct date/precision validation. Use a narrowly scoped internal Transaction writer if needed; recurring date eligibility uses its own Clock, while manual DTO validation and ordinary Transaction timestamps retain current behavior. Do not add a global ClockProvider or change other domains. Test this compatibility boundary. Avoid a public arbitrary-owner creation method.
- [x] Discover ACTIVE due IDs and BLOCKED recheck IDs in bounded chronological batches with deterministic tie-breakers and fairness, then acquire/recheck each template under a pessimistic write lock in a separate proxied transactional worker (or explicitly designed TransactionTemplate). CRUD/lifecycle writes take the same lock. Atomically persist occurrence, Transaction and cursor advancement; lock losers recheck current status/date. Named unique template/date constraint is the final duplicate defense, including restarts and multiple instances.
- [x] Do not catch a constraint violation and continue/query inside a failed transaction. Roll back and handle known duplicate outcomes outside that transaction; unrelated integrity failures remain failures. Budget's named-constraint detection is the reference, not blanket 409 translation. Tests must prove rollback after insert-before-cursor failure.
- [x] Bounded batches must retain oldest unfinished date, release locks promptly and avoid starvation. Recheck due <= today, <= inclusive end and valid domain range before every posting. Date advancement strictly increases or ends the series. Copy financial values after applying R1 backlog guard/R2 association repair policy, setting initial transactionDate to scheduledDate and keeping ordinary Transaction timestamps unchanged; no template mutation of posted rows.
- [x] Add the internal scheduler adapter/config; keep scheduling and transactions separate, disable scheduling in tests, use explicit cadence/zone/enabled/batch configuration and isolate per-template failures. Log identifiers and safe outcomes, with no tokens or unnecessary financial payloads. Scope active-resource race guarantees explicitly; if immediate serialization with deactivation is required, design compatible locking rather than claiming a snapshot read guarantees it.
- [x] Add RecurringTransactionNotFoundException and InvalidRecurringTransactionException; add RecurringTransactionConflictException for invalid lifecycle transitions and R1 edit conflicts (409). Extend GlobalExceptionHandler with exact mappings and existing ErrorResponse. Identical templates are allowed under approved D9.

## Phase 3 — API

API contract implementing approved D1-D10/R1-R3. BLOCKED recovery is internal and automatic; no recovery action endpoint:

| Method / route | Behavior |
| --- | --- |
| POST `/api/recurring-transactions` | Template fields; 201 response; does not post inline |
| GET `/api/recurring-transactions` | Owner-only Page with filters/sorts defined above; 200 |
| GET `/api/recurring-transactions/{id}` | Owned template including retained terminal states; 200 or 404 |
| PUT `/api/recurring-transactions/{id}` | Future financial edits; 409 for due-backlog changes, except BLOCKED account/category repair with unchanged amount/description; 200; no history mutation |
| DELETE `/api/recurring-transactions/{id}` | Retained cancellation; 204 |
| POST `/api/recurring-transactions/{id}/pause` and `/resume` | User pause/resume transitions defined above; 200 template; invalid terminal transitions 409; BLOCKED resume 409; recovery automatic |

- [x] Finalize DTOs: create accountId/categoryId/type/amount/description/frequency/startDate/endDate; update accountId/categoryId/amount/description only; type and schedule immutable. Omit owner, cursor/status overrides, occurrence IDs and timestamps from writable contracts. Unknown fields must not establish ownership or override server state, matching Budget's spoofed-owner test.
- [x] Flat response: id, account/category IDs and current names, financial values, schedule, nextDueDate, status, timestamps and safe blocked reason. Account/category renames appear through live names like existing responses. Keep Transaction response unchanged; internal occurrence ledger supplies provenance and survives Transaction deletion.
- [x] Use @Valid, Jakarta constraints, ISO dates and existing PageableValidator/allowlisted simple fields. Define deterministic secondary ID ordering; verify resolver defaults/caps in actual MVC context. Invalid lifecycle transitions/edit conflicts return 409; validation/business-input errors return 400.
- [x] Default authenticated security matcher covers these routes. No allowlist change needed. POST pause/resume uses already-supported CORS methods; choosing PATCH would require an intentional CORS change.
- [x] No GET side effects, public global worker trigger, manual generation/preview/skip routes or external scheduler platform.

## Phase 4 — Testing

- [x] RecurrenceCalculatorTest: table-driven anchors Jan 29/30/31, February common/leap years, Feb 29 yearly, weekly/year crossing, inclusive end, future/today, terminal boundaries and no drift. Fixed application Clock/ZoneId for midnight/DST, recurring-only timezone compatibility with unchanged manual validation/timestamps and invalid configuration; no sleeps.
- [x] RecurringTransactionServiceImplTest: CRUD, valid income/expense, matching categories, inactive/foreign/missing resources, User principal resolution, monetary precision/overflow, lifecycle table, timestamp preservation, owner spoof protection, immutable type/schedule, R1 reject today/overdue amount or description changes, accept after processing, R2 BLOCKED account/category repair with unchanged values, numeric amount comparison, atomic rejection of mixed requests, ownership/active/type revalidation and cursor preservation. PAUSED skipped dates do not become posting backlog; an anchored occurrence today still does.
- [x] RecurringTransactionControllerTest: routes/status/flat DTO, JSON validation before service invocation, invalid enums/dates/ranges, malformed/missing parameters, pagination/filter/sort contract and exact 404/400/409 ErrorResponse mappings. Follow Boot 4 slices; don't treat disabled filters as auth coverage.
- [x] RecurringTransactionRepositoryTest: PostgreSQL/Flyway round trips, owner filters/order/fetching, ACTIVE discovery and BLOCKED recheck selection/fairness, constraints via flush/native inserts, all five status/reason/cursor invariants, due boundaries, required relationships, occurrence unique template/date, unique transaction link and deletion retaining marker. No H2 substitute.
- [x] Generation tests: fixed-time first/repeated runs, catch-up batches, completion, all five states, user pause/resume skipping without anchor drift, cancellation, BLOCKED automatic rechecks, still-blocked cursor retention, recovery to ACTIVE with chronological catch-up (including dates before inclusive end when recovery is later), no skipped blocked dates, chronological cursor advancement, snapshot values, failed occurrence atomic rollback and retry. Worker executes without authenticated context.
- [x] Real PostgreSQL concurrency integration test with separate committed transactions and coordinated workers: same due template yields one occurrence/transaction; overlapping repair/edit/pause/cancel/recovery obey template locks; due-backlog guard cannot race posting; rollback retry yields no lost/duplicate posting. Mockito alone cannot prove locking/uniqueness correctness.
- [x] RecurringTransactionIntegrationTest: real JWT all operations, 401 missing/invalid token, foreign CRUD/lifecycle 404, owner isolation with shared system category, CRUD persistence, generated EXPENSE enters correct monthly Budget and INCOME does not; other users/months excluded. Exercise automatic worker recovery after owner association repair, foreign/inactive/mismatched repair rejection, financial edit 409 until backlog processed and PAUSED skip behavior. Verify generated dates at recurring/JVM midnight boundary without changing manual validation or ordinary Transaction timestamp behavior. Template edits/cancel preserve previous transactions; generated transaction edit/delete updates Budget and never regenerates deleted occurrence.
- [x] Review existing integration cleanup helpers for new FK dependencies; modify only helpers genuinely affected. Disable scheduler in test configuration and invoke workers explicitly. Preserve V7 seeds and independent test data. If internal Transaction writing is shared, run existing Transaction tests for manual behavior, including inactive/category mismatch and auth.

## Phase 5 — Verification

- [x] Run targeted calculator/service/controller tests, then PostgreSQL repository/concurrency/integration tests using Java 25 and available Docker. Report prerequisites/failures honestly rather than skipping silently.
- [x] Run Account, Category, Transaction and Budget regression suites as appropriate to actual edits.
- [x] From `cointrail-api/`, run `mvn clean verify`; fix relevant failures before implementation completion. Existing IntegrationTest naming participates in this build.
- [x] Verify migration from existing V11 state and clean schema with Flyway/JPA validation; confirm no old migration changes.
- [x] Review final diff, approved acceptance rules, indexes, transaction/lock boundaries and deployment scheduler configuration; confirm no unrelated/frontend/legacy Expense changes. Update plan only after actual validated work.

## Expected Files

Implemented files follow the inspected conventions. Relative to `cointrail-api/`:

- `src/main/resources/db/migration/V12__create_recurring_transactions_tables.sql` (recheck number).
- `src/main/java/com/deepak/cointrailapi/recurringtransaction/`: `RecurringTransaction.java`, `RecurrenceFrequency.java`, `RecurringTransactionStatus.java`, `RecurringTransactionRepository.java`, `RecurringTransactionService.java`, `RecurringTransactionServiceImpl.java`, `RecurringTransactionResources.java`, `RecurringTransactionDetails.java`, `RecurringTransactionController.java`, `RecurrenceCalculator.java`; `RecurringTransactionSpecification.java` for the approved filters.
- Same package `dto/`: `CreateRecurringTransactionRequest.java`, `UpdateRecurringTransactionRequest.java`, `RecurringTransactionResponse.java`.
- Same domain package: `RecurringTransactionOccurrence.java`, `RecurringTransactionOccurrenceRepository.java`, `RecurringTransactionGenerationWorker.java`, `RecurringTransactionScheduler.java`, `RecurringTransactionSchedulingConfig.java`. Use the smallest scheduler/transactional-worker split; add a coordinator only if bounded orchestration requires it. No queue/distributed scheduler infrastructure.
- `common/exception/RecurringTransactionNotFoundException.java`, `InvalidRecurringTransactionException.java`, and existing `GlobalExceptionHandler.java`; add `RecurringTransactionConflictException.java`.
- Existing Transaction classes remain unchanged. The internal worker creates ordinary Transaction entities after shared recurring resource validation; no writer extraction was needed. Internal occurrence ledger provides linkage. Clock configuration is scoped to recurring code only.
- `src/main/resources/application.yml` and `src/test/resources/application-test.yml` for explicit scheduler/time configuration.
- `src/test/java/com/deepak/cointrailapi/recurringtransaction/`: calculator, service, resource validation, controller, scheduler, scheduling configuration, repository and integration tests; generation/rollback/concurrency coverage lives in the integration suite, with explicit shared fixture helpers. Existing integration cleanup helpers required no changes: each context uses an isolated container and recurring tests delete occurrences/templates before financial/user dependencies.
- `cointrail-api/RECURRING_TRANSACTIONS.md` (repository-relative) documents API behavior, rollout settings and timezone compatibility.
- `.agents/plans/001-recurring-transactions-backend.md` for execution tracking.

## Implementation Notes

Automatic materialization, interval-1 calendar frequencies, original anchors, chronological downtime catch-up and skipped user-paused dates are approved. BLOCKED cannot be implemented as PAUSED: that would incorrectly apply user-pause skip semantics to resource failures. R1/R2 are settled: due backlog rejects amount/description changes; BLOCKED association repair is allowed, then the worker revalidates and catches up unchanged scheduled dates. No effective-dated versioning or explicit recovery infrastructure.

Use database locks and unique occurrence identity across instances; commit Transaction, occurrence and cursor atomically. Check processed identity even if transaction FK is null after normal deletion; never delete markers to enable replay. Rollback prevents lost or duplicate postings. Keep internal persisted-template execution independent of request authentication, without public arbitrary-owner APIs or unnecessary infrastructure. Recurring Clock/ZoneId remains scoped; manual transaction validation and all existing domain timestamps are unchanged. Document midnight compatibility in API/deployment notes and keep deployment recurring timezone stable.

Implementation is now authorized through commit, push and PR creation targeting develop; never merge. D1-D10/R1-R3 are implemented without product/schema/API/security scope changes. Deployment timezone/cadence/batch values are operational configuration, not approval blockers.

## Execution evidence

- Refreshed origin; local develop, origin/develop and starting feature branch all matched `b481f7c`.
- `mvn -DskipTests compile` succeeded.
- Targeted recurring suites initially passed 86 tests across eight suites. After the paused-today fix, the 28 service/integration tests passed (88 recurring cases in total), with no skips. Includes real PostgreSQL V11-to-V12 upgrade, unique/FK/check constraints, JWT flows, coordinated worker concurrency, cancellation under lock, injected insert failure rollback/retry and durable identity after generated Transaction hard deletion.
- Review identified a paused-today guard edge case: historical paused dates are skipped, but an anchored occurrence today remains eligible on resume and must guard financial edits. Corrected the implementation and added unit/integration regression cases without changing approved rules. The 28-test service/integration rerun passed. Final `mvn clean verify` passed 377 tests (including 88 recurring cases), zero failures/errors/skips; packaging succeeded. Complete 37-file feature diff reviewed; no unrelated changes, old migration edits, frontend/legacy edits or agent instruction/skill edits.
- Operational settings: explicit RECURRING_TIMEZONE; automatic posting enabled with RECURRING_ENABLED=true; default poll PT1M, template batch 100, occurrence batch 50. Disabled in test profile. Keyset scan continuation is a local fairness hint only; database lock/unique key establish correctness across instances.

- Final verification completed 2026-10-04 with Java 25 and PostgreSQL 17 Testcontainers. Deployment configuration and the accepted manual-validation timezone boundary are documented in `cointrail-api/RECURRING_TRANSACTIONS.md`. No known implementation defects or product follow-ups remain; deploy with a stable timezone and enable the job explicitly.
