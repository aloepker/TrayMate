package com.traymate.backend.auth.config;

import com.traymate.backend.auth.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * central configuration class for authentication-related beans
 *
 * used by Spring Security to:
 * - Load users from the database
 * - Encode and verify passwords
 * - Authenticate users during login
 */
@Configuration
@RequiredArgsConstructor
public class ApplicationConfig {

    //repository used to fetch users from the database
    private final UserRepository userRepository;

    //UserDetailsService tells Spring Security how to load a user during authentication.
    @Bean
    public UserDetailsService userDetailsService() {
        return username ->
                userRepository.findByEmail(username)
                        //if user is not found, authentication fails
                        .orElseThrow(() -> new RuntimeException("User not found"));
    }

    /**
     * password encoder used to:
     * - Hash passwords before saving to the database
     * - Compare raw passwords with hashed passwords during login
     *
     * BCrypt is secure and recommended by Spring Security
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    /**
     * AuthenticationManager performs authentication (verifies username & password)
     *
     * Spring Security automatically configures it using:
     * - UserDetailsService
     * - PasswordEncoder
     */
    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationConfiguration config
    ) throws Exception {
        return config.getAuthenticationManager();
    }
}

