package com.deepak.cointrailapi.recurringtransaction;

import com.deepak.cointrailapi.account.*;
import com.deepak.cointrailapi.budget.BudgetRepository;
import com.deepak.cointrailapi.category.*;
import com.deepak.cointrailapi.transaction.*;
import com.deepak.cointrailapi.user.UserRepository;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.*;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.junit.jupiter.*;
import org.testcontainers.postgresql.PostgreSQLContainer;
import tools.jackson.databind.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties="app.recurring.occurrence-batch-size=2")
@AutoConfigureMockMvc
@Testcontainers
@ActiveProfiles("test")
class RecurringTransactionIntegrationTest {
    @Container @ServiceConnection static PostgreSQLContainer postgres=new PostgreSQLContainer("postgres:17-alpine");
    @Autowired MockMvc mvc; @Autowired ObjectMapper mapper;
    @Autowired RecurringTransactionRepository templates;
    @MockitoSpyBean RecurringTransactionOccurrenceRepository occurrences;
    @Autowired RecurringTransactionGenerationWorker worker;
    @Autowired TransactionRepository transactions; @Autowired AccountRepository accounts;
    @Autowired CategoryRepository categories; @Autowired UserRepository users; @Autowired BudgetRepository budgets;
    @Autowired JdbcTemplate jdbc; @Autowired PlatformTransactionManager transactionManager;
    @MockitoBean(name="recurringClock") Clock clock;
    private static final LocalDate START=LocalDate.of(2024,1,31);

    @BeforeEach void setup() { clean(); day(START); }
    @AfterEach void clean() {
        occurrences.deleteAll();templates.deleteAll();budgets.deleteAll();transactions.deleteAll();accounts.deleteAll();
        categories.findAll().stream().filter(c -> !c.isSystem()).forEach(categories::delete);users.deleteAll();
    }
    private void day(LocalDate date) {
        when(clock.getZone()).thenReturn(ZoneOffset.UTC);
        when(clock.instant()).thenReturn(date.atTime(12,0).toInstant(ZoneOffset.UTC));
    }
    private String token() throws Exception {
        String email=UUID.randomUUID()+"@test.com";
        request(post("/api/v1/auth/register"),null,Map.of("name","Recurring User","email",email,"password","password123"),201);
        return request(post("/api/v1/auth/login"),null,Map.of("email",email,"password","password123"),200).get("accessToken").asText();
    }
    private long account(String token) throws Exception {
        return request(post("/api/accounts"),token,Map.of("name",UUID.randomUUID().toString(),"type","BANK","openingBalance",0),201).get("id").asLong();
    }
    private long category(String name) {
        return categories.findAll().stream().filter(c -> c.isSystem() && c.getName().equals(name)).findFirst().orElseThrow().getId();
    }
    private Map<String,Object> body(long account,long category,String type,String frequency,LocalDate start,LocalDate end) {
        Map<String,Object> map=new HashMap<>(Map.of("accountId",account,"categoryId",category,"type",type,"frequency",frequency,
            "amount",new BigDecimal("10.00"),"description","Snapshot","startDate",start.toString()));
        if(end!=null) map.put("endDate",end.toString());return map;
    }
    private long create(String token,long a,long c,String frequency,LocalDate end) throws Exception {
        return request(post("/api/recurring-transactions"),token,body(a,c,"EXPENSE",frequency,START,end),201).get("id").asLong();
    }
    private Map<String,Object> edit(long a,long c,String amount,String description) {
        return Map.of("accountId",a,"categoryId",c,"amount",new BigDecimal(amount),"description",description);
    }
    private JsonNode getTemplate(String token,long id) throws Exception {
        return request(get("/api/recurring-transactions/{id}",id),token,null,200);
    }
    private JsonNode request(MockHttpServletRequestBuilder request,String token,Object body,int expected) throws Exception {
        if(token!=null) request.header("Authorization","Bearer "+token);
        if(body!=null) request.contentType("application/json").content(mapper.writeValueAsString(body));
        String result=mvc.perform(request).andExpect(status().is(expected)).andReturn().getResponse().getContentAsString();
        return result.isBlank()?null:mapper.reader().with(DeserializationFeature.USE_BIG_DECIMAL_FOR_FLOATS).readTree(result);
    }
    private List<LocalDate> dates() { return transactions.findAll().stream().map(Transaction::getTransactionDate).sorted().toList(); }

    @Test void shouldCatchUpChronologicallyInBatchesCompleteAndRetainSnapshots() throws Exception {
        String token=token();long a=account(token),c=category("Food");long id=create(token,a,c,"DAILY",START.plusDays(4));
        assertThat(transactions.count()).isZero();day(START.plusDays(8));
        assertThat(worker.process(id)).isEqualTo(2);assertThat(dates()).containsExactly(START,START.plusDays(1));
        assertThat(getTemplate(token,id).get("nextDueDate").asText()).isEqualTo(START.plusDays(2).toString());
        request(put("/api/recurring-transactions/{id}",id),token,edit(a,c,"11","Snapshot"),409);
        assertThat(worker.process(id)).isEqualTo(2);assertThat(worker.process(id)).isEqualTo(1);assertThat(worker.process(id)).isZero();
        assertThat(transactions.count()).isEqualTo(5);assertThat(occurrences.count()).isEqualTo(5);
        assertThat(getTemplate(token,id).get("status").asText()).isEqualTo("COMPLETED");
        request(put("/api/recurring-transactions/{id}",id),token,edit(a,c,"11","changed"),409);
        request(delete("/api/recurring-transactions/{id}",id),token,null,204);
        request(delete("/api/recurring-transactions/{id}",id),token,null,204);
        assertThat(transactions.findAll()).allSatisfy(t -> assertThat(t.getAmount()).isEqualByComparingTo("10"));
        assertThat(occurrences.count()).isEqualTo(5);
    }
    @Test void shouldSkipPausedDatesKeepAnchorAndPermitFutureEditsAfterProcessing() throws Exception {
        String token=token();long a=account(token),c=category("Rent");long id=create(token,a,c,"MONTHLY",null);
        assertThat(worker.process(id)).isEqualTo(1);
        request(post("/api/recurring-transactions/{id}/pause",id),token,null,200);
        day(LocalDate.of(2024,3,1));assertThat(worker.process(id)).isZero();
        request(put("/api/recurring-transactions/{id}",id),token,edit(a,c,"20","Future"),200);
        assertThat(request(post("/api/recurring-transactions/{id}/resume",id),token,null,200).get("nextDueDate").asText()).isEqualTo("2024-03-31");
        day(LocalDate.of(2024,3,31));assertThat(worker.process(id)).isEqualTo(1);
        assertThat(dates()).containsExactly(START,LocalDate.of(2024,3,31));
        assertThat(transactions.findAll().stream().filter(t -> t.getTransactionDate().equals(START)).findFirst().orElseThrow().getAmount()).isEqualByComparingTo("10");
        assertThat(getTemplate(token,id).get("startDate").asText()).isEqualTo("2024-01-31");
        request(put("/api/recurring-transactions/{id}",id),token,edit(a,c,"30","Future2"),200);
    }
    @Test void shouldGuardPausedTodayButSkipHistoricalPausedDatesOnResume() throws Exception {
        String token=token();long a=account(token),c=category("Food"),id=create(token,a,c,"DAILY",null);
        request(post("/api/recurring-transactions/{id}/pause",id),token,null,200);
        day(START.plusDays(2));
        request(put("/api/recurring-transactions/{id}",id),token,edit(a,c,"12","Snapshot"),409);
        assertThat(request(post("/api/recurring-transactions/{id}/resume",id),token,null,200).get("nextDueDate").asText())
            .isEqualTo(START.plusDays(2).toString());
        assertThat(worker.process(id)).isEqualTo(1);assertThat(dates()).containsExactly(START.plusDays(2));
        request(put("/api/recurring-transactions/{id}",id),token,edit(a,c,"12","Future"),200);
    }
    @Test void shouldAutomaticallyRecoverBlockedRepairWithoutSkippingBacklogOrAcceptingMixedEdit() throws Exception {
        String token=token();long a=account(token),c=category("Food"),id=create(token,a,c,"DAILY",START.plusDays(2));
        request(delete("/api/accounts/{id}",a),token,null,204);day(START.plusDays(5));
        assertThat(worker.process(id)).isZero();assertThat(getTemplate(token,id).get("status").asText()).isEqualTo("BLOCKED");
        assertThat(worker.process(id)).isZero();long replacement=account(token);
        request(put("/api/recurring-transactions/{id}",id),token,edit(replacement,c,"11","Snapshot"),409);
        assertThat(getTemplate(token,id).get("accountId").asLong()).isEqualTo(a);
        request(put("/api/recurring-transactions/{id}",id),token,edit(replacement,c,"10.0","Snapshot"),200);
        var repaired=getTemplate(token,id);assertThat(repaired.get("status").asText()).isEqualTo("BLOCKED");
        assertThat(repaired.get("nextDueDate").asText()).isEqualTo(START.toString());
        request(post("/api/recurring-transactions/{id}/resume",id),token,null,409);
        assertThat(worker.process(id)).isEqualTo(2);assertThat(getTemplate(token,id).get("status").asText()).isEqualTo("ACTIVE");
        assertThat(worker.process(id)).isEqualTo(1);assertThat(dates()).containsExactly(START,START.plusDays(1),START.plusDays(2));
        assertThat(getTemplate(token,id).get("status").asText()).isEqualTo("COMPLETED");
        assertThat(transactions.findAll()).allSatisfy(t -> assertThat(t.getAccount().getId()).isEqualTo(replacement));
    }
    @Test void shouldBlockInactiveCategoryAndRevalidateForeignAndMismatchedRepair() throws Exception {
        String token=token(),other=token();long a=account(token);
        long custom=request(post("/api/categories"),token,Map.of("name","Recurring Pets","type","EXPENSE"),201).get("id").asLong();
        long foreign=request(post("/api/categories"),other,Map.of("name","Private Pets","type","EXPENSE"),201).get("id").asLong();
        long id=create(token,a,custom,"DAILY",null);
        request(delete("/api/categories/{id}",custom),token,null,204);assertThat(worker.process(id)).isZero();
        request(put("/api/recurring-transactions/{id}",id),token,edit(a,foreign,"10","Snapshot"),404);
        request(put("/api/recurring-transactions/{id}",id),token,edit(a,category("Salary"),"10","Snapshot"),400);
        request(put("/api/recurring-transactions/{id}",id),token,edit(account(other),category("Food"),"10","Snapshot"),404);
        request(put("/api/recurring-transactions/{id}",id),token,edit(a,category("Food"),"10","Snapshot"),200);
        assertThat(worker.process(id)).isEqualTo(1);
    }
    @Test void shouldEnforceJwtOwnerPaginationAndServerManagedImmutableFields() throws Exception {
        String token=token(),other=token();long a=account(token),c=category("Food"),id=create(token,a,c,"MONTHLY",null);
        var spoof=body(account(other),c,"EXPENSE","DAILY",START,null);spoof.put("userId",accounts.findById(a).orElseThrow().getUser().getId());
        long otherId=request(post("/api/recurring-transactions"),other,spoof,201).get("id").asLong();
        assertThat(templates.findById(otherId).orElseThrow().getUser().getId()).isNotEqualTo(accounts.findById(a).orElseThrow().getUser().getId());
        create(token,a,c,"MONTHLY",null); // intentionally identical is allowed
        var list=request(get("/api/recurring-transactions").param("size","1").param("accountId",""+a),token,null,200);
        assertThat(list.get("totalElements").asLong()).isEqualTo(2);assertThat(list.get("content")).hasSize(1);
        for(var operation:List.of(get("/api/recurring-transactions/{id}",id),delete("/api/recurring-transactions/{id}",id),
            post("/api/recurring-transactions/{id}/pause",id),post("/api/recurring-transactions/{id}/resume",id))) request(operation,other,null,404);
        request(put("/api/recurring-transactions/{id}",id),other,edit(a,c,"11","wrong"),404);
        for(var operation:List.of(get("/api/recurring-transactions"),get("/api/recurring-transactions/1"),
            post("/api/recurring-transactions").contentType("application/json").content("{}"),
            put("/api/recurring-transactions/1").contentType("application/json").content("{}"),delete("/api/recurring-transactions/1"),
            post("/api/recurring-transactions/1/pause"),post("/api/recurring-transactions/1/resume"))) {
            mvc.perform(operation).andExpect(status().isUnauthorized());
            mvc.perform(operation.header("Authorization","Bearer invalid-token")).andExpect(status().isUnauthorized());
        }
        assertThat(worker.process(id)).isEqualTo(1);
        var immutable=new HashMap<>(edit(a,c,"12","Future"));immutable.put("frequency","YEARLY");immutable.put("startDate","2090-01-01");immutable.put("status","CANCELLED");immutable.put("nextDueDate","2090-01-01");
        var edited=request(put("/api/recurring-transactions/{id}",id),token,immutable,200);
        assertThat(edited.get("frequency").asText()).isEqualTo("MONTHLY");assertThat(edited.get("startDate").asText()).isEqualTo(START.toString());
    }
    @Test void shouldFeedBudgetAndAllowNormalGeneratedEditsDeletesWithoutReposting() throws Exception {
        String token=token(),other=token();long a=account(token),c=category("Food"),id=create(token,a,c,"MONTHLY",null);
        long budget=request(post("/api/budgets"),token,Map.of("categoryId",c,"year",2024,"month",1,"amount",100),201).get("id").asLong();
        assertThat(worker.process(id)).isEqualTo(1);
        assertThat(request(get("/api/budgets/{id}",budget),token,null,200).get("spentAmount").decimalValue()).isEqualByComparingTo("10");
        long tx=transactions.findAll().getFirst().getId();
        request(put("/api/transactions/{id}",tx),token,Map.of("accountId",a,"categoryId",c,"type","EXPENSE","amount",25,"transactionDate",START.toString()),200);
        assertThat(request(get("/api/budgets/{id}",budget),token,null,200).get("spentAmount").decimalValue()).isEqualByComparingTo("25");
        long income=request(post("/api/recurring-transactions"),token,body(a,category("Salary"),"INCOME","MONTHLY",START,null),201).get("id").asLong();worker.process(income);
        long foreign=create(other,account(other),c,"MONTHLY",null);worker.process(foreign);
        assertThat(request(get("/api/budgets/{id}",budget),token,null,200).get("spentAmount").decimalValue()).isEqualByComparingTo("25");
        request(delete("/api/transactions/{id}",tx),token,null,204);
        assertThat(request(get("/api/budgets/{id}",budget),token,null,200).get("spentAmount").decimalValue()).isZero();
        // Force replay of the original cursor to prove durable identity, not merely cursor advancement.
        jdbc.update("UPDATE recurring_transactions SET next_due_date=? WHERE id=?",START,id);
        long before=transactions.count();assertThat(worker.process(id)).isZero();assertThat(transactions.count()).isEqualTo(before);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM recurring_transaction_occurrences WHERE recurring_transaction_id=? AND transaction_id IS NULL",Long.class,id)).isEqualTo(1);
    }
    @Test void shouldRollbackFinancialInsertOccurrenceAndCursorThenRetry() throws Exception {
        String token=token();long id=create(token,account(token),category("Food"),"DAILY",null);
        doThrow(new IllegalStateException("simulated occurrence insert failure")).when(occurrences).saveAndFlush(any(RecurringTransactionOccurrence.class));
        assertThatThrownBy(() -> worker.process(id)).isInstanceOf(IllegalStateException.class);
        assertThat(transactions.count()).isZero();assertThat(occurrences.count()).isZero();
        assertThat(getTemplate(token,id).get("nextDueDate").asText()).isEqualTo(START.toString());
        reset(occurrences); // Restore the original repository spy after the injected failure.
        assertThat(worker.process(id)).isEqualTo(1);assertThat(transactions.count()).isEqualTo(1);assertThat(occurrences.count()).isEqualTo(1);
    }
    @Test void shouldSerializeOverlappingWorkersWithoutDuplicatePosting() throws Exception {
        String token=token();long id=create(token,account(token),category("Food"),"DAILY",START);
        CountDownLatch ready=new CountDownLatch(2),go=new CountDownLatch(1);
        try(var executor=Executors.newFixedThreadPool(2)) {
            Callable<Integer> run=() -> {ready.countDown();assertThat(go.await(10,TimeUnit.SECONDS)).isTrue();return worker.process(id);};
            Future<Integer> one=executor.submit(run),two=executor.submit(run);assertThat(ready.await(10,TimeUnit.SECONDS)).isTrue();go.countDown();
            assertThat(one.get(15,TimeUnit.SECONDS)+two.get(15,TimeUnit.SECONDS)).isEqualTo(1);
        }
        assertThat(transactions.count()).isEqualTo(1);assertThat(occurrences.count()).isEqualTo(1);
        assertThat(getTemplate(token,id).get("status").asText()).isEqualTo("COMPLETED");
    }
    @Test void shouldRecheckCancellationAfterWaitingForTemplateLock() throws Exception {
        String token=token();long id=create(token,account(token),category("Food"),"DAILY",null);
        CountDownLatch locked=new CountDownLatch(1),cancel=new CountDownLatch(1),workerStarted=new CountDownLatch(1);
        var tx=new TransactionTemplate(transactionManager);
        try(var executor=Executors.newFixedThreadPool(2)) {
            Future<?> owner=executor.submit(() -> tx.executeWithoutResult(status -> {
                var row=templates.findForGeneration(id).orElseThrow();locked.countDown();
                try { if(!cancel.await(10,TimeUnit.SECONDS)) throw new IllegalStateException("timed out"); }
                catch(InterruptedException e) {Thread.currentThread().interrupt();throw new IllegalStateException(e);}
                row.setStatus(RecurringTransactionStatus.CANCELLED);row.setNextDueDate(null);row.setBlockedReason(null);
            }));
            assertThat(locked.await(10,TimeUnit.SECONDS)).isTrue();
            Future<Integer> generation=executor.submit(() -> {workerStarted.countDown();return worker.process(id);});
            assertThat(workerStarted.await(10,TimeUnit.SECONDS)).isTrue();cancel.countDown();owner.get(15,TimeUnit.SECONDS);
            assertThat(generation.get(15,TimeUnit.SECONDS)).isZero();
        }
        assertThat(transactions.count()).isZero();
    }
    @Test void shouldScopeRecurringTimezoneAndKeepManualValidationBoundary() throws Exception {
        // Choose a future instant at a date boundary: generated date is valid in recurring zone but rejected by unchanged manual clock.
        ZoneId zone=ZoneId.of("Pacific/Kiritimati");Instant instant=Instant.parse("2090-01-01T10:30:00Z");
        when(clock.getZone()).thenReturn(zone);when(clock.instant()).thenReturn(instant);
        LocalDate today=LocalDate.now(clock);assertThat(today).isEqualTo(LocalDate.of(2090,1,2));
        String token=token();long a=account(token),c=category("Food");
        var past=body(a,c,"EXPENSE","DAILY",today.minusDays(1),null);request(post("/api/recurring-transactions"),token,past,400);
        long id=request(post("/api/recurring-transactions"),token,body(a,c,"EXPENSE","DAILY",today,null),201).get("id").asLong();
        assertThat(worker.process(id)).isEqualTo(1);assertThat(dates()).containsExactly(today);
        assertThat(getTemplate(token,id).get("createdAt").asText()).isEqualTo("2090-01-02T00:30:00");
        assertThat(transactions.findAll().getFirst().getCreatedAt().getYear()).isEqualTo(LocalDate.now().getYear());
        long tx=transactions.findAll().getFirst().getId();
        request(put("/api/transactions/{id}",tx),token,Map.of("accountId",a,"categoryId",c,"type","EXPENSE","amount",10,"transactionDate",today.toString()),400);
    }
}
