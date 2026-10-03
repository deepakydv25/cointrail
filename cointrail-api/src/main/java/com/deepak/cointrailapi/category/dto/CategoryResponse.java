package com.deepak.cointrailapi.category.dto;

import com.deepak.cointrailapi.category.CategoryType;

import java.time.LocalDateTime;

public record CategoryResponse(

        Long id,
        String name,
        CategoryType type,
        boolean system,
        boolean active,
        LocalDateTime createdAt,
        LocalDateTime updatedAt

) {
}