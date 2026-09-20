package com.swyp.team5.auth.service;

import java.security.SecureRandom;
import java.util.Base64;
import java.util.Optional;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.swyp.team5.auth.config.PasswordResetProperties;
import com.swyp.team5.auth.error.InvalidPasswordResetTokenException;
import com.swyp.team5.member.entity.Member;
import com.swyp.team5.member.entity.MemberStatus;
import com.swyp.team5.member.repository.MemberRepository;

@Slf4j
@Service
@RequiredArgsConstructor
public class PasswordResetService {

    private static final String TOKEN_KEY_PREFIX = "passwordReset:";
    private static final String COOLDOWN_KEY_PREFIX = "passwordResetCooldown:";
    private static final int TOKEN_BYTES = 32;

    private final MemberRepository memberRepository;
    private final StringRedisTemplate redisTemplate;
    private final PasswordResetMailSender mailSender;
    private final PasswordResetProperties properties;
    private final PasswordEncoder passwordEncoder;
    private final RefreshTokenService refreshTokenService;
    private final SecureRandom random = new SecureRandom();

    @Transactional(readOnly = true)
    public void requestReset(String email) {
        if (!acquireCooldown(email)) {
            log.info("비밀번호 재설정 요청이 너무 잦아 건너뜁니다.");
            return;
        }

        Optional<Member> found = memberRepository.findByEmail(email);
        if (found.isEmpty()) {
            return;
        }

        Member member = found.get();
        if (member.getStatus() != MemberStatus.ACTIVE) {
            return;
        }
        if (member.getPassword() == null) {
            mailSender.sendSocialAccountNotice(email);
            return;
        }

        String token = issueToken(member.getId());
        mailSender.sendResetLink(email, token);
    }

    @Transactional
    public void confirmReset(String token, String newPassword) {
        String key = TOKEN_KEY_PREFIX + token;
        String memberId = redisTemplate.opsForValue().get(key);
        if (memberId == null) {
            throw new InvalidPasswordResetTokenException();
        }

        Member member =
                memberRepository.findById(Long.valueOf(memberId)).orElseThrow(InvalidPasswordResetTokenException::new);
        if (member.getStatus() != MemberStatus.ACTIVE) {
            throw new InvalidPasswordResetTokenException();
        }

        member.changePassword(passwordEncoder.encode(newPassword));
        redisTemplate.delete(key);
        refreshTokenService.delete(member.getId());
    }

    private boolean acquireCooldown(String email) {
        Boolean acquired =
                redisTemplate.opsForValue().setIfAbsent(COOLDOWN_KEY_PREFIX + email, "1", properties.cooldown());
        return Boolean.TRUE.equals(acquired);
    }

    private String issueToken(Long memberId) {
        byte[] bytes = new byte[TOKEN_BYTES];
        random.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);

        redisTemplate.opsForValue().set(TOKEN_KEY_PREFIX + token, String.valueOf(memberId), properties.tokenExpires());
        return token;
    }
}
