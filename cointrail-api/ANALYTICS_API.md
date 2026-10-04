# Analytics API

All five endpoints require a JWT and analyze only the authenticated user's ordinary V2 Transactions. Amounts are JSON numbers backed by PostgreSQL NUMERIC/Java BigDecimal; counts are integer `long` values. The current single implicit monetary unit is preserved.

| GET endpoint | Required parameters | Response |
| --- | --- | --- |
| `/api/analytics/summary` | `from`, `to` | `{range, totals}` |
| `/api/analytics/categories` | `from`, `to` | `{range, totals, items}` |
| `/api/analytics/accounts` | `from`, `to` | `{range, totals, items}` |
| `/api/analytics/trends` | `from`, `to`, `grouping` | `{range, grouping, totals, items}` |
| `/api/analytics/comparison` | `from`, `to`, `compareFrom`, `compareTo` | `{current, baseline, delta}` |

Dates are explicit ISO calendar dates, inclusive, in public years 0001–9999. `from <= to`; a same-day range is valid. Past and future ranges are supported, using persisted actuals only. There are no implicit defaults, resource/type selectors, pagination, top-N or client sorting.

## Range limits

Summary, categories, accounts and each comparison side independently require `to < from.plusYears(5)`. WEEKLY trends require `to < from.plusYears(2)`; MONTHLY trends require `to < from.plusYears(5)`. These are calendar anniversaries, not approximate day constants. DAILY trends allow at most 366 inclusive days.

`LocalDate.plusYears` clamps an invalid February 29 anniversary to February 28; the last inclusive date is then one day before that anniversary. Examples:

- Five years from 2020-01-01: last allowed date 2024-12-31 (1827 days).
- Two years from 2023-01-01: last allowed date 2024-12-31 (731 days).
- Two years from 2024-02-29: last allowed date 2026-02-27.
- Five years from 2024-02-29: last allowed date 2029-02-27.

An internal anniversary may exceed year 9999 without being clamped to the public ceiling. A public end date of 9999-12-31 is allowed when within the applicable limit; its internal SQL exclusive bound is 10000-01-01. Missing/malformed dates, reversed ranges, unsupported public years, missing/invalid grouping and over-limit ranges return the existing ErrorResponse with HTTP 400. Missing/invalid JWT returns 401.

## Response values

`range` contains `{from, to, dayCount}`. Every `totals` contains `{income, expense, netCashFlow, transactionCount}`. Income/expense sum positive stored amounts of their respective types, net cash flow is income minus expense and count includes both types. Negative net cash flow is preserved. Empty data returns HTTP 200 with zero money/count.

For example, `/api/analytics/summary?from=2024-02-01&to=2024-02-29`:

```json
{
  "range": {"from": "2024-02-01", "to": "2024-02-29", "dayCount": 29},
  "totals": {"income": 1000.00, "expense": 1250.50, "netCashFlow": -250.50, "transactionCount": 12}
}
```

Categories return complete activity-bearing groups ordered by ascending stable category ID: `{categoryId, categoryName, categoryType, system, active, totals}`. Accounts similarly return `{accountId, accountName, accountType, active, totals}`, ordered by account ID. Groups use current reference metadata, retain inactive historical references and exclude dimensions with no actual activity in the selected range. Matching names never merge distinct IDs. No balances, percentages or shares are returned. Empty breakdowns have `items: []`.

Trends support exactly `DAILY`, `WEEKLY`, `MONTHLY`. Each ascending bucket contains `{from, to, totals}`; dates are inclusive and clipped to the requested range. Weeks start Monday; months use calendar boundaries. Gaps are zero-filled, including an entirely empty range. Clipped edge buckets are partial periods, with no extrapolation or averaging. The limits bound output to at most 366 daily, 106 weekly or 61 monthly buckets. Grouping uses the stored financial DATE without timezone conversion, and has no dependency on the recurring Clock.

Comparison returns `current` and `baseline` summary envelopes using the explicit ranges. Ranges may overlap or have different lengths. `delta` contains signed current-minus-baseline values for all four totals, including count; no percentages, inferred previous periods or duration normalization.

## Data and consistency

All SUM, COUNT and GROUP BY work runs in PostgreSQL with owner/date predicates. Java maps scalar projections, computes net/deltas and fills bounded missing buckets. Summary uses one data query; other endpoints use two. JWT user loading is separate. No Transaction collections or managed financial entities are loaded to calculate Analytics.

Reads use normal read-only READ_COMMITTED transactions. Concurrent committed writes can briefly make envelope totals and grouped items differ between statements; this is not a snapshot API. Nothing is persisted, locked or synchronized with recurring generation.

Generated recurring actuals count once on their scheduled transaction date. Worker catch-up can add historical actuals later; ordinary transaction edits/deletes affect subsequent analysis. Templates, occurrence markers (including markers retained after deletion), Budget limits, legacy Expenses and opening balances do not contribute. GETs never generate recurring transactions or advance their state.

Dashboard remains unchanged and owns active-account balance, its compact monthly/Budget summary and recent/pending previews. `/api/transactions` remains the existing drill-down API. Analytics adds no forecasting, AI insights, Budget analytics, recurring projections, bank imports, currency conversion, net-worth history, exports or frontend work.
