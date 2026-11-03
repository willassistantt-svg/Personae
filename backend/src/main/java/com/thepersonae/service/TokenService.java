package com.thepersonae.service;

import com.thepersonae.config.AppProperties;
import com.thepersonae.domain.AccessToken;
import com.thepersonae.domain.TokenPurpose;
import com.thepersonae.domain.UserAccount;
import com.thepersonae.repository.AccessTokenRepository;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;

@Service
public class TokenService {

    private final AccessTokenRepository tokens;
    private final AppProperties properties;
    private final SecureRandom random = new SecureRandom();

    public TokenService(AccessTokenRepository tokens, AppProperties properties) {
        this.tokens = tokens;
        this.properties = properties;
    }

    public AccessToken issue(UserAccount user, TokenPurpose purpose, Duration ttl) {
        tokens.findByUserAndPurposeAndUsedAtIsNull(user, purpose).forEach(existing -> {
            existing.setUsedAt(Instant.now());
            tokens.save(existing);
        });
        AccessToken token = new AccessToken();
        token.setUser(user);
        token.setPurpose(purpose);
        token.setToken(randomToken());
        token.setExpiresAt(Instant.now().plus(ttl));
        return tokens.save(token);
    }

    public AccessToken issueWithValue(UserAccount user, TokenPurpose purpose, String value, Duration ttl) {
        AccessToken token = new AccessToken();
        token.setUser(user);
        token.setPurpose(purpose);
        token.setToken(value);
        token.setExpiresAt(Instant.now().plus(ttl));
        token.setEmailStatus("SKIPPED");
        return tokens.save(token);
    }

    public String link(AccessToken token) {
        String base = properties.getPublicUrl().replaceAll("/$", "");
        return base + "/set-password?token=" + token.getToken();
    }

    private String randomToken() {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        return HexFormat.of().formatHex(bytes);
    }
}
