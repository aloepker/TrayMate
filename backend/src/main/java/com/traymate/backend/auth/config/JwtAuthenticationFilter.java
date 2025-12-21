package com.traymate.backend.auth.config;


import com.traymate.backend.auth.repository.UserRepository;
import com.traymate.backend.auth.service.JwtTokenService;

import jakarta.servlet.*;
import jakarta.servlet.http.*;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;

import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * JWT authentication filter: this filter runs once for every incoming HTTP request.
 * It checks for a JWT token, validates it, and sets the
 * authenticated user in Spring Security's context.
*/

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenService jwtService;
    private final UserRepository repo;

    //inject JWT service and user repository
    public JwtAuthenticationFilter(JwtTokenService jwtService, UserRepository repo) {
        this.jwtService = jwtService;
        this.repo = repo;
    }

    /**
     * skip JWT filtering for login endpoint
     *
     * login does not require a token because
     * the user does not have one yet
     */
    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return request.getRequestURI().equals("/auth/login");
    }

    /**
     * filter logic.
     *
     * - extract JWT from Authorization header
     * - validate token and extract user email
     * - load user from database
     * - set authentication in SecurityContext
     */
    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        //read Authorization header
        final String authHeader = request.getHeader("Authorization");

        //if no token or invalid format, continue without authentication
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        final String jwt = authHeader.substring(7);
        final String email = jwtService.extractEmail(jwt);

        //extract email from JWT
        repo.findByEmail(email).ifPresent(user -> {
            //only authenticate if not already authenticated
            if (SecurityContextHolder.getContext().getAuthentication() == null) {
                UsernamePasswordAuthenticationToken authToken =
                        new UsernamePasswordAuthenticationToken(
                                user,
                                null,
                                user.getAuthorities()
                        );

                authToken.setDetails(
                        new WebAuthenticationDetailsSource().buildDetails(request)
                );

                //store authentication in security context
                SecurityContextHolder.getContext().setAuthentication(authToken);
            }
        });

        //continue filter chain
        filterChain.doFilter(request, response);
    }
}

