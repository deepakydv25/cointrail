package com.deepak.cointrailapi.category;

import com.deepak.cointrailapi.category.dto.CategoryResponse;
import com.deepak.cointrailapi.category.dto.CreateCategoryRequest;
import com.deepak.cointrailapi.category.dto.UpdateCategoryRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/categories")
public class CategoryController {

    private final CategoryService categoryService;

    public CategoryController(CategoryService categoryService) {
        this.categoryService = categoryService;
    }

    @PostMapping
    public ResponseEntity<CategoryResponse> createCategory(
            @Valid @RequestBody CreateCategoryRequest request) {

        CategoryResponse response =
                categoryService.createCategory(request);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(response);
    }

    @GetMapping
    public ResponseEntity<List<CategoryResponse>> getCategories() {

        return ResponseEntity.ok(
                categoryService.getCategories()
        );
    }

    @GetMapping("/{id}")
    public ResponseEntity<CategoryResponse> getCategory(
            @PathVariable Long id) {

        return ResponseEntity.ok(
                categoryService.getCategory(id)
        );
    }

    @PutMapping("/{id}")
    public ResponseEntity<CategoryResponse> updateCategory(
            @PathVariable Long id,
            @Valid @RequestBody UpdateCategoryRequest request) {

        return ResponseEntity.ok(
                categoryService.updateCategory(id, request)
        );
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deactivateCategory(
            @PathVariable Long id) {

        categoryService.deactivateCategory(id);

        return ResponseEntity.noContent().build();
    }
}