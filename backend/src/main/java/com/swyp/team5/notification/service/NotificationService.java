package com.swyp.team5.notification.service;

import java.util.List;
import java.util.Objects;
import java.util.Set;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.swyp.team5.common.common.CursorPageResponse;
import com.swyp.team5.interest.entity.Interest;
import com.swyp.team5.interest.repository.InterestRepository;
import com.swyp.team5.member.entity.Member;
import com.swyp.team5.notification.dto.NotificationReadResponse;
import com.swyp.team5.notification.dto.NotificationResponse;
import com.swyp.team5.notification.dto.NotificationUnreadCountResponse;
import com.swyp.team5.notification.entity.Notification;
import com.swyp.team5.notification.entity.NotificationType;
import com.swyp.team5.notification.error.NotificationNotFoundException;
import com.swyp.team5.notification.repository.NotificationRepository;
import com.swyp.team5.notification.repository.NotificationSettingRepository;
import com.swyp.team5.platform.entity.PlatformListing;
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
    private final NotificationSettingRepository notificationSettingRepository;

    /**
     * 본인 알림 목록을 커서 기반으로 조회한다({@code id} 내림차순 = 최신순).
     *
     * @param cursor 이전 페이지 마지막 알림의 {@code notificationId}(선택, {@code null}이면 첫 페이지)
     * @return {@code hasNext}/{@code nextCursor}를 포함한 커서 페이지 응답
     */
    @Transactional(readOnly = true)
    public CursorPageResponse<NotificationResponse> getNotifications(Long memberId, Long cursor, int size) {
        Pageable pageable = PageRequest.of(0, size + 1, Sort.by(Sort.Direction.DESC, "id"));
        List<NotificationResponse> items =
                notificationRepository
                        .findByMemberIdAndIdLessThan(memberId, cursor == null ? Long.MAX_VALUE : cursor, pageable)
                        .stream()
                        .map(NotificationResponse::from)
                        .toList();
        CursorPageResponse<NotificationResponse> page =
                CursorPageResponse.of(items, size, NotificationResponse::notificationId);
        // 전체 건수는 첫 페이지에서만 센다
        return cursor == null ? page.withTotalCount(notificationRepository.countByMemberId(memberId)) : page;
    }

    /** 본인의 안 읽은 알림 수를 센다. */
    @Transactional(readOnly = true)
    public NotificationUnreadCountResponse getUnreadCount(Long memberId) {
        return new NotificationUnreadCountResponse(notificationRepository.countByMemberIdAndReadFalse(memberId));
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
     * 알림을 생성한다. 시세 분석 추천이 직전 스냅샷과 달라졌을 때만 알림을 만든다(같은 추천이 반복되면 재알림하지 않음, 첫 분석은
     * 직전 값이 없어 전환으로 본다). 목표가 설정 여부와 무관하다.
     * <ul>
     *   <li>SELL/HOLD(판매자 관점): 상품을 등록한 판매자에게만
     *   <li>BUY/WAIT(구매자 관점): 이 상품을 관심 등록한 회원 전원에게
     * </ul>
     * 시세 분석은 관점별로 이 메서드를 따로 호출한다(판매자 추천 전환, 구매자 추천 전환). 알림 설정에서 AI 추천 타이밍 알림을 끈
     * 회원은 받지 않는다.
     *
     * @return 만든 알림 수
     */
    public int notifyRecommendationChanged(
            Product product, AnalysisRecommendation previous, AnalysisRecommendation current) {
        if (current == null || Objects.equals(previous, current)) {
            return 0;
        }
        String title = product.getTitle();
        List<Notification> notifications =
                switch (current) {
                    case SELL -> ownerNotification(
                            product,
                            NotificationType.SELL,
                            new Content("지금 팔기 좋은 시점이에요", "등록하신 '%s'의 AI 시세 분석 결과, 지금 판매를 추천해요.".formatted(title)));
                    case HOLD -> ownerNotification(
                            product,
                            NotificationType.HOLD,
                            new Content(
                                    "조금 기다리면 더 비싸게 팔 수 있어요",
                                    "등록하신 '%s'의 시세가 오르고 있어요. 조금 기다렸다가 판매하길 추천해요.".formatted(title)));
                    case BUY -> interestedMemberNotifications(
                            product,
                            NotificationType.BUY,
                            new Content(
                                    "관심 상품을 사기 좋은 시점이에요", "관심 상품 '%s'의 AI 시세 분석 결과, 지금 구매를 추천해요.".formatted(title)));
                    case WAIT -> interestedMemberNotifications(
                            product,
                            NotificationType.WAIT,
                            new Content(
                                    "관심 상품은 조금 더 기다려 보세요",
                                    "관심 상품 '%s'의 AI 시세 분석 결과, 지금은 구매를 보류하길 추천해요.".formatted(title)));
                };
        notifications = withoutRecommendationDisabled(notifications);
        notificationRepository.saveAll(notifications);
        if (!notifications.isEmpty()) {
            log.info("상품 {} 추천 {}→{} 알림 {}건 생성", product.getId(), previous, current, notifications.size());
        }
        return notifications.size();
    }

    /**
     * 관심 등록된 외부 매물의 시세 분석 추천이 직전 스냅샷과 달라졌을 때 그 매물을 관심 등록한 회원 전원에게 알림을
     * 만든다(판매자가 우리 회원이 아니므로 구매자 관점 BUY/WAIT만). 전환 판단 규칙과 알림 설정 반영은 우리 상품과 같다.
     *
     * @return 만든 알림 수
     */
    public int notifyListingRecommendationChanged(
            PlatformListing listing, AnalysisRecommendation previous, AnalysisRecommendation current) {
        if (current == null || Objects.equals(previous, current)) {
            return 0;
        }
        String title = listing.getTitle();
        Content content =
                switch (current) {
                    case BUY -> new Content(
                            "관심 상품을 사기 좋은 시점이에요", "관심 상품 '%s'의 AI 시세 분석 결과, 지금 구매를 추천해요.".formatted(title));
                    case WAIT -> new Content(
                            "관심 상품은 조금 더 기다려 보세요", "관심 상품 '%s'의 AI 시세 분석 결과, 지금은 구매를 보류하길 추천해요.".formatted(title));
                    case SELL, HOLD -> null;
                };
        if (content == null) {
            return 0;
        }
        NotificationType type = current == AnalysisRecommendation.BUY ? NotificationType.BUY : NotificationType.WAIT;
        List<Notification> notifications =
                withoutRecommendationDisabled(interestRepository.findMembersByItemId(listing.getId()).stream()
                        .map(member -> Notification.createForListing(
                                member, listing, type, content.title(), content.message()))
                        .toList());
        notificationRepository.saveAll(notifications);
        if (!notifications.isEmpty()) {
            log.info("외부 매물 {} 추천 {}→{} 알림 {}건 생성", listing.getId(), previous, current, notifications.size());
        }
        return notifications.size();
    }

    /**
     * 관심상품 가격이 목표가 이하가 됐다고 관심 등록한 회원에게 알림을 만든다. 재알림 방지는 호출 측
     * ({@code TargetPriceAlertService})이 {@code interests.notified_at}으로 한다. 알림 설정에서 목표가 도달 알림을 끈 회원이면
     * 만들지 않는다.
     *
     * @return 알림을 만들었으면 {@code true}(알림을 끈 회원이면 {@code false})
     */
    public boolean notifyTargetPriceReached(Interest interest, long currentPrice) {
        if (notificationSettingRepository.existsByMemberIdAndTargetPriceEnabledFalse(
                interest.getMember().getId())) {
            log.info("관심상품 {} 목표가 도달 — 회원이 목표가 알림을 꺼서 알림을 만들지 않음", interest.getId());
            return false;
        }
        String title = "관심 상품이 목표가에 도달했어요";
        String message;
        Notification notification;
        if (interest.getProduct() != null) {
            message = targetPriceMessage(interest.getProduct().getTitle(), currentPrice, interest.getTargetPrice());
            notification = Notification.create(
                    interest.getMember(), interest.getProduct(), NotificationType.TARGET_PRICE, title, message);
        } else {
            message = targetPriceMessage(interest.getListing().getTitle(), currentPrice, interest.getTargetPrice());
            notification = Notification.createForListing(
                    interest.getMember(), interest.getListing(), NotificationType.TARGET_PRICE, title, message);
        }
        log.info("관심상품 {} 목표가 도달 알림 생성(현재가 {}, 목표가 {})", interest.getId(), currentPrice, interest.getTargetPrice());
        notificationRepository.save(notification);
        return true;
    }

    /**
     * 외부 플랫폼 연동 세션이 만료됐다고 회원에게 알림을 만든다. 만료로 바뀐 순간에만 호출해야 한다(재알림 방지는 호출 측).
     *
     * @return 알림을 만들었으면 true, 회원이 연동 만료 알림을 꺼서 만들지 않았으면 false
     */
    public boolean notifyPlatformExpired(Member member, String platformName) {
        if (notificationSettingRepository.existsByMemberIdAndPlatformExpiryEnabledFalse(member.getId())) {
            log.info("회원 {} {} 연동 만료 — 회원이 연동 만료 알림을 꺼서 알림을 만들지 않음", member.getId(), platformName);
            return false;
        }
        notificationRepository.save(Notification.createForMember(
                member,
                NotificationType.PLATFORM_EXPIRED,
                "%s 연동이 만료됐어요".formatted(platformName),
                "판매 상태를 계속 동기화하려면 연동 관리에서 %s 계정을 다시 연결해 주세요.".formatted(platformName)));
        log.info("회원 {} {} 연동 만료 알림 생성", member.getId(), platformName);
        return true;
    }

    private static String targetPriceMessage(String itemTitle, long currentPrice, long targetPrice) {
        return "관심 상품 '%s'의 가격이 %,d원으로 설정하신 목표가 %,d원 이하가 됐어요.".formatted(itemTitle, currentPrice, targetPrice);
    }

    /** 알림 설정에서 AI 추천 타이밍 알림을 끈 회원의 알림을 뺀다. */
    private List<Notification> withoutRecommendationDisabled(List<Notification> notifications) {
        if (notifications.isEmpty()) {
            return notifications;
        }
        Set<Long> disabled = notificationSettingRepository.findRecommendationDisabledMemberIds(notifications.stream()
                .map(notification -> notification.getMember().getId())
                .toList());
        if (disabled.isEmpty()) {
            return notifications;
        }
        return notifications.stream()
                .filter(notification ->
                        !disabled.contains(notification.getMember().getId()))
                .toList();
    }

    /** 알림 제목/본문. */
    private record Content(String title, String message) {}

    /** 판매자 1건 + 관심 등록 회원 전원(판매자 본인이 관심 등록했어도 판매자용 알림만). */
    private List<Notification> ownerNotification(Product product, NotificationType type, Content content) {
        return List.of(Notification.create(product.getMember(), product, type, content.title(), content.message()));
    }

    private List<Notification> interestedMemberNotifications(Product product, NotificationType type, Content content) {
        return interestRepository.findMembersByItemId(product.getId()).stream()
                .map(member -> Notification.create(member, product, type, content.title(), content.message()))
                .toList();
    }

    private Notification getNotificationOrThrow(Long memberId, Long notificationId) {
        return notificationRepository
                .findByIdAndMemberId(notificationId, memberId)
                .orElseThrow(NotificationNotFoundException::new);
    }
}
