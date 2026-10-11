package com.swyp.team5.platform.verification.dto;

import java.time.LocalDateTime;

import com.swyp.team5.platform.bunjang.dto.BunjangConnectionResponse;
import com.swyp.team5.platform.entity.MemberPlatformStatus;

public record PlatformVerificationConfirmResponse(
        MemberPlatformStatus status, LocalDateTime updatedAt, boolean newBunjangAccount) {

    public static PlatformVerificationConfirmResponse of(
            BunjangConnectionResponse connection, boolean newBunjangAccount) {
        return new PlatformVerificationConfirmResponse(connection.status(), connection.updatedAt(), newBunjangAccount);
    }
}
