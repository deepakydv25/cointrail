package com.deepak.cointrailapi.transaction;

import com.deepak.cointrailapi.transaction.dto.CreateTransactionRequest;
import com.deepak.cointrailapi.transaction.dto.TransactionResponse;
import com.deepak.cointrailapi.transaction.dto.UpdateTransactionRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;

public interface TransactionService {

    TransactionResponse createTransaction(CreateTransactionRequest request);

    TransactionResponse getTransaction(Long id);

    TransactionResponse updateTransaction(Long id, UpdateTransactionRequest request);

    void deleteTransaction(Long id);

    Page<TransactionResponse> getTransactions(
            TransactionType type,
            Long accountId,
            Long categoryId,
            LocalDate from,
            LocalDate to,
            Pageable pageable
    );
}
