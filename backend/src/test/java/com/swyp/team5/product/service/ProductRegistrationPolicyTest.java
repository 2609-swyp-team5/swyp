package com.swyp.team5.product.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;

import com.swyp.team5.product.dto.ProductAiAnalysisResult;
import com.swyp.team5.product.entity.DeliveryType;
import com.swyp.team5.product.entity.IncludedStatus;
import com.swyp.team5.product.entity.ProductCondition;
import com.swyp.team5.product.entity.TradeMethod;
import org.junit.jupiter.api.Test;

class ProductRegistrationPolicyTest {

    @Test
    void acceptsRegistrationPolicyBoundaries() {
        assertThatCode(() -> ProductRegistrationPolicy.validateProductFields(
                        "상품",
                        "상품 설명은 열 글자 이상입니다.",
                        ProductRegistrationPolicy.MIN_PRICE,
                        List.of("태그1", "태그2", "태그3", "태그4", "태그5"),
                        IncludedStatus.NONE))
                .doesNotThrowAnyException();
        assertThatCode(() -> ProductRegistrationPolicy.validatePrice(ProductRegistrationPolicy.MAX_PRICE))
                .doesNotThrowAnyException();
        assertThatCode(() -> ProductRegistrationPolicy.validateTrade(
                        TradeMethod.DELIVERY, DeliveryType.PREPAID, ProductRegistrationPolicy.MIN_DELIVERY_FEE, null))
                .doesNotThrowAnyException();
    }

    @Test
    void rejectsValuesOutsideRegistrationPolicy() {
        assertThatThrownBy(() -> ProductRegistrationPolicy.validatePrice(ProductRegistrationPolicy.MIN_PRICE - 1))
                .hasMessage("희망 가격은 500원 이상 1억 원 이하로 입력해 주세요.");
        assertThatThrownBy(() -> ProductRegistrationPolicy.validateProductFields(
                        "상품",
                        "상품 설명은 열 글자 이상입니다.",
                        ProductRegistrationPolicy.MIN_PRICE,
                        List.of("1", "2", "3", "4", "5", "6"),
                        IncludedStatus.ALL))
                .hasMessage("태그는 최대 5개까지 입력해 주세요.");
        assertThatThrownBy(() ->
                        ProductRegistrationPolicy.validateTrade(TradeMethod.DELIVERY, DeliveryType.PREPAID, null, null))
                .hasMessage("배송비를 입력해 주세요.");
    }

    // AI 등록 결과는 사용자가 고칠 수 없으므로 거절하지 않고 저장 가능한 범위로 맞춤(가격 범위, 태그 5개, 글자 수)
    @Test
    void normalizesAiAnalysisIntoStorableRange() {
        String longName = "가".repeat(60);
        ProductAiAnalysisResult normalized = ProductRegistrationPolicy.normalizeAiAnalysis(aiResult(
                "  " + "제".repeat(120) + "  ",
                "브".repeat(60),
                "AI가 만든 충분히 긴 상품 설명입니다",
                300L,
                List.of("태그1", " ", "태그2", "태그3", "태그1", "태그4", "태그5", "태그6"),
                List.of(longName, "")));

        assertThat(normalized.title()).hasSize(ProductRegistrationPolicy.MAX_TITLE_LENGTH);
        assertThat(normalized.brand()).hasSize(ProductRegistrationPolicy.MAX_BRAND_LENGTH);
        assertThat(normalized.suggestedPrice()).isEqualTo(ProductRegistrationPolicy.MIN_PRICE);
        assertThat(normalized.tags()).containsExactly("태그1", "태그2", "태그3", "태그4", "태그5");
        assertThat(normalized.includedItems()).containsExactly(longName.substring(0, 50));
        assertThatCode(() -> ProductRegistrationPolicy.validateAiAnalysis(normalized, IncludedStatus.ALL))
                .doesNotThrowAnyException();

        assertThat(ProductRegistrationPolicy.normalizeAiAnalysis(
                                aiResult("아이폰", "  ", "AI가 만든 충분히 긴 상품 설명입니다", 200_000_000L, null, null))
                        .suggestedPrice())
                .isEqualTo(ProductRegistrationPolicy.MAX_PRICE);
        assertThat(ProductRegistrationPolicy.normalizeAiAnalysis(
                                aiResult("아이폰", "  ", "AI가 만든 충분히 긴 상품 설명입니다", 10_000L, null, null))
                        .brand())
                .isNull();
    }

    // 제목·설명이 너무 짧거나 가격이 없으면 맞출 수 없으므로 다시 시도하도록 안내
    @Test
    void rejectsAiAnalysisThatCannotBeNormalized() {
        String retry = "AI가 상품 정보를 충분히 만들지 못했어요. 다시 시도해 주세요.";
        assertThatThrownBy(() -> ProductRegistrationPolicy.normalizeAiAnalysis(
                        aiResult("폰", null, "AI가 만든 충분히 긴 상품 설명입니다", 10_000L, null, null)))
                .hasMessage(retry);
        assertThatThrownBy(() -> ProductRegistrationPolicy.normalizeAiAnalysis(
                        aiResult("아이폰", null, "짧은 설명", 10_000L, null, null)))
                .hasMessage(retry);
        assertThatThrownBy(() -> ProductRegistrationPolicy.normalizeAiAnalysis(
                        aiResult("아이폰", null, "AI가 만든 충분히 긴 상품 설명입니다", null, null, null)))
                .hasMessage(retry);
    }

    private static ProductAiAnalysisResult aiResult(
            String title, String brand, String description, Long price, List<String> tags, List<String> includedItems) {
        return new ProductAiAnalysisResult(
                1L, title, brand, description, ProductCondition.A, price, "근거", tags, includedItems);
    }
}
