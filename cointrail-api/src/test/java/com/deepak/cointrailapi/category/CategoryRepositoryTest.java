package com.deepak.cointrailapi.category;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;

import java.util.List;
import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
public class CategoryRepositoryTest {

    @Autowired
    private CategoryRepository categoryRepository;

    @Test
    void shouldLoadSeededSystemCategories() {
        List<Category> categories = categoryRepository.findAll();

        assertThat(categories).hasSize(15);
    }


    @Test
    void shouldContainExpenseAndIncomeCategories() {
        List<Category> categories = categoryRepository.findAll();

        assertThat(categories)
                .anyMatch(category ->
                        category.getName().equals("Food")
                                && category.getType() == CategoryType.EXPENSE);

        assertThat(categories)
                .anyMatch(category ->
                        category.getName().equals("Salary")
                                && category.getType() == CategoryType.INCOME);
    }

    @Test
    void systemCategoriesShouldNotBelongToAUser() {

        List<Category> categories = categoryRepository.findAll();

        assertThat(categories)
                .allMatch(category ->
                        category.isSystem()
                                && category.isActive()
                                && category.getUser() == null);
    }
}
