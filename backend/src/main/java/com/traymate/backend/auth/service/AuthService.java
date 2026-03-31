package com.traymate.backend.auth.service;

import com.traymate.backend.auth.dto.*;
import com.traymate.backend.auth.model.User;
import com.traymate.backend.auth.repository.UserRepository;
import com.traymate.backend.auth.exception.AuthException;

import lombok.RequiredArgsConstructor;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;


/**
 * handles authentication-related logic such as
 * user registration and login.
 */

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository repo;
    private final PasswordEncoder encoder;
    private final JwtTokenService jwtService;

    /**
     * registers a new user and returns a JWT token.
     *
     * @param req data sent from the client during registration
     * return AuthResponse containing a JWT token
     */

    public AuthResponse register(RegisterRequest req) {

        // Normalize email
        String email = req.getEmail().toLowerCase().trim();

        // Enforce @traymate.com domain
        if (!email.endsWith("@traymate.com")) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Email must end with @traymate.com"
            );
        }

        // Enforce unique email
        if (repo.existsByEmail(email)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Email already exists"
            );
        }

        //build a new User entity from the request data
        User user = User.builder()
                .fullName(req.getFullName())
                .email(req.getEmail())
                .password(encoder.encode(req.getPassword()))
                .role(req.getRole())
                .build();

        //save the user to the database
        repo.save(user);

        //generate a JWT token using the user's email and return the tokens
        // String token = jwtService.generateToken(new HashMap<>(), user.getEmail());
        // return AuthResponse.builder().token(token).build();

        Map<String, Object> claims = new HashMap<>();
        claims.put("role", user.getRole());

        String token = jwtService.generateToken(claims, user.getEmail());
        return AuthResponse.builder().token(token).build();

    }

    /**
     * authenticates a user using email and password.
     *
     * @param req login credentials from the client
     * return AuthResponse containing a JWT token
     */
    public AuthResponse login(LoginRequest req) {

        //find the user by email
        User user = repo.findByEmail(req.getEmail())
                .orElseThrow(() -> new AuthException("Invalid email or password"));

        //compare raw password with encrypted password from database
        if (!encoder.matches(req.getPassword(), user.getPassword())) {
            throw new AuthException("Invalid email or password");
        }

        // Map<String, Object> claims = new HashMap<>();
        // claims.put("role", user.getRole()); //add roles in the token

        //generate a JWT token after successful authentication and return the tokens
        //String token = jwtService.generateToken(new HashMap<>(), user.getEmail());
        //return AuthResponse.builder().token(token).build();

        String token = jwtService.generateToken(
                new HashMap<>(),
                user.getEmail()
        );

        return AuthResponse.builder()
                .token(token)
                .role(user.getRole())   
                .build();
    }

}
