package com.swyp.team5.common.config;

import jakarta.servlet.DispatcherType;

import lombok.RequiredArgsConstructor;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import com.swyp.team5.auth.config.PasswordResetProperties;
import com.swyp.team5.common.passport.JsonAccessDeniedHandler;
import com.swyp.team5.common.passport.JsonAuthenticationEntryPoint;
import com.swyp.team5.common.passport.JwtAuthenticationFilter;
import com.swyp.team5.common.passport.JwtProperties;
import com.swyp.team5.member.entity.MemberRole;
import com.swyp.team5.social.strategy.KakaoProperties;
import com.swyp.team5.social.strategy.NaverLoginProperties;

/** JWT 기반 stateless 인증 설정. Access Token은 Authorization 헤더, Refresh Token은 httpOnly 쿠키로 검증한다. */
@Configuration
@EnableConfigurationProperties({
    JwtProperties.class,
    KakaoProperties.class,
    NaverLoginProperties.class,
    PasswordResetProperties.class
})
@RequiredArgsConstructor
public class SecurityConfig {

    private static final String[] PERMIT_ALL_PATTERNS = {
        "/auth/signup",
        "/auth/login",
        "/auth/refresh",
        "/auth/social/**",
        "/auth/email/check",
        "/auth/password/reset",
        "/api-docs/**",
        "/swagger/**",
        "/swagger-ui/**",
        "/v3/api-docs/**",
        "/docs/**",
        "/actuator/**"
    };

    private static final String ADMIN_PATTERN = "/admin/**";

    /**
     * 비로그인 사용자에게도 허용하는 조회 API(GET만) — 상품 검색·상세와 인기 검색어·인기 상품·카테고리. 상세는 숫자 ID 경로만
     * 열어 {@code /products/me} 같은 하위 경로는 계속 로그인이 필요하다. AI 검색·시세 분석·관심 등 그 밖의 기능은 로그인이 필요하다.
     */
    private static final String[] PUBLIC_GET_PATTERNS = {
        "/products", "/products/{productId:\\d+}", "/products/keywords/trending", "/products/popular", "/categories"
    };

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    private final JsonAuthenticationEntryPoint jsonAuthenticationEntryPoint;

    private final JsonAccessDeniedHandler jsonAccessDeniedHandler;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http.csrf(AbstractHttpConfigurer::disable)
                .cors(Customizer.withDefaults())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(exception -> exception
                        .authenticationEntryPoint(jsonAuthenticationEntryPoint)
                        .accessDeniedHandler(jsonAccessDeniedHandler))
                .authorizeHttpRequests(auth -> auth
                        // SSE 등 비동기 응답이 끝날 때의 재디스패치(ASYNC)와 에러 페이지(ERROR)는 원 요청에서 이미 인가됐으므로
                        // 다시 검사하지 않는다(JWT 필터는 재디스패치에서 동작하지 않아 검사하면 인증 실패가 된다)
                        .dispatcherTypeMatchers(DispatcherType.ASYNC, DispatcherType.ERROR)
                        .permitAll()
                        .requestMatchers(PERMIT_ALL_PATTERNS)
                        .permitAll()
                        .requestMatchers(HttpMethod.GET, PUBLIC_GET_PATTERNS)
                        .permitAll()
                        .requestMatchers(ADMIN_PATTERN)
                        .hasRole(MemberRole.ADMIN.name())
                        .anyRequest()
                        .authenticated())
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
