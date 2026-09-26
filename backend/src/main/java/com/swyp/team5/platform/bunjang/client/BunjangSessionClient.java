package com.swyp.team5.platform.bunjang.client;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * 회원이 등록한 번개장터 로그인 세션(bun_session)의 유효성을 확인한다. 정식 문서화된 API가 아닌, 번개장터
 * 웹 앱이 로그인 여부를 판단할 때 실제로 호출하는 세션 조회 엔드포인트를 그대로 사용한다(비공식/역공학).
 * 세션이 유효하면 {@code {"data":{"login":true,...}}}, 무효/만료면 {@code {"data":{"login":false}}}를 200으로
 * 돌려준다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class BunjangSessionClient {

    private static final String SESSION_PATH = "/api/session/v1/session";

    private final RestClient bunjangSessionRestClient;

    /** 세션 확인 결과. 번개장터 응답으로 판단할 수 없는 경우(네트워크 오류/예상 밖 응답)는 {@link #UNKNOWN}. */
    public enum SessionState {
        VALID,
        INVALID,
        UNKNOWN
    }

    public SessionState check(String sessionToken) {
        try {
            SessionResponse response = bunjangSessionRestClient
                    .get()
                    .uri(SESSION_PATH)
                    .header(HttpHeaders.COOKIE, "bun_session=" + sessionToken)
                    .retrieve()
                    .body(SessionResponse.class);
            if (response == null || response.data() == null || response.data().login() == null) {
                log.warn("번개장터 세션 조회 응답 형식이 예상과 다릅니다. response={}", response);
                return SessionState.UNKNOWN;
            }
            return response.data().login() ? SessionState.VALID : SessionState.INVALID;
        } catch (Exception e) {
            log.warn("번개장터 세션 조회 실패. reason={}", e.getMessage());
            return SessionState.UNKNOWN;
        }
    }

    /** 세션이 유효하다고 확인된 경우에만 true(확인 불가도 false). */
    public boolean verify(String sessionToken) {
        return check(sessionToken) == SessionState.VALID;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record SessionResponse(SessionData data) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    record SessionData(Boolean login) {}
}
