package com.deepak.cointrailapi.account;

import com.deepak.cointrailapi.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
@ActiveProfiles("test")
class AccountIntegrationTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer postgres =
            new PostgreSQLContainer("postgres:17-alpine");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private UserRepository userRepository;

    @BeforeEach
    void cleanDatabase() {
        accountRepository.deleteAll();
        userRepository.deleteAll();
    }

    private void registerUser(
            String name,
            String email,
            String password) throws Exception {

        String body = """
                {
                    "name": "%s",
                    "email": "%s",
                    "password": "%s"
                }
                """.formatted(name, email, password);

        mockMvc.perform(
                        post("/api/v1/auth/register")
                                .contentType("application/json")
                                .content(body)
                )
                .andExpect(status().isCreated());
    }

    private String loginAndGetToken(
            String email,
            String password) throws Exception {

        String body = """
                {
                    "email": "%s",
                    "password": "%s"
                }
                """.formatted(email, password);

        String response = mockMvc.perform(
                        post("/api/v1/auth/login")
                                .contentType("application/json")
                                .content(body)
                )
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();

        JsonNode json = objectMapper.readTree(response);

        return json.get("accessToken").asText();
    }

    private Long createAccountThroughApi(
            String token,
            String name,
            AccountType type,
            BigDecimal openingBalance) throws Exception {

        String body = """
                {
                    "name": "%s",
                    "type": "%s",
                    "openingBalance": %s
                }
                """.formatted(
                name,
                type,
                openingBalance
        );

        String response = mockMvc.perform(
                        post("/api/accounts")
                                .header(
                                        "Authorization",
                                        "Bearer " + token
                                )
                                .contentType("application/json")
                                .content(body)
                )
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();

        return objectMapper
                .readTree(response)
                .get("id")
                .asLong();
    }

    @Test
    void createAccount_shouldSaveAccountInDatabase()
            throws Exception {

        registerUser(
                "User One",
                "account-create@test.com",
                "password123"
        );

        String token = loginAndGetToken(
                "account-create@test.com",
                "password123"
        );

        String body = """
                {
                    "name": "HDFC Savings",
                    "type": "BANK",
                    "openingBalance": 50000.00
                }
                """;

        mockMvc.perform(
                        post("/api/accounts")
                                .header(
                                        "Authorization",
                                        "Bearer " + token
                                )
                                .contentType("application/json")
                                .content(body)
                )
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.name")
                        .value("HDFC Savings"))
                .andExpect(jsonPath("$.type")
                        .value("BANK"))
                .andExpect(jsonPath("$.openingBalance")
                        .value(50000.00))
                .andExpect(jsonPath("$.active")
                        .value(true));

        assertEquals(1, accountRepository.count());

        Account saved =
                accountRepository.findAll().getFirst();

        assertEquals("HDFC Savings", saved.getName());
        assertEquals(AccountType.BANK, saved.getType());
        assertTrue(saved.isActive());

        assertEquals(
                0,
                saved.getOpeningBalance()
                        .compareTo(new BigDecimal("50000.00"))
        );
    }

    @Test
    void getAccounts_shouldReturnOnlyCurrentUsersActiveAccounts()
            throws Exception {

        // User A
        registerUser(
                "User A",
                "account-user-a@test.com",
                "password123"
        );

        String userAToken = loginAndGetToken(
                "account-user-a@test.com",
                "password123"
        );

        createAccountThroughApi(
                userAToken,
                "HDFC Savings",
                AccountType.BANK,
                new BigDecimal("50000.00")
        );

        createAccountThroughApi(
                userAToken,
                "ICICI Credit Card",
                AccountType.CREDIT_CARD,
                new BigDecimal("-10000.00")
        );

        // User B
        registerUser(
                "User B",
                "account-user-b@test.com",
                "password123"
        );

        String userBToken = loginAndGetToken(
                "account-user-b@test.com",
                "password123"
        );

        createAccountThroughApi(
                userBToken,
                "User B Bank",
                AccountType.BANK,
                new BigDecimal("20000.00")
        );

        mockMvc.perform(
                        get("/api/accounts")
                                .header(
                                        "Authorization",
                                        "Bearer " + userAToken
                                )
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()")
                        .value(2))
                .andExpect(jsonPath("$[*].name")
                        .value(org.hamcrest.Matchers.containsInAnyOrder(
                                "HDFC Savings",
                                "ICICI Credit Card"
                        )));
    }

    @Test
    void updateAccount_shouldUpdateAccountInDatabase()
            throws Exception {

        registerUser(
                "User One",
                "account-update@test.com",
                "password123"
        );

        String token = loginAndGetToken(
                "account-update@test.com",
                "password123"
        );

        Long accountId = createAccountThroughApi(
                token,
                "HDFC Savings",
                AccountType.BANK,
                new BigDecimal("50000.00")
        );

        String body = """
                {
                    "name": "HDFC Salary Account",
                    "type": "BANK"
                }
                """;

        mockMvc.perform(
                        put("/api/accounts/{id}", accountId)
                                .header(
                                        "Authorization",
                                        "Bearer " + token
                                )
                                .contentType("application/json")
                                .content(body)
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id")
                        .value(accountId))
                .andExpect(jsonPath("$.name")
                        .value("HDFC Salary Account"))
                .andExpect(jsonPath("$.type")
                        .value("BANK"))
                .andExpect(jsonPath("$.openingBalance")
                        .value(50000.00));

        Account updated =
                accountRepository
                        .findById(accountId)
                        .orElseThrow();

        assertEquals(
                "HDFC Salary Account",
                updated.getName()
        );

        // Opening balance must not change through normal update.
        assertEquals(
                0,
                updated.getOpeningBalance()
                        .compareTo(new BigDecimal("50000.00"))
        );
    }

    @Test
    void duplicateAccountName_shouldReturnConflict()
            throws Exception {

        registerUser(
                "User One",
                "account-duplicate@test.com",
                "password123"
        );

        String token = loginAndGetToken(
                "account-duplicate@test.com",
                "password123"
        );

        createAccountThroughApi(
                token,
                "HDFC Savings",
                AccountType.BANK,
                BigDecimal.ZERO
        );

        String body = """
                {
                    "name": "hdfc savings",
                    "type": "BANK",
                    "openingBalance": 10000
                }
                """;

        mockMvc.perform(
                        post("/api/accounts")
                                .header(
                                        "Authorization",
                                        "Bearer " + token
                                )
                                .contentType("application/json")
                                .content(body)
                )
                .andExpect(status().isConflict());

        assertEquals(1, accountRepository.count());
    }

    @Test
    void userShouldNotAccessAnotherUsersAccount()
            throws Exception {

        // User A
        registerUser(
                "User A",
                "account-owner-a@test.com",
                "password123"
        );

        String userAToken = loginAndGetToken(
                "account-owner-a@test.com",
                "password123"
        );

        Long accountId = createAccountThroughApi(
                userAToken,
                "Private Bank Account",
                AccountType.BANK,
                new BigDecimal("50000.00")
        );

        // User B
        registerUser(
                "User B",
                "account-owner-b@test.com",
                "password123"
        );

        String userBToken = loginAndGetToken(
                "account-owner-b@test.com",
                "password123"
        );

        mockMvc.perform(
                        get("/api/accounts/{id}", accountId)
                                .header(
                                        "Authorization",
                                        "Bearer " + userBToken
                                )
                )
                .andExpect(status().isNotFound());

        mockMvc.perform(
                        delete("/api/accounts/{id}", accountId)
                                .header(
                                        "Authorization",
                                        "Bearer " + userBToken
                                )
                )
                .andExpect(status().isNotFound());

        Account account =
                accountRepository
                        .findById(accountId)
                        .orElseThrow();

        assertTrue(account.isActive());
    }

    @Test
    void deactivateAccount_shouldSoftDeleteAccount()
            throws Exception {

        registerUser(
                "User One",
                "account-delete@test.com",
                "password123"
        );

        String token = loginAndGetToken(
                "account-delete@test.com",
                "password123"
        );

        Long accountId = createAccountThroughApi(
                token,
                "HDFC Savings",
                AccountType.BANK,
                new BigDecimal("50000.00")
        );

        mockMvc.perform(
                        delete("/api/accounts/{id}", accountId)
                                .header(
                                        "Authorization",
                                        "Bearer " + token
                                )
                )
                .andExpect(status().isNoContent());

        // Row must still exist.
        Account account =
                accountRepository
                        .findById(accountId)
                        .orElseThrow();

        assertFalse(account.isActive());

        // But inactive account must disappear from normal account list.
        mockMvc.perform(
                        get("/api/accounts")
                                .header(
                                        "Authorization",
                                        "Bearer " + token
                                )
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()")
                        .value(0));
    }
}