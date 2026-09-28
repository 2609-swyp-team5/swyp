package com.swyp.team5.admin.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * 관리자 설정 등록.
 *
 * <p>{@code @ConfigurationPropertiesScan}을 쓰지 않는 이유는 {@code SocialLoginConfig}와 같다.
 * 전역 스캔을 켜면 조건부로만 필요한 설정까지 모두 바인딩·검증되어 기동이 실패할 수 있다.
 */
@Configuration
@EnableConfigurationProperties(AdminProperties.class)
public class AdminConfig {}
