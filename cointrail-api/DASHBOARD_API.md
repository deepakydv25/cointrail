# Dashboard API

`GET /api/dashboard?year=2026&month=10` requires JWT authentication and both parameters (year 1-9999, month 1-12). Valid past/current/future months are accepted. Missing or invalid parameters return 400; missing/invalid JWT returns 401. An owner with no data receives 200 with zero summaries and empty previews.

- `totalActiveAccountBalance`: signed opening balances plus all persisted income minus expense for currently active owned accounts, including credit cards without special debt/credit treatment. All stored dates participate; selected month and account creation dates do not impose cutoffs. This is a ledger balance in the existing implicit monetary unit, without currency conversion or bank reconciliation.
- `monthlySummary`: income, expense and netCashFlow (income minus expense) by Transaction date in the requested calendar month. Inactive account/category history participates. Future months contain persisted actuals only.
- `budgetSummary`: budgetCount, totalBudgetAmount, spentOnBudgetedCategories, remainingBudgetAmount and overBudgetCount. Existing Budget semantics apply: signed remaining amount, strictly exceeded limits, spending only on budgeted expense categories. No budgets means zeros even when the month has other expenses.
- `recentTransactions`: at most five owned actuals across all dates, ordered transactionDate DESC, createdAt DESC, id DESC. Includes income and expense and inactive historical references. Each item contains id, type, amount, description, transactionDate, accountId/accountName and categoryId/categoryName.
- `pendingRecurringTransactions`: asOfDate, throughDate, timezone and at most five items. Each item contains id, type, amount, description, frequency, nextDueDate, accountId/accountName, categoryId/categoryName, status, nullable blockedReason and overdue. ACTIVE/BLOCKED templates with nextDueDate through recurring today + 30 days inclusive participate, including overdue backlog. Order: nextDueDate ASC, id ASC. PAUSED/CANCELLED/COMPLETED are excluded. Due today is not overdue. Horizon is capped at 9999-12-31 at the supported date boundary.

Financial amounts are decimal JSON numbers; aggregate precision can exceed individual row precision. Names reflect current referenced names. Preview counts, pagination, hasMore and client limit/sort parameters are not part of this contract. Existing Transaction, Budget and Recurring APIs support detailed navigation.

Only the recurring preview uses the configured recurringClock zone. Capture today once per request; deployment must keep RECURRING_TIMEZONE stable. Existing manual transaction validation and other domain timestamp behavior are unchanged, including their midnight boundary with the recurring zone.

Actuals include generated Transactions exactly once and exclude templates, occurrence markers and legacy Expenses. Normal edits/deletions are reflected on subsequent reads. GET does not generate, repair, lock, resume, advance cursors or replay deleted occurrences. Pending cursors show current template values and operational state; they are not a forecast or posting guarantee. Worker lag or disabled scheduling can leave pending backlog.

Dashboard uses normal read-only READ_COMMITTED transactions. Concurrent committed writes may create brief differences between sections; no cross-query snapshot or synchronous catch-up guarantee is provided. No persisted dashboard data or cache is introduced. Totals use PostgreSQL aggregates, Budget spending reuses its grouped query, and previews use bounded queries with fetched names.

Detailed breakdowns, time series, comparisons, savings rates, historical balances and forecasts belong to future Analytics. This API includes no frontend, transfers, bank execution, currency modeling or notifications.
