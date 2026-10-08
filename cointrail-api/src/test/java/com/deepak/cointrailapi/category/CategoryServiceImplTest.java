package com.deepak.cointrailapi.category;

import com.deepak.cointrailapi.category.dto.CategoryResponse;
import com.deepak.cointrailapi.category.dto.CreateCategoryRequest;
import com.deepak.cointrailapi.category.dto.UpdateCategoryRequest;
import com.deepak.cointrailapi.common.exception.CategoryAlreadyExistsException;
import com.deepak.cointrailapi.common.exception.CategoryNotFoundException;
import com.deepak.cointrailapi.user.Role;
import com.deepak.cointrailapi.user.User;
import com.deepak.cointrailapi.user.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.dao.DataIntegrityViolationException;
import org.hibernate.exception.ConstraintViolationException;
import java.sql.SQLException;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CategoryServiceImplTest {

    @Mock
    private CategoryRepository categoryRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private CategoryServiceImpl categoryService;

    private User user;
    private Category customCategory;
    private Category systemCategory;

    @BeforeEach
    void setUp() {

        user = new User();
        user.setId(1L);
        user.setName("Test User");
        user.setEmail("test@test.com");
        user.setRole(Role.USER);

        customCategory = new Category();
        customCategory.setId(100L);
        customCategory.setName("Pet Care");
        customCategory.setType(CategoryType.EXPENSE);
        customCategory.setSystem(false);
        customCategory.setActive(true);
        customCategory.setUser(user);
        customCategory.setCreatedAt(LocalDateTime.now());
        customCategory.setUpdatedAt(LocalDateTime.now());

        systemCategory = new Category();
        systemCategory.setId(1L);
        systemCategory.setName("Food");
        systemCategory.setType(CategoryType.EXPENSE);
        systemCategory.setSystem(true);
        systemCategory.setActive(true);
        systemCategory.setUser(null);
        systemCategory.setCreatedAt(LocalDateTime.now());
        systemCategory.setUpdatedAt(LocalDateTime.now());

        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(
                        "test@test.com",
                        null,
                        List.of()
                )
        );

        when(userRepository.findByEmail("test@test.com"))
                .thenReturn(Optional.of(user));
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void shouldCreateCustomCategory() {

        CreateCategoryRequest request =
                new CreateCategoryRequest(
                        "Pet Care",
                        CategoryType.EXPENSE
                );

        when(categoryRepository
                .existsByNameIgnoreCaseAndTypeAndSystemTrue(
                        "Pet Care",
                        CategoryType.EXPENSE
                ))
                .thenReturn(false);

        when(categoryRepository
                .existsByNameIgnoreCaseAndTypeAndUserId(
                        "Pet Care",
                        CategoryType.EXPENSE,
                        1L
                ))
                .thenReturn(false);

        when(categoryRepository.saveAndFlush(any(Category.class)))
                .thenAnswer(invocation -> {
                    Category category = invocation.getArgument(0);
                    category.setId(100L);
                    return category;
                });

        CategoryResponse response =
                categoryService.createCategory(request);

        assertThat(response.id()).isEqualTo(100L);
        assertThat(response.name()).isEqualTo("Pet Care");
        assertThat(response.type())
                .isEqualTo(CategoryType.EXPENSE);
        assertThat(response.system()).isFalse();
        assertThat(response.active()).isTrue();

        verify(categoryRepository)
                .saveAndFlush(any(Category.class));
    }

    @Test
    void shouldTrimCategoryNameWhenCreating() {

        CreateCategoryRequest request =
                new CreateCategoryRequest(
                        "  Pet Care  ",
                        CategoryType.EXPENSE
                );

        when(categoryRepository
                .existsByNameIgnoreCaseAndTypeAndSystemTrue(
                        "Pet Care",
                        CategoryType.EXPENSE
                ))
                .thenReturn(false);

        when(categoryRepository
                .existsByNameIgnoreCaseAndTypeAndUserId(
                        "Pet Care",
                        CategoryType.EXPENSE,
                        1L
                ))
                .thenReturn(false);

        when(categoryRepository.saveAndFlush(any(Category.class)))
                .thenAnswer(invocation ->
                        invocation.getArgument(0));

        CategoryResponse response =
                categoryService.createCategory(request);

        assertThat(response.name()).isEqualTo("Pet Care");
    }

    @Test
    void shouldRejectDuplicateSystemCategory() {

        CreateCategoryRequest request =
                new CreateCategoryRequest(
                        "Food",
                        CategoryType.EXPENSE
                );

        when(categoryRepository
                .existsByNameIgnoreCaseAndTypeAndSystemTrue(
                        "Food",
                        CategoryType.EXPENSE
                ))
                .thenReturn(true);

        assertThatThrownBy(() ->
                categoryService.createCategory(request))
                .isInstanceOf(CategoryAlreadyExistsException.class)
                .hasMessage(
                        "Category with this name and type already exists"
                );

        verify(categoryRepository, never())
                .saveAndFlush(any(Category.class));
    }

    @Test
    void shouldRejectDuplicateUserCategory() {

        CreateCategoryRequest request =
                new CreateCategoryRequest(
                        "Pet Care",
                        CategoryType.EXPENSE
                );

        when(categoryRepository
                .existsByNameIgnoreCaseAndTypeAndSystemTrue(
                        "Pet Care",
                        CategoryType.EXPENSE
                ))
                .thenReturn(false);

        when(categoryRepository
                .existsByNameIgnoreCaseAndTypeAndUserId(
                        "Pet Care",
                        CategoryType.EXPENSE,
                        1L
                ))
                .thenReturn(true);

        assertThatThrownBy(() ->
                categoryService.createCategory(request))
                .isInstanceOf(CategoryAlreadyExistsException.class);

        verify(categoryRepository, never())
                .saveAndFlush(any(Category.class));
    }

    @Test
    void shouldReturnSystemAndCurrentUserCategories() {

        when(categoryRepository
                .findBySystemTrueAndActiveTrueOrderByNameAsc())
                .thenReturn(List.of(systemCategory));

        when(categoryRepository
                .findByUserIdAndActiveTrueOrderByNameAsc(1L))
                .thenReturn(List.of(customCategory));

        List<CategoryResponse> result =
                categoryService.getCategories();

        assertThat(result).hasSize(2);

        assertThat(result)
                .extracting(CategoryResponse::name)
                .containsExactly("Food", "Pet Care");
    }

    @Test
    void shouldGetSystemCategory() {

        when(categoryRepository.findByIdAndActiveTrue(1L))
                .thenReturn(Optional.of(systemCategory));

        CategoryResponse response =
                categoryService.getCategory(1L);

        assertThat(response.id()).isEqualTo(1L);
        assertThat(response.name()).isEqualTo("Food");
        assertThat(response.system()).isTrue();
    }

    @Test
    void shouldGetOwnCustomCategory() {

        when(categoryRepository.findByIdAndActiveTrue(100L))
                .thenReturn(Optional.of(customCategory));

        CategoryResponse response =
                categoryService.getCategory(100L);

        assertThat(response.id()).isEqualTo(100L);
        assertThat(response.name()).isEqualTo("Pet Care");
        assertThat(response.system()).isFalse();
    }

    @Test
    void shouldRejectAnotherUsersCustomCategory() {

        User anotherUser = new User();
        anotherUser.setId(2L);

        customCategory.setUser(anotherUser);

        when(categoryRepository.findByIdAndActiveTrue(100L))
                .thenReturn(Optional.of(customCategory));

        assertThatThrownBy(() ->
                categoryService.getCategory(100L))
                .isInstanceOf(CategoryNotFoundException.class)
                .hasMessage("Category not found");
    }

    @Test
    void shouldUpdateOwnCustomCategory() {

        UpdateCategoryRequest request =
                new UpdateCategoryRequest(
                        "Pets"
                );

        when(categoryRepository
                .findByIdAndUserIdAndActiveTrue(100L, 1L))
                .thenReturn(Optional.of(customCategory));

        when(categoryRepository
                .existsByNameIgnoreCaseAndTypeAndSystemTrue(
                        "Pets",
                        CategoryType.EXPENSE
                ))
                .thenReturn(false);

        when(categoryRepository
                .existsByNameIgnoreCaseAndTypeAndUserIdAndIdNot(
                        "Pets",
                        CategoryType.EXPENSE,
                        1L,
                        100L
                ))
                .thenReturn(false);

        when(categoryRepository.saveAndFlush(customCategory))
                .thenReturn(customCategory);

        CategoryResponse response =
                categoryService.updateCategory(100L, request);

        assertThat(response.name()).isEqualTo("Pets");
        assertThat(response.type())
                .isEqualTo(CategoryType.EXPENSE);

        verify(categoryRepository).saveAndFlush(customCategory);
    }

    @Test
    void shouldTrimCategoryNameWhenUpdating() {

        UpdateCategoryRequest request =
                new UpdateCategoryRequest("  Pets  ");

        when(categoryRepository
                .findByIdAndUserIdAndActiveTrue(100L, 1L))
                .thenReturn(Optional.of(customCategory));

        when(categoryRepository
                .existsByNameIgnoreCaseAndTypeAndSystemTrue(
                        "Pets",
                        CategoryType.EXPENSE
                ))
                .thenReturn(false);

        when(categoryRepository
                .existsByNameIgnoreCaseAndTypeAndUserIdAndIdNot(
                        "Pets",
                        CategoryType.EXPENSE,
                        1L,
                        100L
                ))
                .thenReturn(false);

        when(categoryRepository.saveAndFlush(customCategory))
                .thenReturn(customCategory);

        CategoryResponse response =
                categoryService.updateCategory(100L, request);

        assertThat(response.name()).isEqualTo("Pets");
        assertThat(response.type())
                .isEqualTo(CategoryType.EXPENSE);

        verify(categoryRepository)
                .existsByNameIgnoreCaseAndTypeAndSystemTrue(
                        "Pets",
                        CategoryType.EXPENSE
                );

        verify(categoryRepository)
                .existsByNameIgnoreCaseAndTypeAndUserIdAndIdNot(
                        "Pets",
                        CategoryType.EXPENSE,
                        1L,
                        100L
                );

        verify(categoryRepository).saveAndFlush(customCategory);
    }

    @Test
    void shouldRejectUpdatingToSystemCategoryDuplicate() {

        UpdateCategoryRequest request =
                new UpdateCategoryRequest(
                        "Food"
                );

        when(categoryRepository
                .findByIdAndUserIdAndActiveTrue(100L, 1L))
                .thenReturn(Optional.of(customCategory));

        when(categoryRepository
                .existsByNameIgnoreCaseAndTypeAndSystemTrue(
                        "Food",
                        CategoryType.EXPENSE
                ))
                .thenReturn(true);

        assertThatThrownBy(() ->
                categoryService.updateCategory(100L, request))
                .isInstanceOf(CategoryAlreadyExistsException.class);

        verify(categoryRepository, never())
                .saveAndFlush(any(Category.class));
    }

    @Test
    void shouldRejectUpdatingAnotherUsersCategory() {

        UpdateCategoryRequest request =
                new UpdateCategoryRequest(
                        "Pets"
                );

        when(categoryRepository
                .findByIdAndUserIdAndActiveTrue(100L, 1L))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() ->
                categoryService.updateCategory(100L, request))
                .isInstanceOf(CategoryNotFoundException.class)
                .hasMessage("Category not found");

        verify(categoryRepository, never())
                .saveAndFlush(any(Category.class));
    }

    @Test
    void shouldRejectUpdatingSystemCategory() {

        /*
         * System categories have user_id = null, therefore
         * ownership lookup must not return them.
         */
        when(categoryRepository
                .findByIdAndUserIdAndActiveTrue(1L, 1L))
                .thenReturn(Optional.empty());

        UpdateCategoryRequest request =
                new UpdateCategoryRequest(
                        "Updated Food"
                );

        assertThatThrownBy(() ->
                categoryService.updateCategory(1L, request))
                .isInstanceOf(CategoryNotFoundException.class);

        verify(categoryRepository, never())
                .saveAndFlush(any(Category.class));
    }

    @Test
    void shouldDeactivateOwnCustomCategory() {

        when(categoryRepository
                .findByIdAndUserIdAndActiveTrue(100L, 1L))
                .thenReturn(Optional.of(customCategory));

        when(categoryRepository.save(customCategory))
                .thenReturn(customCategory);

        categoryService.deactivateCategory(100L);

        assertThat(customCategory.isActive()).isFalse();

        verify(categoryRepository).save(customCategory);
    }

    @Test
    void shouldRejectDeactivatingSystemCategory() {

        when(categoryRepository
                .findByIdAndUserIdAndActiveTrue(1L, 1L))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() ->
                categoryService.deactivateCategory(1L))
                .isInstanceOf(CategoryNotFoundException.class);

        verify(categoryRepository, never())
                .save(any(Category.class));
    }

    @ParameterizedTest
    @CsvSource({"uq_categories_user_name_type,23505,true", "other_unique,23505,false", "uq_categories_user_name_type,23503,false",
            "uq_categories_user_name_type,23514,false", "uq_categories_user_name_type,22003,false", ",23505,false"})
    void translatesOnlyDomainUniqueViolationOnCreate(String name, String state, boolean duplicate) {
        DataIntegrityViolationException failure = new DataIntegrityViolationException("write failed",
                new RuntimeException(new ConstraintViolationException("constraint", new SQLException("database", state), "insert", name)));
        when(categoryRepository.saveAndFlush(any())).thenThrow(failure);
        if (duplicate) {
            assertThatThrownBy(() -> categoryService.createCategory(new CreateCategoryRequest("Race", CategoryType.EXPENSE))).isInstanceOf(CategoryAlreadyExistsException.class).hasMessage("Category with this name and type already exists").hasCause(failure);
        } else {
            assertThatThrownBy(() -> categoryService.createCategory(new CreateCategoryRequest("Race", CategoryType.EXPENSE))).isSameAs(failure);
        }
    }

    @Test
    void translatesUniqueViolationOnRenameAndRethrowsMissingMetadata() {
        when(categoryRepository.findByIdAndUserIdAndActiveTrue(100L, 1L)).thenReturn(Optional.of(customCategory));
        DataIntegrityViolationException failure = new DataIntegrityViolationException("write failed",
                new ConstraintViolationException("constraint", new SQLException("database", "23505"), "update", "uq_categories_user_name_type"));
        when(categoryRepository.saveAndFlush(any())).thenThrow(failure);
        assertThatThrownBy(() -> categoryService.updateCategory(100L, new UpdateCategoryRequest("Race"))).isInstanceOf(CategoryAlreadyExistsException.class).hasMessage("Category with this name and type already exists").hasCause(failure);
        DataIntegrityViolationException unknown = new DataIntegrityViolationException("unknown integrity failure");
        doThrow(unknown).when(categoryRepository).saveAndFlush(any());
        assertThatThrownBy(() -> categoryService.updateCategory(100L, new UpdateCategoryRequest("Race"))).isSameAs(unknown);
    }
}
