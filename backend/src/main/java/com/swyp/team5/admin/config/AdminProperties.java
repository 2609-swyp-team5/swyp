package com.swyp.team5.admin.config;

import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * 관리자 설정.
 *
 * @param emails 기동할 때 ADMIN으로 승격할 회원 이메일 목록. 비어 있으면 아무 동작도 하지 않는다.
 *     코드에 이메일을 박지 않기 위해 환경변수({@code ADMIN_EMAILS})로만 지정한다.
 */
@ConfigurationProperties(prefix = "admin")
public record AdminProperties(List<String> emails) {

    public AdminProperties {
        emails = emails == null ? List.of() : emails;
    }
}
