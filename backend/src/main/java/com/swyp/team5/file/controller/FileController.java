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

import com.swyp.team5.common.common.ApiResponse;
import com.swyp.team5.file.dto.FileUploadResponse;
import com.swyp.team5.file.service.FileStorageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@Tag(name = "File", description = "파일 업로드/다운로드 API")
@RestController
@RequestMapping("/files")
@RequiredArgsConstructor
public class FileController {

    private static final long DEFAULT_URL_EXPIRATION_SECONDS = 60 * 60 * 24 * 7;

    private final FileStorageService fileStorageService;

    /**
     * 파일을 업로드하고 접근 URL을 발급한다. 여러 파일을 한 번에 업로드할 수 있도록 {@code file[]}
     * 멀티파트 필드로 전달받는다.
     *
     * @param files 업로드할 파일 목록
     * @param directory 저장 디렉터리(선택)
     * @return 201 Created + 업로드된 파일별 key/url 목록(요청 순서 유지)
     */
    @Operation(summary = "파일 업로드", description = "여러 파일을 file[] 멀티파트 필드로 한 번에 업로드하고, 각 파일의 URL을 목록으로 반환한다.")
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<List<FileUploadResponse>>> upload(
            @RequestParam("file[]") List<MultipartFile> files,
            @RequestParam(value = "directory", required = false) String directory) {
        List<FileUploadResponse> response = fileStorageService.uploadAll(files, directory);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }

    @Operation(summary = "파일 다운로드 URL(Presigned URL) 발급")
    @GetMapping("/presigned-url")
    public ResponseEntity<ApiResponse<String>> getPresignedUrl(
            @RequestParam("key") String key,
            @RequestParam(value = "expirationSeconds", required = false) Long expirationSeconds) {
        Duration expiration =
                Duration.ofSeconds(expirationSeconds != null ? expirationSeconds : DEFAULT_URL_EXPIRATION_SECONDS);
        String url = fileStorageService.getPresignedUrl(key, expiration);
        return ResponseEntity.ok(ApiResponse.success(url));
    }

    @Operation(summary = "파일 삭제")
    @DeleteMapping
    public ResponseEntity<ApiResponse<Void>> delete(@RequestParam("key") String key) {
        fileStorageService.delete(key);
        return ResponseEntity.ok(ApiResponse.<Void>success(null));
    }

    @Operation(summary = "파일 일괄 삭제")
    @DeleteMapping("/batch")
    public ResponseEntity<ApiResponse<Void>> deleteAll(@RequestBody List<String> keys) {
        fileStorageService.deleteAll(keys);
        return ResponseEntity.ok(ApiResponse.<Void>success(null));
    }

    @Operation(summary = "파일 존재 여부 확인")
    @GetMapping("/exists")
    public ResponseEntity<ApiResponse<Boolean>> exists(@RequestParam("key") String key) {
        return ResponseEntity.ok(ApiResponse.success(fileStorageService.exists(key)));
    }
}
