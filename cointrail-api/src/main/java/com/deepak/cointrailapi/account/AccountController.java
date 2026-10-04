package com.deepak.cointrailapi.account;

import com.deepak.cointrailapi.account.dto.AccountResponse;
import com.deepak.cointrailapi.account.dto.CreateAccountRequest;
import com.deepak.cointrailapi.account.dto.UpdateAccountRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

import java.util.List;

@Tag(name = "Accounts")
@RestController
@RequestMapping("/api/accounts")
public class AccountController {

    private final AccountService accountService;

    public AccountController(AccountService accountService) {
        this.accountService = accountService;
    }

    @Operation(summary = "Create an account", description = "Creates an owned account with a signed opening balance. Name uniqueness follows existing owner rules.")
    @PostMapping
    public ResponseEntity<AccountResponse> createAccount(@Valid @RequestBody CreateAccountRequest request) {

        AccountResponse response = accountService.createAccount(request);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(response);
    }

    @Operation(summary = "List active accounts", description = "Returns active owned accounts in created-at descending order.")
    @GetMapping
    public ResponseEntity<List<AccountResponse>> getAccounts() {

        return ResponseEntity.ok(
                accountService.getAccounts()
        );
    }

    @Operation(summary = "Get an account", description = "Returns an owned account, including inactive accounts.")
    @GetMapping("/{id}")
    public ResponseEntity<AccountResponse> getAccount(
            @PathVariable Long id) {

        return ResponseEntity.ok(
                accountService.getAccount(id)
        );
    }

    @Operation(summary = "Update an account", description = "Changes name/type only; opening balance is not an update field.")
    @PutMapping("/{id}")
    public ResponseEntity<AccountResponse> updateAccount(@PathVariable Long id, @Valid @RequestBody UpdateAccountRequest request) {

        return ResponseEntity.ok(accountService.updateAccount(id, request));
    }

    @Operation(summary = "Deactivate an account", description = "Soft deactivation; existing financial history remains. Repeated deactivation is allowed.")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deactivateAccount(
            @PathVariable Long id) {

        accountService.deactivateAccount(id);

        return ResponseEntity.noContent().build();
    }
}
