package com.swyp.team5.interest.event;

/**
 * 관심상품이 새로 등록됐다는 도메인 이벤트. 등록 트랜잭션 커밋 후 대상(우리 상품 또는 외부 매물)의 시세 분석을 바로 돌리는 데
 * 쓴다(정기 배치를 기다리지 않고 관심 목록에서 추천을 보도록).
 *
 * @param itemId 관심 등록 대상 ID(우리 상품 productId 또는 외부 매물 listingId)
 */
public record InterestRegisteredEvent(Long itemId) {}
