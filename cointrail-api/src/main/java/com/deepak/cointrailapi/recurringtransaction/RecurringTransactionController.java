package com.deepak.cointrailapi.recurringtransaction;

import com.deepak.cointrailapi.common.validation.PageableValidator;
import com.deepak.cointrailapi.recurringtransaction.dto.*;
import com.deepak.cointrailapi.transaction.TransactionType;
import jakarta.validation.Valid;
import org.springframework.data.domain.*;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.util.Set;

@RestController
@RequestMapping("/api/recurring-transactions")
public class RecurringTransactionController {
    private final RecurringTransactionService service;
    private final PageableValidator pageableValidator;
    private static final Set<String> SORT_FIELDS = Set.of("createdAt", "updatedAt", "nextDueDate");

    public RecurringTransactionController(RecurringTransactionService service, PageableValidator pageableValidator) {
        this.service = service; this.pageableValidator = pageableValidator;
    }
    @PostMapping
    public ResponseEntity<RecurringTransactionResponse> create(@Valid @RequestBody CreateRecurringTransactionRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(RecurringTransactionResponse.from(service.createRecurringTransaction(request)));
    }
    @GetMapping("/{id}")
    public RecurringTransactionResponse get(@PathVariable Long id) {
        return RecurringTransactionResponse.from(service.getRecurringTransaction(id));
    }
    @GetMapping
    public Page<RecurringTransactionResponse> list(@RequestParam(required = false) RecurringTransactionStatus status,
            @RequestParam(required = false) TransactionType type, @RequestParam(required = false) Long accountId,
            @RequestParam(required = false) Long categoryId,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        pageableValidator.validate(pageable, SORT_FIELDS);
        Pageable ordered = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(),
            pageable.getSort().and(Sort.by(Sort.Direction.DESC, "id")));
        return service.getRecurringTransactions(status, type, accountId, categoryId, ordered).map(RecurringTransactionResponse::from);
    }
    @PutMapping("/{id}")
    public RecurringTransactionResponse update(@PathVariable Long id, @Valid @RequestBody UpdateRecurringTransactionRequest request) {
        return RecurringTransactionResponse.from(service.updateRecurringTransaction(id, request));
    }
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> cancel(@PathVariable Long id) {
        service.cancelRecurringTransaction(id); return ResponseEntity.noContent().build();
    }
    @PostMapping("/{id}/pause")
    public RecurringTransactionResponse pause(@PathVariable Long id) {
        return RecurringTransactionResponse.from(service.pauseRecurringTransaction(id));
    }
    @PostMapping("/{id}/resume")
    public RecurringTransactionResponse resume(@PathVariable Long id) {
        return RecurringTransactionResponse.from(service.resumeRecurringTransaction(id));
    }
}
