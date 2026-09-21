package com.swyp.team5.interest.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.lang.reflect.Constructor;
import java.lang.reflect.Field;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import com.swyp.team5.category.entity.Category;
import com.swyp.team5.interest.dto.InterestCreateResponse;
import com.swyp.team5.interest.dto.InterestListItemResponse;
import com.swyp.team5.interest.dto.TargetPriceResponse;
import com.swyp.team5.interest.entity.Interest;
import com.swyp.team5.interest.error.InterestAlreadyExistsException;
import com.swyp.team5.interest.error.InterestNotFoundException;
import com.swyp.team5.interest.repository.InterestRepository;
import com.swyp.team5.member.entity.Member;
import com.swyp.team5.member.repository.MemberRepository;
import com.swyp.team5.platform.entity.Platform;
import com.swyp.team5.platform.entity.PlatformListing;
import com.swyp.team5.platform.error.PlatformListingNotFoundException;
import com.swyp.team5.platform.repository.PlatformListingRepository;
import com.swyp.team5.product.dto.ListingSource;
import com.swyp.team5.product.entity.Product;
import com.swyp.team5.product.entity.ProductCondition;
import com.swyp.team5.product.entity.TradeMethod;
import com.swyp.team5.product.error.ProductNotFoundException;
import com.swyp.team5.product.repository.ProductRepository;
import com.swyp.team5.productanalysis.entity.ProductAnalysis;
import com.swyp.team5.productanalysis.repository.ProductAnalysisRepository;
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

    private InterestService service() {
        return new InterestService(
                interestRepository,
                memberRepository,
                productAnalysisRepository,
                List.of(
                        new ProductInterestRegistrar(interestRepository, productRepository),
                        new ListingInterestRegistrar(interestRepository, platformListingRepository)));
    }

    // 관심상품 등록 성공 - 우리 상품
    @Test
    void registerProductSucceeds() {
        Product product = newProduct(1L, newMember(1L));
        when(productRepository.findById(1L)).thenReturn(Optional.of(product));
        when(interestRepository.existsByMemberIdAndProductId(2L, 1L)).thenReturn(false);
        when(memberRepository.getReferenceById(2L)).thenReturn(newMember(2L));
        Interest saved = newProductInterest(10L, newMember(2L), product, null);
        when(interestRepository.save(any())).thenReturn(saved);

        InterestCreateResponse response = service().register(2L, ListingSource.OUR, 1L);

        assertThat(response.interestId()).isEqualTo(10L);
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
        when(interestRepository.existsByMemberIdAndProductId(2L, 1L)).thenReturn(true);

        assertThatThrownBy(() -> service().register(2L, ListingSource.OUR, 1L))
                .isInstanceOf(InterestAlreadyExistsException.class);
        verify(interestRepository, never()).save(any());
    }

    // 관심상품 등록 성공 - 외부 매물
    @Test
    void registerListingSucceeds() {
        PlatformListing listing = newPlatformListing(100L);
        when(platformListingRepository.findById(100L)).thenReturn(Optional.of(listing));
        when(interestRepository.existsByMemberIdAndListingId(2L, 100L)).thenReturn(false);
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
        when(interestRepository.existsByMemberIdAndListingId(2L, 100L)).thenReturn(true);

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
        when(interestRepository.findByMemberId(eq(1L), any()))
                .thenReturn(new PageImpl<>(List.of(interest), Pageable.ofSize(10), 1));
        when(productAnalysisRepository.findLatestByProductIdIn(List.of(1L))).thenReturn(List.of());

        List<InterestListItemResponse> response = service().getInterests(1L, 0, 10);

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
        when(interestRepository.findByMemberId(eq(1L), any()))
                .thenReturn(new PageImpl<>(List.of(interest), Pageable.ofSize(10), 1));
        when(productAnalysisRepository.findLatestByProductIdIn(List.of(1L))).thenReturn(List.of(analysis));

        List<InterestListItemResponse> response = service().getInterests(1L, 0, 10);

        assertThat(response).hasSize(1);
        assertThat(response.get(0).recommendation()).isNull();
        assertThat(response.get(0).marketAveragePrice()).isEqualTo(2000L);
    }

    // 관심상품 목록 조회 - 외부 매물 대상 건이 섞여 있으면 platformName/externalUrl이 채워지고
    // condition/recommendation은 null, 분석 스냅샷 조회 쿼리는 우리 상품 건만 대상으로 호출됨
    @Test
    void getInterestsIncludesExternalListing() {
        Member member = newMember(1L);
        PlatformListing listing = newPlatformListing(100L);
        Interest interest = newListingInterest(11L, member, listing, 20_000L);
        when(interestRepository.findByMemberId(eq(1L), any()))
                .thenReturn(new PageImpl<>(List.of(interest), Pageable.ofSize(10), 1));

        List<InterestListItemResponse> response = service().getInterests(1L, 0, 10);

        assertThat(response).hasSize(1);
        InterestListItemResponse item = response.get(0);
        assertThat(item.source()).isEqualTo(ListingSource.EXTERNAL);
        assertThat(item.targetId()).isEqualTo(100L);
        assertThat(item.platformName()).isEqualTo("번개장터");
        assertThat(item.externalUrl()).isEqualTo("https://url");
        assertThat(item.condition()).isNull();
        assertThat(item.recommendation()).isNull();
        assertThat(item.targetPrice()).isEqualTo(20_000L);
        verify(productAnalysisRepository, never()).findLatestByProductIdIn(any());
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
                "설명",
                500_000L,
                ProductCondition.A,
                false,
                null,
                true,
                TradeMethod.DIRECT,
                null,
                null,
                List.of("https://image.example.com/1.png"),
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
            Field field = target.getClass().getDeclaredField(fieldName);
            field.setAccessible(true);
            field.set(target, value);
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException(e);
        }
    }
}
