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
        CompanionProfile profile = apply(new CompanionProfile(), draft);
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
            saveMedia(profile, video, MediaKind.VIDEO, blank(videoLabel) ? "Film" : videoLabel.trim(), null, order);
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
        CompanionProfile profile = profileService.any(id);
        apply(profile, draft);
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
            saveMedia(profile, video, MediaKind.VIDEO, blank(videoLabel) ? "Film" : videoLabel.trim(), null, order);
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
        CompanionProfile profile = profileService.any(id);
        profile.setVisible(visible);
        audit.record(visible ? "PROFILE_SHOWN" : "PROFILE_HIDDEN", profile.getName(), visible ? "VISIBLE" : "HIDDEN");
        return profile;
    }

    @Transactional
    public void delete(UUID id) {
        CompanionProfile profile = profileService.any(id);
        media.findByProfileIdOrderBySortOrderAsc(id).forEach(item -> storage.delete(item.getStoragePath()));
        favorites.deleteByProfileId(id);
        profiles.delete(profile);
        audit.record("PROFILE_REMOVED", profile.getName(), "REMOVED");
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

    private CompanionProfile apply(CompanionProfile profile, ProfileDraft draft) {
        profile.setName(draft.name().trim());
        profile.setAge(draft.age());
        profile.setCity(draft.city().trim());
        profile.setDescriptionPt(draft.descriptionPt().trim());
        profile.setDescriptionEn(draft.descriptionEn().trim());
        profile.setEmail(draft.email().trim().toLowerCase());
        profile.setPhone(draft.phone().trim());
        profile.setPriceCents(draft.priceCents());
        profile.setCurrency(blank(draft.currency()) ? "BRL" : draft.currency().trim().toUpperCase());
        profile.setEthnicity(draft.ethnicity());
        profile.setHeightCm(draft.heightCm());
        profile.setWeightKg(draft.weightKg());
        profile.setHair(blank(draft.hair()) ? null : draft.hair().trim());
        profile.setEyes(blank(draft.eyes()) ? null : draft.eyes().trim());
        profile.setLanguages(blank(draft.languages()) ? null : draft.languages().trim());
        profile.setAvailability(draft.availability());
        profile.setTier(draft.tier());
        profile.setVisible(draft.visible());
        return profile;
    }

    private boolean blank(String value) {
        return value == null || value.isBlank();
    }

    public record ProfileDraft(
            String name,
            int age,
            String city,
            String descriptionPt,
            String descriptionEn,
            String email,
            String phone,
            int priceCents,
            String currency,
            Ethnicity ethnicity,
            int heightCm,
            int weightKg,
            String hair,
            String eyes,
            String languages,
            Availability availability,
            Tier tier,
            boolean visible
    ) {
    }
}
