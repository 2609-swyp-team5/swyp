package com.swyp.team5.file.service;

import java.io.IOException;
import java.time.Duration;
import java.util.Optional;
import java.util.UUID;

import lombok.RequiredArgsConstructor;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import com.swyp.team5.file.config.NaverProperties;
import com.swyp.team5.file.dto.FileUploadResponse;
import com.swyp.team5.file.error.FileStorageException;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.HeadObjectRequest;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;

@Component
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "cloud.storage", name = "provider", havingValue = "NAVER")
public class NaverStorageStrategy implements StorageStrategy {

    private static final Duration DEFAULT_URL_EXPIRATION = Duration.ofDays(7);

    private final S3Client naverClient;
    private final S3Presigner naverPresigner;
    private final NaverProperties properties;

    @Override
    public StorageType getType() {
        return StorageType.NAVER;
    }

    @Override
    public FileUploadResponse upload(MultipartFile file, String directory) {
        if (file.isEmpty()) {
            throw new FileStorageException("업로드할 파일이 비어 있습니다.");
        }

        String key = buildKey(directory, file.getOriginalFilename());
        String contentType = Optional.ofNullable(file.getContentType()).orElse("application/octet-stream");

        try {
            PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                    .bucket(properties.bucket())
                    .key(key)
                    .contentType(contentType)
                    .build();

            naverClient.putObject(putObjectRequest, RequestBody.fromInputStream(file.getInputStream(), file.getSize()));
        } catch (IOException | S3Exception e) {
            throw new FileStorageException("파일 업로드에 실패했습니다: " + key, e);
        }

        String url = resolveUrl(key);
        return new FileUploadResponse(key, url, file.getSize(), contentType);
    }

    @Override
    public void delete(String key) {
        try {
            naverClient.deleteObject(DeleteObjectRequest.builder()
                    .bucket(properties.bucket())
                    .key(key)
                    .build());
        } catch (S3Exception e) {
            throw new FileStorageException("파일 삭제에 실패했습니다: " + key, e);
        }
    }

    @Override
    public boolean exists(String key) {
        try {
            naverClient.headObject(HeadObjectRequest.builder()
                    .bucket(properties.bucket())
                    .key(key)
                    .build());
            return true;
        } catch (NoSuchKeyException e) {
            return false;
        } catch (S3Exception e) {
            throw new FileStorageException("파일 존재 여부 확인에 실패했습니다: " + key, e);
        }
    }

    @Override
    public String getPresignedUrl(String key, Duration expiration) {
        GetObjectRequest getObjectRequest =
                GetObjectRequest.builder().bucket(properties.bucket()).key(key).build();

        GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                .signatureDuration(expiration)
                .getObjectRequest(getObjectRequest)
                .build();

        return naverPresigner.presignGetObject(presignRequest).url().toString();
    }

    private String resolveUrl(String key) {
        return Optional.ofNullable(properties.publicBaseUrl())
                .filter(base -> !base.isBlank())
                .map(base -> base.replaceAll("/+$", "") + "/" + key)
                .orElseGet(() -> getPresignedUrl(key, DEFAULT_URL_EXPIRATION));
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
