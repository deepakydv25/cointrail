package com.deepak.cointrailapi.category;

import com.deepak.cointrailapi.category.dto.CategoryResponse;
import com.deepak.cointrailapi.category.dto.CreateCategoryRequest;
import com.deepak.cointrailapi.category.dto.UpdateCategoryRequest;

import java.util.List;

public interface CategoryService {

    CategoryResponse createCategory(CreateCategoryRequest request);

    List<CategoryResponse> getCategories();

    CategoryResponse getCategory(Long id);

    CategoryResponse updateCategory(
            Long id,
            UpdateCategoryRequest request
    );

    void deactivateCategory(Long id);
}