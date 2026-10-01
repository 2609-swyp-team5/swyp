package com.swyp.team5.notification.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.tuple;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import com.swyp.team5.interest.repository.InterestRepository;
import com.swyp.team5.member.entity.Member;
import com.swyp.team5.notification.entity.Notification;
import com.swyp.team5.notification.entity.NotificationType;
import com.swyp.team5.notification.error.NotificationNotFoundException;
import com.swyp.team5.notification.repository.NotificationRepository;
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

    private NotificationService service() {
        return new NotificationService(notificationRepository, interestRepository);
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

    // SELL로 바뀌면 판매자와 관심 등록 회원 모두에게 판매 추천 알림(문구는 각자 관점)
    @Test
    void notifiesOwnerAndInterestedMembersWhenRecommendationBecomesSell() {
        Member owner = member(10L);
        Member buyer = member(20L);
        when(interestRepository.findMembersByItemId(1L)).thenReturn(List.of(buyer));

        int count = service()
                .notifyRecommendationChanged(product(owner), AnalysisRecommendation.HOLD, AnalysisRecommendation.SELL);

        List<Notification> saved = savedNotifications();
        assertThat(count).isEqualTo(2);
        assertThat(saved)
                .extracting(Notification::getMember, Notification::getType)
                .containsExactly(tuple(owner, NotificationType.SELL), tuple(buyer, NotificationType.SELL));
        assertThat(saved.get(0).getMessage()).contains("등록하신 '아이패드 프로'", "판매를 추천");
        assertThat(saved.get(1).getMessage()).contains("관심 상품 '아이패드 프로'", "곧 거래될 수 있어요");
        assertThat(saved).allSatisfy(n -> assertThat(n.isRead()).isFalse());
    }

    // 판매자가 자기 상품을 관심 등록해 뒀어도 판매자용 알림 1건만
    @Test
    void doesNotDuplicateOwnerWhoIsAlsoInterested() {
        Member owner = member(10L);
        Member buyer = member(20L);
        when(interestRepository.findMembersByItemId(1L)).thenReturn(List.of(owner, buyer));

        int count = service()
                .notifyRecommendationChanged(product(owner), AnalysisRecommendation.HOLD, AnalysisRecommendation.SELL);

        assertThat(count).isEqualTo(2);
        assertThat(savedNotifications()).extracting(Notification::getMember).containsExactly(owner, buyer);
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

    // HOLD로 바뀌면 판매자와 관심 등록 회원 모두에게 보류 알림(문구는 각자 관점)
    @Test
    void notifiesOwnerAndInterestedMembersWhenRecommendationBecomesHold() {
        Member owner = member(10L);
        Member buyer = member(20L);
        when(interestRepository.findMembersByItemId(1L)).thenReturn(List.of(buyer));

        int count = service()
                .notifyRecommendationChanged(product(owner), AnalysisRecommendation.SELL, AnalysisRecommendation.HOLD);

        List<Notification> saved = savedNotifications();
        assertThat(count).isEqualTo(2);
        assertThat(saved)
                .extracting(Notification::getMember, Notification::getType)
                .containsExactly(tuple(owner, NotificationType.HOLD), tuple(buyer, NotificationType.HOLD));
        assertThat(saved.get(0).getMessage()).contains("판매를 보류");
        assertThat(saved.get(1).getMessage()).contains("관심 상품 '아이패드 프로'");
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
}
