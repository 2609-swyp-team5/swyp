package com.swyp.team5.common.config;

import lombok.RequiredArgsConstructor;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import com.swyp.team5.common.passport.JsonAuthenticationEntryPoint;
import com.swyp.team5.common.passport.JwtAuthenticationFilter;
import com.swyp.team5.common.passport.JwtProperties;

/** JWT 기반 stateless 인증 설정. Access Token은 Authorization 헤더, Refresh Token은 httpOnly 쿠키로 검증한다. */
@Configuration
@EnableConfigurationProperties(JwtProperties.class)
@RequiredArgsConstructor
public class SecurityConfig {

    private static final String[] PERMIT_ALL_PATTERNS = {
        "/auth/signup",
        "/auth/login",
        "/auth/refresh",
        "/auth/social/**",
        "/swagger/**",
        "/swagger-ui/**",
        "/v3/api-docs/**",
        "/docs/**",
        "/actuator/**"
    };

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    private final JsonAuthenticationEntryPoint jsonAuthenticationEntryPoint;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http.csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(exception -> exception.authenticationEntryPoint(jsonAuthenticationEntryPoint))
                .authorizeHttpRequests(auth -> auth.requestMatchers(PERMIT_ALL_PATTERNS)
                        .permitAll()
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
