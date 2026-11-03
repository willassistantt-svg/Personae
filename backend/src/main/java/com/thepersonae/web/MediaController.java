package com.thepersonae.web;

import com.thepersonae.domain.AccountRole;
import com.thepersonae.domain.ProfileMedia;
import com.thepersonae.domain.UserAccount;
import com.thepersonae.repository.ProfileMediaRepository;
import com.thepersonae.service.ApiException;
import com.thepersonae.service.AuthService;
import com.thepersonae.service.FileStorageService;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;

@RestController
public class MediaController {

    private final ProfileMediaRepository media;
    private final FileStorageService storage;
    private final AuthService auth;

    public MediaController(ProfileMediaRepository media, FileStorageService storage, AuthService auth) {
        this.media = media;
        this.storage = storage;
        this.auth = auth;
    }

    @GetMapping("/api/media/{id}")
    @Transactional(readOnly = true)
    public ResponseEntity<Resource> show(@AuthenticationPrincipal UserAccount principal, @PathVariable UUID id) {
        UserAccount user = auth.requireUser(principal);
        ProfileMedia item = media.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Media not found"));
        if (!item.getProfile().isVisible() && user.getRole() != AccountRole.ADMIN) {
            throw new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Media not found");
        }
        return file(item.getStoragePath());
    }

    static ResponseEntity<Resource> file(FileStorageService storage, String storagePath) {
        Path path = storage.resolve(storagePath);
        if (!Files.exists(path)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "File not found");
        }
        String name = path.getFileName().toString().toLowerCase();
        MediaType type = MediaType.APPLICATION_OCTET_STREAM;
        if (name.endsWith(".png")) {
            type = MediaType.IMAGE_PNG;
        } else if (name.endsWith(".webp")) {
            type = MediaType.parseMediaType("image/webp");
        } else if (name.endsWith(".jpg") || name.endsWith(".jpeg")) {
            type = MediaType.IMAGE_JPEG;
        } else if (name.endsWith(".mp4")) {
            type = MediaType.parseMediaType("video/mp4");
        } else if (name.endsWith(".webm")) {
            type = MediaType.parseMediaType("video/webm");
        } else if (name.endsWith(".mov")) {
            type = MediaType.parseMediaType("video/quicktime");
        }
        return ResponseEntity.ok()
                .contentType(type)
                .header("Cache-Control", "private, max-age=3600")
                .body(new FileSystemResource(path));
    }

    private ResponseEntity<Resource> file(String storagePath) {
        return file(storage, storagePath);
    }
}
