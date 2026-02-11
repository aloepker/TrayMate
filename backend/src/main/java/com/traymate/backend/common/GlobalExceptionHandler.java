package com.traymate.backend.common;

import com.traymate.backend.auth.exception.AuthException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

/**
 * global exception handler for the entire application.
 * 
 * this class catches specific exceptions thrown anywhere
 * in the controllers/services and converts them into
 * consistent, readable HTTP responses.
 */

@RestControllerAdvice
public class GlobalExceptionHandler {

    /**
     * Handles authentication-related errors (login/register failures).
     *
     * Whenever an AuthException is thrown, this method:
     * - Builds a structured JSON error response
     * - Returns HTTP 401 (Unauthorized)
     */
    @ExceptionHandler(AuthException.class)
    public ResponseEntity<Map<String, Object>> handleAuthException(AuthException ex) {

        Map<String, Object> body = new HashMap<>();
        body.put("timestamp", Instant.now());
        body.put("status", HttpStatus.UNAUTHORIZED.value());
        body.put("error", "Unauthorized");
        body.put("message", ex.getMessage());

        return new ResponseEntity<>(body, HttpStatus.UNAUTHORIZED);
    }
}
