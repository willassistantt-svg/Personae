package com.thepersonae.service;

import com.thepersonae.domain.Availability;
import com.thepersonae.domain.CompanionProfile;
import com.thepersonae.domain.Ethnicity;
import com.thepersonae.domain.MediaKind;
import com.thepersonae.domain.ProfileMedia;
import com.thepersonae.domain.Tier;
import com.thepersonae.repository.CompanionProfileRepository;
import com.thepersonae.repository.ProfileMediaRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class ProfileAdminService {

    private final CompanionProfileRepository profiles;
    private final ProfileMediaRepository media;
    private final ProfileService profileService;
    private final FileStorageService storage;
    private final PhotoProcessor photoProcessor;
    private final AuditService audit;

    public ProfileAdminService(
            CompanionProfileRepository profiles,
            ProfileMediaRepository media,
            ProfileService profileService,
            FileStorageService storage,
            PhotoProcessor photoProcessor,
            AuditService audit
    ) {
        this.profiles = profiles;
        this.media = media;
        this.profileService = profileService;
        this.storage = storage;
        this.photoProcessor = photoProcessor;
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
            List<String> photoOrder
    ) {
        CompanionProfile profile = managed(id);
        apply(profile, draft, false);
        profileService.validateProfile(profile);
        List<ProfileMedia> before = media.findByProfileIdOrderBySortOrderAsc(id);
        int order = before.stream().mapToInt(ProfileMedia::getSortOrder).max().orElse(-1) + 1;
        List<ProfileMedia> added = new ArrayList<>();
        if (photos != null) {
            for (MultipartFile photo : photos) {
                if (photo != null && !photo.isEmpty()) {
                    added.add(saveMedia(profile, photo, MediaKind.PHOTO, null, null, order++));
                }
            }
        }
        if (video != null && !video.isEmpty()) {
            saveMedia(profile, video, MediaKind.VIDEO, blank(videoLabel) ? null : videoLabel.trim(), null, order);
        }
        List<ProfileMedia> items = media.findByProfileIdOrderBySortOrderAsc(id);
        if (profileService.photoCount(items) < 1) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "PHOTO_REQUIRED", "Keep at least one photograph");
        }
        Map<String, ProfileMedia> saved = new LinkedHashMap<>();
        before.stream().filter(item -> item.getKind() == MediaKind.PHOTO).forEach(item -> saved.put(item.getId().toString(), item));
        arrange(items, orderPhotos(photoOrder, saved, added));
        audit.record("PROFILE_UPDATED", profile.getName(), profile.isVisible() ? "VISIBLE" : "HIDDEN");
        return profile;
    }

    @Transactional
    public CompanionProfile reorderPhotos(UUID id, List<UUID> photoIds) {
        CompanionProfile profile = managed(id);
        List<ProfileMedia> items = media.findByProfileIdOrderBySortOrderAsc(id);
        List<ProfileMedia> current = items.stream().filter(item -> item.getKind() == MediaKind.PHOTO).toList();
        if (photoIds == null || photoIds.size() != current.size() || !new HashSet<>(photoIds).equals(new HashSet<>(current.stream().map(ProfileMedia::getId).toList()))) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION", "Send every photograph of this persona once");
        }
        List<ProfileMedia> ordered = new ArrayList<>();
        for (UUID photoId : photoIds) {
            current.stream().filter(item -> item.getId().equals(photoId)).findFirst().ifPresent(ordered::add);
        }
        arrange(items, ordered);
        audit.record("PROFILE_PHOTOS_ORDERED", profile.getName(), "OK");
        return profile;
    }

    @Transactional
    public CompanionProfile removeMedia(UUID id, UUID mediaId) {
        CompanionProfile profile = managed(id);
        List<ProfileMedia> items = media.findByProfileIdOrderBySortOrderAsc(id);
        ProfileMedia target = items.stream()
                .filter(item -> item.getId().equals(mediaId))
                .findFirst()
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Media not found"));
        if (target.getKind() == MediaKind.PHOTO && profileService.photoCount(items) <= 1) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "PHOTO_REQUIRED", "Keep at least one photograph");
        }
        storage.delete(target.getStoragePath());
        media.delete(target);
        List<ProfileMedia> left = items.stream().filter(item -> !item.getId().equals(mediaId)).toList();
        arrange(left, left.stream().filter(item -> item.getKind() == MediaKind.PHOTO).toList());
        audit.record(target.getKind() == MediaKind.PHOTO ? "PROFILE_PHOTO_REMOVED" : "PROFILE_VIDEO_REMOVED", profile.getName(), "REMOVED");
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
        profiles.delete(profile);
        audit.record("PROFILE_REMOVED", profile.getName(), "REMOVED");
    }

    private CompanionProfile managed(UUID id) {
        return profiles.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Profile not found"));
    }

    private void arrange(List<ProfileMedia> items, List<ProfileMedia> orderedPhotos) {
        int order = 0;
        for (ProfileMedia photo : orderedPhotos) {
            photo.setSortOrder(order++);
        }
        for (ProfileMedia item : items) {
            if (item.getKind() == MediaKind.VIDEO) {
                item.setSortOrder(order++);
            }
        }
    }

    /**
     * Final photo order for a save. Tokens are saved photo ids or "new:&lt;n&gt;" (the n-th uploaded file).
     * Unknown or repeated tokens are ignored; photos the tokens leave out keep their place at the end.
     */
    static <T> List<T> orderPhotos(List<String> tokens, Map<String, T> saved, List<T> added) {
        LinkedHashSet<T> ordered = new LinkedHashSet<>();
        if (tokens != null) {
            for (String token : tokens) {
                if (token == null) {
                    continue;
                }
                String value = token.trim();
                if (value.startsWith("new:")) {
                    try {
                        int index = Integer.parseInt(value.substring(4));
                        if (index >= 0 && index < added.size()) {
                            ordered.add(added.get(index));
                        }
                    } catch (NumberFormatException ignored) {
                        // skip malformed token
                    }
                } else if (saved.containsKey(value)) {
                    ordered.add(saved.get(value));
                }
            }
        }
        ordered.addAll(saved.values());
        ordered.addAll(added);
        return new ArrayList<>(ordered);
    }

    private ProfileMedia saveMedia(CompanionProfile profile, MultipartFile file, MediaKind kind, String label, String duration, int order) {
        ProfileMedia item = new ProfileMedia();
        item.setProfile(profile);
        item.setKind(kind);
        item.setStoragePath(kind == MediaKind.VIDEO ? storage.store(file, "videos") : storePhoto(file));
        item.setLabel(label);
        item.setDurationLabel(duration);
        item.setSortOrder(order);
        return media.save(item);
    }

    private String storePhoto(MultipartFile file) {
        byte[] original;
        try {
            original = file.getBytes();
        } catch (IOException ex) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "STORAGE_FAILED", "Could not store the file");
        }
        return storage.store(new ByteArrayInputStream(photoProcessor.normalize(original)), "photos", "photo.jpg");
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
