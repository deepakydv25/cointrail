package com.deepak.cointrailapi.budget;

import com.deepak.cointrailapi.budget.dto.*;
import com.deepak.cointrailapi.common.exception.*;
import com.deepak.cointrailapi.common.security.JwtAuthenticationFilter;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.*;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.ObjectMapper;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Stream;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(BudgetController.class)
@AutoConfigureMockMvc(addFilters = false)
class BudgetControllerTest {
    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @MockitoBean private BudgetService service;
    @MockitoBean private JwtAuthenticationFilter jwtAuthenticationFilter;

    @Test
    void shouldCreateAndExposeFlatResponseContract() throws Exception {
        when(service.createBudget(20L, 2024, 2, new BigDecimal("100.00"))).thenReturn(details());
        mockMvc.perform(post("/api/budgets").contentType("application/json")
                        .content(objectMapper.writeValueAsString(new CreateBudgetRequest(20L, 2024, 2, new BigDecimal("100.00")))))
                .andExpect(status().isCreated()).andExpect(content().contentTypeCompatibleWith("application/json"))
                .andExpect(jsonPath("$.id").value(100)).andExpect(jsonPath("$.categoryId").value(20))
                .andExpect(jsonPath("$.categoryName").value("Food"))
                .andExpect(jsonPath("$.year").value(2024)).andExpect(jsonPath("$.month").value(2))
                .andExpect(jsonPath("$.amount").value(100.00)).andExpect(jsonPath("$.spentAmount").value(125.55))
                .andExpect(jsonPath("$.remainingAmount").value(-25.55)).andExpect(jsonPath("$.overBudget").value(true))
                .andExpect(jsonPath("$.createdAt").value("2024-01-01T00:00:00"))
                .andExpect(jsonPath("$.updatedAt").value("2024-01-02T00:00:00"))
                .andExpect(jsonPath("$.userId").doesNotExist()).andExpect(jsonPath("$.user").doesNotExist())
                .andExpect(jsonPath("$.category").doesNotExist());
        verify(service).createBudget(20L, 2024, 2, new BigDecimal("100.00"));
    }

    @Test
    void shouldGetListAndSingleBudget() throws Exception {
        when(service.getBudgets(2024, 2)).thenReturn(List.of(details()));
        when(service.getBudget(100L)).thenReturn(details());
        mockMvc.perform(get("/api/budgets").param("year", "2024").param("month", "2"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(100));
        mockMvc.perform(get("/api/budgets/100")).andExpect(status().isOk())
                .andExpect(jsonPath("$.categoryName").value("Food"));
        verify(service).getBudgets(2024, 2);
        verify(service).getBudget(100L);
    }

    @Test
    void shouldReturnEmptyArray() throws Exception {
        when(service.getBudgets(2024, 2)).thenReturn(List.of());
        mockMvc.perform(get("/api/budgets").param("year", "2024").param("month", "2"))
                .andExpect(status().isOk()).andExpect(content().json("[]"));
    }

    @Test
    void shouldPutAmountAndDeleteWithoutBody() throws Exception {
        when(service.updateBudget(100L, new BigDecimal("100.00"))).thenReturn(details());
        mockMvc.perform(put("/api/budgets/100").contentType("application/json")
                        .content(objectMapper.writeValueAsString(new UpdateBudgetRequest(new BigDecimal("100.00")))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.id").value(100));
        mockMvc.perform(delete("/api/budgets/100")).andExpect(status().isNoContent()).andExpect(content().string(""));
        verify(service).updateBudget(100L, new BigDecimal("100.00"));
        verify(service).deleteBudget(100L);
    }

    static Stream<Arguments> invalidCreateRequests() {
        return Stream.of(
                Arguments.of("{\"year\":2024,\"month\":2,\"amount\":1}", "categoryId"),
                Arguments.of("{\"categoryId\":0,\"year\":2024,\"month\":2,\"amount\":1}", "categoryId"),
                Arguments.of("{\"categoryId\":-1,\"year\":2024,\"month\":2,\"amount\":1}", "categoryId"),
                Arguments.of("{\"categoryId\":20,\"month\":2,\"amount\":1}", "year"),
                Arguments.of("{\"categoryId\":20,\"year\":0,\"month\":2,\"amount\":1}", "year"),
                Arguments.of("{\"categoryId\":20,\"year\":10000,\"month\":2,\"amount\":1}", "year"),
                Arguments.of("{\"categoryId\":20,\"year\":2024,\"amount\":1}", "month"),
                Arguments.of("{\"categoryId\":20,\"year\":2024,\"month\":0,\"amount\":1}", "month"),
                Arguments.of("{\"categoryId\":20,\"year\":2024,\"month\":13,\"amount\":1}", "month"));
    }

    @ParameterizedTest
    @MethodSource("invalidCreateRequests")
    void shouldRejectCreateFieldValidationBeforeService(String json, String field) throws Exception {
        mockMvc.perform(post("/api/budgets").contentType("application/json").content(json))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value("Validation Failed")).andExpect(jsonPath("$.errors." + field).exists());
        verifyNoInteractions(service);
    }

    @ParameterizedTest
    @ValueSource(strings = {"null", "0", "-1", "0.001", "1.001", "1.000", "100000000000000000", "100000000000000000.00"})
    void shouldRejectInvalidAmountsOnPostAndPut(String amount) throws Exception {
        mockMvc.perform(post("/api/budgets").contentType("application/json")
                        .content("{\"categoryId\":20,\"year\":2024,\"month\":2,\"amount\":" + amount + "}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors.amount").exists());
        mockMvc.perform(put("/api/budgets/100").contentType("application/json").content("{\"amount\":" + amount + "}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors.amount").exists());
        verifyNoInteractions(service);
    }

    @Test
    void shouldRequireAmountOnPostAndPut() throws Exception {
        mockMvc.perform(post("/api/budgets").contentType("application/json").content("{\"categoryId\":20,\"year\":2024,\"month\":2}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors.amount").value("Budget amount is required"));
        mockMvc.perform(put("/api/budgets/100").contentType("application/json").content("{}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors.amount").value("Budget amount is required"));
        verifyNoInteractions(service);
    }

    @ParameterizedTest
    @CsvSource({"year,0", "year,10000", "month,0", "month,13", "year,abc", "month,abc"})
    void shouldRejectInvalidQueryParameters(String field, String value) throws Exception {
        mockMvc.perform(get("/api/budgets").param("year", field.equals("year") ? value : "2024")
                        .param("month", field.equals("month") ? value : "2"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.errors." + field).exists());
        verifyNoInteractions(service);
    }

    @ParameterizedTest
    @ValueSource(strings = {"year", "month"})
    void shouldRequireBothQueryParameters(String missing) throws Exception {
        mockMvc.perform(get("/api/budgets").param(missing.equals("year") ? "month" : "year", "2"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.message").value("Invalid request parameter"))
                .andExpect(jsonPath("$.errors." + missing).value("Required request parameter is missing"));
        verifyNoInteractions(service);
    }

    @Test
    void shouldRejectMalformedJsonAndIdsBeforeService() throws Exception {
        mockMvc.perform(post("/api/budgets").contentType("application/json").content("{"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.message").value("Invalid request body"));
        mockMvc.perform(put("/api/budgets/100").contentType("application/json").content("{\"amount\":\"abc\"}"))
                .andExpect(status().isBadRequest());
        mockMvc.perform(get("/api/budgets/not-a-number")).andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors.id").exists());
        mockMvc.perform(delete("/api/budgets/9223372036854775808")).andExpect(status().isBadRequest());
        verifyNoInteractions(service);
    }

    @ParameterizedTest
    @CsvSource({"1,1,0.01", "9999,12,99999999999999999.99"})
    void shouldAcceptContractBoundaries(int year, int month, String amount) throws Exception {
        when(service.createBudget(20L, year, month, new BigDecimal(amount))).thenReturn(details());
        when(service.getBudgets(year, month)).thenReturn(List.of());
        mockMvc.perform(post("/api/budgets").contentType("application/json")
                        .content(objectMapper.writeValueAsString(new CreateBudgetRequest(20L, year, month, new BigDecimal(amount)))))
                .andExpect(status().isCreated());
        mockMvc.perform(get("/api/budgets").param("year", "" + year).param("month", "" + month)).andExpect(status().isOk());
    }

    @ParameterizedTest
    @MethodSource("createExceptions")
    void shouldMapBudgetAndCategoryExceptions(RuntimeException failure, int expected) throws Exception {
        when(service.createBudget(anyLong(), anyInt(), anyInt(), any())).thenThrow(failure);
        mockMvc.perform(post("/api/budgets").contentType("application/json")
                        .content("{\"categoryId\":20,\"year\":2024,\"month\":2,\"amount\":1}"))
                .andExpect(status().is(expected)).andExpect(jsonPath("$.status").value(expected))
                .andExpect(jsonPath("$.message").value(failure.getMessage()));
    }

    static Stream<Arguments> createExceptions() {
        return Stream.of(Arguments.of(new CategoryNotFoundException("Category not found"), 404),
                Arguments.of(new InvalidBudgetException("Budgets require an expense category"), 400),
                Arguments.of(new BudgetAlreadyExistsException("Budget for this category and month already exists"), 409));
    }

    @Test
    void shouldReturn404ForGetUpdateAndDelete() throws Exception {
        when(service.getBudget(999L)).thenThrow(new BudgetNotFoundException("Budget not found"));
        when(service.updateBudget(eq(999L), any())).thenThrow(new BudgetNotFoundException("Budget not found"));
        doThrow(new BudgetNotFoundException("Budget not found")).when(service).deleteBudget(999L);
        mockMvc.perform(get("/api/budgets/999")).andExpect(status().isNotFound()).andExpect(jsonPath("$.message").value("Budget not found"));
        mockMvc.perform(put("/api/budgets/999").contentType("application/json").content("{\"amount\":1}"))
                .andExpect(status().isNotFound());
        mockMvc.perform(delete("/api/budgets/999")).andExpect(status().isNotFound());
    }

    private BudgetDetails details() {
        return new BudgetDetails(100L, 20L, "Food", 2024, 2, new BigDecimal("100.00"),
                new BigDecimal("125.55"), new BigDecimal("-25.55"), true,
                LocalDateTime.of(2024, 1, 1, 0, 0), LocalDateTime.of(2024, 1, 2, 0, 0));
    }
}
