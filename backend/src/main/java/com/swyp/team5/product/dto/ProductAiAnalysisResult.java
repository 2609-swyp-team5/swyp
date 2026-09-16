package com.swyp.team5.product.dto;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import com.swyp.team5.product.entity.ProductCondition;

public record ProductAiAnalysisResult(
        @JsonPropertyDescription("상품과 가장 잘 맞는 카테고리의 categoryId (카테고리 목록 중에서 선택)") Long categoryId,
        @JsonPropertyDescription("상품 사진을 보고 작성한 30자 내외의 상품 제목") String title,
        @JsonPropertyDescription("상품의 특징, 상태를 설명하는 2~3문장의 상품 설명") String description,
        @JsonPropertyDescription("사진으로 판단한 상품 상태 등급") ProductCondition condition,
        @JsonPropertyDescription("사진에서 흠집, 파손 등 결함이 보이면 true, 아니면 false") boolean hasDefect,
        @JsonPropertyDescription("상품을 검색/분류하는 데 도움이 되는 키워드 태그 3~5개 (예: 브랜드명, 모델명, 색상)") List<String> tags) {}
