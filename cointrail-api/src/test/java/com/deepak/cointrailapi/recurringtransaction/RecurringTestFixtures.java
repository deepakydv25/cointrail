package com.deepak.cointrailapi.recurringtransaction;

import com.deepak.cointrailapi.account.*;
import com.deepak.cointrailapi.category.*;
import com.deepak.cointrailapi.transaction.TransactionType;
import com.deepak.cointrailapi.user.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.UUID;

final class RecurringTestFixtures {
    private RecurringTestFixtures() {}
    static User user(UserRepository users) {
        User user=new User();user.setName("Recurring User");user.setEmail(UUID.randomUUID()+"@test.com");
        user.setPassword("password");user.setRole(Role.USER);user.setCreatedAt(LocalDateTime.now());user.setUpdatedAt(LocalDateTime.now());
        return users.saveAndFlush(user);
    }
    static Account account(AccountRepository accounts, User user) {
        Account a=new Account();a.setUser(user);a.setName(UUID.randomUUID().toString());a.setType(AccountType.BANK);
        a.setOpeningBalance(BigDecimal.ZERO);a.setActive(true);a.setCreatedAt(LocalDateTime.now());a.setUpdatedAt(LocalDateTime.now());
        return accounts.saveAndFlush(a);
    }
    static RecurringTransaction template(User user, Account account, Category category, LocalDate start) {
        RecurringTransaction r=new RecurringTransaction();r.setUser(user);r.setAccount(account);r.setCategory(category);
        r.setType(TransactionType.EXPENSE);r.setAmount(new BigDecimal("10.00"));r.setDescription("Recurring snapshot");
        r.setFrequency(RecurrenceFrequency.DAILY);r.setStartDate(start);r.setNextDueDate(start);r.setStatus(RecurringTransactionStatus.ACTIVE);
        r.setCreatedAt(LocalDateTime.of(2024,1,1,0,0));r.setUpdatedAt(r.getCreatedAt());return r;
    }
}
