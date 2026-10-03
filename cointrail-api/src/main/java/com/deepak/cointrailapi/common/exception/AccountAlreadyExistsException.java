package com.deepak.cointrailapi.common.exception;

public class AccountAlreadyExistsException extends RuntimeException{

    public AccountAlreadyExistsException(String message) {
        super(message);
    }
}
