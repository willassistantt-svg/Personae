package com.thepersonae.web.dto;

import com.thepersonae.domain.AccessToken;
import com.thepersonae.domain.AuditEvent;
import com.thepersonae.domain.CompanionProfile;
import com.thepersonae.domain.ProfileMedia;
import com.thepersonae.domain.SiteSettings;
import com.thepersonae.domain.UserAccount;
import com.thepersonae.service.HouseService;
import com.thepersonae.service.MemberAdminService;
import com.thepersonae.service.ProfileService;
import com.thepersonae.service.TokenService;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;

@Component
public class Presenter {

    private final ProfileService profiles;
    private final TokenService tokens;
    private final MemberAdminService members;

    public Presenter(ProfileService profiles, TokenService tokens, MemberAdminService members) {
        this.profiles = profiles;
        this.tokens = tokens;
        this.members = members;
    }

    public SessionUser session(UserAccount user) {
        return new SessionUser(
                user.getId(),
                user.getFirstName(),
                user.getLastName(),
                user.getEmail(),
                user.getRole().name(),
                user.getMemberCode(),
                user.getLocale(),
                user.getCity()
        );
    }

    public MemberView member(UserAccount user) {
        AccessToken open = members.latestOpen(user);
        return new MemberView(
                user.getId(),
                user.getFirstName(),
                user.getLastName(),
                user.getEmail(),
                user.getBirthDate().toString(),
                user.getPhone(),
                user.getCity(),
                user.getState(),
                user.getCountry(),
                user.isContactAuthorized(),
                user.getTravelLocations(),
                user.getDocumentPath() != null,
                user.getRole().name(),
                user.getStatus().name(),
                user.getLocale(),
                user.getMemberCode(),
                user.getCreatedAt().toString(),
                open == null ? null : tokens.link(open),
                open == null ? null : open.getPurpose().name(),
                open == null ? null : open.getExpiresAt().toString(),
                open == null ? null : open.getEmailStatus()
        );
    }

    public CardView card(CompanionProfile profile, List<ProfileMedia> media, String locale) {
        List<MediaView> photos = photos(media).stream().limit(3).toList();
        String description = "en".equals(locale) ? profile.getDescriptionEn() : profile.getDescriptionPt();
        return new CardView(
                profile.getId(),
                profile.getName(),
                profile.getAge(),
                profile.getCity(),
                excerpt(description),
                profile.getEthnicity() == null ? null : profile.getEthnicity().name(),
                profile.getHeightCm(),
                profile.getWeightKg(),
                profile.getTier().name(),
                profile.getAvailability().name(),
                profile.isVisible(),
                photos
        );
    }

    public DetailView detail(CompanionProfile profile, List<ProfileMedia> media, SiteSettings house, String locale) {
        String description = "en".equals(locale) ? profile.getDescriptionEn() : profile.getDescriptionPt();
        return new DetailView(
                profile.getId(),
                profile.getName(),
                profile.getAge(),
                profile.getCity(),
                description,
                profile.getDescriptionPt(),
                profile.getDescriptionEn(),
                profile.getEmail(),
                profile.getSitePhone() == null ? house.getSitePhone() : profile.getSitePhone(),
                profile.getPhone(),
                profile.getPriceCents(),
                profile.getCurrency(),
                profile.getEthnicity() == null ? null : profile.getEthnicity().name(),
                profile.getHeightCm(),
                profile.getWeightKg(),
                profile.getHair(),
                profile.getEyes(),
                profile.getLanguages(),
                profile.getAvailability().name(),
                profile.getTier().name(),
                profile.isVisible(),
                photos(media),
                videos(media)
        );
    }

    public LinkView link(AccessToken token) {
        return new LinkView(
                token.getId(),
                token.getUser().getId(),
                token.getUser().getFirstName() + " " + token.getUser().getLastName(),
                token.getUser().getEmail(),
                token.getPurpose().name(),
                token.getExpiresAt().toString(),
                token.getEmailStatus(),
                tokens.link(token)
        );
    }

    public AuditView audit(AuditEvent event) {
        return new AuditView(event.getId(), event.getEventType(), event.getSubject(), event.getStatus(), event.getCreatedAt().toString());
    }

    public DashboardView dashboard(HouseService.Dashboard data) {
        return new DashboardView(
                data.activeMembers(),
                data.pendingMembers(),
                data.invitedMembers(),
                data.disabledMembers(),
                data.publishedProfiles(),
                data.hiddenProfiles(),
                data.photos(),
                data.videos(),
                data.growth().stream().map(point -> new PointView(point.date(), point.members())).toList(),
                data.recent().stream().map(this::audit).toList()
        );
    }

    public HouseView house(SiteSettings settings) {
        return new HouseView(settings.getSitePhone(), settings.getSiteEmail());
    }

    public IssuedView issued(MemberAdminService.IssuedLink issued) {
        return new IssuedView(member(issued.user()), issued.link(), issued.token().getEmailStatus());
    }

    private List<MediaView> photos(List<ProfileMedia> media) {
        return media.stream().filter(item -> item.getKind().name().equals("PHOTO")).map(this::media).toList();
    }

    private List<MediaView> videos(List<ProfileMedia> media) {
        return media.stream().filter(item -> item.getKind().name().equals("VIDEO")).map(this::media).toList();
    }

    private MediaView media(ProfileMedia item) {
        return new MediaView(item.getId(), item.getKind().name(), "/api/media/" + item.getId(), item.getLabel(), item.getDurationLabel());
    }

    private String excerpt(String text) {
        if (text == null) {
            return "";
        }
        String clean = text.replaceAll("\\s+", " ").trim();
        return clean.length() <= 180 ? clean : clean.substring(0, 177) + "...";
    }

    public List<CardView> cards(List<CompanionProfile> profiles, String locale) {
        var grouped = this.profiles.mediaForAll(profiles.stream().map(CompanionProfile::getId).toList())
                .stream()
                .collect(java.util.stream.Collectors.groupingBy(item -> item.getProfile().getId()));
        return profiles.stream()
                .map(profile -> card(profile, grouped.getOrDefault(profile.getId(), List.of()), locale))
                .toList();
    }

    public record SessionUser(UUID id, String firstName, String lastName, String email, String role, String memberCode, String locale, String city) {
    }

    public record MediaView(UUID id, String kind, String url, String label, String durationLabel) {
    }

    public record CardView(
            UUID id,
            String name,
            int age,
            String city,
            String excerpt,
            String ethnicity,
            int heightCm,
            int weightKg,
            String tier,
            String availability,
            boolean visible,
            List<MediaView> photos
    ) {
    }

    public record DetailView(
            UUID id,
            String name,
            int age,
            String city,
            String description,
            String descriptionPt,
            String descriptionEn,
            String email,
            String sitePhone,
            String phone,
            int priceCents,
            String currency,
            String ethnicity,
            int heightCm,
            int weightKg,
            String hair,
            String eyes,
            String languages,
            String availability,
            String tier,
            boolean visible,
            List<MediaView> photos,
            List<MediaView> videos
    ) {
    }

    public record MemberView(
            UUID id,
            String firstName,
            String lastName,
            String email,
            String birthDate,
            String phone,
            String city,
            String state,
            String country,
            boolean contactAuthorized,
            String travelLocations,
            boolean hasDocument,
            String role,
            String status,
            String locale,
            String memberCode,
            String createdAt,
            String link,
            String linkPurpose,
            String linkExpiresAt,
            String emailStatus
    ) {
    }

    public record LinkView(UUID id, UUID userId, String name, String email, String purpose, String expiresAt, String emailStatus, String link) {
    }

    public record AuditView(UUID id, String eventType, String subject, String status, String createdAt) {
    }

    public record PointView(String date, long members) {
    }

    public record DashboardView(
            long activeMembers,
            long pendingMembers,
            long invitedMembers,
            long disabledMembers,
            long publishedProfiles,
            long hiddenProfiles,
            long photos,
            long videos,
            List<PointView> growth,
            List<AuditView> recent
    ) {
    }

    public record HouseView(String sitePhone, String siteEmail) {
    }

    public record IssuedView(MemberView member, String link, String emailStatus) {
    }
}
