---
name: spring-backend-feature
description: Implement CoinTrail Spring Boot backend features using the repository's established architecture, database, security, and development conventions.
---

# Spring Backend Feature

Use this skill when implementing or modifying a substantial backend feature under `cointrail-api/`.

Read `AGENTS.md` first and follow the approved implementation plan when one exists.

## Core Principles

- Inspect before implementing.
- Follow existing CoinTrail patterns instead of generating generic Spring Boot boilerplate.
- Keep changes scoped to the requested feature.
- Implement business rules explicitly.
- Preserve user ownership and security boundaries.
- Do not modify unrelated functionality.
- Do not modify existing applied Flyway migrations.

## Before Implementation

Before changing production code:

1. Read the applicable plan under `.agents/plans/`.
2. Inspect similar existing domains.
3. Inspect relevant Flyway migrations.
4. Inspect relevant exception handling.
5. Inspect existing tests.
6. Confirm the business rules and expected API behavior.

If no plan exists for a substantial feature, use the `planning` skill first.

## Reference Domains

Use existing implementations as references when appropriate:

- `account`
- `category`
- `transaction`

Do not assume every new feature should copy one reference exactly.

Choose patterns based on the feature's requirements.

## Implementation Order

Unless the approved plan requires a different order, use this general sequence:

1. Database migration
2. Entity/domain model
3. Repository
4. Request and response DTOs
5. Service interface
6. Service implementation
7. Domain exceptions
8. Global exception handling changes, if required
9. Controller
10. Tests
11. Verification

Do not create files merely because they appear in this list. Create only what the feature requires.

# Database

## Flyway

Before creating a migration:

1. Inspect `src/main/resources/db/migration`.
2. Determine the latest migration version.
3. Inspect relevant existing table definitions and constraints.
4. Create the next appropriate migration.

Never:

- edit an already-applied migration
- guess the next migration number
- duplicate an existing constraint
- add a schema change without understanding the current schema

## Constraints

Use database constraints for important invariants where appropriate.

Examples:

- foreign keys
- uniqueness
- positive monetary values
- required relationships
- valid state constraints

Application validation should not be the only protection for critical database invariants.

# Entity / Domain Model

Follow existing CoinTrail entity conventions.

Consider:

- identifiers
- relationships
- monetary values
- enums
- timestamps
- active/soft-delete state
- ownership

Use `BigDecimal` for monetary values.

Do not expose persistence entities directly as API contracts.

# Repository

Use Spring Data JPA following existing repository conventions.

Repository methods should express persistence queries and ownership constraints clearly.

Prefer ownership-aware queries where appropriate.

Examples of the existing style include querying by both:

- resource ID
- authenticated user's ID

Do not fetch a user-owned resource by ID alone and then accidentally expose it to another user.

Use custom queries or specifications only when derived repository methods are insufficient or existing project patterns justify them.

# DTOs

Use request and response DTOs at API boundaries.

Request DTOs should contain only client-controlled fields.

Do not accept ownership fields such as `userId` when ownership should come from authentication.

Use Jakarta validation annotations for request validation where appropriate.

Examples:

- `@NotBlank`
- `@NotNull`
- `@Positive`
- `@Size`

Do not duplicate service-level business rules as simple DTO validation when they require repository/domain knowledge.

# Service Layer

Business logic belongs in the service layer.

Service responsibilities may include:

- obtaining the authenticated user
- ownership validation
- duplicate detection
- cross-domain validation
- state-transition validation
- normalization such as trimming
- mapping entities to response DTOs

Use:

`@Transactional`

for write operations.

Use:

`@Transactional(readOnly = true)`

for appropriate read operations.

Do not trust identifiers from the request to establish ownership.

# Security and Ownership

For user-owned resources:

1. Obtain the authenticated user from the security context.
2. Resolve the application's User entity.
3. Query or validate resources using that user's identity.
4. Prevent cross-user access and modification.

Follow CoinTrail's existing behavior for resources that are inaccessible because of ownership.

Do not reveal another user's resource merely by returning different authorization behavior unless the existing application intentionally does so.

# Exceptions

Use domain-specific exceptions for expected business failures.

Examples of existing patterns include:

- not found
- duplicate resource
- invalid transaction/business operation

Before adding a new exception:

1. Inspect existing exceptions.
2. Determine whether an existing exception already represents the failure.
3. Inspect `GlobalExceptionHandler`.

Add or modify global handling only when required.

Do not expose internal exception details or stack traces through API responses.

# Controller

Controllers should remain thin.

Controller responsibilities should primarily be:

- route mapping
- request binding
- request validation
- calling the service
- returning the appropriate HTTP response

Do not move business logic into controllers.

Follow existing CoinTrail API conventions for:

- endpoint naming
- HTTP methods
- status codes
- request DTOs
- response DTOs
- pagination/filtering where applicable

# Cross-Domain Features

Before referencing another domain such as Account, Category, or Transaction:

1. Inspect its current implementation.
2. Understand ownership rules.
3. Understand active/inactive behavior.
4. Understand relevant database relationships.

Do not duplicate another domain's source of truth.

# Legacy Expense Module

The existing Expense implementation is legacy functionality.

Do not use it as the architectural reference for new V2 backend features unless the task explicitly concerns Expense migration or compatibility.

Prefer the newer:

- Account
- Category
- Transaction

domain model.

# Testing

After implementation, use the `testing` skill.

At minimum:

1. Run targeted tests for the changed feature.
2. Fix failures by understanding their cause.
3. Do not change tests simply to accommodate incorrect implementation.
4. Run the full backend verification before considering the feature complete.

From `cointrail-api/`:

`mvn clean verify`

# Plan Tracking

When implementing from a plan:

- complete one logical phase at a time
- update plan checkboxes after the corresponding work is actually complete
- record important deviations or newly discovered constraints
- do not silently diverge from the approved design

If implementation reveals that the plan is materially wrong, stop and update the plan before continuing.

# Completion Criteria

A backend feature is complete when:

- business rules are implemented
- database changes are correct
- ownership/security rules are enforced
- API contracts are implemented
- required tests exist
- targeted tests pass
- `mvn clean verify` passes
- the implementation plan is up to date
- the final diff contains no unintended changes