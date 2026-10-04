package com.swyp.team5.crawl.dto;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;

// 번개장터 검색 응답 파싱 단위 테스트.
class BunjangSearchItemTest {

    // 문자열 숫자를 변환하고 상태 코드(0/1/3)를 카테고리 목록 API 값으로 바꾸며, 필수 값이 없거나 숫자가 아닌 항목은 건너뜀
    @Test
    void listFromParsesItemsAndMapsStatusCodes() {
        String json =
                """
                {"list": [
                  {"pid": "1", "name": "다이슨 에어랩", "price": "320000", "status": "0", "ad": false,
                   "product_image": "https://img/1_w{res}.jpg", "category_id": "610700002"},
                  {"pid": "2", "name": "예약중", "price": "1000", "status": "1", "ad": true, "category_id": "1"},
                  {"pid": "3", "name": "판매완료", "price": "1000", "status": "3", "category_id": "1"},
                  {"pid": "4", "name": "가격 없음", "status": "0", "category_id": "1"},
                  {"pid": "x", "name": "pid 이상", "price": "1000", "status": "0", "category_id": "1"}
                ]}
                """;

        var items = BunjangSearchItem.listFrom(new ObjectMapper().readTree(json));

        assertThat(items).hasSize(3);
        assertThat(items.get(0))
                .isEqualTo(new BunjangSearchItem(
                        1L, "다이슨 에어랩", 320_000L, "SELLING", false, "https://img/1_w{res}.jpg", "610700002"));
        assertThat(items.get(0).isSelling()).isTrue();
        assertThat(items.get(1).status()).isEqualTo("RESERVED");
        assertThat(items.get(1).ad()).isTrue();
        assertThat(items.get(2).status()).isEqualTo("SOLD_OUT");
    }
}
