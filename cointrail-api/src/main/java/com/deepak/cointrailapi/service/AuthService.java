package com.deepak.cointrailapi.service;

import com.deepak.cointrailapi.dto.AuthResponse;
import com.deepak.cointrailapi.dto.LoginRequest;
import com.deepak.cointrailapi.dto.LoginResponse;
import com.deepak.cointrailapi.dto.RegisterRequest;

public interface AuthService {
    AuthResponse register(RegisterRequest request);

    LoginResponse login(LoginRequest request);
}
