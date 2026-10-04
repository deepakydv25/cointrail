package com.deepak.cointrailapi.recurringtransaction;

import com.deepak.cointrailapi.common.validation.PageableValidator;
import com.deepak.cointrailapi.recurringtransaction.dto.*;
import com.deepak.cointrailapi.transaction.TransactionType;
import jakarta.validation.Valid;
import org.springframework.data.domain.*;
import org.springframework.data.web.PageableDefault;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.Set;

@Tag(name = "Recurring Transactions")
@RestController
@RequestMapping("/api/recurring-transactions")
public class RecurringTransactionController {
    private final RecurringTransactionService service;
    private final PageableValidator pageableValidator;
    private static final Set<String> SORT_FIELDS = Set.of("createdAt", "updatedAt", "nextDueDate");

    public RecurringTransactionController(RecurringTransactionService service, PageableValidator pageableValidator) {
        this.service = service; this.pageableValidator = pageableValidator;
    }
    @Operation(summary = "Create a recurring transaction", description = "Automatically materializes ordinary transactions. DAILY/WEEKLY/MONTHLY/YEARLY, interval one. Start is today/future under configured recurring timezone; optional end is inclusive and on/after start. Calendar anchor is preserved with month-end clamping.")
    @PostMapping
    public ResponseEntity<RecurringTransactionResponse> create(@Valid @RequestBody CreateRecurringTransactionRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(RecurringTransactionResponse.from(service.createRecurringTransaction(request)));
    }
    @Operation(summary = "Get a recurring transaction", description = "Owner-only retained template, including terminal states. Optional next due date and blocked reason depend on lifecycle.")
    @GetMapping("/{id}")
    public RecurringTransactionResponse get(@PathVariable Long id) {
        return RecurringTransactionResponse.from(service.getRecurringTransaction(id));
    }
    @Operation(summary = "List recurring transactions", description = "Owner-only page with optional lifecycle/type/account/category filters. States ACTIVE, PAUSED, BLOCKED, CANCELLED, COMPLETED; no semantic/name uniqueness.")
    @GetMapping
    public Page<RecurringTransactionResponse> list(@RequestParam(required = false) RecurringTransactionStatus status,
            @RequestParam(required = false) TransactionType type, @RequestParam(required = false) Long accountId,
            @RequestParam(required = false) Long categoryId,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) @ParameterObject Pageable pageable) {
        pageableValidator.validate(pageable, SORT_FIELDS);
        Pageable ordered = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(),
            pageable.getSort().and(Sort.by(Sort.Direction.DESC, "id")));
        return service.getRecurringTransactions(status, type, accountId, categoryId, ordered).map(RecurringTransactionResponse::from);
    }
    @Operation(summary = "Edit future recurring financial fields", description = "Required financial replacement payload; schedule/type immutable. Existing generated transactions retain snapshots. Amount/description edits conflict while an unprocessed occurrence is due/overdue. Due association edits also conflict except BLOCKED account/category repair. Terminal templates reject edits.")
    @PutMapping("/{id}")
    public RecurringTransactionResponse update(@PathVariable Long id, @Valid @RequestBody UpdateRecurringTransactionRequest request) {
        return RecurringTransactionResponse.from(service.updateRecurringTransaction(id, request));
    }
    @Operation(summary = "Cancel a recurring transaction", description = "Retains the template and occurrence identity, stops future generation, and leaves generated transactions unchanged. Repeated cancellation is allowed.")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> cancel(@PathVariable Long id) {
        service.cancelRecurringTransaction(id); return ResponseEntity.noContent().build();
    }
    @Operation(summary = "Pause a recurring transaction", description = "Explicit user pause. Paused periods are skipped after resume, unlike recoverable BLOCKED periods. Terminal templates conflict.")
    @PostMapping("/{id}/pause")
    public RecurringTransactionResponse pause(@PathVariable Long id) {
        return RecurringTransactionResponse.from(service.pauseRecurringTransaction(id));
    }
    @Operation(summary = "Resume a paused recurring transaction", description = "Resumes at the next valid occurrence on/after recurring today, skipping paused periods. Revalidates resources. BLOCKED recovery is worker-managed: recheck, return ACTIVE, catch up chronologically; BLOCKED resume conflicts.")
    @PostMapping("/{id}/resume")
    public RecurringTransactionResponse resume(@PathVariable Long id) {
        return RecurringTransactionResponse.from(service.resumeRecurringTransaction(id));
    }
}
