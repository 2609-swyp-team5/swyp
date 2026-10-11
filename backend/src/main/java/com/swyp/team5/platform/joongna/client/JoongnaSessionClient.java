package com.swyp.team5.platform.joongna.client;

import java.util.Map;
import java.util.Optional;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import com.swyp.team5.platform.joongna.dto.JoongnaSession;
import tools.jackson.databind.JsonNode;

@Slf4j
@Component
@RequiredArgsConstructor
public class JoongnaSessionClient {

    private static final String USER_INFO_PATH = "/user/info/seq";
    private static final String REFRESH_PATH = "/common/token/refresh";

    private final RestClient joongnaApiRestClient;
    private final RestClient joongnaMainApiRestClient;

    public enum SessionState {
        VALID,
        INVALID,
        UNKNOWN
    }

    public SessionState check(JoongnaSession session) {
        try {
            JsonNode root = joongnaApiRestClient
                    .get()
                    .uri(USER_INFO_PATH)
                    .header("Authorization", "Bearer " + session.accessToken())
                    .retrieve()
                    .body(JsonNode.class);
            return root.path("data").path("storeSeq").isMissingNode() ? SessionState.UNKNOWN : SessionState.VALID;
        } catch (RestClientResponseException e) {
            HttpStatus status = HttpStatus.resolve(e.getStatusCode().value());
            if (status == HttpStatus.UNAUTHORIZED || status == HttpStatus.FORBIDDEN) {
                return SessionState.INVALID;
            }
            log.warn("중고나라 세션 확인 실패. status={}", e.getStatusCode().value());
            return SessionState.UNKNOWN;
        } catch (RuntimeException e) {
            log.warn("중고나라 세션 확인 실패. reason={}", e.getClass().getSimpleName());
            return SessionState.UNKNOWN;
        }
    }

    public Optional<JoongnaSession> refresh(JoongnaSession session) {
        try {
            JsonNode data = joongnaMainApiRestClient
                    .post()
                    .uri(REFRESH_PATH)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("accessToken", session.accessToken(), "refreshToken", session.refreshToken()))
                    .retrieve()
                    .body(JsonNode.class)
                    .path("data");
            String accessToken = data.path("accessToken").asString(null);
            if (accessToken == null || accessToken.isBlank()) {
                return Optional.empty();
            }
            String refreshToken = data.path("refreshToken").asString(null);
            return Optional.of(new JoongnaSession(
                    accessToken,
                    refreshToken == null || refreshToken.isBlank() ? session.refreshToken() : refreshToken));
        } catch (RestClientResponseException e) {
            log.info("중고나라 토큰 갱신 거절. status={}", e.getStatusCode().value());
            return Optional.empty();
        } catch (RuntimeException e) {
            log.warn("중고나라 토큰 갱신 실패. reason={}", e.getClass().getSimpleName());
            return Optional.empty();
        }
    }
}
