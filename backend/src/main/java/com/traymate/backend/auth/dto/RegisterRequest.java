package com.traymate.backend.auth.dto;

import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

/**
 * Data Transfer Object (DTO) for user registration requests.
 *
 * purpose:
 * - receives new user information from the client
 * - used by the /auth/register endpoint
 * - keeps request structure clear and consistent
 */

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor

public class RegisterRequest {
    private String fullName;
    private String email;
    private String password;
    private String role;
}

