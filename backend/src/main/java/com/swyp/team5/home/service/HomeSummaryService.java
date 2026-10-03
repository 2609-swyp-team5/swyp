package com.swyp.team5.home.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.swyp.team5.home.dto.HomeSummaryResponse;
import com.swyp.team5.interest.repository.InterestRepository;
import com.swyp.team5.notification.entity.NotificationType;
import com.swyp.team5.notification.repository.NotificationRepository;
import com.swyp.team5.product.entity.Product;
import com.swyp.team5.product.entity.ProductStatus;
import com.swyp.team5.product.repository.ProductRepository;
import com.swyp.team5.productanalysis.entity.ProductAnalysis;
import com.swyp.team5.productanalysis.repository.ProductAnalysisRepository;

/** 로그인 홈 상단 요약(내 물건·관심 상품·오늘 추천 알림·시세 대비 가격)을 모은다. 회원 단위라 매번 계산한다. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class HomeSummaryService {

    private static final Set<NotificationType> RECOMMENDATION_TYPES =
            Set.of(NotificationType.SELL, NotificationType.HOLD, NotificationType.BUY, NotificationType.WAIT);

    private final ProductRepository productRepository;
    private final ProductAnalysisRepository productAnalysisRepository;
    private final InterestRepository interestRepository;
    private final NotificationRepository notificationRepository;

    public HomeSummaryResponse getSummary(Long memberId) {
        return getSummary(memberId, LocalDateTime.now());
    }

    HomeSummaryResponse getSummary(Long memberId, LocalDateTime now) {
        List<Product> products = productRepository.findByMemberId(memberId);
        Map<String, Long> statusCounts =
                ProductStatus.countByStatus(products.stream().map(Product::getStatus));

        // 시세 대비 가격은 아직 팔리지 않은 물건만, 최근 분석에 평균 시세가 있는 것만 더한다
        Map<Long, Product> unsold = products.stream()
                .filter(product -> product.getStatus() != ProductStatus.SOLD_OUT)
                .collect(Collectors.toMap(Product::getId, Function.identity()));
        List<ProductAnalysis> latestAnalyses = products.isEmpty()
                ? List.of()
                : productAnalysisRepository.findLatestByItemIdIn(
                        products.stream().map(Product::getId).toList());
        List<ProductAnalysis> priced = latestAnalyses.stream()
                .filter(analysis -> unsold.containsKey(analysis.getItem().getId()))
                .filter(analysis -> analysis.getAveragePrice() != null && analysis.getAveragePrice() > 0)
                .toList();
        long priceSum = priced.stream()
                .mapToLong(analysis -> unsold.get(analysis.getItem().getId()).getPrice())
                .sum();
        long averageSum =
                priced.stream().mapToLong(ProductAnalysis::getAveragePrice).sum();

        return new HomeSummaryResponse(
                products.size(),
                statusCounts,
                interestRepository.countByMemberId(memberId),
                notificationRepository.countByMemberIdAndTypeInAndCreatedAtGreaterThanEqual(
                        memberId, RECOMMENDATION_TYPES, now.toLocalDate().atStartOfDay()),
                diffRate(priceSum, averageSum),
                priced.size(),
                latestAnalyses.stream()
                        .map(ProductAnalysis::getAnalyzedAt)
                        .filter(Objects::nonNull)
                        .max(Comparator.naturalOrder())
                        .orElse(null));
    }

    /** (등록가 합 − 평균 시세 합) / 평균 시세 합 × 100을 소수 첫째 자리로 반올림한다(상품 분석 응답의 계산과 같은 방식). */
    private static BigDecimal diffRate(long priceSum, long averageSum) {
        if (averageSum == 0) {
            return null;
        }
        return BigDecimal.valueOf(priceSum - averageSum)
                .multiply(BigDecimal.valueOf(100))
                .divide(BigDecimal.valueOf(averageSum), 1, RoundingMode.HALF_UP);
    }
}
