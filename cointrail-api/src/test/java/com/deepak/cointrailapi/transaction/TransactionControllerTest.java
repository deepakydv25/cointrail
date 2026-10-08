package com.deepak.cointrailapi.transaction;

import com.deepak.cointrailapi.common.exception.InvalidTransactionException;
import com.deepak.cointrailapi.common.exception.TransactionNotFoundException;
import com.deepak.cointrailapi.common.security.JwtAuthenticationFilter;
import com.deepak.cointrailapi.common.validation.PageableValidator;
import com.deepak.cointrailapi.common.config.PaginationConfig;
import com.deepak.cointrailapi.transaction.dto.CreateTransactionRequest;
import com.deepak.cointrailapi.transaction.dto.TransactionResponse;
import com.deepak.cointrailapi.transaction.dto.UpdateTransactionRequest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
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

@Import({PageableValidator.class, PaginationConfig.class})
@WebMvcTest(TransactionController.class)
@AutoConfigureMockMvc(addFilters = false)
public class TransactionControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private TransactionService transactionService;

    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @Test
    void createTransaction_shouldReturn201Created() throws Exception {

        CreateTransactionRequest request = createRequest();

        TransactionResponse response = createResponse();

        when(transactionService.createTransaction(
                any(CreateTransactionRequest.class)))
                .thenReturn(response);

        mockMvc.perform(
                        post("/api/transactions")
                                .contentType("application/json")
                                .content(objectMapper.writeValueAsString(request))
                )
                .andExpect(status().isCreated())
                .andExpect(content().contentTypeCompatibleWith("application/json"))
                .andExpect(jsonPath("$.id").value(100))
                .andExpect(jsonPath("$.type").value("EXPENSE"))
                .andExpect(jsonPath("$.amount").value(500.00))
                .andExpect(jsonPath("$.description").value("Dinner"))
                .andExpect(jsonPath("$.transactionDate").value("2026-10-03"))
                .andExpect(jsonPath("$.accountId").value(10))
                .andExpect(jsonPath("$.accountName").value("HDFC Savings"))
                .andExpect(jsonPath("$.categoryId").value(20))
                .andExpect(jsonPath("$.categoryName").value("Food"));

        verify(transactionService)
                .createTransaction(any(CreateTransactionRequest.class));
    }

    @Test
    void createTransaction_shouldReturn400BadRequest_whenAmountIsInvalid() throws Exception {

        CreateTransactionRequest request = createRequest();
        request.setAmount(new BigDecimal("-500.00"));

        mockMvc.perform(
                        post("/api/transactions")
                                .contentType("application/json")
                                .content(objectMapper.writeValueAsString(request))
                )
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value("Validation Failed"));

        verify(transactionService, never())
                .createTransaction(any(CreateTransactionRequest.class));
    }

    @Test
    void createTransaction_shouldReturn400BadRequest_whenBusinessRuleIsInvalid()
            throws Exception {

        CreateTransactionRequest request = createRequest();

        when(transactionService.createTransaction(
                any(CreateTransactionRequest.class)))
                .thenThrow(new InvalidTransactionException(
                        "Category type does not match transaction type"
                ));

        mockMvc.perform(
                        post("/api/transactions")
                                .contentType("application/json")
                                .content(objectMapper.writeValueAsString(request))
                )
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message")
                        .value("Category type does not match transaction type"));
    }

    @Test
    void getTransaction_shouldReturn200Ok_whenTransactionExists()
            throws Exception {

        TransactionResponse response = createResponse();

        when(transactionService.getTransaction(100L))
                .thenReturn(response);

        mockMvc.perform(
                        get("/api/transactions/{id}", 100L)
                )
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith("application/json"))
                .andExpect(jsonPath("$.id").value(100))
                .andExpect(jsonPath("$.type").value("EXPENSE"))
                .andExpect(jsonPath("$.amount").value(500.00))
                .andExpect(jsonPath("$.accountId").value(10))
                .andExpect(jsonPath("$.categoryId").value(20));

        verify(transactionService).getTransaction(100L);
    }

    @Test
    void getTransaction_shouldReturn404NotFound_whenTransactionDoesNotExist()
            throws Exception {

        when(transactionService.getTransaction(999L))
                .thenThrow(new TransactionNotFoundException(
                        "Transaction not found"
                ));

        mockMvc.perform(
                        get("/api/transactions/{id}", 999L)
                )
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.message")
                        .value("Transaction not found"));

        verify(transactionService).getTransaction(999L);
    }

    @Test
    void updateTransaction_shouldReturn200Ok_whenTransactionExists()
            throws Exception {

        UpdateTransactionRequest request = createUpdateRequest();

        TransactionResponse response = createResponse();
        response.setAmount(new BigDecimal("800.00"));
        response.setDescription("Updated dinner");

        when(transactionService.updateTransaction(
                eq(100L),
                any(UpdateTransactionRequest.class)))
                .thenReturn(response);

        mockMvc.perform(
                        put("/api/transactions/{id}", 100L)
                                .contentType("application/json")
                                .content(objectMapper.writeValueAsString(request))
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(100))
                .andExpect(jsonPath("$.amount").value(800.00))
                .andExpect(jsonPath("$.description")
                        .value("Updated dinner"));

        verify(transactionService)
                .updateTransaction(
                        eq(100L),
                        any(UpdateTransactionRequest.class));
    }

    @Test
    void updateTransaction_shouldReturn400BadRequest_whenRequestIsInvalid()
            throws Exception {

        UpdateTransactionRequest request = createUpdateRequest();
        request.setAmount(BigDecimal.ZERO);

        mockMvc.perform(
                        put("/api/transactions/{id}", 100L)
                                .contentType("application/json")
                                .content(objectMapper.writeValueAsString(request))
                )
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value("Validation Failed"));

        verify(transactionService, never())
                .updateTransaction(anyLong(), any(UpdateTransactionRequest.class));
    }

    @Test
    void updateTransaction_shouldReturn404NotFound_whenTransactionDoesNotExist()
            throws Exception {

        UpdateTransactionRequest request = createUpdateRequest();

        when(transactionService.updateTransaction(
                eq(999L),
                any(UpdateTransactionRequest.class)))
                .thenThrow(new TransactionNotFoundException(
                        "Transaction not found"
                ));

        mockMvc.perform(
                        put("/api/transactions/{id}", 999L)
                                .contentType("application/json")
                                .content(objectMapper.writeValueAsString(request))
                )
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.message")
                        .value("Transaction not found"));
    }

    @Test
    void deleteTransaction_shouldReturn204NoContent_whenTransactionExists()
            throws Exception {

        doNothing()
                .when(transactionService)
                .deleteTransaction(100L);

        mockMvc.perform(
                        delete("/api/transactions/{id}", 100L)
                )
                .andExpect(status().isNoContent())
                .andExpect(content().string(""));

        verify(transactionService).deleteTransaction(100L);
    }

    @Test
    void deleteTransaction_shouldReturn404NotFound_whenTransactionDoesNotExist()
            throws Exception {

        doThrow(new TransactionNotFoundException(
                "Transaction not found"
        ))
                .when(transactionService)
                .deleteTransaction(999L);

        mockMvc.perform(
                        delete("/api/transactions/{id}", 999L)
                )
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.message")
                        .value("Transaction not found"));

        verify(transactionService).deleteTransaction(999L);
    }

    @Test
    void getTransactions_shouldReturn200OkWithPaginatedTransactions()
            throws Exception {

        TransactionResponse transaction1 = createResponse();

        TransactionResponse transaction2 = createResponse();
        transaction2.setId(101L);
        transaction2.setAmount(new BigDecimal("1000.00"));
        transaction2.setDescription("Shopping");

        Page<TransactionResponse> page = new PageImpl<>(
                List.of(transaction1, transaction2),
                PageRequest.of(
                        0,
                        20,
                        Sort.by(
                                Sort.Direction.DESC,
                                "transactionDate"
                        )
                ),
                2
        );

        when(transactionService.getTransactions(
                isNull(),
                isNull(),
                isNull(),
                isNull(),
                isNull(),
                any(Pageable.class)
        )).thenReturn(page);

        mockMvc.perform(
                        get("/api/transactions")
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(2))
                .andExpect(jsonPath("$.content[0].id").value(100))
                .andExpect(jsonPath("$.content[0].type").value("EXPENSE"))
                .andExpect(jsonPath("$.content[0].amount").value(500.00))
                .andExpect(jsonPath("$.content[1].id").value(101))
                .andExpect(jsonPath("$.totalElements").value(2));

        verify(transactionService).getTransactions(
                isNull(),
                isNull(),
                isNull(),
                isNull(),
                isNull(),
                any(Pageable.class)
        );
    }

    @Test
    void getTransactions_shouldFilterByType() throws Exception {

        TransactionResponse transaction = createResponse();

        Page<TransactionResponse> page =
                new PageImpl<>(List.of(transaction));

        when(transactionService.getTransactions(
                eq(TransactionType.EXPENSE),
                isNull(),
                isNull(),
                isNull(),
                isNull(),
                any(Pageable.class)
        )).thenReturn(page);

        mockMvc.perform(
                        get("/api/transactions")
                                .param("type", "EXPENSE")
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].type")
                        .value("EXPENSE"));

        verify(transactionService).getTransactions(
                eq(TransactionType.EXPENSE),
                isNull(),
                isNull(),
                isNull(),
                isNull(),
                any(Pageable.class)
        );
    }

    @Test
    void getTransactions_shouldFilterByAccountAndCategory()
            throws Exception {

        TransactionResponse transaction = createResponse();

        Page<TransactionResponse> page =
                new PageImpl<>(List.of(transaction));

        when(transactionService.getTransactions(
                isNull(),
                eq(10L),
                eq(20L),
                isNull(),
                isNull(),
                any(Pageable.class)
        )).thenReturn(page);

        mockMvc.perform(
                        get("/api/transactions")
                                .param("accountId", "10")
                                .param("categoryId", "20")
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].accountId")
                        .value(10))
                .andExpect(jsonPath("$.content[0].categoryId")
                        .value(20));

        verify(transactionService).getTransactions(
                isNull(),
                eq(10L),
                eq(20L),
                isNull(),
                isNull(),
                any(Pageable.class)
        );
    }

    @Test
    void getTransactions_shouldFilterByDateRange()
            throws Exception {

        LocalDate from = LocalDate.of(2026, 10, 1);
        LocalDate to = LocalDate.of(2026, 10, 31);

        Page<TransactionResponse> page =
                new PageImpl<>(List.of(createResponse()));

        when(transactionService.getTransactions(
                isNull(),
                isNull(),
                isNull(),
                eq(from),
                eq(to),
                any(Pageable.class)
        )).thenReturn(page);

        mockMvc.perform(
                        get("/api/transactions")
                                .param("from", "2026-10-01")
                                .param("to", "2026-10-31")
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()")
                        .value(1));

        verify(transactionService).getTransactions(
                isNull(),
                isNull(),
                isNull(),
                eq(from),
                eq(to),
                any(Pageable.class)
        );
    }

    @Test
    void getTransactions_shouldAcceptPaginationAndSorting()
            throws Exception {

        Page<TransactionResponse> page = new PageImpl<>(
                List.of(createResponse()),
                PageRequest.of(
                        1,
                        5,
                        Sort.by(
                                Sort.Direction.ASC,
                                "amount"
                        )
                ),
                6
        );

        when(transactionService.getTransactions(
                isNull(),
                isNull(),
                isNull(),
                isNull(),
                isNull(),
                any(Pageable.class)
        )).thenReturn(page);

        mockMvc.perform(
                        get("/api/transactions")
                                .param("page", "1")
                                .param("size", "5")
                                .param("sort", "amount,asc")
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()")
                        .value(1))
                .andExpect(jsonPath("$.totalElements")
                        .value(6));

        verify(transactionService).getTransactions(
                isNull(),
                isNull(),
                isNull(),
                isNull(),
                isNull(),
                argThat(pageable ->
                        pageable.getPageNumber() == 1
                                && pageable.getPageSize() == 5
                                && pageable.getSort()
                                .getOrderFor("amount") != null
                                && pageable.getSort()
                                .getOrderFor("amount")
                                .getDirection()
                                == Sort.Direction.ASC
                )
        );
    }

    @Test
    void getTransactions_shouldReturn200OkWithEmptyPage()
            throws Exception {

        Page<TransactionResponse> emptyPage =
                new PageImpl<>(List.of());

        when(transactionService.getTransactions(
                isNull(),
                isNull(),
                isNull(),
                isNull(),
                isNull(),
                any(Pageable.class)
        )).thenReturn(emptyPage);

        mockMvc.perform(
                        get("/api/transactions")
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isEmpty())
                .andExpect(jsonPath("$.totalElements").value(0));
    }

    @Test
    void getTransactions_shouldReturn400BadRequest_whenTypeIsInvalid()
            throws Exception {

        mockMvc.perform(
                        get("/api/transactions")
                                .param("type", "INVALID")
                )
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message")
                        .value("Invalid request parameter"))
                .andExpect(jsonPath("$.errors.type")
                        .value("Invalid value: INVALID"));

        verify(transactionService, never())
                .getTransactions(
                        any(),
                        any(),
                        any(),
                        any(),
                        any(),
                        any(Pageable.class)
                );
    }

    @Test
    void getTransactions_shouldReturn400BadRequest_whenDateRangeIsInvalid()
            throws Exception {

        LocalDate from = LocalDate.of(2026, 10, 31);
        LocalDate to = LocalDate.of(2026, 10, 1);

        when(transactionService.getTransactions(
                isNull(),
                isNull(),
                isNull(),
                eq(from),
                eq(to),
                any(Pageable.class)
        )).thenThrow(
                new InvalidTransactionException(
                        "'from' date cannot be after 'to' date"
                )
        );

        mockMvc.perform(
                        get("/api/transactions")
                                .param("from", "2026-10-31")
                                .param("to", "2026-10-01")
                )
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message")
                        .value("'from' date cannot be after 'to' date"));
    }

    @Test
    void getTransactions_capsPageSizeAtProductionMaximum() throws Exception {
        when(transactionService.getTransactions(any(), any(), any(), any(), any(), any(Pageable.class)))
                .thenAnswer(invocation -> Page.empty(invocation.getArgument(5)));
        mockMvc.perform(get("/api/transactions").param("size", "101"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.size").value(100));
        verify(transactionService).getTransactions(isNull(), isNull(), isNull(), isNull(), isNull(),
                argThat(pageable -> pageable.getPageSize() == 100 && pageable.getPageNumber() == 0));
    }

    @Test
    void getTransactions_shouldReturn400BadRequest_whenSortFieldIsInvalid()
            throws Exception {

        mockMvc.perform(
                        get("/api/transactions")
                                .param("sort", "randomField,desc")
                )
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message")
                        .value("Invalid sort field: randomField"));

        verify(transactionService, never())
                .getTransactions(
                        any(),
                        any(),
                        any(),
                        any(),
                        any(),
                        any(Pageable.class)
                );
    }

    private CreateTransactionRequest createRequest() {

        CreateTransactionRequest request = new CreateTransactionRequest();

        request.setAccountId(10L);
        request.setCategoryId(20L);
        request.setType(TransactionType.EXPENSE);
        request.setAmount(new BigDecimal("500.00"));
        request.setDescription("Dinner");
        request.setTransactionDate(LocalDate.of(2026, 10, 3));

        return request;
    }

    private UpdateTransactionRequest createUpdateRequest() {

        UpdateTransactionRequest request = new UpdateTransactionRequest();

        request.setAccountId(10L);
        request.setCategoryId(20L);
        request.setType(TransactionType.EXPENSE);
        request.setAmount(new BigDecimal("800.00"));
        request.setDescription("Updated dinner");
        request.setTransactionDate(LocalDate.of(2026, 10, 3));

        return request;
    }

    private TransactionResponse createResponse() {

        TransactionResponse response = new TransactionResponse();

        response.setId(100L);
        response.setType(TransactionType.EXPENSE);
        response.setAmount(new BigDecimal("500.00"));
        response.setDescription("Dinner");
        response.setTransactionDate(LocalDate.of(2026, 10, 3));
        response.setAccountId(10L);
        response.setAccountName("HDFC Savings");
        response.setCategoryId(20L);
        response.setCategoryName("Food");
        response.setCreatedAt(LocalDateTime.of(2026, 10, 3, 20, 0));
        response.setUpdatedAt(LocalDateTime.of(2026, 10, 3, 20, 0));

        return response;
    }

    @ParameterizedTest
    @ValueSource(strings = {"0", "-1", "1.001", "100000000000000000.00"})
    void rejectsUnrepresentableAmountsOnCreateAndUpdate(String amount) throws Exception {
        String body = "{\"accountId\":10,\"categoryId\":20,\"type\":\"EXPENSE\",\"amount\":" + amount
                + ",\"transactionDate\":\"" + LocalDate.now() + "\"}";
        mockMvc.perform(post("/api/transactions").contentType("application/json").content(body))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors.amount").exists());
        mockMvc.perform(put("/api/transactions/100").contentType("application/json").content(body))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors.amount").exists());
        verifyNoInteractions(transactionService);
    }

    @ParameterizedTest
    @ValueSource(strings = {"0.01", "99999999999999999.99"})
    void acceptsRepresentableAmountsOnCreateAndUpdate(String amount) throws Exception {
        when(transactionService.createTransaction(any())).thenReturn(createResponse());
        when(transactionService.updateTransaction(eq(100L), any())).thenReturn(createResponse());
        String body = "{\"accountId\":10,\"categoryId\":20,\"type\":\"EXPENSE\",\"amount\":" + amount
                + ",\"transactionDate\":\"" + LocalDate.now() + "\"}";
        mockMvc.perform(post("/api/transactions").contentType("application/json").content(body)).andExpect(status().isCreated());
        mockMvc.perform(put("/api/transactions/100").contentType("application/json").content(body)).andExpect(status().isOk());
        verify(transactionService).createTransaction(argThat(r -> r.getAmount().compareTo(new BigDecimal(amount)) == 0));
        verify(transactionService).updateTransaction(eq(100L), argThat(r -> r.getAmount().compareTo(new BigDecimal(amount)) == 0));
    }
}
