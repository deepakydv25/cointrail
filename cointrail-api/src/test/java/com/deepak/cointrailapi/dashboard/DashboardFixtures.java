package com.deepak.cointrailapi.dashboard;

import com.deepak.cointrailapi.account.*;
import com.deepak.cointrailapi.category.*;
import com.deepak.cointrailapi.transaction.*;
import com.deepak.cointrailapi.recurringtransaction.*;
import com.deepak.cointrailapi.budget.*;
import com.deepak.cointrailapi.user.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.UUID;

final class DashboardFixtures {
    static final LocalDateTime TIME=LocalDateTime.of(2024,1,1,0,0);
    static User user(UserRepository repo) {
        User u=new User();u.setName("Dashboard user");u.setEmail(UUID.randomUUID()+"@test.com");u.setPassword("password");u.setRole(Role.USER);u.setCreatedAt(TIME);u.setUpdatedAt(TIME);return repo.saveAndFlush(u);
    }
    static Account account(AccountRepository repo,User u,String amount,boolean active) {
        Account a=new Account();a.setUser(u);a.setName(UUID.randomUUID().toString());a.setType(AccountType.CREDIT_CARD);a.setOpeningBalance(new BigDecimal(amount));a.setActive(active);a.setCreatedAt(TIME);a.setUpdatedAt(TIME);return repo.saveAndFlush(a);
    }
    static Category category(CategoryRepository repo,User u,CategoryType type) {
        Category c=new Category();c.setUser(u);c.setName(UUID.randomUUID().toString());c.setType(type);c.setSystem(false);c.setActive(true);c.setCreatedAt(TIME);c.setUpdatedAt(TIME);return repo.saveAndFlush(c);
    }
    static Transaction transaction(TransactionRepository repo,User u,Account a,Category c,String amount,LocalDate date) {
        Transaction t=new Transaction();t.setUser(u);t.setAccount(a);t.setCategory(c);t.setType(TransactionType.valueOf(c.getType().name()));t.setAmount(new BigDecimal(amount));t.setDescription("Actual");t.setTransactionDate(date);t.setCreatedAt(TIME);t.setUpdatedAt(TIME);return repo.saveAndFlush(t);
    }
    static RecurringTransaction recurring(RecurringTransactionRepository repo,User u,Account a,Category c,LocalDate date,RecurringTransactionStatus status) {
        RecurringTransaction r=new RecurringTransaction();r.setUser(u);r.setAccount(a);r.setCategory(c);r.setType(TransactionType.valueOf(c.getType().name()));r.setAmount(new BigDecimal("10.00"));r.setFrequency(RecurrenceFrequency.MONTHLY);r.setStartDate(date);r.setNextDueDate(status==RecurringTransactionStatus.CANCELLED || status==RecurringTransactionStatus.COMPLETED?null:date);r.setStatus(status);r.setBlockedReason(status==RecurringTransactionStatus.BLOCKED?"Account not found":null);r.setCreatedAt(TIME);r.setUpdatedAt(TIME);return repo.saveAndFlush(r);
    }
    static Budget budget(BudgetRepository repo,User u,Category c,String amount,int year,int month) {
        Budget b=new Budget();b.setUser(u);b.setCategory(c);b.setAmount(new BigDecimal(amount));b.setYear(year);b.setMonth(month);b.setCreatedAt(TIME);b.setUpdatedAt(TIME);return repo.saveAndFlush(b);
    }
    private DashboardFixtures() {}
}
