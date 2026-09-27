package com.swyp.team5.notification.service;

import java.util.List;
import java.util.Objects;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.swyp.team5.interest.repository.InterestRepository;
import com.swyp.team5.member.entity.Member;
import com.swyp.team5.notification.dto.NotificationReadResponse;
import com.swyp.team5.notification.dto.NotificationResponse;
import com.swyp.team5.notification.entity.Notification;
import com.swyp.team5.notification.entity.NotificationType;
import com.swyp.team5.notification.error.NotificationNotFoundException;
import com.swyp.team5.notification.repository.NotificationRepository;
import com.swyp.team5.product.entity.Product;
import com.swyp.team5.productanalysis.entity.AnalysisRecommendation;

/**
 * 회원 알림 조회/읽음/삭제와, 시세 분석 추천 전환 시 알림 생성을 담당한다. 알림 생성 API는 없고 서버 내부
 * (시세 분석 스냅샷 저장 직후)에서만 만든다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final InterestRepository interestRepository;

    @Transactional(readOnly = true)
    public List<NotificationResponse> getNotifications(Long memberId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt", "id"));
        return notificationRepository.findByMemberId(memberId, pageable).stream()
                .map(NotificationResponse::from)
                .toList();
    }

    /**
     * @throws NotificationNotFoundException 없거나 본인 알림이 아닌 경우
     */
    public NotificationReadResponse markRead(Long memberId, Long notificationId) {
        Notification notification = getNotificationOrThrow(memberId, notificationId);
        notification.markRead();
        return NotificationReadResponse.from(notification);
    }

    /**
     * @throws NotificationNotFoundException 없거나 본인 알림이 아닌 경우
     */
    public void delete(Long memberId, Long notificationId) {
        notificationRepository.delete(getNotificationOrThrow(memberId, notificationId));
    }

    /**
     * 시세 분석 추천이 직전 스냅샷과 달라졌을 때만 알림을 만든다(같은 추천이 반복되면 재알림하지 않음, 첫 분석은
     * 직전 값이 없어 전환으로 본다). 목표가 설정 여부와 무관하다.
     * <ul>
     *   <li>SELL: 상품을 등록한 판매자에게
     *   <li>BUY: 이 상품을 관심 등록한 회원 전원에게
     *   <li>HOLD/WAIT: 알림 없음
     * </ul>
     *
     * @return 만든 알림 수
     */
    public int notifyRecommendationChanged(
            Product product, AnalysisRecommendation previous, AnalysisRecommendation current) {
        if (current == null || Objects.equals(previous, current)) {
            return 0;
        }
        List<Notification> notifications =
                switch (current) {
                    case SELL -> List.of(Notification.create(
                            product.getMember(),
                            product,
                            NotificationType.SELL,
                            "지금 팔기 좋은 시점이에요",
                            "등록하신 '%s'의 AI 시세 분석 결과, 지금 판매를 추천해요.".formatted(product.getTitle())));
                    case BUY -> interestRepository.findMembersByProductId(product.getId()).stream()
                            .map(member -> buyNotification(member, product))
                            .toList();
                    case HOLD, WAIT -> List.of();
                };
        notificationRepository.saveAll(notifications);
        if (!notifications.isEmpty()) {
            log.info("상품 {} 추천 {}→{} 알림 {}건 생성", product.getId(), previous, current, notifications.size());
        }
        return notifications.size();
    }

    private Notification buyNotification(Member member, Product product) {
        return Notification.create(
                member,
                product,
                NotificationType.BUY,
                "관심 상품을 사기 좋은 시점이에요",
                "관심 상품 '%s'의 AI 시세 분석 결과, 지금 구매를 추천해요.".formatted(product.getTitle()));
    }

    private Notification getNotificationOrThrow(Long memberId, Long notificationId) {
        return notificationRepository
                .findByIdAndMemberId(notificationId, memberId)
                .orElseThrow(NotificationNotFoundException::new);
    }
}
