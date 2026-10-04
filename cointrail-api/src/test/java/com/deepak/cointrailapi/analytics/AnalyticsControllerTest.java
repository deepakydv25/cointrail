package com.deepak.cointrailapi.analytics;

import com.deepak.cointrailapi.common.security.JwtAuthenticationFilter;
import com.deepak.cointrailapi.common.exception.InvalidAnalyticsException;
import com.deepak.cointrailapi.analytics.AnalyticsDetails.*;
import com.deepak.cointrailapi.account.AccountType;
import com.deepak.cointrailapi.category.CategoryType;
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

@WebMvcTest(AnalyticsController.class)
@AutoConfigureMockMvc(addFilters=false)
class AnalyticsControllerTest {
    @Autowired MockMvc mvc;
    @MockitoBean AnalyticsService service;
    @MockitoBean JwtAuthenticationFilter jwt;
    final LocalDate date = LocalDate.of(2024,2,29);
    final AnalyticsRange range = AnalyticsRange.fiveYears(date,date);
    final Totals totals = Totals.of(new BigDecimal("1.23"),new BigDecimal("3.45"),3_000_000_000L);
    final String query = "?from=2024-02-29&to=2024-02-29";

    @Test void summaryEnvelopeHasNumericMoneyAndLongCount() throws Exception {
        when(service.summary(date,date)).thenReturn(new Summary(range,totals));
        mvc.perform(get("/api/analytics/summary"+query)).andExpect(status().isOk())
            .andExpect(jsonPath("$.range.from").value("2024-02-29")).andExpect(jsonPath("$.range.dayCount").value(1))
            .andExpect(jsonPath("$.totals.income").value(1.23)).andExpect(jsonPath("$.totals.netCashFlow").value(-2.22))
            .andExpect(jsonPath("$.totals.transactionCount").value(3_000_000_000L)).andExpect(jsonPath("$.userId").doesNotExist());
    }
    @Test void categoryAndAccountEnvelopesExposeOnlyApprovedCurrentMetadata() throws Exception {
        when(service.categories(date,date)).thenReturn(new Categories(range,totals,List.of(new CategoryGroup(1L,"Food",CategoryType.EXPENSE,true,false,totals))));
        when(service.accounts(date,date)).thenReturn(new Accounts(range,totals,List.of(new AccountGroup(2L,"Cash",AccountType.CASH,false,totals))));
        mvc.perform(get("/api/analytics/categories"+query)).andExpect(status().isOk())
            .andExpect(jsonPath("$.items[0].categoryId").value(1)).andExpect(jsonPath("$.items[0].categoryName").value("Food"))
            .andExpect(jsonPath("$.items[0].categoryType").value("EXPENSE")).andExpect(jsonPath("$.items[0].system").value(true))
            .andExpect(jsonPath("$.items[0].active").value(false)).andExpect(jsonPath("$.items[0].totals.transactionCount").value(3_000_000_000L));
        mvc.perform(get("/api/analytics/accounts"+query)).andExpect(status().isOk())
            .andExpect(jsonPath("$.items[0].accountId").value(2)).andExpect(jsonPath("$.items[0].accountName").value("Cash"))
            .andExpect(jsonPath("$.items[0].accountType").value("CASH")).andExpect(jsonPath("$.items[0].active").value(false))
            .andExpect(jsonPath("$.items[0].balance").doesNotExist());
    }
    @Test void trendAndComparisonEnvelopesAreExplicit() throws Exception {
        when(service.trends(date,date,AnalyticsGrouping.WEEKLY)).thenReturn(new Trends(range,AnalyticsGrouping.WEEKLY,Totals.zero(),List.of(new Bucket(date,date,Totals.zero()))));
        when(service.comparison(date,date,date,date)).thenReturn(new Comparison(new Summary(range,totals),new Summary(range,totals),Totals.zero()));
        mvc.perform(get("/api/analytics/trends"+query+"&grouping=WEEKLY")).andExpect(status().isOk())
            .andExpect(jsonPath("$.grouping").value("WEEKLY")).andExpect(jsonPath("$.items[0].from").value("2024-02-29"))
            .andExpect(jsonPath("$.items[0].to").value("2024-02-29")).andExpect(jsonPath("$.items[0].totals.transactionCount").value(0));
        mvc.perform(get("/api/analytics/comparison"+query+"&compareFrom=2024-02-29&compareTo=2024-02-29")).andExpect(status().isOk())
            .andExpect(jsonPath("$.current.range.dayCount").value(1)).andExpect(jsonPath("$.baseline.totals.expense").value(3.45))
            .andExpect(jsonPath("$.delta.transactionCount").value(0));
    }
    @Test void emptyBreakdownsRemain200WithEmptyItems() throws Exception {
        when(service.categories(date,date)).thenReturn(new Categories(range,Totals.zero(),List.of()));
        when(service.accounts(date,date)).thenReturn(new Accounts(range,Totals.zero(),List.of()));
        for (String endpoint : List.of("categories","accounts")) mvc.perform(get("/api/analytics/"+endpoint+query)).andExpect(status().isOk())
            .andExpect(jsonPath("$.items").isEmpty()).andExpect(jsonPath("$.totals.income").value(0));
    }
    @ParameterizedTest @ValueSource(strings={"summary", "categories", "accounts", "trends", "comparison"})
    void requiredAndMalformedDateBindingsRejectBeforeService(String endpoint) throws Exception {
        for (String invalid : List.of("", "?from=2024-02-29", "?to=2024-02-29", "?from=bad&to=2024-02-29", "?from=2024-02-30&to=2024-02-29")) {
            mvc.perform(get("/api/analytics/"+endpoint+invalid)).andExpect(status().isBadRequest()).andExpect(jsonPath("$.status").value(400));
        }
        verifyNoInteractions(service);
    }
    @ParameterizedTest @ValueSource(strings={"", "&grouping=YEARLY", "&grouping=weekly", "&grouping=garbage"})
    void trendsRequireSupportedGrouping(String suffix) throws Exception {
        mvc.perform(get("/api/analytics/trends"+query+suffix)).andExpect(status().isBadRequest()); verifyNoInteractions(service);
    }
    @ParameterizedTest @ValueSource(strings={"", "&compareFrom=2024-02-29", "&compareTo=2024-02-29", "&compareFrom=bad&compareTo=2024-02-29"})
    void comparisonRequiresBothExplicitBaselineDates(String suffix) throws Exception {
        mvc.perform(get("/api/analytics/comparison"+query+suffix)).andExpect(status().isBadRequest()); verifyNoInteractions(service);
    }
    @Test void domainRangeErrorsUseExistingErrorEnvelope() throws Exception {
        when(service.summary(date,date)).thenThrow(new InvalidAnalyticsException("Range must be less than five calendar years"));
        mvc.perform(get("/api/analytics/summary"+query)).andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value("Range must be less than five calendar years")).andExpect(jsonPath("$.status").value(400));
    }
}
