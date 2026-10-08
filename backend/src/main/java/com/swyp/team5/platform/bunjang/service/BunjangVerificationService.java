package com.swyp.team5.platform.bunjang.service;

import java.time.Duration;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.ScheduledThreadPoolExecutor;
import java.util.concurrent.Semaphore;
import java.util.concurrent.ThreadFactory;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.concurrent.atomic.AtomicBoolean;

import jakarta.annotation.PreDestroy;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import com.swyp.team5.platform.bunjang.client.BunjangBrowserLauncher;
import com.swyp.team5.platform.bunjang.client.BunjangIdentityLoginSession;
import com.swyp.team5.platform.bunjang.dto.BunjangConnectionResponse;
import com.swyp.team5.platform.bunjang.dto.BunjangIdentityLoginResult;
import com.swyp.team5.platform.bunjang.dto.BunjangVerificationConfirmResponse;
import com.swyp.team5.platform.bunjang.dto.BunjangVerificationRequest;
import com.swyp.team5.platform.bunjang.dto.BunjangVerificationResponse;
import com.swyp.team5.platform.error.BunjangVerificationException;
import com.swyp.team5.platform.error.BunjangVerificationException.Reason;
import com.swyp.team5.platform.error.InvalidPlatformSessionException;

@Slf4j
@Service
public class BunjangVerificationService {

    private static final int OTP_VALID_SECONDS = 180;
    private static final int MAX_OTP_ATTEMPTS = 5;
    private static final long STEP_TIMEOUT_SECONDS = 90;
    private static final Duration REQUEST_WINDOW = Duration.ofHours(1);
    private static final String REQUEST_COUNT_KEY_PREFIX = "bunjangVerification:requests:";
    private static final ThreadFactory WORKER_THREADS =
            Thread.ofPlatform().name("bunjang-verification-", 1).daemon().factory();

    private final BunjangBrowserLauncher browserLauncher;
    private final BunjangConnectionService connectionService;
    private final StringRedisTemplate redisTemplate;
    private final long verificationTimeoutSeconds;
    private final int maxRequestsPerHour;
    private final Semaphore browserSlots;
    private final Map<Long, PendingVerification> pendings = new ConcurrentHashMap<>();
    private final Set<Long> requestingMembers = ConcurrentHashMap.newKeySet();

    public BunjangVerificationService(
            BunjangBrowserLauncher browserLauncher,
            BunjangConnectionService connectionService,
            StringRedisTemplate redisTemplate,
            @Value("${platform.bunjang.verification.max-concurrency:2}") int maxConcurrency,
            @Value("${platform.bunjang.verification.timeout-seconds:200}") long verificationTimeoutSeconds,
            @Value("${platform.bunjang.verification.max-requests-per-hour:10}") int maxRequestsPerHour) {
        this.browserLauncher = browserLauncher;
        this.connectionService = connectionService;
        this.redisTemplate = redisTemplate;
        this.verificationTimeoutSeconds = verificationTimeoutSeconds;
        this.maxRequestsPerHour = maxRequestsPerHour;
        this.browserSlots = new Semaphore(maxConcurrency);
    }

    public BunjangVerificationResponse request(Long memberId, BunjangVerificationRequest request) {
        if (!requestingMembers.add(memberId)) {
            throw BunjangVerificationException.inProgress(memberId);
        }
        try {
            checkRequestLimit(memberId);
            PendingVerification previous = pendings.get(memberId);
            if (previous != null) {
                close(previous);
            }
            if (!browserSlots.tryAcquire()) {
                throw BunjangVerificationException.busy();
            }

            PendingVerification pending =
                    new PendingVerification(UUID.randomUUID().toString(), memberId, newWorker());
            try {
                run(pending, () -> {
                    pending.session = BunjangIdentityLoginSession.open(browserLauncher);
                    pending.session.requestOtp(request);
                    return null;
                });
            } catch (RuntimeException e) {
                close(pending);
                throw e;
            }
            pendings.put(memberId, pending);
            pending.worker.schedule(() -> expire(pending), verificationTimeoutSeconds, TimeUnit.SECONDS);
            log.info("번개장터 본인인증 문자 요청 완료. memberId={}, verificationId={}", memberId, pending.id);
            return new BunjangVerificationResponse(pending.id, OTP_VALID_SECONDS);
        } finally {
            requestingMembers.remove(memberId);
        }
    }

    public BunjangVerificationConfirmResponse confirm(Long memberId, String verificationId, String otp) {
        PendingVerification pending = pendings.get(memberId);
        if (pending == null || !pending.id.equals(verificationId)) {
            throw BunjangVerificationException.notFound(memberId, verificationId);
        }

        BunjangIdentityLoginResult result;
        synchronized (pending) {
            boolean retryable = false;
            try {
                result = run(pending, () -> {
                    if (pending.closed.get()) {
                        throw BunjangVerificationException.notFound(memberId, verificationId);
                    }
                    return pending.session.confirm(otp);
                });
            } catch (BunjangVerificationException e) {
                retryable = e.getReason() == Reason.REJECTED && ++pending.attempts < MAX_OTP_ATTEMPTS;
                throw e;
            } finally {
                if (!retryable) {
                    close(pending);
                }
            }
        }
        return BunjangVerificationConfirmResponse.of(saveConnection(memberId, result), result.newAccount());
    }

    @PreDestroy
    void shutdown() {
        pendings.values().forEach(this::close);
    }

    private void checkRequestLimit(Long memberId) {
        String key = REQUEST_COUNT_KEY_PREFIX + memberId;
        long count;
        long ttlSeconds;
        try {
            redisTemplate.opsForValue().setIfAbsent(key, "0", REQUEST_WINDOW);
            count = redisTemplate.opsForValue().increment(key);
            ttlSeconds = redisTemplate.getExpire(key, TimeUnit.SECONDS);
            if (ttlSeconds < 0) {
                redisTemplate.expire(key, REQUEST_WINDOW);
                ttlSeconds = REQUEST_WINDOW.toSeconds();
            }
        } catch (RuntimeException e) {
            log.warn("번개장터 본인인증 요청 횟수 확인 실패 — 제한 없이 진행합니다. memberId={}", memberId, e);
            return;
        }
        if (count > maxRequestsPerHour) {
            throw BunjangVerificationException.limitExceeded(memberId, Math.max(1, Math.ceilDiv(ttlSeconds, 60)));
        }
    }

    private BunjangConnectionResponse saveConnection(Long memberId, BunjangIdentityLoginResult result) {
        try {
            BunjangConnectionResponse connection = connectionService.connect(memberId, result.sessionToken());
            log.info("번개장터 본인인증 연결 완료. memberId={}, newBunjangAccount={}", memberId, result.newAccount());
            return connection;
        } catch (InvalidPlatformSessionException e) {
            throw BunjangVerificationException.failed("로그인 직후 세션 확인 실패. memberId=" + memberId);
        }
    }

    private <T> T run(PendingVerification pending, Callable<T> task) {
        try {
            return pending.worker.submit(task).get(STEP_TIMEOUT_SECONDS, TimeUnit.SECONDS);
        } catch (RejectedExecutionException e) {
            throw BunjangVerificationException.notFound(pending.memberId, pending.id);
        } catch (ExecutionException e) {
            if (e.getCause() instanceof RuntimeException cause) {
                throw cause;
            }
            throw BunjangVerificationException.failed("verificationId=" + pending.id + ", "
                    + e.getCause().getClass().getSimpleName());
        } catch (TimeoutException e) {
            throw BunjangVerificationException.failed("번개장터 응답 대기 시간 초과. verificationId=" + pending.id);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw BunjangVerificationException.failed("본인인증 처리 중단. verificationId=" + pending.id);
        }
    }

    private void expire(PendingVerification pending) {
        if (close(pending)) {
            log.info("번개장터 본인인증 대기 시간 만료. memberId={}, verificationId={}", pending.memberId, pending.id);
        }
    }

    private boolean close(PendingVerification pending) {
        if (!pending.closed.compareAndSet(false, true)) {
            return false;
        }
        pendings.remove(pending.memberId, pending);
        pending.worker.execute(() -> {
            try {
                if (pending.session != null) {
                    pending.session.close();
                }
            } finally {
                browserSlots.release();
            }
        });
        pending.worker.shutdown();
        return true;
    }

    private static ScheduledThreadPoolExecutor newWorker() {
        ScheduledThreadPoolExecutor worker = new ScheduledThreadPoolExecutor(1, WORKER_THREADS);
        worker.setExecuteExistingDelayedTasksAfterShutdownPolicy(false);
        return worker;
    }

    @RequiredArgsConstructor
    private static final class PendingVerification {

        private final String id;
        private final Long memberId;
        private final ScheduledThreadPoolExecutor worker;
        private final AtomicBoolean closed = new AtomicBoolean();
        private int attempts;
        private BunjangIdentityLoginSession session;
    }
}
