package com.deepak.cointrailapi.service;

import com.deepak.cointrailapi.dto.AuthResponse;
import com.deepak.cointrailapi.dto.LoginRequest;
import com.deepak.cointrailapi.dto.LoginResponse;
import com.deepak.cointrailapi.dto.RegisterRequest;
import com.deepak.cointrailapi.entity.User;
import com.deepak.cointrailapi.enums.Role;
import com.deepak.cointrailapi.exception.EmailAlreadyExistsException;
import com.deepak.cointrailapi.repository.UserRepository;
import com.deepak.cointrailapi.security.JwtService;
import jakarta.transaction.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class AuthServiceImpl implements AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthServiceImpl.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;

    public AuthServiceImpl(UserRepository userRepository, PasswordEncoder passwordEncoder, AuthenticationManager authenticationManager, JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
    }

    @Override
    @Transactional
    public AuthResponse register(RegisterRequest request){
        log.info("Registering user with email={}", request.getEmail());

        if(userRepository.existsByEmail(request.getEmail())) {
            throw new EmailAlreadyExistsException("User already exists with email: "+request.getEmail());
        }

        User user = new User();

        user.setName(request.getName());
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(Role.USER);

        LocalDateTime now = LocalDateTime.now();

        user.setCreatedAt(now);
        user.setUpdatedAt(now);

        User savedUser = userRepository.save(user);

        log.info("User registered successfully with id={}", savedUser.getId());

        return new AuthResponse(savedUser.getId(), savedUser.getName(), savedUser.getEmail(), savedUser.getRole().name());
    }

    @Override
    public LoginResponse login(LoginRequest request) {
        log.info("Login attempt for email={}", request.getEmail());

        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getEmail(),
                        request.getPassword()
                )
        );

        User user = (User) authentication.getPrincipal();

        String token = jwtService.generateToken(user);

        log.info("User authenticated successfully with id={}", user.getId());

        return new LoginResponse(token, "Bearer");
    }
}
