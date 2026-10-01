package com.swyp.team5.interest.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.lang.reflect.Field;
import java.time.LocalDateTime;
import java.util.List;

import com.swyp.team5.interest.entity.Interest;
import com.swyp.team5.interest.repository.InterestRepository;
import com.swyp.team5.member.entity.Member;
import com.swyp.team5.notification.service.NotificationService;
import com.swyp.team5.platform.entity.PlatformListing;
import com.swyp.team5.product.entity.Product;
import com.swyp.team5.product.entity.ProductStatus;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

// 목표가 도달 알림 Service 단위 테스트.
@ExtendWith(MockitoExtension.class)
class TargetPriceAlertServiceTest {

    @Mock
    private InterestRepository interestRepository;

    @Mock
    private NotificationService notificationService;

    private TargetPriceAlertService service() {
        return new TargetPriceAlertService(interestRepository, notificationService);
    }

    private static Product product(long price, ProductStatus status) {
        Product product = mock(Product.class);
        lenient().when(product.getPrice()).thenReturn(price);
        lenient().when(product.getStatus()).thenReturn(status);
        return product;
    }

    private static PlatformListing listing(long price, String status) {
        PlatformListing listing = mock(PlatformListing.class);
        lenient().when(listing.getPrice()).thenReturn(price);
        lenient().when(listing.getStatus()).thenReturn(status);
        return listing;
    }

    private static Interest interest(Interest interest, Long targetPrice, LocalDateTime notifiedAt) {
        setField(interest, "targetPrice", targetPrice);
        setField(interest, "notifiedAt", notifiedAt);
        return interest;
    }

    // 가격이 목표가 이하이고 아직 안 보냈으면 알림 + notified_at 기록
    @Test
    void notifiesWhenPriceReachesTarget() {
        Interest interest = interest(
                Interest.ofProduct(mock(Member.class), product(300_000L, ProductStatus.ON_SALE)), 300_000L, null);

        assertThat(service().check(interest)).isTrue();

        verify(notificationService).notifyTargetPriceReached(interest, 300_000L);
        assertThat(interest.getNotifiedAt()).isNotNull();
    }

    // 이미 보낸 도달이면 다시 보내지 않음
    @Test
    void doesNotNotifyTwice() {
        LocalDateTime notifiedAt = LocalDateTime.of(2026, 10, 1, 10, 0);
        Interest interest = interest(
                Interest.ofProduct(mock(Member.class), product(250_000L, ProductStatus.ON_SALE)), 300_000L, notifiedAt);

        assertThat(service().check(interest)).isFalse();

        verify(notificationService, never()).notifyTargetPriceReached(any(), anyLong());
        assertThat(interest.getNotifiedAt()).isEqualTo(notifiedAt);
    }

    // 가격이 다시 목표가보다 오르면 기록을 지워 다음 도달 때 다시 알림
    @Test
    void resetsNotifiedAtWhenPriceRisesAboveTarget() {
        Interest interest = interest(
                Interest.ofProduct(mock(Member.class), product(350_000L, ProductStatus.ON_SALE)),
                300_000L,
                LocalDateTime.now());

        assertThat(service().check(interest)).isFalse();

        assertThat(interest.getNotifiedAt()).isNull();
        verify(notificationService, never()).notifyTargetPriceReached(any(), anyLong());
    }

    // 판매 완료된 우리 상품은 확인하지 않음
    @Test
    void skipsSoldOutProduct() {
        Interest interest = interest(
                Interest.ofProduct(mock(Member.class), product(100_000L, ProductStatus.SOLD_OUT)), 300_000L, null);

        assertThat(service().check(interest)).isFalse();

        verify(notificationService, never()).notifyTargetPriceReached(any(), anyLong());
    }

    // 외부 매물은 수집가로 비교하고, 판매중이 아니면 확인하지 않음
    @Test
    void checksListingPriceOnlyWhileSelling() {
        Interest selling = interest(Interest.ofListing(mock(Member.class), listing(15_000L, "SELLING")), 20_000L, null);
        Interest soldOut =
                interest(Interest.ofListing(mock(Member.class), listing(15_000L, "SOLD_OUT")), 20_000L, null);

        assertThat(service().check(selling)).isTrue();
        assertThat(service().check(soldOut)).isFalse();

        verify(notificationService).notifyTargetPriceReached(selling, 15_000L);
        verify(notificationService, never()).notifyTargetPriceReached(soldOut, 15_000L);
    }

    // 배치 - 목표가가 설정된 관심상품 전체를 확인해 보낸 알림 수를 반환
    @Test
    void checkAllCountsSentNotifications() {
        Interest reached = interest(
                Interest.ofProduct(mock(Member.class), product(280_000L, ProductStatus.ON_SALE)), 300_000L, null);
        Interest notReached = interest(
                Interest.ofProduct(mock(Member.class), product(320_000L, ProductStatus.ON_SALE)), 300_000L, null);
        when(interestRepository.findAllWithTargetPrice()).thenReturn(List.of(reached, notReached));

        assertThat(service().checkAll()).isEqualTo(1);
    }

    private static void setField(Object target, String fieldName, Object value) {
        try {
            // 상속받은 필드(Item의 id·createdAt 등)도 찾도록 상위 클래스까지 검색
            Field field = org.springframework.util.ReflectionUtils.findField(target.getClass(), fieldName);
            field.setAccessible(true);
            field.set(target, value);
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException(e);
        }
    }
}
