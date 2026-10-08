package com.swyp.team5.platform.error;

import java.util.List;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpStatus;

import com.swyp.team5.common.common.ErrorDetail;
import com.swyp.team5.common.error.LogDetail;

public class BunjangVerificationException extends RuntimeException implements LogDetail {

    @Getter
    private final Reason reason;

    @Getter
    private final List<ErrorDetail> details;

    private final String logDetail;

    private BunjangVerificationException(Reason reason, String message, List<ErrorDetail> details, String logDetail) {
        super(message);
        this.reason = reason;
        this.details = details;
        this.logDetail = logDetail;
    }

    public static BunjangVerificationException rejected(String message, String logDetail) {
        return rejected(message, null, logDetail);
    }

    public static BunjangVerificationException rejected(String message, List<ErrorDetail> details, String logDetail) {
        String resolved = message == null || message.isBlank() ? Reason.REJECTED.getMessage() : message;
        return new BunjangVerificationException(Reason.REJECTED, resolved, details, logDetail);
    }

    public static BunjangVerificationException notFound(Long memberId, String verificationId) {
        return of(Reason.NOT_FOUND, "memberId=" + memberId + ", verificationId=" + verificationId);
    }

    public static BunjangVerificationException inProgress(Long memberId) {
        return of(Reason.IN_PROGRESS, "memberId=" + memberId);
    }

    public static BunjangVerificationException limitExceeded(Long memberId, long retryAfterMinutes) {
        return new BunjangVerificationException(
                Reason.LIMIT_EXCEEDED,
                "번개장터 연결 요청이 너무 많습니다. 약 " + retryAfterMinutes + "분 뒤에 다시 시도해 주십시오.",
                null,
                "memberId=" + memberId);
    }

    public static BunjangVerificationException busy() {
        return of(Reason.BUSY, null);
    }

    public static BunjangVerificationException failed(String logDetail) {
        return of(Reason.FAILED, logDetail);
    }

    private static BunjangVerificationException of(Reason reason, String logDetail) {
        return new BunjangVerificationException(reason, reason.getMessage(), null, logDetail);
    }

    @Override
    public String logDetail() {
        return logDetail;
    }

    @Getter
    @RequiredArgsConstructor
    public enum Reason {
        REJECTED(HttpStatus.BAD_REQUEST, "INVALID_INPUT_VALUE", "번개장터 본인인증에 실패했습니다. 입력한 정보를 확인해 주십시오."),
        NOT_FOUND(HttpStatus.NOT_FOUND, "NOT_FOUND", "인증 요청이 만료되었거나 찾을 수 없습니다. 처음부터 다시 진행해 주십시오."),
        IN_PROGRESS(HttpStatus.CONFLICT, "CONFLICT", "이미 번개장터 본인인증 문자를 요청하고 있습니다. 잠시 후 다시 시도해 주십시오."),
        LIMIT_EXCEEDED(HttpStatus.TOO_MANY_REQUESTS, "TOO_MANY_REQUESTS", "번개장터 연결 요청이 너무 많습니다. 잠시 후 다시 시도해 주십시오."),
        BUSY(
                HttpStatus.SERVICE_UNAVAILABLE,
                "BUNJANG_VERIFICATION_BUSY",
                "번개장터 연결 요청이 많아 지금은 처리할 수 없습니다. 잠시 후 다시 시도해 주십시오."),
        FAILED(HttpStatus.BAD_GATEWAY, "BAD_GATEWAY", "번개장터 본인인증을 진행하지 못했습니다. 잠시 후 다시 시도해 주십시오.");

        private final HttpStatus status;
        private final String code;
        private final String message;
    }
}
