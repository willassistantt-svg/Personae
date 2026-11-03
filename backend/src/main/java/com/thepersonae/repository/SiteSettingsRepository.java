package com.thepersonae.repository;

import com.thepersonae.domain.SiteSettings;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SiteSettingsRepository extends JpaRepository<SiteSettings, Integer> {
}
