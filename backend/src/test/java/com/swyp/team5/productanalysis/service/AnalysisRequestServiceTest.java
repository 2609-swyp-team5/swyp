package com.swyp.team5.productanalysis.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.Optional;

import org.springframework.beans.factory.ObjectProvider;

import com.swyp.team5.item.entity.AnalysisSkipReason;
import com.swyp.team5.item.repository.ItemRepository;
import com.swyp.team5.platform.entity.PlatformListing;
import com.swyp.team5.product.entity.Product;
import com.swyp.team5.product.error.ProductNotFoundException;
import com.swyp.team5.productanalysis.config.ProductAnalysisProperties;
import com.swyp.team5.productanalysis.dto.AnalysisRequestResponse;
import com.swyp.team5.productanalysis.dto.AnalysisStatus;
import com.swyp.team5.productanalysis.entity.ProductAnalysis;
import com.swyp.team5.productanalysis.listener.InterestRegisteredAnalysisListener;
import com.swyp.team5.productanalysis.repository.ProductAnalysisRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

// 화면 분석 요청 단위 테스트 — 분석 상태 판단은 ProductAnalysisService 목으로 대신한다.
class AnalysisRequestServiceTest {

    private static final long ITEM_ID = 7L;

    private final ItemRepository itemRepository = mock(ItemRepository.class);
    private final ProductAnalysisRepository productAnalysisRepository = mock(ProductAnalysisRepository.class);
    private final ProductAnalysisService productAnalysisService = mock(ProductAnalysisService.class);
    private final InterestRegisteredAnalysisListener queue = mock(InterestRegisteredAnalysisListener.class);
    private final Product product = mock(Product.class);

    // interest-skip-hours 6
    private final ProductAnalysisProperties properties =
            new ProductAnalysisProperties(3, 24, 30, 0L, 6, null, null, null, 1, null);

    @BeforeEach
    void setUp() {
        lenient().when(product.getId()).thenReturn(ITEM_ID);
        lenient().when(itemRepository.findById(ITEM_ID)).thenReturn(Optional.of(product));
        lenient()
                .when(productAnalysisRepository.findFirstByItemIdOrderByAnalyzedAtDesc(ITEM_ID))
                .thenReturn(Optional.empty());
    }

    @SuppressWarnings("unchecked")
    private AnalysisRequestService service(InterestRegisteredAnalysisListener availableQueue) {
        ObjectProvider<InterestRegisteredAnalysisListener> provider = mock(ObjectProvider.class);
        when(provider.getIfAvailable()).thenReturn(availableQueue);
        return new AnalysisRequestService(
                itemRepository, productAnalysisRepository, productAnalysisService, properties, provider, 6, 10);
    }

    private void givenStatus(AnalysisStatus status) {
        when(productAnalysisService.analysisStatus(product, false)).thenReturn(status);
        lenient().when(productAnalysisService.analysisStatus(product, true)).thenReturn(status);
    }

    // 분석한 적 없으면 대기열에 넣고 ANALYZING
    @Test
    void enqueuesItemNeverAnalyzed() {
        givenStatus(AnalysisStatus.NOT_ANALYZED);

        AnalysisRequestResponse response = service(queue).request(ITEM_ID);

        assertThat(response.analysisStatus()).isEqualTo(AnalysisStatus.ANALYZING);
        verify(queue).enqueue(ITEM_ID, false);
    }

    // 이미 분석 중이거나 분석 대상 상태가 아니면 대기열에 넣지 않음
    @Test
    void doesNotEnqueueWhenAnalyzingOrUnavailable() {
        givenStatus(AnalysisStatus.ANALYZING);
        assertThat(service(queue).request(ITEM_ID).analysisStatus()).isEqualTo(AnalysisStatus.ANALYZING);

        givenStatus(AnalysisStatus.UNAVAILABLE);
        assertThat(service(queue).request(ITEM_ID).analysisStatus()).isEqualTo(AnalysisStatus.UNAVAILABLE);

        verify(queue, never()).enqueue(anyLong(), anyBoolean());
    }

    // 최근(interest-skip-hours 안) 분석 결과가 있으면 다시 분석하지 않고, 오래됐으면 다시 분석
    @Test
    void reanalyzesOnlyWhenLatestAnalysisIsOld() {
        ProductAnalysis recent = mock(ProductAnalysis.class);
        when(recent.getAnalyzedAt()).thenReturn(LocalDateTime.now().minusHours(1));
        when(productAnalysisRepository.findFirstByItemIdOrderByAnalyzedAtDesc(ITEM_ID))
                .thenReturn(Optional.of(recent));
        when(productAnalysisService.analysisStatus(product, true)).thenReturn(AnalysisStatus.ANALYZED);

        assertThat(service(queue).request(ITEM_ID).analysisStatus()).isEqualTo(AnalysisStatus.ANALYZED);
        verify(queue, never()).enqueue(anyLong(), anyBoolean());

        when(recent.getAnalyzedAt()).thenReturn(LocalDateTime.now().minusHours(7));
        assertThat(service(queue).request(ITEM_ID).analysisStatus()).isEqualTo(AnalysisStatus.ANALYZING);
        verify(queue).enqueue(ITEM_ID, false);
    }

    // 최근(request-retry-hours 안) 비교 매물 부족으로 건너뛰었으면 사유와 함께 SKIPPED, 오래됐으면 다시 분석
    @Test
    void retriesSkippedItemOnlyAfterRetryHours() {
        givenStatus(AnalysisStatus.SKIPPED);
        when(product.getAnalysisSkipReason()).thenReturn(AnalysisSkipReason.NOT_ENOUGH_CANDIDATES);
        when(product.getAnalysisSkippedAt()).thenReturn(LocalDateTime.now().minusHours(1));

        AnalysisRequestResponse skipped = service(queue).request(ITEM_ID);

        assertThat(skipped.analysisStatus()).isEqualTo(AnalysisStatus.SKIPPED);
        assertThat(skipped.analysisSkipReason()).isEqualTo(AnalysisSkipReason.NOT_ENOUGH_CANDIDATES);
        assertThat(skipped.analysisSkipMessage()).isEqualTo(AnalysisSkipReason.NOT_ENOUGH_CANDIDATES.getMessage());
        verify(queue, never()).enqueue(anyLong(), anyBoolean());

        when(product.getAnalysisSkippedAt()).thenReturn(LocalDateTime.now().minusHours(7));
        AnalysisRequestResponse retried = service(queue).request(ITEM_ID);

        assertThat(retried.analysisStatus()).isEqualTo(AnalysisStatus.ANALYZING);
        assertThat(retried.analysisSkipReason()).isNull();
        verify(queue).enqueue(ITEM_ID, false);
    }

    // 분석 대기열(관심 등록 직후 분석)이 꺼져 있으면 현재 상태만 돌려줌
    @Test
    void returnsCurrentStatusWhenQueueIsDisabled() {
        givenStatus(AnalysisStatus.NOT_ANALYZED);

        assertThat(service(null).request(ITEM_ID).analysisStatus()).isEqualTo(AnalysisStatus.NOT_ANALYZED);
    }

    // 없는 상품이면 404 예외
    @Test
    void throwsWhenItemDoesNotExist() {
        when(itemRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service(queue).request(99L)).isInstanceOf(ProductNotFoundException.class);
        verify(productAnalysisService, never()).analysisStatus(any(), anyBoolean());
    }

    // 화면 재시도는 6시간 안 결과가 있어도 다시 분석하고, force-retry-minutes(10분) 안이면 막음 — 외부 매물·남의 상품도 같음
    @Test
    void retryReanalyzesUnlessAnalyzedWithinMinutes() {
        ProductAnalysis latest = mock(ProductAnalysis.class);
        when(productAnalysisRepository.findFirstByItemIdOrderByAnalyzedAtDesc(ITEM_ID))
                .thenReturn(Optional.of(latest));
        when(productAnalysisService.analysisStatus(product, true)).thenReturn(AnalysisStatus.ANALYZED);

        when(latest.getAnalyzedAt()).thenReturn(LocalDateTime.now().minusMinutes(5));
        assertThat(service(queue).retry(ITEM_ID).analysisStatus()).isEqualTo(AnalysisStatus.ANALYZED);
        verify(queue, never()).enqueue(anyLong(), anyBoolean());

        when(latest.getAnalyzedAt()).thenReturn(LocalDateTime.now().minusHours(1));
        assertThat(service(queue).retry(ITEM_ID).analysisStatus()).isEqualTo(AnalysisStatus.ANALYZING);
        verify(queue).enqueue(ITEM_ID, true);
    }

    // 화면 재시도는 건너뛴 지 request-retry-hours 안이어도 force-retry-minutes가 지났으면 다시 분석
    @Test
    void retryRetriesSkippedItemAfterMinutes() {
        givenStatus(AnalysisStatus.SKIPPED);
        when(product.getAnalysisSkippedAt()).thenReturn(LocalDateTime.now().minusMinutes(5));
        assertThat(service(queue).retry(ITEM_ID).analysisStatus()).isEqualTo(AnalysisStatus.SKIPPED);

        when(product.getAnalysisSkippedAt()).thenReturn(LocalDateTime.now().minusHours(1));
        assertThat(service(queue).retry(ITEM_ID).analysisStatus()).isEqualTo(AnalysisStatus.ANALYZING);
        verify(queue).enqueue(ITEM_ID, true);
    }

    // 외부 매물도 화면 재시도로 바로 분석(소유자 확인 없음)
    @Test
    void retryAnalyzesExternalListing() {
        PlatformListing listing = mock(PlatformListing.class);
        when(itemRepository.findById(8L)).thenReturn(Optional.of(listing));
        when(productAnalysisService.analysisStatus(listing, false)).thenReturn(AnalysisStatus.NOT_ANALYZED);

        assertThat(service(queue).retry(8L).analysisStatus()).isEqualTo(AnalysisStatus.ANALYZING);
        verify(queue).enqueue(8L, true);
    }
}
