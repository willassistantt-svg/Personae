package com.thepersonae.config;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

@Service
public class JwtService {

    private final AppProperties properties;

    public JwtService(AppProperties properties) {
        this.properties = properties;
    }

    public String issue(UUID userId, boolean remember) {
        Instant now = Instant.now();
        Instant exp = remember
                ? now.plusSeconds(properties.getCookie().getRememberDays() * 24L * 3600L)
                : now.plusSeconds(properties.getJwt().getTtlHours() * 3600L);
        return Jwts.builder()
                .subject(userId.toString())
                .issuedAt(Date.from(now))
                .expiration(Date.from(exp))
                .signWith(key())
                .compact();
    }

    public long maxAgeSeconds(boolean remember) {
        return remember
                ? properties.getCookie().getRememberDays() * 24L * 3600L
                : properties.getJwt().getTtlHours() * 3600L;
    }

    public UUID parse(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(key())
                .build()
                .parseSignedClaims(token)
                .getPayload();
        return UUID.fromString(claims.getSubject());
    }

    private SecretKey key() {
        return Keys.hmacShaKeyFor(properties.getJwt().getSecret().getBytes(StandardCharsets.UTF_8));
    }
}
