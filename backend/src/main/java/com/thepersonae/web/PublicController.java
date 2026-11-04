package com.thepersonae.web;

import com.thepersonae.service.ProfileService;
import com.thepersonae.web.dto.Presenter;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class PublicController {

    private final ProfileService profiles;
    private final Presenter presenter;
    private final JdbcTemplate jdbc;

    public PublicController(ProfileService profiles, Presenter presenter, JdbcTemplate jdbc) {
        this.profiles = profiles;
        this.presenter = presenter;
        this.jdbc = jdbc;
    }

    @GetMapping("/api/health")
    public ResponseEntity<Map<String, String>> health() {
        try {
            jdbc.queryForObject("SELECT 1", Integer.class);
            return ResponseEntity.ok(Map.of("status", "UP", "database", "UP"));
        } catch (RuntimeException ex) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of("status", "DOWN", "database", "DOWN"));
        }
    }

    @GetMapping("/api/public/house")
    public Presenter.HouseView house() {
        return presenter.house(profiles.house());
    }
}
