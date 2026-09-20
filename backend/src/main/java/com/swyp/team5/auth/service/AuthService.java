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
        if (memberRepository.existsByEmail(request.email())) {
            throw new DuplicateEmailException(request.email());
        }
        if (request.phone() != null && memberRepository.existsByPhone(request.phone())) {
            throw new DuplicatePhoneException(request.phone());
        }

        Member member = Member.ofLocalSignUp(
                request.email(),
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
        Member member = memberRepository.findByEmail(request.email()).orElseThrow(InvalidCredentialsException::new);

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
                .map(Social::getMember)
                .orElseGet(() -> linkOrCreateSocialMember(provider, userInfo));

        return issueTokens(member);
    }

    public void logout(Long memberId) {
        refreshTokenService.delete(memberId);
    }

    @Transactional(readOnly = true)
    public boolean isEmailAvailable(String email) {
        return !memberRepository.existsByEmail(email);
    }

    // 이메일이 같은 기존 회원이 있으면 그 계정에 연결하고, 없으면 신규 가입
    private Member linkOrCreateSocialMember(SocialProvider provider, SocialUserInfo userInfo) {
        Member member = memberRepository
                .findByEmail(userInfo.email())
                .orElseGet(() -> memberRepository.save(Member.ofSocialSignUp(
                        userInfo.email(), userInfo.name(), userInfo.name(), userInfo.profileImageUrl())));

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
