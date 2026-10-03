package com.deepak.cointrailapi.account;

import com.deepak.cointrailapi.account.dto.AccountResponse;
import com.deepak.cointrailapi.account.dto.CreateAccountRequest;
import com.deepak.cointrailapi.account.dto.UpdateAccountRequest;

import java.util.List;

public interface AccountService {

    AccountResponse createAccount(CreateAccountRequest request);

    List<AccountResponse> getAccounts();

    AccountResponse getAccount(Long id);

    AccountResponse updateAccount(Long id, UpdateAccountRequest request);

    void deactivateAccount(Long id);
}
