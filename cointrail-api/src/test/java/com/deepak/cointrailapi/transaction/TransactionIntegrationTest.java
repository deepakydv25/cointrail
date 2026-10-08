package com.deepak.cointrailapi.transaction;

import com.deepak.cointrailapi.account.Account;
import com.deepak.cointrailapi.account.AccountRepository;
import com.deepak.cointrailapi.account.AccountType;
import com.deepak.cointrailapi.category.Category;
import com.deepak.cointrailapi.category.CategoryRepository;
import com.deepak.cointrailapi.category.CategoryType;
import com.deepak.cointrailapi.user.User;
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
import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
@ActiveProfiles("test")
public class TransactionIntegrationTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:17-alpine");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private UserRepository userRepository;

    @BeforeEach
    void cleanDatabase() {
        transactionRepository.deleteAll();
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

    private Account createAccount(User user, String name) {

        Account account = new Account();

        account.setUser(user);
        account.setName(name);
        account.setType(AccountType.BANK);
        account.setOpeningBalance(new BigDecimal("50000.00"));
        account.setActive(true);
        account.setCreatedAt(LocalDateTime.now());
        account.setUpdatedAt(LocalDateTime.now());

        return accountRepository.saveAndFlush(account);
    }

    private Category findCategory(
            String name,
            CategoryType type) {

        return categoryRepository.findAll()
                .stream()
                .filter(category ->
                        category.getName().equals(name)
                                && category.getType() == type)
                .findFirst()
                .orElseThrow();
    }

    private Long createTransactionThroughApi(
            String token,
            Long accountId,
            Long categoryId,
            TransactionType type,
            BigDecimal amount,
            String description,
            String date) throws Exception {

        String body = """
            {
                "accountId": %d,
                "categoryId": %d,
                "type": "%s",
                "amount": %s,
                "description": "%s",
                "transactionDate": "%s"
            }
            """.formatted(
                accountId,
                categoryId,
                type,
                amount,
                description,
                date
        );

        String response = mockMvc.perform(
                        post("/api/transactions")
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
    void createTransaction_shouldSaveTransactionInDatabase()
            throws Exception {

        registerUser(
                "User One",
                "transaction-user@test.com",
                "password123"
        );

        String token = loginAndGetToken(
                "transaction-user@test.com",
                "password123"
        );

        User user = userRepository
                .findByEmail("transaction-user@test.com")
                .orElseThrow();

        Account account =
                createAccount(user, "HDFC Savings");

        Category food =
                findCategory("Food", CategoryType.EXPENSE);

        String requestBody = """
            {
                "accountId": %d,
                "categoryId": %d,
                "type": "EXPENSE",
                "amount": 500.00,
                "description": "Dinner",
                "transactionDate": "2026-10-03"
            }
            """.formatted(
                account.getId(),
                food.getId()
        );

        mockMvc.perform(
                        post("/api/transactions")
                                .header(
                                        "Authorization",
                                        "Bearer " + token
                                )
                                .contentType("application/json")
                                .content(requestBody)
                )
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.type")
                        .value("EXPENSE"))
                .andExpect(jsonPath("$.amount")
                        .value(500.00))
                .andExpect(jsonPath("$.description")
                        .value("Dinner"))
                .andExpect(jsonPath("$.accountId")
                        .value(account.getId()))
                .andExpect(jsonPath("$.categoryId")
                        .value(food.getId()));

        assertEquals(1, transactionRepository.count());

        Transaction saved =
                transactionRepository.findAll().getFirst();

        assertEquals(user.getId(), saved.getUser().getId());
        assertEquals(account.getId(), saved.getAccount().getId());
        assertEquals(food.getId(), saved.getCategory().getId());
        assertEquals(TransactionType.EXPENSE, saved.getType());

        assertEquals(
                0,
                saved.getAmount()
                        .compareTo(new BigDecimal("500.00"))
        );
    }

    @Test
    void getTransactions_shouldFilterLoggedInUsersTransactions()
            throws Exception {

        registerUser(
                "User One",
                "filter-user@test.com",
                "password123"
        );

        String token = loginAndGetToken(
                "filter-user@test.com",
                "password123"
        );

        User user = userRepository
                .findByEmail("filter-user@test.com")
                .orElseThrow();

        Account account =
                createAccount(user, "HDFC Savings");

        Category food =
                findCategory("Food", CategoryType.EXPENSE);

        Category salary =
                findCategory("Salary", CategoryType.INCOME);

        createTransactionThroughApi(
                token,
                account.getId(),
                food.getId(),
                TransactionType.EXPENSE,
                new BigDecimal("500.00"),
                "Dinner",
                "2026-10-03"
        );

        createTransactionThroughApi(
                token,
                account.getId(),
                salary.getId(),
                TransactionType.INCOME,
                new BigDecimal("80000.00"),
                "Salary",
                "2026-10-01"
        );

        mockMvc.perform(
                        get("/api/transactions")
                                .param("type", "EXPENSE")
                                .header(
                                        "Authorization",
                                        "Bearer " + token
                                )
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()")
                        .value(1))
                .andExpect(jsonPath("$.totalElements")
                        .value(1))
                .andExpect(jsonPath("$.content[0].type")
                        .value("EXPENSE"))
                .andExpect(jsonPath("$.content[0].amount")
                        .value(500.00))
                .andExpect(jsonPath("$.content[0].description")
                        .value("Dinner"));
    }

    @Test
    void userShouldNotAccessAnotherUsersTransaction()
            throws Exception {

        // User A
        registerUser(
                "User A",
                "user-a@test.com",
                "password123"
        );

        String userAToken = loginAndGetToken(
                "user-a@test.com",
                "password123"
        );

        User userA = userRepository
                .findByEmail("user-a@test.com")
                .orElseThrow();

        Account userAAccount =
                createAccount(userA, "User A Bank");

        Category food =
                findCategory("Food", CategoryType.EXPENSE);

        Long transactionId = createTransactionThroughApi(
                userAToken,
                userAAccount.getId(),
                food.getId(),
                TransactionType.EXPENSE,
                new BigDecimal("500.00"),
                "Private transaction",
                "2026-10-03"
        );

        // User B
        registerUser(
                "User B",
                "user-b@test.com",
                "password123"
        );

        String userBToken = loginAndGetToken(
                "user-b@test.com",
                "password123"
        );

        mockMvc.perform(
                        get(
                                "/api/transactions/{id}",
                                transactionId
                        )
                                .header(
                                        "Authorization",
                                        "Bearer " + userBToken
                                )
                )
                .andExpect(status().isNotFound());

        // User B must also not be able to delete it

        mockMvc.perform(
                        delete(
                                "/api/transactions/{id}",
                                transactionId
                        )
                                .header(
                                        "Authorization",
                                        "Bearer " + userBToken
                                )
                )
                .andExpect(status().isNotFound());

        // Transaction still exists
        assertTrue(transactionRepository.existsById(transactionId));
    }

    @Test
    void updateTransaction_shouldUpdateTransactionInDatabase()
            throws Exception {

        registerUser(
                "User One",
                "update-transaction@test.com",
                "password123"
        );

        String token = loginAndGetToken(
                "update-transaction@test.com",
                "password123"
        );

        User user = userRepository
                .findByEmail("update-transaction@test.com")
                .orElseThrow();

        Account account =
                createAccount(user, "HDFC Savings");

        Category food =
                findCategory("Food", CategoryType.EXPENSE);

        Long transactionId = createTransactionThroughApi(
                token,
                account.getId(),
                food.getId(),
                TransactionType.EXPENSE,
                new BigDecimal("500.00"),
                "Dinner",
                "2026-10-03"
        );

        String requestBody = """
            {
                "accountId": %d,
                "categoryId": %d,
                "type": "EXPENSE",
                "amount": 750.00,
                "description": "Dinner with friends",
                "transactionDate": "2026-10-03"
            }
            """.formatted(
                account.getId(),
                food.getId()
        );

        mockMvc.perform(
                        put(
                                "/api/transactions/{id}",
                                transactionId
                        )
                                .header(
                                        "Authorization",
                                        "Bearer " + token
                                )
                                .contentType("application/json")
                                .content(requestBody)
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id")
                        .value(transactionId))
                .andExpect(jsonPath("$.amount")
                        .value(750.00))
                .andExpect(jsonPath("$.description")
                        .value("Dinner with friends"));

        Transaction updated =
                transactionRepository
                        .findById(transactionId)
                        .orElseThrow();

        assertEquals(
                0,
                updated.getAmount()
                        .compareTo(new BigDecimal("750.00"))
        );

        assertEquals("Dinner with friends", updated.getDescription());
    }

    @Test
    void deleteTransaction_shouldDeleteTransactionFromDatabase()
            throws Exception {

        registerUser(
                "User One",
                "delete-transaction@test.com",
                "password123"
        );

        String token = loginAndGetToken(
                "delete-transaction@test.com",
                "password123"
        );

        User user = userRepository
                .findByEmail("delete-transaction@test.com")
                .orElseThrow();

        Account account =
                createAccount(user, "HDFC Savings");

        Category food =
                findCategory("Food", CategoryType.EXPENSE);

        Long transactionId = createTransactionThroughApi(
                token,
                account.getId(),
                food.getId(),
                TransactionType.EXPENSE,
                new BigDecimal("500.00"),
                "Dinner",
                "2026-10-03"
        );

        assertTrue(
                transactionRepository.existsById(transactionId)
        );

        mockMvc.perform(
                        delete(
                                "/api/transactions/{id}",
                                transactionId
                        )
                                .header(
                                        "Authorization",
                                        "Bearer " + token
                                )
                )
                .andExpect(status().isNoContent());

        assertFalse(
                transactionRepository.existsById(transactionId)
        );

        mockMvc.perform(
                        get(
                                "/api/transactions/{id}",
                                transactionId
                        )
                                .header(
                                        "Authorization",
                                        "Bearer " + token
                                )
                )
                .andExpect(status().isNotFound());
    }

    @Test
    void moneyBoundariesAndProductionPageCapRoundTrip() throws Exception {
        registerUser("Money user", "transaction-money@test.com", "password123");
        String token = loginAndGetToken("transaction-money@test.com", "password123");
        User user = userRepository.findByEmail("transaction-money@test.com").orElseThrow();
        Account account = createAccount(user, "Money");
        Category category = findCategory("Food", CategoryType.EXPENSE);
        Long id = createTransactionThroughApi(token, account.getId(), category.getId(), TransactionType.EXPENSE,
                new BigDecimal("99999999999999999.99"), "Boundary", java.time.LocalDate.now().toString());
        assertEquals(0, transactionRepository.findById(id).orElseThrow().getAmount().compareTo(new BigDecimal("99999999999999999.99")));
        String updated = mockMvc.perform(put("/api/transactions/{id}", id).header("Authorization", "Bearer " + token)
                .contentType("application/json").content(objectMapper.writeValueAsString(java.util.Map.of(
                        "accountId", account.getId(), "categoryId", category.getId(), "type", "EXPENSE",
                        "amount", new BigDecimal("0.01"), "transactionDate", java.time.LocalDate.now().toString()))))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertEquals(0, objectMapper.readTree(updated).path("amount").decimalValue().compareTo(new BigDecimal("0.01")));
        assertEquals(0, transactionRepository.findById(id).orElseThrow().getAmount().compareTo(new BigDecimal("0.01")));
        mockMvc.perform(get("/api/transactions").param("size", "101").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andExpect(jsonPath("$.size").value(100));
    }
}
