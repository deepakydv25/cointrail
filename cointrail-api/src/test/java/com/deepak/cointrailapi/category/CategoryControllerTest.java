package com.deepak.cointrailapi.category;

import com.deepak.cointrailapi.category.dto.CategoryResponse;
import com.deepak.cointrailapi.category.dto.CreateCategoryRequest;
import com.deepak.cointrailapi.category.dto.UpdateCategoryRequest;
import com.deepak.cointrailapi.common.security.JwtService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(CategoryController.class)
class CategoryControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private CategoryService categoryService;

    @MockitoBean
    private JwtService jwtService;

    @MockitoBean
    private UserDetailsService userDetailsService;

    private CategoryResponse categoryResponse() {
        return new CategoryResponse(
                100L,
                "Pet Care",
                CategoryType.EXPENSE,
                false,
                true,
                LocalDateTime.now(),
                LocalDateTime.now()
        );
    }

    @Test
    void shouldCreateCategory() throws Exception {

        when(categoryService.createCategory(
                any(CreateCategoryRequest.class)))
                .thenReturn(categoryResponse());

        mockMvc.perform(
                        post("/api/categories")
                                .contentType("application/json")
                                .content("""
                                        {
                                          "name": "Pet Care",
                                          "type": "EXPENSE"
                                        }
                                        """)
                )
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(100))
                .andExpect(jsonPath("$.name").value("Pet Care"))
                .andExpect(jsonPath("$.type").value("EXPENSE"))
                .andExpect(jsonPath("$.system").value(false))
                .andExpect(jsonPath("$.active").value(true));

        verify(categoryService)
                .createCategory(any(CreateCategoryRequest.class));
    }

    @Test
    void shouldGetCategories() throws Exception {

        CategoryResponse systemCategory =
                new CategoryResponse(
                        1L,
                        "Food",
                        CategoryType.EXPENSE,
                        true,
                        true,
                        LocalDateTime.now(),
                        LocalDateTime.now()
                );

        when(categoryService.getCategories())
                .thenReturn(List.of(
                        systemCategory,
                        categoryResponse()
                ));

        mockMvc.perform(get("/api/categories"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].name").value("Food"))
                .andExpect(jsonPath("$[0].system").value(true))
                .andExpect(jsonPath("$[1].name").value("Pet Care"))
                .andExpect(jsonPath("$[1].system").value(false));

        verify(categoryService).getCategories();
    }

    @Test
    void shouldGetCategoryById() throws Exception {

        when(categoryService.getCategory(100L))
                .thenReturn(categoryResponse());

        mockMvc.perform(
                        get("/api/categories/{id}", 100L)
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(100))
                .andExpect(jsonPath("$.name").value("Pet Care"))
                .andExpect(jsonPath("$.type").value("EXPENSE"));

        verify(categoryService).getCategory(100L);
    }

    @Test
    void shouldUpdateCategory() throws Exception {

        CategoryResponse updated =
                new CategoryResponse(
                        100L,
                        "Pets",
                        CategoryType.EXPENSE,
                        false,
                        true,
                        LocalDateTime.now(),
                        LocalDateTime.now()
                );

        when(categoryService.updateCategory(
                eq(100L),
                any(UpdateCategoryRequest.class)))
                .thenReturn(updated);

        mockMvc.perform(
                        put("/api/categories/{id}", 100L)
                                .contentType("application/json")
                                .content("""
                                        {
                                          "name": "Pets"
                                        }
                                        """)
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(100))
                .andExpect(jsonPath("$.name").value("Pets"))
                .andExpect(jsonPath("$.type").value("EXPENSE"));

        verify(categoryService)
                .updateCategory(
                        eq(100L),
                        any(UpdateCategoryRequest.class)
                );
    }

    @Test
    void shouldDeactivateCategory() throws Exception {

        doNothing()
                .when(categoryService)
                .deactivateCategory(100L);

        mockMvc.perform(
                        delete("/api/categories/{id}", 100L)
                )
                .andExpect(status().isNoContent());

        verify(categoryService)
                .deactivateCategory(100L);
    }

    @Test
    void shouldRejectCreateWhenNameIsBlank()
            throws Exception {

        mockMvc.perform(
                        post("/api/categories")
                                .contentType("application/json")
                                .content("""
                                        {
                                          "name": "",
                                          "type": "EXPENSE"
                                        }
                                        """)
                )
                .andExpect(status().isBadRequest());

        verify(categoryService, never())
                .createCategory(any());
    }

    @Test
    void shouldRejectCreateWhenTypeIsMissing()
            throws Exception {

        mockMvc.perform(
                        post("/api/categories")
                                .contentType("application/json")
                                .content("""
                                        {
                                          "name": "Pet Care"
                                        }
                                        """)
                )
                .andExpect(status().isBadRequest());

        verify(categoryService, never())
                .createCategory(any());
    }

    @Test
    void shouldRejectUpdateWhenNameIsBlank()
            throws Exception {

        mockMvc.perform(
                        put("/api/categories/{id}", 100L)
                                .contentType("application/json")
                                .content("""
                                        {
                                          "name": ""
                                        }
                                        """)
                )
                .andExpect(status().isBadRequest());

        verify(categoryService, never())
                .updateCategory(anyLong(), any());
    }

    @Test
    void shouldRejectInvalidCategoryType()
            throws Exception {

        mockMvc.perform(
                        post("/api/categories")
                                .contentType("application/json")
                                .content("""
                                        {
                                          "name": "Pet Care",
                                          "type": "INVALID"
                                        }
                                        """)
                )
                .andExpect(status().isBadRequest());

        verify(categoryService, never())
                .createCategory(any());
    }
}