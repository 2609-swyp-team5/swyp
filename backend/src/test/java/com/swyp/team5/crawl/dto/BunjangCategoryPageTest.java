package com.swyp.team5.crawl.dto;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;

// 번개장터 카테고리 목록·키워드 검색 응답 파싱 단위 테스트.
class BunjangCategoryPageTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    // 상품 항목만 파싱하고, pid가 없거나 null인 외부 광고 항목(EXT_AD)은 건너뜀
    @Test
    void parsesOnlyProductItemsSkippingExternalAds() {
        String json =
                """
                {"data":{"searchSpec":{"uiBlockList":[
                  {"id":"pwKeywordHeader"},
                  {"id":"mainGrid","searchResponse":{"nextCursor":"next-token","data":[
                    {"type":"EXT_AD","pid":null,"price":59800,"name":"광고"},
                    {"type":"EXT_AD","price":10000,"name":"광고2"},
                    {"type":"PRODUCT","pid":426786918,"name":"닌텐도 스위치 포켓몬스터 샤이닝 펄 칩","price":44000,
                     "status":"SELLING","ad":false,"productImage":"https://img/1.jpg","shop":{"uid":1}}
                  ]}}
                ]}}}
                """;

        BunjangCategoryPage page = BunjangCategoryPage.from(objectMapper.readTree(json), objectMapper);

        assertThat(page.items())
                .containsExactly(new BunjangProductItem(
                        426786918L, "닌텐도 스위치 포켓몬스터 샤이닝 펄 칩", 44000L, "SELLING", false, "https://img/1.jpg"));
        assertThat(page.nextCursor()).isEqualTo("next-token");
        assertThat(page.hasNext()).isTrue();
    }
}
