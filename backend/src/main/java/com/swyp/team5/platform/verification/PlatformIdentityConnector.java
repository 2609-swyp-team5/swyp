package com.swyp.team5.platform.verification;

import com.swyp.team5.platform.bunjang.dto.BunjangConnectionResponse;
import com.swyp.team5.platform.entity.PlatformType;

public interface PlatformIdentityConnector {

    PlatformType platform();

    IdentityLoginSession open();

    BunjangConnectionResponse connect(Long memberId, String sessionToken);
}
