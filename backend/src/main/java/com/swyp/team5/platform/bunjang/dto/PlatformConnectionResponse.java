package com.swyp.team5.platform.bunjang.dto;

import java.time.LocalDateTime;

import com.swyp.team5.platform.entity.MemberPlatformStatus;
import com.swyp.team5.platform.entity.PlatformType;

/** 외부 플랫폼 연동 목록의 한 항목. 연동 이력이 없는 플랫폼은 {@code DISCONNECTED}, {@code updatedAt=null}. */
public record PlatformConnectionResponse(
        PlatformType platform, String platformName, MemberPlatformStatus status, LocalDateTime updatedAt) {

    public static PlatformConnectionResponse of(PlatformType platform, BunjangConnectionResponse connection) {
        return new PlatformConnectionResponse(
                platform, platform.getPlatformName(), connection.status(), connection.updatedAt());
    }
}
