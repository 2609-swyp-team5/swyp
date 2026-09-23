package com.swyp.team5.product.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.lang.reflect.Constructor;
import java.lang.reflect.Field;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.mock.web.MockMultipartFile;

import com.swyp.team5.category.entity.Category;
import com.swyp.team5.category.error.CategoryNotFoundException;
import com.swyp.team5.category.repository.CategoryRepository;
import com.swyp.team5.common.common.CursorPageResponse;
import com.swyp.team5.component.entity.Component;
import com.swyp.team5.component.repository.ComponentRepository;
import com.swyp.team5.file.dto.FileUploadResponse;
import com.swyp.team5.file.service.FileStorageService;
import com.swyp.team5.interest.repository.InterestRepository;
import com.swyp.team5.member.entity.Member;
import com.swyp.team5.member.repository.MemberRepository;
import com.swyp.team5.platform.entity.Platform;
import com.swyp.team5.platform.entity.PlatformListing;
import com.swyp.team5.platform.repository.PlatformListingRepository;
import com.swyp.team5.product.dto.ListingSource;
import com.swyp.team5.product.dto.ProductAiAnalysisResult;
import com.swyp.team5.product.dto.ProductCreateRequest;
import com.swyp.team5.product.dto.ProductListItemResponse;
import com.swyp.team5.product.dto.ProductResponse;
import com.swyp.team5.product.dto.ProductSummaryResponse;
import com.swyp.team5.product.dto.ProductUpdateRequest;
import com.swyp.team5.product.entity.DefectStatus;
import com.swyp.team5.product.entity.Product;
import com.swyp.team5.product.entity.ProductCondition;
import com.swyp.team5.product.entity.ProductStatus;
import com.swyp.team5.product.entity.TradeMethod;
import com.swyp.team5.product.error.ProductAccessDeniedException;
import com.swyp.team5.product.error.ProductNotFoundException;
import com.swyp.team5.product.repository.ProductRepository;
import com.swyp.team5.productanalysis.entity.ProductAnalysis;
import com.swyp.team5.productanalysis.repository.ProductAnalysisRepository;
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

    @Mock
    private ProductRepository productRepository;

    @Mock
    private CategoryRepository categoryRepository;

    @Mock
    private MemberRepository memberRepository;

    @Mock
    private FileStorageService fileStorageService;

    @Mock
    private ProductAiService productAiService;

    @Mock
    private TagRepository tagRepository;

    @Mock
    private ComponentRepository componentRepository;

    @Mock
    private ProductAnalysisRepository productAnalysisRepository;

    @Mock
    private PlatformListingRepository platformListingRepository;

    @Mock
    private InterestRepository interestRepository;

    @Mock
    private SearchLogService searchLogService;

    private ProductService service() {
        return new ProductService(
                productRepository,
                categoryRepository,
                memberRepository,
                fileStorageService,
                productAiService,
                tagRepository,
                componentRepository,
                productAnalysisRepository,
                platformListingRepository,
                interestRepository,
                searchLogService);
    }

    // 상품 등록 성공
    @Test
    void createSucceeds() {
        Member member = newMember(1L);
        Category category = newCategory(1L, "전자기기");
        MockMultipartFile image = new MockMultipartFile("images", "iphone.png", "image/png", new byte[] {1, 2, 3});
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
        when(fileStorageService.upload(image, "products"))
                .thenReturn(new FileUploadResponse("key", "https://image.example.com/1.png", 3, "image/png"));
        when(productRepository.save(any(Product.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(productAiService.analyze(List.of(image)))
                .thenReturn(new ProductAiAnalysisResult(
                        category.getId(),
                        "AI 제목",
                        null,
                        "AI 설명",
                        ProductCondition.A,
                        470_000L,
                        "판단 근거",
                        List.of(),
                        List.of()));

        ProductResponse response = service().create(1L, request, List.of(image));

        assertThat(response.title()).isEqualTo("아이폰 13");
        assertThat(response.brand()).isEqualTo("애플");
        assertThat(response.price()).isEqualTo(500_000L); // 사용자가 입력한 판매 가격
        assertThat(response.suggestedPrice()).isEqualTo(470_000L); // AI 사진 분석이 추정한 적정가
        assertThat(response.analysisDescription()).isEqualTo("판단 근거"); // 같은 AI 분석의 판단 근거
        assertThat(response.memberId()).isEqualTo(1L);
        assertThat(response.category().id()).isEqualTo(category.getId());
        assertThat(response.purchasedAt()).isEqualTo(LocalDate.now().minusMonths(3));
        assertThat(response.purchasedMonths()).isEqualTo(3);
        assertThat(response.imageUrls()).containsExactly("https://image.example.com/1.png");
        assertThat(response.status()).isEqualTo(ProductStatus.ON_SALE);
    }

    // 상품 등록 성공 - AI 적정가 추정이 실패해도 등록은 성공하고 suggestedPrice만 null
    @Test
    void createSucceedsWhenPriceEstimateFails() {
        Member member = newMember(1L);
        Category category = newCategory(1L, "전자기기");
        MockMultipartFile image = new MockMultipartFile("images", "iphone.png", "image/png", new byte[] {1, 2, 3});
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
                List.of());

        when(memberRepository.getReferenceById(1L)).thenReturn(member);
        when(categoryRepository.findById(category.getId())).thenReturn(Optional.of(category));
        when(fileStorageService.upload(image, "products"))
                .thenReturn(new FileUploadResponse("key", "https://image.example.com/1.png", 3, "image/png"));
        when(productRepository.save(any(Product.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(productAiService.analyze(List.of(image))).thenThrow(new IllegalStateException("Gemini 503"));

        ProductResponse response = service().create(1L, request, List.of(image));

        assertThat(response.price()).isEqualTo(500_000L);
        assertThat(response.suggestedPrice()).isNull();
        assertThat(response.analysisDescription()).isNull();
    }

    // 상품 등록 성공 - 태그 포함(기존 태그 재사용 + 신규 태그 생성)
    @Test
    void createSucceedsWithTags() {
        Member member = newMember(1L);
        Category category = newCategory(1L, "전자기기");
        Tag existingTag = newTag(1L, "애플");
        MockMultipartFile image = new MockMultipartFile("images", "iphone.png", "image/png", new byte[] {1, 2, 3});
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
        when(fileStorageService.upload(image, "products"))
                .thenReturn(new FileUploadResponse("key", "https://image.example.com/1.png", 3, "image/png"));
        when(tagRepository.findAllByNameIn(List.of("애플", "아이폰"))).thenReturn(List.of(existingTag));
        when(tagRepository.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(productRepository.save(any(Product.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ProductResponse response = service().create(1L, request, List.of(image));

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
        MockMultipartFile image = new MockMultipartFile("images", "iphone.png", "image/png", new byte[] {1, 2, 3});
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
        when(fileStorageService.upload(image, "products"))
                .thenReturn(new FileUploadResponse("key", "https://image.example.com/1.png", 3, "image/png"));
        when(componentRepository.findAllByNameIn(List.of("박스", "충전기"))).thenReturn(List.of(existingComponent));
        when(componentRepository.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(productRepository.save(any(Product.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ProductResponse response = service().create(1L, request, List.of(image));

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

        assertThatThrownBy(() -> service().create(1L, request, List.of()))
                .isInstanceOf(CategoryNotFoundException.class);
    }

    // 상품 이미지 AI 분석 등록 성공
    @Test
    void createFromImagesSucceeds() {
        Member member = newMember(1L);
        Category category = newCategory(1L, "전자기기");
        MockMultipartFile image = new MockMultipartFile("images", "iphone.png", "image/png", new byte[] {1, 2, 3});
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
        when(productAiService.analyze(List.of(image))).thenReturn(analysis);
        when(categoryRepository.findById(category.getId())).thenReturn(Optional.of(category));
        when(fileStorageService.upload(image, "products"))
                .thenReturn(new FileUploadResponse("key", "https://image.example.com/iphone.png", 3, "image/png"));
        when(tagRepository.findAllByNameIn(List.of("애플", "아이폰"))).thenReturn(List.of());
        when(tagRepository.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(productRepository.save(any(Product.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ProductResponse response = service().createFromImages(1L, List.of(image), 3, DefectStatus.ISSUES, null, null);

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
        assertThat(response.imageUrls()).containsExactly("https://image.example.com/iphone.png");
        assertThat(response.tags()).containsExactlyInAnyOrder("애플", "아이폰");
        assertThat(response.includedItems()).isEmpty();
    }

    // 상품 이미지 AI 분석 등록 성공 - 구성품은 AI 추론 결과와 사용자 입력을 합쳐서 저장
    @Test
    void createFromImagesSucceedsWithIncludedItems() {
        Member member = newMember(1L);
        Category category = newCategory(1L, "전자기기");
        Component existingComponent = newComponent(1L, "박스");
        MockMultipartFile image = new MockMultipartFile("images", "iphone.png", "image/png", new byte[] {1, 2, 3});
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
        when(productAiService.analyze(List.of(image))).thenReturn(analysis);
        when(categoryRepository.findById(category.getId())).thenReturn(Optional.of(category));
        when(fileStorageService.upload(image, "products"))
                .thenReturn(new FileUploadResponse("key", "https://image.example.com/iphone.png", 3, "image/png"));
        when(componentRepository.findAllByNameIn(List.of("박스", "충전기"))).thenReturn(List.of(existingComponent));
        when(componentRepository.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(productRepository.save(any(Product.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ProductResponse response =
                service().createFromImages(1L, List.of(image), 3, DefectStatus.NORMAL, null, List.of("충전기"));

        assertThat(response.includedItems()).containsExactlyInAnyOrder("박스", "충전기");
    }

    // 상품 이미지 AI 분석 등록 성공 - 태그는 AI 추론 결과와 사용자 입력을 합쳐서 저장(중복은 한 번만)
    @Test
    void createFromImagesSucceedsWithUserTags() {
        Member member = newMember(1L);
        Category category = newCategory(1L, "전자기기");
        MockMultipartFile image = new MockMultipartFile("images", "iphone.png", "image/png", new byte[] {1, 2, 3});
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
        when(productAiService.analyze(List.of(image))).thenReturn(analysis);
        when(categoryRepository.findById(category.getId())).thenReturn(Optional.of(category));
        when(fileStorageService.upload(image, "products"))
                .thenReturn(new FileUploadResponse("key", "https://image.example.com/iphone.png", 3, "image/png"));
        when(tagRepository.findAllByNameIn(List.of("애플", "아이폰", "급처"))).thenReturn(List.of());
        when(tagRepository.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(productRepository.save(any(Product.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ProductResponse response =
                service().createFromImages(1L, List.of(image), 3, DefectStatus.NORMAL, List.of("급처", "애플"), null);

        assertThat(response.tags()).containsExactlyInAnyOrder("애플", "아이폰", "급처");
    }

    // 상품 이미지 AI 분석 등록 실패 - AI가 존재하지 않는 카테고리를 추론
    @Test
    void createFromImagesFailsWhenCategoryNotFound() {
        MockMultipartFile image = new MockMultipartFile("images", "iphone.png", "image/png", new byte[] {1, 2, 3});
        ProductAiAnalysisResult analysis = new ProductAiAnalysisResult(
                99L, "아이폰 13", null, "설명", ProductCondition.A, 450_000L, "판단 근거", List.of(), List.of());

        when(memberRepository.getReferenceById(1L)).thenReturn(newMember(1L));
        when(productAiService.analyze(List.of(image))).thenReturn(analysis);
        when(categoryRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service().createFromImages(1L, List.of(image), null, DefectStatus.NORMAL, null, null))
                .isInstanceOf(CategoryNotFoundException.class);
    }

    // 상품 상세 조회 실패 - 존재하지 않는 상품
    @Test
    void getProductFailsWhenNotFound() {
        when(productRepository.findById(1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service().getProduct(1L)).isInstanceOf(ProductNotFoundException.class);
    }

    // 상품 목록 조회 - 다음 페이지 존재(size보다 1개 더 조회되어 hasNext=true, nextCursor=마지막 항목의
    // 등록일시를 epoch millisecond로 인코딩한 값 — 우리 상품과 외부 매물을 등록일시 기준으로 병합하기
    // 위한 커서라 id가 아니다)
    @Test
    void getProductsHasNextWhenMoreItemsExist() {
        Category category = newCategory(1L, "전자기기");
        Member member = newMember(1L);
        List<Product> products = List.of(
                newProduct(3L, member, category), newProduct(2L, member, category), newProduct(1L, member, category));

        when(productRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(products));
        when(platformListingRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));

        CursorPageResponse<ProductListItemResponse> response = service().getProducts(1L, null, null, null, 2);

        assertThat(response.content()).hasSize(2);
        assertThat(response.content().get(0).id()).isEqualTo(3L);
        assertThat(response.content().get(1).id()).isEqualTo(2L);
        assertThat(response.hasNext()).isTrue();
        assertThat(response.nextCursor()).isEqualTo(toEpochMillis(LocalDateTime.of(2026, 1, 1, 0, 2)));
    }

    // 상품 목록 조회 - 마지막 페이지(size만큼만 조회되어 hasNext=false, nextCursor=null)
    @Test
    void getProductsNoNextWhenLastPage() {
        Category category = newCategory(1L, "전자기기");
        Member member = newMember(1L);
        List<Product> products = List.of(newProduct(2L, member, category), newProduct(1L, member, category));

        when(productRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(products));
        when(platformListingRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));

        CursorPageResponse<ProductListItemResponse> response = service().getProducts(1L, null, null, null, 2);

        assertThat(response.content()).hasSize(2);
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

        when(productRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(product)));
        when(platformListingRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));
        when(productAnalysisRepository.findLatestByProductIdIn(List.of(1L))).thenReturn(List.of(analysis));

        CursorPageResponse<ProductListItemResponse> response = service().getProducts(1L, null, null, null, 20);

        assertThat(response.content()).hasSize(1);
        assertThat(response.content().get(0).recommendation()).isNull();
        assertThat(response.content().get(0).marketAveragePrice()).isEqualTo(2000L);
    }

    // 상품 목록 조회 - 외부 플랫폼 매물이 섞여서 반환되고 platformName/externalUrl이 채워짐
    @Test
    void getProductsIncludesExternalListingsWithPlatformName() {
        when(productRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));
        Platform platform = newPlatform(1L, "번개장터");
        Category category = newCategory(1L, "전자기기");
        PlatformListing listing = PlatformListing.create(
                platform, category, "ext-1", "번개장터 아이폰", 400_000L, "SELLING", "https://img", "https://url");
        setField(listing, "id", 100L);
        when(platformListingRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(listing)));

        CursorPageResponse<ProductListItemResponse> response = service().getProducts(1L, null, null, null, 20);

        assertThat(response.content()).hasSize(1);
        ProductListItemResponse item = response.content().get(0);
        assertThat(item.source()).isEqualTo(ListingSource.EXTERNAL);
        assertThat(item.platformName()).isEqualTo("번개장터");
        assertThat(item.externalUrl()).isEqualTo("https://url");
        assertThat(item.condition()).isNull();
        assertThat(item.recommendation()).isNull();
    }

    // 상품 목록 조회 - status 필터 지정 시 외부 매물은 제외되고 우리 상품만 반환됨
    @Test
    void getProductsExcludesExternalListingsWhenStatusFilterGiven() {
        Category category = newCategory(1L, "전자기기");
        Member member = newMember(1L);
        Product product = newProduct(1L, member, category);

        when(productRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(product)));

        CursorPageResponse<ProductListItemResponse> response =
                service().getProducts(1L, null, ProductStatus.ON_SALE, null, 20);

        assertThat(response.content()).hasSize(1);
        assertThat(response.content().get(0).source()).isEqualTo(ListingSource.OUR);
        verify(platformListingRepository, never()).findAll(any(Specification.class), any(Pageable.class));
    }

    // 상품 목록 조회 - 키워드가 있으면 검색 로그를 기록한다
    @Test
    void getProductsRecordsSearchLogWhenKeywordGiven() {
        when(productRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));
        when(platformListingRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));

        service().getProducts(1L, "아이패드", null, null, 20);

        verify(searchLogService).record(1L, "아이패드");
    }

    // 인기 상품 조회 - 관심상품(찜) 등록 수 내림차순으로 정렬됨
    @Test
    void getPopularProductsOrdersByInterestCountDesc() {
        Category category = newCategory(1L, "전자기기");
        Member member = newMember(1L);
        Product popular = newProduct(1L, member, category);
        Product lessPopular = newProduct(2L, member, category);

        when(interestRepository.findPopularProductIds(any(LocalDateTime.class), any(Pageable.class)))
                .thenReturn(List.of(1L, 2L));
        when(productRepository.findAllById(List.of(1L, 2L))).thenReturn(List.of(lessPopular, popular));

        List<ProductSummaryResponse> response = service().getPopularProducts();

        assertThat(response).extracting(ProductSummaryResponse::id).containsExactly(1L, 2L);
    }

    // 인기 상품 조회 - 관심상품 등록 이력이 없으면 빈 목록 반환
    @Test
    void getPopularProductsReturnsEmptyWhenNoInterests() {
        when(interestRepository.findPopularProductIds(any(LocalDateTime.class), any(Pageable.class)))
                .thenReturn(List.of());

        assertThat(service().getPopularProducts()).isEmpty();
    }

    // 상품 수정 성공 - 소유자 본인 (구매일시는 등록 시점 값 그대로 유지됨)
    @Test
    void updateSucceedsWhenOwner() {
        Category category = newCategory(1L, "전자기기");
        Product product = newProduct(1L, newMember(1L), category);
        LocalDate registeredPurchasedAt = LocalDate.now().minusMonths(5);
        setField(product, "purchasedAt", registeredPurchasedAt);

        ProductUpdateRequest request = new ProductUpdateRequest(
                category.getId(),
                "아이폰 13 프로",
                "애플",
                "수정된 설명",
                450_000L,
                ProductStatus.RESERVED,
                ProductCondition.B,
                DefectStatus.ISSUES,
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

        ProductResponse response = service().update(1L, 1L, request);

        assertThat(response.title()).isEqualTo("아이폰 13 프로");
        assertThat(response.brand()).isEqualTo("애플");
        assertThat(response.status()).isEqualTo(ProductStatus.RESERVED);
        assertThat(response.purchasedAt()).isEqualTo(registeredPurchasedAt);
        assertThat(response.imageUrls()).containsExactly("https://image.example.com/2.png");
        assertThat(response.tags()).containsExactly("가성비");
        assertThat(response.includedItems()).containsExactly("박스");
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
                ProductStatus.RESERVED,
                ProductCondition.B,
                DefectStatus.ISSUES,
                false,
                TradeMethod.DELIVERY,
                null,
                null,
                List.of("https://image.example.com/2.png"),
                List.of(),
                List.of());

        when(productRepository.findById(1L)).thenReturn(Optional.of(product));

        assertThatThrownBy(() -> service().update(2L, 1L, request)).isInstanceOf(ProductAccessDeniedException.class);
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
            Field field = target.getClass().getDeclaredField(fieldName);
            field.setAccessible(true);
            field.set(target, value);
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException(e);
        }
    }

    // ProductService의 등록일시 커서 인코딩과 동일한 방식(Asia/Seoul epoch millisecond)으로 계산한다.
    private static long toEpochMillis(LocalDateTime dateTime) {
        return dateTime.atZone(ZoneId.of("Asia/Seoul")).toInstant().toEpochMilli();
    }
}
