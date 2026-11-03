package com.thepersonae.service;

import com.thepersonae.domain.AccountStatus;
import com.thepersonae.domain.AuditEvent;
import com.thepersonae.domain.MediaKind;
import com.thepersonae.domain.SiteSettings;
import com.thepersonae.domain.UserAccount;
import com.thepersonae.repository.AuditEventRepository;
import com.thepersonae.repository.CompanionProfileRepository;
import com.thepersonae.repository.ProfileMediaRepository;
import com.thepersonae.repository.SiteSettingsRepository;
import com.thepersonae.repository.UserAccountRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class HouseService {

    private final UserAccountRepository users;
    private final CompanionProfileRepository profiles;
    private final ProfileMediaRepository media;
    private final AuditEventRepository events;
    private final SiteSettingsRepository settings;
    private final AuditService audit;

    public HouseService(
            UserAccountRepository users,
            CompanionProfileRepository profiles,
            ProfileMediaRepository media,
            AuditEventRepository events,
            SiteSettingsRepository settings,
            AuditService audit
    ) {
        this.users = users;
        this.profiles = profiles;
        this.media = media;
        this.events = events;
        this.settings = settings;
        this.audit = audit;
    }

    @Transactional(readOnly = true)
    public Dashboard dashboard() {
        List<UserAccount> everyone = users.findAll();
        LocalDate start = LocalDate.now(ZoneOffset.UTC).minusDays(29);
        Map<LocalDate, Long> byDay = everyone.stream()
                .collect(Collectors.groupingBy(user -> user.getCreatedAt().atZone(ZoneOffset.UTC).toLocalDate(), Collectors.counting()));
        long running = everyone.stream()
                .filter(user -> user.getCreatedAt().isBefore(start.atStartOfDay(ZoneOffset.UTC).toInstant()))
                .count();
        List<Point> growth = new ArrayList<>();
        for (int i = 0; i < 30; i++) {
            LocalDate day = start.plusDays(i);
            running += byDay.getOrDefault(day, 0L);
            growth.add(new Point(day.toString(), running));
        }
        return new Dashboard(
                users.countByStatus(AccountStatus.ACTIVE),
                users.countByStatus(AccountStatus.PENDING_REVIEW),
                users.countByStatus(AccountStatus.INVITED),
                users.countByStatus(AccountStatus.DISABLED),
                profiles.countByVisible(true),
                profiles.countByVisible(false),
                media.countByKind(MediaKind.PHOTO),
                media.countByKind(MediaKind.VIDEO),
                growth,
                events.findTop40ByOrderByCreatedAtDesc()
        );
    }

    @Transactional(readOnly = true)
    public List<AuditEvent> activity() {
        return events.findTop40ByOrderByCreatedAtDesc();
    }

    @Transactional(readOnly = true)
    public SiteSettings currentSettings() {
        return settings.findById(1).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "House settings are missing"));
    }

    @Transactional
    public SiteSettings updateSettings(String phone, String emailAddress) {
        if (phone == null || phone.isBlank() || emailAddress == null || !emailAddress.contains("@")) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION", "House phone and email are required");
        }
        SiteSettings house = settings.findById(1).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "House settings are missing"));
        house.setSitePhone(phone.trim());
        house.setSiteEmail(emailAddress.trim().toLowerCase());
        house.setUpdatedAt(Instant.now());
        audit.record("SETTINGS_UPDATED", house.getSiteEmail(), "OK");
        return house;
    }

    public record Point(String date, long members) {
    }

    public record Dashboard(
            long activeMembers,
            long pendingMembers,
            long invitedMembers,
            long disabledMembers,
            long publishedProfiles,
            long hiddenProfiles,
            long photos,
            long videos,
            List<Point> growth,
            List<AuditEvent> recent
    ) {
    }
}
