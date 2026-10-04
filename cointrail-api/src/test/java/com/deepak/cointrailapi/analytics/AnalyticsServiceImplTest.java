package com.deepak.cointrailapi.analytics;

import com.deepak.cointrailapi.transaction.*;
import com.deepak.cointrailapi.user.User;
import com.deepak.cointrailapi.common.exception.InvalidAnalyticsException;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.mockito.junit.jupiter.MockitoExtension;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AnalyticsServiceImplTest {
    @Mock TransactionRepository transactions;
    AnalyticsServiceImpl service;
    final LocalDate from = LocalDate.of(2024, 2, 1), to = LocalDate.of(2024, 2, 29);

    @BeforeEach void setup() {
        service = new AnalyticsServiceImpl(transactions);
        User user = new User(); user.setId(7L);
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(user, null, List.of()));
    }
    @AfterEach void clear() { SecurityContextHolder.clearContext(); }
    AnalyticsTotalsProjection row(String income, String expense, long count) {
        var row = mock(AnalyticsTotalsProjection.class);
        when(row.getIncome()).thenReturn(new BigDecimal(income));
        when(row.getExpense()).thenReturn(new BigDecimal(expense));
        when(row.getTransactionCount()).thenReturn(count);
        return row;
    }
    @Test void mapsExactTotalsAndExclusiveBoundary() {
        var totals = row("1.23", "3.45", 4);
        when(transactions.analyticsTotals(7L, from, to.plusDays(1))).thenReturn(totals);
        var result = service.summary(from, to);
        assertThat(result.range().dayCount()).isEqualTo(29);
        assertThat(result.totals().netCashFlow()).isEqualByComparingTo("-2.22");
        assertThat(result.totals().transactionCount()).isEqualTo(4);
        verify(transactions).analyticsTotals(7L, from, LocalDate.of(2024, 3, 1));
    }
    @Test void emptySummaryNormalizesNullSumsAndCount() {
        var row = mock(AnalyticsTotalsProjection.class);
        when(transactions.analyticsTotals(anyLong(), any(), any())).thenReturn(row);
        assertThat(service.summary(from, to).totals()).isEqualTo(AnalyticsDetails.Totals.zero());
    }
    @Test void missingOrWrongPrincipalCannotQuery() {
        SecurityContextHolder.clearContext();
        assertThatThrownBy(() -> service.summary(from, to)).isInstanceOf(AccessDeniedException.class);
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("user", null, List.of()));
        assertThatThrownBy(() -> service.summary(from, to)).isInstanceOf(AccessDeniedException.class);
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(new User(), null));
        assertThatThrownBy(() -> service.summary(from, to)).isInstanceOf(AccessDeniedException.class);
        verifyNoInteractions(transactions);
    }
    @Test void allInvalidRequestsRejectBeforeQueries() {
        LocalDate start = LocalDate.of(2024, 2, 29), anniversary = start.plusYears(5);
        assertThatThrownBy(() -> service.summary(start, anniversary)).isInstanceOf(InvalidAnalyticsException.class);
        assertThatThrownBy(() -> service.categories(start, anniversary)).isInstanceOf(InvalidAnalyticsException.class);
        assertThatThrownBy(() -> service.accounts(start, anniversary)).isInstanceOf(InvalidAnalyticsException.class);
        assertThatThrownBy(() -> service.trends(start, start.plusDays(366), AnalyticsGrouping.DAILY)).isInstanceOf(InvalidAnalyticsException.class);
        assertThatThrownBy(() -> service.trends(start, start.plusYears(2), AnalyticsGrouping.WEEKLY)).isInstanceOf(InvalidAnalyticsException.class);
        assertThatThrownBy(() -> service.trends(start, anniversary, AnalyticsGrouping.MONTHLY)).isInstanceOf(InvalidAnalyticsException.class);
        assertThatThrownBy(() -> service.trends(start, start, null)).isInstanceOf(InvalidAnalyticsException.class);
        assertThatThrownBy(() -> service.comparison(from, to, start, anniversary)).isInstanceOf(InvalidAnalyticsException.class);
        assertThatThrownBy(() -> service.comparison(start, anniversary, from, to)).isInstanceOf(InvalidAnalyticsException.class);
        assertThatThrownBy(() -> service.summary(null, to)).isInstanceOf(InvalidAnalyticsException.class);
        assertThatThrownBy(() -> service.summary(to, from)).isInstanceOf(InvalidAnalyticsException.class);
        verifyNoInteractions(transactions);
    }
    @ParameterizedTest @EnumSource(AnalyticsGrouping.class)
    void zeroFillsSameDayAndPublicDateExtremes(AnalyticsGrouping grouping) {
        when(transactions.analyticsBuckets(anyLong(), any(), any(), any())).thenReturn(List.of());
        for (LocalDate date : List.of(LocalDate.of(1, 1, 1), LocalDate.of(9999, 12, 31), LocalDate.of(2024, 2, 29))) {
            var result = service.trends(date, date, grouping);
            assertThat(result.items()).containsExactly(new AnalyticsDetails.Bucket(date, date, AnalyticsDetails.Totals.zero()));
        }
    }
    @Test void clipsMondayWeeksAcrossYearAndFillsSparseGap() {
        var row = mock(AnalyticsBucketProjection.class);
        when(row.getBucketStart()).thenReturn(LocalDate.of(2023, 12, 25));
        when(row.getIncome()).thenReturn(new BigDecimal("10.01"));
        when(row.getExpense()).thenReturn(new BigDecimal("11.02"));
        when(row.getTransactionCount()).thenReturn(2L);
        when(transactions.analyticsBuckets(7L, LocalDate.of(2023,12,31), LocalDate.of(2024,1,10), "week")).thenReturn(List.of(row));
        var result = service.trends(LocalDate.of(2023,12,31), LocalDate.of(2024,1,9), AnalyticsGrouping.WEEKLY);
        assertThat(result.items()).extracting(AnalyticsDetails.Bucket::from).containsExactly(LocalDate.of(2023,12,31),LocalDate.of(2024,1,1),LocalDate.of(2024,1,8));
        assertThat(result.items()).extracting(AnalyticsDetails.Bucket::to).containsExactly(LocalDate.of(2023,12,31),LocalDate.of(2024,1,7),LocalDate.of(2024,1,9));
        assertThat(result.items().getFirst().totals().netCashFlow()).isEqualByComparingTo("-1.01");
        assertThat(result.items().get(1).totals()).isEqualTo(AnalyticsDetails.Totals.zero());
    }
    @Test void monthlyEdgesAndMultiYearRangesAreNotDailyLimited() {
        when(transactions.analyticsBuckets(anyLong(), any(), any(), any())).thenReturn(List.of());
        var partial = service.trends(LocalDate.of(2024,1,31), LocalDate.of(2024,3,1), AnalyticsGrouping.MONTHLY);
        assertThat(partial.items()).extracting(AnalyticsDetails.Bucket::to).containsExactly(LocalDate.of(2024,1,31),LocalDate.of(2024,2,29),LocalDate.of(2024,3,1));
        var weekly = service.trends(LocalDate.of(2023,1,1),LocalDate.of(2024,12,31),AnalyticsGrouping.WEEKLY);
        assertThat(weekly.range().dayCount()).isEqualTo(731); assertThat(weekly.items()).hasSize(106);
        var monthly = service.trends(LocalDate.of(2020,1,31),LocalDate.of(2025,1,30),AnalyticsGrouping.MONTHLY);
        assertThat(monthly.items()).hasSize(61);
        assertThat(monthly.items().getLast().to()).isEqualTo(LocalDate.of(2025,1,30));
        assertThat(service.trends(from,from.plusDays(365),AnalyticsGrouping.DAILY).items()).hasSize(366);
    }
    @Test void breakdownMappingKeepsStableOrderAndCurrentInactiveMetadata() {
        var category=mock(AnalyticsCategoryProjection.class);
        when(category.getCategoryId()).thenReturn(11L);when(category.getCategoryName()).thenReturn("Old reference");
        when(category.getCategoryType()).thenReturn(com.deepak.cointrailapi.category.CategoryType.EXPENSE);
        when(category.getSystem()).thenReturn(true);when(category.getActive()).thenReturn(false);
        when(category.getExpense()).thenReturn(new BigDecimal("1.23"));when(category.getTransactionCount()).thenReturn(1L);
        when(transactions.analyticsCategories(7L,from,to.plusDays(1))).thenReturn(List.of(category));
        var mapped=service.categories(from,to).items().getFirst();
        assertThat(mapped.categoryId()).isEqualTo(11L);assertThat(mapped.categoryName()).isEqualTo("Old reference");
        assertThat(mapped.system()).isTrue();assertThat(mapped.active()).isFalse();assertThat(mapped.totals().netCashFlow()).isEqualByComparingTo("-1.23");
        var account=mock(AnalyticsAccountProjection.class);
        when(account.getAccountId()).thenReturn(12L);when(account.getAccountName()).thenReturn("Renamed");
        when(account.getAccountType()).thenReturn(com.deepak.cointrailapi.account.AccountType.WALLET);
        when(account.getActive()).thenReturn(false);when(account.getTransactionCount()).thenReturn(1L);
        when(transactions.analyticsAccounts(7L,from,to.plusDays(1))).thenReturn(List.of(account));
        var accountResult=service.accounts(from,to).items().getFirst();
        assertThat(accountResult.accountId()).isEqualTo(12L);assertThat(accountResult.accountName()).isEqualTo("Renamed");
        assertThat(accountResult.accountType()).isEqualTo(com.deepak.cointrailapi.account.AccountType.WALLET);assertThat(accountResult.active()).isFalse();
    }
    @Test void comparisonUsesExplicitOverlappingUnequalRangesAndSignedDeltas() {
        var current = row("10.01","20.02",2);
        var baseline = row("20.03","30.04",5);
        when(transactions.analyticsTotals(7L,from,to.plusDays(1))).thenReturn(current);
        when(transactions.analyticsTotals(7L,from,from.plusDays(1))).thenReturn(baseline);
        var result = service.comparison(from,to,from,from);
        assertThat(result.baseline().range().dayCount()).isEqualTo(1);
        assertThat(result.delta().income()).isEqualByComparingTo("-10.02");
        assertThat(result.delta().expense()).isEqualByComparingTo("-10.02");
        assertThat(result.delta().netCashFlow()).isEqualByComparingTo("0");
        assertThat(result.delta().transactionCount()).isEqualTo(-3);
        assertThat(service.comparison(from,to,from,to).delta()).isEqualTo(AnalyticsDetails.Totals.zero());
    }
}
