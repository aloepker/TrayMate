package com.traymate.backend.auth.dto;

import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

/**
 * Data Transfer Object (DTO) for login requests.
 *
 * purpose:
 * - receives login credentials from the client
 * - used by the /auth/login endpoint
 * - keeps controller method signatures clean
 */

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class LoginRequest {
    private String email;       //user email used as the username for authentication
    private String password;    //password provided by the user
}
