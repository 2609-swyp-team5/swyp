package com.swyp.team5.social.strategy;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * 네이버 사용자 정보 응답.
 *
 * <p>실제 사용자 정보는 최상위가 아니라 {@code response} 안에 한 겹 더 들어 있고, 성공 여부는 {@code resultcode}가 "00"인지로 판단한다.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record NaverUserResponse(String resultcode, String message, Response response) {

    private static final String SUCCESS_CODE = "00";

    public boolean isSuccess() {
        return SUCCESS_CODE.equals(resultcode) && response != null && response.id() != null;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Response(
            String id,
            String email,
            String name,
            String nickname,
            @JsonProperty("profile_image") String profileImage) {}
}
