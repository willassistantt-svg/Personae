package com.thepersonae.web;

import com.thepersonae.domain.Availability;
import com.thepersonae.domain.CompanionProfile;
import com.thepersonae.domain.Tier;
import com.thepersonae.domain.UserAccount;
import com.thepersonae.service.AuthService;
import com.thepersonae.service.ProfileService;
import com.thepersonae.web.dto.Presenter;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
public class ProfileController {

    private final ProfileService profiles;
    private final AuthService auth;
    private final Presenter presenter;

    public ProfileController(ProfileService profiles, AuthService auth, Presenter presenter) {
        this.profiles = profiles;
        this.auth = auth;
        this.presenter = presenter;
    }

    @GetMapping("/api/profiles")
    public java.util.List<Presenter.CardView> list(
            @AuthenticationPrincipal UserAccount principal,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String availability,
            @RequestParam(required = false) String tier,
            @RequestParam(defaultValue = "pt") String locale
    ) {
        auth.requireUser(principal);
        var found = profiles.catalog(q, enumOrNull(availability, Availability.class), enumOrNull(tier, Tier.class));
        return presenter.cards(found, locale);
    }

    @GetMapping("/api/profiles/{id}")
    public Presenter.DetailView detail(
            @AuthenticationPrincipal UserAccount principal,
            @PathVariable UUID id,
            @RequestParam(defaultValue = "pt") String locale
    ) {
        auth.requireUser(principal);
        CompanionProfile profile = profiles.visible(id);
        return presenter.detail(profile, profiles.mediaFor(id), profiles.house(), locale);
    }

    private <T extends Enum<T>> T enumOrNull(String raw, Class<T> type) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        return Enum.valueOf(type, raw.trim().toUpperCase());
    }
}
