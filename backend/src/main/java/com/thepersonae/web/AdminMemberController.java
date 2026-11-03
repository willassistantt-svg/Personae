package com.thepersonae.web;

import com.thepersonae.domain.AccountStatus;
import com.thepersonae.domain.UserAccount;
import com.thepersonae.service.ApiException;
import com.thepersonae.service.AuthService;
import com.thepersonae.service.FileStorageService;
import com.thepersonae.service.MemberAdminService;
import com.thepersonae.web.dto.Presenter;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
public class AdminMemberController {

    private final MemberAdminService members;
    private final AuthService auth;
    private final Presenter presenter;
    private final FileStorageService storage;

    public AdminMemberController(MemberAdminService members, AuthService auth, Presenter presenter, FileStorageService storage) {
        this.members = members;
        this.auth = auth;
        this.presenter = presenter;
        this.storage = storage;
    }

    @GetMapping("/api/admin/members")
    public List<Presenter.MemberView> list(@RequestParam(required = false) String status) {
        AccountStatus parsed = status == null || status.isBlank() ? null : AccountStatus.valueOf(status);
        return members.list(parsed).stream().map(presenter::member).toList();
    }

    @GetMapping("/api/admin/members/{id}")
    public Presenter.MemberView get(@PathVariable UUID id) {
        return presenter.member(members.get(id));
    }

    @GetMapping("/api/admin/members/{id}/document")
    public ResponseEntity<Resource> document(@PathVariable UUID id) {
        UserAccount user = members.get(id);
        if (user.getDocumentPath() == null) {
            throw new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "No document was sent");
        }
        return MediaController.file(storage, user.getDocumentPath());
    }

    @PostMapping("/api/admin/members")
    public Presenter.IssuedView create(
            @RequestParam String firstName,
            @RequestParam String lastName,
            @RequestParam String email,
            @RequestParam String birthDate,
            @RequestParam String phone,
            @RequestParam String city,
            @RequestParam String state,
            @RequestParam String country,
            @RequestParam boolean contactAuthorized,
            @RequestParam(required = false) String travelLocations,
            @RequestParam(defaultValue = "pt") String locale,
            @RequestParam(defaultValue = "true") boolean sendEmail,
            @RequestParam(value = "document", required = false) MultipartFile document
    ) {
        return presenter.issued(members.createDirect(
                firstName, lastName, email, LocalDate.parse(birthDate), phone, city, state, country,
                contactAuthorized, travelLocations, locale, document, sendEmail
        ));
    }

    @PostMapping("/api/admin/members/{id}/approve")
    public Presenter.IssuedView approve(@PathVariable UUID id, @RequestParam(defaultValue = "true") boolean sendEmail) {
        return presenter.issued(members.approve(id, sendEmail));
    }

    @PostMapping("/api/admin/members/{id}/reject")
    public Presenter.MemberView reject(@PathVariable UUID id) {
        return presenter.member(members.reject(id));
    }

    @PostMapping("/api/admin/members/{id}/disable")
    public Presenter.MemberView disable(@AuthenticationPrincipal UserAccount principal, @PathVariable UUID id) {
        return presenter.member(members.disable(id, auth.requireUser(principal)));
    }

    @PostMapping("/api/admin/members/{id}/enable")
    public Presenter.MemberView enable(@PathVariable UUID id) {
        return presenter.member(members.enable(id));
    }

    @DeleteMapping("/api/admin/members/{id}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal UserAccount principal, @PathVariable UUID id) {
        members.delete(id, auth.requireUser(principal));
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/api/admin/members/{id}/link")
    public Presenter.IssuedView link(@PathVariable UUID id, @RequestParam(defaultValue = "true") boolean sendEmail) {
        return presenter.issued(members.resend(id, sendEmail));
    }

    @GetMapping("/api/admin/links")
    public List<Presenter.LinkView> links() {
        return members.openLinks().stream().map(presenter::link).toList();
    }
}
