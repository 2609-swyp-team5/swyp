package com.swyp.team5.platform.bunjang;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

// bun_session 추출 로직 단위 테스트.
class BunjangSessionTokenParserTest {

    // "bun_session=값" 형태
    @Test
    void extractsFromEqualsPrefix() {
        assertThat(BunjangSessionTokenParser.extract("bun_session=abc123")).isEqualTo("abc123");
    }

    // "bun_session: 값" 형태
    @Test
    void extractsFromColonPrefix() {
        assertThat(BunjangSessionTokenParser.extract("bun_session: abc123")).isEqualTo("abc123");
    }

    // 여러 쿠키가 세미콜론으로 이어진 표준 Cookie 헤더 형태
    @Test
    void extractsFromCookiePairs() {
        assertThat(BunjangSessionTokenParser.extract("foo=bar; bun_session=abc123; baz=qux"))
                .isEqualTo("abc123");
    }

    // 프리픽스 없이 토큰 값만 붙여넣은 경우
    @Test
    void extractsRawToken() {
        assertThat(BunjangSessionTokenParser.extract("abc123")).isEqualTo("abc123");
    }

    // 양쪽 끝 큰따옴표 제거
    @Test
    void stripsSurroundingQuotes() {
        assertThat(BunjangSessionTokenParser.extract("\"bun_session=abc123\"")).isEqualTo("abc123");
    }

    // bun_session이 없는 임의 문자열은 raw 토큰으로 간주해 그대로 반환한다(입력값이 프리픽스 없는
    // 토큰 그 자체일 가능성을 배제하지 않기 위함).
    @Test
    void treatsUnrecognizedStringAsRawToken() {
        assertThat(BunjangSessionTokenParser.extract("foo=bar; baz=qux")).isEqualTo("foo=bar; baz=qux");
    }

    // 빈 문자열/null 입력
    @Test
    void returnsNullForBlankOrNullInput() {
        assertThat(BunjangSessionTokenParser.extract(null)).isNull();
        assertThat(BunjangSessionTokenParser.extract("   ")).isNull();
    }
}
