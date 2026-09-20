package com.swyp.team5.auth.service;

import lombok.extern.slf4j.Slf4j;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;

import com.swyp.team5.auth.config.PasswordResetProperties;

@Slf4j
@Component
public class PasswordResetMailSender {

    private static final String RESET_SUBJECT = "[지금이니?] 비밀번호 재설정 안내";
    private static final String SOCIAL_SUBJECT = "[지금이니?] 소셜 로그인으로 가입된 계정입니다";

    private final ObjectProvider<JavaMailSender> mailSender;
    private final PasswordResetProperties properties;
    private final String mailHost;

    public PasswordResetMailSender(
            ObjectProvider<JavaMailSender> mailSender,
            PasswordResetProperties properties,
            @Value("${spring.mail.host:}") String mailHost) {
        this.mailSender = mailSender;
        this.properties = properties;
        this.mailHost = mailHost;
    }

    public void sendResetLink(String email, String token) {
        String link = "%s?token=%s".formatted(properties.resetUrl(), token);
        String body =
                """
                안녕하세요, 지금이니? 입니다.

                아래 링크에서 비밀번호를 새로 설정해 주세요.
                %s

                이 링크는 %d분 동안만 사용할 수 있습니다.
                본인이 요청한 것이 아니라면 이 메일을 무시하셔도 됩니다."""
                        .formatted(link, properties.tokenExpires().toMinutes());

        send(email, RESET_SUBJECT, body);
    }

    public void sendSocialAccountNotice(String email) {
        String body =
                """
                안녕하세요, 지금이니? 입니다.

                이 계정은 소셜 로그인으로 가입되어 비밀번호가 없습니다.
                가입할 때 사용하신 소셜 계정(구글·카카오·네이버)으로 로그인해 주세요.

                본인이 요청한 것이 아니라면 이 메일을 무시하셔도 됩니다.""";

        send(email, SOCIAL_SUBJECT, body);
    }

    private void send(String to, String subject, String body) {
        JavaMailSender sender = mailSender.getIfAvailable();
        if (sender == null || mailHost.isBlank()) {
            log.warn("메일 설정이 없어 발송하지 않습니다. to={}, subject={}\n{}", to, subject, body);
            return;
        }

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(properties.from());
        message.setTo(to);
        message.setSubject(subject);
        message.setText(body);
        try {
            sender.send(message);
        } catch (RuntimeException e) {
            log.error("비밀번호 재설정 메일 발송에 실패했습니다. to={}", to, e);
        }
    }
}
