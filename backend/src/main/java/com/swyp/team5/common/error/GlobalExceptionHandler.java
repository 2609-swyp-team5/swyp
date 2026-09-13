package com.swyp.team5.common.error;

import java.util.List;

import lombok.extern.slf4j.Slf4j;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import com.swyp.team5.auth.error.DuplicateEmailException;
import com.swyp.team5.auth.error.DuplicatePhoneException;
import com.swyp.team5.auth.error.InactiveMemberException;
import com.swyp.team5.auth.error.InvalidCredentialsException;
import com.swyp.team5.auth.error.InvalidSocialTokenException;
import com.swyp.team5.auth.error.InvalidTokenException;
import com.swyp.team5.auth.error.UnsupportedSocialProviderException;
import com.swyp.team5.common.common.ApiError;
import com.swyp.team5.common.common.ApiResponse;
import com.swyp.team5.common.common.ErrorDetail;
import com.swyp.team5.file.error.FileStorageException;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(FileStorageException.class)
    public ResponseEntity<ApiResponse<Void>> handleFileStorageException(FileStorageException e) {
        log.warn("파일 스토리지 처리 실패: {}", e.getMessage(), e);
        return errorResponse(HttpStatus.BAD_REQUEST, "BAD_REQUEST", e.getMessage());
    }

    @ExceptionHandler({DuplicateEmailException.class, DuplicatePhoneException.class})
    public ResponseEntity<ApiResponse<Void>> handleDuplicateSignUpField(RuntimeException e) {
        log.warn("회원가입 실패: {}", e.getMessage());
        return errorResponse(HttpStatus.CONFLICT, "CONFLICT", e.getMessage());
    }

    @ExceptionHandler({InvalidCredentialsException.class, InvalidTokenException.class, InvalidSocialTokenException.class
    })
    public ResponseEntity<ApiResponse<Void>> handleAuthenticationFailure(RuntimeException e) {
        log.warn("인증 실패: {}", e.getMessage());
        return errorResponse(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", e.getMessage());
    }

    @ExceptionHandler(InactiveMemberException.class)
    public ResponseEntity<ApiResponse<Void>> handleInactiveMember(InactiveMemberException e) {
        log.warn("비활성 계정 접근 시도: {}", e.getMessage());
        return errorResponse(HttpStatus.FORBIDDEN, "FORBIDDEN", e.getMessage());
    }

    @ExceptionHandler(UnsupportedSocialProviderException.class)
    public ResponseEntity<ApiResponse<Void>> handleUnsupportedSocialProvider(UnsupportedSocialProviderException e) {
        log.warn("지원하지 않는 소셜 로그인 provider: {}", e.getMessage());
        return errorResponse(HttpStatus.BAD_REQUEST, "INVALID_INPUT_VALUE", e.getMessage());
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiResponse<Void>> handleDataIntegrityViolation(DataIntegrityViolationException e) {
        log.warn("데이터 무결성 제약 위반: {}", e.getMessage());
        return errorResponse(HttpStatus.CONFLICT, "CONFLICT", "이미 사용 중인 값입니다.");
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleInvalidRequestBody(MethodArgumentNotValidException e) {
        List<ErrorDetail> details = e.getBindingResult().getFieldErrors().stream()
                .map(fieldError -> new ErrorDetail(fieldError.getField(), fieldError.getDefaultMessage()))
                .toList();
        log.warn("요청 검증 실패: {}", details);
        return errorResponse(HttpStatus.BAD_REQUEST, "INVALID_INPUT_VALUE", "입력값이 올바르지 않습니다.", details);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleException(Exception e) {
        log.error("예기치 못한 오류가 발생했습니다.", e);
        return errorResponse(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_SERVER_ERROR", "서버 내부 오류가 발생했습니다.");
    }

    private ResponseEntity<ApiResponse<Void>> errorResponse(HttpStatus status, String code, String message) {
        return errorResponse(status, code, message, null);
    }

    private ResponseEntity<ApiResponse<Void>> errorResponse(
            HttpStatus status, String code, String message, List<ErrorDetail> details) {
        ApiError error = ApiError.of(status, code, details);
        return ResponseEntity.status(status).body(ApiResponse.error(message, error));
    }
}
