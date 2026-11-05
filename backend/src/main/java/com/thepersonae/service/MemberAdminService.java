package com.thepersonae.service;

import com.thepersonae.domain.AccountRole;
import com.thepersonae.domain.AccountStatus;
import com.thepersonae.domain.AccessToken;
import com.thepersonae.domain.TokenPurpose;
import com.thepersonae.domain.UserAccount;
import com.thepersonae.repository.AccessTokenRepository;
import com.thepersonae.repository.UserAccountRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

@Service
public class MemberAdminService {

    private final UserAccountRepository users;
    private final AccessTokenRepository tokens;
    private final AuthService auth;
    private final FileStorageService storage;
    private final EmailService email;
    private final TokenService tokenService;
    private final AuditService audit;
    private final ChatHub chatHub;

    public MemberAdminService(
            UserAccountRepository users,
            AccessTokenRepository tokens,
            AuthService auth,
            FileStorageService storage,
            EmailService email,
            TokenService tokenService,
            AuditService audit,
            ChatHub chatHub
    ) {
        this.users = users;
        this.tokens = tokens;
        this.auth = auth;
        this.storage = storage;
        this.email = email;
        this.tokenService = tokenService;
        this.audit = audit;
        this.chatHub = chatHub;
    }

    @Transactional(readOnly = true)
    public List<UserAccount> list(AccountStatus status) {
        if (status == null) {
            return users.findAllByOrderByCreatedAtDesc();
        }
        return users.findByStatusOrderByCreatedAtDesc(status);
    }

    @Transactional(readOnly = true)
    public UserAccount get(java.util.UUID id) {
        return users.findById(id).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Member not found"));
    }

    @Transactional
    public IssuedLink createDirect(
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
            MultipartFile document,
            boolean sendEmail
    ) {
        if (users.existsByEmailIgnoreCase(emailAddress)) {
            throw new ApiException(HttpStatus.CONFLICT, "EMAIL_TAKEN", "This email already has a request");
        }
        UserAccount user = auth.baseUser(firstName, lastName, emailAddress, birthDate, phone, city, state, country, contactAuthorized, travelLocations, locale);
        if (document != null && !document.isEmpty()) {
            user.setDocumentPath(storage.store(document, "documents"));
        }
        user.setRole(AccountRole.USER);
        user.setStatus(AccountStatus.INVITED);
        user.setMemberCode(auth.nextCode());
        users.save(user);
        audit.record("DIRECT_REGISTRATION", user.getEmail(), "INVITED");
        return issue(user, TokenPurpose.INVITE, Duration.ofDays(7), sendEmail, false);
    }

    @Transactional
    public IssuedLink approve(java.util.UUID id, boolean sendEmail) {
        UserAccount user = get(id);
        if (user.getRole() == AccountRole.ADMIN) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_STATE", "The house account is already inside");
        }
        if (user.getStatus() != AccountStatus.PENDING_REVIEW && user.getStatus() != AccountStatus.REJECTED) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_STATE", "Only a request under review can be accepted");
        }
        user.setStatus(AccountStatus.INVITED);
        audit.record("APPROVAL", user.getEmail(), "INVITED");
        return issue(user, TokenPurpose.INVITE, Duration.ofDays(7), sendEmail, false);
    }

    @Transactional
    public UserAccount reject(java.util.UUID id) {
        UserAccount user = get(id);
        if (user.getStatus() != AccountStatus.PENDING_REVIEW) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_STATE", "Only a request under review can be declined");
        }
        user.setStatus(AccountStatus.REJECTED);
        audit.record("REJECTION", user.getEmail(), "REJECTED");
        disconnectAfterCommit(user);
        return user;
    }

    @Transactional
    public UserAccount disable(java.util.UUID id, UserAccount actor) {
        UserAccount user = get(id);
        guardSelf(user, actor);
        user.setStatus(AccountStatus.DISABLED);
        audit.record("MEMBER_DISABLED", user.getEmail(), "DISABLED");
        disconnectAfterCommit(user);
        return user;
    }

    @Transactional
    public UserAccount enable(java.util.UUID id) {
        UserAccount user = get(id);
        if (user.getRole() == AccountRole.ADMIN) {
            user.setStatus(AccountStatus.ACTIVE);
        } else if (user.getPasswordHash() == null) {
            user.setStatus(AccountStatus.INVITED);
        } else {
            user.setStatus(AccountStatus.ACTIVE);
        }
        audit.record("MEMBER_ENABLED", user.getEmail(), user.getStatus().name());
        return user;
    }

    @Transactional
    public void delete(java.util.UUID id, UserAccount actor) {
        UserAccount user = get(id);
        guardSelf(user, actor);
        if (user.getRole() == AccountRole.ADMIN) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_STATE", "The house account stays");
        }
        storage.delete(user.getDocumentPath());
        String emailAddress = user.getEmail();
        users.delete(user);
        audit.record("MEMBER_REMOVED", emailAddress, "REMOVED");
        disconnectAfterCommit(user);
    }

    @Transactional
    public IssuedLink resend(java.util.UUID id, boolean sendEmail) {
        UserAccount user = get(id);
        if (user.getStatus() == AccountStatus.DISABLED || user.getStatus() == AccountStatus.REJECTED || user.getStatus() == AccountStatus.PENDING_REVIEW) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_STATE", "Accept the request before sending a password link");
        }
        boolean reset = user.getStatus() == AccountStatus.ACTIVE && user.getPasswordHash() != null;
        TokenPurpose purpose = reset ? TokenPurpose.RESET : TokenPurpose.INVITE;
        Duration ttl = reset ? Duration.ofHours(4) : Duration.ofDays(7);
        if (!reset) {
            user.setStatus(AccountStatus.INVITED);
        }
        return issue(user, purpose, ttl, sendEmail, reset);
    }

    @Transactional(readOnly = true)
    public List<AccessToken> openLinks() {
        return tokens.findByUsedAtIsNullOrderByCreatedAtDesc().stream()
                .filter(token -> token.getExpiresAt().isAfter(Instant.now()))
                .toList();
    }

    @Transactional(readOnly = true)
    public AccessToken latestOpen(UserAccount user) {
        return tokens.findOpenByUser(user).stream()
                .filter(token -> token.isUsable(Instant.now()))
                .findFirst()
                .orElse(null);
    }

    private IssuedLink issue(UserAccount user, TokenPurpose purpose, Duration ttl, boolean sendEmail, boolean reset) {
        AccessToken token = tokenService.issue(user, purpose, ttl);
        String link = tokenService.link(token);
        String status = "SKIPPED";
        if (sendEmail) {
            status = email.sendAccessLink(user, link, reset);
        }
        token.setEmailStatus(status);
        tokens.save(token);
        audit.record(reset ? "PASSWORD_LINK" : "INVITE_SENT", user.getEmail(), status);
        return new IssuedLink(user, token, link);
    }

    private void disconnectAfterCommit(UserAccount user) {
        java.util.UUID id = user.getId();
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                chatHub.disconnect(id);
            }
        });
    }

    private void guardSelf(UserAccount user, UserAccount actor) {
        if (actor.getId().equals(user.getId())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_STATE", "Use another house account for this action");
        }
    }

    public record IssuedLink(UserAccount user, AccessToken token, String link) {
    }
}
