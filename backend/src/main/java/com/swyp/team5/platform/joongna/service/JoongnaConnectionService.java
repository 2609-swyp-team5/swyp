package com.swyp.team5.platform.joongna.service;

import java.util.Optional;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.swyp.team5.member.repository.MemberRepository;
import com.swyp.team5.notification.service.NotificationService;
import com.swyp.team5.platform.bunjang.dto.BunjangConnectionResponse;
import com.swyp.team5.platform.entity.MemberPlatform;
import com.swyp.team5.platform.entity.MemberPlatformStatus;
import com.swyp.team5.platform.entity.Platform;
import com.swyp.team5.platform.entity.PlatformType;
import com.swyp.team5.platform.error.InvalidPlatformSessionException;
import com.swyp.team5.platform.error.MemberPlatformNotFoundException;
import com.swyp.team5.platform.joongna.client.JoongnaSessionClient;
import com.swyp.team5.platform.joongna.client.JoongnaSessionClient.SessionState;
import com.swyp.team5.platform.joongna.dto.JoongnaSession;
import com.swyp.team5.platform.repository.MemberPlatformRepository;
import com.swyp.team5.platform.repository.PlatformRepository;

@Service
@RequiredArgsConstructor
@Transactional
public class JoongnaConnectionService {

    private static final String PLATFORM_NAME = PlatformType.JOONGNA.getPlatformName();

    private final MemberRepository memberRepository;
    private final PlatformRepository platformRepository;
    private final MemberPlatformRepository memberPlatformRepository;
    private final JoongnaSessionClient joongnaSessionClient;
    private final NotificationService notificationService;

    public BunjangConnectionResponse connect(Long memberId, String sessionJson) {
        JoongnaSession session = JoongnaSession.parse(sessionJson);
        if (session == null || joongnaSessionClient.check(session) != SessionState.VALID) {
            throw new InvalidPlatformSessionException("중고나라 로그인 정보를 확인하지 못했습니다. 다시 연결해 주십시오.");
        }
        Platform platform = getPlatform();
        MemberPlatform memberPlatform = memberPlatformRepository
                .findByMemberIdAndPlatformId(memberId, platform.getId())
                .map(existing -> {
                    existing.reconnect(session.toJson());
                    return existing;
                })
                .orElseGet(() -> memberPlatformRepository.save(MemberPlatform.connect(
                        memberRepository.getReferenceById(memberId), platform, session.toJson())));
        return BunjangConnectionResponse.from(memberPlatform);
    }

    public BunjangConnectionResponse getStatus(Long memberId) {
        return memberPlatformRepository
                .findByMemberIdAndPlatformId(memberId, getPlatform().getId())
                .map(memberPlatform -> {
                    refreshSession(memberPlatform);
                    return BunjangConnectionResponse.from(memberPlatform);
                })
                .orElseGet(BunjangConnectionResponse::disconnected);
    }

    public Optional<JoongnaSession> findValidSession(Long memberId) {
        return memberPlatformRepository
                .findByMemberIdAndPlatformId(memberId, getPlatform().getId())
                .flatMap(this::refreshSession);
    }

    public void disconnect(Long memberId) {
        memberPlatformRepository
                .findByMemberIdAndPlatformId(memberId, getPlatform().getId())
                .orElseThrow(() -> new MemberPlatformNotFoundException(memberId, PLATFORM_NAME))
                .disconnect();
    }

    private Optional<JoongnaSession> refreshSession(MemberPlatform memberPlatform) {
        if (memberPlatform.getStatus() != MemberPlatformStatus.CONNECTED) {
            return Optional.empty();
        }
        JoongnaSession session = JoongnaSession.parse(memberPlatform.getSessionToken());
        if (session == null) {
            expire(memberPlatform);
            return Optional.empty();
        }
        SessionState state = joongnaSessionClient.check(session);
        if (state != SessionState.INVALID) {
            return Optional.of(session);
        }
        Optional<JoongnaSession> refreshed = joongnaSessionClient
                .refresh(session)
                .filter(candidate -> joongnaSessionClient.check(candidate) == SessionState.VALID);
        refreshed.ifPresentOrElse(
                candidate -> memberPlatform.reconnect(candidate.toJson()), () -> expire(memberPlatform));
        return refreshed;
    }

    private void expire(MemberPlatform memberPlatform) {
        if (memberPlatform.markExpired()) {
            notificationService.notifyPlatformExpired(memberPlatform.getMember(), PLATFORM_NAME);
        }
    }

    private Platform getPlatform() {
        return platformRepository
                .findByName(PLATFORM_NAME)
                .orElseThrow(() -> new IllegalStateException("플랫폼이 시드되어 있지 않습니다: " + PLATFORM_NAME));
    }
}
