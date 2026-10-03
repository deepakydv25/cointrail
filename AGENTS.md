# CoinTrail Agent Instructions

CoinTrail is a full-stack personal finance application.

## Repository Structure

- `cointrail-api/` — Java/Spring Boot backend
- `cointrail-frontend/` — React frontend
- `.agents/skills/` — reusable agent workflows
- `.agents/plans/` — feature implementation plans
- `.agents/investigations/` — investigation and debugging notes

## General Working Rules

1. Inspect the existing repository before making changes.
2. Do not guess existing classes, methods, database schema, migrations, or conventions.
3. Prefer following an existing CoinTrail implementation pattern over introducing a new pattern.
4. Keep changes scoped to the requested feature.
5. Do not refactor unrelated code while implementing a feature.
6. Understand the business rules before modifying production code.
7. Do not consider work complete until the relevant tests pass.
8. For substantial features, create or follow an implementation plan in `.agents/plans/`.

## Backend

The backend is located in `cointrail-api/`.

Current stack:

- Java 25
- Spring Boot
- Maven
- PostgreSQL
- Flyway
- Spring Security with JWT
- JUnit
- Mockito
- Testcontainers

When working on backend features:

- Inspect similar completed domains before implementing a new one.
- Current reference domains include `account`, `category`, and `transaction`.
- Follow the existing package and naming conventions.
- Use constructor injection.
- Use DTOs at API boundaries.
- Keep business logic in the service layer.
- Use `@Transactional` for write operations.
- Use `@Transactional(readOnly = true)` where appropriate for reads.

## Database and Flyway

1. Inspect all existing migrations before creating a new migration.
2. Determine the latest migration version from the repository; never assume the next version.
3. Never modify an already-applied Flyway migration.
4. Add a new migration for schema changes.
5. Use PostgreSQL-compatible SQL.
6. Enforce important data invariants at the database level where appropriate.
7. Keep application validation and database constraints consistent.

## Security and Ownership

For user-owned resources:

- Derive the current user from the authenticated security context.
- Never trust a user ID supplied by the client for ownership.
- Ensure users cannot access or modify another user's resources.
- Preserve the existing not-found/ownership behavior used by the application.

## Testing

Follow the existing CoinTrail testing approach.

Depending on the feature, testing may include:

- service unit tests
- controller slice tests
- repository tests
- integration tests
- PostgreSQL Testcontainers

Run targeted tests while implementing a feature.

Before considering backend work complete, run:

```bash
mvn clean verify