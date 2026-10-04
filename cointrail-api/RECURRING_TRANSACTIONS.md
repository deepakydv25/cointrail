# Recurring Transactions

Authenticated V2 endpoints:

- `POST /api/recurring-transactions`: accountId, categoryId, type (EXPENSE/INCOME), amount, optional description, frequency (DAILY/WEEKLY/MONTHLY/YEARLY), startDate and optional inclusive endDate.
- `GET /api/recurring-transactions`: owner-only Page; optional status, type, accountId, categoryId; size default 20, capped at 100. Sort by createdAt, updatedAt or nextDueDate; ID breaks ties.
- `GET /api/recurring-transactions/{id}`: includes retained terminal templates.
- `PUT /api/recurring-transactions/{id}`: accountId, categoryId, amount, optional description. Type and schedule are immutable.
- `DELETE /api/recurring-transactions/{id}`: retained cancellation; posted transactions survive.
- `POST /api/recurring-transactions/{id}/pause` and `/resume`: explicit user pause and anchored resume on/after today.

Creation requires startDate today or future in the recurring timezone. Monthly/yearly dates clamp to month end using the original anchor. The worker automatically posts scheduled dates through today, catching up downtime and blocked periods chronologically in bounded batches. User PAUSED dates are skipped after resume. BLOCKED resources are automatically rechecked; owner account/category repair is allowed while BLOCKED with backlog. Actual amount/description changes return 409 while today/overdue unprocessed work remains. Keep unchanged financial values in repair PUT requests; mixed financial/repair edits fail atomically. Terminal edit/pause/resume and BLOCKED resume return 409. Missing/foreign resources return 404.

Occurrence identities survive ordinary generated Transaction edits and deletion, preventing regeneration. Generated expense entries participate in Budget spending by transactionDate without stored counters.

## Deployment

| Environment variable | Value |
| --- | --- |
| RECURRING_TIMEZONE | Required IANA ZoneId, for example UTC; keep stable for existing series |
| RECURRING_ENABLED | Set true to run automatic posting; default false for explicit rollout |
| RECURRING_POLL_INTERVAL | Positive ISO duration; default PT1M |
| RECURRING_TEMPLATE_BATCH_SIZE | Positive template limit per cycle; default 100 |
| RECURRING_OCCURRENCE_BATCH_SIZE | Positive occurrences per template transaction; default 50 |

V12 adds templates and durable occurrence identities. Deploy the timezone configuration with the release, then enable generation. Multiple instances may run the job: database template locks and occurrence uniqueness protect posting. Keyset continuation provides bounded scanning fairness, including permanently blocked rows. Failed transactions roll back ledger rows, occurrences and cursor together and retry in later cycles. Tests disable the job and invoke the worker explicitly. No public generation/recovery endpoint exists.

## Timezone compatibility boundary

Only recurring schedule validation, edit guards, resume, posting cutoffs and template/occurrence timestamps use the scoped recurring Clock. Account, Category, Transaction and Budget timestamp behavior and manual Transaction @PastOrPresent validation stay unchanged. Generated Transaction timestamps use their existing local timestamp convention, while transactionDate is the recurring scheduled date.

Near midnight, recurring today can be tomorrow relative to the manual API's validation clock. The worker still posts that valid recurring scheduled date. A subsequent normal Transaction update using the same date may temporarily fail manual date validation until that clock catches up. This accepted boundary does not shift or skip occurrences. There is no global ClockProvider or JVM timezone override; do not change the deployed recurring timezone for existing series.
