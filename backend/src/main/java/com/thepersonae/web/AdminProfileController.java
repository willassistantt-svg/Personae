package com.thepersonae.web;

import com.thepersonae.domain.Availability;
import com.thepersonae.domain.CompanionProfile;
import com.thepersonae.domain.Ethnicity;
import com.thepersonae.domain.Tier;
import com.thepersonae.service.ProfileAdminService;
import com.thepersonae.service.ProfileService;
import com.thepersonae.web.dto.Presenter;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@RestController
public class AdminProfileController {

    private final ProfileAdminService admin;
    private final ProfileService profiles;
    private final Presenter presenter;

    public AdminProfileController(ProfileAdminService admin, ProfileService profiles, Presenter presenter) {
        this.admin = admin;
        this.profiles = profiles;
        this.presenter = presenter;
    }

    @GetMapping("/api/admin/profiles")
    public List<Presenter.CardView> list(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String availability,
            @RequestParam(required = false) String tier,
            @RequestParam(defaultValue = "pt") String locale
    ) {
        var found = profiles.adminCatalog(q, enumOrNull(availability, Availability.class), enumOrNull(tier, Tier.class));
        return presenter.cards(found, locale, java.util.Set.of());
    }

    @GetMapping("/api/admin/profiles/{id}")
    public Presenter.DetailView get(@PathVariable UUID id, @RequestParam(defaultValue = "pt") String locale) {
        CompanionProfile profile = profiles.any(id);
        return presenter.detail(profile, profiles.mediaFor(id), false, profiles.house(), locale);
    }

    @PostMapping("/api/admin/profiles")
    public Presenter.DetailView create(
            @RequestParam String name,
            @RequestParam int age,
            @RequestParam String city,
            @RequestParam String descriptionPt,
            @RequestParam String descriptionEn,
            @RequestParam String email,
            @RequestParam String phone,
            @RequestParam int priceCents,
            @RequestParam(defaultValue = "BRL") String currency,
            @RequestParam String ethnicity,
            @RequestParam int heightCm,
            @RequestParam int weightKg,
            @RequestParam(required = false) String hair,
            @RequestParam(required = false) String eyes,
            @RequestParam(required = false) String languages,
            @RequestParam String availability,
            @RequestParam String tier,
            @RequestParam(defaultValue = "true") boolean visible,
            @RequestParam(value = "photos", required = false) List<MultipartFile> photos,
            @RequestParam(value = "video", required = false) MultipartFile video,
            @RequestParam(required = false) String videoLabel
    ) {
        CompanionProfile profile = admin.create(draft(name, age, city, descriptionPt, descriptionEn, email, phone, priceCents, currency, ethnicity, heightCm, weightKg, hair, eyes, languages, availability, tier, visible), photos, video, videoLabel);
        return presenter.detail(profile, profiles.mediaFor(profile.getId()), false, profiles.house(), "pt");
    }

    @PutMapping("/api/admin/profiles/{id}")
    public Presenter.DetailView update(
            @PathVariable UUID id,
            @RequestParam String name,
            @RequestParam int age,
            @RequestParam String city,
            @RequestParam String descriptionPt,
            @RequestParam String descriptionEn,
            @RequestParam String email,
            @RequestParam String phone,
            @RequestParam int priceCents,
            @RequestParam(defaultValue = "BRL") String currency,
            @RequestParam String ethnicity,
            @RequestParam int heightCm,
            @RequestParam int weightKg,
            @RequestParam(required = false) String hair,
            @RequestParam(required = false) String eyes,
            @RequestParam(required = false) String languages,
            @RequestParam String availability,
            @RequestParam String tier,
            @RequestParam(defaultValue = "true") boolean visible,
            @RequestParam(value = "photos", required = false) List<MultipartFile> photos,
            @RequestParam(value = "video", required = false) MultipartFile video,
            @RequestParam(required = false) String videoLabel,
            @RequestParam(value = "removeMediaIds", required = false) List<UUID> removeMediaIds
    ) {
        CompanionProfile profile = admin.update(id, draft(name, age, city, descriptionPt, descriptionEn, email, phone, priceCents, currency, ethnicity, heightCm, weightKg, hair, eyes, languages, availability, tier, visible), photos, video, videoLabel, removeMediaIds);
        return presenter.detail(profile, profiles.mediaFor(profile.getId()), false, profiles.house(), "pt");
    }

    @PatchMapping("/api/admin/profiles/{id}/visibility")
    public Presenter.DetailView visibility(@PathVariable UUID id, @RequestParam boolean visible) {
        CompanionProfile profile = admin.visibility(id, visible);
        return presenter.detail(profile, profiles.mediaFor(id), false, profiles.house(), "pt");
    }

    @DeleteMapping("/api/admin/profiles/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        admin.delete(id);
        return ResponseEntity.noContent().build();
    }

    private ProfileAdminService.ProfileDraft draft(
            String name, int age, String city, String descriptionPt, String descriptionEn, String email, String phone,
            int priceCents, String currency, String ethnicity, int heightCm, int weightKg, String hair, String eyes,
            String languages, String availability, String tier, boolean visible
    ) {
        return new ProfileAdminService.ProfileDraft(
                name, age, city, descriptionPt, descriptionEn, email, phone, priceCents, currency,
                Ethnicity.valueOf(ethnicity), heightCm, weightKg, hair, eyes, languages,
                Availability.valueOf(availability), Tier.valueOf(tier), visible
        );
    }

    private <T extends Enum<T>> T enumOrNull(String raw, Class<T> type) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        return Enum.valueOf(type, raw.trim().toUpperCase());
    }
}
