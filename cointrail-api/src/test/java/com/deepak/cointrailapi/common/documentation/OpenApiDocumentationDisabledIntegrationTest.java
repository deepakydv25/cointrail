package com.deepak.cointrailapi.common.documentation;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.core.env.Environment;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import tools.jackson.databind.ObjectMapper;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Testcontainers
class OpenApiDocumentationDisabledIntegrationTest {
    @Container
    @ServiceConnection
    static PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:17-alpine");

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired Environment environment;

    @Test
    void defaultPolicyDisablesGenerationUiAndAssetsEvenForAuthenticatedUsers() throws Exception {
        assertThat(environment.getProperty("app.api-docs.enabled", Boolean.class)).isFalse();
        assertThat(environment.getProperty("springdoc.api-docs.enabled", Boolean.class)).isFalse();
        assertThat(environment.getProperty("springdoc.swagger-ui.enabled", Boolean.class)).isFalse();
        String email = UUID.randomUUID() + "@disabled-docs.test";
        mockMvc.perform(post("/api/v1/auth/register").contentType("application/json")
                .content("""
                        {"name":"Disabled Documentation Test","email":"%s","password":"password123"}
                        """.formatted(email))).andExpect(status().isCreated());
        String login = mockMvc.perform(post("/api/v1/auth/login").contentType("application/json")
                .content("""
                        {"email":"%s","password":"password123"}
                        """.formatted(email))).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String token = objectMapper.readTree(login).path("accessToken").asText();
        for (String path : List.of("/v3/api-docs", "/v3/api-docs.yaml", "/v3/api-docs/swagger-config",
                "/swagger-ui.html", "/swagger-ui/index.html", "/swagger-ui/swagger-ui.css",
                "/swagger-ui/swagger-ui-bundle.js", "/swagger-ui/swagger-initializer.js",
                "/webjars/swagger-ui/5.32.14/swagger-ui-bundle.js", "/webjars/swagger-ui/swagger-ui.css")) {
            mockMvc.perform(get(path)).andExpect(status().isUnauthorized()).andExpect(content().string(""));
            mockMvc.perform(get(path).header("Authorization", "Bearer " + token)).andExpect(status().isForbidden());
            mockMvc.perform(head(path).header("Authorization", "Bearer " + token)).andExpect(status().isForbidden());
        }
        mockMvc.perform(get("/api/accounts").header("Authorization", "Bearer " + token)).andExpect(status().isOk());
    }
}
