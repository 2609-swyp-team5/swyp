package com.swyp.team5.interest.dto;

/**
 * 관심상품 토글 결과.
 *
 * @param interested 호출 후 관심 등록 상태(true = 등록됨, false = 해제됨)
 * @param interestId 등록됐으면 관심상품 ID, 해제됐으면 null
 */
public record InterestToggleResponse(boolean interested, Long interestId) {

    public static InterestToggleResponse registered(Long interestId) {
        return new InterestToggleResponse(true, interestId);
    }

    public static InterestToggleResponse removed() {
        return new InterestToggleResponse(false, null);
    }
}
