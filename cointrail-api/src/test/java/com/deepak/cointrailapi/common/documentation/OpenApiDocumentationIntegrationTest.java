package com.deepak.cointrailapi.common.documentation;

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
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.JsonNode;

import java.util.UUID;
import java.util.List;
import java.util.Set;
import java.util.HashSet;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = "app.api-docs.enabled=true")
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Testcontainers
class OpenApiDocumentationIntegrationTest {
    @Container
    @ServiceConnection
    static PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:17-alpine");

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    @Test
    void pinnedIntegrationGeneratesDocumentOnApplicationBaseline() throws Exception {
        String json = mockMvc.perform(get("/v3/api-docs")
                        .header("Authorization", "Bearer " + login()))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertThat(objectMapper.readTree(json).path("paths").has("/api/analytics/summary")).isTrue();
        Files.writeString(Path.of("target/openapi-generated.json"), json);
    }

    private JsonNode document() throws Exception {
        return objectMapper.readTree(mockMvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
    }

    @Test
    void documentsExactlyApprovedOperationsTagsAndSecurity() throws Exception {
        JsonNode doc = document();
        Set<String> expected = new HashSet<>();
        for (String domain : List.of("accounts", "categories", "transactions", "budgets", "recurring-transactions")) {
            expected.add("get /api/" + domain);
            expected.add("post /api/" + domain);
            for (String verb : List.of("get", "put", "delete")) expected.add(verb + " /api/" + domain + "/{id}");
        }
        expected.addAll(List.of("post /api/v1/auth/register", "post /api/v1/auth/login", "get /api/dashboard",
                "post /api/recurring-transactions/{id}/pause", "post /api/recurring-transactions/{id}/resume"));
        for (String name : List.of("summary", "categories", "accounts", "trends", "comparison"))
            expected.add("get /api/analytics/" + name);
        Set<String> actual = new HashSet<>(), ids = new HashSet<>(), tags = new HashSet<>();
        doc.path("paths").properties().forEach(path -> path.getValue().properties().forEach(method -> {
            actual.add(method.getKey() + " " + path.getKey());
            JsonNode operation = method.getValue();
            assertThat(operation.path("summary").asText()).isNotBlank();
            assertThat(operation.path("description").asText()).isNotBlank();
            assertThat(ids.add(operation.path("operationId").asText())).isTrue();
            assertThat(operation.path("tags").size()).isEqualTo(1);
            tags.add(operation.path("tags").get(0).asText());
            if (path.getKey().startsWith("/api/v1/auth")) {
                assertThat(operation.has("security")).isTrue();
                assertThat(operation.path("security").isEmpty()).isTrue();
            } else {
                JsonNode security = operation.has("security") ? operation.path("security") : doc.path("security");
                assertThat(security.get(0).has("bearerAuth")).isTrue();
                assertThat(operation.path("responses").path("401").path("$ref").asText())
                        .isEqualTo("#/components/responses/SecurityUnauthorized");
            }
        }));
        assertThat(actual).hasSize(35).isEqualTo(expected);
        assertThat(tags).containsExactlyInAnyOrder("Authentication", "Accounts", "Categories", "Transactions",
                "Budgets", "Recurring Transactions", "Dashboard", "Analytics");
        assertThat(doc.path("info").path("title").asText()).isEqualTo("CoinTrail V2 API");
        JsonNode bearer = doc.at("/components/securitySchemes/bearerAuth");
        assertThat(bearer.path("type").asText()).isEqualTo("http");
        assertThat(bearer.path("scheme").asText()).isEqualTo("bearer");
        assertThat(bearer.path("bearerFormat").asText()).isEqualTo("JWT");
        assertReferencesResolve(doc, doc);
        assertThat(doc.path("components").path("schemas").has("User")).isFalse();
        assertThat(doc.toString()).doesNotContain("passwordHash", "/api/v1/expenses", "/actuator/");
    }

    private void assertReferencesResolve(JsonNode doc, JsonNode node) {
        if (node.has("$ref")) {
            String ref = node.path("$ref").asText();
            assertThat(ref).startsWith("#/");
            assertThat(doc.at(ref.substring(1)).isMissingNode()).as(ref).isFalse();
        }
        if (node.isContainer()) for (JsonNode child : node) assertReferencesResolve(doc, child);
    }

    @Test
    void successAndErrorContractsReflectActualStatusBodies() throws Exception {
        JsonNode doc = document();
        for (String domain : List.of("accounts", "categories", "transactions", "budgets", "recurring-transactions")) {
            JsonNode create = doc.path("paths").path("/api/" + domain).path("post").path("responses");
            assertThat(create.has("201")).isTrue();
            assertThat(create.has("200")).isFalse();
            assertThat(create.at("/201/content/application~1json/schema").isMissingNode()).isFalse();
            JsonNode delete = doc.path("paths").path("/api/" + domain + "/{id}").path("delete").path("responses");
            assertThat(delete.has("204")).isTrue();
            assertThat(delete.has("200")).isFalse();
            assertThat(delete.path("204").has("content")).isFalse();
        }
        for (String route : List.of("/api/dashboard", "/api/analytics/summary", "/api/analytics/categories",
                "/api/analytics/accounts", "/api/analytics/trends", "/api/analytics/comparison")) {
            JsonNode responses = doc.path("paths").path(route).path("get").path("responses");
            assertThat(responses.has("400")).isTrue();
            assertThat(responses.has("404")).isFalse();
            assertThat(responses.has("409")).isFalse();
        }
        assertThat(doc.at("/components/responses/SecurityUnauthorized").has("content")).isFalse();
        assertThat(doc.path("paths").path("/api/v1/auth/login").at("/post/responses/401/$ref").asText())
                .isEqualTo("#/components/responses/LoginUnauthorized");
        assertThat(doc.at("/components/responses/LoginUnauthorized/content/application~1json/schema/$ref").asText())
                .isEqualTo("#/components/schemas/ErrorResponse");
        JsonNode errors = doc.at("/components/schemas/ErrorResponse/properties");
        assertThat(errors.has("status") && errors.has("message") && errors.has("errors")).isTrue();
        assertThat(errors.at("/errors/additionalProperties/type").asText()).isEqualTo("string");
    }

    private JsonNode schema(JsonNode doc, JsonNode node) {
        return node.has("$ref") ? doc.at(node.path("$ref").asText().substring(1)) : node;
    }

    @Test
    void derivesDtoValidationAndDocumentsBusinessParameters() throws Exception {
        JsonNode doc = document();
        JsonNode register = doc.at("/components/schemas/RegisterRequest");
        assertThat(register.path("required").toString()).contains("name", "email", "password");
        assertThat(register.at("/properties/name/maxLength").asInt()).isEqualTo(100);
        assertThat(register.at("/properties/password/minLength").asInt()).isEqualTo(8);
        assertThat(register.at("/properties/password/writeOnly").asBoolean()).isTrue();
        assertThat(register.at("/properties/password/format").asText()).isEqualTo("password");
        assertThat(doc.at("/components/schemas/LoginRequest/properties/password/minLength").asInt()).isEqualTo(1);
        JsonNode amount = doc.at("/components/schemas/CreateTransactionRequest/properties/amount");
        assertThat(amount.path("type").toString()).contains("number");
        assertThat(amount.path("minimum").decimalValue()).isEqualByComparingTo("0.01");
        assertThat(doc.at("/components/schemas/CreateTransactionRequest/properties/description/maxLength").asInt()).isEqualTo(500);
        assertThat(doc.at("/components/schemas/CreateTransactionRequest/properties/transactionDate/format").asText()).isEqualTo("date");
        assertThat(doc.at("/components/schemas/AccountResponse/properties/createdAt").has("format")).isFalse();
        assertThat(doc.at("/components/schemas/CreateBudgetRequest/properties/amount/description").asText())
                .contains("17 integer", "2 fractional");
        assertThat(doc.at("/components/schemas/RecurringTransactionResponse/properties/endDate/type").toString())
                .contains("string", "null");
        assertThat(doc.at("/components/schemas/RecurringTransactionResponse/properties/blockedReason/type").toString())
                .contains("string", "null");
        JsonNode trends = doc.path("paths").path("/api/analytics/trends").path("get");
        for (String name : List.of("from", "to", "grouping")) {
            JsonNode param = parameter(trends, name);
            assertThat(param.path("required").asBoolean()).isTrue();
        }
        assertThat(parameter(trends, "grouping").path("schema").path("enum").toString())
                .contains("DAILY", "WEEKLY", "MONTHLY");
        assertThat(trends.path("description").asText()).contains("366", "plusYears(2)", "plusYears(5)");
        for (String route : List.of("/api/transactions", "/api/recurring-transactions")) {
            JsonNode operation = doc.path("paths").path(route).path("get");
            assertThat(parameter(operation, "page").at("/schema/default").asInt()).isZero();
            assertThat(parameter(operation, "size").at("/schema/default").asInt()).isEqualTo(20);
            assertThat(parameter(operation, "size").at("/schema/maximum").asInt()).isEqualTo(100);
            assertThat(parameter(operation, "sort").path("description").asText()).contains("desc");
            assertThat(parameter(operation, "accountId").path("required").asBoolean()).isFalse();
        }
    }

    private JsonNode parameter(JsonNode operation, String name) {
        for (JsonNode p : operation.path("parameters")) if (p.path("name").asText().equals(name)) return p;
        throw new AssertionError("Missing parameter: " + name);
    }

    @Test
    void pageSchemasMatchActualSerializationWithoutChangingEnvelope() throws Exception {
        JsonNode doc = document();
        String token = login();
        for (String route : List.of("/api/transactions", "/api/recurring-transactions")) {
            JsonNode actual = objectMapper.readTree(mockMvc.perform(get(route).header("Authorization", "Bearer " + token))
                    .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
            JsonNode documented = schema(doc, doc.path("paths").path(route).path("get")
                    .at("/responses/200/content/application~1json/schema"));
            actual.properties().forEach(field -> assertThat(documented.path("properties").has(field.getKey()))
                    .as(route + " " + field.getKey()).isTrue());
            assertThat(actual.has("content")).isTrue();
            assertThat(documented.path("properties").has("page")).isFalse();
            assertThat(schema(doc, documented.at("/properties/content/items")).path("properties").has("amount")).isTrue();
        }
    }

    @Test
    void exposesSameOriginDocumentationAssetsOnlyWithoutAuthentication() throws Exception {
        mockMvc.perform(get("/swagger-ui.html")).andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/swagger-ui/index.html"));
        for (String asset : List.of("index.html", "swagger-ui.css", "swagger-ui-bundle.js", "swagger-initializer.js"))
            mockMvc.perform(get("/swagger-ui/" + asset)).andExpect(status().isOk());
        mockMvc.perform(head("/v3/api-docs")).andExpect(status().isOk());
        mockMvc.perform(get("/v3/api-docs.yaml")).andExpect(status().isOk());
        mockMvc.perform(get("/v3/api-docs/swagger-config")).andExpect(status().isOk())
                .andExpect(jsonPath("$.url").value("/v3/api-docs"))
                .andExpect(jsonPath("$.persistAuthorization").value(false));
        mockMvc.perform(post("/v3/api-docs")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/webjars/unrelated.js")).andExpect(status().isUnauthorized());
    }

    @Test
    void publicDocumentationDoesNotChangeJwtOwnershipOrErrorBehavior() throws Exception {
        for (String route : List.of("/api/accounts", "/api/categories", "/api/transactions", "/api/budgets",
                "/api/recurring-transactions", "/api/dashboard", "/api/analytics/summary")) {
            mockMvc.perform(get(route)).andExpect(status().isUnauthorized()).andExpect(content().string(""));
            mockMvc.perform(get(route).header("Authorization", "Bearer invalid-token"))
                    .andExpect(status().isUnauthorized()).andExpect(content().string(""));
        }
        mockMvc.perform(post("/api/v1/auth/login").contentType("application/json")
                .content("{\"email\":\"unknown@docs.test\",\"password\":\"wrong\"}"))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value("Invalid email or password"));
        String token = login();
        mockMvc.perform(get("/api/dashboard").header("Authorization", "Bearer " + token))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.status").value(400));
        String account = mockMvc.perform(post("/api/accounts").header("Authorization", "Bearer " + token)
                .contentType("application/json").content("{\"name\":\"Docs account\",\"type\":\"CASH\",\"openingBalance\":0}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        mockMvc.perform(post("/api/accounts").header("Authorization", "Bearer " + token)
                .contentType("application/json").content("{\"name\":\"Docs account\",\"type\":\"CASH\",\"openingBalance\":0}"))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.status").value(409));
        mockMvc.perform(get("/api/accounts/" + objectMapper.readTree(account).path("id").asLong())
                .header("Authorization", "Bearer " + login()))
                .andExpect(status().isNotFound()).andExpect(jsonPath("$.status").value(404));
        mockMvc.perform(get("/actuator/health")).andExpect(status().isOk());
        mockMvc.perform(get("/actuator/info")).andExpect(status().isOk());
    }

    private String login() throws Exception {
        String email = UUID.randomUUID() + "@docs.test";
        mockMvc.perform(post("/api/v1/auth/register").contentType("application/json")
                .content("""
                        {"name":"Documentation Test","email":"%s","password":"password123"}
                        """.formatted(email))).andExpect(status().isCreated());
        String response = mockMvc.perform(post("/api/v1/auth/login").contentType("application/json")
                .content("""
                        {"email":"%s","password":"password123"}
                        """.formatted(email))).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(response).path("accessToken").asText();
    }

    @Test
    void documentsPendingBlockedReasonAndMonetaryPrecision() throws Exception {
        JsonNode doc = document();
        JsonNode dashboard = schema(doc, doc.path("paths").path("/api/dashboard").path("get")
                .at("/responses/200/content/application~1json/schema"));
        JsonNode pending = schema(doc, dashboard.at("/properties/pendingRecurringTransactions"));
        JsonNode item = schema(doc, pending.at("/properties/items/items"));
        assertThat(item.at("/properties/blockedReason/type").toString()).contains("string", "null");
        for (String dto : List.of("CreateTransactionRequest", "UpdateTransactionRequest", "CreateAccountRequest")) {
            String field = dto.equals("CreateAccountRequest") ? "openingBalance" : "amount";
            JsonNode money = doc.path("components").path("schemas").path(dto).path("properties").path(field);
            assertThat(money.path("description").asText()).contains("17 integer", "2 fractional");
            if (field.equals("openingBalance")) assertThat(money.has("minimum")).isFalse();
        }
    }
}
