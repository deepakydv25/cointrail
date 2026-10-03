package com.deepak.cointrailapi.common.exception;

public class InvalidTransactionException extends RuntimeException{

    public  InvalidTransactionException(String message) {
        super(message);
    }
}
