package com.deepak.cointrailapi.recurringtransaction;

import com.deepak.cointrailapi.common.exception.*;
import com.deepak.cointrailapi.common.security.JwtAuthenticationFilter;
import com.deepak.cointrailapi.common.validation.PageableValidator;
import com.deepak.cointrailapi.common.config.PaginationConfig;
import com.deepak.cointrailapi.recurringtransaction.dto.*;
import com.deepak.cointrailapi.transaction.TransactionType;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.*;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.*;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.time.*;
import java.util.List;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(RecurringTransactionController.class)
@AutoConfigureMockMvc(addFilters=false)
@Import({PageableValidator.class, PaginationConfig.class})
class RecurringTransactionControllerTest {
    @Autowired MockMvc mvc; @Autowired ObjectMapper mapper;
    @MockitoBean RecurringTransactionService service;
    @MockitoBean JwtAuthenticationFilter filter;
    private RecurringTransactionDetails details() {
        return new RecurringTransactionDetails(4L,2L,"Bank",3L,"Rent",TransactionType.EXPENSE,new BigDecimal("10.00"),"Rent",
            RecurrenceFrequency.MONTHLY,LocalDate.of(2024,1,31),null,LocalDate.of(2024,2,29),RecurringTransactionStatus.ACTIVE,
            null,LocalDateTime.of(2024,1,1,0,0),LocalDateTime.of(2024,1,1,0,0));
    }
    private final String createJson="""
        {"accountId":2,"categoryId":3,"type":"EXPENSE","amount":10,"description":"Rent",
         "frequency":"MONTHLY","startDate":"2024-01-31"}
        """;
    @Test void shouldExposeCrudLifecycleAndFlatDto() throws Exception {
        when(service.createRecurringTransaction(any())).thenReturn(details());
        when(service.getRecurringTransaction(4L)).thenReturn(details());
        when(service.updateRecurringTransaction(eq(4L),any())).thenReturn(details());
        when(service.pauseRecurringTransaction(4L)).thenReturn(details());when(service.resumeRecurringTransaction(4L)).thenReturn(details());
        mvc.perform(post("/api/recurring-transactions").contentType("application/json").content(createJson))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.accountName").value("Bank"))
            .andExpect(jsonPath("$.frequency").value("MONTHLY")).andExpect(jsonPath("$.userId").doesNotExist())
            .andExpect(jsonPath("$.account").doesNotExist());
        mvc.perform(get("/api/recurring-transactions/4")).andExpect(status().isOk());
        mvc.perform(put("/api/recurring-transactions/4").contentType("application/json")
            .content("{\"accountId\":2,\"categoryId\":3,\"amount\":10,\"description\":\"Rent\",\"frequency\":\"DAILY\",\"userId\":9}"))
            .andExpect(status().isOk());
        verify(service).updateRecurringTransaction(4L,new UpdateRecurringTransactionRequest(2L,3L,new BigDecimal("10"),"Rent"));
        mvc.perform(post("/api/recurring-transactions/4/pause")).andExpect(status().isOk());
        mvc.perform(post("/api/recurring-transactions/4/resume")).andExpect(status().isOk());
        mvc.perform(delete("/api/recurring-transactions/4")).andExpect(status().isNoContent()).andExpect(content().string(""));
    }
    @ParameterizedTest @ValueSource(strings={"{}","{\"amount\":0}","{", "{\"frequency\":\"HOURLY\"}","{\"startDate\":\"not-date\"}"})
    void shouldRejectBindingValidationBeforeService(String json) throws Exception {
        mvc.perform(post("/api/recurring-transactions").contentType("application/json").content(json)).andExpect(status().isBadRequest());
        verifyNoInteractions(service);
    }
    @Test void shouldRejectPrecisionAndIds() throws Exception {
        for (String bad : List.of(createJson.replace("\"amount\":10","\"amount\":1.001"),
            createJson.replace("\"accountId\":2","\"accountId\":0"),createJson.replace("\"amount\":10","\"amount\":100000000000000000"))) {
            mvc.perform(post("/api/recurring-transactions").contentType("application/json").content(bad)).andExpect(status().isBadRequest());
        } verifyNoInteractions(service);
    }
    @Test void shouldPaginateFilterAndAppendDeterministicIdSort() throws Exception {
        when(service.getRecurringTransactions(any(),any(),any(),any(),any())).thenReturn(new PageImpl<>(List.of(details())));
        mvc.perform(get("/api/recurring-transactions").param("status","BLOCKED").param("type","EXPENSE")
            .param("accountId","2").param("categoryId","3").param("size","999"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.content[0].id").value(4));
        ArgumentCaptor<Pageable> p=ArgumentCaptor.forClass(Pageable.class);
        verify(service).getRecurringTransactions(eq(RecurringTransactionStatus.BLOCKED),eq(TransactionType.EXPENSE),eq(2L),eq(3L),p.capture());
        org.assertj.core.api.Assertions.assertThat(p.getValue().getPageSize()).isEqualTo(100);
        org.assertj.core.api.Assertions.assertThat(p.getValue().getSort().getOrderFor("id").getDirection()).isEqualTo(Sort.Direction.DESC);
    }
    @Test void shouldRejectInvalidSortAndEnumAndMapDomainErrors() throws Exception {
        mvc.perform(get("/api/recurring-transactions").param("sort","userId,asc")).andExpect(status().isBadRequest());
        mvc.perform(get("/api/recurring-transactions").param("status","BAD")).andExpect(status().isBadRequest());
        verifyNoInteractions(service);
        when(service.getRecurringTransaction(4L)).thenThrow(new RecurringTransactionNotFoundException("Recurring transaction not found"));
        mvc.perform(get("/api/recurring-transactions/4")).andExpect(status().isNotFound()).andExpect(jsonPath("$.status").value(404));
        when(service.resumeRecurringTransaction(4L)).thenThrow(new RecurringTransactionConflictException("Blocked templates recover automatically"));
        mvc.perform(post("/api/recurring-transactions/4/resume")).andExpect(status().isConflict()).andExpect(jsonPath("$.status").value(409));
        when(service.createRecurringTransaction(any())).thenThrow(new InvalidRecurringTransactionException("Start date must be today or future"));
        mvc.perform(post("/api/recurring-transactions").contentType("application/json").content(createJson)).andExpect(status().isBadRequest());
    }
}
