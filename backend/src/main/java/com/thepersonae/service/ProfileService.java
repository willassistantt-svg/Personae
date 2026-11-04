package com.thepersonae.service;

import com.thepersonae.domain.Availability;
import com.thepersonae.domain.CompanionProfile;
import com.thepersonae.domain.Ethnicity;
import com.thepersonae.domain.MediaKind;
import com.thepersonae.domain.ProfileMedia;
import com.thepersonae.domain.SiteSettings;
import com.thepersonae.domain.Tier;
import com.thepersonae.repository.CompanionProfileRepository;
import com.thepersonae.repository.ProfileMediaRepository;
import com.thepersonae.repository.SiteSettingsRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class ProfileService {

    private final CompanionProfileRepository profiles;
    private final ProfileMediaRepository media;
    private final SiteSettingsRepository settings;

    public ProfileService(
            CompanionProfileRepository profiles,
            ProfileMediaRepository media,
            SiteSettingsRepository settings
    ) {
        this.profiles = profiles;
        this.media = media;
        this.settings = settings;
    }

    @Transactional(readOnly = true)
    public List<CompanionProfile> catalog(String query, Availability availability, Tier tier) {
        return profiles.search(query == null ? "" : query.trim(), availability, tier, false);
    }

    @Transactional(readOnly = true)
    public List<CompanionProfile> adminCatalog(String query, Availability availability, Tier tier) {
        return profiles.search(query == null ? "" : query.trim(), availability, tier, true);
    }

    @Transactional(readOnly = true)
    public CompanionProfile visible(UUID id) {
        CompanionProfile profile = profiles.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Profile not found"));
        if (!profile.isVisible()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Profile not found");
        }
        return profile;
    }

    @Transactional(readOnly = true)
    public CompanionProfile any(UUID id) {
        return profiles.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Profile not found"));
    }

    @Transactional(readOnly = true)
    public List<ProfileMedia> mediaFor(UUID profileId) {
        return media.findByProfileIdOrderBySortOrderAsc(profileId);
    }

    @Transactional(readOnly = true)
    public List<ProfileMedia> mediaForAll(List<UUID> ids) {
        if (ids.isEmpty()) {
            return List.of();
        }
        return media.findByProfileIdInOrderBySortOrderAsc(ids);
    }

    @Transactional(readOnly = true)
    public SiteSettings house() {
        return settings.findById(1).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "House settings are missing"));
    }

    public void validateProfile(CompanionProfile profile) {
        if (profile.getName() == null || profile.getName().isBlank() || profile.getCity() == null || profile.getCity().isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION", "Name and city are required");
        }
        if (profile.getAge() < 18 || profile.getAge() > 120) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "PERSONA_AGE", "A persona must be between 18 and 120");
        }
        boolean heightSet = profile.getHeightCm() != 0;
        boolean weightSet = profile.getWeightKg() != 0;
        if ((heightSet && (profile.getHeightCm() < 120 || profile.getHeightCm() > 230))
                || (weightSet && (profile.getWeightKg() < 35 || profile.getWeightKg() > 200))) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "MEASURE", "Check height and weight");
        }
        if (profile.getPriceCents() < 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION", "The fee cannot be negative");
        }
        if (profile.getEmail() != null && !profile.getEmail().isBlank() && !profile.getEmail().contains("@")) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "EMAIL_INVALID", "Use a valid email");
        }
        if (profile.getCurrency() == null || !java.util.Set.of("BRL", "EUR", "USD", "GBP").contains(profile.getCurrency())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION", "Choose a currency");
        }
    }

    public long photoCount(List<ProfileMedia> items) {
        return items.stream().filter(item -> item.getKind() == MediaKind.PHOTO).count();
    }
}
