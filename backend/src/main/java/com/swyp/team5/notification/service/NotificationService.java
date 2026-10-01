package com.swyp.team5.notification.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

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
import com.swyp.team5.notification.entity.Notification;
import com.swyp.team5.notification.entity.NotificationType;
import com.swyp.team5.notification.error.NotificationNotFoundException;
import com.swyp.team5.notification.repository.NotificationRepository;
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
        return CursorPageResponse.of(items, size, NotificationResponse::notificationId);
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
     *   <li>SELL/HOLD: 상품을 등록한 판매자와, 이 상품을 관심 등록한 회원 전원에게(각자 관점의 문구로)
     *   <li>BUY/WAIT: 이 상품을 관심 등록한 회원 전원에게
     * </ul>
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
                    case SELL -> ownerAndInterestedMemberNotifications(
                            product,
                            NotificationType.SELL,
                            new Content("지금 팔기 좋은 시점이에요", "등록하신 '%s'의 AI 시세 분석 결과, 지금 판매를 추천해요.".formatted(title)),
                            new Content(
                                    "관심 상품이 곧 팔릴 수 있어요",
                                    "관심 상품 '%s'의 AI 시세 분석 결과, 판매하기 좋은 시점이라 곧 거래될 수 있어요.".formatted(title)));
                    case HOLD -> ownerAndInterestedMemberNotifications(
                            product,
                            NotificationType.HOLD,
                            new Content("판매를 잠시 미뤄 보세요", "등록하신 '%s'의 AI 시세 분석 결과, 지금은 판매를 보류하길 추천해요.".formatted(title)),
                            new Content(
                                    "관심 상품 시세를 지켜보세요",
                                    "관심 상품 '%s'의 AI 시세 분석 결과, 지금은 시세를 좀 더 지켜보길 추천해요.".formatted(title)));
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
        notificationRepository.saveAll(notifications);
        if (!notifications.isEmpty()) {
            log.info("상품 {} 추천 {}→{} 알림 {}건 생성", product.getId(), previous, current, notifications.size());
        }
        return notifications.size();
    }

    /**
     * 관심 등록된 외부 매물의 시세 분석 추천이 직전 스냅샷과 달라졌을 때 그 매물을 관심 등록한 회원 전원에게 알림을
     * 만든다(판매자가 우리 회원이 아니므로 구매자 관점 BUY/WAIT만). 전환 판단 규칙은 우리 상품과 같다.
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
        List<Notification> notifications = interestRepository.findMembersByItemId(listing.getId()).stream()
                .map(member -> Notification.createForListing(member, listing, type, content.title(), content.message()))
                .toList();
        notificationRepository.saveAll(notifications);
        if (!notifications.isEmpty()) {
            log.info("외부 매물 {} 추천 {}→{} 알림 {}건 생성", listing.getId(), previous, current, notifications.size());
        }
        return notifications.size();
    }

    /**
     * 관심상품 가격이 목표가 이하가 됐다고 관심 등록한 회원에게 알림을 만든다. 재알림 방지는 호출 측
     * ({@code TargetPriceAlertService})이 {@code interests.notified_at}으로 한다.
     */
    public Notification notifyTargetPriceReached(Interest interest, long currentPrice) {
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
        return notificationRepository.save(notification);
    }

    private static String targetPriceMessage(String itemTitle, long currentPrice, long targetPrice) {
        return "관심 상품 '%s'의 가격이 %,d원으로 설정하신 목표가 %,d원 이하가 됐어요.".formatted(itemTitle, currentPrice, targetPrice);
    }

    /** 알림 제목/본문. */
    private record Content(String title, String message) {}

    /** 판매자 1건 + 관심 등록 회원 전원(판매자 본인이 관심 등록했어도 판매자용 알림만). */
    private List<Notification> ownerAndInterestedMemberNotifications(
            Product product, NotificationType type, Content forOwner, Content forInterestedMembers) {
        Member owner = product.getMember();
        List<Notification> notifications = new ArrayList<>();
        notifications.add(Notification.create(owner, product, type, forOwner.title(), forOwner.message()));
        interestRepository.findMembersByItemId(product.getId()).stream()
                .filter(member -> !Objects.equals(member.getId(), owner.getId()))
                .map(member -> Notification.create(
                        member, product, type, forInterestedMembers.title(), forInterestedMembers.message()))
                .forEach(notifications::add);
        return notifications;
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
