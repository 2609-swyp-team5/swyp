package com.swyp.team5.home.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;

/** 로그인 홈·마이페이지 상단 요약 카드 응답. */
public record HomeSummaryResponse(
        long productCount, // 등록한 물건 수(모든 상태)
        Map<String, Long> productStatusCounts, // 상태별 물건 수 {DRAFT, ON_SALE, RESERVED, SOLD_OUT}, 없는 상태는 0
        long interestCount, // 관심 상품 수
        long todayRecommendationCount, // 오늘(0시 이후) 받은 AI 추천 알림 수(SELL/HOLD/BUY/WAIT)
        BigDecimal marketPriceDiffRate, // 판매 완료 전 내 물건 등록가 합이 평균 시세 합보다 몇 % 높은지(음수면 저렴, 소수 첫째 자리), 분석된 물건이 없으면 null
        int analyzedProductCount, // marketPriceDiffRate 계산에 쓴 물건 수(최근 분석의 평균 시세가 있는 것만)
        LocalDateTime lastAnalyzedAt) {} // 내 물건 중 가장 최근 시세 분석 시각, 없으면 null
