package com.deepak.cointrailapi.transaction;

import com.deepak.cointrailapi.common.validation.PageableValidator;
import com.deepak.cointrailapi.transaction.dto.CreateTransactionRequest;
import com.deepak.cointrailapi.transaction.dto.TransactionResponse;
import com.deepak.cointrailapi.transaction.dto.UpdateTransactionRequest;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Set;

@RestController
@RequestMapping("/api/transactions")
public class TransactionController {

    private static final Set<String> ALLOWED_SORT_FIELDS =
            Set.of(
                    "transactionDate",
                    "amount",
                    "createdAt",
                    "updatedAt"
            );
    private final TransactionService transactionService;
    private final PageableValidator pageableValidator;

    public TransactionController(TransactionService transactionService, PageableValidator pageableValidator) {
        this.transactionService = transactionService;
        this.pageableValidator = pageableValidator;
    }



    @PostMapping
    public ResponseEntity<TransactionResponse> createTransaction(@Valid @RequestBody CreateTransactionRequest request) {

        TransactionResponse response = transactionService.createTransaction(request);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<TransactionResponse> getTransaction(@PathVariable Long id) {

        return ResponseEntity.ok(transactionService.getTransaction(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<TransactionResponse> updateTransaction(@PathVariable Long id, @Valid @RequestBody UpdateTransactionRequest request) {

        return ResponseEntity.ok(transactionService.updateTransaction(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTransaction(@PathVariable Long id) {

        transactionService.deleteTransaction(id);

        return ResponseEntity.noContent().build();
    }

    @GetMapping
    public ResponseEntity<Page<TransactionResponse>> getTransactions(
            @RequestParam(required = false) TransactionType type,
            @RequestParam(required = false) Long accountId,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate from,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate to,
            @PageableDefault(
                    size = 20,
                    sort = "transactionDate",
                    direction = Sort.Direction.DESC
            )
            Pageable pageable) {

        pageableValidator.validate(
                pageable,
                ALLOWED_SORT_FIELDS
        );

        Page<TransactionResponse> response =
                transactionService.getTransactions(
                        type,
                        accountId,
                        categoryId,
                        from,
                        to,
                        pageable
                );

        return ResponseEntity.ok(response);
    }
}
