package com.thepersonae.service;

import com.thepersonae.domain.Availability;
import com.thepersonae.domain.CompanionProfile;
import com.thepersonae.domain.Ethnicity;
import com.thepersonae.domain.MediaKind;
import com.thepersonae.domain.ProfileMedia;
import com.thepersonae.domain.Tier;
import com.thepersonae.repository.CompanionProfileRepository;
import com.thepersonae.repository.FavoriteRepository;
import com.thepersonae.repository.ProfileMediaRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@Service
public class ProfileAdminService {

    private final CompanionProfileRepository profiles;
    private final ProfileMediaRepository media;
    private final FavoriteRepository favorites;
    private final ProfileService profileService;
    private final FileStorageService storage;
    private final AuditService audit;

    public ProfileAdminService(
            CompanionProfileRepository profiles,
            ProfileMediaRepository media,
            FavoriteRepository favorites,
            ProfileService profileService,
            FileStorageService storage,
            AuditService audit
    ) {
        this.profiles = profiles;
        this.media = media;
        this.favorites = favorites;
        this.profileService = profileService;
        this.storage = storage;
        this.audit = audit;
    }

    @Transactional
    public CompanionProfile create(ProfileDraft draft, List<MultipartFile> photos, MultipartFile video, String videoLabel) {
        CompanionProfile profile = apply(new CompanionProfile(), draft, true);
        profileService.validateProfile(profile);
        List<MultipartFile> incoming = photos == null ? List.of() : photos.stream().filter(file -> file != null && !file.isEmpty()).toList();
        if (incoming.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "PHOTO_REQUIRED", "Add at least one photograph");
        }
        profiles.save(profile);
        int order = 0;
        for (MultipartFile photo : incoming) {
            saveMedia(profile, photo, MediaKind.PHOTO, null, null, order++);
        }
        if (video != null && !video.isEmpty()) {
            saveMedia(profile, video, MediaKind.VIDEO, blank(videoLabel) ? null : videoLabel.trim(), null, order);
        }
        audit.record("PROFILE_CREATED", profile.getName(), profile.isVisible() ? "VISIBLE" : "HIDDEN");
        return profile;
    }

    @Transactional
    public CompanionProfile update(
            UUID id,
            ProfileDraft draft,
            List<MultipartFile> photos,
            MultipartFile video,
            String videoLabel,
            List<UUID> removeMediaIds
    ) {
        CompanionProfile profile = managed(id);
        apply(profile, draft, false);
        profileService.validateProfile(profile);
        if (removeMediaIds != null) {
            for (UUID mediaId : removeMediaIds) {
                media.findById(mediaId).ifPresent(item -> {
                    if (item.getProfile().getId().equals(id)) {
                        storage.delete(item.getStoragePath());
                        media.delete(item);
                    }
                });
            }
        }
        int order = media.findByProfileIdOrderBySortOrderAsc(id).stream().mapToInt(ProfileMedia::getSortOrder).max().orElse(-1) + 1;
        if (photos != null) {
            for (MultipartFile photo : photos) {
                if (photo != null && !photo.isEmpty()) {
                    saveMedia(profile, photo, MediaKind.PHOTO, null, null, order++);
                }
            }
        }
        if (video != null && !video.isEmpty()) {
            saveMedia(profile, video, MediaKind.VIDEO, blank(videoLabel) ? null : videoLabel.trim(), null, order);
        }
        long photosLeft = profileService.photoCount(media.findByProfileIdOrderBySortOrderAsc(id));
        if (photosLeft < 1) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "PHOTO_REQUIRED", "Keep at least one photograph");
        }
        audit.record("PROFILE_UPDATED", profile.getName(), profile.isVisible() ? "VISIBLE" : "HIDDEN");
        return profile;
    }

    @Transactional
    public CompanionProfile visibility(UUID id, boolean visible) {
        CompanionProfile profile = managed(id);
        profile.setVisible(visible);
        audit.record(visible ? "PROFILE_SHOWN" : "PROFILE_HIDDEN", profile.getName(), visible ? "VISIBLE" : "HIDDEN");
        return profile;
    }

    @Transactional
    public void delete(UUID id) {
        CompanionProfile profile = managed(id);
        List<ProfileMedia> items = media.findByProfileIdOrderBySortOrderAsc(id);
        items.forEach(item -> storage.delete(item.getStoragePath()));
        media.deleteAll(items);
        media.flush();
        favorites.deleteByProfileId(id);
        profiles.delete(profile);
        audit.record("PROFILE_REMOVED", profile.getName(), "REMOVED");
    }

    private CompanionProfile managed(UUID id) {
        return profiles.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Profile not found"));
    }

    private void saveMedia(CompanionProfile profile, MultipartFile file, MediaKind kind, String label, String duration, int order) {
        ProfileMedia item = new ProfileMedia();
        item.setProfile(profile);
        item.setKind(kind);
        item.setStoragePath(storage.store(file, kind == MediaKind.VIDEO ? "videos" : "photos"));
        item.setLabel(label);
        item.setDurationLabel(duration);
        item.setSortOrder(order);
        media.save(item);
    }

    private CompanionProfile apply(CompanionProfile profile, ProfileDraft draft, boolean creating) {
        String description = blank(draft.description()) ? "" : draft.description().trim();
        profile.setName(draft.name().trim());
        profile.setAge(draft.age());
        profile.setCity(draft.city().trim());
        profile.setDescriptionPt(description);
        profile.setDescriptionEn(description);
        profile.setEmail(blank(draft.email()) ? "" : draft.email().trim().toLowerCase());
        profile.setSitePhone(blank(draft.sitePhone()) ? "" : draft.sitePhone().trim());
        profile.setPhone(blank(draft.phone()) ? "" : draft.phone().trim());
        profile.setPriceCents(draft.priceCents());
        profile.setCurrency(blank(draft.currency()) ? "BRL" : draft.currency().trim().toUpperCase());
        profile.setEthnicity(draft.ethnicity());
        profile.setHeightCm(draft.heightCm());
        profile.setWeightKg(draft.weightKg());
        if (creating) {
            profile.setAvailability(Availability.AVAILABLE);
            profile.setTier(Tier.ELITE);
            profile.setVisible(true);
        }
        return profile;
    }

    private boolean blank(String value) {
        return value == null || value.isBlank();
    }

    public record ProfileDraft(
            String name,
            int age,
            String city,
            String description,
            String email,
            String sitePhone,
            String phone,
            int priceCents,
            String currency,
            Ethnicity ethnicity,
            int heightCm,
            int weightKg
    ) {
    }
}
