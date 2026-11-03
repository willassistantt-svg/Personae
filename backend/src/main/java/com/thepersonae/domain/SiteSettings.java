package com.thepersonae.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "site_settings")
@Getter
@Setter
@NoArgsConstructor
public class SiteSettings {

    @Id
    private Integer id;

    @Column(name = "site_phone", nullable = false, length = 40)
    private String sitePhone;

    @Column(name = "site_email", nullable = false, length = 180)
    private String siteEmail;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
