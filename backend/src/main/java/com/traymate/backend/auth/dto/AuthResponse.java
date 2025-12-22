package com.traymate.backend.auth.dto;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

/**
 * Data Transfer Object (DTO) for authentication responses.
 *
 * purpose:
 * - used to send authentication results back to the client
 * - currently contains the JWT token after login or registration
 */

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AuthResponse {
    private String token;
}

