package com.deepak.cointrailapi.dashboard;

import com.deepak.cointrailapi.common.security.JwtAuthenticationFilter;
import com.deepak.cointrailapi.common.exception.InvalidDashboardException;
import com.deepak.cointrailapi.dashboard.DashboardDetails.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.*;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(DashboardController.class)
@AutoConfigureMockMvc(addFilters=false)
class DashboardControllerTest {
    @Autowired MockMvc mvc;
    @MockitoBean DashboardService service;
    @MockitoBean JwtAuthenticationFilter jwt;
    @Test void returnsApprovedEmptyShape() throws Exception {
        BigDecimal zero=new BigDecimal("0.00");
        when(service.getDashboard(2024,2)).thenReturn(new DashboardDetails(2024,2,zero,new MonthlySummary(zero,zero,zero),new BudgetSummary(0,zero,zero,zero,0),List.of(),new PendingRecurringTransactions(LocalDate.of(2024,2,1),LocalDate.of(2024,3,2),"UTC",List.of())));
        mvc.perform(get("/api/dashboard?year=2024&month=2")).andExpect(status().isOk())
            .andExpect(jsonPath("$.year").value(2024)).andExpect(jsonPath("$.month").value(2))
            .andExpect(jsonPath("$.totalActiveAccountBalance").value(0))
            .andExpect(jsonPath("$.monthlySummary.netCashFlow").value(0))
            .andExpect(jsonPath("$.budgetSummary.spentOnBudgetedCategories").value(0))
            .andExpect(jsonPath("$.recentTransactions").isEmpty())
            .andExpect(jsonPath("$.pendingRecurringTransactions.items").isEmpty())
            .andExpect(jsonPath("$.pendingRecurringTransactions.timezone").value("UTC"))
            .andExpect(jsonPath("$.userId").doesNotExist());
    }
    @ParameterizedTest @ValueSource(strings={"", "?year=2024", "?month=2", "?year=x&month=2", "?year=0&month=2", "?year=10000&month=2", "?year=2024&month=0", "?year=2024&month=13"})
    void rejectsInvalidPeriodBeforeCallingService(String query) throws Exception {
        mvc.perform(get("/api/dashboard"+query)).andExpect(status().isBadRequest()).andExpect(jsonPath("$.status").value(400));
        verifyNoInteractions(service);
    }
    @Test void serviceValidationUsesDomainErrorResponse() throws Exception {
        when(service.getDashboard(2024,2)).thenThrow(new InvalidDashboardException("Invalid period"));
        mvc.perform(get("/api/dashboard?year=2024&month=2")).andExpect(status().isBadRequest()).andExpect(jsonPath("$.message").value("Invalid period"));
    }
}
