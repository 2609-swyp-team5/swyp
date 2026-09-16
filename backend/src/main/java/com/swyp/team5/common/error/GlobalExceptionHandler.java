package com.swyp.team5.common.error;

import java.util.List;

import lombok.extern.slf4j.Slf4j;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
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
import com.swyp.team5.category.error.CategoryNotFoundException;
import com.swyp.team5.common.common.ApiError;
import com.swyp.team5.common.common.ApiResponse;
import com.swyp.team5.common.common.ErrorDetail;
import com.swyp.team5.file.error.FileStorageException;
import com.swyp.team5.product.error.ProductAccessDeniedException;
import com.swyp.team5.product.error.ProductNotFoundException;

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

    @ExceptionHandler({ProductNotFoundException.class, CategoryNotFoundException.class})
    public ResponseEntity<ApiResponse<Void>> handleNotFound(RuntimeException e) {
        log.warn("리소스를 찾을 수 없음: {}", e.getMessage());
        return errorResponse(HttpStatus.NOT_FOUND, "NOT_FOUND", e.getMessage());
    }

    @ExceptionHandler(ProductAccessDeniedException.class)
    public ResponseEntity<ApiResponse<Void>> handleProductAccessDenied(ProductAccessDeniedException e) {
        log.warn("상품 접근 권한 없음: {}", e.getMessage());
        return errorResponse(HttpStatus.FORBIDDEN, "FORBIDDEN", e.getMessage());
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiResponse<Void>> handleDataIntegrityViolation(DataIntegrityViolationException e) {
        log.warn("데이터 무결성 제약 위반: {}", e.getMessage());
        return errorResponse(HttpStatus.CONFLICT, "CONFLICT", "이미 사용 중인 값입니다.");
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiResponse<Void>> handleMessageNotReadable(HttpMessageNotReadableException e) {
        log.warn("요청 본문을 읽을 수 없음: {}", e.getMessage());
        return errorResponse(HttpStatus.BAD_REQUEST, "INVALID_INPUT_VALUE", "요청 본문의 형식이 올바르지 않습니다.");
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleInvalidRequestBody(MethodArgumentNotValidException e) {
        List<ErrorDetail> details = e.getBindingResult().getFieldErrors().stream()
                .map(fieldError -> new ErrorDetail(fieldError.getField(), fieldError.getDefaultMessage()))
                .toList();
        log.warn("요청 검증 실패: {}", details);
        return errorResponse(HttpStatus.BAD_REQUEST, "INVALID_INPUT_VALUE", "입력값이 올바르지 않습니다.", details);
    }

    /**
     * 요청 본문 자체를 읽지 못한 경우. JSON 문법 오류이거나, enum 필드에 정의되지 않은 값이 온 경우다.
     *
     * <p>예외 메시지에는 파서 내부 정보가 들어 있어 그대로 내려주지 않고 로그로만 남긴다.
     */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiResponse<Void>> handleUnreadableRequestBody(HttpMessageNotReadableException e) {
        log.warn("요청 본문을 읽을 수 없습니다: {}", e.getMessage());
        return errorResponse(HttpStatus.BAD_REQUEST, "INVALID_INPUT_VALUE", "요청 본문의 형식이 올바르지 않습니다.");
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
