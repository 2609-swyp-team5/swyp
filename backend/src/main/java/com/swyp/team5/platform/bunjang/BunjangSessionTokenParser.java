package com.swyp.team5.platform.bunjang;

/**
 * 사용자가 브라우저 개발자 도구 등에서 복사해 붙여넣은 쿠키 문자열에서 {@code bun_session} 값만
 * 추출한다. "bun_session=xxx", "bun_session: xxx", "foo=bar; bun_session=xxx; baz=qux",
 * 또는 값만 붙여넣은 경우(raw 토큰)까지 폭넓게 허용한다.
 */
public final class BunjangSessionTokenParser {

    private static final String COOKIE_NAME = "bun_session";

    private BunjangSessionTokenParser() {}

    public static String extract(String rawInput) {
        if (rawInput == null) {
            return null;
        }
        String value = stripQuotes(rawInput.trim());

        if (value.startsWith(COOKIE_NAME + ":")) {
            value = value.substring((COOKIE_NAME + ":").length()).trim();
        } else if (value.startsWith(COOKIE_NAME + "=")) {
            value = value.substring((COOKIE_NAME + "=").length()).trim();
        } else if (value.contains(COOKIE_NAME + "=")) {
            value = extractFromCookiePairs(value);
        }

        value = value == null ? null : stripQuotes(value.trim());
        return (value == null || value.isEmpty()) ? null : value;
    }

    private static String extractFromCookiePairs(String cookieString) {
        for (String cookie : cookieString.split(";")) {
            String[] pair = cookie.trim().split("=", 2);
            if (pair.length == 2 && COOKIE_NAME.equals(pair[0].trim())) {
                return pair[1].trim();
            }
        }
        return null;
    }

    private static String stripQuotes(String value) {
        if (value != null && value.length() >= 2 && value.startsWith("\"") && value.endsWith("\"")) {
            return value.substring(1, value.length() - 1).trim();
        }
        return value;
    }
}
