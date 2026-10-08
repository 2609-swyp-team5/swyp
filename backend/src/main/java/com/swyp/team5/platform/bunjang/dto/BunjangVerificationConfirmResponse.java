package com.swyp.team5.platform.bunjang.dto;

import java.time.LocalDateTime;

import com.swyp.team5.platform.entity.MemberPlatformStatus;

public record BunjangVerificationConfirmResponse(
        MemberPlatformStatus status, LocalDateTime updatedAt, boolean newBunjangAccount) {

    public static BunjangVerificationConfirmResponse of(
            BunjangConnectionResponse connection, boolean newBunjangAccount) {
        return new BunjangVerificationConfirmResponse(connection.status(), connection.updatedAt(), newBunjangAccount);
    }
}
