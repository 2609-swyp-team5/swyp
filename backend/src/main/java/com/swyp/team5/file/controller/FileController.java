package com.swyp.team5.file.controller;

import java.time.Duration;
import java.util.List;

import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.swyp.team5.file.dto.FileUploadResponse;
import com.swyp.team5.file.service.FileStorageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@Tag(name = "File", description = "파일 업로드/다운로드 API")
@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
public class FileController {

    private static final long DEFAULT_URL_EXPIRATION_SECONDS = 60 * 60 * 24 * 7;

    private final FileStorageService fileStorageService;

    @Operation(summary = "파일 업로드")
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<FileUploadResponse> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "directory", required = false) String directory) {
        FileUploadResponse response = fileStorageService.upload(file, directory);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @Operation(summary = "파일 다운로드 URL(Presigned URL) 발급")
    @GetMapping("/presigned-url")
    public ResponseEntity<String> getPresignedUrl(
            @RequestParam("key") String key,
            @RequestParam(value = "expirationSeconds", required = false) Long expirationSeconds) {
        Duration expiration =
                Duration.ofSeconds(expirationSeconds != null ? expirationSeconds : DEFAULT_URL_EXPIRATION_SECONDS);
        String url = fileStorageService.getPresignedUrl(key, expiration);
        return ResponseEntity.ok(url);
    }

    @Operation(summary = "파일 삭제")
    @DeleteMapping
    public ResponseEntity<Void> delete(@RequestParam("key") String key) {
        fileStorageService.delete(key);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "파일 일괄 삭제")
    @DeleteMapping("/batch")
    public ResponseEntity<Void> deleteAll(@RequestBody List<String> keys) {
        fileStorageService.deleteAll(keys);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "파일 존재 여부 확인")
    @GetMapping("/exists")
    public ResponseEntity<Boolean> exists(@RequestParam("key") String key) {
        return ResponseEntity.ok(fileStorageService.exists(key));
    }
}
