package com.swyp.team5.common.config;

import java.util.Locale;

import org.springframework.context.annotation.Configuration;
import org.springframework.format.FormatterRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import com.swyp.team5.platform.entity.PlatformType;
import com.swyp.team5.product.entity.DefectStatus;
import com.swyp.team5.social.entity.SocialProvider;

/**
 * {@code @RequestParam}/{@code @PathVariable}처럼 Jackson을 거치지 않는 바인딩에 대한 커스텀
 * 컨버터를 등록한다. JSON 바디/파트는 각 enum의 {@code @JsonCreator}가 대신 처리한다.
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addFormatters(FormatterRegistry registry) {
        registry.addConverter(String.class, DefectStatus.class, DefectStatus::from);
        registry.addConverter(String.class, PlatformType.class, PlatformType::from);
        registry.addConverter(
                String.class,
                SocialProvider.class,
                value -> SocialProvider.valueOf(value.trim().toUpperCase(Locale.ROOT)));
    }
}
