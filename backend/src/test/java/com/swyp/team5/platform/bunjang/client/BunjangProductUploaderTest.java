package com.swyp.team5.platform.bunjang.client;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import org.junit.jupiter.api.Test;

// 번개장터 자동 등록 단위 테스트(브라우저를 띄우지 않는 규칙만).
class BunjangProductUploaderTest {

    // 직거래 지역 검색어 - 전체 지역 문자열(공백 정리) 다음에 마지막 단어(읍/면/동), 한 단어면 그대로 하나
    @Test
    void regionQueriesTriesWholeRegionThenLastWord() {
        assertThat(BunjangProductUploader.regionQueries("  서울 강남구   역삼동 ")).containsExactly("서울 강남구 역삼동", "역삼동");
        assertThat(BunjangProductUploader.regionQueries("역삼동")).containsExactly("역삼동");
    }

    // 필수 항목 누락 안내 - 화면 안내 문구가 없으면 기본 안내만, 있으면 이어 붙이고 100자에서 자름
    @Test
    void missingFieldsMessageAppendsPageNotices() {
        assertThat(BunjangProductUploader.missingFieldsMessage(List.of()))
                .startsWith("번개장터에서 필수 항목이 빠져 등록되지 않았어요.")
                .doesNotContain("번개장터 안내");
        assertThat(BunjangProductUploader.missingFieldsMessage(List.of("사이즈를 선택해 주세요", "색상을 선택해 주세요")))
                .endsWith("(번개장터 안내: 사이즈를 선택해 주세요 / 색상을 선택해 주세요)");
        assertThat(BunjangProductUploader.missingFieldsMessage(List.of("가".repeat(150))))
                .endsWith("가".repeat(100) + "…)");
    }
}
