package com.deepak.cointrailapi.auth;

import com.deepak.cointrailapi.auth.dto.AuthResponse;
import com.deepak.cointrailapi.auth.dto.LoginRequest;
import com.deepak.cointrailapi.auth.dto.LoginResponse;
import com.deepak.cointrailapi.auth.dto.RegisterRequest;

public interface AuthService {
    AuthResponse register(RegisterRequest request);

    LoginResponse login(LoginRequest request);
}
