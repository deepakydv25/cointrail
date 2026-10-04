---
name: feature-delivery
description: Deliver an approved CoinTrail feature from implementation through verification, commit, push, and pull request creation while preserving human approval boundaries.
---

# Feature Delivery

Use this skill when a CoinTrail implementation plan has already been reviewed and explicitly approved.

This skill coordinates feature implementation and delivery.

Detailed implementation and testing rules remain in the applicable skills such as:

- `spring-backend-feature`
- `testing`

Do not use this skill to bypass the planning process.

# Preconditions

Before implementation begins:

1. Read `AGENTS.md`.
2. Read the approved plan under `.agents/plans/`.
3. Read all applicable skills.
4. Confirm the plan has been explicitly approved by the user.
5. Confirm the local base branch is up to date.
6. Confirm feature work will happen on a dedicated feature branch.

If the plan has not been approved:

- do not implement the feature
- do not create production code
- stop and request plan approval

# Core Rules

- Follow the approved plan.
- Inspect existing code before modifying it.
- Do not guess repository state.
- Keep changes scoped to the approved feature.
- Do not refactor unrelated code.
- Do not modify existing applied Flyway migrations.
- Do not modify frontend or legacy functionality unless explicitly included in the plan.
- Do not modify `AGENTS.md` or files under `.agents/skills/` as part of normal feature implementation.
- Do not weaken tests to make the build pass.
- Never merge the pull request.

# Delivery Workflow

## 1. Prepare the Branch

Before implementation:

1. Check the current Git status.
2. Ensure there are no unexpected uncommitted changes.
3. Update the local base branch.
4. Create or switch to the feature branch specified for the work.

Use the repository's existing branch naming conventions.

Do not overwrite or discard user changes.

# 2. Implement the Approved Plan

Execute the approved plan in its defined phases.

For backend features, use the `spring-backend-feature` skill.

General workflow:

1. Implement one logical phase.
2. Review the changes.
3. Run appropriate validation.
4. Update completed plan checkboxes.
5. Continue to the next approved phase.

Do not mark plan items complete before the corresponding work has actually been completed and validated.

If implementation reveals that the approved plan is materially incorrect:

1. Stop implementation.
2. Document the discovered issue.
3. Update or propose an update to the plan.
4. Request human approval before continuing when the change affects business rules, API contracts, schema design, security, or feature scope.

Minor implementation details that do not change the approved behavior may be resolved without another approval.

# 3. Testing

Use the `testing` skill.

Run targeted tests while implementing the feature.

Testing should cover the appropriate layers based on the feature, which may include:

- service unit tests
- controller tests
- repository tests
- integration tests
- database constraint tests
- ownership/security tests

If a test reveals a genuine implementation defect:

- diagnose the root cause
- make the smallest correct fix
- rerun the affected tests

Never:

- remove a valid failing test
- disable a test
- weaken an assertion merely to make it pass
- bypass a database constraint to achieve a green build

# 4. Final Verification

After all implementation phases and targeted tests are complete, perform final backend verification.

From `cointrail-api/` run:

`mvn clean verify`

If verification fails:

1. identify the root cause
2. make the smallest appropriate fix within the approved scope
3. rerun the affected tests
4. rerun `mvn clean verify`

Do not continue to delivery while the required verification is failing.

# 5. Review the Final Diff

Before committing:

1. Run `git status`.
2. Review the complete feature diff.
3. Confirm every changed file belongs to the approved feature.
4. Confirm no unrelated code was modified.
5. Confirm no existing Flyway migration was modified.
6. Confirm no accidental frontend or legacy changes were introduced.
7. Confirm the implementation plan reflects the actual implementation.
8. Confirm all completed plan items are checked.

If unexpected changes exist, investigate them before committing.

# 6. Commit

After implementation and verification are successful:

1. Stage only the intended feature files.
2. Create a concise commit message following the repository's existing convention.

Prefer conventional commit prefixes already used by CoinTrail, such as:

- `feat:`
- `fix:`
- `test:`
- `chore:`

Do not amend, squash, rebase, force-push, or rewrite existing history unless explicitly requested.

# 7. Push

Push the feature branch to the remote repository.

Never force-push unless explicitly requested.

Confirm the push succeeds before creating the pull request.

# 8. Create Pull Request

Create a pull request targeting the appropriate base branch.

For current CoinTrail feature development, the normal target is:

`develop`

Before creating the PR:

1. inspect recent CoinTrail pull requests
2. follow the repository's existing PR description style
3. keep the description concise
4. describe only work actually included in the branch

Use this general structure:

## Summary

A short description of the feature.

### Changes

- key implementation change
- key business behavior
- important validation/security behavior
- important persistence/API change

### Testing

- relevant test coverage
- final verification result

Do not produce an unnecessarily long PR description.

# 9. CI

After creating the pull request:

1. inspect the available CI checks
2. report their current state
3. if checks finish during the session, inspect failures if any

If CI fails:

- investigate the failure
- determine whether it is caused by the feature
- make the smallest appropriate fix if it is within scope
- rerun local verification as appropriate
- commit and push the fix

Do not merge the PR even when every CI check passes.

# 10. Stop for Human Review

Once the PR has been created and the available CI state has been checked, stop.

Report:

- branch name
- implementation summary
- tests added or modified
- `mvn clean verify` result
- commit created
- PR created
- CI status
- any known issues or follow-up work

The user performs the final PR review and decides whether to merge.

# Human Approval Boundaries

Human approval is required before:

- implementing an unapproved plan
- materially changing approved business rules
- materially changing an approved API contract
- materially changing schema design beyond the approved plan
- expanding feature scope
- modifying agent instructions or skills
- merging a pull request
- rewriting Git history
- force-pushing

# Agent Instruction Changes

Normal feature work must not modify:

- `AGENTS.md`
- `.agents/skills/**`

If implementation reveals a reusable workflow improvement:

1. mention the proposed improvement in the final report
2. do not modify the agent instructions automatically
3. recommend handling the improvement in a separate agent/tooling change

Plans under `.agents/plans/` may be updated as part of feature work because they track implementation progress.

# Safety Around Existing Work

Never discard uncommitted user changes.

Before operations that could affect existing work:

- inspect `git status`
- preserve unrelated changes
- stop if the operation could overwrite or lose user work

Do not use destructive Git commands unless explicitly requested.

# Completion Criteria

Feature delivery is complete when:

- the approved plan has been implemented
- appropriate targeted tests pass
- `mvn clean verify` passes
- the final diff has been reviewed
- the plan reflects the implementation
- intended changes are committed
- the feature branch is pushed
- a PR targeting the correct base branch exists
- available CI status has been checked
- the PR has NOT been merged
- the feature is waiting for human review