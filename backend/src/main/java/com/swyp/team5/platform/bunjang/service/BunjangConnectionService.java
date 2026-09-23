package com.swyp.team5.platform.bunjang.service;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.swyp.team5.member.repository.MemberRepository;
import com.swyp.team5.platform.bunjang.BunjangSessionTokenParser;
import com.swyp.team5.platform.bunjang.client.BunjangSessionClient;
import com.swyp.team5.platform.bunjang.client.BunjangSessionClient.SessionState;
import com.swyp.team5.platform.bunjang.dto.BunjangConnectionResponse;
import com.swyp.team5.platform.entity.MemberPlatform;
import com.swyp.team5.platform.entity.MemberPlatformStatus;
import com.swyp.team5.platform.entity.Platform;
import com.swyp.team5.platform.entity.PlatformType;
import com.swyp.team5.platform.error.InvalidPlatformSessionException;
import com.swyp.team5.platform.error.MemberPlatformNotFoundException;
import com.swyp.team5.platform.repository.MemberPlatformRepository;
import com.swyp.team5.platform.repository.PlatformRepository;

/**
 * 회원이 번개장터에서 로그인 후 직접 복사해 온 세션 쿠키를 검증·저장/해제한다. 비밀번호가 아닌 세션만
 * 보관하며({@link com.swyp.team5.common.crypto.EncryptedStringConverter}로 암호화 저장), 저장한
 * 세션은 매물 자동 등록({@link BunjangProductPublishService})에 사용된다. 자동 로그인은 제공하지 않는다.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class BunjangConnectionService {

    private static final String PLATFORM_NAME = PlatformType.BUNJANG.getPlatformName();

    private final MemberRepository memberRepository;
    private final PlatformRepository platformRepository;
    private final MemberPlatformRepository memberPlatformRepository;
    private final BunjangSessionClient bunjangSessionClient;

    /**
     * 쿠키 문자열에서 {@code bun_session}을 추출해 유효성을 검증한 뒤 저장(신규 연동/재연동)한다.
     *
     * @throws InvalidPlatformSessionException 쿠키에서 세션을 찾을 수 없거나, 세션이 유효하지 않은 경우
     */
    public BunjangConnectionResponse connect(Long memberId, String cookie) {
        String sessionToken = BunjangSessionTokenParser.extract(cookie);
        if (sessionToken == null) {
            throw new InvalidPlatformSessionException("올바른 번개장터 로그인 쿠키(bun_session)를 찾을 수 없습니다. 쿠키 값을 다시 확인해 주세요.");
        }
        if (!bunjangSessionClient.verify(sessionToken)) {
            throw new InvalidPlatformSessionException("세션이 유효하지 않거나 만료되었습니다. 번개장터에 다시 로그인한 뒤 쿠키를 복사해 주세요.");
        }

        Platform platform = getPlatform();
        MemberPlatform memberPlatform = memberPlatformRepository
                .findByMemberIdAndPlatformId(memberId, platform.getId())
                .map(existing -> {
                    existing.reconnect(sessionToken);
                    return existing;
                })
                .orElseGet(() -> memberPlatformRepository.save(
                        MemberPlatform.connect(memberRepository.getReferenceById(memberId), platform, sessionToken)));
        return BunjangConnectionResponse.from(memberPlatform);
    }

    /**
     * 연동 상태를 조회한다. 연동됨(CONNECTED) 상태면 저장된 세션을 번개장터에 실제로 확인해, 만료됐으면
     * EXPIRED로 전환한 뒤 돌려준다. 번개장터 응답으로 판단할 수 없는 경우(네트워크 오류 등)는 상태를 바꾸지
     * 않는다.
     */
    public BunjangConnectionResponse getStatus(Long memberId) {
        Platform platform = getPlatform();
        return memberPlatformRepository
                .findByMemberIdAndPlatformId(memberId, platform.getId())
                .map(memberPlatform -> {
                    refreshSessionStatus(memberPlatform);
                    return BunjangConnectionResponse.from(memberPlatform);
                })
                .orElseGet(BunjangConnectionResponse::disconnected);
    }

    /**
     * @throws MemberPlatformNotFoundException 연동 이력이 아예 없는 경우
     */
    public void disconnect(Long memberId) {
        Platform platform = getPlatform();
        MemberPlatform memberPlatform = memberPlatformRepository
                .findByMemberIdAndPlatformId(memberId, platform.getId())
                .orElseThrow(() -> new MemberPlatformNotFoundException(memberId, PLATFORM_NAME));
        memberPlatform.disconnect();
    }

    private void refreshSessionStatus(MemberPlatform memberPlatform) {
        if (memberPlatform.getStatus() != MemberPlatformStatus.CONNECTED) {
            return;
        }
        if (bunjangSessionClient.check(memberPlatform.getSessionToken()) == SessionState.INVALID) {
            memberPlatform.markExpired();
        }
    }

    private Platform getPlatform() {
        return platformRepository
                .findByName(PLATFORM_NAME)
                .orElseThrow(() -> new IllegalStateException("플랫폼이 시드되어 있지 않습니다: " + PLATFORM_NAME));
    }
}
