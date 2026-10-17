package com.swyp.team5.auth.service;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.swyp.team5.auth.dto.AuthResult;
import com.swyp.team5.auth.dto.LoginRequest;
import com.swyp.team5.auth.dto.SignUpRequest;
import com.swyp.team5.auth.dto.SignUpResponse;
import com.swyp.team5.auth.dto.SocialLoginRequest;
import com.swyp.team5.auth.dto.SocialUserInfo;
import com.swyp.team5.auth.error.DuplicateEmailException;
import com.swyp.team5.auth.error.DuplicatePhoneException;
import com.swyp.team5.auth.error.InactiveMemberException;
import com.swyp.team5.auth.error.InvalidCredentialsException;
import com.swyp.team5.auth.error.InvalidTokenException;
import com.swyp.team5.auth.error.UnsupportedSocialProviderException;
import com.swyp.team5.common.passport.JwtTokenProvider;
import com.swyp.team5.member.entity.Member;
import com.swyp.team5.member.entity.MemberStatus;
import com.swyp.team5.member.repository.MemberRepository;
import com.swyp.team5.social.entity.Social;
import com.swyp.team5.social.entity.SocialProvider;
import com.swyp.team5.social.repository.SocialRepository;
import com.swyp.team5.social.strategy.SocialLoginStrategy;

@Service
public class AuthService {

    private final MemberRepository memberRepository;
    private final SocialRepository socialRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final RefreshTokenService refreshTokenService;
    private final Map<SocialProvider, SocialLoginStrategy> socialLoginStrategies;

    // 프로필 이미지 URL이 제공되지 않은 경우 null로 처리
    @Value("${member.default-profile-image-url:#{null}}")
    private String defaultProfileImageUrl;

    public AuthService(
            MemberRepository memberRepository,
            SocialRepository socialRepository,
            PasswordEncoder passwordEncoder,
            JwtTokenProvider jwtTokenProvider,
            RefreshTokenService refreshTokenService,
            List<SocialLoginStrategy> socialLoginStrategies) {
        this.memberRepository = memberRepository;
        this.socialRepository = socialRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenProvider = jwtTokenProvider;
        this.refreshTokenService = refreshTokenService;
        this.socialLoginStrategies = socialLoginStrategies.stream()
                .collect(Collectors.toMap(SocialLoginStrategy::provider, Function.identity()));
    }

    @Transactional
    public SignUpResponse signUp(SignUpRequest request) {
        String email = EmailNormalizer.normalize(request.email());
        if (memberRepository.existsByEmailAndStatusNot(email, MemberStatus.DELETED)) {
            throw new DuplicateEmailException(email);
        }
        if (request.phone() != null
                && memberRepository.existsByPhoneAndStatusNot(request.phone(), MemberStatus.DELETED)) {
            throw new DuplicatePhoneException(request.phone());
        }

        Member member = Member.ofLocalSignUp(
                email,
                request.phone(),
                passwordEncoder.encode(request.password()),
                request.name(),
                request.nickname(),
                defaultProfileImageUrl);
        Member saveMember = memberRepository.save(member);

        return new SignUpResponse(
                saveMember.getId(),
                saveMember.getEmail(),
                saveMember.getNickname(),
                saveMember.getName(),
                saveMember.getPhone(),
                saveMember.getRole(),
                saveMember.getStatus());
    }

    @Transactional(readOnly = true)
    public AuthResult login(LoginRequest request) {
        Member member = memberRepository
                .findByEmailAndStatusNot(EmailNormalizer.normalize(request.email()), MemberStatus.DELETED)
                .orElseThrow(InvalidCredentialsException::new);

        if (member.getPassword() == null || !passwordEncoder.matches(request.password(), member.getPassword())) {
            throw new InvalidCredentialsException();
        }

        return issueTokens(member);
    }

    @Transactional(readOnly = true)
    public AuthResult refresh(String refreshToken) {
        if (refreshToken == null || !jwtTokenProvider.isValidRefreshToken(refreshToken)) {
            throw new InvalidTokenException();
        }

        Long memberId = jwtTokenProvider.getMemberIdFromRefreshToken(refreshToken);
        if (!refreshTokenService.matches(memberId, refreshToken)) {
            throw new InvalidTokenException();
        }

        Member member = memberRepository.findById(memberId).orElseThrow(InvalidTokenException::new);
        return issueTokens(member);
    }

    @Transactional
    public AuthResult loginWithSocial(SocialLoginRequest request) {
        SocialProvider provider = request.provider();
        SocialLoginStrategy strategy = socialLoginStrategies.get(provider);
        if (strategy == null) {
            throw new UnsupportedSocialProviderException(provider.name());
        }
        SocialUserInfo userInfo = strategy.verify(request.token());

        Member member = socialRepository
                .findByProviderAndProviderId(provider, userInfo.providerId())
                .filter(social -> !releaseIfWithdrawn(social))
                .map(Social::getMember)
                .orElseGet(() -> linkOrCreateSocialMember(provider, userInfo));

        return issueTokens(member);
    }

    /**
     * 탈퇴한 회원의 소셜 연결이면 지워 같은 소셜 계정으로 다시 가입할 수 있게 한다(이메일 가입처럼 탈퇴 후 재가입 허용 — 정지 회원은
     * 그대로 막힌다). 같은 트랜잭션에서 새 연결을 저장하므로 (provider, provider_id) 유니크 제약에 걸리지 않게 삭제를 먼저 반영한다.
     *
     * @return 지웠으면 {@code true}(새 회원으로 가입시킨다)
     */
    private boolean releaseIfWithdrawn(Social social) {
        if (social.getMember().getStatus() != MemberStatus.DELETED) {
            return false;
        }
        socialRepository.delete(social);
        socialRepository.flush();
        return true;
    }

    public void logout(Long memberId) {
        refreshTokenService.delete(memberId);
    }

    @Transactional(readOnly = true)
    public boolean isEmailAvailable(String email) {
        return !memberRepository.existsByEmailAndStatusNot(EmailNormalizer.normalize(email), MemberStatus.DELETED);
    }

    // 이메일이 같은 기존 회원이 있으면 그 계정에 연결하고, 없으면 신규 가입
    private Member linkOrCreateSocialMember(SocialProvider provider, SocialUserInfo userInfo) {
        String email = EmailNormalizer.normalize(userInfo.email());
        Member member = memberRepository
                .findByEmailAndStatusNot(email, MemberStatus.DELETED)
                .orElseGet(() -> memberRepository.save(
                        Member.ofSocialSignUp(email, userInfo.name(), userInfo.name(), userInfo.profileImageUrl())));

        socialRepository.save(Social.of(provider, userInfo.providerId(), member));
        return member;
    }

    private AuthResult issueTokens(Member member) {
        if (member.getStatus() != MemberStatus.ACTIVE) {
            throw new InactiveMemberException(member.getStatus());
        }

        String accessToken = jwtTokenProvider.createAccessToken(member.getId(), member.getRole());
        String refreshToken = jwtTokenProvider.createRefreshToken(member.getId());
        refreshTokenService.save(member.getId(), refreshToken);
        return new AuthResult(accessToken, refreshToken);
    }
}
