package com.swyp.team5.product.service;

import java.util.List;

import com.swyp.team5.product.dto.ProductAiAnalysisResult;
import com.swyp.team5.product.entity.DeliveryType;
import com.swyp.team5.product.entity.IncludedStatus;
import com.swyp.team5.product.entity.TradeMethod;
import com.swyp.team5.product.error.InvalidProductRequestException;

/** 상품 등록·수정·AI 등록에서 공통으로 적용하는 입력 정책. */
final class ProductRegistrationPolicy {

    static final long MIN_PRICE = 500L;
    static final long MAX_PRICE = 100_000_000L;
    static final int MIN_TITLE_LENGTH = 2;
    static final int MIN_DESCRIPTION_LENGTH = 10;
    static final int MAX_DESCRIPTION_LENGTH = 2_499;
    static final int MAX_TAG_COUNT = 5;
    static final int MAX_TITLE_LENGTH = 100;
    static final int MAX_BRAND_LENGTH = 50;
    static final int MAX_NAME_LENGTH = 50; // 태그·구성품 이름(tags·components.name)
    static final long MIN_DELIVERY_FEE = 2_700L;
    static final long MAX_DELIVERY_FEE = 17_000L;

    private ProductRegistrationPolicy() {}

    static void validateProductFields(
            String title, String description, Long price, List<String> tags, IncludedStatus includedStatus) {
        String normalizedTitle = title == null ? "" : title.strip();
        if (normalizedTitle.length() < MIN_TITLE_LENGTH) {
            throw invalid("title", "상품명은 2글자 이상 입력해 주세요.");
        }

        String normalizedDescription = description == null ? "" : description.strip();
        if (normalizedDescription.length() < MIN_DESCRIPTION_LENGTH) {
            throw invalid("description", "상품 설명은 10자 이상 입력해 주세요.");
        }
        if (normalizedDescription.length() > MAX_DESCRIPTION_LENGTH) {
            throw invalid("description", "상품 설명은 2500자 미만으로 입력해 주세요.");
        }

        validatePrice(price);

        if (tags != null && tags.size() > MAX_TAG_COUNT) {
            throw invalid("tags", "태그는 최대 5개까지 입력해 주세요.");
        }

        if (includedStatus == null) {
            throw invalid("includedStatus", "구성품을 선택해 주세요.");
        }
    }

    static void validatePrice(Long price) {
        if (price == null || price < MIN_PRICE || price > MAX_PRICE) {
            throw invalid("price", "희망 가격은 500원 이상 1억 원 이하로 입력해 주세요.");
        }
    }

    static void validateTrade(
            TradeMethod tradeMethod, DeliveryType deliveryType, Long deliveryFee, String preferredTradeRegion) {
        if (tradeMethod == null) {
            throw invalid("tradeMethod", "거래 방식을 선택해 주세요.");
        }

        if (tradeMethod == TradeMethod.DIRECT) {
            if (preferredTradeRegion == null || preferredTradeRegion.isBlank()) {
                throw invalid("preferredTradeRegion", "거래 희망 지역을 선택해 주세요.");
            }
            return;
        }

        if (deliveryType == null) {
            throw invalid("deliveryType", "배송비 부담 방식을 선택해 주세요.");
        }
        if (deliveryType == DeliveryType.PREPAID) {
            if (deliveryFee == null) {
                throw invalid("deliveryFee", "배송비를 입력해 주세요.");
            }
            if (deliveryFee < MIN_DELIVERY_FEE || deliveryFee > MAX_DELIVERY_FEE) {
                throw invalid("deliveryFee", "배송비는 2,700원 이상 17,000원 이하로 입력해 주세요.");
            }
        } else if (deliveryFee != null) {
            throw invalid("deliveryFee", "배송비는 배송비 별도일 때만 입력할 수 있어요.");
        }
    }

    /**
     * AI 등록 결과를 저장할 수 있는 범위로 맞춘다. 사용자가 입력한 값이 아니라 거절하면 고칠 방법이 없으므로 가격은 허용 범위로, 태그는 앞에서
     * 5개로, 글자 수는 저장 가능한 길이로 자른다(등록 후 판매자가 수정할 수 있다). 제목·설명이 너무 짧아 맞출 수 없을 때만 다시 시도하도록
     * 거절한다.
     */
    static ProductAiAnalysisResult normalizeAiAnalysis(ProductAiAnalysisResult analysis) {
        if (analysis == null) {
            throw invalid("analysis", "AI 상품 분석 결과가 없습니다.");
        }
        String title = cut(strip(analysis.title()), MAX_TITLE_LENGTH);
        String description = cut(strip(analysis.description()), MAX_DESCRIPTION_LENGTH);
        if (title.length() < MIN_TITLE_LENGTH
                || description.length() < MIN_DESCRIPTION_LENGTH
                || analysis.suggestedPrice() == null) {
            throw invalid("analysis", "AI가 상품 정보를 충분히 만들지 못했어요. 다시 시도해 주세요.");
        }
        String brand = cut(strip(analysis.brand()), MAX_BRAND_LENGTH);
        long price = Math.clamp(analysis.suggestedPrice(), MIN_PRICE, MAX_PRICE);
        return new ProductAiAnalysisResult(
                analysis.categoryId(),
                title,
                brand.isEmpty() ? null : brand,
                description,
                analysis.condition(),
                price,
                analysis.analysisDescription(),
                names(analysis.tags(), MAX_TAG_COUNT),
                names(analysis.includedItems(), Integer.MAX_VALUE));
    }

    static void validateAiAnalysis(ProductAiAnalysisResult analysis, IncludedStatus includedStatus) {
        if (analysis == null) {
            throw invalid("analysis", "AI 상품 분석 결과가 없습니다.");
        }
        validateProductFields(
                analysis.title(), analysis.description(), analysis.suggestedPrice(), analysis.tags(), includedStatus);
    }

    private static String strip(String value) {
        return value == null ? "" : value.strip();
    }

    private static String cut(String value, int maxLength) {
        return value.length() > maxLength ? value.substring(0, maxLength).strip() : value;
    }

    /** 빈 이름은 빼고 각 이름을 저장 가능한 길이로 자른 뒤 앞에서 최대 개수만 남긴다. */
    private static List<String> names(List<String> values, int maxCount) {
        if (values == null) {
            return List.of();
        }
        return values.stream()
                .map(ProductRegistrationPolicy::strip)
                .filter(name -> !name.isEmpty())
                .map(name -> cut(name, MAX_NAME_LENGTH))
                .distinct()
                .limit(maxCount)
                .toList();
    }

    private static InvalidProductRequestException invalid(String field, String message) {
        return new InvalidProductRequestException(field, message);
    }
}
