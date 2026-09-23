package com.swyp.team5.platform.entity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.swyp.team5.platform.error.UnsupportedPlatformException;
import org.junit.jupiter.api.Test;

// 플랫폼 경로 값 변환 단위 테스트.
class PlatformTypeTest {

    // 대소문자/앞뒤 공백과 무관하게 변환
    @Test
    void fromIgnoresCaseAndWhitespace() {
        assertThat(PlatformType.from("bunjang")).isEqualTo(PlatformType.BUNJANG);
        assertThat(PlatformType.from("BUNJANG")).isEqualTo(PlatformType.BUNJANG);
        assertThat(PlatformType.from(" Bunjang ")).isEqualTo(PlatformType.BUNJANG);
    }

    // 지원하지 않는 플랫폼이면 실패
    @Test
    void fromFailsWhenUnsupported() {
        assertThatThrownBy(() -> PlatformType.from("karrot")).isInstanceOf(UnsupportedPlatformException.class);
    }

    // platforms 테이블 시드 이름과 일치
    @Test
    void platformNameMatchesSeed() {
        assertThat(PlatformType.BUNJANG.getPlatformName()).isEqualTo("번개장터");
    }
}
