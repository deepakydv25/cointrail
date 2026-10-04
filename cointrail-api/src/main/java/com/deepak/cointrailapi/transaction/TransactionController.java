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
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

import java.time.LocalDate;
import java.util.Set;

@Tag(name = "Transactions")
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



    @Operation(summary = "Create a transaction", description = "Requires usable owned account and accessible category compatible with type. Date is past-or-present under existing manual-transaction validation, not the recurring timezone.")
    @PostMapping
    public ResponseEntity<TransactionResponse> createTransaction(@Valid @RequestBody CreateTransactionRequest request) {

        TransactionResponse response = transactionService.createTransaction(request);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(response);
    }

    @Operation(summary = "Get a transaction", description = "Returns an owned historical transaction, including transactions referencing inactive resources.")
    @GetMapping("/{id}")
    public ResponseEntity<TransactionResponse> getTransaction(@PathVariable Long id) {

        return ResponseEntity.ok(transactionService.getTransaction(id));
    }

    @Operation(summary = "Update a transaction", description = "Ordinary and recurring-generated transactions use the same editable contract and resource/date validation.")
    @PutMapping("/{id}")
    public ResponseEntity<TransactionResponse> updateTransaction(@PathVariable Long id, @Valid @RequestBody UpdateTransactionRequest request) {

        return ResponseEntity.ok(transactionService.updateTransaction(id, request));
    }

    @Operation(summary = "Delete a transaction", description = "Hard deletion. Deleting a recurring-generated transaction does not regenerate its processed occurrence.")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTransaction(@PathVariable Long id) {

        transactionService.deleteTransaction(id);

        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "List transactions", description = "Owner-only page with optional type/account/category and inclusive date bounds. From must be on or before to when both are supplied. Unknown filter IDs return an empty page.")
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
            @ParameterObject Pageable pageable) {

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
