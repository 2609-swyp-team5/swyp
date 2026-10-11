package com.swyp.team5.platform.verification;

import java.time.Duration;
import java.util.EnumMap;
import java.util.List;
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

import com.swyp.team5.platform.entity.PlatformType;
import com.swyp.team5.platform.error.PlatformVerificationException;
import com.swyp.team5.platform.error.PlatformVerificationException.Reason;
import com.swyp.team5.platform.error.UnsupportedPlatformException;
import com.swyp.team5.platform.verification.dto.IdentityLoginResult;
import com.swyp.team5.platform.verification.dto.PlatformVerificationConfirmResponse;
import com.swyp.team5.platform.verification.dto.PlatformVerificationRequest;
import com.swyp.team5.platform.verification.dto.PlatformVerificationResponse;

@Slf4j
@Service
public class PlatformVerificationService {

    private static final int OTP_VALID_SECONDS = 180;
    private static final int MAX_OTP_ATTEMPTS = 5;
    private static final long STEP_TIMEOUT_SECONDS = 90;
    private static final Duration REQUEST_WINDOW = Duration.ofHours(1);
    private static final String REQUEST_COUNT_KEY_PREFIX = "platformVerification:requests:";
    private static final ThreadFactory WORKER_THREADS =
            Thread.ofPlatform().name("platform-verification-", 1).daemon().factory();

    private final Map<PlatformType, PlatformIdentityConnector> connectors = new EnumMap<>(PlatformType.class);
    private final StringRedisTemplate redisTemplate;
    private final long verificationTimeoutSeconds;
    private final int maxRequestsPerHour;
    private final Semaphore browserSlots;
    private final Map<Long, PendingVerification> pendings = new ConcurrentHashMap<>();
    private final Set<Long> requestingMembers = ConcurrentHashMap.newKeySet();

    public PlatformVerificationService(
            List<PlatformIdentityConnector> connectors,
            StringRedisTemplate redisTemplate,
            @Value("${platform.bunjang.verification.max-concurrency:2}") int maxConcurrency,
            @Value("${platform.bunjang.verification.timeout-seconds:200}") long verificationTimeoutSeconds,
            @Value("${platform.bunjang.verification.max-requests-per-hour:10}") int maxRequestsPerHour) {
        connectors.forEach(connector -> this.connectors.put(connector.platform(), connector));
        this.redisTemplate = redisTemplate;
        this.verificationTimeoutSeconds = verificationTimeoutSeconds;
        this.maxRequestsPerHour = maxRequestsPerHour;
        this.browserSlots = new Semaphore(maxConcurrency);
    }

    public PlatformVerificationResponse request(
            Long memberId, PlatformType platform, PlatformVerificationRequest request) {
        PlatformIdentityConnector connector = connector(platform);
        if (!requestingMembers.add(memberId)) {
            throw PlatformVerificationException.inProgress(memberId);
        }
        try {
            checkRequestLimit(memberId);
            PendingVerification previous = pendings.get(memberId);
            if (previous != null) {
                close(previous);
            }
            if (!browserSlots.tryAcquire()) {
                throw PlatformVerificationException.busy();
            }

            PendingVerification pending =
                    new PendingVerification(UUID.randomUUID().toString(), memberId, connector, newWorker());
            try {
                run(pending, () -> {
                    pending.session = connector.open();
                    pending.session.requestOtp(request);
                    return null;
                });
            } catch (RuntimeException e) {
                close(pending);
                throw e;
            }
            pendings.put(memberId, pending);
            pending.worker.schedule(() -> expire(pending), verificationTimeoutSeconds, TimeUnit.SECONDS);
            log.info(
                    "{} 본인인증 문자 요청 완료. memberId={}, verificationId={}",
                    platform.getPlatformName(),
                    memberId,
                    pending.id);
            return new PlatformVerificationResponse(pending.id, OTP_VALID_SECONDS);
        } finally {
            requestingMembers.remove(memberId);
        }
    }

    public PlatformVerificationConfirmResponse confirm(
            Long memberId, PlatformType platform, String verificationId, String otp) {
        PendingVerification pending = pendings.get(memberId);
        if (pending == null || !pending.id.equals(verificationId) || pending.connector.platform() != platform) {
            throw PlatformVerificationException.notFound(memberId, verificationId);
        }

        IdentityLoginResult result;
        synchronized (pending) {
            boolean retryable = false;
            try {
                result = run(pending, () -> {
                    if (pending.closed.get()) {
                        throw PlatformVerificationException.notFound(memberId, verificationId);
                    }
                    return pending.session.confirm(otp);
                });
            } catch (PlatformVerificationException e) {
                retryable = e.getReason() == Reason.REJECTED && ++pending.attempts < MAX_OTP_ATTEMPTS;
                throw e;
            } finally {
                if (!retryable) {
                    close(pending);
                }
            }
        }
        PlatformVerificationConfirmResponse response = PlatformVerificationConfirmResponse.of(
                pending.connector.connect(memberId, result.sessionToken()), result.newAccount());
        log.info(
                "{} 본인인증 연결 완료. memberId={}, newAccount={}", platform.getPlatformName(), memberId, result.newAccount());
        return response;
    }

    @PreDestroy
    void shutdown() {
        pendings.values().forEach(this::close);
    }

    private PlatformIdentityConnector connector(PlatformType platform) {
        PlatformIdentityConnector connector = connectors.get(platform);
        if (connector == null) {
            throw new UnsupportedPlatformException(platform.name());
        }
        return connector;
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
            log.warn("본인인증 요청 횟수 확인 실패 — 제한 없이 진행합니다. memberId={}", memberId, e);
            return;
        }
        if (count > maxRequestsPerHour) {
            throw PlatformVerificationException.limitExceeded(memberId, Math.max(1, Math.ceilDiv(ttlSeconds, 60)));
        }
    }

    private <T> T run(PendingVerification pending, Callable<T> task) {
        try {
            return pending.worker.submit(task).get(STEP_TIMEOUT_SECONDS, TimeUnit.SECONDS);
        } catch (RejectedExecutionException e) {
            throw PlatformVerificationException.notFound(pending.memberId, pending.id);
        } catch (ExecutionException e) {
            if (e.getCause() instanceof RuntimeException cause) {
                throw cause;
            }
            throw PlatformVerificationException.failed("verificationId=" + pending.id + ", "
                    + e.getCause().getClass().getSimpleName());
        } catch (TimeoutException e) {
            throw PlatformVerificationException.failed("응답 대기 시간 초과. verificationId=" + pending.id);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw PlatformVerificationException.failed("본인인증 처리 중단. verificationId=" + pending.id);
        }
    }

    private void expire(PendingVerification pending) {
        if (close(pending)) {
            log.info("본인인증 대기 시간 만료. memberId={}, verificationId={}", pending.memberId, pending.id);
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
        private final PlatformIdentityConnector connector;
        private final ScheduledThreadPoolExecutor worker;
        private final AtomicBoolean closed = new AtomicBoolean();
        private int attempts;
        private IdentityLoginSession session;
    }
}
