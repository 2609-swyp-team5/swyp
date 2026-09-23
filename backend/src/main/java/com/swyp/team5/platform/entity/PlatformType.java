package com.swyp.team5.platform.entity;

import java.util.Arrays;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.swyp.team5.platform.error.UnsupportedPlatformException;

/**
 * 회원이 연동해 상품을 등록할 수 있는 외부 플랫폼 종류. API 경로의 {@code /platforms/{platform}} 값으로
 * 쓰이며, {@link #platformName}은 {@code platforms} 테이블의 {@code name}(시드 값)과 같다.
 */
@Getter
@RequiredArgsConstructor
public enum PlatformType {
    BUNJANG("번개장터");

    private final String platformName;

    /**
     * 대소문자를 구분하지 않고 문자열을 {@link PlatformType}으로 변환한다(경로에 {@code bunjang}처럼 소문자로
     * 와도 처리). 경로/쿼리 파라미터 바인딩에는 {@code common/config}에 등록된 컨버터가 이 메서드를 재사용한다.
     *
     * @throws UnsupportedPlatformException 지원하지 않는 플랫폼인 경우
     */
    @JsonCreator
    public static PlatformType from(String value) {
        return Arrays.stream(values())
                .filter(type -> type.name().equalsIgnoreCase(value.trim()))
                .findFirst()
                .orElseThrow(() -> new UnsupportedPlatformException(value));
    }
}
