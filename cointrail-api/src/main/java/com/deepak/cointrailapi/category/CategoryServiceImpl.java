package com.deepak.cointrailapi.category;

import com.deepak.cointrailapi.category.dto.CategoryResponse;
import com.deepak.cointrailapi.category.dto.CreateCategoryRequest;
import com.deepak.cointrailapi.category.dto.UpdateCategoryRequest;
import com.deepak.cointrailapi.common.exception.CategoryAlreadyExistsException;
import com.deepak.cointrailapi.common.exception.CategoryNotFoundException;
import com.deepak.cointrailapi.user.User;
import com.deepak.cointrailapi.user.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.dao.DataIntegrityViolationException;
import org.hibernate.exception.ConstraintViolationException;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Stream;

@Service
public class CategoryServiceImpl implements CategoryService {

    private final CategoryRepository categoryRepository;
    private final UserRepository userRepository;

    public CategoryServiceImpl(
            CategoryRepository categoryRepository,
            UserRepository userRepository) {

        this.categoryRepository = categoryRepository;
        this.userRepository = userRepository;
    }

    @Override
    @Transactional
    public CategoryResponse createCategory(
            CreateCategoryRequest request) {

        User user = getCurrentUser();

        String categoryName = request.name().trim();

        validateDuplicate(
                categoryName,
                request.type(),
                user.getId(),
                null
        );

        Category category = new Category();

        category.setName(categoryName);
        category.setType(request.type());

        // User-created category
        category.setSystem(false);
        category.setUser(user);
        category.setActive(true);

        LocalDateTime now = LocalDateTime.now();
        category.setCreatedAt(now);
        category.setUpdatedAt(now);

        return toResponse(
                saveWithDuplicateTranslation(category)
        );
    }

    @Override
    @Transactional(readOnly = true)
    public List<CategoryResponse> getCategories() {

        User user = getCurrentUser();

        List<Category> systemCategories =
                categoryRepository
                        .findBySystemTrueAndActiveTrueOrderByNameAsc();

        List<Category> userCategories =
                categoryRepository
                        .findByUserIdAndActiveTrueOrderByNameAsc(
                                user.getId()
                        );

        return Stream
                .concat(
                        systemCategories.stream(),
                        userCategories.stream()
                )
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public CategoryResponse getCategory(Long id) {

        User user = getCurrentUser();

        Category category = findAccessibleCategory(
                id,
                user.getId()
        );

        return toResponse(category);
    }

    @Override
    @Transactional
    public CategoryResponse updateCategory(Long id, UpdateCategoryRequest request) {

        User user = getCurrentUser();

        Category category =
                findOwnedCustomCategory(id, user.getId());

        String categoryName = request.name().trim();

        validateDuplicate(
                categoryName,
                category.getType(),
                user.getId(),
                id
        );

        category.setName(categoryName);
        category.setUpdatedAt(LocalDateTime.now());

        return toResponse(
                saveWithDuplicateTranslation(category)
        );
    }

    @Override
    @Transactional
    public void deactivateCategory(Long id) {

        User user = getCurrentUser();

        Category category =
                findOwnedCustomCategory(
                        id,
                        user.getId()
                );

        category.setActive(false);
        category.setUpdatedAt(LocalDateTime.now());

        categoryRepository.save(category);
    }

    private Category findAccessibleCategory(Long id, Long userId) {

        Category category = categoryRepository
                .findByIdAndActiveTrue(id)
                .orElseThrow(() ->
                        new CategoryNotFoundException(
                                "Category not found"
                        )
                );

        if (category.isSystem()) {
            return category;
        }

        if (category.getUser() != null
                && category.getUser().getId().equals(userId)) {
            return category;
        }

        throw new CategoryNotFoundException(
                "Category not found"
        );
    }

    private Category findOwnedCustomCategory(Long id, Long userId) {

        return categoryRepository
                .findByIdAndUserIdAndActiveTrue(
                        id,
                        userId
                )
                .orElseThrow(() ->
                        new CategoryNotFoundException(
                                "Category not found"
                        )
                );
    }

    private void validateDuplicate(String name, CategoryType type, Long userId, Long categoryId) {

        boolean systemDuplicate =
                categoryRepository
                        .existsByNameIgnoreCaseAndTypeAndSystemTrue(
                                name,
                                type
                        );

        boolean userDuplicate;

        if (categoryId == null) {

            userDuplicate =
                    categoryRepository
                            .existsByNameIgnoreCaseAndTypeAndUserId(
                                    name,
                                    type,
                                    userId
                            );

        } else {

            userDuplicate =
                    categoryRepository
                            .existsByNameIgnoreCaseAndTypeAndUserIdAndIdNot(
                                    name,
                                    type,
                                    userId,
                                    categoryId
                            );
        }

        if (systemDuplicate || userDuplicate) {
            throw new CategoryAlreadyExistsException(
                    "Category with this name and type already exists"
            );
        }
    }

    private User getCurrentUser() {

        Authentication authentication =
                SecurityContextHolder
                        .getContext()
                        .getAuthentication();

        String email = authentication.getName();

        return userRepository
                .findByEmail(email)
                .orElseThrow(() ->
                        new IllegalStateException(
                                "Authenticated user not found"
                        )
                );
    }

    private CategoryResponse toResponse(
            Category category) {

        return new CategoryResponse(
                category.getId(),
                category.getName(),
                category.getType(),
                category.isSystem(),
                category.isActive(),
                category.getCreatedAt(),
                category.getUpdatedAt()
        );
    }

    private Category saveWithDuplicateTranslation(Category category) {
        try {
            return categoryRepository.saveAndFlush(category);
        } catch (DataIntegrityViolationException exception) {
            for (Throwable cause = exception; cause != null; cause = cause.getCause()) {
                if (cause instanceof ConstraintViolationException violation
                        && "uq_categories_user_name_type".equals(violation.getConstraintName())
                        && "23505".equals(violation.getSQLState())) {
                    throw new CategoryAlreadyExistsException("Category with this name and type already exists", exception);
                }
            }
            throw exception;
        }
    }
}
