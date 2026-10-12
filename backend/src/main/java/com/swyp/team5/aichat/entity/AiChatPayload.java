package com.swyp.team5.aichat.entity;

import java.math.BigDecimal;
import java.util.List;

import com.swyp.team5.item.entity.ListingSource;
import com.swyp.team5.productanalysis.dto.AnalysisStatus;
import com.swyp.team5.productanalysis.entity.AnalysisRecommendation;

/**
 * 답변 메시지의 카드 데이터({@code ai_chat_messages.payload} JSON). 답변을 만든 시점의 값이라 이후 시세가 바뀌어도 그대로다 — 최신
 * 결과는 {@code analysis.productId}로 {@code GET /products/{id}/analysis}를 조회한다.
 *
 * @param analysis "상세 시세 분석 보기" 카드(대상 상품을 못 찾았으면 null)
 * @param recommendedProducts 추천 상품(평균 시세 대비 싼 순, 최대 6개)
 */
public record AiChatPayload(AnalysisCard analysis, List<RecommendedProduct> recommendedProducts) {

    /**
     * @param productId 분석 대상 ID(우리 상품 id 또는 외부 매물 listing_id) — {@code GET /products/{id}/analysis}에 그대로 사용
     * @param source OUR(내 판매 상품 등 우리 상품)/EXTERNAL(외부 매물)
     * @param mine 질문한 회원 본인 상품이면 true(판매자 관점 분석)
     * @param title 대상 상품 제목
     * @param price 대상 상품 등록가(판매가)
     * @param recommendation 관점별 추천(본인 상품 SELL/HOLD, 그 밖 BUY/WAIT), 분석 결과가 없으면 null
     * @param reason 추천 근거(분석 결과가 없으면 분석 상태 안내 문구)
     * @param averagePrice 분석 평균 시세, 없으면 null
     * @param analysisStatus 답변 시점의 분석 상태(결과가 없어 분석을 요청했으면 ANALYZING)
     */
    public record AnalysisCard(
            Long productId,
            ListingSource source,
            boolean mine,
            String title,
            Long price,
            AnalysisRecommendation recommendation,
            String reason,
            Long averagePrice,
            AnalysisStatus analysisStatus) {}

    /**
     * @param id 우리 상품 id 또는 외부 매물 listing_id
     * @param source OUR/EXTERNAL
     * @param platformName 플랫폼명(우리 상품은 "지금이니")
     * @param imageUrl 대표 이미지(없으면 null)
     * @param title 제목
     * @param price 판매가
     * @param averagePrice 비교 기준 평균 시세(매물 자체 분석 평균 → 대상 분석 평균 → 검색 결과 중앙값 순)
     * @param priceDiffRate 평균 시세 대비 차이(%) — 음수면 저렴, 소수 첫째 자리
     * @param externalUrl 외부 매물 원본 링크(우리 상품은 null)
     */
    public record RecommendedProduct(
            Long id,
            ListingSource source,
            String platformName,
            String imageUrl,
            String title,
            Long price,
            Long averagePrice,
            BigDecimal priceDiffRate,
            String externalUrl) {}
}
