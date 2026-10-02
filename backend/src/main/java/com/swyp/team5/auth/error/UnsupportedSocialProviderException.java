package com.swyp.team5.auth.error;

import com.swyp.team5.common.error.LogDetail;

public class UnsupportedSocialProviderException extends RuntimeException implements LogDetail {

    private final String logDetail;

    public UnsupportedSocialProviderException(String provider) {
        super("지원하지 않는 소셜 로그인이에요.");
        this.logDetail = "provider=" + provider;
    }

    @Override
    public String logDetail() {
        return logDetail;
    }
}
