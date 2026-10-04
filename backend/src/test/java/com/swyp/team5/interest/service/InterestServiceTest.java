package com.swyp.team5.interest.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.entry;
import static org.assertj.core.api.Assertions.tuple;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.lang.reflect.Constructor;
import java.lang.reflect.Field;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.springframework.context.ApplicationEventPublisher;

import com.swyp.team5.category.entity.Category;
import com.swyp.team5.common.common.CursorPageResponse;
import com.swyp.team5.interest.dto.InterestCreateResponse;
import com.swyp.team5.interest.dto.InterestListItemResponse;
import com.swyp.team5.interest.dto.InterestStatus;
import com.swyp.team5.interest.dto.InterestToggleResponse;
import com.swyp.team5.interest.dto.TargetPriceResponse;
import com.swyp.team5.interest.entity.Interest;
import com.swyp.team5.interest.error.InterestAlreadyExistsException;
import com.swyp.team5.interest.error.InterestNotFoundException;
import com.swyp.team5.interest.event.InterestRegisteredEvent;
import com.swyp.team5.interest.repository.InterestRepository;
import com.swyp.team5.item.entity.ListingSource;
import com.swyp.team5.member.entity.Member;
import com.swyp.team5.member.repository.MemberRepository;
import com.swyp.team5.platform.entity.Platform;
import com.swyp.team5.platform.entity.PlatformListing;
import com.swyp.team5.platform.error.PlatformListingNotFoundException;
import com.swyp.team5.platform.repository.PlatformListingRepository;
import com.swyp.team5.product.entity.DefectStatus;
import com.swyp.team5.product.entity.Product;
import com.swyp.team5.product.entity.ProductCondition;
import com.swyp.team5.product.entity.TradeMethod;
import com.swyp.team5.product.error.ProductNotFoundException;
import com.swyp.team5.product.repository.ProductRepository;
import com.swyp.team5.productanalysis.entity.AnalysisRecommendation;
import com.swyp.team5.productanalysis.entity.ProductAnalysis;
import com.swyp.team5.productanalysis.repository.ProductAnalysisRepository;
import com.swyp.team5.productanalysis.service.AnalysisProgressTracker;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

// 관심상품 Service 단위 테스트.
@ExtendWith(MockitoExtension.class)
class InterestServiceTest {

    @Mock
    private InterestRepository interestRepository;

    @Mock
    private ProductRepository productRepository;

    @Mock
    private MemberRepository memberRepository;

    @Mock
    private ProductAnalysisRepository productAnalysisRepository;

    @Mock
    private PlatformListingRepository platformListingRepository;

    @Mock
    private TargetPriceAlertService targetPriceAlertService;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    private final AnalysisProgressTracker analysisProgressTracker = new AnalysisProgressTracker();

    private InterestService service() {
        return new InterestService(
                interestRepository,
                memberRepository,
                productAnalysisRepository,
                List.of(
                        new ProductInterestRegistrar(interestRepository, productRepository),
                        new ListingInterestRegistrar(interestRepository, platformListingRepository)),
                targetPriceAlertService,
                eventPublisher,
                analysisProgressTracker);
    }

    // 관심상품 등록 성공 - 우리 상품
    @Test
    void registerProductSucceeds() {
        Product product = newProduct(1L, newMember(1L));
        when(productRepository.findById(1L)).thenReturn(Optional.of(product));
        when(interestRepository.existsByMemberIdAndItemId(2L, 1L)).thenReturn(false);
        when(memberRepository.getReferenceById(2L)).thenReturn(newMember(2L));
        Interest saved = newProductInterest(10L, newMember(2L), product, null);
        when(interestRepository.save(any())).thenReturn(saved);

        InterestCreateResponse response = service().register(2L, ListingSource.OUR, 1L);

        assertThat(response.interestId()).isEqualTo(10L);
        // 커밋 후 대상 시세 분석을 돌리도록 등록 이벤트 발행
        verify(eventPublisher).publishEvent(new InterestRegisteredEvent(1L));
    }

    // 관심상품 토글 - 등록돼 있지 않으면 등록
    @Test
    void toggleRegistersWhenNotInterested() {
        Product product = newProduct(1L, newMember(1L));
        when(interestRepository.findByMemberIdAndItemId(2L, 1L)).thenReturn(Optional.empty());
        when(productRepository.findById(1L)).thenReturn(Optional.of(product));
        when(interestRepository.existsByMemberIdAndItemId(2L, 1L)).thenReturn(false);
        when(memberRepository.getReferenceById(2L)).thenReturn(newMember(2L));
        when(interestRepository.save(any())).thenReturn(newProductInterest(10L, newMember(2L), product, null));

        InterestToggleResponse response = service().toggle(2L, ListingSource.OUR, 1L);

        assertThat(response.interested()).isTrue();
        assertThat(response.interestId()).isEqualTo(10L);
    }

    // 관심상품 토글 - 이미 등록돼 있으면 해제
    @Test
    void toggleRemovesWhenAlreadyInterested() {
        Interest interest = newProductInterest(10L, newMember(2L), newProduct(1L, newMember(1L)), null);
        when(interestRepository.findByMemberIdAndItemId(2L, 1L)).thenReturn(Optional.of(interest));

        InterestToggleResponse response = service().toggle(2L, ListingSource.OUR, 1L);

        assertThat(response.interested()).isFalse();
        assertThat(response.interestId()).isNull();
        verify(interestRepository).delete(interest);
        verifyNoInteractions(eventPublisher);
    }

    // 관심상품 토글 - 외부 매물도 같은 방식으로 해제
    @Test
    void toggleRemovesListingInterest() {
        Interest interest = newListingInterest(11L, newMember(2L), newPlatformListing(100L), null);
        when(interestRepository.findByMemberIdAndItemId(2L, 100L)).thenReturn(Optional.of(interest));

        InterestToggleResponse response = service().toggle(2L, ListingSource.EXTERNAL, 100L);

        assertThat(response.interested()).isFalse();
        verify(interestRepository).delete(interest);
    }

    // 존재하지 않는 상품에 관심상품 등록 시도 시 실패
    @Test
    void registerProductFailsWhenProductNotFound() {
        when(productRepository.findById(1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service().register(2L, ListingSource.OUR, 1L))
                .isInstanceOf(ProductNotFoundException.class);
    }

    // 이미 등록된 상품에 재등록 시도 시 실패
    @Test
    void registerProductFailsWhenAlreadyExists() {
        Product product = newProduct(1L, newMember(1L));
        when(productRepository.findById(1L)).thenReturn(Optional.of(product));
        when(interestRepository.existsByMemberIdAndItemId(2L, 1L)).thenReturn(true);

        assertThatThrownBy(() -> service().register(2L, ListingSource.OUR, 1L))
                .isInstanceOf(InterestAlreadyExistsException.class);
        verify(interestRepository, never()).save(any());
    }

    // 관심상품 등록 성공 - 외부 매물
    @Test
    void registerListingSucceeds() {
        PlatformListing listing = newPlatformListing(100L);
        when(platformListingRepository.findById(100L)).thenReturn(Optional.of(listing));
        when(interestRepository.existsByMemberIdAndItemId(2L, 100L)).thenReturn(false);
        when(memberRepository.getReferenceById(2L)).thenReturn(newMember(2L));
        Interest saved = newListingInterest(11L, newMember(2L), listing, null);
        when(interestRepository.save(any())).thenReturn(saved);

        InterestCreateResponse response = service().register(2L, ListingSource.EXTERNAL, 100L);

        assertThat(response.interestId()).isEqualTo(11L);
    }

    // 존재하지 않는 외부 매물에 관심상품 등록 시도 시 실패
    @Test
    void registerListingFailsWhenListingNotFound() {
        when(platformListingRepository.findById(100L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service().register(2L, ListingSource.EXTERNAL, 100L))
                .isInstanceOf(PlatformListingNotFoundException.class);
    }

    // 이미 등록된 외부 매물에 재등록 시도 시 실패
    @Test
    void registerListingFailsWhenAlreadyExists() {
        PlatformListing listing = newPlatformListing(100L);
        when(platformListingRepository.findById(100L)).thenReturn(Optional.of(listing));
        when(interestRepository.existsByMemberIdAndItemId(2L, 100L)).thenReturn(true);

        assertThatThrownBy(() -> service().register(2L, ListingSource.EXTERNAL, 100L))
                .isInstanceOf(InterestAlreadyExistsException.class);
        verify(interestRepository, never()).save(any());
    }

    // 관심상품 목록 조회 - 상품 목록 조회와 동일한 카드 정보(condition/categoryName 등)를 포함
    @Test
    void getInterestsReturnsList() {
        Member member = newMember(1L);
        Product product = newProduct(1L, newMember(2L));
        Interest interest = newProductInterest(10L, member, product, 400_000L);
        when(interestRepository.findAllWithItemByMemberId(1L)).thenReturn(List.of(interest));
        when(productAnalysisRepository.findLatestByItemIdIn(List.of(1L))).thenReturn(List.of());

        List<InterestListItemResponse> response =
                service().getInterests(1L, null, null, 10).content();

        assertThat(response).hasSize(1);
        assertThat(response.get(0).interestId()).isEqualTo(10L);
        assertThat(response.get(0).source()).isEqualTo(ListingSource.OUR);
        assertThat(response.get(0).targetId()).isEqualTo(1L);
        assertThat(response.get(0).condition()).isEqualTo(ProductCondition.A);
        assertThat(response.get(0).categoryName()).isEqualTo("전자기기");
        assertThat(response.get(0).recommendation()).isNull();
        assertThat(response.get(0).targetPrice()).isEqualTo(400_000L);
    }

    // 관심상품 목록 조회 - recommendation이 null인 분석 스냅샷이 있어도 예외 없이 조회됨
    // (ProductService.findLatestRecommendations와 동일한 Collectors.toMap NPE 회귀 방지 패턴)
    @Test
    void getInterestsHandlesNullRecommendation() {
        Member member = newMember(1L);
        Product product = newProduct(1L, newMember(2L));
        Interest interest = newProductInterest(10L, member, product, null);
        ProductAnalysis analysis =
                ProductAnalysis.create(product, 1000L, 2000L, 3000L, null, null, null, null, LocalDateTime.now());
        when(interestRepository.findAllWithItemByMemberId(1L)).thenReturn(List.of(interest));
        when(productAnalysisRepository.findLatestByItemIdIn(List.of(1L))).thenReturn(List.of(analysis));

        List<InterestListItemResponse> response =
                service().getInterests(1L, null, null, 10).content();

        assertThat(response).hasSize(1);
        assertThat(response.get(0).recommendation()).isNull();
        assertThat(response.get(0).marketAveragePrice()).isEqualTo(2000L);
    }

    // 관심상품 목록 조회 - 외부 매물 대상 건이 섞여 있으면 platformName/externalUrl이 채워지고
    // condition은 null, 분석 이력이 없으면 recommendation도 null, 우리 상품 분석 조회 쿼리는 호출되지 않음
    @Test
    void getInterestsIncludesExternalListing() {
        Member member = newMember(1L);
        PlatformListing listing = newPlatformListing(100L);
        Interest interest = newListingInterest(11L, member, listing, 20_000L);
        when(interestRepository.findAllWithItemByMemberId(1L)).thenReturn(List.of(interest));

        List<InterestListItemResponse> response =
                service().getInterests(1L, null, null, 10).content();

        assertThat(response).hasSize(1);
        InterestListItemResponse item = response.get(0);
        assertThat(item.source()).isEqualTo(ListingSource.EXTERNAL);
        assertThat(item.targetId()).isEqualTo(100L);
        assertThat(item.platformName()).isEqualTo("번개장터");
        assertThat(item.externalUrl()).isEqualTo("https://url");
        assertThat(item.condition()).isNull();
        assertThat(item.recommendation()).isNull();
        assertThat(item.targetPrice()).isEqualTo(20_000L);
        // 우리 상품 대상이 없으면 상품 분석은 조회하지 않고, 외부 매물 분석만 한 번 조회한다(같은 item 기준 메서드)
        verify(productAnalysisRepository).findLatestByItemIdIn(List.of(100L));
    }

    // 관심상품 목록 조회 - 매 페이지 전체 건수와 관심상품 상태별 건수(외부 매물은 원본 상태 변환 후 판정)
    @Test
    void getInterestsIncludesStatusCountsOnEveryPage() {
        Member member = newMember(1L);
        Product draft = newProduct(5L, newMember(2L));
        PlatformListing selling = newPlatformListing(100L);
        PlatformListing reserved = newPlatformListing(101L);
        setField(reserved, "status", "SOLD_OUT");
        List<Interest> all = List.of(
                newProductInterest(10L, member, draft, null),
                newListingInterest(11L, member, selling, null),
                newListingInterest(12L, member, reserved, null));
        when(interestRepository.findAllWithItemByMemberId(1L)).thenReturn(all);
        when(interestRepository.findAllWithItemByMemberId(1L)).thenReturn(all);

        var page = service().getInterests(1L, null, null, 10);

        assertThat(page.totalCount()).isEqualTo(3L);
        assertThat(page.statusCounts())
                .containsExactly(entry("BUY", 0L), entry("WAIT", 0L), entry("SOLD_OUT", 1L), entry("PENDING", 2L));
    }

    // 관심상품 목록 조회 - 외부 매물 대상 건도 관심 매물 시세 분석 스냅샷이 있으면 추천·평균가를 채움
    @Test
    void getInterestsIncludesExternalListingAnalysis() {
        Member member = newMember(1L);
        PlatformListing listing = newPlatformListing(100L);
        Interest interest = newListingInterest(11L, member, listing, null);
        ProductAnalysis analysis = ProductAnalysis.createForListing(
                listing, 1000L, 2000L, 3000L, null, AnalysisRecommendation.BUY, 1900L, "설명", LocalDateTime.now());
        when(interestRepository.findAllWithItemByMemberId(1L)).thenReturn(List.of(interest));
        when(productAnalysisRepository.findLatestByItemIdIn(List.of(100L))).thenReturn(List.of(analysis));

        List<InterestListItemResponse> response =
                service().getInterests(1L, null, null, 10).content();

        assertThat(response.get(0).recommendation()).isEqualTo(AnalysisRecommendation.BUY);
        assertThat(response.get(0).marketAveragePrice()).isEqualTo(2000L);
    }

    // 관심상품 목록 조회 - size+1건이 조회되면 size건만 반환하고 마지막 interestId를 다음 커서로 줌
    @Test
    void getInterestsReturnsNextCursorWhenMoreExists() {
        Member member = newMember(1L);
        Interest newest = newListingInterest(13L, member, newPlatformListing(102L), null);
        Interest first = newListingInterest(12L, member, newPlatformListing(100L), null);
        Interest second = newListingInterest(11L, member, newPlatformListing(101L), null);
        when(interestRepository.findAllWithItemByMemberId(1L)).thenReturn(List.of(second, newest, first));

        CursorPageResponse<InterestListItemResponse> response = service().getInterests(1L, null, 13L, 1);

        assertThat(response.content())
                .extracting(InterestListItemResponse::interestId)
                .containsExactly(12L);
        assertThat(response.hasNext()).isTrue();
        assertThat(response.nextCursor()).isEqualTo("12");
    }

    // 관심상품 목록 조회 - 관심상품 상태: 판매 완료=판매종료(추천보다 우선), 최근 분석 BUY=구매추천, WAIT=관찰중,
    // 분석 없음은 등록 시각과 무관하게 분석대기
    @Test
    void getInterestsComputesInterestStatus() {
        Member member = newMember(1L);
        PlatformListing buy = newPlatformListing(100L);
        PlatformListing wait = newPlatformListing(101L);
        PlatformListing buySold = newPlatformListing(104L);
        setField(buySold, "status", "SOLD_OUT");
        Interest buyInterest = newListingInterest(11L, member, buy, null);
        Interest waitInterest = newListingInterest(12L, member, wait, null);
        Interest fresh = newListingInterest(13L, member, newPlatformListing(102L), null);
        setField(fresh, "createdAt", LocalDateTime.now().minusHours(1));
        Interest stale = newListingInterest(14L, member, newPlatformListing(103L), null);
        setField(stale, "createdAt", LocalDateTime.now().minusHours(7));
        Interest soldInterest = newListingInterest(15L, member, buySold, null);
        when(interestRepository.findAllWithItemByMemberId(1L))
                .thenReturn(List.of(buyInterest, waitInterest, fresh, stale, soldInterest));
        when(productAnalysisRepository.findLatestByItemIdIn(any()))
                .thenReturn(List.of(
                        ProductAnalysis.createForListing(
                                buy, 1L, 2L, 3L, null, AnalysisRecommendation.BUY, null, null, LocalDateTime.now()),
                        ProductAnalysis.createForListing(
                                wait, 1L, 2L, 3L, null, AnalysisRecommendation.WAIT, null, null, LocalDateTime.now()),
                        ProductAnalysis.createForListing(
                                buySold,
                                1L,
                                2L,
                                3L,
                                null,
                                AnalysisRecommendation.BUY,
                                null,
                                null,
                                LocalDateTime.now())));

        List<InterestListItemResponse> all =
                service().getInterests(1L, null, null, 10).content();

        assertThat(all)
                .extracting(
                        InterestListItemResponse::interestId,
                        InterestListItemResponse::status,
                        InterestListItemResponse::interestStatus)
                .containsExactly(
                        tuple(15L, "SOLD_OUT", InterestStatus.SOLD_OUT),
                        tuple(14L, "ON_SALE", InterestStatus.PENDING),
                        tuple(13L, "ON_SALE", InterestStatus.PENDING),
                        tuple(12L, "ON_SALE", InterestStatus.WAIT),
                        tuple(11L, "ON_SALE", InterestStatus.BUY));
    }

    // 관심상품 목록 조회 - 분석 결과가 없어도 분석이 대기·진행 중이면 관찰중(WAIT), 끝나면(결과 없음) 분석대기
    @Test
    void getInterestsTreatsAnalyzingItemAsWait() {
        Member member = newMember(1L);
        PlatformListing analyzing = newPlatformListing(100L);
        PlatformListing idle = newPlatformListing(101L);
        when(interestRepository.findAllWithItemByMemberId(1L))
                .thenReturn(List.of(
                        newListingInterest(11L, member, analyzing, null), newListingInterest(12L, member, idle, null)));
        analysisProgressTracker.start(100L);

        assertThat(service().getInterests(1L, null, null, 10).content())
                .extracting(InterestListItemResponse::interestId, InterestListItemResponse::interestStatus)
                .containsExactly(tuple(12L, InterestStatus.PENDING), tuple(11L, InterestStatus.WAIT));

        analysisProgressTracker.finish(100L);

        assertThat(service().getInterests(1L, null, null, 10).content())
                .extracting(InterestListItemResponse::interestStatus)
                .containsOnly(InterestStatus.PENDING);
    }

    // 관심상품 목록 조회 - status 파라미터는 관심상품 상태로 거름(탭과 1:1, 복수 가능), totalCount는 필터 기준·statusCounts는 전체 기준
    @Test
    void getInterestsFiltersByInterestStatus() {
        Member member = newMember(1L);
        PlatformListing buySelling = newPlatformListing(100L);
        PlatformListing buySold = newPlatformListing(101L);
        setField(buySold, "status", "SOLD_OUT");
        Interest pending = newListingInterest(13L, member, newPlatformListing(102L), null);
        setField(pending, "createdAt", LocalDateTime.now().minusHours(7));
        when(interestRepository.findAllWithItemByMemberId(1L))
                .thenReturn(List.of(
                        newListingInterest(11L, member, buySelling, null),
                        newListingInterest(12L, member, buySold, null),
                        pending));
        when(productAnalysisRepository.findLatestByItemIdIn(any()))
                .thenReturn(List.of(
                        ProductAnalysis.createForListing(
                                buySelling,
                                1L,
                                2L,
                                3L,
                                null,
                                AnalysisRecommendation.BUY,
                                null,
                                null,
                                LocalDateTime.now()),
                        ProductAnalysis.createForListing(
                                buySold,
                                1L,
                                2L,
                                3L,
                                null,
                                AnalysisRecommendation.BUY,
                                null,
                                null,
                                LocalDateTime.now())));

        // 구매추천 탭 — 판매 완료된 BUY는 판매종료로 빠짐
        var buy = service().getInterests(1L, Set.of(InterestStatus.BUY), null, 10);
        assertThat(buy.content())
                .extracting(InterestListItemResponse::interestId)
                .containsExactly(11L);
        assertThat(buy.totalCount()).isEqualTo(1L);
        // 탭 숫자용 상태별 건수는 필터와 무관하게 전체 기준
        assertThat(buy.statusCounts())
                .containsExactly(entry("BUY", 1L), entry("WAIT", 0L), entry("SOLD_OUT", 1L), entry("PENDING", 1L));

        // 판매종료 탭
        var soldOut = service().getInterests(1L, Set.of(InterestStatus.SOLD_OUT), null, 10);
        assertThat(soldOut.content())
                .extracting(InterestListItemResponse::interestId)
                .containsExactly(12L);
        assertThat(soldOut.hasNext()).isFalse();

        // 여러 상태를 함께
        assertThat(service()
                        .getInterests(1L, Set.of(InterestStatus.PENDING, InterestStatus.BUY), null, 10)
                        .content())
                .extracting(InterestListItemResponse::interestId)
                .containsExactly(13L, 11L);
    }

    // 관심상품 목록 조회 - 필터가 커서보다 먼저 적용돼 hasNext가 필터 기준
    @Test
    void getInterestsHasNextFollowsFilter() {
        Member member = newMember(1L);
        PlatformListing sold1 = newPlatformListing(100L);
        setField(sold1, "status", "SOLD_OUT");
        PlatformListing sold2 = newPlatformListing(101L);
        setField(sold2, "status", "SOLD_OUT");
        when(interestRepository.findAllWithItemByMemberId(1L))
                .thenReturn(List.of(
                        newListingInterest(11L, member, sold1, null),
                        newListingInterest(12L, member, newPlatformListing(102L), null),
                        newListingInterest(13L, member, sold2, null),
                        newListingInterest(14L, member, newPlatformListing(103L), null)));

        var first = service().getInterests(1L, Set.of(InterestStatus.SOLD_OUT), null, 1);
        assertThat(first.content())
                .extracting(InterestListItemResponse::interestId)
                .containsExactly(13L);
        assertThat(first.hasNext()).isTrue();

        var second = service().getInterests(1L, Set.of(InterestStatus.SOLD_OUT), 13L, 1);
        assertThat(second.content())
                .extracting(InterestListItemResponse::interestId)
                .containsExactly(11L);
        assertThat(second.hasNext()).isFalse();
    }

    // 관심상품 삭제 성공
    @Test
    void deleteSucceeds() {
        Product product = newProduct(1L, newMember(2L));
        Interest interest = newProductInterest(10L, newMember(1L), product, null);
        when(interestRepository.findByIdAndMemberId(10L, 1L)).thenReturn(Optional.of(interest));

        service().delete(1L, 10L);

        verify(interestRepository).delete(interest);
    }

    // 등록돼 있지 않은 관심상품 삭제 시도 시 실패
    @Test
    void deleteFailsWhenNotFound() {
        when(interestRepository.findByIdAndMemberId(10L, 1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service().delete(1L, 10L)).isInstanceOf(InterestNotFoundException.class);
    }

    // 목표가 설정 성공 및 알림 이력 초기화
    @Test
    void setTargetPriceSucceeds() {
        Product product = newProduct(1L, newMember(2L));
        Interest interest = newProductInterest(10L, newMember(1L), product, null);
        setField(interest, "notifiedAt", LocalDateTime.now());
        when(interestRepository.findByIdAndMemberId(10L, 1L)).thenReturn(Optional.of(interest));

        TargetPriceResponse response = service().setTargetPrice(1L, 10L, 300_000L);

        assertThat(response.interestId()).isEqualTo(10L);
        assertThat(response.targetPrice()).isEqualTo(300_000L);
        assertThat(interest.getTargetPrice()).isEqualTo(300_000L);
        assertThat(interest.getNotifiedAt()).isNull();
        // 설정 직후 이미 목표가 이하인지 바로 확인
        verify(targetPriceAlertService).check(interest);
    }

    // 외부 매물 대상 관심상품도 목표가 설정 가능
    @Test
    void setTargetPriceSucceedsForListing() {
        PlatformListing listing = newPlatformListing(100L);
        Interest interest = newListingInterest(11L, newMember(1L), listing, null);
        when(interestRepository.findByIdAndMemberId(11L, 1L)).thenReturn(Optional.of(interest));

        TargetPriceResponse response = service().setTargetPrice(1L, 11L, 15_000L);

        assertThat(response.targetPrice()).isEqualTo(15_000L);
        assertThat(interest.getTargetPrice()).isEqualTo(15_000L);
    }

    // 존재하지 않거나 본인 소유가 아닌 관심상품에 목표가 설정 시도 시 실패
    @Test
    void setTargetPriceFailsWhenNotFound() {
        when(interestRepository.findByIdAndMemberId(10L, 1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service().setTargetPrice(1L, 10L, 300_000L))
                .isInstanceOf(InterestNotFoundException.class);
    }

    private Member newMember(Long id) {
        Member member = Member.ofLocalSignUp("test@example.com", null, "encoded-password", "홍길동", "gildong", null);
        setField(member, "id", id);
        return member;
    }

    private Product newProduct(Long id, Member member) {
        Category category = newCategory(1L, "전자기기");
        Product product = Product.create(
                member,
                category,
                "아이폰 13",
                null,
                "설명",
                500_000L,
                ProductCondition.A,
                DefectStatus.NORMAL,
                null,
                true,
                TradeMethod.DIRECT,
                null,
                null,
                List.of("https://image.example.com/1.png"),
                Set.of(),
                Set.of());
        setField(product, "id", id);
        return product;
    }

    private Category newCategory(Long id, String name) {
        try {
            var constructor = Category.class.getDeclaredConstructor();
            constructor.setAccessible(true);
            Category category = constructor.newInstance();
            setField(category, "id", id);
            setField(category, "name", name);
            return category;
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException(e);
        }
    }

    private Platform newPlatform(Long id, String name) {
        try {
            Constructor<Platform> constructor = Platform.class.getDeclaredConstructor();
            constructor.setAccessible(true);
            Platform platform = constructor.newInstance();
            setField(platform, "id", id);
            setField(platform, "name", name);
            return platform;
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException(e);
        }
    }

    private PlatformListing newPlatformListing(Long id) {
        Platform platform = newPlatform(1L, "번개장터");
        Category category = newCategory(2L, "음반");
        PlatformListing listing = PlatformListing.create(
                platform, category, "ext-" + id, "번개장터 매물", 20_000L, "SELLING", "https://img", "https://url");
        setField(listing, "id", id);
        return listing;
    }

    private Interest newProductInterest(Long id, Member member, Product product, Long targetPrice) {
        Interest interest = Interest.ofProduct(member, product);
        setField(interest, "id", id);
        if (targetPrice != null) {
            setField(interest, "targetPrice", targetPrice);
        }
        return interest;
    }

    private Interest newListingInterest(Long id, Member member, PlatformListing listing, Long targetPrice) {
        Interest interest = Interest.ofListing(member, listing);
        setField(interest, "id", id);
        if (targetPrice != null) {
            setField(interest, "targetPrice", targetPrice);
        }
        return interest;
    }

    private void setField(Object target, String fieldName, Object value) {
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
