package com.deepak.cointrailapi.category;

import com.deepak.cointrailapi.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
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
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
@ActiveProfiles("test")
class CategoryIntegrationTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer postgres =
            new PostgreSQLContainer("postgres:17-alpine");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private UserRepository userRepository;

    @BeforeEach
    void cleanDatabase() {

        /*
         * Do NOT delete system categories.
         *
         * V7 seeds them and Category API depends on them.
         * Only remove custom categories created by previous tests.
         */
        categoryRepository.findAll().stream()
                .filter(category -> !category.isSystem())
                .forEach(categoryRepository::delete);

        userRepository.deleteAll();
    }

    private void registerUser(
            String name,
            String email,
            String password) throws Exception {

        String body = """
                {
                    "name": "%s",
                    "email": "%s",
                    "password": "%s"
                }
                """.formatted(name, email, password);

        mockMvc.perform(
                        post("/api/v1/auth/register")
                                .contentType("application/json")
                                .content(body)
                )
                .andExpect(status().isCreated());
    }

    private String loginAndGetToken(
            String email,
            String password) throws Exception {

        String body = """
                {
                    "email": "%s",
                    "password": "%s"
                }
                """.formatted(email, password);

        String response = mockMvc.perform(
                        post("/api/v1/auth/login")
                                .contentType("application/json")
                                .content(body)
                )
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();

        JsonNode json = objectMapper.readTree(response);

        return json.get("accessToken").asText();
    }

    private Long createCategory(
            String token,
            String name,
            CategoryType type) throws Exception {

        String body = """
                {
                    "name": "%s",
                    "type": "%s"
                }
                """.formatted(name, type);

        String response = mockMvc.perform(
                        post("/api/categories")
                                .header(
                                        "Authorization",
                                        "Bearer " + token
                                )
                                .contentType("application/json")
                                .content(body)
                )
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();

        return objectMapper
                .readTree(response)
                .get("id")
                .asLong();
    }

    @Test
    void createCategory_shouldPersistCustomCategory()
            throws Exception {

        registerUser(
                "User One",
                "category-create@test.com",
                "password123"
        );

        String token = loginAndGetToken(
                "category-create@test.com",
                "password123"
        );

        String body = """
                {
                    "name": "Pet Care",
                    "type": "EXPENSE"
                }
                """;

        String response = mockMvc.perform(
                        post("/api/categories")
                                .header(
                                        "Authorization",
                                        "Bearer " + token
                                )
                                .contentType("application/json")
                                .content(body)
                )
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name")
                        .value("Pet Care"))
                .andExpect(jsonPath("$.type")
                        .value("EXPENSE"))
                .andExpect(jsonPath("$.system")
                        .value(false))
                .andExpect(jsonPath("$.active")
                        .value(true))
                .andReturn()
                .getResponse()
                .getContentAsString();

        Long id = objectMapper
                .readTree(response)
                .get("id")
                .asLong();

        Category category =
                categoryRepository.findById(id)
                        .orElseThrow();

        assertThat(category.getName())
                .isEqualTo("Pet Care");

        assertThat(category.getType())
                .isEqualTo(CategoryType.EXPENSE);

        assertThat(category.isSystem()).isFalse();
        assertThat(category.isActive()).isTrue();
        assertThat(category.getUser()).isNotNull();
    }

    @Test
    void getCategories_shouldReturnSystemAndOwnCustomCategories()
            throws Exception {

        registerUser(
                "User A",
                "category-list-a@test.com",
                "password123"
        );

        String userAToken = loginAndGetToken(
                "category-list-a@test.com",
                "password123"
        );

        createCategory(
                userAToken,
                "Pet Care",
                CategoryType.EXPENSE
        );

        registerUser(
                "User B",
                "category-list-b@test.com",
                "password123"
        );

        String userBToken = loginAndGetToken(
                "category-list-b@test.com",
                "password123"
        );

        createCategory(
                userBToken,
                "Gaming",
                CategoryType.EXPENSE
        );

        mockMvc.perform(
                        get("/api/categories")
                                .header(
                                        "Authorization",
                                        "Bearer " + userAToken
                                )
                )
                .andExpect(status().isOk())

                // System categories should be present
                .andExpect(
                        jsonPath("$[?(@.name == 'Food')]")
                                .exists()
                )

                // User A's category should be present
                .andExpect(
                        jsonPath("$[?(@.name == 'Pet Care')]")
                                .exists()
                )

                // User B's category must not leak
                .andExpect(
                        jsonPath("$[?(@.name == 'Gaming')]")
                                .doesNotExist()
                );
    }

    @Test
    void createCategory_shouldRejectSystemCategoryDuplicate()
            throws Exception {

        registerUser(
                "User One",
                "category-system-duplicate@test.com",
                "password123"
        );

        String token = loginAndGetToken(
                "category-system-duplicate@test.com",
                "password123"
        );

        String body = """
                {
                    "name": "food",
                    "type": "EXPENSE"
                }
                """;

        mockMvc.perform(
                        post("/api/categories")
                                .header(
                                        "Authorization",
                                        "Bearer " + token
                                )
                                .contentType("application/json")
                                .content(body)
                )
                .andExpect(status().isConflict());
    }

    @Test
    void createCategory_shouldRejectOwnDuplicateIgnoringCase()
            throws Exception {

        registerUser(
                "User One",
                "category-duplicate@test.com",
                "password123"
        );

        String token = loginAndGetToken(
                "category-duplicate@test.com",
                "password123"
        );

        createCategory(
                token,
                "Pet Care",
                CategoryType.EXPENSE
        );

        String body = """
                {
                    "name": "pet care",
                    "type": "EXPENSE"
                }
                """;

        mockMvc.perform(
                        post("/api/categories")
                                .header(
                                        "Authorization",
                                        "Bearer " + token
                                )
                                .contentType("application/json")
                                .content(body)
                )
                .andExpect(status().isConflict());
    }

    @Test
    void userShouldNotAccessAnotherUsersCustomCategory()
            throws Exception {

        registerUser(
                "User A",
                "category-owner-a@test.com",
                "password123"
        );

        String userAToken = loginAndGetToken(
                "category-owner-a@test.com",
                "password123"
        );

        Long categoryId = createCategory(
                userAToken,
                "Pet Care",
                CategoryType.EXPENSE
        );

        registerUser(
                "User B",
                "category-owner-b@test.com",
                "password123"
        );

        String userBToken = loginAndGetToken(
                "category-owner-b@test.com",
                "password123"
        );

        mockMvc.perform(
                        get(
                                "/api/categories/{id}",
                                categoryId
                        )
                                .header(
                                        "Authorization",
                                        "Bearer " + userBToken
                                )
                )
                .andExpect(status().isNotFound());

        mockMvc.perform(
                        delete(
                                "/api/categories/{id}",
                                categoryId
                        )
                                .header(
                                        "Authorization",
                                        "Bearer " + userBToken
                                )
                )
                .andExpect(status().isNotFound());

        Category category =
                categoryRepository.findById(categoryId)
                        .orElseThrow();

        assertThat(category.isActive()).isTrue();
    }

    @Test
    void updateCategory_shouldUpdateOwnCustomCategory()
            throws Exception {

        registerUser(
                "User One",
                "category-update@test.com",
                "password123"
        );

        String token = loginAndGetToken(
                "category-update@test.com",
                "password123"
        );

        Long categoryId = createCategory(
                token,
                "Pet Care",
                CategoryType.EXPENSE
        );

        String body = """
                {
                    "name": "Pets"
                }
                """;

        mockMvc.perform(
                        put(
                                "/api/categories/{id}",
                                categoryId
                        )
                                .header(
                                        "Authorization",
                                        "Bearer " + token
                                )
                                .contentType("application/json")
                                .content(body)
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Pets"))
                .andExpect(jsonPath("$.type").value("EXPENSE"));

        Category category =
                categoryRepository.findById(categoryId)
                        .orElseThrow();

        assertThat(category.getName())
                .isEqualTo("Pets");

        assertThat(category.getType())
                .isEqualTo(CategoryType.EXPENSE);
    }

    @Test
    void deactivateCategory_shouldSoftDeleteCustomCategory()
            throws Exception {

        registerUser(
                "User One",
                "category-delete@test.com",
                "password123"
        );

        String token = loginAndGetToken(
                "category-delete@test.com",
                "password123"
        );

        Long categoryId = createCategory(
                token,
                "Pet Care",
                CategoryType.EXPENSE
        );

        mockMvc.perform(
                        delete(
                                "/api/categories/{id}",
                                categoryId
                        )
                                .header(
                                        "Authorization",
                                        "Bearer " + token
                                )
                )
                .andExpect(status().isNoContent());

        // Soft delete: row remains in database
        Category category =
                categoryRepository.findById(categoryId)
                        .orElseThrow();

        assertThat(category.isActive()).isFalse();

        // But it is no longer visible through the API
        mockMvc.perform(
                        get(
                                "/api/categories/{id}",
                                categoryId
                        )
                                .header(
                                        "Authorization",
                                        "Bearer " + token
                                )
                )
                .andExpect(status().isNotFound());
    }

    @Test
    void userShouldNotModifySystemCategory()
            throws Exception {

        registerUser(
                "User One",
                "category-system@test.com",
                "password123"
        );

        String token = loginAndGetToken(
                "category-system@test.com",
                "password123"
        );

        Category food =
                categoryRepository.findAll()
                        .stream()
                        .filter(category ->
                                category.isSystem()
                                        && category.getName()
                                        .equals("Food")
                                        && category.getType()
                                        == CategoryType.EXPENSE
                        )
                        .findFirst()
                        .orElseThrow();

        String body = """
                {
                    "name": "My Food"
                }
                """;

        mockMvc.perform(
                        put(
                                "/api/categories/{id}",
                                food.getId()
                        )
                                .header(
                                        "Authorization",
                                        "Bearer " + token
                                )
                                .contentType("application/json")
                                .content(body)
                )
                .andExpect(status().isNotFound());

        mockMvc.perform(
                        delete(
                                "/api/categories/{id}",
                                food.getId()
                        )
                                .header(
                                        "Authorization",
                                        "Bearer " + token
                                )
                )
                .andExpect(status().isNotFound());

        Category unchanged =
                categoryRepository.findById(food.getId())
                        .orElseThrow();

        assertThat(unchanged.getName())
                .isEqualTo("Food");

        assertThat(unchanged.isActive()).isTrue();
    }
}