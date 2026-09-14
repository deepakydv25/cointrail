package com.deepak.cointrailapi.service;

import com.deepak.cointrailapi.dto.CreateExpenseRequest;
import com.deepak.cointrailapi.dto.ExpenseResponse;
import com.deepak.cointrailapi.dto.UpdateExpenseResponse;
import com.deepak.cointrailapi.entity.Expense;
import com.deepak.cointrailapi.entity.User;
import com.deepak.cointrailapi.enums.ExpenseCategory;
import com.deepak.cointrailapi.enums.Role;
import com.deepak.cointrailapi.exception.ExpenseNotFoundException;
import com.deepak.cointrailapi.repository.ExpenseRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class ExpenseServiceImplTest {

    @Mock
    private ExpenseRepository expenseRepository;

    @InjectMocks
    private ExpenseServiceImpl expenseService;

    @BeforeEach
    void setUpSecurityContext() {
        User user = new User();
        user.setId(1L);
        user.setEmail("user1@test.com");
        user.setRole(Role.USER);

        Authentication authentication = new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities());

        SecurityContextHolder.getContext().setAuthentication(authentication);
    }

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void getExpenseById_shouldReturnExpense_whenExpenseExists() {

        //Arrange
        Long expenseId = 1L;

        Expense expense = new Expense();
        expense.setId(expenseId);
        expense.setAmount(new BigDecimal("500.00"));
        expense.setCategory(ExpenseCategory.FOOD);
        expense.setDescription("Dinner Test");
        expense.setExpenseDate(LocalDate.of(2026, 9, 11));
        expense.setCreatedAt(LocalDateTime.now());
        expense.setUpdatedAt(LocalDateTime.now());

        when(expenseRepository.findByIdAndUserId(expenseId, 1L))
                .thenReturn(Optional.of(expense));

        //Act
        ExpenseResponse response = expenseService.getExpenseById(expenseId);

        //Assert
        assertNotNull(response);
        assertEquals(expenseId, response.getId());
        assertEquals(new BigDecimal("500.00"), response.getAmount());
        assertEquals(ExpenseCategory.FOOD, response.getCategory());
        assertEquals("Dinner Test", response.getDescription());
    }

    @Test
    void getExpenseById_shouldThrowException_whenExpenseDoesNotExist() {

        //Arrange
        Long expenseId = 999L;

        when(expenseRepository.findByIdAndUserId(expenseId, 1L))
            .thenReturn(Optional.empty());

        //Act & Assert
        ExpenseNotFoundException exception = assertThrows(
                ExpenseNotFoundException.class,
                () -> expenseService.getExpenseById(expenseId)
        );

        assertEquals("Expense not found with id: 999", exception.getMessage());
    }

    @Test
    void createExpense_shouldCreateAndReturnExpense() {

        //Arrange
        CreateExpenseRequest request = new CreateExpenseRequest();

        request.setAmount(new BigDecimal("500.00"));
        request.setCategory(ExpenseCategory.FOOD);
        request.setDescription("Dinner Test");
        request.setExpenseDate(LocalDate.of(2026, 9, 11));

        Expense savedExpense = new Expense();
        savedExpense.setId(1L);
        savedExpense.setAmount(request.getAmount());
        savedExpense.setCategory(request.getCategory());
        savedExpense.setDescription(request.getDescription());
        savedExpense.setExpenseDate(request.getExpenseDate());
        savedExpense.setCreatedAt(LocalDateTime.now());
        savedExpense.setUpdatedAt(LocalDateTime.now());

        when(expenseRepository.save(any(Expense.class)))
                .thenReturn(savedExpense);

        //Act
        ExpenseResponse response = expenseService.createExpense(request);

        //Assert
        assertNotNull(response);
        assertEquals(1L, response.getId());
        assertEquals(new BigDecimal("500.00"), response.getAmount());
        assertEquals(ExpenseCategory.FOOD, response.getCategory());
        assertEquals("Dinner Test", response.getDescription());
        verify(expenseRepository).save(any(Expense.class));
    }

    @Test
    void getAllExpenses_shouldReturnPageOfExpenses_whenCategoryIsNull() {

        //Arrange
        Expense expense = new Expense();
        expense.setId(1L);
        expense.setAmount(new BigDecimal("500.00"));
        expense.setCategory(ExpenseCategory.FOOD);
        expense.setDescription("Dinner Test");
        expense.setExpenseDate(LocalDate.of(2026, 9, 11));
        expense.setCreatedAt(LocalDateTime.now());
        expense.setUpdatedAt(LocalDateTime.now());

        Pageable pageable = PageRequest.of(0, 10);

        Page<Expense> expensePage = new PageImpl<>(
                List.of(expense),
                pageable,
                1
        );

        when(expenseRepository.findAll(any(Specification.class),
                eq(pageable))).thenReturn(expensePage);

        //Act
        Page<ExpenseResponse> response = expenseService.getAllExpenses(null, pageable);

        //Assert
        assertNotNull(response);
        assertEquals(1, response.getTotalElements());
        assertEquals(1, response.getContent().size());

        ExpenseResponse expenseResponse = response.getContent().get(0);

        assertEquals(1L, expenseResponse.getId());
        assertEquals(new BigDecimal("500.00"), expenseResponse.getAmount());
        assertEquals(ExpenseCategory.FOOD, expenseResponse.getCategory());
        assertEquals("Dinner Test", expenseResponse.getDescription());

        verify(expenseRepository).findAll(any(Specification.class), eq(pageable));
    }

    @Test
    void getAllExpenses_shouldReturnFilteredExpenses_whenCategoryIsProvided() {

        //Arrange
        Expense expense = new Expense();
        expense.setId(1L);
        expense.setAmount(new BigDecimal("500.00"));
        expense.setCategory(ExpenseCategory.FOOD);
        expense.setDescription("Dinner Test");
        expense.setExpenseDate(LocalDate.of(2026, 9, 11));
        expense.setCreatedAt(LocalDateTime.now());
        expense.setUpdatedAt(LocalDateTime.now());

        Pageable pageable = PageRequest.of(0, 10);

        Page<Expense> expensePage = new PageImpl<>(
                List.of(expense),
                pageable,
                1
        );

        when(expenseRepository.findAll(any(Specification.class), eq(pageable))).thenReturn(expensePage);

        //Act
        Page<ExpenseResponse> response =
                expenseService.getAllExpenses(
                        ExpenseCategory.FOOD,
                        pageable
                );

        //Assert
        assertNotNull(response);
        assertEquals(1, response.getTotalElements());

        ExpenseResponse expenseResponse = response.getContent().get(0);

        assertEquals(ExpenseCategory.FOOD, expenseResponse.getCategory());

        verify(expenseRepository).findAll(any(Specification.class), eq(pageable));
    }

    @Test
    void updateExpense_shouldUpdateAndReturnExpense_whenExpenseExists() {

        //Arrange
        Long expenseId = 1L;

        Expense existingExpense = new Expense();
        existingExpense.setId(expenseId);
        existingExpense.setAmount(new BigDecimal("500.00"));
        existingExpense.setCategory(ExpenseCategory.FOOD);
        existingExpense.setDescription("Dinner Test");
        existingExpense.setExpenseDate(LocalDate.of(2026, 9, 11));
        existingExpense.setCreatedAt(LocalDateTime.now());
        existingExpense.setUpdatedAt(LocalDateTime.now());

        UpdateExpenseResponse request = new UpdateExpenseResponse();
        request.setAmount(new BigDecimal("800.00"));
        request.setCategory(ExpenseCategory.SHOPPING);
        request.setDescription("Shoes");
        request.setExpenseDate(LocalDate.of(2026, 9, 11));

        when(expenseRepository.findByIdAndUserId(expenseId, 1L))
                .thenReturn(Optional.of(existingExpense));

        when(expenseRepository.save(any(Expense.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        //Act
        ExpenseResponse response = expenseService.updateExpense(expenseId, request);

        //Assert
        assertNotNull(response);
        assertEquals(expenseId, response.getId());
        assertEquals(new BigDecimal("800.00"), response.getAmount());
        assertEquals(ExpenseCategory.SHOPPING, response.getCategory());
        assertEquals("Shoes", response.getDescription());
        assertEquals(LocalDate.of(2026, 9, 11), response.getExpenseDate());


        verify(expenseRepository).findByIdAndUserId(expenseId, 1L);
        verify(expenseRepository).save(existingExpense);
    }

    @Test
    void updateExpense_shouldThrowException_whenExpenseDoesNotExist() {

        //Arrange
        Long expenseId = 999L;

        UpdateExpenseResponse request = new UpdateExpenseResponse();
        request.setAmount(new BigDecimal("800.00"));
        request.setCategory(ExpenseCategory.SHOPPING);
        request.setDescription("Shoes");
        request.setExpenseDate(LocalDate.of(2026, 9, 11));

        when(expenseRepository.findByIdAndUserId(expenseId, 1L))
                .thenReturn(Optional.empty());

        //Act & Assert
        ExpenseNotFoundException exception =
                assertThrows(ExpenseNotFoundException.class,
                        () -> expenseService.updateExpense(expenseId, request));
        assertEquals("Expense not found with id: 999", exception.getMessage());

        verify(expenseRepository).findByIdAndUserId(expenseId, 1L);
        verify(expenseRepository, never()).save(any(Expense.class));
    }

    @Test
    void deleteExpense_shouldDeleteExpense_whenExpenseExists() {

        //Arrange
        Long expenseId = 1L;

        Expense expense = new Expense();
        expense.setId(expenseId);
        expense.setAmount(new BigDecimal("500.00"));
        expense.setCategory(ExpenseCategory.FOOD);
        expense.setDescription("Dinner Test");
        expense.setExpenseDate(LocalDate.of(2026, 9, 11));
        expense.setCreatedAt(LocalDateTime.now());
        expense.setUpdatedAt(LocalDateTime.now());

        when(expenseRepository.findByIdAndUserId(expenseId, 1L))
                .thenReturn(Optional.of(expense));

        //Act
        expenseService.deleteExpense(expenseId);

        //Assert
        verify(expenseRepository).findByIdAndUserId(expenseId, 1L);
        verify(expenseRepository).delete(expense);
    }

    @Test
    void deleteExpense_shouldThrowException_whenExpenseDoesNotExist() {

        //Arrange
        Long expenseId = 999L;

        when(expenseRepository.findByIdAndUserId(expenseId,1L))
                .thenReturn(Optional.empty());

        //Act & Assert
        ExpenseNotFoundException exception = assertThrows(
                ExpenseNotFoundException.class,
                () -> expenseService.deleteExpense(expenseId)
        );

        assertEquals("Expense not found with id: 999", exception.getMessage());

        verify(expenseRepository).findByIdAndUserId(expenseId, 1L);
        verify(expenseRepository, never()).delete(any(Expense.class));
    }

}
