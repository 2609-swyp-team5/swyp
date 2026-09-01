package com.swyp.team5.file.service;

import java.time.Duration;
import java.util.List;

import org.springframework.web.multipart.MultipartFile;

import com.swyp.team5.file.dto.FileUploadResponse;

public interface StorageStrategy {

    StorageType getType();

    FileUploadResponse upload(MultipartFile file, String directory);

    void delete(String key);

    default void deleteAll(List<String> keys) {
        keys.forEach(this::delete);
    }

    boolean exists(String key);

    String getPresignedUrl(String key, Duration expiration);
}
