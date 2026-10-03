package com.swyp.team5.productanalysis.dto;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

import com.swyp.team5.platform.entity.PlatformListing;
import com.swyp.team5.platform.entity.PlatformType;

/**
 * 경쟁 상품 조회 응답 — 수집한 외부 매물 중 기준 상품과 같은 유형의 판매 중 매물.
 *
 * @param productId 기준 상품 ID(외부 매물이면 매물 ID)
 */
public record ProductCompetitionResponse(Long productId, Competition competition) {

    /**
     * @param count 같은 유형 판매 중 매물 전체 수(목록 건수와 별개)
     * @param level 경쟁 정도 코드
     * @param levelLabel 화면 표시 문구(낮음/보통/높음)
     * @param items 최신 등록 순(최초 수집 일시), 최대 {@code analysis.competition.item-limit}건
     */
    public record Competition(int count, CompetitionLevel level, String levelLabel, List<Item> items) {

        public static Competition of(int count, CompetitionLevel level, List<Item> items) {
            return new Competition(count, level, level.getLabel(), items);
        }
    }

    /**
     * @param productId 외부 매물 ID(상세·시세 분석·관심 등록 API에 그대로 사용)
     * @param platform 플랫폼 코드(예: {@code BUNJANG}), 연동 미지원 플랫폼이면 null
     * @param listingPrice 이 매물의 판매가
     * @param marketAveragePrice 상품군 평균 중고 시세 — 같은 유형 판매 중 매물 평균(모든 항목에 같은 값), 3건 미만이면 null
     * @param priceDiffRate 평균 시세 대비 판매가 차이(%, 소수 둘째 자리 — 음수면 시세보다 쌈), 평균 시세가 없거나 0이면 null
     * @param productUrl 외부 플랫폼 원본 매물 링크
     */
    public record Item(
            Long productId,
            String platform,
            String platformName,
            String imageUrl,
            String title,
            Long listingPrice,
            Long marketAveragePrice,
            BigDecimal priceDiffRate,
            String productUrl) {

        public static Item of(PlatformListing listing, Long marketAveragePrice) {
            String platformName = listing.getPlatform().getName();
            PlatformType platformType = PlatformType.fromPlatformName(platformName);
            return new Item(
                    listing.getId(),
                    platformType == null ? null : platformType.name(),
                    platformName,
                    listing.getImageUrl(),
                    listing.getTitle(),
                    listing.getPrice(),
                    marketAveragePrice,
                    diffRate(listing.getPrice(), marketAveragePrice),
                    listing.getListingUrl());
        }

        private static BigDecimal diffRate(Long price, Long marketAveragePrice) {
            if (marketAveragePrice == null || marketAveragePrice == 0) {
                return null;
            }
            return BigDecimal.valueOf(price - marketAveragePrice)
                    .multiply(BigDecimal.valueOf(100))
                    .divide(BigDecimal.valueOf(marketAveragePrice), 2, RoundingMode.HALF_UP);
        }
    }
}
