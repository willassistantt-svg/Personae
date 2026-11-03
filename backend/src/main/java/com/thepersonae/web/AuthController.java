package com.thepersonae.web;

import com.thepersonae.config.AppProperties;
import com.thepersonae.config.JwtAuthFilter;
import com.thepersonae.config.JwtService;
import com.thepersonae.domain.UserAccount;
import com.thepersonae.service.AuthService;
import com.thepersonae.web.dto.Presenter;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.Map;

@RestController
public class AuthController {

    private final AuthService auth;
    private final JwtService jwt;
    private final AppProperties properties;
    private final Presenter presenter;

    public AuthController(AuthService auth, JwtService jwt, AppProperties properties, Presenter presenter) {
        this.auth = auth;
        this.jwt = jwt;
        this.properties = properties;
        this.presenter = presenter;
    }

    @PostMapping("/api/auth/register")
    public Map<String, String> register(
            @RequestParam String firstName,
            @RequestParam String lastName,
            @RequestParam String email,
            @RequestParam String birthDate,
            @RequestParam String phone,
            @RequestParam String city,
            @RequestParam String state,
            @RequestParam String country,
            @RequestParam boolean contactAuthorized,
            @RequestParam(required = false) String travelLocations,
            @RequestParam(defaultValue = "pt") String locale,
            @RequestParam("document") MultipartFile document
    ) {
        auth.register(firstName, lastName, email, LocalDate.parse(birthDate), phone, city, state, country, contactAuthorized, travelLocations, locale, document);
        return Map.of("status", "PENDING_REVIEW");
    }

    @PostMapping("/api/auth/login")
    public Presenter.SessionUser login(@RequestBody LoginRequest request, HttpServletResponse response) {
        UserAccount user = auth.login(request.email(), request.password());
        writeCookie(response, jwt.issue(user.getId(), request.remember()), jwt.maxAgeSeconds(request.remember()));
        return presenter.session(user);
    }

    @PostMapping("/api/auth/logout")
    public ResponseEntity<Void> logout(HttpServletResponse response) {
        writeCookie(response, "", 0);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/api/auth/me")
    public Presenter.SessionUser me(@AuthenticationPrincipal UserAccount user) {
        return presenter.session(auth.requireUser(user));
    }

    @PostMapping("/api/auth/forgot-password")
    public Map<String, Boolean> forgot(@RequestBody EmailRequest request) {
        auth.forgotPassword(request.email());
        return Map.of("accepted", true);
    }

    @GetMapping("/api/auth/tokens/{token}")
    public AuthService.TokenView inspect(@PathVariable String token) {
        return auth.inspect(token);
    }

    @PostMapping("/api/auth/set-password")
    public Presenter.SessionUser setPassword(@RequestBody PasswordRequest request, HttpServletResponse response) {
        UserAccount user = auth.setPassword(request.token(), request.password());
        writeCookie(response, jwt.issue(user.getId(), false), jwt.maxAgeSeconds(false));
        return presenter.session(user);
    }

    private void writeCookie(HttpServletResponse response, String value, long maxAge) {
        ResponseCookie cookie = ResponseCookie.from(JwtAuthFilter.COOKIE, value)
                .httpOnly(true)
                .path("/")
                .sameSite("Lax")
                .secure(properties.getCookie().isSecure())
                .maxAge(maxAge)
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    public record LoginRequest(String email, String password, boolean remember) {
    }

    public record EmailRequest(String email) {
    }

    public record PasswordRequest(String token, String password) {
    }
}
