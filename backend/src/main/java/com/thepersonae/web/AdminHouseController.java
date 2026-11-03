package com.thepersonae.web;

import com.thepersonae.service.HouseService;
import com.thepersonae.web.dto.Presenter;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class AdminHouseController {

    private final HouseService house;
    private final Presenter presenter;

    public AdminHouseController(HouseService house, Presenter presenter) {
        this.house = house;
        this.presenter = presenter;
    }

    @GetMapping("/api/admin/dashboard")
    public Presenter.DashboardView dashboard() {
        return presenter.dashboard(house.dashboard());
    }

    @GetMapping("/api/admin/activity")
    public List<Presenter.AuditView> activity() {
        return house.activity().stream().map(presenter::audit).toList();
    }

    @GetMapping("/api/admin/settings")
    public Presenter.HouseView settings() {
        return presenter.house(house.currentSettings());
    }

    @PutMapping("/api/admin/settings")
    public Presenter.HouseView update(@RequestBody SettingsRequest request) {
        return presenter.house(house.updateSettings(request.sitePhone(), request.siteEmail()));
    }

    public record SettingsRequest(String sitePhone, String siteEmail) {
    }
}
