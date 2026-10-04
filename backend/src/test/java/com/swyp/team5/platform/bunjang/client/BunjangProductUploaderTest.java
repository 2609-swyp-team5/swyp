package com.swyp.team5.platform.bunjang.client;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

// 번개장터 자동 등록 단위 테스트(브라우저를 띄우지 않는 규칙만).
class BunjangProductUploaderTest {

    // 직거래 지역 검색어 - 전체 지역 문자열(공백 정리) 다음에 마지막 단어(읍/면/동), 한 단어면 그대로 하나
    @Test
    void regionQueriesTriesWholeRegionThenLastWord() {
        assertThat(BunjangProductUploader.regionQueries("  서울 강남구   역삼동 ")).containsExactly("서울 강남구 역삼동", "역삼동");
        assertThat(BunjangProductUploader.regionQueries("역삼동")).containsExactly("역삼동");
    }
}
