package com.traymate.backend.auth.service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import java.security.Key;
import java.util.Date;
import java.util.Map;

//service responsible for creating and validating JWT tokens
@Service
public class JwtTokenService {

    //secret key used to sign and verify JWT tokens
    private static final String SECRET =
            "this_is_a_very_long_secret_key_for_jwt_signing_123456";

    //token expiration time (24 hours in milliseconds)
    private static final long EXPIRATION = 86400000;

    //converts the secret string into a cryptographic signing key
    private Key getSigningKey() {
        return Keys.hmacShaKeyFor(SECRET.getBytes());
    }

    /**
     * generates a JWT token.
     *
     * @param claims  additional data to store in the token (optional)
     * @param subject the token owner (user email)
     * returns signed JWT token
     */
    public String generateToken(Map<String, Object> claims, String subject) {
        return Jwts.builder()
                .setClaims(claims)
                .setSubject(subject)        //identifies the user
                .setIssuedAt(new Date())    //token creation time
                .setExpiration(new Date(System.currentTimeMillis() + EXPIRATION))
                .signWith(getSigningKey(), SignatureAlgorithm.HS256)    //sign token
                .compact();
    }

    //extracts the email (subject) from the JWT token
    public String extractEmail(String token) {
        return extractAllClaims(token).getSubject();
    }

    //parses and validates the JWT token and returns all claims
    private Claims extractAllClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }
}
