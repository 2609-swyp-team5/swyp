package com.swyp.team5.common.error;

import java.util.List;

import jakarta.validation.ConstraintViolationException;

import lombok.extern.slf4j.Slf4j;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import com.swyp.team5.auth.error.DuplicateEmailException;
import com.swyp.team5.auth.error.DuplicatePhoneException;
import com.swyp.team5.auth.error.InactiveMemberException;
import com.swyp.team5.auth.error.InvalidCredentialsException;
import com.swyp.team5.auth.error.InvalidPasswordResetTokenException;
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

    @ExceptionHandler({
        InvalidCredentialsException.class,
        InvalidTokenException.class,
        InvalidSocialTokenException.class,
        InvalidPasswordResetTokenException.class
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

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleInvalidRequestBody(MethodArgumentNotValidException e) {
        List<ErrorDetail> details = e.getBindingResult().getFieldErrors().stream()
                .map(fieldError -> new ErrorDetail(fieldError.getField(), fieldError.getDefaultMessage()))
                .toList();
        log.warn("요청 검증 실패: {}", details);
        return errorResponse(HttpStatus.BAD_REQUEST, "INVALID_INPUT_VALUE", "입력값이 올바르지 않습니다.", details);
    }

    /**
     * {@code @RequestParam}/{@code @PathVariable} 등 요청 본문이 아닌 파라미터에 붙은 Bean Validation
     * 제약(예: {@code @PositiveOrZero})을 위반한 경우. 컨트롤러 클래스에 {@code @Validated}가 있어야
     * 발생한다.
     */
    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiResponse<Void>> handleConstraintViolation(ConstraintViolationException e) {
        List<ErrorDetail> details = e.getConstraintViolations().stream()
                .map(violation -> new ErrorDetail(
                        lastPathSegment(violation.getPropertyPath().toString()), violation.getMessage()))
                .toList();
        log.warn("요청 파라미터 검증 실패: {}", details);
        return errorResponse(HttpStatus.BAD_REQUEST, "INVALID_INPUT_VALUE", "입력값이 올바르지 않습니다.", details);
    }

    /**
     * 필수 {@code @RequestParam}이 요청에 아예 빠진 경우(예: multipart 요청의 필수 폼 필드 누락).
     */
    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ApiResponse<Void>> handleMissingRequestParameter(MissingServletRequestParameterException e) {
        List<ErrorDetail> details = List.of(new ErrorDetail(e.getParameterName(), "필수 값입니다."));
        log.warn("필수 요청 파라미터 누락: {}", e.getParameterName());
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

    /**
     * 존재하지 않는 정적 리소스 요청(잘못된 URL 등). Spring이 기본으로 404 처리하는 예외지만, 여기서
     * 잡지 않으면 아래 {@link #handleException}으로 흘러가 500 + "예기치 못한 오류"로 잘못 보고된다.
     */
    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleNoResourceFound(NoResourceFoundException e) {
        log.warn("존재하지 않는 정적 리소스 요청: {}", e.getResourcePath());
        return errorResponse(HttpStatus.NOT_FOUND, "NOT_FOUND", "요청한 리소스를 찾을 수 없습니다.");
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleException(Exception e) {
        log.error("예기치 못한 오류가 발생했습니다.", e);
        return errorResponse(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_SERVER_ERROR", "서버 내부 오류가 발생했습니다.");
    }

    private ResponseEntity<ApiResponse<Void>> errorResponse(HttpStatus status, String code, String message) {
        return errorResponse(status, code, message, null);
    }

    /**
     * {@code ConstraintViolation}의 property path(예: {@code createFromImages.purchasedMonths})에서
     * 파라미터 이름만 추출한다.
     */
    private static String lastPathSegment(String propertyPath) {
        int lastDot = propertyPath.lastIndexOf('.');
        return lastDot == -1 ? propertyPath : propertyPath.substring(lastDot + 1);
    }

    private ResponseEntity<ApiResponse<Void>> errorResponse(
            HttpStatus status, String code, String message, List<ErrorDetail> details) {
        ApiError error = ApiError.of(status, code, details);
        return ResponseEntity.status(status).body(ApiResponse.error(message, error));
    }
}
