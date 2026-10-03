# CoinTrail V2 Monthly Budget API

## Goal

Provide authenticated users with monthly category spending limits and progress calculated from V2 Transactions. Create, list, retrieve, update, and delete budgets while preserving ownership isolation and existing API conventions.

This is the first implementation plan, prepared against commit `18ee63e` on 2026-10-03. The working tree was clean before investigation and `.agents/plans/` contained no plans. Only this document was created during the initial planning task. The approved implementation was subsequently completed in the phases below.

The initial request established a monthly Budget API without a detailed product contract. The user approved the V2 Budget decisions below before Phase 1; those decisions define the implemented contract.

## Existing State at Initial Planning

All source paths below are relative to `cointrail-api/` unless stated otherwise. Java sources use `src/main/java/com/deepak/cointrailapi/`; tests use the equivalent `src/test/java/com/deepak/cointrailapi/` root.

### Architecture and reference domains

- Read root `AGENTS.md` and `.agents/skills/{planning,spring-backend-feature,testing}/SKILL.md`. Planning supplies this document's phase structure. Backend and testing skills provide the conventions for later implementation. The testing skill currently ends after its targeted Maven test example; do not assume additional hidden instructions.
- `pom.xml` declares Java 25, Spring Boot 4.1.1, Flyway 12.8.1, Spring Data JPA, Jakarta validation, PostgreSQL, JWT, Mockito/JUnit test support, and Testcontainers. Its only explicit build plugin is Spring Boot; no dedicated Failsafe integration-test execution is configured.
- Account, Category, and Transaction each use a domain package containing entity, repository, service interface, service implementation, controller, and a `dto/` subpackage. Constructor injection, service-layer mapping, transactional writes and read-only reads are established patterns. Entities use identity-generated `Long` IDs, lazy relationships, and service-assigned `LocalDateTime` timestamps.
- `account/Account.java` belongs to a required User and stores name, enum type, `BigDecimal openingBalance` mapped as precision 19/scale 2, active state, and timestamps. Negative opening balances are allowed. `AccountRepository.findByIdAndUserId` enforces ownership; list reads select active rows in descending creation order. Create/update trim names and reject case-insensitive duplicates, including inactive rows. Update cannot change opening balance. DELETE deactivates; get-by-ID can still retrieve an owned inactive account.
- `category/Category.java` supports EXPENSE and INCOME, global system categories and user-owned custom categories, active state, and timestamps. `CategoryRepository.findByIdAndActiveTrue` is followed by access validation for reads: system or own custom categories are accessible; another user's custom category gives 404. Updates/deactivation use `findByIdAndUserIdAndActiveTrue`, so system and inactive categories cannot be modified through those operations. Update changes only name, never type. Lists concatenate sorted active system categories and sorted own custom categories. Duplicate service checks include system and own names regardless of active state.
- Account and Category DTOs are records with Jakarta validation on requests. Transaction DTOs are mutable classes. Both styles are present; record Budget DTOs would follow the simpler Account/Category contract style.
- `transaction/Transaction.java` has required User, Account, Category, EXPENSE/INCOME type, positive `BigDecimal amount` (19,2), optional 500-character description, `LocalDate transactionDate`, and timestamps. Request DTOs use `@NotNull`, `@DecimalMin("0.01")`, `@PastOrPresent`, and `@Size`; they do not currently enforce decimal precision with `@Digits`.
- `TransactionServiceImpl` verifies owned accounts and their active state on create/update; verifies active accessible categories and matching category/transaction type. Get/update/delete use `TransactionRepository.findByIdAndUserId`. DELETE physically removes the transaction. Reads do not exclude historical transactions when the associated account/category becomes inactive.
- `TransactionRepository` currently extends `JpaRepository` and `JpaSpecificationExecutor`, with only one declared method, `findByIdAndUserId`. **No spending aggregate exists.** `TransactionSpecification` combines authenticated user, type, account, category, and inclusive date bounds for paged reads. The Budget aggregate proposed below is new work, not reuse of an existing sum method.
- Domain controllers use `/api/accounts`, `/api/categories`, `/api/transactions`, POST 201, GET/PUT 200, and DELETE 204. There is no `/api/v2` prefix for these V2 domains. Account/Category return lists; Transaction returns a Page and validates allowed sorting through `PageableValidator`. `PaginationConfig` uses zero-based pages, default size 20, max 100.
- Repository-wide inspection found no Budget Java classes, migration, API, product specification, or existing implementation plan. `README.md` describes the legacy expense application, not a Budget contract. Legacy Expense is not the architectural reference or spending source for this feature.

### Authentication, ownership, and exceptions

- `user/User.java` implements `UserDetails`; `CustomUserDetailsService` and `JwtAuthenticationFilter` establish the application's user principal. Account/Category resolve authentication name (email) through `UserRepository`. Transaction instead checks that authentication exists, is authenticated, and has a `User` principal, otherwise throwing `AccessDeniedException`. Follow Transaction for Budget; no unrelated authentication refactor is needed.
- `common/security/SecurityConfig.java` requires authentication for all routes except `/api/v1/auth/**` and actuator health/info, uses stateless JWT security, disables CSRF, and returns 401 through its authentication entry point. New `/api/budgets` routes should already be protected. CORS permits GET/POST/PUT/DELETE/OPTIONS.
- `common/exception/GlobalExceptionHandler.java` maps domain not-found exceptions to 404, Account/Category duplicate exceptions to 409, `InvalidTransactionException` and invalid pagination to 400. Binding, malformed JSON, and Jakarta validation produce 400. `ErrorResponse` contains `status`, `message`, and optional field `errors`.
- No Budget exceptions exist. No dedicated `DataIntegrityViolationException` or `AccessDeniedException` advice exists; unhandled exceptions reach generic 500 advice. Do not assume duplicate prechecks make a concurrent insert return 409, or that throwing access denied in an MVC service automatically returns 401. Test HTTP authentication at the actual filter chain and translate Budget uniqueness failures deliberately.

### Flyway: every existing migration inspected

| Version / filename | Current effect |
| --- | --- |
| `V1__create_expenses_table.sql` | Legacy expenses with NUMERIC(12,2), enum-like category text and DATE; no owner initially. |
| `V2__add_expense_indexes.sql` | Legacy category and expense-date indexes. |
| `V3__create_users_table.sql` | Users with unique email, role, and required timestamps. |
| `V4__add_user_to_expenses.sql` | Adds nullable expense owner and FK to users. |
| `V5__make_expense_user_not_null.sql` | Requires legacy expense owner. |
| `V6__create_categories_table.sql` | Category type check, user FK, and system/null-owner versus custom/non-null-owner CHECK; user/type indexes. |
| `V7__seed_system_categories.sql` | Seeds 15 active global categories: 10 EXPENSE (including Food, Rent, Subscription), 5 INCOME. |
| `V8__create_accounts_table.sql` | Required user FK, account-type CHECK, NUMERIC(19,2) opening balance, active state; unique `(user_id, LOWER(name))` and user/type indexes. |
| `V9__create_transactions_table.sql` | Required user/account/category FKs, type CHECK, amount > 0 CHECK, DATE, timestamps; user/account/category/date indexes and `(user_id, transaction_date)` index. |
| `V10__add_category_unique_indexes.sql` | Partial unique indexes for system `(LOWER(name), type)` and custom `(user_id, LOWER(name), type)` categories; neither filters active state. |

Latest numeric version is **V10**, so proposed next migration is **V11__create_budgets_table.sql**. Recheck before implementation. Existing migrations must remain unchanged. `application.yml` uses Hibernate `ddl-auto: validate` and Flyway; mapping must match the migration.

Existing FKs ensure referenced rows exist, but do not enforce cross-table ownership or matching category types. Category service duplicate rules are stronger than the separate system/custom unique indexes. Follow the current service boundary for cross-domain Budget eligibility rather than claiming an ordinary FK protects those rules.

### Existing test patterns

- All three reference domains have `*ServiceImplTest`, `*ControllerTest`, `*RepositoryTest`, and `*IntegrationTest` classes. Service tests use JUnit 5 `MockitoExtension`, `@Mock`, `@InjectMocks`, AssertJ/Mockito, explicit fixtures, and security-context cleanup. Transaction tests set a `User` principal; Account/Category tests use email principals with a mocked user repository.
- Transaction MVC tests use Spring Boot 4 `@WebMvcTest`, `@AutoConfigureMockMvc(addFilters = false)`, `@MockitoBean` service and JWT filter, `tools.jackson.databind.ObjectMapper`, MockMvc JSON assertions, and `@Import(PageableValidator.class)`. They verify validation failures do not call the service, statuses, business exceptions, pagination and filters. Account/Category MVC slices instead mock `JwtService` and `UserDetailsService`; do not mix their setups without a reason.
- Repository tests use Boot 4 `@DataJpaTest`, `@AutoConfigureTestDatabase(replace = NONE)`, `@Testcontainers`, static `@Container @ServiceConnection PostgreSQLContainer("postgres:17-alpine")`, and `@ActiveProfiles("test")`. They use `saveAndFlush` for constraints. Account tests cover uniqueness across users and negative opening balance; Category covers V7 seeds and V10 uniqueness; Transaction covers positive amounts, owner filtering, specifications, date boundaries, paging and sorting.
- Integration tests use `@SpringBootTest`, real filters with `@AutoConfigureMockMvc`, the same PostgreSQL container pattern, test profile, actual register/login requests at `/api/v1/auth`, and Bearer tokens. They exercise persistence and cross-user 404 behavior. `common/security/SecurityIntegrationTest` also verifies missing/invalid tokens give 401.
- Cleanup deletes dependents before users. Category integration cleanup preserves system seeds and removes custom rows first. Transaction integration cleanup deletes transactions, accounts, then users; Budget tests with custom categories will need their own correct dependency order. Do not copy cleanup blindly.
- Integration classes end in `Test`, so the normal Maven test lifecycle includes them; there is no need to invent an `*IT` naming convention. Test profile supplies a test JWT secret; PostgreSQL is supplied by service connections. Docker and Java 25 are prerequisites for future database verification.

## Business Rules

### Established constraints to preserve

- [x] Derive ownership exclusively from authenticated `User`; never accept `userId` in Budget requests.
- [x] Return the same 404 for absent and another user's budget, including update/delete. Do not disclose another user's custom category.
- [x] Accept accessible system or owned custom categories; do not modify category type, ownership, or lifecycle to implement Budget.
- [x] Use V2 Transactions as the source of spending; use BigDecimal and database monetary constraints.
- [x] Keep business logic in transactional services and expose DTOs only.

### Approved Budget decisions

These choices were proposed during planning and approved before implementation; they were not inferred from existing code.

- [x] **Scope:** one category-specific budget per authenticated user per calendar month; no overall/user-total budget, account-specific limit, rollover, automatic recurring creation, alerts, currency conversion, or frontend work in this first API.
- [x] **Period:** explicit integer `year` (1..9999) and `month` (1..12), allowing past, current and future months. Persist those fields and derive `[first day, first day of next month)` with `YearMonth`; no timestamp/timezone conversion is needed for transaction DATE. Year 9999 December's exclusive bound is computable in Java; keep persistence/query date parameters compatible with PostgreSQL.
- [x] **Category eligibility:** creation requires an active accessible EXPENSE category. Missing/inactive/foreign custom category returns CategoryNotFoundException/404; accessible INCOME category returns InvalidBudgetException/400.
- [x] **Amount:** `amount` is required, at least 0.01, at most 17 integer and 2 fractional digits (`@Digits(integer = 17, fraction = 2)`), matching NUMERIC(19,2). Reject excess scale/range instead of silently rounding the limit.
- [x] **Uniqueness:** `(user_id, category_id, year, month)` is unique in the database and checked in the service; duplicates return 409, including concurrent inserts. Different users or periods are independent.
- [x] **Update:** PUT changes amount only; category and period are immutable. Change either by deleting and creating a new budget. Amount edits remain allowed if the category is later inactive because this does not introduce a new association.
- [x] **Deletion:** hard-delete Budget only, following Transaction; subsequent lookup/delete gives 404 and recreation of the same category/month is allowed. No `active` flag or retained audit history in this proposed scope.
- [x] **History:** existing budgets remain readable after category/account deactivation. Category rename is reflected in current response name; no historical name snapshot. Category ownership/type cannot change through current APIs.
- [x] **Progress:** sum the owner's EXPENSE transactions for that category in the selected month across all accounts, including inactive accounts/categories. Use transactionDate, not createdAt; exclude INCOME, other users/categories/months and legacy expenses. Empty sum is 0.00. Hard-deleted transactions cease to contribute; updates to amount/type/category/date affect the next read.
- [x] **Response:** `spentAmount`, `remainingAmount = amount - spentAmount` (negative on overspend), and `overBudget = spentAmount > amount`; exact equality is not over budget. Avoid percentage/rounding/status thresholds in the initial contract. These derived values are not persisted, and overspending does not block transactions.
- [x] **List:** require year and month, return only the user's budgets for that month as a list ordered by category ID then budget ID, with `[]` for no budgets. This deliberately follows Account/Category list style; if unbounded history or pagination is wanted, revise the contract first.

## Phase 1 — Database / Domain

- [x] Settle the proposed decisions above and update this plan if their contract changes before coding.
- [x] Recheck migration versions and add `src/main/resources/db/migration/V11__create_budgets_table.sql` if V11 is still available; never edit V1–V10.
- [x] Create `budgets`: BIGSERIAL ID; required user/category BIGINT FKs; required year/month INTEGER; amount NUMERIC(19,2); required created_at/updated_at TIMESTAMP. Add named amount > 0, year 1..9999, month 1..12 CHECKs and named unique `(user_id, category_id, year, month)` constraint `uq_budgets_user_category_period`. Keep FK deletion restrictive, consistent with existing schema.
- [x] Add a `(user_id, year, month)` lookup index for monthly listing; the unique index places category before period. Do not add redundant indexes or change Transaction indexes without query-plan evidence. A plain FK cannot enforce category ownership/type/active eligibility; enforce those in the service.
- [x] Create `budget/Budget.java` with lazy required User/Category relationships, BigDecimal precision/scale, identity ID, year/month and timestamps. No account relation, stored progress, enum type or active flag is needed for the proposed scope.

## Phase 2 — Repository / Service

- [x] Create `BudgetRepository extends JpaRepository<Budget, Long>`: owner-scoped ID lookup; monthly owner list with deterministic order; duplicate existence check for the composite key. Consider fetch joins/entity graphs for response category name to avoid an N+1 query.
- [x] Add a new grouped expense-sum query to existing `TransactionRepository`, keyed by category ID and constrained by user ID, EXPENSE type, start-inclusive and next-month-exclusive transactionDate. For lists, aggregate all returned category IDs in one query; for individual responses use the same query with one category. Skip aggregation on an empty list and default absent groups to zero. Define the aggregate projection explicitly, never return database entities as the API response.
- [x] Create `BudgetService` and `BudgetServiceImpl` with createBudget(categoryId, year, month, amount), getBudgets(year, month), getBudget(id), updateBudget(id, amount), and deleteBudget(id), matching existing naming style. Constructor-inject BudgetRepository, CategoryRepository and TransactionRepository. Follow Transaction's authenticated User principal resolution.
- [x] Use write `@Transactional` and read `@Transactional(readOnly = true)`. Validate month/year consistently for JSON, query parameters and direct service calls before date construction. Resolve budget ownership before reporting update business errors; validate category access before revealing eligibility/duplicates on creation.
- [x] Apply Transaction's active category lookup and system/own custom access rule for creation; compare with CategoryType.EXPENSE explicitly. Reuse CategoryNotFoundException, not InvalidTransactionException, for its actual semantics.
- [x] Set timestamps in the service like existing domains; preserve createdAt and immutable fields on update. Map Budget/category fields plus live aggregate values inside the transaction.
- [x] Add BudgetNotFoundException, BudgetAlreadyExistsException and InvalidBudgetException under common/exception. Precheck duplicates for clear feedback, then explicitly flush creation to detect a uniqueness race before returning success. Translate only the named Budget unique-constraint violation to BudgetAlreadyExistsException, allowing the transaction to roll back; rethrow unrelated integrity failures. Do not treat all integrity errors as duplicates or query again in a failed transaction.
- [x] Do not modify Transaction write logic to maintain Budget counters; live reads must reflect transaction creation, edits and deletion automatically.

## Phase 3 — API

Approved routes follow the existing V2 resource controllers:

| Method / route | Input | Success |
| --- | --- | --- |
| POST `/api/budgets` | `{ "categoryId": 1, "year": 2026, "month": 10, "amount": 5000.00 }` | 201 BudgetResponse |
| GET `/api/budgets?year=2026&month=10` | Required year/month | 200 list of BudgetResponse |
| GET `/api/budgets/{id}` | Owned budget ID | 200 BudgetResponse |
| PUT `/api/budgets/{id}` | `{ "amount": 6000.00 }` | 200 BudgetResponse |
| DELETE `/api/budgets/{id}` | Owned budget ID | 204, empty body |

- [x] Create record DTOs `CreateBudgetRequest`, `UpdateBudgetRequest`, `BudgetResponse` in `budget/dto/`. Response fields: id, categoryId, categoryName, year, month, amount, spentAmount, remainingAmount, overBudget, createdAt, updatedAt. Exclude ownership controls and persistence relationships.
- [x] Apply `@Valid`, required/range validation, monetary minimum and precision constraints. Creation categoryId must be non-null and positive. Explicitly return 400 for missing year/month, non-numeric parameters, unsupported ranges, invalid ID syntax, malformed JSON and missing/invalid amount. Inspect actual Boot 4 missing-parameter/method-validation exception behavior; current generic advice must not turn these into 500. Add only the narrowly necessary handlers and HTTP tests.
- [x] Create thin `BudgetController` at `/api/budgets`, delegating business decisions to service, using existing ResponseEntity/status conventions. Do not introduce pagination configuration for the proposed month-scoped list.
- [x] Extend GlobalExceptionHandler's not-found group with BudgetNotFoundException; handle BudgetAlreadyExistsException as 409 and InvalidBudgetException as 400 using ErrorResponse. Preserve existing domain responses and generic internal-error behavior.
- [x] Keep current security configuration unless real-filter tests show a Budget-specific need; the existing authenticated catch-all already covers this route.

## Phase 4 — Testing

- [x] `budget/BudgetServiceImplTest`: success CRUD/list and mapping; timestamps/immutable fields; authentication failure; other-user/absent budget 404 semantics; system and own custom EXPENSE eligibility; inactive/missing/foreign category; INCOME rejection; duplicate precheck and named-constraint race translation versus unrelated failures; valid/invalid periods; exact-limit and overspend arithmetic; empty aggregates; edits with inactive categories. Use User-principal fixtures and clear SecurityContext after each test. Verify failed business validation does not persist changes.
- [x] `budget/BudgetControllerTest`: Transaction-style MVC slice with filters disabled, mock service/filter and Jackson 3 imports. Verify proposed routes/statuses/JSON; list empty response; required/ranged period values; amount null/zero/negative/excess precision; missing or invalid category; malformed JSON/ID syntax; 404/409/400 advice. Verify service is not invoked when binding/validation rejects input. These tests do not prove JWT authorization.
- [x] `budget/BudgetRepositoryTest`: real PostgreSQL/Flyway mapping; composite uniqueness including different users/categories/periods; required fields/FKs; amount and period CHECKs; owned queries and monthly list ordering. Use saveAndFlush to execute constraints and isolate each constraint failure in its own rolled-back test.
- [x] Extend `transaction/TransactionRepositoryTest` to cover the newly added grouped aggregate: zero results, multiple rows/categories/accounts, owner/type/category exclusions, month-start inclusion and next-month exclusion, leap February and December rollover, historical inactive account/category rows. Test query results rather than just verifying method calls.
- [x] `budget/BudgetIntegrationTest`: real JWT register/login and PostgreSQL; successful CRUD/persistence; missing/invalid tokens 401; user B cannot list/get/update/delete A's budgets; shared system category budgets remain independent; own custom eligibility, foreign/inactive/INCOME rejection; duplicate 409; hard deletion/recreation; progress before and after Transaction create/update/delete, including date/category/type movement; historical visibility after deactivation. Include the race-error mapping at the most practical layer and ensure a normal duplicate HTTP request gives 409.
- [x] Preserve V7 system categories. Cleanup Budget rows and Transaction rows before custom Categories/Accounts, then Users; use unique emails and independent fixtures. Account for any additional FK cleanup only where tests actually share data. Use dates derived from the current date or safe past dates for HTTP transaction requests because @PastOrPresent applies; explicit future date fixtures are valid only for repository tests bypassing request validation.

## Phase 5 — Verification

- [x] From `cointrail-api/`, run `mvn "-Dtest=BudgetServiceImplTest,BudgetControllerTest" test` for targeted service/API behavior.
- [x] Run `mvn "-Dtest=BudgetRepositoryTest,TransactionRepositoryTest,BudgetIntegrationTest" test` with Docker available, verifying Flyway/JPA and real security behavior.
- [x] Run required `mvn clean verify` and resolve failures from their actual cause. Existing `*IntegrationTest` classes run in the normal test lifecycle. On Windows, `./mvnw.cmd` can substitute for mvn if needed.
- [x] Review final diff, confirm no changes to applied migrations, frontend or legacy Expense, no unscoped authentication/domain refactors, and no unrelated files.
- [x] Update plan checkboxes only after each implementation task and corresponding validation exist. Record any changed business decisions or necessary deviations.

## Expected Files

Created files follow the inspected domain/test naming conventions.

Under `cointrail-api/src/main/`:

- `resources/db/migration/V11__create_budgets_table.sql` (V11 was rechecked before creation).
- `java/com/deepak/cointrailapi/budget/{Budget,BudgetDetails,BudgetRepository,BudgetService,BudgetServiceImpl,BudgetController}.java`.
- `java/com/deepak/cointrailapi/budget/dto/{CreateBudgetRequest,UpdateBudgetRequest,BudgetResponse}.java`.
- `java/com/deepak/cointrailapi/common/exception/{BudgetNotFoundException,BudgetAlreadyExistsException,InvalidBudgetException}.java`.
- `java/com/deepak/cointrailapi/transaction/CategoryExpenseTotal.java`, the interface projection used by the grouped spending query.

Existing production files modified:

- `src/main/java/com/deepak/cointrailapi/transaction/TransactionRepository.java` for the new spending query.
- `src/main/java/com/deepak/cointrailapi/common/exception/GlobalExceptionHandler.java` for Budget statuses and any specifically verified binding failures.

Under `cointrail-api/src/test/java/com/deepak/cointrailapi/`:

- New `budget/{BudgetServiceImplTest,BudgetControllerTest,BudgetRepositoryTest,BudgetIntegrationTest}.java`.
- Existing `transaction/TransactionRepositoryTest.java` for aggregate behavior.

Plan artifact: `.agents/plans/000-monthly-budget-api.md`. No dependency, shared fixture, security configuration, frontend, Account/Category production changes, or transaction service changes were needed.

## Implementation Notes

- Phase 2 uses scalar service inputs and an internal `BudgetDetails` record so the service compiles independently of the Phase 3 HTTP DTOs. The service maps entities and live spending inside its transaction; the thin controller copies that result into `BudgetResponse`. This differs from the original proposed request-object service signature without changing the approved API contract.
- New amount DTO precision validation improves the Budget boundary without changing existing Transaction precision policy. PostgreSQL NUMERIC coerces fractional scale, so @Digits is the API rejection mechanism; CHECK amount > 0 and numeric precision remain database protections.
- A live grouped aggregate avoids stale totals and a query per budget. A Budget row's createdAt must never constrain spending: transactions earlier in that same month count. No account opening balance or legacy Expense value contributes.
- A monthly list fetch and aggregate normally use the database's default transaction isolation; this proposal does not promise a snapshot across simultaneous writes. If strict snapshot or concurrent update conflict semantics are required, record that requirement before adding isolation/locking/version columns.
- Database CHECK constraints cannot inspect another table's category ownership/type. Creation validates those rules in the service; adding triggers would introduce a new pattern and is outside this proposal. Current APIs keep category ownership/type immutable and soft-delete categories, preserving FKs for historical reads.
- Global exception advice currently lacks a data-integrity mapping. Budget-specific race translation should be narrow and covered by tests; do not silently change error semantics for Account/Category or expose SQL/constraint details to clients.
- Local repository patterns remain the authority. Framework-specific binding, validation and JDBC date behavior were verified through the existing dependencies and tests.
