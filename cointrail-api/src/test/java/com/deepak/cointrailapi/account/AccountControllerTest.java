package com.deepak.cointrailapi.account;

import com.deepak.cointrailapi.account.dto.AccountResponse;
import com.deepak.cointrailapi.account.dto.CreateAccountRequest;
import com.deepak.cointrailapi.account.dto.UpdateAccountRequest;
import com.deepak.cointrailapi.common.security.JwtService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AccountController.class)
class AccountControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AccountService accountService;

    @MockitoBean
    private UserDetailsService userDetailsService;

    @MockitoBean
    private JwtService jwtService;

    private AccountResponse accountResponse() {
        return new AccountResponse(
                1L,
                "HDFC Savings",
                AccountType.BANK,
                new BigDecimal("50000.00"),
                true,
                LocalDateTime.now(),
                LocalDateTime.now()
        );
    }

    @Test
    void shouldCreateAccount() throws Exception {

        when(accountService.createAccount(
                any(CreateAccountRequest.class)))
                .thenReturn(accountResponse());

        mockMvc.perform(
                        post("/api/accounts")
                                .contentType("application/json")
                                .content("""
                                        {
                                          "name": "HDFC Savings",
                                          "type": "BANK",
                                          "openingBalance": 50000
                                        }
                                        """)
                )
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.name")
                        .value("HDFC Savings"))
                .andExpect(jsonPath("$.type")
                        .value("BANK"))
                .andExpect(jsonPath("$.openingBalance")
                        .value(50000))
                .andExpect(jsonPath("$.active")
                        .value(true));

        verify(accountService)
                .createAccount(any(CreateAccountRequest.class));
    }

    @Test
    void shouldGetAccounts() throws Exception {

        when(accountService.getAccounts())
                .thenReturn(List.of(accountResponse()));

        mockMvc.perform(
                        get("/api/accounts")
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].name")
                        .value("HDFC Savings"))
                .andExpect(jsonPath("$[0].type")
                        .value("BANK"));

        verify(accountService).getAccounts();
    }

    @Test
    void shouldGetAccountById() throws Exception {

        when(accountService.getAccount(1L))
                .thenReturn(accountResponse());

        mockMvc.perform(
                        get("/api/accounts/{id}", 1L)
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.name")
                        .value("HDFC Savings"));

        verify(accountService).getAccount(1L);
    }

    @Test
    void shouldUpdateAccount() throws Exception {

        AccountResponse updated =
                new AccountResponse(
                        1L,
                        "HDFC Salary Account",
                        AccountType.BANK,
                        new BigDecimal("50000.00"),
                        true,
                        LocalDateTime.now(),
                        LocalDateTime.now()
                );

        when(accountService.updateAccount(
                eq(1L),
                any(UpdateAccountRequest.class)))
                .thenReturn(updated);

        mockMvc.perform(
                        put("/api/accounts/{id}", 1L)
                                .contentType("application/json")
                                .content("""
                                        {
                                          "name": "HDFC Salary Account",
                                          "type": "BANK"
                                        }
                                        """)
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.name")
                        .value("HDFC Salary Account"));

        verify(accountService)
                .updateAccount(
                        eq(1L),
                        any(UpdateAccountRequest.class)
                );
    }

    @Test
    void shouldDeactivateAccount() throws Exception {

        doNothing()
                .when(accountService)
                .deactivateAccount(1L);

        mockMvc.perform(
                        delete("/api/accounts/{id}", 1L)
                )
                .andExpect(status().isNoContent());

        verify(accountService)
                .deactivateAccount(1L);
    }

    @Test
    void shouldRejectCreateAccountWhenNameIsBlank()
            throws Exception {

        mockMvc.perform(
                        post("/api/accounts")
                                .contentType("application/json")
                                .content("""
                                    {
                                      "name": "",
                                      "type": "BANK",
                                      "openingBalance": 50000
                                    }
                                    """)
                )
                .andExpect(status().isBadRequest());

        verify(accountService, never())
                .createAccount(any());
    }

    @Test
    void shouldRejectCreateAccountWhenTypeIsMissing()
            throws Exception {

        mockMvc.perform(
                        post("/api/accounts")
                                .contentType("application/json")
                                .content("""
                                    {
                                      "name": "HDFC Savings",
                                      "openingBalance": 50000
                                    }
                                    """)
                )
                .andExpect(status().isBadRequest());

        verify(accountService, never())
                .createAccount(any());
    }

    @Test
    void shouldRejectCreateAccountWhenOpeningBalanceIsMissing()
            throws Exception {

        mockMvc.perform(
                        post("/api/accounts")
                                .contentType("application/json")
                                .content("""
                                    {
                                      "name": "HDFC Savings",
                                      "type": "BANK"
                                    }
                                    """)
                )
                .andExpect(status().isBadRequest());

        verify(accountService, never())
                .createAccount(any());
    }

    @Test
    void shouldAllowNegativeOpeningBalance()
            throws Exception {

        when(accountService.createAccount(
                any(CreateAccountRequest.class)))
                .thenReturn(
                        new AccountResponse(
                                1L,
                                "Credit Card",
                                AccountType.CREDIT_CARD,
                                new BigDecimal("-10000.00"),
                                true,
                                LocalDateTime.now(),
                                LocalDateTime.now()
                        )
                );

        mockMvc.perform(
                        post("/api/accounts")
                                .contentType("application/json")
                                .content("""
                                    {
                                      "name": "Credit Card",
                                      "type": "CREDIT_CARD",
                                      "openingBalance": -10000
                                    }
                                    """)
                )
                .andExpect(status().isCreated());

        verify(accountService)
                .createAccount(any(CreateAccountRequest.class));
    }

    @ParameterizedTest
    @ValueSource(strings = {"1.001", "100000000000000000.00", "-100000000000000000.00", "null"})
    void rejectsUnrepresentableOpeningBalance(String amount) throws Exception {
        mockMvc.perform(post("/api/accounts").contentType("application/json")
                .content("{\"name\":\"Balance\",\"type\":\"BANK\",\"openingBalance\":" + amount + "}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors.openingBalance").exists());
        verifyNoInteractions(accountService);
    }

    @ParameterizedTest
    @ValueSource(strings = {"0", "-1.23", "99999999999999999.99", "-99999999999999999.99"})
    void acceptsSignedOpeningBalanceBoundaries(String amount) throws Exception {
        when(accountService.createAccount(any())).thenReturn(accountResponse());
        mockMvc.perform(post("/api/accounts").contentType("application/json")
                .content("{\"name\":\"Balance\",\"type\":\"BANK\",\"openingBalance\":" + amount + "}"))
                .andExpect(status().isCreated());
        verify(accountService).createAccount(argThat(r -> r.openingBalance().compareTo(new BigDecimal(amount)) == 0));
    }
}
