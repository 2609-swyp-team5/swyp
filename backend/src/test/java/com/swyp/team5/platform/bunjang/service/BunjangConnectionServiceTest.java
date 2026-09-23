package com.swyp.team5.platform.bunjang.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.lang.reflect.Constructor;
import java.lang.reflect.Field;
import java.util.Optional;

import com.swyp.team5.member.entity.Member;
import com.swyp.team5.member.repository.MemberRepository;
import com.swyp.team5.platform.bunjang.client.BunjangSessionClient;
import com.swyp.team5.platform.bunjang.client.BunjangSessionClient.SessionState;
import com.swyp.team5.platform.bunjang.dto.BunjangConnectionResponse;
import com.swyp.team5.platform.entity.MemberPlatform;
import com.swyp.team5.platform.entity.MemberPlatformStatus;
import com.swyp.team5.platform.entity.Platform;
import com.swyp.team5.platform.error.InvalidPlatformSessionException;
import com.swyp.team5.platform.error.MemberPlatformNotFoundException;
import com.swyp.team5.platform.repository.MemberPlatformRepository;
import com.swyp.team5.platform.repository.PlatformRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

// 번개장터 세션 연동 Service 단위 테스트.
@ExtendWith(MockitoExtension.class)
class BunjangConnectionServiceTest {

    @Mock
    private MemberRepository memberRepository;

    @Mock
    private PlatformRepository platformRepository;

    @Mock
    private MemberPlatformRepository memberPlatformRepository;

    @Mock
    private BunjangSessionClient bunjangSessionClient;

    private BunjangConnectionService service() {
        return new BunjangConnectionService(
                memberRepository, platformRepository, memberPlatformRepository, bunjangSessionClient);
    }

    // 쿠키에서 bun_session을 추출할 수 없으면 세션 검증 없이 즉시 실패
    @Test
    void connectFailsWhenSessionMissingFromCookie() {
        assertThatThrownBy(() -> service().connect(1L, "   ")).isInstanceOf(InvalidPlatformSessionException.class);
        verify(bunjangSessionClient, never()).verify(any());
    }

    // 세션이 유효하지 않으면 실패
    @Test
    void connectFailsWhenSessionInvalid() {
        when(bunjangSessionClient.verify("abc123")).thenReturn(false);

        assertThatThrownBy(() -> service().connect(1L, "bun_session=abc123"))
                .isInstanceOf(InvalidPlatformSessionException.class);
        verify(memberPlatformRepository, never()).save(any());
    }

    // 최초 연동 성공 - 새 MemberPlatform 생성/저장
    @Test
    void connectCreatesNewMemberPlatform() {
        Platform platform = newPlatform(1L);
        when(bunjangSessionClient.verify("abc123")).thenReturn(true);
        when(platformRepository.findByName("번개장터")).thenReturn(Optional.of(platform));
        when(memberPlatformRepository.findByMemberIdAndPlatformId(2L, 1L)).thenReturn(Optional.empty());
        when(memberRepository.getReferenceById(2L)).thenReturn(newMember(2L));
        MemberPlatform saved = MemberPlatform.connect(newMember(2L), platform, "abc123");
        when(memberPlatformRepository.save(any())).thenReturn(saved);

        BunjangConnectionResponse response = service().connect(2L, "bun_session=abc123");

        assertThat(response.status()).isEqualTo(MemberPlatformStatus.CONNECTED);
        verify(memberPlatformRepository).save(any());
    }

    // 이미 연동된 적이 있으면 재연동(세션 갱신)만 하고 새로 저장하지 않음
    @Test
    void connectReconnectsExistingMemberPlatform() {
        Platform platform = newPlatform(1L);
        MemberPlatform existing = MemberPlatform.connect(newMember(2L), platform, "old-token");
        existing.markExpired();
        when(bunjangSessionClient.verify("new-token")).thenReturn(true);
        when(platformRepository.findByName("번개장터")).thenReturn(Optional.of(platform));
        when(memberPlatformRepository.findByMemberIdAndPlatformId(2L, 1L)).thenReturn(Optional.of(existing));

        BunjangConnectionResponse response = service().connect(2L, "bun_session=new-token");

        assertThat(response.status()).isEqualTo(MemberPlatformStatus.CONNECTED);
        assertThat(existing.getSessionToken()).isEqualTo("new-token");
        verify(memberPlatformRepository, never()).save(any());
    }

    // 연동 이력이 없으면 연동 해제(DISCONNECTED)로 취급
    @Test
    void getStatusReturnsDisconnectedWhenNeverConnected() {
        Platform platform = newPlatform(1L);
        when(platformRepository.findByName("번개장터")).thenReturn(Optional.of(platform));
        when(memberPlatformRepository.findByMemberIdAndPlatformId(2L, 1L)).thenReturn(Optional.empty());

        BunjangConnectionResponse response = service().getStatus(2L);

        assertThat(response.status()).isEqualTo(MemberPlatformStatus.DISCONNECTED);
    }

    // 연동됨 상태에서 번개장터가 세션을 유효하다고 확인하면 그대로 CONNECTED
    @Test
    void getStatusKeepsConnectedWhenSessionValid() {
        MemberPlatform existing = givenMemberPlatform();
        when(bunjangSessionClient.check("abc123")).thenReturn(SessionState.VALID);

        assertThat(service().getStatus(2L).status()).isEqualTo(MemberPlatformStatus.CONNECTED);
        assertThat(existing.getStatus()).isEqualTo(MemberPlatformStatus.CONNECTED);
    }

    // 연동됨 상태인데 세션이 만료됐으면 EXPIRED로 전환해 응답
    @Test
    void getStatusMarksExpiredWhenSessionInvalid() {
        MemberPlatform existing = givenMemberPlatform();
        when(bunjangSessionClient.check("abc123")).thenReturn(SessionState.INVALID);

        assertThat(service().getStatus(2L).status()).isEqualTo(MemberPlatformStatus.EXPIRED);
        assertThat(existing.getStatus()).isEqualTo(MemberPlatformStatus.EXPIRED);
    }

    // 번개장터 응답으로 판단할 수 없으면(네트워크 오류 등) 상태를 바꾸지 않음
    @Test
    void getStatusKeepsConnectedWhenSessionUnknown() {
        MemberPlatform existing = givenMemberPlatform();
        when(bunjangSessionClient.check("abc123")).thenReturn(SessionState.UNKNOWN);

        assertThat(service().getStatus(2L).status()).isEqualTo(MemberPlatformStatus.CONNECTED);
        assertThat(existing.getStatus()).isEqualTo(MemberPlatformStatus.CONNECTED);
    }

    // 이미 만료/해제 상태면 번개장터에 다시 확인하지 않음
    @Test
    void getStatusSkipsCheckWhenNotConnected() {
        MemberPlatform existing = givenMemberPlatform();
        existing.markExpired();

        assertThat(service().getStatus(2L).status()).isEqualTo(MemberPlatformStatus.EXPIRED);
        verify(bunjangSessionClient, never()).check(any());
    }

    // 연동 해제 성공
    @Test
    void disconnectSucceeds() {
        Platform platform = newPlatform(1L);
        MemberPlatform existing = MemberPlatform.connect(newMember(2L), platform, "abc123");
        when(platformRepository.findByName("번개장터")).thenReturn(Optional.of(platform));
        when(memberPlatformRepository.findByMemberIdAndPlatformId(2L, 1L)).thenReturn(Optional.of(existing));

        service().disconnect(2L);

        assertThat(existing.getStatus()).isEqualTo(MemberPlatformStatus.DISCONNECTED);
        assertThat(existing.getSessionToken()).isNull();
    }

    // 연동 이력 자체가 없는데 해제를 시도하면 실패
    @Test
    void disconnectFailsWhenNeverConnected() {
        Platform platform = newPlatform(1L);
        when(platformRepository.findByName("번개장터")).thenReturn(Optional.of(platform));
        when(memberPlatformRepository.findByMemberIdAndPlatformId(2L, 1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service().disconnect(2L)).isInstanceOf(MemberPlatformNotFoundException.class);
    }

    private Member newMember(Long id) {
        Member member = Member.ofLocalSignUp("test@example.com", null, "encoded-password", "홍길동", "gildong", null);
        setField(member, "id", id);
        return member;
    }

    private Platform newPlatform(Long id) {
        try {
            Constructor<Platform> constructor = Platform.class.getDeclaredConstructor();
            constructor.setAccessible(true);
            Platform platform = constructor.newInstance();
            setField(platform, "id", id);
            setField(platform, "name", "번개장터");
            return platform;
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException(e);
        }
    }

    private MemberPlatform givenMemberPlatform() {
        Platform platform = newPlatform(1L);
        MemberPlatform memberPlatform = MemberPlatform.connect(newMember(2L), platform, "abc123");
        when(platformRepository.findByName("번개장터")).thenReturn(Optional.of(platform));
        when(memberPlatformRepository.findByMemberIdAndPlatformId(2L, 1L)).thenReturn(Optional.of(memberPlatform));
        return memberPlatform;
    }

    private void setField(Object target, String fieldName, Object value) {
        try {
            Field field = target.getClass().getDeclaredField(fieldName);
            field.setAccessible(true);
            field.set(target, value);
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException(e);
        }
    }
}
