package com.swyp.team5.common.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

/**
 * 세션이 아닌 JWT 기반 인증을 전제로 한 stateless API 설정. 실제 로그인/토큰 발급을 담당하는 auth
 * 도메인이 아직 없어 인증 필터는 추후 추가하고, 현재는 모든 요청을 허용해 CSRF 보호로 막혀 있던
 * FileController 등의 상태 변경 API를 HTTP로 검증할 수 있도록 한다.
 */
@Configuration
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http.csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth.anyRequest().permitAll());

        return http.build();
    }
}
