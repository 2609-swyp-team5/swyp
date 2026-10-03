package com.swyp.team5.social.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.lang.reflect.Field;
import java.util.List;
import java.util.Optional;

import com.swyp.team5.auth.dto.SocialUserInfo;
import com.swyp.team5.member.entity.Member;
import com.swyp.team5.member.repository.MemberRepository;
import com.swyp.team5.social.dto.SocialAccountResponse;
import com.swyp.team5.social.entity.Social;
import com.swyp.team5.social.entity.SocialProvider;
import com.swyp.team5.social.error.LastLoginMethodException;
import com.swyp.team5.social.error.SocialAccountAlreadyLinkedException;
import com.swyp.team5.social.error.SocialAccountNotLinkedException;
import com.swyp.team5.social.repository.SocialRepository;
import com.swyp.team5.social.strategy.SocialLoginStrategy;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

// 소셜 계정 연동/해제 Service 단위 테스트.
@ExtendWith(MockitoExtension.class)
class SocialAccountServiceTest {

    @Mock
    private MemberRepository memberRepository;

    @Mock
    private SocialRepository socialRepository;

    @Mock
    private SocialLoginStrategy kakaoStrategy;

    private SocialAccountService service;

    @BeforeEach
    void setUp() {
        when(kakaoStrategy.provider()).thenReturn(SocialProvider.KAKAO);
        service = new SocialAccountService(memberRepository, socialRepository, List.of(kakaoStrategy));
    }

    // 연동 성공 - 새 소셜 계정 저장
    @Test
    void linkSavesNewSocialAccount() {
        Member member = localMember(1L);
        when(memberRepository.findById(1L)).thenReturn(Optional.of(member));
        when(kakaoStrategy.verify("code")).thenReturn(userInfo("kakao-1"));
        when(socialRepository.findByProviderAndProviderId(SocialProvider.KAKAO, "kakao-1"))
                .thenReturn(Optional.empty());
        when(socialRepository.findByMemberIdAndProvider(1L, SocialProvider.KAKAO))
                .thenReturn(Optional.empty());
        when(socialRepository.saveAndFlush(any(Social.class))).thenAnswer(invocation -> invocation.getArgument(0));

        SocialAccountResponse response = service.link(1L, SocialProvider.KAKAO, "code");

        assertThat(response.provider()).isEqualTo(SocialProvider.KAKAO);
    }

    // 내 계정에 이미 연동된 같은 소셜 계정이면 그대로 성공
    @Test
    void linkReturnsExistingWhenAlreadyLinkedToSameMember() {
        Member member = localMember(1L);
        when(memberRepository.findById(1L)).thenReturn(Optional.of(member));
        when(kakaoStrategy.verify("code")).thenReturn(userInfo("kakao-1"));
        when(socialRepository.findByProviderAndProviderId(SocialProvider.KAKAO, "kakao-1"))
                .thenReturn(Optional.of(Social.of(SocialProvider.KAKAO, "kakao-1", member)));

        SocialAccountResponse response = service.link(1L, SocialProvider.KAKAO, "code");

        assertThat(response.provider()).isEqualTo(SocialProvider.KAKAO);
        verify(socialRepository, never()).saveAndFlush(any());
    }

    // 다른 회원이 쓰는 소셜 계정이면 409
    @Test
    void linkFailsWhenUsedByOtherMember() {
        when(memberRepository.findById(1L)).thenReturn(Optional.of(localMember(1L)));
        when(kakaoStrategy.verify("code")).thenReturn(userInfo("kakao-1"));
        when(socialRepository.findByProviderAndProviderId(SocialProvider.KAKAO, "kakao-1"))
                .thenReturn(Optional.of(Social.of(SocialProvider.KAKAO, "kakao-1", localMember(2L))));

        assertThatThrownBy(() -> service.link(1L, SocialProvider.KAKAO, "code"))
                .isInstanceOf(SocialAccountAlreadyLinkedException.class);
    }

    // 같은 provider의 다른 계정이 이미 연동돼 있으면 409(provider당 1개)
    @Test
    void linkFailsWhenProviderAlreadyLinked() {
        Member member = localMember(1L);
        when(memberRepository.findById(1L)).thenReturn(Optional.of(member));
        when(kakaoStrategy.verify("code")).thenReturn(userInfo("kakao-2"));
        when(socialRepository.findByProviderAndProviderId(SocialProvider.KAKAO, "kakao-2"))
                .thenReturn(Optional.empty());
        when(socialRepository.findByMemberIdAndProvider(1L, SocialProvider.KAKAO))
                .thenReturn(Optional.of(Social.of(SocialProvider.KAKAO, "kakao-1", member)));

        assertThatThrownBy(() -> service.link(1L, SocialProvider.KAKAO, "code"))
                .isInstanceOf(SocialAccountAlreadyLinkedException.class);
    }

    // 해제 성공 - 비밀번호가 있으면 마지막 소셜도 해제 가능
    @Test
    void unlinkDeletesWhenMemberHasPassword() {
        Social social = Social.of(SocialProvider.KAKAO, "kakao-1", localMember(1L));
        when(socialRepository.findByMemberIdAndProvider(1L, SocialProvider.KAKAO))
                .thenReturn(Optional.of(social));

        service.unlink(1L, SocialProvider.KAKAO);

        verify(socialRepository).delete(social);
    }

    // 해제 성공 - 비밀번호가 없어도 다른 소셜이 남아 있으면 해제 가능
    @Test
    void unlinkDeletesWhenOtherSocialRemains() {
        Social social = Social.of(SocialProvider.KAKAO, "kakao-1", socialOnlyMember(1L));
        when(socialRepository.findByMemberIdAndProvider(1L, SocialProvider.KAKAO))
                .thenReturn(Optional.of(social));
        when(socialRepository.countByMemberId(1L)).thenReturn(2L);

        service.unlink(1L, SocialProvider.KAKAO);

        verify(socialRepository).delete(social);
    }

    // 해제 실패 - 비밀번호 없는 회원의 마지막 소셜이면 409
    @Test
    void unlinkFailsWhenLastLoginMethod() {
        Social social = Social.of(SocialProvider.KAKAO, "kakao-1", socialOnlyMember(1L));
        when(socialRepository.findByMemberIdAndProvider(1L, SocialProvider.KAKAO))
                .thenReturn(Optional.of(social));
        when(socialRepository.countByMemberId(1L)).thenReturn(1L);

        assertThatThrownBy(() -> service.unlink(1L, SocialProvider.KAKAO)).isInstanceOf(LastLoginMethodException.class);
        verify(socialRepository, never()).delete(any());
    }

    // 해제 실패 - 연동되지 않은 provider면 404
    @Test
    void unlinkFailsWhenNotLinked() {
        when(socialRepository.findByMemberIdAndProvider(1L, SocialProvider.KAKAO))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.unlink(1L, SocialProvider.KAKAO))
                .isInstanceOf(SocialAccountNotLinkedException.class);
    }

    private static SocialUserInfo userInfo(String providerId) {
        return new SocialUserInfo(providerId, "user@example.com", "홍길동", null);
    }

    private static Member localMember(Long id) {
        Member member = Member.ofLocalSignUp("user" + id + "@example.com", null, "encoded", "홍길동", "길동" + id, null);
        setField(member, "id", id);
        return member;
    }

    private static Member socialOnlyMember(Long id) {
        Member member = Member.ofSocialSignUp("user" + id + "@example.com", "홍길동", "길동" + id, null);
        setField(member, "id", id);
        return member;
    }

    private static void setField(Object target, String fieldName, Object value) {
        try {
            Field field = target.getClass().getDeclaredField(fieldName);
            field.setAccessible(true);
            field.set(target, value);
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException(e);
        }
    }
}
