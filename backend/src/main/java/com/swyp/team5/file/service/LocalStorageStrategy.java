package com.swyp.team5.file.service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.Optional;
import java.util.UUID;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import com.swyp.team5.file.config.LocalStorageProperties;
import com.swyp.team5.file.dto.FileUploadResponse;
import com.swyp.team5.file.error.FileStorageException;

@Component
@ConditionalOnProperty(prefix = "cloud.storage", name = "provider", havingValue = "LOCAL")
public class LocalStorageStrategy implements StorageStrategy {

    private final Path baseDir;
    private final String baseUrl;

    public LocalStorageStrategy(LocalStorageProperties properties) {
        this.baseDir = Path.of(properties.baseDirectory()).toAbsolutePath().normalize();
        this.baseUrl = properties.baseUrl().replaceAll("/+$", "");
    }

    @Override
    public StorageType getType() {
        return StorageType.LOCAL;
    }

    @Override
    public FileUploadResponse upload(MultipartFile file, String directory) {
        if (file.isEmpty()) {
            throw new FileStorageException("업로드할 파일이 비어 있습니다.");
        }

        String key = buildKey(directory, file.getOriginalFilename());
        Path target = resolveSafePath(key);
        String contentType = Optional.ofNullable(file.getContentType()).orElse("application/octet-stream");

        try {
            Files.createDirectories(target.getParent());
            file.transferTo(target);
        } catch (IOException e) {
            throw new FileStorageException("파일 업로드에 실패했습니다: " + key, e);
        }

        return new FileUploadResponse(key, buildUrl(key), file.getSize(), contentType);
    }

    @Override
    public void delete(String key) {
        try {
            Files.deleteIfExists(resolveSafePath(key));
        } catch (IOException e) {
            throw new FileStorageException("파일 삭제에 실패했습니다: " + key, e);
        }
    }

    @Override
    public boolean exists(String key) {
        return Files.exists(resolveSafePath(key));
    }

    @Override
    public String getPresignedUrl(String key, Duration expiration) {
        resolveSafePath(key);
        return buildUrl(key);
    }

    private String buildUrl(String key) {
        return baseUrl + LocalStorageProperties.RESOURCE_PATH + "/" + key;
    }

    private Path resolveSafePath(String key) {
        Path resolved = baseDir.resolve(key).normalize();
        if (!resolved.startsWith(baseDir)) {
            throw new FileStorageException("허용되지 않는 파일 경로입니다: " + key);
        }
        return resolved;
    }

    private String buildKey(String directory, String originalFilename) {
        String safeName = Optional.ofNullable(originalFilename)
                .map(name -> name.replaceAll("[^a-zA-Z0-9._-]", "_"))
                .orElse("file");
        String prefix = Optional.ofNullable(directory)
                .filter(dir -> !dir.isBlank())
                .map(dir -> dir.replaceAll("/+$", "") + "/")
                .orElse("");

        return prefix + UUID.randomUUID() + "_" + safeName;
    }
}
