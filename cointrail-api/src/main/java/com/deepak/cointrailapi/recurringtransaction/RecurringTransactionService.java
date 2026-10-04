package com.deepak.cointrailapi.recurringtransaction;

import com.deepak.cointrailapi.recurringtransaction.dto.*;
import com.deepak.cointrailapi.transaction.TransactionType;
import org.springframework.data.domain.*;

public interface RecurringTransactionService {
    RecurringTransactionDetails createRecurringTransaction(CreateRecurringTransactionRequest request);
    RecurringTransactionDetails getRecurringTransaction(Long id);
    Page<RecurringTransactionDetails> getRecurringTransactions(RecurringTransactionStatus status, TransactionType type,
                                                              Long accountId, Long categoryId, Pageable pageable);
    RecurringTransactionDetails updateRecurringTransaction(Long id, UpdateRecurringTransactionRequest request);
    void cancelRecurringTransaction(Long id);
    RecurringTransactionDetails pauseRecurringTransaction(Long id);
    RecurringTransactionDetails resumeRecurringTransaction(Long id);
}
