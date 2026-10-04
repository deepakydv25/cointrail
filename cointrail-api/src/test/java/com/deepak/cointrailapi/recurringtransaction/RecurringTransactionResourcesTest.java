package com.deepak.cointrailapi.recurringtransaction;

import com.deepak.cointrailapi.account.*;
import com.deepak.cointrailapi.category.*;
import com.deepak.cointrailapi.common.exception.*;
import com.deepak.cointrailapi.transaction.TransactionType;
import com.deepak.cointrailapi.user.User;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import java.util.Optional;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RecurringTransactionResourcesTest {
    @Mock AccountRepository accounts; @Mock CategoryRepository categories;
    @InjectMocks RecurringTransactionResources resources;
    @Test void shouldRejectInactiveAccountAndForeignCategoryBeforeTypeInformation() {
        Account a=new Account();a.setId(2L);a.setActive(false);
        when(accounts.findByIdAndUserId(2L,1L)).thenReturn(Optional.of(a));
        assertThatThrownBy(() -> resources.resolve(1L,2L,3L,TransactionType.EXPENSE)).isInstanceOf(InvalidRecurringTransactionException.class);
        a.setActive(true); Category c=new Category();c.setType(CategoryType.INCOME);User foreign=new User();foreign.setId(9L);c.setUser(foreign);
        when(categories.findByIdAndActiveTrue(3L)).thenReturn(Optional.of(c));
        assertThatThrownBy(() -> resources.resolve(1L,2L,3L,TransactionType.EXPENSE)).isInstanceOf(CategoryNotFoundException.class);
        c.setSystem(true);
        assertThatThrownBy(() -> resources.resolve(1L,2L,3L,TransactionType.EXPENSE)).isInstanceOf(InvalidRecurringTransactionException.class);
        assertThat(resources.resolve(1L,2L,3L,TransactionType.INCOME).category()).isSameAs(c);
    }
}
