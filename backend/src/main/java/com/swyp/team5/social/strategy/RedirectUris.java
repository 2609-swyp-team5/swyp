package com.swyp.team5.social.strategy;

import java.util.List;

import org.springframework.http.HttpHeaders;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

final class RedirectUris {

    private RedirectUris() {}

    static String forCurrentRequest(List<String> candidates) {
        String origin = currentOrigin();
        if (origin != null) {
            for (String uri : candidates) {
                if (uri.startsWith(origin + "/")) {
                    return uri;
                }
            }
        }
        return candidates.get(0);
    }

    private static String currentOrigin() {
        if (RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attributes) {
            return attributes.getRequest().getHeader(HttpHeaders.ORIGIN);
        }
        return null;
    }
}
