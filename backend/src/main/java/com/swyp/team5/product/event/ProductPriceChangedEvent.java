package com.swyp.team5.product.event;

/**
 * 상품의 판매 희망가(등록가)가 바뀌면 발행하는 이벤트(가격만 변경·상품 수정). 가격 비교가 들어간 시세 분석 근거를 새 가격 기준으로
 * 다시 쓰는 데 쓴다(같은 트랜잭션에서 처리).
 *
 * @param productId 가격이 바뀐 상품 ID
 */
public record ProductPriceChangedEvent(Long productId) {}
