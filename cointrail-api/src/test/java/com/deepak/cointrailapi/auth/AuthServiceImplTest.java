package com.deepak.cointrailapi.auth;

import com.deepak.cointrailapi.auth.dto.RegisterRequest;
import com.deepak.cointrailapi.common.exception.EmailAlreadyExistsException;
import com.deepak.cointrailapi.common.security.JwtService;
import com.deepak.cointrailapi.user.UserRepository;
import org.hibernate.exception.ConstraintViolationException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.sql.SQLException;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceImplTest {
    @Mock UserRepository users;
    @Mock PasswordEncoder encoder;
    @Mock AuthenticationManager authenticationManager;
    @Mock JwtService jwt;
    @InjectMocks AuthServiceImpl service;

    private RegisterRequest request() {
        RegisterRequest request = new RegisterRequest();
        request.setName("Race user");
        request.setEmail("race@test.com");
        request.setPassword("password123");
        return request;
    }

    @ParameterizedTest
    @CsvSource({"users_email_key,23505,true", "other_unique,23505,false", "users_email_key,23503,false",
            "users_email_key,23514,false", "users_email_key,22003,false", ",23505,false"})
    void translatesOnlyEmailUniqueViolation(String name, String state, boolean duplicate) {
        when(encoder.encode("password123")).thenReturn("encoded");
        DataIntegrityViolationException failure = new DataIntegrityViolationException("write failed",
                new RuntimeException(new ConstraintViolationException("constraint", new SQLException("database", state), "insert", name)));
        when(users.saveAndFlush(any())).thenThrow(failure);
        if (duplicate) {
            assertThatThrownBy(() -> service.register(request())).isInstanceOf(EmailAlreadyExistsException.class)
                    .hasMessage("User already exists with email: race@test.com").hasCause(failure);
        } else {
            assertThatThrownBy(() -> service.register(request())).isSameAs(failure);
        }
        verify(users).existsByEmail("race@test.com");
        verifyNoInteractions(authenticationManager, jwt);
    }

    @Test
    void rethrowsMissingConstraintMetadata() {
        when(encoder.encode("password123")).thenReturn("encoded");
        DataIntegrityViolationException failure = new DataIntegrityViolationException("unknown integrity failure");
        when(users.saveAndFlush(any())).thenThrow(failure);
        assertThatThrownBy(() -> service.register(request())).isSameAs(failure);
    }

    @Test
    void existingEmailStillUsesPrecheck() {
        when(users.existsByEmail("race@test.com")).thenReturn(true);
        assertThatThrownBy(() -> service.register(request())).isInstanceOf(EmailAlreadyExistsException.class)
                .hasMessage("User already exists with email: race@test.com");
        verify(users, never()).saveAndFlush(any());
        verifyNoInteractions(encoder);
    }
}
