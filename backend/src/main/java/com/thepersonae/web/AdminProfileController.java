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
import org.springframework.web.bind.annotation.RequestBody;
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
        return presenter.cards(found, locale);
    }

    @GetMapping("/api/admin/profiles/{id}")
    public Presenter.DetailView get(@PathVariable UUID id, @RequestParam(defaultValue = "pt") String locale) {
        CompanionProfile profile = profiles.any(id);
        return presenter.detail(profile, profiles.mediaFor(id), profiles.house(), locale);
    }

    @PostMapping("/api/admin/profiles")
    public Presenter.DetailView create(
            @RequestParam String name,
            @RequestParam int age,
            @RequestParam String city,
            @RequestParam(required = false) String description,
            @RequestParam(required = false) String email,
            @RequestParam(required = false) String sitePhone,
            @RequestParam(required = false) String phone,
            @RequestParam(required = false) Integer priceCents,
            @RequestParam(required = false) String currency,
            @RequestParam(required = false) String ethnicity,
            @RequestParam(required = false) Integer heightCm,
            @RequestParam(required = false) Integer weightKg,
            @RequestParam(value = "photos", required = false) List<MultipartFile> photos,
            @RequestParam(value = "video", required = false) MultipartFile video
    ) {
        CompanionProfile profile = admin.create(draft(name, age, city, description, email, sitePhone, phone, priceCents, currency, ethnicity, heightCm, weightKg), photos, video, null);
        return presenter.detail(profile, profiles.mediaFor(profile.getId()), profiles.house(), "pt");
    }

    @PutMapping("/api/admin/profiles/{id}")
    public Presenter.DetailView update(
            @PathVariable UUID id,
            @RequestParam String name,
            @RequestParam int age,
            @RequestParam String city,
            @RequestParam(required = false) String description,
            @RequestParam(required = false) String email,
            @RequestParam(required = false) String sitePhone,
            @RequestParam(required = false) String phone,
            @RequestParam(required = false) Integer priceCents,
            @RequestParam(required = false) String currency,
            @RequestParam(required = false) String ethnicity,
            @RequestParam(required = false) Integer heightCm,
            @RequestParam(required = false) Integer weightKg,
            @RequestParam(value = "photos", required = false) List<MultipartFile> photos,
            @RequestParam(value = "video", required = false) MultipartFile video
    ) {
        CompanionProfile profile = admin.update(id, draft(name, age, city, description, email, sitePhone, phone, priceCents, currency, ethnicity, heightCm, weightKg), photos, video, null);
        return presenter.detail(profile, profiles.mediaFor(profile.getId()), profiles.house(), "pt");
    }

    @PutMapping("/api/admin/profiles/{id}/photos/order")
    public Presenter.DetailView reorderPhotos(@PathVariable UUID id, @RequestBody PhotoOrder order) {
        CompanionProfile profile = admin.reorderPhotos(id, order.ids());
        return presenter.detail(profile, profiles.mediaFor(id), profiles.house(), "pt");
    }

    @DeleteMapping("/api/admin/profiles/{id}/media/{mediaId}")
    public Presenter.DetailView removeMedia(@PathVariable UUID id, @PathVariable UUID mediaId) {
        CompanionProfile profile = admin.removeMedia(id, mediaId);
        return presenter.detail(profile, profiles.mediaFor(id), profiles.house(), "pt");
    }

    public record PhotoOrder(List<UUID> ids) {
    }

    @PatchMapping("/api/admin/profiles/{id}/visibility")
    public Presenter.DetailView visibility(@PathVariable UUID id, @RequestParam boolean visible) {
        CompanionProfile profile = admin.visibility(id, visible);
        return presenter.detail(profile, profiles.mediaFor(id), profiles.house(), "pt");
    }

    @DeleteMapping("/api/admin/profiles/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        admin.delete(id);
        return ResponseEntity.noContent().build();
    }

    private ProfileAdminService.ProfileDraft draft(
            String name, int age, String city, String description, String email, String sitePhone, String phone,
            Integer priceCents, String currency, String ethnicity, Integer heightCm, Integer weightKg
    ) {
        Ethnicity parsed = ethnicity == null || ethnicity.isBlank() ? null : Ethnicity.valueOf(ethnicity.trim().toUpperCase());
        return new ProfileAdminService.ProfileDraft(
                name, age, city, description, email, sitePhone, phone,
                priceCents == null ? 0 : priceCents,
                currency,
                parsed,
                heightCm == null ? 0 : heightCm,
                weightKg == null ? 0 : weightKg
        );
    }

    private <T extends Enum<T>> T enumOrNull(String raw, Class<T> type) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        return Enum.valueOf(type, raw.trim().toUpperCase());
    }
}
