package com.deepak.cointrailapi.common.config;

import io.swagger.v3.oas.models.Components;
import com.deepak.cointrailapi.account.dto.CreateAccountRequest;
import com.deepak.cointrailapi.transaction.dto.CreateTransactionRequest;
import com.deepak.cointrailapi.transaction.dto.UpdateTransactionRequest;
import com.deepak.cointrailapi.budget.dto.CreateBudgetRequest;
import com.deepak.cointrailapi.budget.dto.UpdateBudgetRequest;
import com.deepak.cointrailapi.recurringtransaction.dto.CreateRecurringTransactionRequest;
import com.deepak.cointrailapi.recurringtransaction.dto.UpdateRecurringTransactionRequest;
import jakarta.validation.constraints.Digits;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.media.*;
import io.swagger.v3.oas.models.responses.ApiResponse;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springdoc.core.customizers.OperationCustomizer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;
import java.util.Map;
import java.util.Set;

import static java.util.Map.entry;

/** Documentation metadata only: no application serialization or financial behavior changes. */
@Configuration
@ConditionalOnProperty(name = "app.api-docs.enabled", havingValue = "true")
public class OpenApiConfig {
    // Explicit operation coverage avoids advertising advice errors on unrelated endpoints.
    private static final Map<String, String> RESPONSES = Map.ofEntries(
            entry("AuthController.register", "201,400,409"),
            entry("AuthController.login", "200,400"),
            entry("AccountController.createAccount", "201,400,409"),
            entry("AccountController.getAccounts", "200"),
            entry("AccountController.getAccount", "200,400,404"),
            entry("AccountController.updateAccount", "200,400,404,409"),
            entry("AccountController.deactivateAccount", "204,400,404"),
            entry("CategoryController.createCategory", "201,400,409"),
            entry("CategoryController.getCategories", "200"),
            entry("CategoryController.getCategory", "200,400,404"),
            entry("CategoryController.updateCategory", "200,400,404,409"),
            entry("CategoryController.deactivateCategory", "204,400,404"),
            entry("TransactionController.createTransaction", "201,400,404"),
            entry("TransactionController.getTransactions", "200,400"),
            entry("TransactionController.getTransaction", "200,400,404"),
            entry("TransactionController.updateTransaction", "200,400,404"),
            entry("TransactionController.deleteTransaction", "204,400,404"),
            entry("BudgetController.createBudget", "201,400,404,409"),
            entry("BudgetController.getBudgets", "200,400"),
            entry("BudgetController.getBudget", "200,400,404"),
            entry("BudgetController.updateBudget", "200,400,404"),
            entry("BudgetController.deleteBudget", "204,400,404"),
            entry("RecurringTransactionController.create", "201,400,404"),
            entry("RecurringTransactionController.list", "200,400"),
            entry("RecurringTransactionController.get", "200,400,404"),
            entry("RecurringTransactionController.update", "200,400,404,409"),
            entry("RecurringTransactionController.cancel", "204,400,404"),
            entry("RecurringTransactionController.pause", "200,400,404,409"),
            entry("RecurringTransactionController.resume", "200,400,404,409"),
            entry("DashboardController.getDashboard", "200,400"),
            entry("AnalyticsController.summary", "200,400"),
            entry("AnalyticsController.categories", "200,400"),
            entry("AnalyticsController.accounts", "200,400"),
            entry("AnalyticsController.trends", "200,400"),
            entry("AnalyticsController.comparison", "200,400"));

    @Bean
    public OpenAPI coinTrailOpenApi(@Value("${info.app.version}") String version) {
        Components components = new Components().addSecuritySchemes("bearerAuth", new SecurityScheme()
                .type(SecurityScheme.Type.HTTP).scheme("bearer").bearerFormat("JWT"));
        return new OpenAPI().info(new Info().title("CoinTrail V2 API").version(version)
                        .description("Authenticated personal finance APIs, plus existing registration/login. "
                                + "Money uses one implicit monetary unit. Ownership comes from the JWT. "
                                + "Login, copy accessToken, then use Authorize (paste the token without a Bearer prefix)."))
                .components(components).servers(List.of(new Server().url("/")))
                .security(List.of(new SecurityRequirement().addList("bearerAuth")));
    }

    private static void addErrorComponents(OpenAPI api) {
        Schema<?> errors = new MapSchema().additionalProperties(new StringSchema());
        errors.setTypes(Set.of("object", "null"));
        Schema<?> error = new ObjectSchema()
                .addProperty("status", new IntegerSchema().example(400))
                .addProperty("message", new StringSchema())
                .addProperty("errors", errors.description("Validation field messages; null for other application errors."));
        Components components = api.getComponents().addSchemas("ErrorResponse", error);
        components.addResponses("SecurityUnauthorized", new ApiResponse()
                .description("Missing or invalid JWT. The security entry point returns 401 without a response body."));
        components.addResponses("LoginUnauthorized", jsonError("Invalid email or password", 401, null));
        components.addResponses("BadRequest", jsonError("Invalid request, validation or business rule", 400,
                Map.of("year", "Year must be between 1 and 9999")));
        components.addResponses("NotFound", jsonError("Resource not found or inaccessible to the current user", 404, null));
        components.addResponses("Conflict", jsonError("Duplicate definition or disallowed recurring lifecycle/backlog change", 409, null));
        components.addResponses("InternalError", jsonError("An unexpected error occurred", 500, null));
    }

    private static ApiResponse jsonError(String description, int status, Map<String, String> errors) {
        Map<String, Object> example = new java.util.LinkedHashMap<>();
        example.put("status", status);
        example.put("message", status == 400 ? "Validation Failed" : description);
        example.put("errors", errors);
        return new ApiResponse().description(description).content(new Content().addMediaType("application/json",
                new MediaType().schema(new Schema<>().$ref("#/components/schemas/ErrorResponse")).example(example)));
    }

    @Bean
    public OperationCustomizer documentedResponses() {
        return (operation, handler) -> {
            String key = handler.getBeanType().getSimpleName() + "." + handler.getMethod().getName();
            String metadata = RESPONSES.get(key);
            if (metadata == null) return operation;
            operation.setOperationId(key.replace('.', '_'));
            String[] statuses = metadata.split(",");
            var responses = operation.getResponses();
            ApiResponse success = responses.get(statuses[0]);
            if (success == null) success = responses.get("200");
            if (success == null) success = new ApiResponse();
            responses.clear();
            success.setDescription(switch (statuses[0]) {
                case "201" -> "Created";
                case "204" -> "Completed; no response body";
                default -> "Successful response";
            });
            if (statuses[0].equals("204")) success.setContent(null);
            else if (success.getContent() != null && success.getContent().containsKey("*/*")) {
                MediaType json = success.getContent().remove("*/*");
                success.getContent().addMediaType("application/json", json);
            }
            responses.addApiResponse(statuses[0], success);
            for (int i = 1; i < statuses.length; i++) {
                String name = switch (statuses[i]) {
                    case "400" -> "BadRequest";
                    case "404" -> "NotFound";
                    case "409" -> "Conflict";
                    default -> throw new IllegalStateException("Unexpected documentation status");
                };
                responses.addApiResponse(statuses[i], responseRef(name));
            }
            boolean authentication = handler.getBeanType().getSimpleName().equals("AuthController");
            if (authentication) {
                operation.setSecurity(List.of());
                if (handler.getMethod().getName().equals("login"))
                    responses.addApiResponse("401", responseRef("LoginUnauthorized"));
            } else responses.addApiResponse("401", responseRef("SecurityUnauthorized"));
            responses.addApiResponse("500", responseRef("InternalError"));
            if (operation.getParameters() != null) operation.getParameters().forEach(parameter -> {
                String name = parameter.getName();
                if (name.equals("id")) parameter.setDescription("Resource ID; another user's owned resource follows not-found behavior.");
                if (name.equals("accountId") || name.equals("categoryId"))
                    parameter.setDescription("Optional filter ID. Unknown/inaccessible IDs produce an empty owned page, not a resource lookup error.");
                if (name.equals("from") || name.equals("to") || name.equals("compareFrom") || name.equals("compareTo"))
                    parameter.setDescription("ISO calendar date (YYYY-MM-DD), inclusive. See this operation's range rules.");
                if (name.equals("year")) parameter.setDescription("Explicit selected year, 1–9999; past/current/future allowed, no default.");
                if (name.equals("month")) parameter.setDescription("Explicit selected month, 1–12; no default.");
                if (name.equals("size")) {
                    parameter.setDescription("Page size, default 20; requests above 100 are capped by the existing resolver.");
                    parameter.getSchema().setMaximum(java.math.BigDecimal.valueOf(100));
                }
                if (name.equals("page")) parameter.setDescription("Zero-based page number, default 0.");
                if (name.equals("sort")) parameter.setDescription(key.startsWith("TransactionController")
                        ? "Repeatable property,direction: transactionDate, amount, createdAt, updatedAt. Default transactionDate,desc."
                        : "Repeatable property,direction: createdAt, updatedAt, nextDueDate. Default createdAt,desc; id,desc tie-breaker.");
            });
            return operation;
        };
    }

    private static ApiResponse responseRef(String name) {
        return new ApiResponse().$ref("#/components/responses/" + name);
    }

    @Bean
    public OpenApiCustomizer documentedSchemas() {
        return api -> {
            addErrorComponents(api);
            api.getComponents().getSchemas().values().forEach(schema -> {
                if (schema.getProperties() == null) return;
                for (String name : List.of("createdAt", "updatedAt")) {
                    Schema<?> timestamp = (Schema<?>) schema.getProperties().get(name);
                    if (timestamp != null) {
                        timestamp.setFormat(null);
                        timestamp.setDescription("ISO local date-time, without an offset/UTC guarantee.");
                        timestamp.setExample("2026-10-04T12:30:00");
                    }
                }
            });
            for (Class<?> dto : List.of(CreateAccountRequest.class, CreateTransactionRequest.class,
                    UpdateTransactionRequest.class, CreateBudgetRequest.class, UpdateBudgetRequest.class,
                    CreateRecurringTransactionRequest.class, UpdateRecurringTransactionRequest.class)) {
                Schema<?> schema = api.getComponents().getSchemas().get(dto.getSimpleName());
                if (schema == null) continue;
                for (var field : dto.getDeclaredFields()) {
                    Digits digits = field.getAnnotation(Digits.class);
                    if (digits != null) {
                        Schema<?> property = (Schema<?>) schema.getProperties().get(field.getName());
                        property.setDescription("At most " + digits.integer() + " integer and "
                                + digits.fraction() + " fractional digits (existing Bean Validation).");
                    }
                }
            }
            api.getComponents().getSchemas().forEach((name, schema) -> {
                if (schema.getProperties() == null) return;
                if (name.contains("Transaction")) nullableProperty(schema, "description");
                if (name.equals("CreateRecurringTransactionRequest") || name.equals("RecurringTransactionResponse"))
                    nullableProperty(schema, "endDate");
                if (name.equals("PendingRecurringTransaction")) nullableProperty(schema, "blockedReason");
                if (name.equals("RecurringTransactionResponse")) {
                    nullableProperty(schema, "nextDueDate");
                    nullableProperty(schema, "blockedReason");
                }
            });
        };
    }

    private static void nullableProperty(Schema<?> schema, String name) {
        Schema<?> property = (Schema<?>) schema.getProperties().get(name);
        if (property != null) property.setTypes(Set.of(property.getType() == null ? "string" : property.getType(), "null"));
    }
}
