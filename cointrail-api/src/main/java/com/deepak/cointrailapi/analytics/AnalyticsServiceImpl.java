package com.deepak.cointrailapi.analytics;

import com.deepak.cointrailapi.analytics.AnalyticsDetails.*;
import com.deepak.cointrailapi.transaction.AnalyticsTotalsProjection;
import com.deepak.cointrailapi.transaction.TransactionRepository;
import com.deepak.cointrailapi.user.User;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;

@Service
@Transactional(readOnly = true)
public class AnalyticsServiceImpl implements AnalyticsService {
    private final TransactionRepository transactions;

    public AnalyticsServiceImpl(TransactionRepository transactions) { this.transactions = transactions; }

    @Override
    public Summary summary(LocalDate from, LocalDate to) {
        Long owner = ownerId();
        AnalyticsRange range = AnalyticsRange.fiveYears(from, to);
        return summary(owner, range);
    }

    @Override
    public Categories categories(LocalDate from, LocalDate to) {
        Long owner = ownerId();
        AnalyticsRange range = AnalyticsRange.fiveYears(from, to);
        Totals totals = totals(owner, range);
        var items = transactions.analyticsCategories(owner, from, range.exclusiveTo()).stream()
                .map(row -> new CategoryGroup(row.getCategoryId(), row.getCategoryName(), row.getCategoryType(),
                        row.getSystem(), row.getActive(), totals(row))).toList();
        return new Categories(range, totals, items);
    }

    @Override
    public Accounts accounts(LocalDate from, LocalDate to) {
        Long owner = ownerId();
        AnalyticsRange range = AnalyticsRange.fiveYears(from, to);
        Totals totals = totals(owner, range);
        var items = transactions.analyticsAccounts(owner, from, range.exclusiveTo()).stream()
                .map(row -> new AccountGroup(row.getAccountId(), row.getAccountName(), row.getAccountType(),
                        row.getActive(), totals(row))).toList();
        return new Accounts(range, totals, items);
    }

    @Override
    public Trends trends(LocalDate from, LocalDate to, AnalyticsGrouping grouping) {
        Long owner = ownerId();
        AnalyticsRange range = AnalyticsRange.trends(from, to, grouping);
        Totals totals = totals(owner, range);
        String unit = switch (grouping) { case DAILY -> "day"; case WEEKLY -> "week"; case MONTHLY -> "month"; };
        var sparse = new HashMap<LocalDate, Totals>();
        for (var row : transactions.analyticsBuckets(owner, from, range.exclusiveTo(), unit))
            sparse.put(row.getBucketStart(), totals(row));
        LocalDate anchor = switch (grouping) {
            case DAILY -> from;
            case WEEKLY -> from.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
            case MONTHLY -> from.withDayOfMonth(1);
        };
        List<Bucket> buckets = new ArrayList<>();
        while (true) {
            LocalDate next = switch (grouping) {
                case DAILY -> anchor.plusDays(1);
                case WEEKLY -> anchor.plusWeeks(1);
                case MONTHLY -> anchor.plusMonths(1);
            };
            LocalDate start = anchor.isBefore(from) ? from : anchor;
            LocalDate end = next.minusDays(1).isAfter(to) ? to : next.minusDays(1);
            buckets.add(new Bucket(start, end, sparse.getOrDefault(anchor, Totals.zero())));
            if (end.equals(to)) break;
            anchor = next;
        }
        return new Trends(range, grouping, totals, List.copyOf(buckets));
    }

    @Override
    public Comparison comparison(LocalDate from, LocalDate to, LocalDate compareFrom, LocalDate compareTo) {
        Long owner = ownerId();
        // Validate both sides before either query, even when only the baseline is invalid.
        AnalyticsRange currentRange = AnalyticsRange.fiveYears(from, to);
        AnalyticsRange baselineRange = AnalyticsRange.fiveYears(compareFrom, compareTo);
        Summary current = summary(owner, currentRange);
        Summary baseline = summary(owner, baselineRange);
        return new Comparison(current, baseline, current.totals().minus(baseline.totals()));
    }

    private Summary summary(Long owner, AnalyticsRange range) { return new Summary(range, totals(owner, range)); }
    private Totals totals(Long owner, AnalyticsRange range) {
        return totals(transactions.analyticsTotals(owner, range.from(), range.exclusiveTo()));
    }
    private static Totals totals(AnalyticsTotalsProjection row) {
        return row == null ? Totals.zero() : Totals.of(row.getIncome(), row.getExpense(), row.getTransactionCount());
    }
    private static Long ownerId() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || !(auth.getPrincipal() instanceof User user))
            throw new AccessDeniedException("User is not authenticated");
        return user.getId();
    }
}
