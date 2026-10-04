package com.swyp.team5.product.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.lang.reflect.Constructor;
import java.lang.reflect.Field;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Pageable;

import com.swyp.team5.category.entity.Category;
import com.swyp.team5.category.error.CategoryNotFoundException;
import com.swyp.team5.category.error.CategoryNotLeafException;
import com.swyp.team5.category.repository.CategoryRepository;
import com.swyp.team5.common.common.CursorPageResponse;
import com.swyp.team5.component.entity.Component;
import com.swyp.team5.component.repository.ComponentRepository;
import com.swyp.team5.interest.repository.InterestRepository;
import com.swyp.team5.interest.service.TargetPriceAlertService;
import com.swyp.team5.item.entity.ListingSource;
import com.swyp.team5.item.repository.ItemRepository;
import com.swyp.team5.member.entity.Member;
import com.swyp.team5.member.repository.MemberRepository;
import com.swyp.team5.platform.entity.MemberPlatform;
import com.swyp.team5.platform.entity.Platform;
import com.swyp.team5.platform.entity.PlatformListing;
import com.swyp.team5.platform.entity.ProductPlatform;
import com.swyp.team5.platform.repository.PlatformListingRepository;
import com.swyp.team5.platform.repository.ProductPlatformRepository;
import com.swyp.team5.product.dto.ProductAiAnalysisResult;
import com.swyp.team5.product.dto.ProductCreateRequest;
import com.swyp.team5.product.dto.ProductDetailSummaryResponse;
import com.swyp.team5.product.dto.ProductDetailSummaryResponse.PlatformLink;
import com.swyp.team5.product.dto.ProductListItemResponse;
import com.swyp.team5.product.dto.ProductResponse;
import com.swyp.team5.product.dto.ProductSearchCondition;
import com.swyp.team5.product.dto.ProductSearchCursor;
import com.swyp.team5.product.dto.ProductSearchHit;
import com.swyp.team5.product.dto.ProductSortType;
import com.swyp.team5.product.dto.ProductSummaryResponse;
import com.swyp.team5.product.dto.ProductUpdateRequest;
import com.swyp.team5.product.entity.DefectStatus;
import com.swyp.team5.product.entity.Product;
import com.swyp.team5.product.entity.ProductCondition;
import com.swyp.team5.product.entity.ProductStatus;
import com.swyp.team5.product.entity.TradeMethod;
import com.swyp.team5.product.error.InvalidProductSearchException;
import com.swyp.team5.product.error.ProductAccessDeniedException;
import com.swyp.team5.product.error.ProductImageRequiredException;
import com.swyp.team5.product.error.ProductNotFoundException;
import com.swyp.team5.product.event.ProductRegisteredEvent;
import com.swyp.team5.product.repository.ProductRepository;
import com.swyp.team5.product.repository.ProductSearchRepository;
import com.swyp.team5.productanalysis.entity.AnalysisRecommendation;
import com.swyp.team5.productanalysis.entity.ProductAnalysis;
import com.swyp.team5.productanalysis.repository.ProductAnalysisRepository;
import com.swyp.team5.productanalysis.service.ProductAnalysisService;
import com.swyp.team5.search.service.SearchLogService;
import com.swyp.team5.tag.entity.Tag;
import com.swyp.team5.tag.repository.TagRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

// 상품 Service 단위 테스트.
@ExtendWith(MockitoExtension.class)
class ProductServiceTest {

    private static final String IMAGE_URL = "https://image.example.com/1.png";

    @Mock
    private ProductRepository productRepository;

    @Mock
    private CategoryRepository categoryRepository;

    @Mock
    private MemberRepository memberRepository;

    @Mock
    private TagRepository tagRepository;

    @Mock
    private ComponentRepository componentRepository;

    @Mock
    private ProductAnalysisRepository productAnalysisRepository;

    @Mock
    private PlatformListingRepository platformListingRepository;

    @Mock
    private ProductSearchRepository productSearchRepository;

    @Mock
    private ItemRepository itemRepository;

    @Mock
    private InterestRepository interestRepository;

    @Mock
    private SearchLogService searchLogService;

    @Mock
    private ProductAnalysisService productAnalysisService;

    @Mock
    private TargetPriceAlertService targetPriceAlertService;

    @Mock
    private ProductPlatformRepository productPlatformRepository;

    @Mock
    private ProductViewCounter productViewCounter;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    private ProductService service() {
        return new ProductService(
                productRepository,
                categoryRepository,
                memberRepository,
                tagRepository,
                componentRepository,
                productAnalysisRepository,
                platformListingRepository,
                productSearchRepository,
                itemRepository,
                interestRepository,
                searchLogService,
                productAnalysisService,
                targetPriceAlertService,
                productPlatformRepository,
                productViewCounter,
                eventPublisher);
    }

    // 상품 등록 성공
    @Test
    void createSucceeds() {
        Member member = newMember(1L);
        Category category = newCategory(1L, "전자기기");
        ProductCreateRequest request = new ProductCreateRequest(
                category.getId(),
                "아이폰 13",
                "애플",
                "설명",
                500_000L,
                ProductCondition.A,
                DefectStatus.NORMAL,
                3,
                true,
                TradeMethod.DIRECT,
                null,
                "서울시 강남구",
                List.of(),
                List.of());

        when(memberRepository.getReferenceById(1L)).thenReturn(member);
        when(categoryRepository.findById(category.getId())).thenReturn(Optional.of(category));
        when(productRepository.save(any(Product.class))).thenAnswer(invocation -> invocation.getArgument(0));
        ProductAiAnalysisResult analysis = new ProductAiAnalysisResult(
                category.getId(), "AI 제목", null, "AI 설명", ProductCondition.A, 470_000L, "판단 근거", List.of(), List.of());
        when(productAnalysisService.calculateMarketAveragePrice(any(Product.class)))
                .thenReturn(Optional.of(480_000L));

        ProductResponse response = service().saveDirect(1L, request, List.of(IMAGE_URL), analysis);

        assertThat(response.title()).isEqualTo("아이폰 13");
        assertThat(response.brand()).isEqualTo("애플");
        assertThat(response.price()).isEqualTo(500_000L); // 사용자가 입력한 판매 가격
        assertThat(response.suggestedPrice()).isEqualTo(470_000L); // AI 사진 분석이 추정한 적정가
        assertThat(response.analysisDescription()).isEqualTo("판단 근거"); // 같은 AI 분석의 판단 근거(상품에 저장된 값)
        assertThat(response.marketAveragePrice()).isEqualTo(480_000L); // 비교 매물 평균가(AI 제안가와 별개)
        assertThat(response.memberId()).isEqualTo(1L);
        assertThat(response.category().id()).isEqualTo(category.getId());
        assertThat(response.purchasedAt()).isEqualTo(LocalDate.now().minusMonths(3));
        assertThat(response.purchasedMonths()).isEqualTo(3);
        assertThat(response.imageUrls()).containsExactly(IMAGE_URL);
        assertThat(response.status()).isEqualTo(ProductStatus.DRAFT); // 등록 직후는 외부 미게시
        // 커밋 후 시세 분석 1회를 위한 등록 이벤트 발행
        verify(eventPublisher).publishEvent(new ProductRegisteredEvent(response.id()));
    }

    // 상품 등록 성공 - 태그 포함(기존 태그 재사용 + 신규 태그 생성)
    @Test
    void createSucceedsWithTags() {
        Member member = newMember(1L);
        Category category = newCategory(1L, "전자기기");
        Tag existingTag = newTag(1L, "애플");
        ProductCreateRequest request = new ProductCreateRequest(
                category.getId(),
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
                List.of("애플", "아이폰"),
                List.of());

        when(memberRepository.getReferenceById(1L)).thenReturn(member);
        when(categoryRepository.findById(category.getId())).thenReturn(Optional.of(category));
        when(tagRepository.findAllByNameIn(List.of("애플", "아이폰"))).thenReturn(List.of(existingTag));
        when(tagRepository.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(productRepository.save(any(Product.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ProductResponse response = service().saveDirect(1L, request, List.of(IMAGE_URL), aiAnalysis());

        assertThat(response.purchasedAt()).isNull();
        assertThat(response.purchasedMonths()).isNull();
        assertThat(response.tags()).containsExactlyInAnyOrder("애플", "아이폰");
    }

    // 상품 등록 성공 - 구성품 포함(기존 구성품 재사용 + 신규 구성품 생성)
    @Test
    void createSucceedsWithComponents() {
        Member member = newMember(1L);
        Category category = newCategory(1L, "전자기기");
        Component existingComponent = newComponent(1L, "박스");
        ProductCreateRequest request = new ProductCreateRequest(
                category.getId(),
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
                List.of(),
                List.of("박스", "충전기"));

        when(memberRepository.getReferenceById(1L)).thenReturn(member);
        when(categoryRepository.findById(category.getId())).thenReturn(Optional.of(category));
        when(componentRepository.findAllByNameIn(List.of("박스", "충전기"))).thenReturn(List.of(existingComponent));
        when(componentRepository.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(productRepository.save(any(Product.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ProductResponse response = service().saveDirect(1L, request, List.of(IMAGE_URL), aiAnalysis());

        assertThat(response.includedItems()).containsExactlyInAnyOrder("박스", "충전기");
    }

    // 상품 등록 실패 - 존재하지 않는 카테고리
    @Test
    void createFailsWhenCategoryNotFound() {
        ProductCreateRequest request = new ProductCreateRequest(
                99L,
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
                List.of(),
                List.of());

        when(categoryRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service().saveDirect(1L, request, List.of(IMAGE_URL), aiAnalysis()))
                .isInstanceOf(CategoryNotFoundException.class);
    }

    // 상품 이미지 AI 분석 등록 성공
    @Test
    void createFromImagesSucceeds() {
        Member member = newMember(1L);
        Category category = newCategory(1L, "전자기기");
        ProductAiAnalysisResult analysis = new ProductAiAnalysisResult(
                category.getId(),
                "아이폰 13",
                "애플",
                "AI가 분석한 설명",
                ProductCondition.A,
                450_000L,
                "외관 스크래치가 거의 없어 A급으로 판단했습니다.",
                List.of("애플", "아이폰"),
                List.of());

        when(memberRepository.getReferenceById(1L)).thenReturn(member);
        when(categoryRepository.findById(category.getId())).thenReturn(Optional.of(category));
        when(tagRepository.findAllByNameIn(List.of("애플", "아이폰"))).thenReturn(List.of());
        when(tagRepository.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(productRepository.save(any(Product.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ProductResponse response =
                service().saveFromAnalysis(1L, analysis, List.of(IMAGE_URL), 3, DefectStatus.ISSUES, null);

        assertThat(response.title()).isEqualTo("아이폰 13");
        assertThat(response.brand()).isEqualTo("애플");
        assertThat(response.description()).isEqualTo("AI가 분석한 설명");
        assertThat(response.category().id()).isEqualTo(category.getId());
        assertThat(response.condition()).isEqualTo(ProductCondition.A);
        assertThat(response.defectStatus()).isEqualTo(DefectStatus.ISSUES);
        assertThat(response.purchasedAt()).isEqualTo(LocalDate.now().minusMonths(3));
        assertThat(response.purchasedMonths()).isEqualTo(3);
        assertThat(response.price()).isEqualTo(450_000L); // AI가 추정한 적정가가 판매 가격으로
        assertThat(response.suggestedPrice()).isEqualTo(450_000L); // 같은 값을 AI 제안가로도 제공
        assertThat(response.analysisDescription()).isEqualTo("외관 스크래치가 거의 없어 A급으로 판단했습니다.");
        assertThat(response.tradeMethod()).isEqualTo(TradeMethod.DIRECT);
        assertThat(response.imageUrls()).containsExactly(IMAGE_URL);
        assertThat(response.tags()).containsExactlyInAnyOrder("애플", "아이폰");
        assertThat(response.includedItems()).isEmpty();
    }

    // 상품 이미지 AI 분석 등록 성공 - 구성품은 AI 추론 결과와 사용자 입력을 합쳐서 저장
    @Test
    void createFromImagesSucceedsWithIncludedItems() {
        Member member = newMember(1L);
        Category category = newCategory(1L, "전자기기");
        Component existingComponent = newComponent(1L, "박스");
        ProductAiAnalysisResult analysis = new ProductAiAnalysisResult(
                category.getId(),
                "아이폰 13",
                null,
                "AI가 분석한 설명",
                ProductCondition.A,
                450_000L,
                "외관 스크래치가 거의 없어 A급으로 판단했습니다.",
                List.of(),
                List.of("박스"));

        when(memberRepository.getReferenceById(1L)).thenReturn(member);
        when(categoryRepository.findById(category.getId())).thenReturn(Optional.of(category));
        when(componentRepository.findAllByNameIn(List.of("박스", "충전기"))).thenReturn(List.of(existingComponent));
        when(componentRepository.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(productRepository.save(any(Product.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ProductResponse response =
                service().saveFromAnalysis(1L, analysis, List.of(IMAGE_URL), 3, DefectStatus.NORMAL, List.of("충전기"));

        assertThat(response.includedItems()).containsExactlyInAnyOrder("박스", "충전기");
    }

    // 상품 이미지 AI 분석 등록 성공 - 태그는 사용자 입력 없이 AI가 추론한 목록만 저장
    @Test
    void createFromImagesSavesAiInferredTags() {
        Member member = newMember(1L);
        Category category = newCategory(1L, "전자기기");
        ProductAiAnalysisResult analysis = new ProductAiAnalysisResult(
                category.getId(),
                "아이폰 13",
                null,
                "AI가 분석한 설명",
                ProductCondition.A,
                450_000L,
                "외관 스크래치가 거의 없어 A급으로 판단했습니다.",
                List.of("애플", "아이폰"),
                List.of());

        when(memberRepository.getReferenceById(1L)).thenReturn(member);
        when(categoryRepository.findById(category.getId())).thenReturn(Optional.of(category));
        when(tagRepository.findAllByNameIn(List.of("애플", "아이폰"))).thenReturn(List.of());
        when(tagRepository.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(productRepository.save(any(Product.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ProductResponse response =
                service().saveFromAnalysis(1L, analysis, List.of(IMAGE_URL), 3, DefectStatus.NORMAL, null);

        assertThat(response.tags()).containsExactlyInAnyOrder("애플", "아이폰");
    }

    // 상품 이미지 AI 분석 등록 실패 - AI가 존재하지 않는 카테고리를 추론
    @Test
    void createFromImagesFailsWhenCategoryNotFound() {
        ProductAiAnalysisResult analysis = new ProductAiAnalysisResult(
                99L, "아이폰 13", null, "설명", ProductCondition.A, 450_000L, "판단 근거", List.of(), List.of());

        when(memberRepository.getReferenceById(1L)).thenReturn(newMember(1L));
        when(categoryRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() ->
                        service().saveFromAnalysis(1L, analysis, List.of(IMAGE_URL), null, DefectStatus.NORMAL, null))
                .isInstanceOf(CategoryNotFoundException.class);
    }

    // 상품 상세 조회 - 시세 분석 이력이 있으면 최근 분석의 판단과 비교 매물 평균가, 저장된 AI 판단 근거를 함께 반환
    @Test
    void getProductIncludesLatestAnalysisAveragePriceAndStoredDescription() {
        Product product = newProduct(1L, newMember(1L), newCategory(1L, "전자기기"));
        product.changeAnalysisDescription("외관 상태가 양호해 A급으로 판단했습니다.");
        ProductAnalysis analysis = ProductAnalysis.create(
                product,
                300_000L,
                450_000L,
                600_000L,
                null,
                AnalysisRecommendation.SELL,
                470_000L,
                "시세 근거",
                LocalDateTime.now());
        when(itemRepository.findById(1L)).thenReturn(Optional.of(product));
        when(productAnalysisRepository.findFirstByItemIdOrderByAnalyzedAtDesc(1L))
                .thenReturn(Optional.of(analysis));

        ProductResponse response = service().getProduct(1L, 2L);

        assertThat(response.recommendation()).isEqualTo(AnalysisRecommendation.SELL);
        assertThat(response.marketAveragePrice()).isEqualTo(450_000L);
        assertThat(response.analysisDescription()).isEqualTo("외관 상태가 양호해 A급으로 판단했습니다.");
        verify(productAnalysisService, never()).calculateMarketAveragePrice(any(Product.class));
    }

    // 상품 상세 조회 - 시세 분석 이력이 없으면 유사 매물로 평균가를 바로 계산(유사 매물 부족 시 null)
    @Test
    void getProductCalculatesAveragePriceWhenNoAnalysis() {
        Product product = newProduct(1L, newMember(1L), newCategory(1L, "전자기기"));
        when(itemRepository.findById(1L)).thenReturn(Optional.of(product));
        when(productAnalysisRepository.findFirstByItemIdOrderByAnalyzedAtDesc(1L))
                .thenReturn(Optional.empty());
        when(productAnalysisService.calculateMarketAveragePrice(product)).thenReturn(Optional.of(430_000L));
        when(interestRepository.countByItemId(1L)).thenReturn(2L);

        ProductResponse response = service().getProduct(1L, 2L);

        assertThat(response.recommendation()).isNull();
        assertThat(response.marketAveragePrice()).isEqualTo(430_000L);
        assertThat(response.analysisDescription()).isNull();
        // 판매자 본인이 아니어도 관심 수·조회수는 보이고, 게시 플랫폼은 내려주지 않음
        assertThat(response.platforms()).isNull();
        assertThat(response.interestCount()).isEqualTo(2L);
        assertThat(response.viewCount()).isZero();
    }

    // 상품 상세 조회 - 판매자 본인이면 게시 플랫폼·관심 수·조회수를 채움
    @Test
    void getProductIncludesSellerStatsForOwner() {
        Product product = newProduct(1L, newMember(1L), newCategory(1L, "전자기기"));
        setField(product, "viewCount", 7L);
        when(itemRepository.findById(1L)).thenReturn(Optional.of(product));
        when(productAnalysisRepository.findFirstByItemIdOrderByAnalyzedAtDesc(1L))
                .thenReturn(Optional.empty());
        when(productPlatformRepository.findByProductId(1L)).thenReturn(List.of());
        when(interestRepository.countByItemId(1L)).thenReturn(3L);

        ProductResponse response = service().getProduct(1L, 1L);

        assertThat(response.platforms()).isEmpty();
        assertThat(response.interestCount()).isEqualTo(3L);
        assertThat(response.viewCount()).isEqualTo(7L);
    }

    // 상품 상세 요약 - 우리 상품: 게시 완료(POSTED) 게시글 링크만, 판매 일수는 등록 당일을 1일로 셈
    @Test
    void getProductSummaryForOurProduct() {
        Member seller = newMember(1L);
        Product product = newProduct(1L, seller, newCategory(1L, "전자기기"));
        setField(product, "viewCount", 7L);
        setField(product, "createdAt", LocalDate.now().minusDays(2).atTime(23, 0));
        MemberPlatform memberPlatform = MemberPlatform.connect(seller, newPlatform(1L, "번개장터"), "session");
        ProductPlatform posted =
                ProductPlatform.link(memberPlatform, product, "111111", "https://m.bunjang.co.kr/products/111111");
        ProductPlatform removed =
                ProductPlatform.link(memberPlatform, product, "222222", "https://m.bunjang.co.kr/products/222222");
        removed.markRemoved();
        ProductPlatform posting = ProductPlatform.startPosting(memberPlatform, product);
        when(itemRepository.findById(1L)).thenReturn(Optional.of(product));
        when(interestRepository.countByItemId(1L)).thenReturn(3L);
        when(productPlatformRepository.findByProductId(1L)).thenReturn(List.of(posted, removed, posting));

        ProductDetailSummaryResponse response = service().getProductSummary(1L);

        assertThat(response.source()).isEqualTo(ListingSource.OUR);
        assertThat(response.condition()).isEqualTo(ProductCondition.A);
        assertThat(response.viewCount()).isEqualTo(7L);
        assertThat(response.interestCount()).isEqualTo(3L);
        assertThat(response.daysOnSale()).isEqualTo(3L);
        assertThat(response.platforms())
                .containsExactly(new PlatformLink("번개장터", "https://m.bunjang.co.kr/products/111111"));
        verifyNoInteractions(productAnalysisRepository);
    }

    // 상품 상세 요약 - 외부 매물: 원본 매물 링크 1건, 조회수 null, 수집 당일이면 판매 일수 1
    @Test
    void getProductSummaryForExternalListing() {
        PlatformListing listing = PlatformListing.create(
                newPlatform(1L, "번개장터"),
                newCategory(1L, "전자기기"),
                "ext-1",
                "번개장터 아이폰",
                400_000L,
                "SELLING",
                "https://img",
                "https://m.bunjang.co.kr/products/333333");
        setField(listing, "id", 100L);
        setField(listing, "createdAt", LocalDateTime.now());
        when(itemRepository.findById(100L)).thenReturn(Optional.of(listing));
        when(interestRepository.countByItemId(100L)).thenReturn(2L);

        ProductDetailSummaryResponse response = service().getProductSummary(100L);

        assertThat(response.source()).isEqualTo(ListingSource.EXTERNAL);
        assertThat(response.status()).isEqualTo(ProductStatus.ON_SALE);
        assertThat(response.condition()).isNull();
        assertThat(response.viewCount()).isNull();
        assertThat(response.interestCount()).isEqualTo(2L);
        assertThat(response.daysOnSale()).isEqualTo(1L);
        assertThat(response.tags()).isEmpty();
        assertThat(response.platforms())
                .containsExactly(new PlatformLink("번개장터", "https://m.bunjang.co.kr/products/333333"));
        verifyNoInteractions(productPlatformRepository);
    }

    // 상품 상세 요약 실패 - 존재하지 않는 상품
    @Test
    void getProductSummaryFailsWhenNotFound() {
        when(itemRepository.findById(1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service().getProductSummary(1L)).isInstanceOf(ProductNotFoundException.class);
    }

    // 조회수 반영 - 다른 회원의 첫 조회만 올리고, 판매자 본인·24시간 내 재조회는 세지 않음
    @Test
    void recordViewCountsOnlyFirstViewByOtherMember() {
        Product product = newProduct(1L, newMember(1L), newCategory(1L, "전자기기"));
        when(productRepository.findById(1L)).thenReturn(Optional.of(product));
        when(productViewCounter.isFirstView(1L, "2")).thenReturn(true, false);

        service().recordView(1L, 1L, "10.0.0.1"); // 본인
        service().recordView(1L, 2L, "10.0.0.2"); // 첫 조회
        service().recordView(1L, 2L, "10.0.0.2"); // 재조회

        verify(productViewCounter, never()).isFirstView(1L, "1");
        verify(productRepository, times(1)).incrementViewCount(1L);
    }

    // 조회수 반영 - 비회원은 IP 단위로 첫 조회만 셈
    @Test
    void recordViewCountsGuestByIp() {
        Product product = newProduct(1L, newMember(1L), newCategory(1L, "전자기기"));
        when(productRepository.findById(1L)).thenReturn(Optional.of(product));
        when(productViewCounter.isFirstView(1L, "ip:10.0.0.9")).thenReturn(true, false);

        service().recordView(1L, null, "10.0.0.9"); // 첫 조회
        service().recordView(1L, null, "10.0.0.9"); // 같은 IP 재조회

        verify(productRepository, times(1)).incrementViewCount(1L);
    }

    // 상품 상세 조회 실패 - 존재하지 않는 상품
    @Test
    void getProductFailsWhenNotFound() {
        when(itemRepository.findById(1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service().getProduct(1L, 2L)).isInstanceOf(ProductNotFoundException.class);
    }

    // 상품 목록 조회 - 다음 페이지 존재(size보다 1개 더 조회되어 hasNext=true, nextCursor=마지막 항목의
    // 정렬값·등록일시·출처·ID를 묶어 인코딩한 문자열). 응답 순서는 검색 쿼리 결과 순서를 그대로 따른다
    @Test
    void getProductsHasNextWhenMoreItemsExist() {
        Category category = newCategory(1L, "전자기기");
        Member member = newMember(1L);
        List<Product> products = List.of(
                newProduct(3L, member, category), newProduct(2L, member, category), newProduct(1L, member, category));
        List<ProductSearchHit> hits = products.stream()
                .map(product -> new ProductSearchHit(ListingSource.OUR, product.getId(), product.getCreatedAt(), null))
                .toList();
        ProductSearchCondition condition = ProductSearchCondition.ofKeyword(null);

        when(productSearchRepository.search(condition, null, 3)).thenReturn(hits);
        when(productSearchRepository.count(condition)).thenReturn(3L);
        when(productRepository.findAllById(List.of(3L, 2L))).thenReturn(List.of(products.get(1), products.get(0)));

        CursorPageResponse<ProductListItemResponse> response = service().getProducts(1L, condition, null, 2);

        assertThat(response.content()).extracting(ProductListItemResponse::id).containsExactly(3L, 2L);
        assertThat(response.hasNext()).isTrue();
        assertThat(response.totalCount()).isEqualTo(3L); // 첫 페이지에만 전체 건수
        assertThat(ProductSearchCursor.decode(response.nextCursor(), ProductSortType.LATEST))
                .isEqualTo(new ProductSearchCursor(null, products.get(1).getCreatedAt(), 2L));
    }

    // 상품 목록 조회 - 다음 페이지(cursor 있음)는 전체 건수를 세지 않음(null)
    @Test
    void getProductsSkipsTotalCountOnNextPage() {
        ProductSearchCondition condition = ProductSearchCondition.ofKeyword(null);
        String cursor = new ProductSearchCursor(null, java.time.LocalDateTime.of(2026, 1, 1, 0, 0), 5L).encode();
        when(productSearchRepository.search(any(), any(), anyInt())).thenReturn(List.of());

        CursorPageResponse<ProductListItemResponse> response = service().getProducts(1L, condition, cursor, 2);

        assertThat(response.totalCount()).isNull();
        verify(productSearchRepository, never()).count(any());
    }

    // 상품 목록 조회 - 마지막 페이지(size만큼만 조회되어 hasNext=false, nextCursor=null)
    @Test
    void getProductsNoNextWhenLastPage() {
        Category category = newCategory(1L, "전자기기");
        Member member = newMember(1L);
        Product product = newProduct(1L, member, category);
        ProductSearchCondition condition = ProductSearchCondition.ofKeyword(null);

        when(productSearchRepository.search(condition, null, 3))
                .thenReturn(List.of(new ProductSearchHit(ListingSource.OUR, 1L, product.getCreatedAt(), null)));
        when(productRepository.findAllById(List.of(1L))).thenReturn(List.of(product));

        CursorPageResponse<ProductListItemResponse> response = service().getProducts(1L, condition, null, 2);

        assertThat(response.content()).hasSize(1);
        assertThat(response.hasNext()).isFalse();
        assertThat(response.nextCursor()).isNull();
    }

    // 상품 목록 조회 - recommendation이 null인 분석 스냅샷이 있어도 예외 없이 조회됨
    // (Collectors.toMap은 null 값에서 NPE가 나는 회귀 방지)
    @Test
    void getProductsHandlesNullRecommendation() {
        Category category = newCategory(1L, "전자기기");
        Member member = newMember(1L);
        Product product = newProduct(1L, member, category);
        ProductAnalysis analysis = ProductAnalysis.create(
                product, 1000L, 2000L, 3000L, null, null, null, null, java.time.LocalDateTime.now());
        ProductSearchCondition condition = ProductSearchCondition.ofKeyword(null);

        when(productSearchRepository.search(condition, null, 21))
                .thenReturn(List.of(new ProductSearchHit(ListingSource.OUR, 1L, product.getCreatedAt(), null)));
        when(productRepository.findAllById(List.of(1L))).thenReturn(List.of(product));
        when(productAnalysisRepository.findLatestByItemIdIn(List.of(1L))).thenReturn(List.of(analysis));

        CursorPageResponse<ProductListItemResponse> response = service().getProducts(1L, condition, null, 20);

        assertThat(response.content()).hasSize(1);
        assertThat(response.content().get(0).recommendation()).isNull();
        assertThat(response.content().get(0).marketAveragePrice()).isEqualTo(2000L);
    }

    // 상품 목록 조회 - 외부 플랫폼 매물이 섞여서 반환되고 platformName/externalUrl과 최근 분석(관심 등록 매물)이 채워짐
    @Test
    void getProductsIncludesExternalListingsWithPlatformName() {
        Platform platform = newPlatform(1L, "번개장터");
        Category category = newCategory(1L, "전자기기");
        PlatformListing listing = PlatformListing.create(
                platform, category, "ext-1", "번개장터 아이폰", 400_000L, "SELLING", "https://img", "https://url");
        setField(listing, "id", 100L);
        ProductAnalysis analysis = ProductAnalysis.createForListing(
                listing, 1000L, 380_000L, 3000L, null, AnalysisRecommendation.BUY, null, null, LocalDateTime.now());
        ProductSearchCondition condition = ProductSearchCondition.ofKeyword(null);

        when(productSearchRepository.search(condition, null, 21))
                .thenReturn(List.of(new ProductSearchHit(ListingSource.EXTERNAL, 100L, LocalDateTime.now(), null)));
        when(platformListingRepository.findAllById(List.of(100L))).thenReturn(List.of(listing));
        when(productAnalysisRepository.findLatestByItemIdIn(List.of(100L))).thenReturn(List.of(analysis));

        CursorPageResponse<ProductListItemResponse> response = service().getProducts(1L, condition, null, 20);

        assertThat(response.content()).hasSize(1);
        ProductListItemResponse item = response.content().get(0);
        assertThat(item.source()).isEqualTo(ListingSource.EXTERNAL);
        assertThat(item.platformName()).isEqualTo("번개장터");
        assertThat(item.externalUrl()).isEqualTo("https://url");
        assertThat(item.condition()).isNull();
        assertThat(item.recommendation()).isEqualTo(AnalysisRecommendation.BUY);
        assertThat(item.marketAveragePrice()).isEqualTo(380_000L);
    }

    // 상품 목록 조회 - 다른 정렬의 커서나 해석할 수 없는 커서는 400 대상 예외
    @Test
    void getProductsRejectsInvalidCursor() {
        ProductSearchCondition priceSort =
                new ProductSearchCondition(null, null, null, null, null, null, null, null, ProductSortType.PRICE_LOW);
        String latestCursor = new ProductSearchCursor(null, LocalDateTime.now(), 1L).encode();

        assertThatThrownBy(() -> service().getProducts(1L, priceSort, latestCursor, 20))
                .isInstanceOf(InvalidProductSearchException.class);
        assertThatThrownBy(() -> service().getProducts(1L, priceSort, "not-a-cursor", 20))
                .isInstanceOf(InvalidProductSearchException.class);
    }

    // 상품 목록 조회 - 첫 페이지에서 검색 결과 전체 건수와 함께 검색 로그를 기록한다
    @Test
    void getProductsRecordsSearchLogWithResultCountOnFirstPage() {
        ProductSearchCondition condition = ProductSearchCondition.ofKeyword("아이패드");
        when(productSearchRepository.search(condition, null, 21)).thenReturn(List.of());
        when(productSearchRepository.count(condition)).thenReturn(12L);

        service().getProducts(1L, condition, null, 20);

        verify(searchLogService).record(1L, "아이패드", 12L);
    }

    // 상품 목록 조회 - 다음 페이지(커서 있음)는 같은 검색이라 검색 로그를 다시 남기지 않는다
    @Test
    void getProductsDoesNotRecordSearchLogOnNextPage() {
        ProductSearchCondition condition = ProductSearchCondition.ofKeyword("아이패드");
        String cursor = new ProductSearchCursor(null, LocalDateTime.now(), 10L).encode();
        when(productSearchRepository.search(
                        any(ProductSearchCondition.class), any(ProductSearchCursor.class), anyInt()))
                .thenReturn(List.of());

        service().getProducts(1L, condition, cursor, 20);

        verifyNoInteractions(searchLogService);
    }

    // 인기 상품 조회 - 관심상품(찜) 등록 수 내림차순으로 정렬됨
    @Test
    void getPopularProductsOrdersByInterestCountDesc() {
        Category category = newCategory(1L, "전자기기");
        Member member = newMember(1L);
        Product popular = newProduct(1L, member, category);
        Product lessPopular = newProduct(2L, member, category);

        when(interestRepository.findPopularProductIds(
                        any(LocalDateTime.class),
                        eq(List.of(ProductStatus.ON_SALE, ProductStatus.RESERVED)),
                        any(Pageable.class)))
                .thenReturn(List.of(1L, 2L));
        when(interestRepository.findProductIdsByInterestAndViews(any(), any(Pageable.class)))
                .thenReturn(List.of());
        when(productRepository.findAllById(List.of(1L, 2L))).thenReturn(List.of(lessPopular, popular));

        List<ProductSummaryResponse> response = service().getPopularProducts();

        assertThat(response).extracting(ProductSummaryResponse::id).containsExactly(1L, 2L);
    }

    // 인기 상품 조회 - 최근 관심 등록 상위가 10개 미만이면 누적 관심·조회수 순 상품으로 중복 없이 채움
    @Test
    void getPopularProductsFillsWithAllTimeRanking() {
        Category category = newCategory(1L, "전자기기");
        Member member = newMember(1L);
        Product recent = newProduct(1L, member, category);
        Product filler = newProduct(3L, member, category);

        when(interestRepository.findPopularProductIds(any(LocalDateTime.class), any(), any(Pageable.class)))
                .thenReturn(List.of(1L));
        when(interestRepository.findProductIdsByInterestAndViews(any(), any(Pageable.class)))
                .thenReturn(List.of(1L, 3L));
        when(productRepository.findAllById(List.of(1L, 3L))).thenReturn(List.of(filler, recent));

        assertThat(service().getPopularProducts())
                .extracting(ProductSummaryResponse::id)
                .containsExactly(1L, 3L);
    }

    // 인기 상품 조회 - 판매중·예약중 상품이 없으면 빈 목록 반환
    @Test
    void getPopularProductsReturnsEmptyWhenNoInterests() {
        when(interestRepository.findPopularProductIds(any(LocalDateTime.class), any(), any(Pageable.class)))
                .thenReturn(List.of());
        when(interestRepository.findProductIdsByInterestAndViews(any(), any(Pageable.class)))
                .thenReturn(List.of());

        assertThat(service().getPopularProducts()).isEmpty();
    }

    // 상품 수정 성공 - 소유자 본인 (구매일시는 등록 시점 값 그대로 유지됨)
    @Test
    void updateSucceedsWhenOwner() {
        Category category = newCategory(1L, "전자기기");
        Product product = newProduct(1L, newMember(1L), category);
        setField(product, "purchasedAt", LocalDate.now().minusMonths(5));

        ProductUpdateRequest request = new ProductUpdateRequest(
                category.getId(),
                "아이폰 13 프로",
                "애플",
                "수정된 설명",
                450_000L,
                ProductStatus.SOLD_OUT,
                ProductCondition.B,
                DefectStatus.ISSUES,
                2,
                false,
                TradeMethod.DELIVERY,
                null,
                null,
                List.of("https://image.example.com/2.png"),
                List.of("가성비"),
                List.of("박스"));

        when(productRepository.findById(1L)).thenReturn(Optional.of(product));
        when(categoryRepository.findById(category.getId())).thenReturn(Optional.of(category));
        when(tagRepository.findAllByNameIn(List.of("가성비"))).thenReturn(List.of());
        when(tagRepository.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(componentRepository.findAllByNameIn(List.of("박스"))).thenReturn(List.of());
        when(componentRepository.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));
        ProductResponse response =
                service().saveUpdate(1L, 1L, request, List.of("https://image.example.com/new.png"), aiAnalysis());

        assertThat(response.title()).isEqualTo("아이폰 13 프로");
        assertThat(response.brand()).isEqualTo("애플");
        assertThat(response.status()).isEqualTo(ProductStatus.SOLD_OUT);
        assertThat(response.defectStatus()).isEqualTo(DefectStatus.ISSUES);
        // 구매 일시는 수정 요청의 purchasedMonths로 수정 시점 기준 다시 계산됨
        assertThat(response.purchasedAt()).isEqualTo(LocalDate.now().minusMonths(2));
        assertThat(response.purchasedMonths()).isEqualTo(2);
        // 유지할 기존 이미지 뒤에 새로 업로드한 이미지가 이어 붙음
        assertThat(response.imageUrls())
                .containsExactly("https://image.example.com/2.png", "https://image.example.com/new.png");
        assertThat(response.tags()).containsExactly("가성비");
        assertThat(response.includedItems()).containsExactly("박스");
        // 이미지 재분석 결과로 AI 제안가/판단 근거만 갱신(제목 등 사용자 입력은 그대로)
        assertThat(response.suggestedPrice()).isEqualTo(430_000L);
        assertThat(response.analysisDescription()).isEqualTo("AI 판단 근거");
    }

    // 상품 수정 성공 - 재분석을 건너뛰면(null) 기존 AI 제안가/판단 근거 유지
    @Test
    void updateKeepsAiValuesWhenAnalysisSkipped() {
        Category category = newCategory(1L, "전자기기");
        Product product = newProduct(1L, newMember(1L), category);
        product.changeSuggestedPrice(470_000L);
        product.changeAnalysisDescription("등록 때 근거");
        ProductUpdateRequest request = new ProductUpdateRequest(
                category.getId(),
                "아이폰 13 프로",
                null,
                "수정된 설명",
                450_000L,
                ProductStatus.ON_SALE,
                ProductCondition.B,
                DefectStatus.NORMAL,
                null,
                false,
                TradeMethod.DIRECT,
                null,
                null,
                List.of("https://image.example.com/2.png"),
                List.of(),
                List.of());

        when(productRepository.findById(1L)).thenReturn(Optional.of(product));
        when(categoryRepository.findById(category.getId())).thenReturn(Optional.of(category));

        ProductResponse response = service().saveUpdate(1L, 1L, request, List.of(), null);

        assertThat(response.suggestedPrice()).isEqualTo(470_000L);
        assertThat(response.analysisDescription()).isEqualTo("등록 때 근거");
        // 수정 직후 이 상품에 목표가를 건 관심 회원의 도달 여부 확인
        verify(targetPriceAlertService).checkProduct(1L);
    }

    // 상품 등록 실패 - 최하위가 아닌(하위가 있는) 카테고리
    @Test
    void createFailsWhenCategoryNotLeaf() {
        Category digital = newCategory(1L, "디지털");
        setField(digital, "hasChildren", true);
        ProductCreateRequest request = new ProductCreateRequest(
                1L,
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
                List.of(),
                List.of());

        when(categoryRepository.findById(1L)).thenReturn(Optional.of(digital));

        assertThatThrownBy(() -> service().saveDirect(1L, request, List.of(IMAGE_URL), aiAnalysis()))
                .isInstanceOf(CategoryNotLeafException.class);
        verify(productRepository, never()).save(any());
    }

    // 상품 수정 실패 - 중간 카테고리(카테고리 전환으로 옮겨진 상품 등)로는 수정할 수 없음
    @Test
    void updateFailsWhenCategoryNotLeaf() {
        Category digital = newCategory(1L, "디지털");
        setField(digital, "hasChildren", true);
        Product product = newProduct(1L, newMember(1L), digital);
        ProductUpdateRequest request = new ProductUpdateRequest(
                digital.getId(),
                "아이폰 13 프로",
                null,
                "수정된 설명",
                450_000L,
                ProductStatus.ON_SALE,
                ProductCondition.B,
                DefectStatus.NORMAL,
                null,
                false,
                TradeMethod.DELIVERY,
                null,
                null,
                List.of("https://image.example.com/2.png"),
                List.of(),
                List.of());

        when(productRepository.findById(1L)).thenReturn(Optional.of(product));
        when(categoryRepository.findById(1L)).thenReturn(Optional.of(digital));

        assertThatThrownBy(() -> service().saveUpdate(1L, 1L, request, List.of(), null))
                .isInstanceOf(CategoryNotLeafException.class);
    }

    // 상품 수정 실패 - 소유자가 아님
    @Test
    void updateFailsWhenNotOwner() {
        Category category = newCategory(1L, "전자기기");
        Product product = newProduct(1L, newMember(1L), category);

        ProductUpdateRequest request = new ProductUpdateRequest(
                category.getId(),
                "아이폰 13 프로",
                null,
                "수정된 설명",
                450_000L,
                ProductStatus.SOLD_OUT,
                ProductCondition.B,
                DefectStatus.ISSUES,
                null,
                false,
                TradeMethod.DELIVERY,
                null,
                null,
                List.of("https://image.example.com/2.png"),
                List.of(),
                List.of());

        when(productRepository.findById(1L)).thenReturn(Optional.of(product));

        assertThatThrownBy(() -> service().saveUpdate(2L, 1L, request, List.of(), null))
                .isInstanceOf(ProductAccessDeniedException.class);
    }

    // 상품 수정 실패 - 유지할 이미지도 새 파일도 없음
    @Test
    void updateFailsWhenNoImages() {
        Category category = newCategory(1L, "전자기기");
        Product product = newProduct(1L, newMember(1L), category);

        ProductUpdateRequest request = new ProductUpdateRequest(
                category.getId(),
                "아이폰 13 프로",
                null,
                "수정된 설명",
                450_000L,
                ProductStatus.ON_SALE,
                ProductCondition.B,
                DefectStatus.NORMAL,
                null,
                false,
                TradeMethod.DIRECT,
                null,
                null,
                List.of(),
                List.of(),
                List.of());

        when(productRepository.findById(1L)).thenReturn(Optional.of(product));
        when(categoryRepository.findById(category.getId())).thenReturn(Optional.of(category));

        assertThatThrownBy(() -> service().saveUpdate(1L, 1L, request, List.of(), null))
                .isInstanceOf(ProductImageRequiredException.class);
    }

    // 내 상품 목록 - 매 페이지 전체 건수와 상태별 건수(커서와 무관, 상품이 없는 상태는 0으로 채움)
    @Test
    @SuppressWarnings("unchecked")
    void getMyProductsIncludesStatusCountsOnEveryPage() {
        Product product = newProduct(1L, newMember(1L), newCategory(1L, "전자기기"));
        when(productRepository.findAll(
                        any(org.springframework.data.jpa.domain.Specification.class),
                        any(org.springframework.data.domain.Pageable.class)))
                .thenReturn(new org.springframework.data.domain.PageImpl<>(List.of(product)));
        when(productRepository.countByStatus(any(org.springframework.data.jpa.domain.Specification.class)))
                .thenReturn(java.util.Map.of(
                        ProductStatus.DRAFT, 1L, ProductStatus.ON_SALE, 2L, ProductStatus.SOLD_OUT, 3L));

        var first = service().getMyProducts(1L, null, null, null, null, 20);

        assertThat(first.totalCount()).isEqualTo(6L);
        assertThat(first.statusCounts())
                .containsExactly(
                        org.assertj.core.api.Assertions.entry("DRAFT", 1L),
                        org.assertj.core.api.Assertions.entry("ON_SALE", 2L),
                        org.assertj.core.api.Assertions.entry("RESERVED", 0L),
                        org.assertj.core.api.Assertions.entry("SOLD_OUT", 3L));

        var next = service().getMyProducts(1L, null, null, null, 1L, 20);
        assertThat(next.totalCount()).isEqualTo(6L);
        assertThat(next.statusCounts()).isEqualTo(first.statusCounts());
    }

    // 내 상품 목록 - 상태 필터를 줘도 상태별 건수는 모든 상태를 채우고(탭 숫자), 전체 건수는 요청한 상태의 합
    @Test
    @SuppressWarnings("unchecked")
    void getMyProductsCountsAllStatusesRegardlessOfStatusFilter() {
        Product product = newProduct(1L, newMember(1L), newCategory(1L, "전자기기"));
        when(productRepository.findAll(
                        any(org.springframework.data.jpa.domain.Specification.class),
                        any(org.springframework.data.domain.Pageable.class)))
                .thenReturn(new org.springframework.data.domain.PageImpl<>(List.of(product)));
        when(productRepository.countByStatus(any(org.springframework.data.jpa.domain.Specification.class)))
                .thenReturn(java.util.Map.of(
                        ProductStatus.DRAFT, 1L, ProductStatus.ON_SALE, 2L, ProductStatus.SOLD_OUT, 3L));

        var page = service()
                .getMyProducts(
                        1L, null, null, java.util.Set.of(ProductStatus.ON_SALE, ProductStatus.RESERVED), null, 20);

        assertThat(page.totalCount()).isEqualTo(2L);
        assertThat(page.statusCounts())
                .containsExactly(
                        org.assertj.core.api.Assertions.entry("DRAFT", 1L),
                        org.assertj.core.api.Assertions.entry("ON_SALE", 2L),
                        org.assertj.core.api.Assertions.entry("RESERVED", 0L),
                        org.assertj.core.api.Assertions.entry("SOLD_OUT", 3L));
    }

    // 상품 상태 변경 성공 - 소유자 본인
    @Test
    void updateStatusSucceedsWhenOwner() {
        Product product = newProduct(1L, newMember(1L), newCategory(1L, "전자기기"));

        when(productRepository.findById(1L)).thenReturn(Optional.of(product));

        ProductResponse response = service().updateStatus(1L, 1L, ProductStatus.SOLD_OUT);

        assertThat(response.status()).isEqualTo(ProductStatus.SOLD_OUT);
    }

    // 상품 상태 변경 실패 - 소유자가 아님
    @Test
    void updateStatusFailsWhenNotOwner() {
        Product product = newProduct(1L, newMember(1L), newCategory(1L, "전자기기"));

        when(productRepository.findById(1L)).thenReturn(Optional.of(product));

        assertThatThrownBy(() -> service().updateStatus(2L, 1L, ProductStatus.SOLD_OUT))
                .isInstanceOf(ProductAccessDeniedException.class);
    }

    // 상품 상태 변경 실패 - 존재하지 않는 상품
    @Test
    void updateStatusFailsWhenNotFound() {
        when(productRepository.findById(1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service().updateStatus(1L, 1L, ProductStatus.SOLD_OUT))
                .isInstanceOf(ProductNotFoundException.class);
    }

    // 상품 삭제 성공 - 소유자 본인
    @Test
    void deleteSucceedsWhenOwner() {
        Product product = newProduct(1L, newMember(1L), newCategory(1L, "전자기기"));

        when(productRepository.findById(1L)).thenReturn(Optional.of(product));

        service().delete(1L, 1L);

        verify(productRepository).delete(product);
    }

    // 상품 삭제 실패 - 소유자가 아님
    @Test
    void deleteFailsWhenNotOwner() {
        Product product = newProduct(1L, newMember(1L), newCategory(1L, "전자기기"));

        when(productRepository.findById(1L)).thenReturn(Optional.of(product));

        assertThatThrownBy(() -> service().delete(2L, 1L)).isInstanceOf(ProductAccessDeniedException.class);
    }

    /** AI 사진 분석 결과(카테고리 1, 제안가 430,000원). */
    private static ProductAiAnalysisResult aiAnalysis() {
        return new ProductAiAnalysisResult(
                1L, "AI 제목", null, "AI 설명", ProductCondition.A, 430_000L, "AI 판단 근거", List.of(), List.of());
    }

    private Member newMember(Long id) {
        Member member = Member.ofLocalSignUp("test@example.com", null, "encoded-password", "홍길동", "gildong", null);
        setField(member, "id", id);
        return member;
    }

    private Category newCategory(Long id, String name) {
        try {
            Constructor<Category> constructor = Category.class.getDeclaredConstructor();
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

    private Product newProduct(Long id, Member member, Category category) {
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
        // id가 클수록 최근 등록으로 취급(목록 조회가 createdAt DESC 정렬이라 테스트에서도 순서가 맞아야 함)
        setField(product, "createdAt", LocalDateTime.of(2026, 1, 1, 0, 0).plusMinutes(id));
        return product;
    }

    private Tag newTag(Long id, String name) {
        Tag tag = Tag.of(name);
        setField(tag, "id", id);
        return tag;
    }

    private Component newComponent(Long id, String name) {
        Component component = Component.of(name);
        setField(component, "id", id);
        return component;
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
