package com.traymate.backend.auth.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import lombok.RequiredArgsConstructor;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    //JWT filter that validates tokens on every request
    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    
    /**
     * main Spring Security configuration
     *
     * defines:
     * - which endpoints are public
     * - which require authentication or roles
     * - where the JWT filter runs in the filter chain
     */
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .authorizeHttpRequests(auth -> auth
            .requestMatchers("/auth/login").permitAll()                     //login endpoint is public (anyone can attempt to login)
            .requestMatchers("/auth/register").hasAuthority("ROLE_ADMIN")   //only ADMIN users can register new users
            .anyRequest().authenticated()                                   //all other endpoints require authentication
        )

        .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
