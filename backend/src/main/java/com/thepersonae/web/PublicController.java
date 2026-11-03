package com.thepersonae.web;

import com.thepersonae.service.ProfileService;
import com.thepersonae.web.dto.Presenter;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class PublicController {

    private final ProfileService profiles;
    private final Presenter presenter;

    public PublicController(ProfileService profiles, Presenter presenter) {
        this.profiles = profiles;
        this.presenter = presenter;
    }

    @GetMapping("/api/health")
    public Map<String, String> health() {
        return Map.of("status", "UP");
    }

    @GetMapping("/api/public/house")
    public Presenter.HouseView house() {
        return presenter.house(profiles.house());
    }
}
