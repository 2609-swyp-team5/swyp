package com.swyp.team5.platform.error;

public class PlatformListingNotFoundException extends RuntimeException {

    public PlatformListingNotFoundException(Long listingId) {
        super("존재하지 않는 외부 매물입니다. listingId=" + listingId);
    }
}
