package com.thepersonae.service;

import com.thepersonae.config.AppProperties;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
public class FileStorageService {

    private static final Set<String> ALLOWED = Set.of("jpg", "jpeg", "png", "webp", "mp4", "webm", "mov");

    private final Path root;

    public FileStorageService(AppProperties properties) throws IOException {
        this.root = Path.of(properties.getStorage().getDir()).toAbsolutePath().normalize();
        Files.createDirectories(root);
    }

    public String store(MultipartFile file, String folder) {
        if (file == null || file.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "FILE_REQUIRED", "A file is required");
        }
        String extension = extension(file.getOriginalFilename(), file.getContentType());
        try {
            return write(folder, extension, file.getInputStream());
        } catch (IOException ex) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "STORAGE_FAILED", "Could not store the file");
        }
    }

    public String store(InputStream input, String folder, String filename) {
        String extension = extension(filename, null);
        try {
            return write(folder, extension, input);
        } catch (IOException ex) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "STORAGE_FAILED", "Could not store the file");
        }
    }

    public Path resolve(String storagePath) {
        Path path = root.resolve(storagePath).normalize();
        if (!path.startsWith(root)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_PATH", "Invalid file path");
        }
        return path;
    }

    public void delete(String storagePath) {
        if (storagePath == null || storagePath.isBlank()) {
            return;
        }
        try {
            Files.deleteIfExists(resolve(storagePath));
        } catch (IOException ignored) {
            // A missing file should not block the catalog update.
        }
    }

    private String write(String folder, String extension, InputStream input) throws IOException {
        String relative = folder + "/" + UUID.randomUUID() + "." + extension;
        Path target = resolve(relative);
        Files.createDirectories(target.getParent());
        Files.copy(input, target, StandardCopyOption.REPLACE_EXISTING);
        return relative;
    }

    private String extension(String filename, String contentType) {
        String ext = "";
        if (filename != null && filename.contains(".")) {
            ext = filename.substring(filename.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
        }
        if (!ALLOWED.contains(ext) && contentType != null) {
            ext = switch (contentType.toLowerCase(Locale.ROOT)) {
                case "image/jpeg" -> "jpg";
                case "image/png" -> "png";
                case "image/webp" -> "webp";
                case "video/mp4" -> "mp4";
                case "video/webm" -> "webm";
                case "video/quicktime" -> "mov";
                default -> ext;
            };
        }
        if (!ALLOWED.contains(ext)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "FILE_TYPE", "Use a JPG, PNG, WEBP, MP4, WEBM or MOV file");
        }
        return ext;
    }
}
