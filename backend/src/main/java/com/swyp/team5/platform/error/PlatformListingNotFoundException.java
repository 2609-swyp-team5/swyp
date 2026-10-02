package com.swyp.team5.platform.error;

import com.swyp.team5.common.error.LogDetail;

public class PlatformListingNotFoundException extends RuntimeException implements LogDetail {

    private final String logDetail;

    public PlatformListingNotFoundException(Long listingId) {
        super("존재하지 않는 외부 매물이에요.");
        this.logDetail = "listingId=" + listingId;
    }

    @Override
    public String logDetail() {
        return logDetail;
    }
}
