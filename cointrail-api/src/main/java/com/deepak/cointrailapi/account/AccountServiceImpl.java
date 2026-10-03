package com.deepak.cointrailapi.account;

import com.deepak.cointrailapi.account.dto.AccountResponse;
import com.deepak.cointrailapi.account.dto.CreateAccountRequest;
import com.deepak.cointrailapi.account.dto.UpdateAccountRequest;
import com.deepak.cointrailapi.common.exception.AccountAlreadyExistsException;
import com.deepak.cointrailapi.common.exception.AccountNotFoundException;
import com.deepak.cointrailapi.user.User;
import com.deepak.cointrailapi.user.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class AccountServiceImpl implements AccountService{

    private final AccountRepository accountRepository;
    private final UserRepository userRepository;

    public AccountServiceImpl(AccountRepository accountRepository, UserRepository userRepository) {
        this.accountRepository = accountRepository;
        this.userRepository = userRepository;
    }

    @Override
    @Transactional
    public AccountResponse createAccount(CreateAccountRequest request) {
        User user = getCurrentUser();

        String accountName = request.name().trim();

        if (accountRepository.existsByUserIdAndNameIgnoreCase(user.getId(), accountName)) {
            throw new AccountAlreadyExistsException("Account with this name already exists");
        }

        Account account = new Account();

        account.setUser(user);
        account.setName(accountName);
        account.setType(request.type());
        account.setOpeningBalance(request.openingBalance());
        account.setActive(true);

        LocalDateTime now = LocalDateTime.now();
        account.setCreatedAt(now);
        account.setUpdatedAt(now);

        Account saved = accountRepository.save(account);
        return toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<AccountResponse> getAccounts() {

        User user = getCurrentUser();

        return accountRepository.findByUserIdAndActiveTrueOrderByCreatedAtDesc(user.getId())
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public AccountResponse getAccount(Long id) {

        User user = getCurrentUser();

        Account account = findOwnedAccount(id, user.getId());
        return toResponse(account);
    }

    @Override
    @Transactional
    public AccountResponse updateAccount(Long id, UpdateAccountRequest request) {

        User user = getCurrentUser();

        Account account = findOwnedAccount(id, user.getId());

        String accountName = request.name().trim();

        if (accountRepository.existsByUserIdAndNameIgnoreCaseAndIdNot(user.getId(), accountName, id)) {
            throw new AccountAlreadyExistsException("Account with this name already exists");
        }

        account.setName(accountName);
        account.setType(request.type());
        account.setUpdatedAt(LocalDateTime.now());

        return toResponse(accountRepository.save(account));
    }

    @Override
    @Transactional
    public void deactivateAccount(Long id) {
        User user = getCurrentUser();

        Account account = findOwnedAccount(id, user.getId());

        account.setActive(false);
        account.setUpdatedAt(LocalDateTime.now());

        accountRepository.save(account);
    }

    private Account findOwnedAccount(Long id, Long userId) {
        return accountRepository
                .findByIdAndUserId(id, userId)
                .orElseThrow(() -> new AccountNotFoundException("Account not found"));
    }

    private User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        String email = authentication.getName();

        return userRepository
                .findByEmail(email)
                .orElseThrow(() ->
                        new IllegalStateException("Authenticated user not found"));
    }

    private AccountResponse toResponse(Account account) {
        return new AccountResponse(
                account.getId(),
                account.getName(),
                account.getType(),
                account.getOpeningBalance(),
                account.isActive(),
                account.getCreatedAt(),
                account.getUpdatedAt()
        );
    }
}
