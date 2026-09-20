package com.swyp.team5.crawl.dto;

/**
 * 번개장터 개별 상품 상세 API 응답 중 매물 재확인(reconciliation)에 필요한 정보만 담는다. 정상
 * 조회되면 {@code saleStatus}가 채워지고 {@code errorCode}는 null, 삭제/존재하지 않는 매물이면
 * 반대다(둘 다 null인 경우는 없음).
 */
public record BunjangProductDetail(long pid, String saleStatus, Long price, String title, String errorCode) {

    public boolean isSelling() {
        return "SELLING".equals(saleStatus);
    }
}
