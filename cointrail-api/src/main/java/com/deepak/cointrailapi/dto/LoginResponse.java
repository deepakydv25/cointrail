package com.deepak.cointrailapi.dto;

public class LoginResponse {

    private String accessToken;
    private String tokenType;

    public LoginResponse() {
    }

    public LoginResponse(String accessToken, String tokenType) {
        this.accessToken = accessToken;
        this.tokenType = tokenType;
    }

    public String getAccessToken() {
        return accessToken;
    }

    public String getTokenType() {
        return tokenType;
    }
}
