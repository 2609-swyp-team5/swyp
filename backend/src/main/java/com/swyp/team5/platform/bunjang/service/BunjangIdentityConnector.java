package com.swyp.team5.platform.bunjang.service;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Component;

import com.swyp.team5.platform.bunjang.client.BunjangBrowserLauncher;
import com.swyp.team5.platform.bunjang.client.BunjangIdentityLoginSession;
import com.swyp.team5.platform.bunjang.dto.BunjangConnectionResponse;
import com.swyp.team5.platform.entity.PlatformType;
import com.swyp.team5.platform.error.InvalidPlatformSessionException;
import com.swyp.team5.platform.error.PlatformVerificationException;
import com.swyp.team5.platform.verification.IdentityLoginSession;
import com.swyp.team5.platform.verification.PlatformIdentityConnector;

@Component
@RequiredArgsConstructor
public class BunjangIdentityConnector implements PlatformIdentityConnector {

    private final BunjangBrowserLauncher browserLauncher;
    private final BunjangConnectionService connectionService;

    @Override
    public PlatformType platform() {
        return PlatformType.BUNJANG;
    }

    @Override
    public IdentityLoginSession open() {
        return BunjangIdentityLoginSession.open(browserLauncher);
    }

    @Override
    public BunjangConnectionResponse connect(Long memberId, String sessionToken) {
        try {
            return connectionService.connect(memberId, sessionToken);
        } catch (InvalidPlatformSessionException e) {
            throw PlatformVerificationException.failed("번개장터 로그인 직후 세션 확인 실패. memberId=" + memberId);
        }
    }
}
