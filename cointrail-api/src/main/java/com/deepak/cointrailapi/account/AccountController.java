package com.deepak.cointrailapi.account;

import com.deepak.cointrailapi.account.dto.AccountResponse;
import com.deepak.cointrailapi.account.dto.CreateAccountRequest;
import com.deepak.cointrailapi.account.dto.UpdateAccountRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/accounts")
public class AccountController {

    private final AccountService accountService;

    public AccountController(AccountService accountService) {
        this.accountService = accountService;
    }

    @PostMapping
    public ResponseEntity<AccountResponse> createAccount(@Valid @RequestBody CreateAccountRequest request) {

        AccountResponse response = accountService.createAccount(request);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(response);
    }

    @GetMapping
    public ResponseEntity<List<AccountResponse>> getAccounts() {

        return ResponseEntity.ok(
                accountService.getAccounts()
        );
    }

    @GetMapping("/{id}")
    public ResponseEntity<AccountResponse> getAccount(
            @PathVariable Long id) {

        return ResponseEntity.ok(
                accountService.getAccount(id)
        );
    }

    @PutMapping("/{id}")
    public ResponseEntity<AccountResponse> updateAccount(@PathVariable Long id, @Valid @RequestBody UpdateAccountRequest request) {

        return ResponseEntity.ok(accountService.updateAccount(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deactivateAccount(
            @PathVariable Long id) {

        accountService.deactivateAccount(id);

        return ResponseEntity.noContent().build();
    }
}
