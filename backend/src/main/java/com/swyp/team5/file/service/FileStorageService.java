package com.swyp.team5.file.service;

import java.time.Duration;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.swyp.team5.file.dto.FileUploadResponse;

@Service
public class FileStorageService {

    private final StorageStrategyFactory storageStrategyFactory;
    private final StorageType storageType;

    public FileStorageService(
            StorageStrategyFactory storageStrategyFactory,
            @Value("${cloud.storage.provider:R2}") StorageType storageType) {
        this.storageStrategyFactory = storageStrategyFactory;
        this.storageType = storageType;
    }

    public FileUploadResponse upload(MultipartFile file, String directory) {
        return strategy().upload(file, directory);
    }

    public void delete(String key) {
        strategy().delete(key);
    }

    public void deleteAll(List<String> keys) {
        strategy().deleteAll(keys);
    }

    public boolean exists(String key) {
        return strategy().exists(key);
    }

    public String getPresignedUrl(String key, Duration expiration) {
        return strategy().getPresignedUrl(key, expiration);
    }

    private StorageStrategy strategy() {
        return storageStrategyFactory.getStrategy(storageType);
    }
}
