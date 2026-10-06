package com.swyp.team5.notification.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.tuple;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import com.swyp.team5.interest.entity.Interest;
import com.swyp.team5.interest.repository.InterestRepository;
import com.swyp.team5.member.entity.Member;
import com.swyp.team5.notification.entity.Notification;
import com.swyp.team5.notification.entity.NotificationType;
import com.swyp.team5.notification.error.NotificationNotFoundException;
import com.swyp.team5.notification.repository.NotificationRepository;
import com.swyp.team5.notification.repository.NotificationSettingRepository;
import com.swyp.team5.platform.entity.PlatformListing;
import com.swyp.team5.product.entity.Product;
import com.swyp.team5.productanalysis.entity.AnalysisRecommendation;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

// 알림 Service 단위 테스트 - 추천 전환 알림 생성 규칙과 읽음/삭제 권한.
@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock
    private NotificationRepository notificationRepository;

    @Mock
    private InterestRepository interestRepository;

    @Mock
    private NotificationSettingRepository notificationSettingRepository;

    private NotificationService service() {
        return new NotificationService(notificationRepository, interestRepository, notificationSettingRepository);
    }

    private static Product product(Member owner) {
        Product product = mock(Product.class);
        when(product.getTitle()).thenReturn("아이패드 프로");
        lenient().when(product.getId()).thenReturn(1L);
        lenient().when(product.getMember()).thenReturn(owner);
        return product;
    }

    private static Member member(Long id) {
        Member member = mock(Member.class);
        lenient().when(member.getId()).thenReturn(id);
        return member;
    }

    @SuppressWarnings("unchecked")
    private List<Notification> savedNotifications() {
        ArgumentCaptor<List<Notification>> captor = ArgumentCaptor.forClass(List.class);
        verify(notificationRepository).saveAll(captor.capture());
        return captor.getValue();
    }

    // SELL로 바뀌면 판매자에게만 판매 추천 알림(관심 등록 회원은 구매자 관점 BUY/WAIT로 따로 받음)
    @Test
    void notifiesOnlyOwnerWhenRecommendationBecomesSell() {
        Member owner = member(10L);

        int count = service()
                .notifyRecommendationChanged(product(owner), AnalysisRecommendation.HOLD, AnalysisRecommendation.SELL);

        List<Notification> saved = savedNotifications();
        assertThat(count).isEqualTo(1);
        assertThat(saved)
                .extracting(Notification::getMember, Notification::getType)
                .containsExactly(tuple(owner, NotificationType.SELL));
        assertThat(saved.get(0).getMessage()).contains("등록하신 '아이패드 프로'", "판매를 추천");
        assertThat(saved).allSatisfy(n -> assertThat(n.isRead()).isFalse());
        verify(interestRepository, never()).findMembersByItemId(any());
    }

    // BUY로 바뀌면 관심 등록한 회원 전원에게 구매 추천 알림
    @Test
    void notifiesInterestedMembersWhenRecommendationBecomesBuy() {
        Member buyer1 = mock(Member.class);
        Member buyer2 = mock(Member.class);
        Product product = product(mock(Member.class));
        when(interestRepository.findMembersByItemId(1L)).thenReturn(List.of(buyer1, buyer2));

        int count =
                service().notifyRecommendationChanged(product, AnalysisRecommendation.WAIT, AnalysisRecommendation.BUY);

        assertThat(count).isEqualTo(2);
        assertThat(savedNotifications())
                .extracting(Notification::getMember, Notification::getType)
                .containsExactly(tuple(buyer1, NotificationType.BUY), tuple(buyer2, NotificationType.BUY));
    }

    // 첫 분석(직전 없음)도 전환으로 보고 알림(관심 등록 회원이 없으면 판매자 1건)
    @Test
    void notifiesOnFirstAnalysis() {
        int count = service().notifyRecommendationChanged(product(member(10L)), null, AnalysisRecommendation.SELL);

        assertThat(count).isEqualTo(1);
    }

    // 직전과 같은 추천이면 재알림하지 않음
    @Test
    void doesNotNotifyWhenRecommendationUnchanged() {
        Product product = mock(Product.class);

        int count = service()
                .notifyRecommendationChanged(product, AnalysisRecommendation.SELL, AnalysisRecommendation.SELL);

        assertThat(count).isZero();
        verify(notificationRepository, never()).saveAll(anyList());
    }

    // HOLD로 바뀌면 판매자에게만 "기다리면 더 비싸게 팔 수 있다"는 보류 알림
    @Test
    void notifiesOnlyOwnerWhenRecommendationBecomesHold() {
        Member owner = member(10L);

        int count = service()
                .notifyRecommendationChanged(product(owner), AnalysisRecommendation.SELL, AnalysisRecommendation.HOLD);

        List<Notification> saved = savedNotifications();
        assertThat(count).isEqualTo(1);
        assertThat(saved)
                .extracting(Notification::getMember, Notification::getType)
                .containsExactly(tuple(owner, NotificationType.HOLD));
        assertThat(saved.get(0).getTitle()).contains("더 비싸게 팔 수 있어요");
    }

    // WAIT로 바뀌면 관심 등록한 회원 전원에게 구매 보류 알림
    @Test
    void notifiesInterestedMembersWhenRecommendationBecomesWait() {
        Member buyer1 = mock(Member.class);
        Member buyer2 = mock(Member.class);
        Product product = product(mock(Member.class));
        when(interestRepository.findMembersByItemId(1L)).thenReturn(List.of(buyer1, buyer2));

        int count =
                service().notifyRecommendationChanged(product, AnalysisRecommendation.BUY, AnalysisRecommendation.WAIT);

        assertThat(count).isEqualTo(2);
        assertThat(savedNotifications())
                .extracting(Notification::getMember, Notification::getType)
                .containsExactly(tuple(buyer1, NotificationType.WAIT), tuple(buyer2, NotificationType.WAIT));
    }

    // 관심 등록 회원이 없으면 WAIT/BUY 알림은 0건
    @Test
    void createsNoWaitNotificationWhenNoInterestedMembers() {
        when(interestRepository.findMembersByItemId(1L)).thenReturn(List.of());

        int count = service()
                .notifyRecommendationChanged(
                        product(mock(Member.class)), AnalysisRecommendation.HOLD, AnalysisRecommendation.WAIT);

        assertThat(count).isZero();
    }

    private static PlatformListing listing() {
        PlatformListing listing = mock(PlatformListing.class);
        lenient().when(listing.getId()).thenReturn(100L);
        lenient().when(listing.getTitle()).thenReturn("아이패드 프로");
        return listing;
    }

    // 관심 외부 매물이 BUY로 바뀌면 관심 등록 회원 전원에게 매물을 가리키는 구매 추천 알림
    @Test
    void notifiesListingInterestedMembersWhenRecommendationBecomesBuy() {
        Member buyer1 = member(2L);
        Member buyer2 = member(3L);
        PlatformListing listing = listing();
        when(interestRepository.findMembersByItemId(100L)).thenReturn(List.of(buyer1, buyer2));

        int count = service()
                .notifyListingRecommendationChanged(listing, AnalysisRecommendation.WAIT, AnalysisRecommendation.BUY);

        assertThat(count).isEqualTo(2);
        assertThat(savedNotifications())
                .extracting(
                        Notification::getMember,
                        Notification::getType,
                        Notification::getListing,
                        Notification::getProduct)
                .containsExactly(
                        tuple(buyer1, NotificationType.BUY, listing, null),
                        tuple(buyer2, NotificationType.BUY, listing, null));
    }

    // 관심 외부 매물 추천이 그대로면 알림 없음
    @Test
    void doesNotNotifyListingWhenRecommendationUnchanged() {
        int count = service()
                .notifyListingRecommendationChanged(
                        listing(), AnalysisRecommendation.WAIT, AnalysisRecommendation.WAIT);

        assertThat(count).isZero();
        verify(notificationRepository, never()).saveAll(anyList());
    }

    // 본인 알림이 아니면(또는 없으면) 404
    // 알림 설정에서 AI 추천 타이밍 알림을 끈 관심 회원은 구매 추천 알림을 받지 않음
    @Test
    void skipsMembersWhoDisabledRecommendationAlerts() {
        Member buyer1 = member(21L);
        Member buyer2 = member(22L);
        Product product = product(member(10L));
        when(interestRepository.findMembersByItemId(1L)).thenReturn(List.of(buyer1, buyer2));
        when(notificationSettingRepository.findRecommendationDisabledMemberIds(List.of(21L, 22L)))
                .thenReturn(Set.of(22L));

        int count =
                service().notifyRecommendationChanged(product, AnalysisRecommendation.WAIT, AnalysisRecommendation.BUY);

        assertThat(count).isEqualTo(1);
        assertThat(savedNotifications()).extracting(Notification::getMember).containsExactly(buyer1);
    }

    // 판매자가 AI 추천 타이밍 알림을 끄면 판매 추천 알림도 만들지 않음
    @Test
    void skipsOwnerWhoDisabledRecommendationAlerts() {
        when(notificationSettingRepository.findRecommendationDisabledMemberIds(List.of(10L)))
                .thenReturn(Set.of(10L));

        int count = service()
                .notifyRecommendationChanged(
                        product(member(10L)), AnalysisRecommendation.HOLD, AnalysisRecommendation.SELL);

        assertThat(count).isZero();
        assertThat(savedNotifications()).isEmpty();
    }

    // 목표가 도달 알림을 끈 회원이면 알림을 만들지 않고 false
    @Test
    void skipsTargetPriceAlertWhenDisabled() {
        Interest interest = mock(Interest.class);
        Member buyer = member(21L);
        when(interest.getMember()).thenReturn(buyer);
        when(notificationSettingRepository.existsByMemberIdAndTargetPriceEnabledFalse(21L))
                .thenReturn(true);

        assertThat(service().notifyTargetPriceReached(interest, 10_000L)).isFalse();

        verify(notificationRepository, never()).save(any());
    }

    // 목표가 도달 알림이 켜져 있으면(설정 행 없음 포함) 알림을 만들고 true
    @Test
    void createsTargetPriceAlertWhenEnabled() {
        Product product = product(member(10L));
        Member buyer = member(21L);
        Interest interest = mock(Interest.class);
        when(interest.getMember()).thenReturn(buyer);
        when(interest.getProduct()).thenReturn(product);
        when(interest.getTargetPrice()).thenReturn(12_000L);

        assertThat(service().notifyTargetPriceReached(interest, 10_000L)).isTrue();

        ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository).save(captor.capture());
        assertThat(captor.getValue().getType()).isEqualTo(NotificationType.TARGET_PRICE);
    }

    @Test
    void markReadFailsWhenNotOwnNotification() {
        when(notificationRepository.findByIdAndMemberId(5L, 2L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service().markRead(2L, 5L)).isInstanceOf(NotificationNotFoundException.class);
    }

    @Test
    void deleteFailsWhenNotOwnNotification() {
        when(notificationRepository.findByIdAndMemberId(5L, 2L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service().delete(2L, 5L)).isInstanceOf(NotificationNotFoundException.class);
        verify(notificationRepository, never()).delete(any());
    }

    // 연동 만료 알림이 켜져 있으면(설정 행 없음 포함) 상품 없는 PLATFORM_EXPIRED 알림을 만들고 true
    @Test
    void createsPlatformExpiredAlertWhenEnabled() {
        Member member = member(21L);

        assertThat(service().notifyPlatformExpired(member, "번개장터")).isTrue();

        ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository).save(captor.capture());
        Notification saved = captor.getValue();
        assertThat(saved.getType()).isEqualTo(NotificationType.PLATFORM_EXPIRED);
        assertThat(saved.getMember()).isEqualTo(member);
        assertThat(saved.getProduct()).isNull();
        assertThat(saved.getListing()).isNull();
        assertThat(saved.getTitle()).isEqualTo("번개장터 연동이 만료됐어요");
    }

    // 연동 만료 알림을 끈 회원이면 알림을 만들지 않고 false
    @Test
    void skipsPlatformExpiredAlertWhenDisabled() {
        Member member = member(21L);
        when(notificationSettingRepository.existsByMemberIdAndPlatformExpiryEnabledFalse(21L))
                .thenReturn(true);

        assertThat(service().notifyPlatformExpired(member, "번개장터")).isFalse();

        verify(notificationRepository, never()).save(any());
    }

    // 시세 변동 - 판매자에게 SELL_PRICE_CHANGE, 관심 등록 회원에게 BUY_PRICE_CHANGE(판매자 본인 관심 등록은 판매자용만)
    @Test
    void notifiesSellerAndInterestedMembersWhenPriceChanged() {
        Member seller = member(10L);
        Product product = product(seller);
        Member buyer = member(21L);
        when(interestRepository.findMembersByItemId(1L)).thenReturn(List.of(buyer, seller));

        assertThat(service().notifyPriceChanged(product, 300_000L, 330_000L, true, true))
                .isEqualTo(2);

        ArgumentCaptor<List<Notification>> captor = ArgumentCaptor.forClass(List.class);
        verify(notificationRepository).saveAll(captor.capture());
        assertThat(captor.getValue())
                .extracting(
                        n -> n.getMember().getId(),
                        Notification::getType,
                        Notification::getTitle,
                        Notification::getMessage)
                .containsExactly(
                        tuple(
                                10L,
                                NotificationType.SELL_PRICE_CHANGE,
                                "등록하신 상품의 시세가 올랐어요",
                                "등록하신 '아이패드 프로'의 평균 시세가 300,000원에서 330,000원으로 10.0% 올랐어요."),
                        tuple(
                                21L,
                                NotificationType.BUY_PRICE_CHANGE,
                                "관심 상품 시세가 올랐어요",
                                "관심 상품 '아이패드 프로'의 평균 시세가 300,000원에서 330,000원으로 10.0% 올랐어요."));
    }

    // 시세 변동 - 시세 변동 알림을 끈 회원과 오늘 이미 같은 대상 알림을 받은 회원은 제외, 판매자 대상이 아니면 판매자 제외
    @Test
    void skipsPriceChangeForDisabledOrAlreadyNotifiedMembers() {
        Member seller = member(10L);
        Product product = product(seller);
        Member disabled = member(21L);
        Member notifiedToday = member(22L);
        Member fresh = member(23L);
        when(interestRepository.findMembersByItemId(1L)).thenReturn(List.of(disabled, notifiedToday, fresh));
        when(notificationSettingRepository.findPriceChangeDisabledMemberIds(anyList()))
                .thenReturn(Set.of(21L));
        when(notificationRepository.findMemberIdsNotifiedSince(eq(1L), eq(NotificationType.BUY_PRICE_CHANGE), any()))
                .thenReturn(Set.of(22L));

        assertThat(service().notifyPriceChanged(product, 300_000L, 270_000L, false, true))
                .isEqualTo(1);

        ArgumentCaptor<List<Notification>> captor = ArgumentCaptor.forClass(List.class);
        verify(notificationRepository).saveAll(captor.capture());
        assertThat(captor.getValue())
                .extracting(n -> n.getMember().getId(), Notification::getTitle)
                .containsExactly(tuple(23L, "관심 상품 시세가 내렸어요"));
    }

    // 시세 변동 - 외부 매물은 관심 등록 회원에게만 BUY_PRICE_CHANGE
    @Test
    void notifiesInterestedMembersWhenListingPriceChanged() {
        PlatformListing listing = mock(PlatformListing.class);
        when(listing.getId()).thenReturn(100L);
        when(listing.getTitle()).thenReturn("갤럭시 S23");
        Member buyer = member(21L);
        when(interestRepository.findMembersByItemId(100L)).thenReturn(List.of(buyer));

        assertThat(service().notifyListingPriceChanged(listing, 500_000L, 470_000L))
                .isEqualTo(1);

        ArgumentCaptor<List<Notification>> captor = ArgumentCaptor.forClass(List.class);
        verify(notificationRepository).saveAll(captor.capture());
        assertThat(captor.getValue())
                .extracting(Notification::getType, Notification::getMessage)
                .containsExactly(tuple(
                        NotificationType.BUY_PRICE_CHANGE, "관심 상품 '갤럭시 S23'의 평균 시세가 500,000원에서 470,000원으로 6.0% 내렸어요."));
    }
}
