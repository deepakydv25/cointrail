package com.deepak.cointrailapi.controller;

import com.deepak.cointrailapi.dto.CreateExpenseRequest;
import com.deepak.cointrailapi.dto.ExpenseResponse;
import com.deepak.cointrailapi.dto.UpdateExpenseResponse;
import com.deepak.cointrailapi.enums.ExpenseCategory;
import com.deepak.cointrailapi.exception.ExpenseNotFoundException;
import com.deepak.cointrailapi.security.JwtAuthenticationFilter;
import com.deepak.cointrailapi.service.ExpenseService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.data.domain.*;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.ObjectMapper;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ExpenseController.class)
@AutoConfigureMockMvc(addFilters = false)
public class ExpenseControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private ExpenseService expenseService;

    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @Test
    void createExpense_shouldReturn201Created() throws Exception {

        //Arrange
        CreateExpenseRequest request = new CreateExpenseRequest();
        request.setAmount(new BigDecimal("500.00"));
        request.setCategory(ExpenseCategory.FOOD);
        request.setDescription("Dinner");
        request.setExpenseDate(LocalDate.of(2029, 9, 12));

        ExpenseResponse response = new ExpenseResponse();
        response.setId(1L);
        response.setAmount(new BigDecimal("500.00"));
        response.setCategory(ExpenseCategory.FOOD);
        response.setDescription("Dinner");
        response.setExpenseDate(LocalDate.of(2029, 9, 12));
        response.setCreatedAt(LocalDateTime.now());
        response.setUpdatedAt(LocalDateTime.now());

        when(expenseService.createExpense(any(CreateExpenseRequest.class)))
                .thenReturn(response);

        //Act & Assert
        mockMvc.perform(
                post("/api/v1/expenses/create")
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(request))
                )
                .andExpect(status().isCreated())
                .andExpect(content().contentTypeCompatibleWith("application/json"))
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.amount").value(500.00))
                .andExpect(jsonPath("$.category").value("FOOD"))
                .andExpect(jsonPath("$.description").value("Dinner"))
                .andExpect(jsonPath("$.expenseDate").value("2029-09-12"));
    }

    @Test
    void createExpense_shouldReturn400BadRequest_whenAmountIsInvalid() throws Exception {

        //Arrange
        CreateExpenseRequest request = new CreateExpenseRequest();
        request.setAmount(new BigDecimal("-500.00"));
        request.setCategory(ExpenseCategory.FOOD);
        request.setDescription("Dinner");
        request.setExpenseDate(LocalDate.of(2029, 9, 12));

        //Act & Assert
        mockMvc.perform(
                post("/api/v1/expenses/create")
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(request))
                )
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value("Validation Failed"))
                .andExpect(jsonPath("$.errors.amount").value("Amount must be greater than zero"));
    }

    @Test
    void getExpenseById_shouldReturn200Ok_whenExpenseExists() throws Exception {

        //Arrange
        Long expenseId = 1L;

        ExpenseResponse response = new ExpenseResponse();
        response.setId(expenseId);
        response.setAmount(new BigDecimal("500.00"));
        response.setCategory(ExpenseCategory.FOOD);
        response.setDescription("Dinner");
        response.setExpenseDate(LocalDate.of(2026, 9, 12));
        response.setCreatedAt(LocalDateTime.of(2026, 9, 12, 20, 0));
        response.setUpdatedAt(LocalDateTime.of(2026, 9, 12, 20, 0));

        when(expenseService.getExpenseById(expenseId))
                .thenReturn(response);

        //Act & Assert
        mockMvc.perform(
                    get("/api/v1/expenses/{id}", expenseId)
                )
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith("application/json"))
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.amount").value(500.00))
                .andExpect(jsonPath("$.category").value("FOOD"))
                .andExpect(jsonPath("$.description").value("Dinner"))
                .andExpect(jsonPath("$.expenseDate").value("2026-09-12"))
                .andExpect(jsonPath("$.createdAt").value("2026-09-12T20:00:00"))
                .andExpect(jsonPath("$.updatedAt").value("2026-09-12T20:00:00"));

        verify(expenseService).getExpenseById(expenseId);
    }

    @Test
    void getExpenseById_shouldReturn404NotFound_whenExpenseDoesNotExist() throws Exception {

        //Arrange
        Long expenseId = 999L;

        when(expenseService.getExpenseById(expenseId))
                .thenThrow(new ExpenseNotFoundException("Expense not found with id: 999"));

        //Act & Assert
        mockMvc.perform(
                    get("/api/v1/expenses/{id}", expenseId)
                )
                .andExpect(status().isNotFound())
                .andExpect(content().contentTypeCompatibleWith("application/json"))
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(
                        jsonPath("$.message").value("Expense not found with id: 999")
                );

        verify(expenseService).getExpenseById(expenseId);
    }

    @Test
    void getAllExpenses_shouldReturn200OkWithPaginatedExpenses() throws Exception {

        //Arrange
        ExpenseResponse expense1 = new ExpenseResponse();
        expense1.setId(1L);
        expense1.setAmount(new BigDecimal("500.00"));
        expense1.setCategory(ExpenseCategory.FOOD);
        expense1.setDescription("Dinner");
        expense1.setExpenseDate(LocalDate.of(2026, 9, 12));

        ExpenseResponse expense2 = new ExpenseResponse();
        expense2.setId(2L);
        expense2.setAmount(new BigDecimal("1000.00"));
        expense2.setCategory(ExpenseCategory.TRAVEL);
        expense2.setDescription("Cab");
        expense2.setExpenseDate(LocalDate.of(2026, 9, 13));

        Page<ExpenseResponse> page = new PageImpl<>(
                List.of(expense1, expense2),
                PageRequest.of(0, 20),
                2
        );

        when(expenseService.getAllExpenses(
                isNull(),
                any(Pageable.class)
        )).thenReturn(page);

        //Act & Assert
        mockMvc.perform(
                    get("/api/v1/expenses")
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(2))
                .andExpect(jsonPath("$.content[0].id").value(1))
                .andExpect(jsonPath("$.content[0].amount").value(500.00))
                .andExpect(jsonPath("$.content[0].category").value("FOOD"))
                .andExpect(jsonPath("$.content[0].description").value("Dinner"))
                .andExpect(jsonPath("$.content[1].id").value(2))
                .andExpect(jsonPath("$.content[1].category").value("TRAVEL"))
                .andExpect(jsonPath("$.totalElements").value(2));
    }

    @Test
    void getAllExpenses_shouldReturnFilteredExpenses_whenCategoryIsProvided() throws Exception {

        //Arrange
        ExpenseResponse expense = new ExpenseResponse();
        expense.setId(1L);
        expense.setAmount(new BigDecimal("500.00"));
        expense.setCategory(ExpenseCategory.FOOD);
        expense.setDescription("Dinner");
        expense.setExpenseDate(LocalDate.of(2026, 9, 12));

        Page<ExpenseResponse> page = new PageImpl<>(
                List.of(expense),
                PageRequest.of(0, 20),
                1
        );

        when(expenseService.getAllExpenses(
                eq(ExpenseCategory.FOOD),
                any(Pageable.class)
        )).thenReturn(page);

        //Act & Assert
        mockMvc.perform(
                        get("/api/v1/expenses").param("category", "FOOD")
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].id").value(1))
                .andExpect(jsonPath("$.content[0].category").value("FOOD"))
                .andExpect(jsonPath("$.totalElements").value(1));

        verify(expenseService).getAllExpenses(eq(ExpenseCategory.FOOD), any(Pageable.class));
    }

    @Test
    void getAllExpenses_shouldAcceptPaginationAndSorting() throws Exception {

        //Arrange
        ExpenseResponse expense = new ExpenseResponse();
        expense.setId(3L);
        expense.setAmount(new BigDecimal("2000.00"));
        expense.setCategory(ExpenseCategory.SHOPPING);
        expense.setDescription("Shopping");
        expense.setExpenseDate(LocalDate.of(2026, 9, 12));

        Page<ExpenseResponse> page = new PageImpl<>(
                List.of(expense),
                PageRequest.of(1, 2, Sort.by(Sort.Direction.DESC, "amount")),3
        );

        when(expenseService.getAllExpenses(isNull(), any(Pageable.class)))
                .thenReturn(page);

        //Act & Assert
        mockMvc.perform(
                get("/api/v1/expenses")
                        .param("page", "1")
                        .param("size", "2")
                        .param("sort", "amount,desc")
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].amount").value(2000.00))
                .andExpect(jsonPath("$.totalElements").value(3));

        verify(expenseService).getAllExpenses(isNull(),
                argThat(pageable ->
                        pageable.getPageNumber() == 1
                                && pageable.getPageSize() == 2
                                && pageable.getSort().getOrderFor("amount") != null
                                && pageable.getSort()
                                .getOrderFor("amount")
                                .getDirection() == Sort.Direction.DESC));
    }

    @Test
    void getAllExpenses_shouldReturn20OkWithEmptyPage_whenNoExpensesExist() throws Exception {

        //Arrange
        Page<ExpenseResponse> emptyPage = new PageImpl<>(
                List.of(),
                PageRequest.of(0, 20),
                0
        );

        when(expenseService.getAllExpenses(isNull(), any(Pageable.class)))
                .thenReturn(emptyPage);

        //Act & Assert
        mockMvc.perform(
                    get("/api/v1/expenses")
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isEmpty())
                .andExpect(jsonPath("$.totalElements").value(0));

        verify(expenseService).getAllExpenses(isNull(), any(Pageable.class));
    }

    @Test
    void getAllExpenses_shouldReturn400BadRequest_whenCategoryIsInvalid() throws Exception {

        //Act & Assert
        mockMvc.perform(
                    get("/api/v1/expenses").param("category", "INVALID")
                )
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value("Invalid request parameter"))
                .andExpect(jsonPath("$.errors.category").value("Invalid value: INVALID"));

        verify(expenseService, never()).getAllExpenses(any(), any(Pageable.class));
    }

    @Test
    void updateExpense_shouldReturn200Ok_whenExpenseExists() throws Exception{

        //Arrange
        Long expenseId = 1L;

        UpdateExpenseResponse request = new UpdateExpenseResponse();
        request.setAmount(new BigDecimal("800.00"));
        request.setCategory(ExpenseCategory.SHOPPING);
        request.setDescription("Shopping");
        request.setExpenseDate(LocalDate.of(2026, 9, 12));

        ExpenseResponse response = new ExpenseResponse();
        response.setId(expenseId);
        response.setAmount(new BigDecimal("800.00"));
        response.setCategory(ExpenseCategory.SHOPPING);
        response.setDescription("Shopping");
        response.setExpenseDate(LocalDate.of(2026, 9, 12));
        response.setCreatedAt(LocalDateTime.of(2026, 9, 11, 20, 0));
        response.setUpdatedAt(LocalDateTime.of(2026, 9, 12, 10, 0));

        when(expenseService.updateExpense(
                eq(expenseId),
                any(UpdateExpenseResponse.class)
        )).thenReturn(response);

        //Act & Assert
        mockMvc.perform(
                    put("/api/v1/expenses/{id}", expenseId)
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(request))
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.amount").value(800.00))
                .andExpect(jsonPath("$.category").value("SHOPPING"))
                .andExpect(jsonPath("$.description").value("Shopping"))
                .andExpect(jsonPath("$.expenseDate").value("2026-09-12"))
                .andExpect(jsonPath("$.updatedAt").value("2026-09-12T10:00:00"));

        verify(expenseService).updateExpense(eq(expenseId), any(UpdateExpenseResponse.class));
    }

    @Test
    void updateExpense_shouldReturn404NotFound_whenExpenseDoesNotExist() throws Exception {

        //Arrange
        Long expenseId = 999L;

        UpdateExpenseResponse request = new UpdateExpenseResponse();
        request.setAmount(new BigDecimal("800.00"));
        request.setCategory(ExpenseCategory.SHOPPING);
        request.setDescription("Shopping");
        request.setExpenseDate(LocalDate.of(2026, 9, 12));

        when(expenseService.updateExpense(
                eq(expenseId), any(UpdateExpenseResponse.class)
        )).thenThrow(new ExpenseNotFoundException("Expense not found with id: 999"));

        // Act & Assert
        mockMvc.perform(
                        put("/api/v1/expenses/{id}", expenseId)
                                .contentType("application/json")
                                .content(objectMapper.writeValueAsString(request))
                )
                .andExpect(status().isNotFound())
                .andExpect(jsonPath(".status").value(404))
                .andExpect(jsonPath("$.message").value("Expense not found with id: 999"));

        verify(expenseService).updateExpense(eq(expenseId), any(UpdateExpenseResponse.class));
    }

    @Test
    void updateExpense_shouldReturn400BadRequest_whenRequestIsInvalid() throws Exception {

        //Arrange
        Long expenseId = 1L;

        UpdateExpenseResponse request = new UpdateExpenseResponse();
        request.setAmount(new BigDecimal("-800.00"));
        request.setCategory(ExpenseCategory.SHOPPING);
        request.setDescription("Shopping");
        request.setExpenseDate(LocalDate.of(2026, 9, 12));

        //Act & Assert
        mockMvc.perform(
                        put("/api/v1/expenses/{id}", expenseId)
                                .contentType("application/json")
                                .content(objectMapper.writeValueAsString(request))
                )
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value("Validation Failed"))
                .andExpect(jsonPath("$.errors.amount").value("Amount must be greater than zero"));

        verify(expenseService, never()).updateExpense(any(), any(UpdateExpenseResponse.class));
    }

    @Test
    void updateExpense_shouldReturn400BadRequest_whenIdIsInvalid() throws Exception {

        //Arrange
        UpdateExpenseResponse request = new UpdateExpenseResponse();
        request.setAmount(new BigDecimal("800.00"));
        request.setCategory(ExpenseCategory.SHOPPING);
        request.setDescription("Shopping");
        request.setExpenseDate(LocalDate.of(2026, 9, 12));

        //Act & Assert
        mockMvc.perform(
                        put("/api/v1/expenses/{id}", 0)
                                .contentType("application/json")
                                .content(objectMapper.writeValueAsString(request))
                )
                .andExpect(status().isBadRequest());

        verify(expenseService, never()).updateExpense(any(), any(UpdateExpenseResponse.class));
    }

    @Test
    void deleteExpense_shouldReturn204NoContent_whenExpenseExists() throws Exception {

        //Arrange
        Long expenseId = 1L;

        doNothing().when(expenseService).deleteExpense(expenseId);

        //Act & Assert
        mockMvc.perform(
                        delete("/api/v1/expenses/{id}", expenseId)
                )
                .andExpect(status().isNoContent())
                .andExpect(content().string(""));

        verify(expenseService).deleteExpense(expenseId);
    }

    @Test
    void deleteExpense_shouldReturn404NotFound_whenExpenseDoesNotExist() throws Exception {

        //Arrange
        Long expenseId = 999L;

        doThrow(new ExpenseNotFoundException("Expense not found with id: 999"))
        .when(expenseService).deleteExpense(expenseId);

        //Act & Assert
        mockMvc.perform(
                        delete("/api/v1/expenses/{id}", expenseId)
                )
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.message").value("Expense not found with id: 999"));

        verify(expenseService).deleteExpense(expenseId);
    }

    @Test
    void deleteExpense_shouldReturn400BadRequest_whenIdIsInvalid() throws Exception {

        //Act & Assert
        mockMvc.perform(
                        delete("/api/v1/expenses/{id}", 0)
                )
                .andExpect(status().isBadRequest());

        verify(expenseService, never()).deleteExpense(anyLong());
    }
}
