package com.swyp.team5.admin.config;

import java.util.List;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.swyp.team5.member.entity.Member;
import com.swyp.team5.member.entity.MemberRole;
import com.swyp.team5.member.repository.MemberRepository;

/**
 * 기동할 때 {@code admin.emails}에 지정된 회원을 ADMIN으로 승격한다.
 *
 * <p>승격 API를 따로 두면 그 API 자체를 누가 호출할 것인가라는 문제가 남으므로, 최초 관리자는 배포 환경의
 * 설정으로만 정한다. 목록이 비어 있으면(기본값) 아무 것도 하지 않으므로 설정하지 않은 환경에는 영향이 없다.
 *
 * <p>강등은 하지 않는다. 목록에서 이메일을 빼도 이미 ADMIN이 된 회원은 그대로 남는다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AdminAccountInitializer implements ApplicationRunner {

    private final AdminProperties properties;

    private final MemberRepository memberRepository;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        List<String> emails = properties.emails();
        if (emails.isEmpty()) {
            return;
        }

        for (String email : emails) {
            memberRepository
                    .findByEmail(email.trim())
                    .ifPresentOrElse(this::promote, () -> log.warn("관리자로 지정할 회원을 찾지 못해 건너뜁니다. 해당 이메일로 먼저 가입해야 합니다."));
        }
    }

    private void promote(Member member) {
        if (member.getRole() == MemberRole.ADMIN) {
            return;
        }
        member.changeRole(MemberRole.ADMIN);
        log.info("회원을 관리자로 승격했습니다. memberId={}", member.getId());
    }
}
