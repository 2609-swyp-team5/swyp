package com.swyp.team5.social.service;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.swyp.team5.auth.dto.SocialUserInfo;
import com.swyp.team5.auth.error.InvalidSocialTokenException;
import com.swyp.team5.auth.error.UnsupportedSocialProviderException;
import com.swyp.team5.member.entity.Member;
import com.swyp.team5.member.error.MemberNotFoundException;
import com.swyp.team5.member.repository.MemberRepository;
import com.swyp.team5.social.dto.SocialAccountResponse;
import com.swyp.team5.social.entity.Social;
import com.swyp.team5.social.entity.SocialProvider;
import com.swyp.team5.social.error.LastLoginMethodException;
import com.swyp.team5.social.error.SocialAccountAlreadyLinkedException;
import com.swyp.team5.social.error.SocialAccountNotLinkedException;
import com.swyp.team5.social.repository.SocialRepository;
import com.swyp.team5.social.strategy.SocialLoginStrategy;

/**
 * 로그인한 회원에게 소셜 계정을 연동·해제한다. 토큰 검증은 소셜 로그인과 같은 {@link SocialLoginStrategy}를 쓴다.
 *
 * <ul>
 *   <li>회원당 provider별로 소셜 계정 1개만 연동할 수 있다.
 *   <li>다른 회원이 이미 쓰는 소셜 계정은 연동할 수 없다. 내 계정에 이미 연동된 같은 계정이면 그대로 성공한다.
 *   <li>비밀번호가 없는 회원(소셜 전용 가입)의 마지막 소셜 계정은 해제할 수 없다(로그인 수단이 사라지므로).
 * </ul>
 */
@Service
@Transactional
public class SocialAccountService {

    private final MemberRepository memberRepository;
    private final SocialRepository socialRepository;
    private final Map<SocialProvider, SocialLoginStrategy> socialLoginStrategies;

    public SocialAccountService(
            MemberRepository memberRepository,
            SocialRepository socialRepository,
            List<SocialLoginStrategy> socialLoginStrategies) {
        this.memberRepository = memberRepository;
        this.socialRepository = socialRepository;
        this.socialLoginStrategies = socialLoginStrategies.stream()
                .collect(Collectors.toMap(SocialLoginStrategy::provider, Function.identity()));
    }

    /** 연동된 소셜 계정 목록을 연동한 순서대로 조회한다. */
    @Transactional(readOnly = true)
    public List<SocialAccountResponse> getSocialAccounts(Long memberId) {
        return socialRepository.findAllByMemberIdOrderByCreatedAtAsc(memberId).stream()
                .map(SocialAccountResponse::from)
                .toList();
    }

    /**
     * @throws UnsupportedSocialProviderException 지원하지 않는 provider인 경우
     * @throws InvalidSocialTokenException 소셜 토큰(인가 코드) 검증에 실패한 경우
     * @throws SocialAccountAlreadyLinkedException 다른 회원이 쓰는 소셜 계정이거나, 이미 같은 provider를 연동한 경우
     */
    public SocialAccountResponse link(Long memberId, SocialProvider provider, String token) {
        Member member = memberRepository.findById(memberId).orElseThrow(() -> new MemberNotFoundException(memberId));
        SocialLoginStrategy strategy = socialLoginStrategies.get(provider);
        if (strategy == null) {
            throw new UnsupportedSocialProviderException(provider.name());
        }
        SocialUserInfo userInfo = strategy.verify(token);

        Social existing = socialRepository
                .findByProviderAndProviderId(provider, userInfo.providerId())
                .orElse(null);
        if (existing != null) {
            if (existing.getMember().getId().equals(memberId)) {
                return SocialAccountResponse.from(existing);
            }
            throw new SocialAccountAlreadyLinkedException(memberId, provider, "다른 회원이 사용 중");
        }
        if (socialRepository.findByMemberIdAndProvider(memberId, provider).isPresent()) {
            throw new SocialAccountAlreadyLinkedException(memberId, provider, "같은 provider 연동됨");
        }
        try {
            return SocialAccountResponse.from(
                    socialRepository.saveAndFlush(Social.of(provider, userInfo.providerId(), member)));
        } catch (DataIntegrityViolationException e) {
            // 같은 소셜 계정을 동시에 연동한 경우(provider, provider_id 유니크)
            throw new SocialAccountAlreadyLinkedException(memberId, provider, "동시 연동");
        }
    }

    /**
     * @throws SocialAccountNotLinkedException 해당 provider가 연동되어 있지 않은 경우
     * @throws LastLoginMethodException 비밀번호 없이 이 소셜 계정만으로 로그인하는 회원인 경우
     */
    public void unlink(Long memberId, SocialProvider provider) {
        Social social = socialRepository
                .findByMemberIdAndProvider(memberId, provider)
                .orElseThrow(() -> new SocialAccountNotLinkedException(memberId, provider));
        boolean hasPassword = social.getMember().getPassword() != null;
        if (!hasPassword && socialRepository.countByMemberId(memberId) <= 1) {
            throw new LastLoginMethodException(memberId, provider);
        }
        socialRepository.delete(social);
    }
}
