package com.thepersonae.service;

import com.thepersonae.domain.AccountRole;
import com.thepersonae.domain.AccountStatus;
import com.thepersonae.domain.AccessToken;
import com.thepersonae.domain.AgePolicy;
import com.thepersonae.domain.PasswordPolicy;
import com.thepersonae.domain.TokenPurpose;
import com.thepersonae.domain.UserAccount;
import com.thepersonae.repository.AccessTokenRepository;
import com.thepersonae.repository.UserAccountRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;

@Service
public class AuthService {

    private final UserAccountRepository users;
    private final AccessTokenRepository tokens;
    private final PasswordEncoder encoder;
    private final FileStorageService storage;
    private final EmailService email;
    private final TokenService tokenService;
    private final AuditService audit;

    public AuthService(
            UserAccountRepository users,
            AccessTokenRepository tokens,
            PasswordEncoder encoder,
            FileStorageService storage,
            EmailService email,
            TokenService tokenService,
            AuditService audit
    ) {
        this.users = users;
        this.tokens = tokens;
        this.encoder = encoder;
        this.storage = storage;
        this.email = email;
        this.tokenService = tokenService;
        this.audit = audit;
    }

    @Transactional
    public UserAccount register(
            String firstName,
            String lastName,
            String emailAddress,
            LocalDate birthDate,
            String phone,
            String city,
            String state,
            String country,
            boolean contactAuthorized,
            String travelLocations,
            String locale,
            MultipartFile document
    ) {
        validateIdentity(firstName, lastName, emailAddress, birthDate, phone, city, state, country, contactAuthorized);
        if (users.existsByEmailIgnoreCase(emailAddress)) {
            throw new ApiException(HttpStatus.CONFLICT, "EMAIL_TAKEN", "This email already has a request");
        }
        if (document == null || document.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "DOCUMENT_REQUIRED", "A selfie with your document is required");
        }
        UserAccount user = baseUser(firstName, lastName, emailAddress, birthDate, phone, city, state, country, contactAuthorized, travelLocations, locale);
        user.setDocumentPath(storage.store(document, "documents"));
        user.setRole(AccountRole.USER);
        user.setStatus(AccountStatus.PENDING_REVIEW);
        user.setMemberCode(nextCode());
        users.save(user);
        email.sendAwaitingApproval(user);
        audit.record("REGISTRATION", user.getEmail(), "PENDING");
        return user;
    }

    @Transactional
    public UserAccount login(String emailAddress, String password) {
        UserAccount user = users.findByEmailIgnoreCase(emailAddress.trim())
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Email or password is not valid"));
        if (user.getStatus() == AccountStatus.PENDING_REVIEW) {
            throw new ApiException(HttpStatus.FORBIDDEN, "PENDING_APPROVAL", "This request is still under review");
        }
        if (user.getStatus() == AccountStatus.REJECTED) {
            throw new ApiException(HttpStatus.FORBIDDEN, "REJECTED", "This request was not accepted");
        }
        if (user.getStatus() == AccountStatus.DISABLED) {
            throw new ApiException(HttpStatus.FORBIDDEN, "ACCOUNT_DISABLED", "This membership is disabled");
        }
        if (user.getStatus() == AccountStatus.INVITED || user.getPasswordHash() == null) {
            throw new ApiException(HttpStatus.FORBIDDEN, "PASSWORD_NOT_SET", "Create your password from the private link");
        }
        if (!encoder.matches(password, user.getPasswordHash())) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Email or password is not valid");
        }
        audit.record("LOGIN", user.getEmail(), "OK");
        return user;
    }

    @Transactional
    public void forgotPassword(String emailAddress) {
        users.findByEmailIgnoreCase(emailAddress.trim()).ifPresent(user -> {
            if (user.getStatus() == AccountStatus.ACTIVE && user.getPasswordHash() != null) {
                AccessToken token = tokenService.issue(user, TokenPurpose.RESET, Duration.ofHours(4));
                token.setEmailStatus(email.sendAccessLink(user, tokenService.link(token), true));
                tokens.save(token);
                audit.record("PASSWORD_RESET", user.getEmail(), token.getEmailStatus());
            } else if (user.getStatus() == AccountStatus.INVITED) {
                AccessToken token = tokenService.issue(user, TokenPurpose.INVITE, Duration.ofDays(7));
                token.setEmailStatus(email.sendAccessLink(user, tokenService.link(token), false));
                tokens.save(token);
                audit.record("INVITE_RESENT", user.getEmail(), token.getEmailStatus());
            }
        });
    }

    @Transactional(readOnly = true)
    public TokenView inspect(String raw) {
        return tokens.findByToken(raw)
                .filter(token -> token.isUsable(Instant.now()))
                .map(token -> new TokenView(true, token.getPurpose().name(), mask(token.getUser().getEmail()), token.getUser().getFirstName(), null))
                .orElseGet(() -> new TokenView(false, null, null, null, "INVALID"));
    }

    @Transactional
    public UserAccount setPassword(String raw, String password) {
        String violation = PasswordPolicy.violation(password);
        if (violation != null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "WEAK_PASSWORD", "Use at least 8 characters with a letter and a number");
        }
        AccessToken token = tokens.findByToken(raw)
                .filter(item -> item.isUsable(Instant.now()))
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "TOKEN_INVALID", "This link is no longer valid"));
        UserAccount user = token.getUser();
        if (user.getStatus() == AccountStatus.DISABLED || user.getStatus() == AccountStatus.REJECTED || user.getStatus() == AccountStatus.PENDING_REVIEW) {
            throw new ApiException(HttpStatus.FORBIDDEN, "ACCOUNT_DISABLED", "This membership cannot set a password yet");
        }
        user.setPasswordHash(encoder.encode(password));
        user.setStatus(AccountStatus.ACTIVE);
        token.setUsedAt(Instant.now());
        audit.record("PASSWORD_SET", user.getEmail(), "ACTIVE");
        return user;
    }

    public UserAccount requireUser(Object principal) {
        if (principal instanceof UserAccount user) {
            return user;
        }
        throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED", "Authentication required");
    }

    private void validateIdentity(
            String firstName,
            String lastName,
            String emailAddress,
            LocalDate birthDate,
            String phone,
            String city,
            String state,
            String country,
            boolean contactAuthorized
    ) {
        if (blank(firstName) || blank(lastName) || blank(emailAddress) || blank(phone) || blank(city) || blank(state) || blank(country)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION", "Fill in every required field");
        }
        if (!emailAddress.contains("@")) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION", "Enter a valid email");
        }
        if (!AgePolicy.isAdult(birthDate, LocalDate.now(ZoneOffset.UTC))) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "UNDERAGE", "Membership is reserved for adults aged 18 or older");
        }
        if (!contactAuthorized) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "CONTACT_REQUIRED", "Contact authorization is required");
        }
    }

    UserAccount baseUser(
            String firstName,
            String lastName,
            String emailAddress,
            LocalDate birthDate,
            String phone,
            String city,
            String state,
            String country,
            boolean contactAuthorized,
            String travelLocations,
            String locale
    ) {
        validateIdentity(firstName, lastName, emailAddress, birthDate, phone, city, state, country, contactAuthorized);
        UserAccount user = new UserAccount();
        user.setFirstName(firstName.trim());
        user.setLastName(lastName.trim());
        user.setEmail(emailAddress.trim().toLowerCase());
        user.setBirthDate(birthDate);
        user.setPhone(phone.trim());
        user.setCity(city.trim());
        user.setState(state.trim());
        user.setCountry(country.trim());
        user.setContactAuthorized(contactAuthorized);
        user.setTravelLocations(blank(travelLocations) ? null : travelLocations.trim());
        user.setLocale(locale != null && locale.startsWith("en") ? "en" : "pt");
        return user;
    }

    String nextCode() {
        long sequence = users.count() + 1;
        return "TP-" + String.format("%04d", sequence);
    }

    private boolean blank(String value) {
        return value == null || value.isBlank();
    }

    private String mask(String emailAddress) {
        int at = emailAddress.indexOf('@');
        if (at <= 1) {
            return "***";
        }
        return emailAddress.charAt(0) + "***" + emailAddress.substring(at);
    }

    public record TokenView(boolean valid, String purpose, String emailHint, String firstName, String reason) {
    }
}
