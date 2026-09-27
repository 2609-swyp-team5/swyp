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

    @SuppressWarnings("unchecked")
    private List<Notification> savedNotifications() {
        ArgumentCaptor<List<Notification>> captor = ArgumentCaptor.forClass(List.class);
        verify(notificationRepository).saveAll(captor.capture());
        return captor.getValue();
    }

    // SELL로 바뀌면 판매자에게 판매 추천 알림
    @Test
    void notifiesOwnerWhenRecommendationBecomesSell() {
        Member owner = mock(Member.class);

        int count = service()
                .notifyRecommendationChanged(product(owner), AnalysisRecommendation.HOLD, AnalysisRecommendation.SELL);

        List<Notification> saved = savedNotifications();
        assertThat(count).isEqualTo(1);
        assertThat(saved).singleElement().satisfies(n -> {
            assertThat(n.getMember()).isSameAs(owner);
            assertThat(n.getType()).isEqualTo(NotificationType.SELL);
            assertThat(n.getMessage()).contains("아이패드 프로");
            assertThat(n.isRead()).isFalse();
        });
    }

    // BUY로 바뀌면 관심 등록한 회원 전원에게 구매 추천 알림
    @Test
    void notifiesInterestedMembersWhenRecommendationBecomesBuy() {
        Member buyer1 = mock(Member.class);
        Member buyer2 = mock(Member.class);
        Product product = product(mock(Member.class));
        when(interestRepository.findMembersByProductId(1L)).thenReturn(List.of(buyer1, buyer2));

        int count =
                service().notifyRecommendationChanged(product, AnalysisRecommendation.WAIT, AnalysisRecommendation.BUY);

        assertThat(count).isEqualTo(2);
        assertThat(savedNotifications())
                .extracting(Notification::getMember, Notification::getType)
                .containsExactly(tuple(buyer1, NotificationType.BUY), tuple(buyer2, NotificationType.BUY));
    }

    // 첫 분석(직전 없음)도 전환으로 보고 알림
    @Test
    void notifiesOnFirstAnalysis() {
        int count =
                service().notifyRecommendationChanged(product(mock(Member.class)), null, AnalysisRecommendation.SELL);

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

    // HOLD/WAIT로 바뀌면 알림 없음
    @Test
    void doesNotNotifyForHoldOrWait() {
        Product product = mock(Product.class);

        assertThat(service()
                        .notifyRecommendationChanged(product, AnalysisRecommendation.SELL, AnalysisRecommendation.HOLD))
                .isZero();
        assertThat(service()
                        .notifyRecommendationChanged(product, AnalysisRecommendation.BUY, AnalysisRecommendation.WAIT))
                .isZero();
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
