---
name: planning
description: Investigate the CoinTrail repository and create or maintain implementation plans for substantial features before production code is changed.
---

# Planning

Use this skill when planning a substantial CoinTrail feature or change.

The purpose of planning is to understand the existing implementation first and produce a concrete implementation plan based on the repository.

## Core Rule

Do not guess.

Inspect the repository before proposing:

- classes
- methods
- repository queries
- API endpoints
- database tables
- Flyway migrations
- tests
- package structure

A plan must describe changes based on the current repository state.

## Planning Workflow

### 1. Understand the Request

Identify:

- feature goal
- expected user behavior
- business rules
- affected backend/frontend areas
- explicit constraints

Do not start implementation yet.

### 2. Inspect Existing Implementation

Find similar completed features and inspect their:

- entity/model
- repository
- DTOs
- service
- service implementation
- controller
- exceptions
- tests
- integration tests

For backend work, prefer existing CoinTrail domains such as:

- account
- category
- transaction

Choose references based on similarity to the requested feature.

### 3. Inspect Database State

For database-related work:

- inspect existing Flyway migrations
- determine the latest migration version
- understand existing tables and constraints
- identify relationships with existing entities

Never assume the next Flyway version.

Never modify an already-applied migration.

### 4. Inspect Relevant Tests

Understand how the repository currently tests similar functionality.

Look for:

- service unit tests
- controller tests
- repository tests
- integration tests
- Testcontainers usage

The plan should include appropriate testing based on existing project conventions.

### 5. Define Business Rules

Before implementation, explicitly record important rules.

Examples include:

- ownership
- uniqueness
- validation
- allowed state changes
- relationships between domains
- authorization
- soft delete behavior
- database invariants

Do not leave important domain decisions hidden inside implementation steps.

### 6. Create the Plan

Plans belong in:

`.agents/plans/`

Use sequential numbering:

`000-feature-name.md`

`001-feature-name.md`

Before creating a plan, inspect existing plans and choose the next available number.

Use a short kebab-case feature name.

## Plan Format

Use the following structure:

# <Feature Name>

## Goal

Describe what the feature should accomplish.

## Existing State

Document relevant existing implementation discovered in the repository.

## Business Rules

- [ ] Rule or decision
- [ ] Rule or decision

## Phase 1 — Database / Domain

- [ ] Task
- [ ] Task

## Phase 2 — Repository / Service

- [ ] Task
- [ ] Task

## Phase 3 — API

- [ ] Task
- [ ] Task

## Phase 4 — Testing

- [ ] Service tests
- [ ] Controller tests
- [ ] Repository tests
- [ ] Integration tests

Include only test layers that are appropriate for the feature.

## Phase 5 — Verification

- [ ] Run targeted tests
- [ ] Run `mvn clean verify`
- [ ] Review final diff
- [ ] Confirm no unrelated changes

## Expected Files

List files expected to be created or modified based on repository investigation.

Do not invent file names without first inspecting project conventions.

## Implementation Notes

Record important technical decisions, dependencies, risks, or constraints discovered during planning.

## Plan Execution

After a plan is approved:

1. Execute one logical phase at a time.
2. Keep changes scoped to that phase.
3. Run relevant tests where appropriate.
4. Update completed checklist items in the plan.
5. Do not mark an item complete until the work actually exists and has been validated.
6. Stop and revise the plan if repository discoveries invalidate an assumption.

## Completion

A plan is complete only when:

- implementation tasks are complete
- required tests pass
- final verification passes
- the plan accurately reflects what was implemented