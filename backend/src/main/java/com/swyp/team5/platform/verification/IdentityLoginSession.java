package com.swyp.team5.platform.verification;

import com.swyp.team5.platform.verification.dto.IdentityLoginResult;
import com.swyp.team5.platform.verification.dto.PlatformVerificationRequest;

public interface IdentityLoginSession extends AutoCloseable {

    void requestOtp(PlatformVerificationRequest request);

    IdentityLoginResult confirm(String otp);

    @Override
    void close();
}
