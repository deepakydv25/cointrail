package com.deepak.cointrailapi.common.exception;

public class BudgetAlreadyExistsException extends RuntimeException {

    public BudgetAlreadyExistsException(String message) {
        super(message);
    }

    public BudgetAlreadyExistsException(String message, Throwable cause) {
        super(message, cause);
    }
}
