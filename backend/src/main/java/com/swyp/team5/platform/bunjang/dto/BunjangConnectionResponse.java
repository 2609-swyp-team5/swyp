package com.swyp.team5.platform.bunjang.dto;

import java.time.LocalDateTime;

import com.swyp.team5.platform.entity.MemberPlatform;
import com.swyp.team5.platform.entity.MemberPlatformStatus;

public record BunjangConnectionResponse(MemberPlatformStatus status, LocalDateTime updatedAt) {

    public static BunjangConnectionResponse from(MemberPlatform memberPlatform) {
        return new BunjangConnectionResponse(memberPlatform.getStatus(), memberPlatform.getUpdatedAt());
    }

    public static BunjangConnectionResponse disconnected() {
        return new BunjangConnectionResponse(MemberPlatformStatus.DISCONNECTED, null);
    }
}
