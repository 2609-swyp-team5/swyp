package com.swyp.team5.product.dto;

import com.swyp.team5.platform.entity.PlatformType;

/** 상품 목록 조회(통합 검색)의 플랫폼 필터 값 — 우리 서비스 상품({@link #OUR}) 또는 수집 대상 외부 플랫폼. */
public enum ProductSearchPlatform {
    OUR(null),
    BUNJANG(PlatformType.BUNJANG);

    private final PlatformType platformType;

    ProductSearchPlatform(PlatformType platformType) {
        this.platformType = platformType;
    }

    /** 외부 플랫폼이면 {@code platforms.name} 값, 우리 서비스면 {@code null}. */
    public String platformName() {
        return platformType == null ? null : platformType.getPlatformName();
    }
}
