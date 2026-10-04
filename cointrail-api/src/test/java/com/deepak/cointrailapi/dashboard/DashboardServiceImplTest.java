package com.deepak.cointrailapi.dashboard;

import com.deepak.cointrailapi.account.*;
import com.deepak.cointrailapi.budget.*;
import com.deepak.cointrailapi.category.Category;
import com.deepak.cointrailapi.common.exception.InvalidDashboardException;
import com.deepak.cointrailapi.recurringtransaction.*;
import com.deepak.cointrailapi.transaction.*;
import com.deepak.cointrailapi.user.User;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.*;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

@ExtendWith(MockitoExtension.class)
class DashboardServiceImplTest {
    @Mock AccountRepository accounts;
    @Mock TransactionRepository transactions;
    @Mock BudgetService budgets;
    @Mock RecurringTransactionRepository recurring;
    DashboardServiceImpl service;
    Clock clock = Clock.fixed(Instant.parse("2024-02-01T10:30:00Z"), ZoneId.of("Pacific/Kiritimati"));
    @BeforeEach void setup() {
        service = new DashboardServiceImpl(accounts, transactions, budgets, recurring, clock);
        User user = new User(); user.setId(7L);
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(user, null, List.of()));
    }
    @AfterEach void cleanup() { SecurityContextHolder.clearContext(); }
    @Test void emptyOwnerGetsZerosAndRecurringZoneMetadata() {
        var result = service.getDashboard(2024, 2);
        assertThat(result.totalActiveAccountBalance()).isEqualByComparingTo("0.00");
        assertThat(result.monthlySummary().netCashFlow()).isZero();
        assertThat(result.budgetSummary().budgetCount()).isZero();
        assertThat(result.recentTransactions()).isEmpty();
        assertThat(result.pendingRecurringTransactions().items()).isEmpty();
        assertThat(result.pendingRecurringTransactions().asOfDate()).isEqualTo(LocalDate.of(2024,2,2));
        assertThat(result.pendingRecurringTransactions().throughDate()).isEqualTo(LocalDate.of(2024,3,3));
        assertThat(result.pendingRecurringTransactions().timezone()).isEqualTo("Pacific/Kiritimati");
        verify(transactions).sumByTypeForPeriod(7L, LocalDate.of(2024,2,1), LocalDate.of(2024,3,1));
        verify(recurring).findPendingForDashboard(eq(7L), eq(LocalDate.of(2024,3,3)), argThat(page -> page.getPageSize()==5));
    }
    @Test void exactSignedValuesAndPerBudgetOverrunsArePreserved() {
        when(accounts.sumActiveOpeningBalances(7L)).thenReturn(new BigDecimal("-10.10"));
        when(transactions.sumActiveAccountNetFlow(7L)).thenReturn(new BigDecimal("-20.20"));
        when(transactions.sumByTypeForPeriod(anyLong(),any(),any())).thenReturn(List.of(total(TransactionType.INCOME,"10.10"),total(TransactionType.EXPENSE,"125.55")));
        when(budgets.getBudgets(2024,2)).thenReturn(List.of(budget("100","125.55",true), budget("100","100",false),budget("100","0",false)));
        var result=service.getDashboard(2024,2);
        assertThat(result.totalActiveAccountBalance()).isEqualByComparingTo("-30.30");
        assertThat(result.monthlySummary().netCashFlow()).isEqualByComparingTo("-115.45");
        assertThat(result.budgetSummary().totalBudgetAmount()).isEqualByComparingTo("300");
        assertThat(result.budgetSummary().spentOnBudgetedCategories()).isEqualByComparingTo("225.55");
        assertThat(result.budgetSummary().remainingBudgetAmount()).isEqualByComparingTo("74.45");
        assertThat(result.budgetSummary().overBudgetCount()).isEqualTo(1);
    }
    @Test void mapsActualAndBlockedCursorWithoutResourceRevalidation() {
        Account account=new Account();account.setId(1L);account.setName("Card");
        Category category=new Category();category.setId(2L);category.setName("Food");
        Transaction t=new Transaction();t.setId(3L);t.setAccount(account);t.setCategory(category);t.setType(TransactionType.EXPENSE);t.setAmount(new BigDecimal("1.23"));t.setTransactionDate(LocalDate.of(2024,1,31));
        when(transactions.findByUserIdOrderByTransactionDateDescCreatedAtDescIdDesc(anyLong(),any())).thenReturn(List.of(t));
        RecurringTransaction r=new RecurringTransaction();r.setId(4L);r.setAccount(account);r.setCategory(category);r.setType(TransactionType.INCOME);r.setAmount(new BigDecimal("5.55"));r.setFrequency(RecurrenceFrequency.MONTHLY);r.setNextDueDate(LocalDate.of(2024,2,1));r.setStatus(RecurringTransactionStatus.BLOCKED);r.setBlockedReason("Account not found");
        when(recurring.findPendingForDashboard(anyLong(),any(),any())).thenReturn(List.of(r));
        var result=service.getDashboard(2024,2);
        assertThat(result.recentTransactions().getFirst().accountName()).isEqualTo("Card");
        var pending=result.pendingRecurringTransactions().items().getFirst();
        assertThat(pending.overdue()).isTrue();assertThat(pending.status()).isEqualTo(RecurringTransactionStatus.BLOCKED);
        assertThat(pending.blockedReason()).isEqualTo("Account not found");
    }
    @Test void maximumHorizonIsClamped() {
        service=new DashboardServiceImpl(accounts,transactions,budgets,recurring,Clock.fixed(LocalDate.of(9999,12,20).atStartOfDay(ZoneOffset.UTC).toInstant(),ZoneOffset.UTC));
        var result=service.getDashboard(9999,12);
        assertThat(result.pendingRecurringTransactions().throughDate()).isEqualTo(LocalDate.of(9999,12,31));
        verify(transactions).sumByTypeForPeriod(7L,LocalDate.of(9999,12,1),LocalDate.of(10000,1,1));
    }
    @ParameterizedTest @CsvSource({"0,1","10000,1","2024,0","2024,13"})
    void rejectsInvalidPeriod(int year,int month) {
        assertThatThrownBy(()->service.getDashboard(year,month)).isInstanceOf(InvalidDashboardException.class);
        verifyNoInteractions(accounts,transactions,budgets,recurring);
    }
    @Test void requiresBothPeriodFields() {
        assertThatThrownBy(()->service.getDashboard(null,1)).isInstanceOf(InvalidDashboardException.class);
        assertThatThrownBy(()->service.getDashboard(2024,null)).isInstanceOf(InvalidDashboardException.class);
    }
    @Test void rejectsMissingOrWrongPrincipal() {
        SecurityContextHolder.clearContext();
        assertThatThrownBy(()->service.getDashboard(2024,2)).isInstanceOf(AccessDeniedException.class);
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("other",null,List.of()));
        assertThatThrownBy(()->service.getDashboard(2024,2)).isInstanceOf(AccessDeniedException.class);
        verifyNoInteractions(accounts,transactions,budgets,recurring);
    }
    private TransactionTypeTotal total(TransactionType type,String amount) {
        return new TransactionTypeTotal() { public TransactionType getType(){return type;} public BigDecimal getTotalAmount(){return new BigDecimal(amount);} };
    }
    private BudgetDetails budget(String limit,String spent,boolean over) {
        return new BudgetDetails(1L,2L,"Food",2024,2,new BigDecimal(limit),new BigDecimal(spent),new BigDecimal(limit).subtract(new BigDecimal(spent)),over,null,null);
    }
}
