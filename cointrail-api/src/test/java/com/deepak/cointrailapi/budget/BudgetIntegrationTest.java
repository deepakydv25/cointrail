package com.deepak.cointrailapi.budget;

import com.deepak.cointrailapi.account.AccountRepository;
import com.deepak.cointrailapi.category.*;
import com.deepak.cointrailapi.transaction.TransactionRepository;
import com.deepak.cointrailapi.user.UserRepository;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.testcontainers.junit.jupiter.*;
import org.testcontainers.postgresql.PostgreSQLContainer;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.DeserializationFeature;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
@ActiveProfiles("test")
class BudgetIntegrationTest {
    @Container @ServiceConnection
    static PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:17-alpine");
    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private BudgetRepository budgetRepository;
    @Autowired private TransactionRepository transactionRepository;
    @Autowired private AccountRepository accountRepository;
    @Autowired private CategoryRepository categoryRepository;
    @Autowired private UserRepository userRepository;
    private final YearMonth period = YearMonth.now().minusMonths(2);

    @BeforeEach
    @AfterEach
    void cleanDatabase() {
        budgetRepository.deleteAll();
        transactionRepository.deleteAll();
        categoryRepository.findAll().stream().filter(c -> !c.isSystem()).forEach(categoryRepository::delete);
        accountRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    void shouldPersistCrudKeepImmutableFieldsAndAllowRecreationAfterHardDelete() throws Exception {
        String token = token();
        long food = systemCategory("Food");
        JsonNode created = createBudget(token, food, "100.00");
        long id = created.get("id").asLong();
        // Read persisted timestamps: PostgreSQL stores microseconds, while Java creation can have nanoseconds.
        JsonNode before = request(get("/api/budgets/{id}", id), token, null, 200);
        JsonNode changed = request(put("/api/budgets/{id}", id), token,
                Map.of("amount", new BigDecimal("250.00"), "categoryId", systemCategory("Shopping"),
                        "year", 1, "month", 12), 200);
        assertThat(changed.get("amount").decimalValue()).isEqualByComparingTo("250.00");
        assertThat(changed.get("categoryId")).isEqualTo(before.get("categoryId"));
        assertThat(changed.get("year")).isEqualTo(before.get("year"));
        assertThat(changed.get("month")).isEqualTo(before.get("month"));
        assertThat(changed.get("createdAt")).isEqualTo(before.get("createdAt"));
        assertThat(changed.get("updatedAt").asText()).isGreaterThan(before.get("updatedAt").asText());
        Budget saved = budgetRepository.findById(id).orElseThrow();
        assertThat(saved.getAmount()).isEqualByComparingTo("250.00");
        assertThat(saved.getCategory().getId()).isEqualTo(food);
        assertThat(saved.getYear()).isEqualTo(period.getYear());
        assertThat(saved.getMonth()).isEqualTo(period.getMonthValue());
        assertThat(list(token)).hasSize(1);
        transaction(token, account(token), food, "EXPENSE", "12.34", period, null);
        mockMvc.perform(delete("/api/budgets/{id}", id).header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent()).andExpect(content().string(""));
        assertThat(budgetRepository.existsById(id)).isFalse();
        request(get("/api/budgets/{id}", id), token, null, 404);
        request(delete("/api/budgets/{id}", id), token, null, 404);
        assertThat(transactionRepository.count()).isEqualTo(1);
        JsonNode recreated = createBudget(token, food, "100.00");
        assertThat(recreated.get("id").asLong()).isNotEqualTo(id);
        assertThat(recreated.get("spentAmount").decimalValue()).isEqualByComparingTo("12.34");
    }

    @Test
    void shouldIsolateBudgetsAndSpendingForUsersSharingSystemCategory() throws Exception {
        String owner = token();
        String other = token();
        long food = systemCategory("Food");
        long id = createBudget(owner, food, "100.00").get("id").asLong();
        assertThat(list(other)).isEmpty();
        JsonNode denied = request(get("/api/budgets/{id}", id), other, null, 404);
        JsonNode absent = request(get("/api/budgets/{id}", Long.MAX_VALUE), other, null, 404);
        assertThat(denied).isEqualTo(absent);
        request(put("/api/budgets/{id}", id), other, Map.of("amount", 1), 404);
        request(delete("/api/budgets/{id}", id), other, null, 404);
        Map<String, Object> spoofedOwner = new HashMap<>(budgetBody(food, "200.00", period));
        spoofedOwner.put("userId", budgetRepository.findById(id).orElseThrow().getUser().getId());
        long otherId = request(post("/api/budgets"), other, spoofedOwner, 201).get("id").asLong();
        assertThat(budgetRepository.findById(otherId).orElseThrow().getUser().getId())
                .isNotEqualTo(budgetRepository.findById(id).orElseThrow().getUser().getId());
        long account = account(other);
        transaction(other, account, food, "EXPENSE", "75.00", period, null);
        assertProgress(owner, id, "0.00", "100.00", false);
        assertProgress(other, otherId, "75.00", "125.00", false);
        assertThat(list(owner).get(0).get("id").asLong()).isEqualTo(id);
        assertThat(list(other).get(0).get("id").asLong()).isEqualTo(otherId);
        assertThat(budgetRepository.findById(id).orElseThrow().getAmount()).isEqualByComparingTo("100.00");
    }

    @Test
    void shouldEnforceCategoryEligibilityAndNormalDuplicateConflict() throws Exception {
        String owner = token();
        String other = token();
        long own = customCategory(owner, "Pets", "EXPENSE");
        createBudget(owner, own, "100.00");
        request(post("/api/budgets"), owner, budgetBody(own, "100.00", period), 409);
        request(post("/api/budgets"), other, budgetBody(own, "100.00", period), 404);
        long foreignIncome = customCategory(other, "Private Income", "INCOME");
        JsonNode hidden = request(post("/api/budgets"), owner, budgetBody(foreignIncome, "1.00", period), 404);
        assertThat(hidden.get("message").asText()).isEqualTo("Category not found");
        request(post("/api/budgets"), owner, budgetBody(systemCategory("Salary"), "1.00", period), 400);
        long ownIncome = customCategory(owner, "Budget Custom Income", "INCOME");
        request(post("/api/budgets"), owner, budgetBody(ownIncome, "1.00", period), 400);
        request(delete("/api/categories/{id}", own), owner, null, 204);
        request(post("/api/budgets"), owner, budgetBody(own, "100.00", period.minusMonths(1)), 404);
        request(post("/api/budgets"), owner, budgetBody(Long.MAX_VALUE, "1.00", period), 404);
        assertThat(budgetRepository.count()).isEqualTo(1);
    }

    @Test
    void shouldRecalculateProgressAfterTransactionAmountDateCategoryTypeAndDeletionChanges() throws Exception {
        String token = token();
        long food = systemCategory("Food");
        long shopping = systemCategory("Shopping");
        long salary = systemCategory("Salary");
        long account = account(token);
        long foodBudget = createBudget(token, food, "100.00").get("id").asLong();
        long shoppingBudget = createBudget(token, shopping, "100.00").get("id").asLong();
        assertProgress(token, foodBudget, "0.00", "100.00", false);
        long tx = transaction(token, account, food, "EXPENSE", "100.00", period, null);
        assertProgress(token, foodBudget, "100.00", "0.00", false);
        transaction(token, account, food, "EXPENSE", "125.55", period, tx);
        assertProgress(token, foodBudget, "125.55", "-25.55", true);
        transaction(token, account, food, "EXPENSE", "125.55", period.minusMonths(1), tx);
        assertProgress(token, foodBudget, "0.00", "100.00", false);
        transaction(token, account, shopping, "EXPENSE", "125.55", period, tx);
        assertProgress(token, foodBudget, "0.00", "100.00", false);
        assertProgress(token, shoppingBudget, "125.55", "-25.55", true);
        JsonNode budgets = list(token);
        assertThat(budgets).hasSize(2);
        for (JsonNode budget : budgets) {
            String spent = budget.get("id").asLong() == foodBudget ? "0.00" : "125.55";
            assertThat(budget.get("spentAmount").decimalValue()).isEqualByComparingTo(spent);
        }
        transaction(token, account, salary, "INCOME", "125.55", period, tx);
        assertProgress(token, shoppingBudget, "0.00", "100.00", false);
        transaction(token, account, food, "EXPENSE", "25.25", period, tx);
        assertProgress(token, foodBudget, "25.25", "74.75", false);
        request(delete("/api/transactions/{id}", tx), token, null, 204);
        assertProgress(token, foodBudget, "0.00", "100.00", false);
        assertThat(transactionRepository.count()).isZero();
    }

    @Test
    void shouldRetainHistoricalProgressAndAllowAmountEditsAfterDeactivation() throws Exception {
        String token = token();
        long category = customCategory(token, "Historical Pets", "EXPENSE");
        long account = account(token);
        long id = createBudget(token, category, "100.00").get("id").asLong();
        transaction(token, account, category, "EXPENSE", "12.34", period, null);
        request(put("/api/categories/{id}", category), token, Map.of("name", "Renamed Pets"), 200);
        request(delete("/api/categories/{id}", category), token, null, 204);
        request(delete("/api/accounts/{id}", account), token, null, 204);
        JsonNode historical = request(get("/api/budgets/{id}", id), token, null, 200);
        assertThat(historical.get("categoryName").asText()).isEqualTo("Renamed Pets");
        assertProgress(token, id, "12.34", "87.66", false);
        assertThat(list(token).get(0).get("spentAmount").decimalValue()).isEqualByComparingTo("12.34");
        JsonNode edited = request(put("/api/budgets/{id}", id), token, Map.of("amount", new BigDecimal("10.00")), 200);
        assertThat(edited.get("spentAmount").decimalValue()).isEqualByComparingTo("12.34");
        assertThat(edited.get("remainingAmount").decimalValue()).isEqualByComparingTo("-2.34");
        assertThat(edited.get("overBudget").asBoolean()).isTrue();
        assertThat(transactionRepository.count()).isEqualTo(1);
    }

    @Test
    void shouldRequireRealJwtForAllBudgetOperations() throws Exception {
        List<MockHttpServletRequestBuilder> missing = List.of(
                post("/api/budgets").contentType("application/json").content("{}"),
                get("/api/budgets").param("year", "2024").param("month", "2"),
                get("/api/budgets/1"), put("/api/budgets/1").contentType("application/json").content("{\"amount\":1}"), delete("/api/budgets/1"));
        for (MockHttpServletRequestBuilder request : missing) {
            mockMvc.perform(request).andExpect(status().isUnauthorized());
            mockMvc.perform(request.header("Authorization", "Bearer invalid-token")).andExpect(status().isUnauthorized());
        }
        assertThat(budgetRepository.count()).isZero();
    }

    @Test
    void shouldSupportFuturePeriodsAndDecember9999ThroughRealDatabaseQuery() throws Exception {
        String token = token();
        long food = systemCategory("Food");
        for (YearMonth boundary : List.of(YearMonth.of(1, 1), YearMonth.now().plusYears(1), YearMonth.of(9999, 12))) {
            String amount = boundary.getYear() == 9999 ? "99999999999999999.99" : "0.01";
            JsonNode created = request(post("/api/budgets"), token, budgetBody(food, amount, boundary), 201);
            JsonNode read = request(get("/api/budgets/{id}", created.get("id").asLong()), token, null, 200);
            assertThat(read.get("amount").decimalValue()).isEqualByComparingTo(amount);
            assertThat(read.get("spentAmount").decimalValue()).isEqualByComparingTo("0.00");
            JsonNode listed = request(get("/api/budgets").param("year", "" + boundary.getYear())
                    .param("month", "" + boundary.getMonthValue()), token, null, 200);
            assertThat(listed).hasSize(1);
        }
    }

    private String token() throws Exception {
        String email = "budget-" + UUID.randomUUID() + "@test.com";
        request(post("/api/v1/auth/register"), null, Map.of("name", "Budget User", "email", email, "password", "password123"), 201);
        return request(post("/api/v1/auth/login"), null, Map.of("email", email, "password", "password123"), 200).get("accessToken").asText();
    }

    private long systemCategory(String name) {
        return categoryRepository.findAll().stream().filter(c -> c.isSystem() && c.getName().equals(name)).findFirst().orElseThrow().getId();
    }

    private long customCategory(String token, String name, String type) throws Exception {
        return request(post("/api/categories"), token, Map.of("name", name, "type", type), 201).get("id").asLong();
    }

    private long account(String token) throws Exception {
        return request(post("/api/accounts"), token, Map.of("name", "Budget Bank", "type", "BANK", "openingBalance", 0), 201).get("id").asLong();
    }

    private JsonNode createBudget(String token, long category, String amount) throws Exception {
        return request(post("/api/budgets"), token, budgetBody(category, amount, period), 201);
    }

    private Map<String, Object> budgetBody(long category, String amount, YearMonth month) {
        return Map.of("categoryId", category, "year", month.getYear(), "month", month.getMonthValue(), "amount", new BigDecimal(amount));
    }

    private JsonNode list(String token) throws Exception {
        return request(get("/api/budgets").param("year", "" + period.getYear()).param("month", "" + period.getMonthValue()), token, null, 200);
    }

    private long transaction(String token, long account, long category, String type, String amount, YearMonth month, Long id) throws Exception {
        return request(id == null ? post("/api/transactions") : put("/api/transactions/{id}", id), token,
                Map.of("accountId", account, "categoryId", category, "type", type, "amount", new BigDecimal(amount),
                        "transactionDate", month.atDay(1).toString()), id == null ? 201 : 200).get("id").asLong();
    }

    private void assertProgress(String token, long id, String spent, String remaining, boolean over) throws Exception {
        JsonNode result = request(get("/api/budgets/{id}", id), token, null, 200);
        assertThat(result.get("spentAmount").decimalValue()).isEqualByComparingTo(spent);
        assertThat(result.get("remainingAmount").decimalValue()).isEqualByComparingTo(remaining);
        assertThat(result.get("overBudget").asBoolean()).isEqualTo(over);
    }

    private JsonNode request(MockHttpServletRequestBuilder request, String token, Object body, int expected) throws Exception {
        if (token != null) request.header("Authorization", "Bearer " + token);
        if (body != null) request.contentType("application/json").content(objectMapper.writeValueAsString(body));
        String result = mockMvc.perform(request).andExpect(status().is(expected)).andReturn().getResponse().getContentAsString();
        // Preserve the full NUMERIC(19,2) contract instead of the tree reader's default double precision.
        return result.isBlank() ? null : objectMapper.reader()
                .with(DeserializationFeature.USE_BIG_DECIMAL_FOR_FLOATS).readTree(result);
    }
}
