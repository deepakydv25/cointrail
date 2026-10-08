package com.deepak.cointrailapi.account;

import com.deepak.cointrailapi.user.UserRepository;
import java.math.BigDecimal;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
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

    @MockitoSpyBean
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

    @Test
    void concurrentCreatesReturnCreatedAndConflict() throws Exception {
        registerUser("Race user", "race-create@test.com", "password123");
        String token = loginAndGetToken("race-create@test.com", "password123");
        coordinateRaceWrites();
        assertRaceResponses(post("/api/accounts").content("{\"name\":\"Race\",\"type\":\"BANK\",\"openingBalance\":0}"),
                post("/api/accounts").content("{\"name\":\"Race\",\"type\":\"BANK\",\"openingBalance\":0}"), token, 201);
        assertThat(accountRepository.findAll().stream().filter(value -> value.getName().equals("Race")).count()).isEqualTo(1);
    }

    @Test
    void concurrentRenamesReturnSuccessAndConflictWithoutChangingLosingRow() throws Exception {
        registerUser("Race user", "race-rename@test.com", "password123");
        String token = loginAndGetToken("race-rename@test.com", "password123");
        Long first = createAccountThroughApi(token, "First", AccountType.BANK, BigDecimal.ZERO);
        Long second = createAccountThroughApi(token, "Second", AccountType.BANK, BigDecimal.ZERO);
        coordinateRaceWrites();
        assertRaceResponses(put("/api/accounts/{id}", first).content("{\"name\":\"Race\",\"type\":\"BANK\",\"openingBalance\":0}"),
                put("/api/accounts/{id}", second).content("{\"name\":\"Race\",\"type\":\"BANK\",\"openingBalance\":0}"), token, 200);
        var names = accountRepository.findAll().stream().filter(value -> value.getId().equals(first) || value.getId().equals(second))
                .map(Account::getName).toList();
        assertThat(names).contains("Race");
        assertThat(names.stream().filter(name -> name.equals("First") || name.equals("Second")).count()).isEqualTo(1);
    }

    private void coordinateRaceWrites() {
        CyclicBarrier barrier = new CyclicBarrier(2);
        doAnswer(invocation -> {
            Account value = invocation.getArgument(0);
            if (value.getName().equals("Race")) barrier.await(10, TimeUnit.SECONDS);
            // Spring wraps repository interfaces with a delegate to the original JPA proxy.
            return org.mockito.Mockito.mockingDetails(accountRepository).getMockCreationSettings().getDefaultAnswer().answer(invocation);
        }).when(accountRepository).saveAndFlush(any());
    }

    private void assertRaceResponses(MockHttpServletRequestBuilder first, MockHttpServletRequestBuilder second,
            String token, int success) throws Exception {
        try (var executor = Executors.newFixedThreadPool(2)) {
            var left = executor.submit(() -> mockMvc.perform(first.contentType("application/json")
                    .header("Authorization", "Bearer " + token)).andReturn());
            var right = executor.submit(() -> mockMvc.perform(second.contentType("application/json")
                    .header("Authorization", "Bearer " + token)).andReturn());
            MvcResult a = left.get(30, TimeUnit.SECONDS), b = right.get(30, TimeUnit.SECONDS);
            assertThat(java.util.List.of(a.getResponse().getStatus(), b.getResponse().getStatus()))
                    .containsExactlyInAnyOrder(success, 409);
            var conflict = a.getResponse().getStatus() == 409 ? a : b;
            assertThat(objectMapper.readTree(conflict.getResponse().getContentAsString()).path("status").asInt()).isEqualTo(409);
        }
    }

    @Test
    void signedOpeningBalanceBoundariesRoundTripWithoutRounding() throws Exception {
        registerUser("Money user", "money@test.com", "password123");
        String token = loginAndGetToken("money@test.com", "password123");
        for (String amount : java.util.List.of("99999999999999999.99", "-99999999999999999.99")) {
            Long id = createAccountThroughApi(token, "Boundary " + amount, AccountType.BANK, new BigDecimal(amount));
            String json = mockMvc.perform(get("/api/accounts/{id}", id).header("Authorization", "Bearer " + token))
                    .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
            assertThat(tools.jackson.databind.json.JsonMapper.builder().enable(tools.jackson.databind.DeserializationFeature.USE_BIG_DECIMAL_FOR_FLOATS)
                    .build().readTree(json).path("openingBalance").decimalValue()).isEqualByComparingTo(amount);
            assertThat(accountRepository.findById(id).orElseThrow().getOpeningBalance()).isEqualByComparingTo(amount);
        }
    }
}
