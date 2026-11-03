package com.thepersonae.seed;

import com.thepersonae.config.AppProperties;
import com.thepersonae.domain.AccountRole;
import com.thepersonae.domain.AccountStatus;
import com.thepersonae.domain.Availability;
import com.thepersonae.domain.CompanionProfile;
import com.thepersonae.domain.Ethnicity;
import com.thepersonae.domain.MediaKind;
import com.thepersonae.domain.ProfileMedia;
import com.thepersonae.domain.SiteSettings;
import com.thepersonae.domain.Tier;
import com.thepersonae.domain.TokenPurpose;
import com.thepersonae.domain.UserAccount;
import com.thepersonae.repository.CompanionProfileRepository;
import com.thepersonae.repository.ProfileMediaRepository;
import com.thepersonae.repository.SiteSettingsRepository;
import com.thepersonae.repository.UserAccountRepository;
import com.thepersonae.service.AuditService;
import com.thepersonae.service.FileStorageService;
import com.thepersonae.service.TokenService;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.ClassPathResource;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;

@Component
@Order(20)
public class DemoSeed implements ApplicationRunner {

    private final AppProperties properties;
    private final UserAccountRepository users;
    private final CompanionProfileRepository profiles;
    private final ProfileMediaRepository media;
    private final SiteSettingsRepository settings;
    private final PasswordEncoder encoder;
    private final FileStorageService storage;
    private final TokenService tokens;
    private final AuditService audit;

    public DemoSeed(
            AppProperties properties,
            UserAccountRepository users,
            CompanionProfileRepository profiles,
            ProfileMediaRepository media,
            SiteSettingsRepository settings,
            PasswordEncoder encoder,
            FileStorageService storage,
            TokenService tokens,
            AuditService audit
    ) {
        this.properties = properties;
        this.users = users;
        this.profiles = profiles;
        this.media = media;
        this.settings = settings;
        this.encoder = encoder;
        this.storage = storage;
        this.tokens = tokens;
        this.audit = audit;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) throws Exception {
        if (!properties.isSeedEnabled() || users.existsByEmailIgnoreCase(properties.getAdmin().getEmail())) {
            return;
        }
        SiteSettings house = new SiteSettings();
        house.setId(1);
        house.setSitePhone("+55 11 3180-4040");
        house.setSiteEmail("casa@thepersonae.com");
        house.setUpdatedAt(Instant.now());
        settings.save(house);

        String[] adminNames = properties.getAdmin().getName().split(" ", 2);
        user(adminNames[0], adminNames.length > 1 ? adminNames[1] : "Director", properties.getAdmin().getEmail(),
                properties.getAdmin().getPassword(), LocalDate.of(1984, 4, 12), "+55 11 3180-4040", "São Paulo", "SP", "Brasil",
                AccountRole.ADMIN, AccountStatus.ACTIVE, "pt", null, 40);
        user("Helena", "Vasconcelos", "member@thepersonae.com", "MemberAccess#2026",
                LocalDate.of(1991, 6, 2), "+55 21 98888-0101", "Rio de Janeiro", "RJ", "Brasil",
                AccountRole.USER, AccountStatus.ACTIVE, "pt", null, 18);
        user("Miguel", "Alencar", "pending@thepersonae.com", null,
                LocalDate.of(1994, 9, 19), "+55 11 97777-2200", "São Paulo", "SP", "Brasil",
                AccountRole.USER, AccountStatus.PENDING_REVIEW, "pt", "sample-document.jpg", 1);
        UserAccount invited = user("Clara", "Mendes", "invited@thepersonae.com", null,
                LocalDate.of(1988, 1, 30), "+44 20 7946 0991", "London", "England", "United Kingdom",
                AccountRole.USER, AccountStatus.INVITED, "en", null, 7);
        tokens.issueWithValue(invited, TokenPurpose.INVITE, "demo-invite-token", Duration.ofDays(30));
        user("Paulo", "Nogueira", "disabled@thepersonae.com", "DisabledAccess#2026",
                LocalDate.of(1986, 12, 5), "+55 31 96666-4040", "Belo Horizonte", "MG", "Brasil",
                AccountRole.USER, AccountStatus.DISABLED, "pt", null, 30);

        profile("Alessandra", 26, "London, United Kingdom",
                "Alessandra reúne cultura clássica e uma presença serena. Conversa com naturalidade sobre arte, viagens e a vida nas capitais europeias, e acompanha eventos privados com discrição absoluta.",
                "Alessandra brings a rare blend of intellectual depth and quiet confidence. She is at ease with art, travel and private cultural evenings, and she keeps every introduction discreet.",
                "alessandra@thepersonae.com", "+44 20 7946 1101", 450000, Ethnicity.EUROPEAN, 178, 58,
                "Espresso brown", "Deep hazel", "English, French, Italian",
                Availability.AVAILABLE, Tier.ELITE, true, 20,
                new String[]{"alessandra-2.jpg", "alessandra-1.jpg", "alessandra-3.jpg", "alessandra-4.jpg", "alessandra-5.jpg"},
                "intro.mp4", "Introduction", "00:08");
        profile("Valentina", 29, "Milan, Italy",
                "Valentina é a leitura milanesa de elegância e reserva. Conhece a mesa, a arte contemporânea e o ritmo de uma cidade que prefere não se explicar.",
                "Valentina is Milan's quieter expression of elegance. She knows the table, contemporary art and the pace of a city that prefers not to explain itself.",
                "valentina@thepersonae.com", "+39 02 9475 2201", 520000, Ethnicity.MEDITERRANEAN, 172, 55,
                "Chestnut", "Brown", "Italian, English",
                Availability.PRIVATE_REQUEST, Tier.GOLD, true, 12,
                new String[]{"valentina-1.jpg", "portrait-c.jpg", "portrait-b.jpg"},
                null, null, null);
        profile("Beatriz", 24, "São Paulo, Brasil",
                "Beatriz circula por São Paulo com calma e precisão. Gosta de galerias no fim da tarde, conversa longa e compromissos que pedem presença, não alarde.",
                "Beatriz moves through São Paulo with calm precision. She favors late galleries, long conversation and appointments that ask for presence rather than noise.",
                "beatriz@thepersonae.com", "+55 11 98810-2400", 380000, Ethnicity.LATIN_AMERICAN, 170, 56,
                "Dark brown", "Brown", "Português, English",
                Availability.AVAILABLE, Tier.ELITE, true, 6,
                new String[]{"portrait-a.jpg", "alessandra-4.jpg", "still-1.jpg"},
                "intro.mp4", "Introduction", "00:08");
        profile("Camille", 31, "Paris, France",
                "Camille prefere a casa fechada, o jantar curto e a viagem combinada. Fala pouco em público e escolhe com cuidado com quem divide o tempo.",
                "Camille prefers a closed house, a short dinner and travel arranged in advance. She speaks little in public and chooses carefully with whom she spends her time.",
                "camille@thepersonae.com", "+33 1 86 95 3301", 610000, Ethnicity.EUROPEAN, 175, 57,
                "Auburn", "Green", "French, English",
                Availability.TRAVEL, Tier.PRIVATE, true, 9,
                new String[]{"still-3.jpg", "portrait-b.jpg", "alessandra-3.jpg"},
                null, null, null);
        profile("Helena", 27, "Lisbon, Portugal",
                "Helena está fora do catálogo neste momento. O perfil permanece na casa, oculto, até que a direção decida publicá-lo de novo.",
                "Helena is away from the catalog for now. The profile stays in the house, hidden, until the direction chooses to publish it again.",
                "helena.profile@thepersonae.com", "+351 21 394 2700", 340000, Ethnicity.MEDITERRANEAN, 168, 54,
                "Black", "Dark brown", "Português, English, Spanish",
                Availability.AVAILABLE, Tier.GOLD, false, 3,
                new String[]{"portrait-a.jpg", "valentina-1.jpg", "still-2.jpg"},
                null, null, null);

        audit.record("HOUSE_OPENED", "thepersonae.com", "OK", Instant.now().minus(Duration.ofDays(40)));
    }

    private UserAccount user(
            String first, String last, String email, String password, LocalDate birth, String phone,
            String city, String state, String country, AccountRole role, AccountStatus status, String locale,
            String document, int daysAgo
    ) throws IOException {
        UserAccount user = new UserAccount();
        user.setFirstName(first);
        user.setLastName(last);
        user.setEmail(email);
        user.setPasswordHash(password == null ? null : encoder.encode(password));
        user.setBirthDate(birth);
        user.setPhone(phone);
        user.setCity(city);
        user.setState(state);
        user.setCountry(country);
        user.setContactAuthorized(true);
        user.setTravelLocations(role == AccountRole.USER ? "Lisboa, Paris" : null);
        user.setRole(role);
        user.setStatus(status);
        user.setLocale(locale);
        user.setMemberCode("TP-" + String.format("%04d", users.count() + 1));
        user.setCreatedAt(Instant.now().minus(Duration.ofDays(daysAgo)));
        user.setUpdatedAt(user.getCreatedAt());
        if (document != null) {
            user.setDocumentPath(storage.store(new ClassPathResource("seed/" + document).getInputStream(), "documents", document));
        }
        users.save(user);
        audit.record(status == AccountStatus.PENDING_REVIEW ? "REGISTRATION" : "MEMBER_SEEDED", email, status.name(), user.getCreatedAt());
        return user;
    }

    private void profile(
            String name, int age, String city, String pt, String en, String email, String phone, int price,
            Ethnicity ethnicity, int height, int weight, String hair, String eyes, String languages,
            Availability availability, Tier tier, boolean visible, int daysAgo, String[] photos,
            String video, String videoLabel, String duration
    ) throws IOException {
        CompanionProfile profile = new CompanionProfile();
        profile.setName(name);
        profile.setAge(age);
        profile.setCity(city);
        profile.setDescriptionPt(pt);
        profile.setDescriptionEn(en);
        profile.setEmail(email);
        profile.setPhone(phone);
        profile.setSitePhone("+55 11 3180-4040");
        profile.setPriceCents(price);
        profile.setCurrency("BRL");
        profile.setEthnicity(ethnicity);
        profile.setHeightCm(height);
        profile.setWeightKg(weight);
        profile.setHair(hair);
        profile.setEyes(eyes);
        profile.setLanguages(languages);
        profile.setAvailability(availability);
        profile.setTier(tier);
        profile.setVisible(visible);
        profile.setCreatedAt(Instant.now().minus(Duration.ofDays(daysAgo)));
        profile.setUpdatedAt(Instant.now().minus(Duration.ofDays(Math.max(0, daysAgo - 1))));
        profiles.save(profile);
        int order = 0;
        for (String photo : photos) {
            media.save(item(profile, MediaKind.PHOTO, photo, "photos", null, null, order++));
        }
        if (video != null) {
            media.save(item(profile, MediaKind.VIDEO, video, "videos", videoLabel, duration, order));
        }
        audit.record("PROFILE_SEEDED", name, visible ? "VISIBLE" : "HIDDEN", profile.getCreatedAt());
    }

    private ProfileMedia item(CompanionProfile profile, MediaKind kind, String resource, String folder, String label, String duration, int order) throws IOException {
        ProfileMedia item = new ProfileMedia();
        item.setProfile(profile);
        item.setKind(kind);
        item.setStoragePath(storage.store(new ClassPathResource("seed/" + resource).getInputStream(), folder, resource));
        item.setLabel(label);
        item.setDurationLabel(duration);
        item.setSortOrder(order);
        return item;
    }
}
