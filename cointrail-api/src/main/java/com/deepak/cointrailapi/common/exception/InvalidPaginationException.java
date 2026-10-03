package com.deepak.cointrailapi.common.exception;

public class InvalidPaginationException extends RuntimeException{

    public InvalidPaginationException(String message){
        super(message);
    }
}
