package com.deepak.cointrailapi;

import com.deepak.cointrailapi.entity.Expense;
import com.deepak.cointrailapi.entity.User;
import com.deepak.cointrailapi.repository.ExpenseRepository;
import com.deepak.cointrailapi.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
public class SecurityIntegrationTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:17-alpine");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ExpenseRepository expenseRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private ObjectMapper objectMapper;

    @BeforeEach
    void cleanDatabase() {
        expenseRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    void getAllExpenses_withoutToken_shouldReturn401() throws Exception {
        mockMvc.perform(
                get("/api/v1/expenses")
        ).andExpect(status().isUnauthorized());
    }

    @Test
    void register_withoutToken_shouldBeAllowed() throws Exception {
        String requestBody = """
                {
                    "name": "User One",
                    "email": "user1@test.com",
                    "password": "password123"
                }
                """;

        mockMvc.perform(
                        post("/api/v1/auth/register")
                            .contentType("application/json")
                            .content(requestBody)
                )
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.email").value("user1@test.com"));
    }

    @Test
    void login_withValidCredentials_shouldReturnJwt() throws Exception {
        registerUser(
                "User One",
                "user1@test.com",
                "password123"
        );

        String loginBody = """
                {
                    "email": "user1@test.com",
                    "password": "password123"
                }
                """;

        mockMvc.perform(
                        post("/api/v1/auth/login")
                                .contentType("application/json")
                                .content(loginBody)
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.tokenType").value("Bearer"));
    }

    private void registerUser(String name, String email, String password) throws Exception {
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

    private String loginAndGetToken(String email, String password) throws Exception {
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

    @Test
    void getAllExpenses_withValidToken_shouldReturn200() throws Exception {
        registerUser("User One", "user1@test.com", "password123");

        String token = loginAndGetToken("user1@test.com", "password123");

        mockMvc.perform(
                        get("/api/v1/expenses")
                                .header("Authorization", "Bearer "+token)
                )
                .andExpect(status().isOk());
    }

    @Test
    void getAllExpenses_withInvalidToken_shouldReturn401() throws Exception {
        mockMvc.perform(
                        get("/api/v1/expenses")
                                .header("Authorization", "Bearer invalid-token")
                )
                .andExpect(status().isUnauthorized());
    }

    private void createExpense(String token, BigDecimal amount, String description) throws Exception {
        String body = """
                {
                    "amount": %s,
                    "category": "FOOD",
                    "description": "%s",
                    "expenseDate": "%s"
                }
                """.formatted(amount, description, LocalDate.now());

        mockMvc.perform(
                        post("/api/v1/expenses/create")
                                .header("Authorization", "Bearer "+token)
                                .contentType("application/json")
                                .content(body)
                )
                .andExpect(status().isCreated());
    }

    @Test
    void getAllExpenses_shouldReturnOnlyCurrentUsersExpenses() throws Exception {
        registerUser(
                "User One",
                "user1@test.com",
                "password123"
        );

        registerUser(
                "User Two",
                "user2@test.com",
                "password123"
        );

        String user1Token = loginAndGetToken("user1@test.com", "password123");

        String user2Token = loginAndGetToken("user2@test.com", "password123");

        createExpense(user1Token, new BigDecimal("100.00"), "User 1 Expense");

        createExpense(user2Token, new BigDecimal("200.00"), "User 2 Expense");

        mockMvc.perform(
                        get("/api/v1/expenses")
                                .header("Authorization", "Bearer "+user1Token)
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].description").value("User 1 Expense"));
    }

    @Test
    void user2_shouldOnlySeeUser2Expenses() throws Exception {
        registerUser(
                "User One",
                "user1@test.com",
                "password123"
        );

        registerUser(
                "User Two",
                "user2@test.com",
                "password123"
        );

        String user1Token = loginAndGetToken("user1@test.com", "password123");

        String user2Token = loginAndGetToken("user2@test.com", "password123");

        createExpense(user1Token, new BigDecimal("100.00"), "User 1 Expense");

        createExpense(user2Token, new BigDecimal("200.00"), "User 2 Expense");

        mockMvc.perform(
                        get("/api/v1/expenses")
                                .header("Authorization", "Bearer "+user2Token)
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].description").value("User 2 Expense"));
    }

    @Test
    void user1_shouldNotAccessUser2Expense() throws Exception {
        registerUser(
                "User One",
                "user1@test.com",
                "password123"
        );

        registerUser(
                "User Two",
                "user2@test.com",
                "password123"
        );

        String user1Token = loginAndGetToken("user1@test.com", "password123");

        String user2Token = loginAndGetToken("user2@test.com", "password123");

        createExpense(user2Token, new BigDecimal("500.00"), "Private User 2 Expense");

        Expense user2Expense = expenseRepository.findAll()
                .stream().findFirst().orElseThrow();

        mockMvc.perform(
                        get("/api/v1/expenses/"+user2Expense.getId())
                                .header("Authorization", "Bearer "+user1Token)
                )
                .andExpect(status().isNotFound());
    }

    @Test
    void user1_shouldNotUpdateUser2Expense() throws Exception {

        //create users+tokens
        //create expense with User 2 token
        //get its ID

        registerUser(
                "User One",
                "user1@test.com",
                "password123"
        );

        registerUser(
                "User Two",
                "user2@test.com",
                "password123"
        );

        String user1Token = loginAndGetToken("user1@test.com", "password123");

        String user2Token = loginAndGetToken("user2@test.com", "password123");

        createExpense(user2Token, new BigDecimal("500.00"), "Private User 2 Expense");

        User user2 = userRepository.findByEmail("user2@test.com").orElseThrow();

        Expense user2Expense = expenseRepository.findAllByUserId(user2.getId(), Pageable.unpaged())
                .stream().findFirst().orElseThrow();


        String updatedBody = """
                {
                    "amount": 999.00,
                    "category": "TRAVEL",
                    "description": "Trying to modify",
                    "expenseDate": "%s"
                }
                """.formatted(LocalDate.now());

        mockMvc.perform(
                        put("/api/v1/expenses/"+user2Expense.getId())
                                .header("Authorization", "Bearer "+user1Token)
                                .contentType("application/json")
                                .content(updatedBody)
                )
                .andExpect(status().isNotFound());
    }

    @Test
    void user1_shouldNotDeleteUser2Expense() throws Exception {
        //create users+tokens
        //create expense with User 2 token
        //get its ID

        registerUser(
                "User One",
                "user1@test.com",
                "password123"
        );

        registerUser(
                "User Two",
                "user2@test.com",
                "password123"
        );

        String user1Token = loginAndGetToken("user1@test.com", "password123");

        String user2Token = loginAndGetToken("user2@test.com", "password123");

        createExpense(user2Token, new BigDecimal("500.00"), "Private User 2 Expense");

        User user2 = userRepository.findByEmail("user2@test.com").orElseThrow();

        Expense user2Expense = expenseRepository.findAllByUserId(user2.getId(), Pageable.unpaged())
                .stream().findFirst().orElseThrow();

        mockMvc.perform(
                        delete("/api/v1/expenses/"+user2Expense.getId())
                                .header("Authorization", "Bearer "+user1Token)
                )
                .andExpect(status().isNotFound());
    }
}
