package com.deepak.cointrailapi.common.validation;

import com.deepak.cointrailapi.common.exception.InvalidPaginationException;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Component;

import java.util.Set;

@Component
public class PageableValidator {

    private static final int MAX_PAGE_SIZE = 100;

    public void validate(
            Pageable pageable,
            Set<String> allowedSortFields) {

        if (pageable.getPageSize() > MAX_PAGE_SIZE) {
            throw new InvalidPaginationException(
                    "Page size must not exceed " + MAX_PAGE_SIZE
            );
        }

        pageable.getSort().forEach(order -> {

            if (!allowedSortFields.contains(order.getProperty())) {
                throw new InvalidPaginationException(
                        "Invalid sort field: " + order.getProperty()
                );
            }
        });
    }
}
