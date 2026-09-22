package com.swyp.team5.product.dto;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import com.swyp.team5.product.entity.ProductCondition;

public record ProductAiAnalysisResult(
        @JsonPropertyDescription("상품과 가장 잘 맞는 카테고리의 categoryId (카테고리 목록 중에서 선택)") Long categoryId,
        @JsonPropertyDescription("상품 사진을 보고 작성한 30자 내외의 상품 제목") String title,
        @JsonPropertyDescription("사진에서 확인되는 브랜드명(로고/각인 등으로 식별). 확인할 수 없으면 null") String brand,
        @JsonPropertyDescription("상품의 특징, 상태를 설명하는 2~3문장의 상품 설명") String description,
        @JsonPropertyDescription("사진으로 판단한 상품 상태 등급") ProductCondition condition,
        @JsonPropertyDescription("상품 종류와 상태 등급을 참고해 원화(KRW) 기준으로 추정한 중고 판매 희망가 (예: 350000)") Long suggestedPrice,
        @JsonPropertyDescription(
                        "이 상태 등급과 적정가를 왜 그렇게 판단했는지 근거를 설명하는 1~2문장 (예: \"외관 스크래치가 거의 없고 구성품이 모두 포함돼 있어 A급으로 판단, 동일 모델 중고 시세 대비 합리적인 가격입니다\")")
                String analysisDescription,
        @JsonPropertyDescription("상품을 검색/분류하는 데 도움이 되는 키워드 태그 3~5개 (예: 브랜드명, 모델명, 색상)") List<String> tags,
        @JsonPropertyDescription("사진에 함께 보이는 구성품 이름 목록(예: 박스, 충전기, 케이블, 이어폰, 설명서). 사진에서 실제로 확인되는 것만 포함, 없으면 빈 배열")
                List<String> includedItems) {}
