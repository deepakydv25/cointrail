package com.deepak.cointrailapi.integration;

import com.deepak.cointrailapi.entity.Expense;
import com.deepak.cointrailapi.entity.User;
import com.deepak.cointrailapi.enums.ExpenseCategory;
import com.deepak.cointrailapi.repository.ExpenseRepository;
import com.deepak.cointrailapi.repository.UserRepository;
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
import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
@ActiveProfiles("test")
public class ExpenseIntegrationTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:17-alpine");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ExpenseRepository expenseRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ObjectMapper objectMapper;

    @BeforeEach()
    void cleanDatabase() {
        expenseRepository.deleteAll();
        userRepository.deleteAll();
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
    void createExpense_shouldSaveExpenseInDatabase() throws Exception {

        //Arrange

        registerUser("User One", "user1@test.com", "password123");

        String token = loginAndGetToken("user1@test.com", "password123");

        String requestBody = """
                {
                    "amount": 500.00,
                    "category": "FOOD",
                    "description": "Dinner",
                    "expenseDate": "2026-09-12"
                }
                """;

        //Act & Assert - API
        mockMvc.perform(
                        post("/api/v1/expenses/create")
                                .header("Authorization", "Bearer " + token)
                                .contentType("application/json")
                                .content(requestBody)
                )
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.amount").value(500.00))
                .andExpect(jsonPath("$.category").value("FOOD"))
                .andExpect(jsonPath("$.description").value("Dinner"))
                .andExpect(jsonPath("$.expenseDate").value("2026-09-12"));

        //Assert - Database
        assertEquals(1, expenseRepository.count());


        Expense savedExpense = expenseRepository.findAll().get(0);

        assertEquals(new BigDecimal("500.00"), savedExpense.getAmount());
        assertEquals(ExpenseCategory.FOOD, savedExpense.getCategory());
        assertEquals("Dinner", savedExpense.getDescription());
        assertNotNull(savedExpense.getUser());
        User user = userRepository.findByEmail("user1@test.com").orElseThrow();
        assertEquals(user.getId(), savedExpense.getUser().getId());
    }

    @Test
    void getExpenseById_shouldReturnExpense_whenExpenseExists() throws Exception {

        //Arrange
        registerUser("User One", "user1@test.com", "password123");

        String token = loginAndGetToken("user1@test.com", "password123");

        User user = userRepository.findByEmail("user1@test.com").orElseThrow();

        Expense expense = createExpense(
                new BigDecimal("500.00"),
                ExpenseCategory.FOOD,
                "Dinner",
                LocalDate.of(2026, 9, 12)
        );

        expense.setUser(user);

        Expense savedExpense = expenseRepository.save(expense);

        //Act & Assert
        mockMvc.perform(
                        get("/api/v1/expenses/{id}", savedExpense.getId())
                                .header("Authorization", "Bearer " + token)
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(savedExpense.getId()))
                .andExpect(jsonPath("$.amount").value(500.00))
                .andExpect(jsonPath("$.category").value("FOOD"))
                .andExpect(jsonPath("$.description").value("Dinner"))
                .andExpect(jsonPath("$.expenseDate").value("2026-09-12"));
    }

    @Test
    void getExpenseById_shouldReturn404_whenExpenseDoesNotExist() throws Exception {

        registerUser("User One", "user1@test.com", "password123");

        String token = loginAndGetToken("user1@test.com", "password123");

        mockMvc.perform(
                        get("/api/v1/expenses/{id}", 999L)
                                .header("Authorization", "Bearer " + token)
                )
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.message").value("Expense not found with id: 999"));
    }

    @Test
    void getAllExpenses_shouldReturnAllExpenses() throws Exception {

        //Arrange
        registerUser("User One", "user1@test.com", "password123");

        String token = loginAndGetToken("user1@test.com", "password123");

        User user = userRepository.findByEmail("user1@test.com").orElseThrow();

        Expense expense1 = createExpense(
                new BigDecimal("500.00"),
                ExpenseCategory.FOOD,
                "Dinner",
                LocalDate.of(2026, 9, 12)
        );
        expense1.setUser(user);

        Expense expense2 = createExpense(
                new BigDecimal("1000.00"),
                ExpenseCategory.TRAVEL,
                "Cab",
                LocalDate.of(2026, 9, 12)

        );
        expense2.setUser(user);

        expenseRepository.save(expense1);
        expenseRepository.save(expense2);

        //Act & Assert
        mockMvc.perform(
                        get("/api/v1/expenses")
                                .header("Authorization", "Bearer " + token)
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(2))
                .andExpect(jsonPath("$.totalElements").value(2));
    }

    @Test
    void getAllExpenses_shouldFilterByCategory() throws Exception {

        //Arrange
        registerUser("User One", "user1@test.com", "password123");

        String token = loginAndGetToken("user1@test.com", "password123");

        User user = userRepository.findByEmail("user1@test.com").orElseThrow();

        Expense expense1 = createExpense(
                        new BigDecimal("500.00"),
                        ExpenseCategory.FOOD,
                        "Dinner",
                        LocalDate.of(2026, 9, 12)
        );
        expense1.setUser(user);

        Expense expense2 = createExpense(
                        new BigDecimal("1000.00"),
                        ExpenseCategory.TRAVEL,
                        "Cab",
                        LocalDate.of(2026, 9, 12)
        );
        expense2.setUser(user);

        Expense expense3 = createExpense(
                        new BigDecimal("300.00"),
                        ExpenseCategory.FOOD,
                        "Lunch",
                        LocalDate.of(2026, 9, 12)
        );
        expense3.setUser(user);

        expenseRepository.save(expense1);
        expenseRepository.save(expense2);
        expenseRepository.save(expense3);

        //Act & Assert
        mockMvc.perform(
                        get("/api/v1/expenses").param("category", "FOOD")
                                .header("Authorization", "Bearer " + token)
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(2))
                .andExpect(jsonPath("$.totalElements").value(2))
                .andExpect(jsonPath("$.content[0].category").value("FOOD"))
                .andExpect(jsonPath("$.content[1].category").value("FOOD"));

    }

    @Test
    void getAllExpenses_shouldApplyPagination() throws Exception {

        //Arrange
        registerUser("User One", "user1@test.com", "password123");

        String token = loginAndGetToken("user1@test.com", "password123");

        User user = userRepository.findByEmail("user1@test.com").orElseThrow();

        Expense expense1 = createExpense(
                        new BigDecimal("100.00"),
                        ExpenseCategory.FOOD,
                        "Expense 1",
                        LocalDate.of(2026, 9, 12)
        );
        expense1.setUser(user);

        Expense expense2 = createExpense(
                        new BigDecimal("200.00"),
                        ExpenseCategory.FOOD,
                        "Expense 2",
                        LocalDate.of(2026, 9, 12)
        );
        expense2.setUser(user);

        Expense expense3 = createExpense(
                        new BigDecimal("300.00"),
                        ExpenseCategory.FOOD,
                        "Expense 3",
                        LocalDate.of(2026, 9, 12)
        );
        expense3.setUser(user);

        expenseRepository.save(expense1);
        expenseRepository.save(expense2);
        expenseRepository.save(expense3);

        // Act & Assert
        mockMvc.perform(
                        get("/api/v1/expenses").param("page", "0").param("size", "2")
                                .header("Authorization", "Bearer " + token)
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(2))
                .andExpect(jsonPath("$.totalElements").value(3))
                .andExpect(jsonPath("$.totalPages").value(2))
                .andExpect(jsonPath("$.size").value(2));
    }

    @Test
    void getAllExpenses_shouldSortByAmountDescending() throws Exception {

        //Arrange
        registerUser("User One", "user1@test.com", "password123");

        String token = loginAndGetToken("user1@test.com", "password123");

        User user = userRepository.findByEmail("user1@test.com").orElseThrow();


        Expense expense1 = createExpense(
                        new BigDecimal("500.00"),
                        ExpenseCategory.FOOD,
                        "Dinner",
                        LocalDate.of(2026, 9, 12)
        );
        expense1.setUser(user);

        Expense expense2 = createExpense(
                        new BigDecimal("2000.00"),
                        ExpenseCategory.SHOPPING,
                        "Shoes",
                        LocalDate.of(2026, 9, 12)
        );
        expense2.setUser(user);

        Expense expense3 = createExpense(
                        new BigDecimal("1000.00"),
                        ExpenseCategory.TRAVEL,
                        "Cab",
                        LocalDate.of(2026, 9, 12)
        );
        expense3.setUser(user);

        expenseRepository.save(expense1);
        expenseRepository.save(expense2);
        expenseRepository.save(expense3);

        //Act & Assert
        mockMvc.perform(
                        get("/api/v1/expenses").param("sort", "amount,desc")
                                .header("Authorization", "Bearer " + token)
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].amount").value(2000.00))
                .andExpect(jsonPath("$.content[1].amount").value(1000.00))
                .andExpect(jsonPath("$.content[2].amount").value(500.00));
    }

    @Test
    void updateExpense_shouldUpdateExpenseInDatabase() throws Exception {

        //Arrange
        registerUser("User One", "user1@test.com", "password123");

        String token = loginAndGetToken("user1@test.com", "password123");

        User user = userRepository.findByEmail("user1@test.com").orElseThrow();

        Expense expense = createExpense(
                        new BigDecimal("500.00"),
                        ExpenseCategory.FOOD,
                        "Dinner",
                        LocalDate.of(2026, 9, 12)
        );
        expense.setUser(user);

        Expense savedExpense = expenseRepository.save(expense);

        String requestBody = """
                {
                    "amount": 1200.00,
                    "category": "SHOPPING",
                    "description": "Shoes",
                    "expenseDate": "2026-09-12"
                }
                """;

        //Act & Assert - API
        mockMvc.perform(
                        put("/api/v1/expenses/{id}", expense.getId())
                                .header("Authorization", "Bearer " + token)
                                .contentType("application/json")
                                .content(requestBody)
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(expense.getId()))
                .andExpect(jsonPath("$.amount").value(1200.00))
                .andExpect(jsonPath("$.category").value("SHOPPING"))
                .andExpect(jsonPath("$.description").value("Shoes"))
                .andExpect(jsonPath("$.expenseDate").value("2026-09-12"));

        //Assert - Database
        Expense updatedExpense = expenseRepository.findById(expense.getId()).orElseThrow();

        assertEquals(new BigDecimal("1200.00"), updatedExpense.getAmount());
        assertEquals(ExpenseCategory.SHOPPING, updatedExpense.getCategory());
        assertEquals("Shoes",  updatedExpense.getDescription());
        assertEquals(LocalDate.of(2026, 9, 12), updatedExpense.getExpenseDate());
    }

    @Test
    void updateExpense_shouldReturn404_whenExpenseDoesNotExist() throws Exception{

        registerUser("User One", "user1@test.com", "password123");

        String token = loginAndGetToken("user1@test.com", "password123");

        String requestBody = """
                {
                    "amount": 1200.00,
                    "category": "SHOPPING",
                    "description": "Shoes",
                    "expenseDate": "2026-09-12"
                }
                """;

        mockMvc.perform(
                        put("/api/v1/expenses/{id}", 999L)
                                .header("Authorization", "Bearer " + token)
                                .contentType("application/json")
                                .content(requestBody)
                )
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.message").value("Expense not found with id: 999"));
    }

    @Test
    void deleteExpense_shouldDeleteExpenseFromDatabase() throws Exception{

        //Arrange
        registerUser("User One", "user1@test.com", "password123");

        String token = loginAndGetToken("user1@test.com", "password123");

        User user = userRepository.findByEmail("user1@test.com").orElseThrow();

        Expense expense = createExpense(
                        new BigDecimal("500.00"),
                        ExpenseCategory.FOOD,
                        "Dinner",
                        LocalDate.of(2026, 9, 12)
        );
        expense.setUser(user);

        Expense savedExpense = expenseRepository.save(expense);

        Long expenseId = expense.getId();

        assertTrue(expenseRepository.existsById(expenseId));

        //Act & Assert
        mockMvc.perform(
                        delete("/api/v1/expenses/{id}", expenseId)
                                .header("Authorization", "Bearer " + token)
                )
                .andExpect(status().isNoContent());

        //verify database
        assertFalse(expenseRepository.existsById(expenseId));
    }

    @Test
    void deleteExpense_shouldReturn404_whenExpenseDoesNotExist() throws Exception {

        registerUser("User One", "user1@test.com", "password123");

        String token = loginAndGetToken("user1@test.com", "password123");

        mockMvc.perform(
                        delete("/api/v1/expenses/{id}", 999L)
                                .header("Authorization", "Bearer "+token)
                )
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.message").value("Expense not found with id: 999"));
    }

    private Expense createExpense(
            BigDecimal amount,
            ExpenseCategory category,
            String description,
            LocalDate expenseDate) {

        Expense expense = new Expense();

        expense.setAmount(amount);
        expense.setCategory(category);
        expense.setDescription(description);
        expense.setExpenseDate(expenseDate);

        LocalDateTime now = LocalDateTime.now();
        expense.setCreatedAt(now);
        expense.setUpdatedAt(now);

        return expense;
    }
}
