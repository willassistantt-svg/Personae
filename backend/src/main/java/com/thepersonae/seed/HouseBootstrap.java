package com.thepersonae.seed;

import com.thepersonae.config.AppProperties;
import com.thepersonae.domain.AccountRole;
import com.thepersonae.domain.AccountStatus;
import com.thepersonae.domain.SiteSettings;
import com.thepersonae.domain.UserAccount;
import com.thepersonae.repository.SiteSettingsRepository;
import com.thepersonae.repository.UserAccountRepository;
import com.thepersonae.service.AuditService;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;

/**
 * Runs in every environment: the house settings row and the first director account must exist
 * even when the demo seed is off.
 */
@Component
@Order(10)
public class HouseBootstrap implements ApplicationRunner {

    private final AppProperties properties;
    private final UserAccountRepository users;
    private final SiteSettingsRepository settings;
    private final PasswordEncoder encoder;
    private final AuditService audit;

    public HouseBootstrap(
            AppProperties properties,
            UserAccountRepository users,
            SiteSettingsRepository settings,
            PasswordEncoder encoder,
            AuditService audit
    ) {
        this.properties = properties;
        this.users = users;
        this.settings = settings;
        this.encoder = encoder;
        this.audit = audit;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (settings.findById(1).isEmpty()) {
            SiteSettings house = new SiteSettings();
            house.setId(1);
            house.setSitePhone("+55 11 3180-4040");
            house.setSiteEmail("casa@personae.men");
            house.setUpdatedAt(Instant.now());
            settings.save(house);
        }

        AppProperties.Admin admin = properties.getAdmin();
        if (users.existsByEmailIgnoreCase(admin.getEmail())) {
            return;
        }
        String[] names = admin.getName().split(" ", 2);
        UserAccount director = new UserAccount();
        director.setFirstName(names[0]);
        director.setLastName(names.length > 1 ? names[1] : "Director");
        director.setEmail(admin.getEmail());
        director.setPasswordHash(encoder.encode(admin.getPassword()));
        director.setBirthDate(LocalDate.of(1984, 4, 12));
        director.setPhone("+55 11 3180-4040");
        director.setCity("São Paulo");
        director.setState("SP");
        director.setCountry("Brasil");
        director.setContactAuthorized(true);
        director.setRole(AccountRole.ADMIN);
        director.setStatus(AccountStatus.ACTIVE);
        director.setLocale("pt");
        director.setMemberCode("TP-" + String.format("%04d", users.count() + 1));
        director.setCreatedAt(Instant.now());
        director.setUpdatedAt(director.getCreatedAt());
        users.save(director);
        audit.record("MEMBER_SEEDED", admin.getEmail(), AccountStatus.ACTIVE.name(), director.getCreatedAt());
    }
}
