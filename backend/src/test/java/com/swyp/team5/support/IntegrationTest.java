package com.swyp.team5.support;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;

import com.swyp.team5.auth.service.MemberAccessBlocker;
import com.swyp.team5.auth.service.RefreshTokenService;
import com.swyp.team5.file.service.FileStorageService;
import com.swyp.team5.product.service.ProductAiSearchService;
import com.swyp.team5.product.service.ProductAiService;
import com.swyp.team5.product.service.ProductImageLoader;
import com.swyp.team5.social.strategy.SocialLoginStrategy;
import org.junit.jupiter.api.BeforeEach;

/**
 * 통합 테스트({@code @SpringBootTest}) 공통 부모. 모든 통합 테스트가 같은 Mock 구성을 쓰게 해 Spring 테스트 컨텍스트를 하나만
 * 띄우고 재사용한다 — 클래스마다 {@code @MockitoBean} 조합이 다르면 컨텍스트가 따로 떠서(원격 DB clean·마이그레이션·Hibernate
 * 초기화 포함 1회 약 1~2분) 전체 테스트가 느려진다. 새 통합 테스트는 이 클래스를 상속하고, 외부 호출(AI·파일 저장소·Redis 토큰)
 * Mock이 더 필요하면 여기에 추가한다(개별 클래스에 따로 선언하지 않는다).
 *
 * <p>컨텍스트를 공유하므로 DB는 실행 전체에서 한 번만 clean·migrate된다({@code FlywayConfig}). 대신 테스트 클래스가 바뀔 때마다
 * 마이그레이션 시드(카테고리·플랫폼·카테고리 매핑)를 뺀 모든 테이블을 비워, 앞 클래스가 남긴 데이터(예: 소셜 계정이 참조하는
 * 회원)가 다음 클래스의 정리·검증을 깨뜨리지 않게 한다.
 */
@SpringBootTest
@AutoConfigureMockMvc
public abstract class IntegrationTest {

    @MockitoBean
    protected RefreshTokenService refreshTokenService;

    @MockitoBean
    protected MemberAccessBlocker memberAccessBlocker;

    @MockitoBean
    protected FileStorageService fileStorageService;

    @MockitoBean
    protected ProductAiService productAiService;

    @MockitoBean
    protected ProductAiSearchService productAiSearchService;

    @MockitoBean
    protected ProductImageLoader productImageLoader;

    // 실제 동작은 그대로 두고 필요한 테스트(AuthTest)에서만 일부 메서드를 바꾼다(필드 이름으로 구글 전략 빈을 지정)
    @MockitoSpyBean
    protected SocialLoginStrategy googleLoginStrategy;

    /** 마이그레이션 시드 테이블(categories·category_platforms·platforms)을 뺀 데이터 테이블. */
    private static final String TRUNCATE_DATA_TABLES =
            "TRUNCATE TABLE members, socials, items, products, platform_listings, "
                    + "product_images, product_tags, tags, product_components, components, interests, product_analysis, "
                    + "price_forecasts, notifications, member_platforms, product_platforms, search_logs RESTART IDENTITY CASCADE";

    private static Class<?> lastResetClass;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    /** 테스트 클래스가 바뀌면(클래스의 첫 테스트 전) 데이터 테이블을 비운다. 하위 클래스의 {@code @BeforeEach}보다 먼저 실행된다. */
    @BeforeEach
    void resetDataOncePerTestClass() {
        if (lastResetClass != getClass()) {
            jdbcTemplate.execute(TRUNCATE_DATA_TABLES);
            lastResetClass = getClass();
        }
    }
}
