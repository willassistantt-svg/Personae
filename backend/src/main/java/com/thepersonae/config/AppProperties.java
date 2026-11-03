package com.thepersonae.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Getter
@Setter
@ConfigurationProperties(prefix = "personae")
public class AppProperties {
    private String publicUrl;
    private boolean seedEnabled = true;
    private String corsOrigins;
    private Jwt jwt = new Jwt();
    private Storage storage = new Storage();
    private Resend resend = new Resend();
    private Admin admin = new Admin();
    private Cookie cookie = new Cookie();

    @Getter
    @Setter
    public static class Jwt {
        private String secret;
        private int ttlHours = 12;
    }

    @Getter
    @Setter
    public static class Storage {
        private String dir;
    }

    @Getter
    @Setter
    public static class Resend {
        private String apiKey;
        private String from;
    }

    @Getter
    @Setter
    public static class Admin {
        private String email;
        private String password;
        private String name;
    }

    @Getter
    @Setter
    public static class Cookie {
        private boolean secure;
        private int rememberDays = 30;
    }
}
