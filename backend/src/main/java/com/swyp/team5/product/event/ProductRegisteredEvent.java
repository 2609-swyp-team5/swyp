package com.swyp.team5.product.event;

/**
 * 상품 등록(직접/AI) 저장 직후 발행하는 이벤트. 등록 트랜잭션이 커밋된 뒤 시세 분석 1회를 돌리는 데 쓴다.
 *
 * @param productId 등록된 상품 ID
 */
public record ProductRegisteredEvent(Long productId) {}
