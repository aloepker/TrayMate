package com.traymate.backend.auth.controller;


import com.traymate.backend.auth.dto.*;
import com.traymate.backend.auth.service.AuthService;

import lombok.RequiredArgsConstructor;

import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor

public class AuthController {

    private final AuthService authService;

    /**
     *register a new user.
     *
     * access:
     * - Restricted to users with ROLE_ADMIN (enforced in SecurityConfig)
     *
     * flow:
     * - receives user details from request body
     * - creates a new user in the database
     * - returns a JWT token for the created user
     */
    @PostMapping("/register") //only ADMIN can call this
    public AuthResponse register(@RequestBody RegisterRequest req) {
        return authService.register(req);
    }

    /**
     * login endpoint
     *
     * access:
     * - public (no authentication required)
     *
     * flow:
     * - validates email and password
     * - if valid, returns a JWT token
     * - token is used for accessing protected endpoints
     */
    @PostMapping("/login")
    public AuthResponse login(@RequestBody LoginRequest req) {
        return authService.login(req);
    }
}
