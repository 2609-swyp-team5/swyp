package com.swyp.team5.product.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.swyp.team5.category.entity.Category;
import com.swyp.team5.category.error.CategoryNotFoundException;
import com.swyp.team5.category.error.CategoryNotLeafException;
import com.swyp.team5.category.repository.CategoryRepository;
import com.swyp.team5.common.common.CursorPageResponse;
import com.swyp.team5.component.entity.Component;
import com.swyp.team5.component.repository.ComponentRepository;
import com.swyp.team5.interest.repository.InterestRepository;
import com.swyp.team5.interest.service.TargetPriceAlertService;
import com.swyp.team5.item.entity.Item;
import com.swyp.team5.item.entity.ListingSource;
import com.swyp.team5.item.repository.ItemRepository;
import com.swyp.team5.member.entity.Member;
import com.swyp.team5.member.repository.MemberRepository;
import com.swyp.team5.platform.entity.PlatformListing;
import com.swyp.team5.platform.repository.PlatformListingRepository;
import com.swyp.team5.platform.repository.ProductPlatformRepository;
import com.swyp.team5.product.dto.ProductAiAnalysisResult;
import com.swyp.team5.product.dto.ProductCreateRequest;
import com.swyp.team5.product.dto.ProductListItemResponse;
import com.swyp.team5.product.dto.ProductPlatformSummaryResponse;
import com.swyp.team5.product.dto.ProductResponse;
import com.swyp.team5.product.dto.ProductSearchCondition;
import com.swyp.team5.product.dto.ProductSearchCursor;
import com.swyp.team5.product.dto.ProductSearchHit;
import com.swyp.team5.product.dto.ProductSummaryResponse;
import com.swyp.team5.product.dto.ProductUpdateRequest;
import com.swyp.team5.product.entity.DefectStatus;
import com.swyp.team5.product.entity.Product;
import com.swyp.team5.product.entity.ProductImage;
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
import org.hibernate.Hibernate;

/**
 * 상품(Product) 도메인의 등록/조회/수정/삭제를 담당하는 서비스.
 */
@Service
public class ProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final MemberRepository memberRepository;
    private final TagRepository tagRepository;
    private final ComponentRepository componentRepository;
    private final ProductAnalysisRepository productAnalysisRepository;
    private final PlatformListingRepository platformListingRepository;
    private final ProductSearchRepository productSearchRepository;
    private final ItemRepository itemRepository;
    private final InterestRepository interestRepository;
    private final SearchLogService searchLogService;
    private final ProductAnalysisService productAnalysisService;
    private final TargetPriceAlertService targetPriceAlertService;
    private final ProductPlatformRepository productPlatformRepository;
    private final ProductViewCounter productViewCounter;
    private final ApplicationEventPublisher eventPublisher;

    public ProductService(
            ProductRepository productRepository,
            CategoryRepository categoryRepository,
            MemberRepository memberRepository,
            TagRepository tagRepository,
            ComponentRepository componentRepository,
            ProductAnalysisRepository productAnalysisRepository,
            PlatformListingRepository platformListingRepository,
            ProductSearchRepository productSearchRepository,
            ItemRepository itemRepository,
            InterestRepository interestRepository,
            SearchLogService searchLogService,
            ProductAnalysisService productAnalysisService,
            TargetPriceAlertService targetPriceAlertService,
            ProductPlatformRepository productPlatformRepository,
            ProductViewCounter productViewCounter,
            ApplicationEventPublisher eventPublisher) {
        this.productRepository = productRepository;
        this.categoryRepository = categoryRepository;
        this.memberRepository = memberRepository;
        this.tagRepository = tagRepository;
        this.componentRepository = componentRepository;
        this.productAnalysisRepository = productAnalysisRepository;
        this.platformListingRepository = platformListingRepository;
        this.productSearchRepository = productSearchRepository;
        this.itemRepository = itemRepository;
        this.interestRepository = interestRepository;
        this.searchLogService = searchLogService;
        this.productAnalysisService = productAnalysisService;
        this.targetPriceAlertService = targetPriceAlertService;
        this.productPlatformRepository = productPlatformRepository;
        this.productViewCounter = productViewCounter;
        this.eventPublisher = eventPublisher;
    }

    /**
     * 직접 등록할 카테고리가 존재하는 최하위 카테고리인지 확인한다. 스트리밍 등록({@link ProductRegisterStreamService})이
     * 업로드를 시작하기 전에 호출해, 잘못된 카테고리는 스트림을 열지 않고 일반 JSON 에러(400/404)로 응답하게 한다.
     *
     * @param categoryId 등록할 카테고리 ID
     * @throws CategoryNotFoundException 존재하지 않는 카테고리인 경우
     * @throws CategoryNotLeafException 최하위 카테고리가 아닌 경우
     */
    @Transactional(readOnly = true)
    public void validateLeafCategory(Long categoryId) {
        getLeafCategoryOrThrow(categoryId);
    }

    /**
     * 이미 업로드한 이미지 URL과 AI 사진 분석 결과로 직접 등록 상품을 저장한다. 판매 가격은 사용자가 입력한 값을
     * 그대로 쓰고, AI 사진 분석이 추정한 적정가와 그 판단 근거를 {@code suggestedPrice}/{@code analysisDescription}으로
     * 저장한다(분석은 등록에 필수 — 실패하면 스트리밍 등록이 저장 전에 취소한다). 응답에는 비교 매물 평균가
     * ({@code marketAveragePrice})도 포함한다.
     * 업로드와 AI 호출은 스트리밍 등록({@link ProductRegisterStreamService})이 트랜잭션 밖에서 먼저 하고, 여기서는 저장만 한다.
     *
     * @param memberId 등록하는 회원 ID
     * @param request 등록 요청 바디
     * @param imageUrls 업로드된 이미지 URL 목록(순서대로 저장)
     * @param analysis AI 사진 분석 결과
     * @return 등록된 상품
     * @throws CategoryNotFoundException 존재하지 않는 카테고리인 경우
     * @throws CategoryNotLeafException 최하위 카테고리가 아닌 경우
     */
    @Transactional
    public ProductResponse saveDirect(
            Long memberId, ProductCreateRequest request, List<String> imageUrls, ProductAiAnalysisResult analysis) {
        Member member = memberRepository.getReferenceById(memberId);
        Category category = getLeafCategoryOrThrow(request.categoryId());
        Product product = newDirectProduct(member, category, request, imageUrls);
        product.changeSuggestedPrice(analysis.suggestedPrice());
        product.changeAnalysisDescription(analysis.analysisDescription());
        Product saved = productRepository.save(product);
        // 커밋 후 시세 분석 1회(ProductRegisteredAnalysisListener) — 정기 배치를 기다리지 않고 바로 추천을 보여주기 위함
        eventPublisher.publishEvent(new ProductRegisteredEvent(saved.getId()));
        return ProductResponse.from(saved, null, calculateMarketAveragePrice(saved));
    }

    /**
     * 이미 업로드한 이미지 URL과 AI 사진 분석 결과로 AI 등록 상품을 저장한다. 가격은 AI가 추정한 참고용 시세로 채우고
     * (같은 값을 AI 제안가로도 저장, 등록 후 판매자가 직접 수정 가능), 거래 방식은 직거래(DIRECT)로, 배송 방법/희망 거래
     * 지역은 비워 둔다. 구매 일시/결함 여부는 사용자가 입력한 값을, 브랜드·태그는 AI가 추론한 값을 쓰고, 구성품은 AI 추론과
     * 사용자 입력을 합쳐 저장한다. 업로드와 AI 호출은 스트리밍 등록({@link ProductRegisterStreamService})이 먼저 한다.
     *
     * @param memberId 등록하는 회원 ID
     * @param analysis AI 사진 분석 결과
     * @param imageUrls 업로드된 이미지 URL 목록(순서대로 저장)
     * @param purchasedMonths 사용자가 입력한 구매 후 경과 개월 수(선택)
     * @param defectStatus 사용자가 입력한 결함(하자) 상태
     * @param includedItems 사용자가 추가로 입력한 구성품 이름 목록(선택, AI 추론 결과와 합쳐짐)
     * @return 등록된 상품
     * @throws CategoryNotFoundException AI가 반환한 카테고리가 존재하지 않는 경우
     * @throws CategoryNotLeafException AI가 반환한 카테고리가 최하위가 아닌 경우
     */
    @Transactional
    public ProductResponse saveFromAnalysis(
            Long memberId,
            ProductAiAnalysisResult analysis,
            List<String> imageUrls,
            Integer purchasedMonths,
            DefectStatus defectStatus,
            List<String> includedItems) {
        Member member = memberRepository.getReferenceById(memberId);
        Category category = getLeafCategoryOrThrow(analysis.categoryId());
        Product product =
                newAiProduct(member, category, analysis, imageUrls, purchasedMonths, defectStatus, includedItems);
        Product saved = productRepository.save(product);
        // 커밋 후 시세 분석 1회(ProductRegisteredAnalysisListener) — 정기 배치를 기다리지 않고 바로 추천을 보여주기 위함
        eventPublisher.publishEvent(new ProductRegisteredEvent(saved.getId()));
        return ProductResponse.from(saved, null, calculateMarketAveragePrice(saved));
    }

    private Product newDirectProduct(
            Member member, Category category, ProductCreateRequest request, List<String> imageUrls) {
        return Product.create(
                member,
                category,
                request.title(),
                request.brand(),
                request.description(),
                request.price(),
                request.condition(),
                request.defectStatus(),
                toPurchasedAt(request.purchasedMonths()),
                request.allowPriceSuggestion(),
                request.tradeMethod(),
                request.deliveryType(),
                request.preferredTradeRegion(),
                imageUrls,
                resolveTags(request.tags()),
                resolveComponents(request.includedItems()));
    }

    /** AI 등록 상품: 가격·제안가 = AI 추정가, 거래 방식 = 직거래, 구성품 = AI 추론 + 사용자 입력. */
    private Product newAiProduct(
            Member member,
            Category category,
            ProductAiAnalysisResult analysis,
            List<String> imageUrls,
            Integer purchasedMonths,
            DefectStatus defectStatus,
            List<String> includedItems) {
        Product product = Product.create(
                member,
                category,
                analysis.title(),
                analysis.brand(),
                analysis.description(),
                analysis.suggestedPrice(),
                analysis.condition(),
                defectStatus,
                toPurchasedAt(purchasedMonths),
                true,
                TradeMethod.DIRECT,
                null,
                null,
                imageUrls,
                resolveTags(analysis.tags()),
                resolveComponents(mergeNames(analysis.includedItems(), includedItems)));
        product.changeSuggestedPrice(analysis.suggestedPrice());
        product.changeAnalysisDescription(analysis.analysisDescription());
        return product;
    }

    /**
     * 상품 상세 정보를 조회한다. 우리 상품과 외부 수집 매물은 같은 ID 체계({@code items})라 ID만으로 찾고, 외부 매물도 같은
     * 응답 형태로 내려준다({@code source}로 구분). 가장 최근 시세 분석 판단({@code recommendation})과 그 분석의 비교 매물
     * 평균가({@code marketAveragePrice})도 함께 포함한다. 분석 이력이 없으면 판단은 {@code null}이고, 평균가는 같은 기준으로
     * 지금 수집된 매물에서 계산한다(비교 매물이 부족하면 {@code null}). 외부 매물은 번개장터를 다시 조회하지 않고 수집·재확인
     * 배치가 저장한 값만 쓴다. 판매자 본인이 조회하면 외부 플랫폼 게시 상태({@code platforms})·관심 수·조회수도 채운다.
     *
     * @param itemId 조회할 상품(또는 외부 매물) ID
     * @param memberId 조회하는 회원 ID(판매자 본인 여부 판단용)
     * @return 상품 상세 정보
     * @throws ProductNotFoundException 존재하지 않는 ID인 경우
     */
    @Transactional(readOnly = true)
    public ProductResponse getProduct(Long itemId, Long memberId) {
        Item item = itemRepository.findById(itemId).orElseThrow(() -> new ProductNotFoundException(itemId));
        Optional<ProductAnalysis> latest = productAnalysisRepository.findFirstByItemIdOrderByAnalyzedAtDesc(itemId);
        AnalysisRecommendation recommendation =
                latest.map(ProductAnalysis::getRecommendation).orElse(null);
        if (Hibernate.unproxy(item) instanceof PlatformListing listing) {
            Long averagePrice = latest.map(ProductAnalysis::getAveragePrice).orElseGet(() -> productAnalysisService
                    .calculateMarketAveragePrice(listing)
                    .orElse(null));
            return ProductResponse.fromListing(listing, recommendation, averagePrice);
        }
        Product product = (Product) Hibernate.unproxy(item);
        Long averagePrice =
                latest.map(ProductAnalysis::getAveragePrice).orElseGet(() -> calculateMarketAveragePrice(product));
        ProductResponse response = ProductResponse.from(product, recommendation, averagePrice);
        if (!product.isRegisteredBy(memberId)) {
            return response;
        }
        return response.withSellerStats(
                productPlatformRepository.findByProductId(product.getId()).stream()
                        .map(ProductPlatformSummaryResponse::from)
                        .toList(),
                interestRepository.countByItemId(product.getId()),
                product.getViewCount());
    }

    /**
     * 상품 상세 조회 1건을 조회수에 반영한다. 우리 상품만 세고, 판매자 본인 조회와 같은 회원의 24시간 내 재조회는 세지
     * 않는다({@link ProductViewCounter}). 없는 ID는 무시한다(상세 조회가 404로 응답).
     *
     * @param itemId 조회한 상품(또는 외부 매물) ID
     * @param memberId 조회한 회원 ID
     */
    @Transactional
    public void recordView(Long itemId, Long memberId) {
        productRepository
                .findById(itemId)
                .filter(product -> !product.isRegisteredBy(memberId))
                .filter(product -> productViewCounter.isFirstView(product.getId(), memberId))
                .ifPresent(product -> productRepository.incrementViewCount(product.getId()));
    }

    private Long calculateMarketAveragePrice(Product product) {
        return productAnalysisService.calculateMarketAveragePrice(product).orElse(null);
    }

    /**
     * 상품 목록을 커서 기반으로 조회한다(공개 목록 — 외부 게시 전 {@code DRAFT} 상품도 포함). 우리 회원 상품과 외부
     * 플랫폼에서 수집한 매물({@link PlatformListing})을 한 목록에 섞어 반환한다({@code source} 필드로 구분). 필터·정렬
     * 규칙은 {@link ProductSearchCondition}·{@link ProductSearchRepository} 참고 — 우리 상품 고유 정보(상태·등급·하자)로
     * 거르면 외부 매물은 빠진다. 각 항목의 가장 최근 시세 분석 판단({@code recommendation})/시세 평균가
     * ({@code marketAveragePrice})도 함께 포함한다(분석 이력이 없으면 {@code null}).
     *
     * <p>{@code cursor}는 이전 응답의 {@code nextCursor}를 그대로 돌려받는 불투명한 문자열이다(정렬값·등록일시·출처·ID를
     * 묶어 인코딩 — 가격순처럼 등록일시가 아닌 값으로 정렬해도 두 테이블을 이어서 페이징하기 위함). 정렬 기준이 다른
     * 요청의 커서는 거부한다.
     *
     * @param memberId 요청자 회원 ID(키워드 검색 로그 기록용)
     * @param condition 검색 조건
     * @param cursor 이전 페이지의 {@code nextCursor}(선택, {@code null}이면 첫 페이지)
     * @param size 페이지 크기
     * @return {@code hasNext}/{@code nextCursor}를 포함한 커서 페이지 응답
     * @throws InvalidProductSearchException 해석할 수 없는 커서인 경우
     */
    @Transactional(readOnly = true)
    public CursorPageResponse<ProductListItemResponse> getProducts(
            Long memberId, ProductSearchCondition condition, String cursor, int size) {
        ProductSearchCursor searchCursor = ProductSearchCursor.decode(cursor, condition.sort());
        searchLogService.record(memberId, condition.keyword());

        List<ProductSearchHit> hits = productSearchRepository.search(condition, searchCursor, size + 1);
        boolean hasNext = hits.size() > size;
        List<ProductSearchHit> pageHits = hasNext ? hits.subList(0, size) : hits;
        String nextCursor =
                hasNext ? pageHits.get(pageHits.size() - 1).toCursor().encode() : null;

        Map<Long, Product> products = productRepository.findAllById(idsOf(pageHits, ListingSource.OUR)).stream()
                .collect(Collectors.toMap(Product::getId, product -> product));
        Map<Long, PlatformListing> listings =
                platformListingRepository.findAllById(idsOf(pageHits, ListingSource.EXTERNAL)).stream()
                        .collect(Collectors.toMap(PlatformListing::getId, listing -> listing));
        Map<Long, ProductAnalysis> productAnalyses = findLatestAnalyses(List.copyOf(products.values()));
        Map<Long, ProductAnalysis> listingAnalyses = findLatestListingAnalyses(List.copyOf(listings.keySet()));

        // 조회 사이에 삭제된 항목은 건너뛴다(정렬 순서는 검색 결과 순서를 그대로 따른다).
        List<ProductListItemResponse> content = pageHits.stream()
                .map(hit -> hit.source() == ListingSource.OUR
                        ? Optional.ofNullable(products.get(hit.id()))
                                .map(product -> ProductListItemResponse.fromProduct(
                                        product, productAnalyses.get(product.getId())))
                        : Optional.ofNullable(listings.get(hit.id()))
                                .map(listing -> ProductListItemResponse.fromListing(
                                        listing, listingAnalyses.get(listing.getId()))))
                .flatMap(Optional::stream)
                .toList();
        return new CursorPageResponse<>(content, nextCursor, hasNext);
    }

    private static List<Long> idsOf(List<ProductSearchHit> hits, ListingSource source) {
        return hits.stream()
                .filter(hit -> hit.source() == source)
                .map(ProductSearchHit::id)
                .toList();
    }

    private Map<Long, ProductAnalysis> findLatestListingAnalyses(List<Long> listingIds) {
        if (listingIds.isEmpty()) {
            return Map.of();
        }
        return productAnalysisRepository.findLatestByItemIdIn(listingIds).stream()
                .collect(Collectors.toMap(
                        analysis -> analysis.getItem().getId(),
                        analysis -> analysis,
                        (existing, replacement) -> replacement));
    }

    /**
     * 인증된 본인이 등록한 상품 목록을 커서 기반으로 조회한다(정렬은 {@code id} 내림차순 고정, 본인 관리
     * 화면 용도).
     *
     * @param memberId 조회할 본인 회원 ID(호출 측에서 인증된 회원 ID를 그대로 넘길 것)
     * @param categoryId 카테고리 필터(선택, {@code null}이면 전체)
     * @param keyword 제목/설명 키워드 검색(선택, {@code null}이거나 공백이면 미적용)
     * @param status 상태 필터(선택, {@code null}이면 전체)
     * @param cursor 이전 페이지 마지막 상품의 {@code id}(선택, {@code null}이면 첫 페이지)
     * @param size 페이지 크기
     * @return {@code hasNext}/{@code nextCursor}를 포함한 커서 페이지 응답
     */
    @Transactional(readOnly = true)
    public CursorPageResponse<ProductSummaryResponse> getMyProducts(
            Long memberId, Long categoryId, String keyword, ProductStatus status, Long cursor, int size) {
        Specification<Product> spec = Specification.where(hasMemberId(memberId))
                .and(hasCategoryId(categoryId))
                .and(hasKeyword(keyword))
                .and(hasStatus(status))
                .and(idLessThan(cursor));
        return findProducts(spec, size);
    }

    private static final int POPULAR_WINDOW_DAYS = 7;
    private static final int POPULAR_LIMIT = 10;

    /**
     * 최근 {@value #POPULAR_WINDOW_DAYS}일간 관심상품(찜) 등록 수 상위 {@value #POPULAR_LIMIT}개
     * 우리 상품을 등록 수 내림차순으로 조회한다(외부 플랫폼 매물은 대상에서 제외). 각 상품의 가장
     * 최근 시세 분석 스냅샷도 함께 포함한다.
     *
     * @return 인기 상품 목록(관심상품 등록 수 내림차순). 등록 이력 자체가 없으면 빈 목록
     */
    @Transactional(readOnly = true)
    public List<ProductSummaryResponse> getPopularProducts() {
        LocalDateTime since = LocalDateTime.now().minusDays(POPULAR_WINDOW_DAYS);
        List<Long> popularProductIds =
                interestRepository.findPopularProductIds(since, PageRequest.of(0, POPULAR_LIMIT));
        if (popularProductIds.isEmpty()) {
            return List.of();
        }
        Map<Long, Product> productsById = productRepository.findAllById(popularProductIds).stream()
                .collect(Collectors.toMap(Product::getId, product -> product));
        List<Product> products = popularProductIds.stream()
                .map(productsById::get)
                .filter(product -> product != null)
                .toList();
        Map<Long, ProductAnalysis> analyses = findLatestAnalyses(products);
        return products.stream()
                .map(product -> ProductSummaryResponse.from(product, analyses.get(product.getId())))
                .toList();
    }

    private CursorPageResponse<ProductSummaryResponse> findProducts(Specification<Product> spec, int size) {
        Pageable pageable = PageRequest.of(0, size + 1, Sort.by(Sort.Direction.DESC, "id"));

        List<Product> products = productRepository.findAll(spec, pageable).getContent();
        Map<Long, ProductAnalysis> analyses = findLatestAnalyses(products);

        List<ProductSummaryResponse> items = products.stream()
                .map(product -> ProductSummaryResponse.from(product, analyses.get(product.getId())))
                .toList();
        return CursorPageResponse.of(items, size, ProductSummaryResponse::id);
    }

    /**
     * 상품 목록의 각 상품 ID에 대한 가장 최근 시세 분석 스냅샷(추천 판단 + 수집 데이터 기반 평균가)을
     * 한 번의 쿼리로 조회한다(N+1 방지). 맵 값이 스냅샷 객체 자체라 {@code recommendation} 필드가
     * {@code null}이어도 {@link Collectors#toMap}에서 NPE가 나지 않는다(NPE는 값 자체가 null일 때만
     * 발생).
     */
    private Map<Long, ProductAnalysis> findLatestAnalyses(List<Product> products) {
        if (products.isEmpty()) {
            return Map.of();
        }
        List<Long> productIds = products.stream().map(Product::getId).toList();
        return productAnalysisRepository.findLatestByItemIdIn(productIds).stream()
                .collect(Collectors.toMap(
                        analysis -> analysis.getItem().getId(),
                        analysis -> analysis,
                        (existing, replacement) -> replacement));
    }

    /**
     * 상품 수정 요청을 저장 전에 검사하고 상품의 현재 이미지 URL 목록을 반환한다. 스트리밍 수정
     * ({@link ProductRegisterStreamService})이 업로드를 시작하기 전에 호출해, 잘못된 요청은 스트림을 열지 않고 일반 JSON
     * 에러로 응답하게 하고, 반환값으로 이미지 구성이 바뀌었는지(AI 사진 분석이 필요한지) 판단한다.
     *
     * @param memberId 요청한 회원 ID
     * @param productId 수정할 상품 ID
     * @param request 수정 요청 바디
     * @param newImageCount 새로 추가할 이미지 파일 수
     * @return 상품의 현재(수정 전) 이미지 URL 목록(순서대로)
     * @throws ProductNotFoundException 존재하지 않는 상품인 경우
     * @throws ProductAccessDeniedException 본인이 등록한 상품이 아닌 경우
     * @throws CategoryNotFoundException 존재하지 않는 카테고리인 경우
     * @throws CategoryNotLeafException 최하위 카테고리가 아닌 경우
     * @throws ProductImageRequiredException 유지할 이미지와 새 파일을 합쳐 1장도 없는 경우
     */
    @Transactional(readOnly = true)
    public List<String> validateUpdate(Long memberId, Long productId, ProductUpdateRequest request, int newImageCount) {
        Product product = getProductOrThrow(productId);
        validateRegisteredBy(product, memberId);
        getLeafCategoryOrThrow(request.categoryId());
        validateImageCount(request, newImageCount);
        return product.getImages().stream().map(ProductImage::getImageUrl).toList();
    }

    /**
     * 상품 정보를 수정한다. 본인이 등록한 상품만 수정할 수 있다. 이미지는 유지할 기존 이미지 URL
     * ({@code request.imageUrls}) 뒤에 새로 업로드한 이미지 URL을 이어 붙인 순서로 전체 교체하고, 구매 일시는
     * {@code purchasedMonths}로 수정 시점 기준 다시 계산한다. 이미지 구성이 바뀌어 AI 사진 분석을 다시 했으면 그 결과로
     * AI 제안가/판단 근거({@code suggestedPrice}/{@code analysisDescription})만 갱신하고, 사용자가 입력한 값은 덮어쓰지
     * 않는다. 새 파일 업로드와 AI 호출은 스트리밍 수정({@link ProductRegisterStreamService})이 트랜잭션 밖에서 먼저 하고,
     * 여기서는 저장만 한다.
     *
     * @param memberId 요청한 회원 ID
     * @param productId 수정할 상품 ID
     * @param request 수정 요청 바디
     * @param newImageUrls 새로 업로드한 이미지 URL 목록(순서대로 기존 이미지 뒤에 붙음, 없으면 빈 목록)
     * @param analysis 최종 이미지 AI 사진 분석 결과(이미지가 그대로이거나 분석에 실패해 건너뛰었으면 {@code null} — 기존 값 유지)
     * @return 수정된 상품
     * @throws ProductNotFoundException 존재하지 않는 상품인 경우
     * @throws ProductAccessDeniedException 본인이 등록한 상품이 아닌 경우
     * @throws CategoryNotFoundException 존재하지 않는 카테고리인 경우
     * @throws CategoryNotLeafException 최하위 카테고리가 아닌 경우
     * @throws ProductImageRequiredException 유지할 이미지와 새 이미지를 합쳐 1장도 없는 경우
     */
    @Transactional
    public ProductResponse saveUpdate(
            Long memberId,
            Long productId,
            ProductUpdateRequest request,
            List<String> newImageUrls,
            ProductAiAnalysisResult analysis) {
        Product product = getProductOrThrow(productId);
        validateRegisteredBy(product, memberId);
        Category category = getLeafCategoryOrThrow(request.categoryId());
        validateImageCount(request, newImageUrls.size());
        List<String> imageUrls = Stream.concat(keptImageUrls(request).stream(), newImageUrls.stream())
                .toList();

        product.update(
                category,
                request.title(),
                request.brand(),
                request.description(),
                request.price(),
                request.status(),
                request.condition(),
                request.defectStatus(),
                toPurchasedAt(request.purchasedMonths()),
                request.allowPriceSuggestion(),
                request.tradeMethod(),
                request.deliveryType(),
                request.preferredTradeRegion());

        product.clearImages();
        productRepository.flush();
        product.addImages(imageUrls);

        product.clearTags();
        product.addTags(resolveTags(request.tags()));

        product.clearComponents();
        product.addComponents(resolveComponents(request.includedItems()));

        if (analysis != null) {
            product.changeSuggestedPrice(analysis.suggestedPrice());
            product.changeAnalysisDescription(analysis.analysisDescription());
        }

        // 가격이 바뀌었으면 이 상품에 목표가를 건 관심 회원에게 도달 알림(가격이 오르면 알림 기록 초기화)
        targetPriceAlertService.checkProduct(product.getId());

        return ProductResponse.from(product);
    }

    private static List<String> keptImageUrls(ProductUpdateRequest request) {
        return request.imageUrls() == null ? List.of() : request.imageUrls();
    }

    private static void validateImageCount(ProductUpdateRequest request, int newImageCount) {
        if (keptImageUrls(request).isEmpty() && newImageCount == 0) {
            throw new ProductImageRequiredException();
        }
    }

    /**
     * 상품 게시 상태만 변경한다. 본인이 등록한 상품만 변경할 수 있다.
     *
     * @param memberId 요청한 회원 ID
     * @param productId 상태를 변경할 상품 ID
     * @param status 변경할 상태
     * @return 변경된 상품
     * @throws ProductNotFoundException 존재하지 않는 상품인 경우
     * @throws ProductAccessDeniedException 본인이 등록한 상품이 아닌 경우
     */
    @Transactional
    public ProductResponse updateStatus(Long memberId, Long productId, ProductStatus status) {
        Product product = getProductOrThrow(productId);
        validateRegisteredBy(product, memberId);

        product.changeStatus(status);

        return ProductResponse.from(product);
    }

    /**
     * 상품을 삭제한다. 본인이 등록한 상품만 삭제할 수 있다.
     *
     * @param memberId 요청한 회원 ID
     * @param productId 삭제할 상품 ID
     * @throws ProductNotFoundException 존재하지 않는 상품인 경우
     * @throws ProductAccessDeniedException 본인이 등록한 상품이 아닌 경우
     */
    @Transactional
    public void delete(Long memberId, Long productId) {
        Product product = getProductOrThrow(productId);
        validateRegisteredBy(product, memberId);
        productRepository.delete(product);
    }

    private Product getProductOrThrow(Long productId) {
        return productRepository.findById(productId).orElseThrow(() -> new ProductNotFoundException(productId));
    }

    /** 상품은 최하위 카테고리에만 등록할 수 있다(번개장터 등록 화면이 최하위까지 선택을 요구). */
    private Category getLeafCategoryOrThrow(Long categoryId) {
        Category category =
                categoryRepository.findById(categoryId).orElseThrow(() -> new CategoryNotFoundException(categoryId));
        if (!category.isLeaf()) {
            throw new CategoryNotLeafException(categoryId);
        }
        return category;
    }

    /**
     * 구매 후 경과 개월 수를 호출 시점(등록/수정) 기준 구매일시로 변환한다.
     *
     * @param purchasedMonths 구매 후 경과 개월 수(선택)
     * @return {@code purchasedMonths}가 {@code null}이면 {@code null}, 아니면 오늘로부터
     *     {@code purchasedMonths}개월 전 날짜
     */
    private static LocalDate toPurchasedAt(Integer purchasedMonths) {
        return purchasedMonths == null ? null : LocalDate.now().minusMonths(purchasedMonths);
    }

    /**
     * 태그 이름 목록을 집합으로 변환한다.
     * 이미 존재하는 태그는 재사용한다.
     * 존재하지 않는 이름은 새 태그로 저장한 뒤 함께 반환한다.
     *
     * @param tagNames 태그 이름 목록
     * @return 기존 태그와 신규 생성된 태그를 합친 집합
     */
    private Set<Tag> resolveTags(List<String> tagNames) {
        if (tagNames == null || tagNames.isEmpty()) {
            return Set.of();
        }
        List<String> distinctNames = tagNames.stream().distinct().toList();
        List<Tag> existingTags = tagRepository.findAllByNameIn(distinctNames);
        Set<String> existingNames = existingTags.stream().map(Tag::getName).collect(Collectors.toSet());

        List<Tag> newTags = distinctNames.stream()
                .filter(name -> !existingNames.contains(name))
                .map(Tag::of)
                .toList();
        tagRepository.saveAll(newTags);

        Set<Tag> tags = new LinkedHashSet<>(existingTags);
        tags.addAll(newTags);
        return tags;
    }

    /**
     * AI가 추론한 이름 목록(태그/구성품)과 사용자가 직접 입력한 이름 목록을 하나로 합친다(중복은
     * {@link #resolveTags}/{@link #resolveComponents}에서 제거됨).
     *
     * @param aiInferredNames AI가 사진에서 추론한 이름 목록(null 가능)
     * @param userInputNames 사용자가 직접 입력한 이름 목록(null 가능)
     * @return 두 목록을 합친 이름 목록
     */
    private static List<String> mergeNames(List<String> aiInferredNames, List<String> userInputNames) {
        return Stream.concat(
                        aiInferredNames == null ? Stream.<String>empty() : aiInferredNames.stream(),
                        userInputNames == null ? Stream.<String>empty() : userInputNames.stream())
                .toList();
    }

    /**
     * 구성품 이름 목록을 집합으로 변환한다.
     * 이미 존재하는 구성품은 재사용한다.
     * 존재하지 않는 이름은 새 구성품으로 저장한 뒤 함께 반환한다.
     *
     * @param componentNames 구성품 이름 목록
     * @return 기존 구성품과 신규 생성된 구성품을 합친 집합
     */
    private Set<Component> resolveComponents(List<String> componentNames) {
        if (componentNames == null || componentNames.isEmpty()) {
            return Set.of();
        }
        List<String> distinctNames = componentNames.stream().distinct().toList();
        List<Component> existingComponents = componentRepository.findAllByNameIn(distinctNames);
        Set<String> existingNames =
                existingComponents.stream().map(Component::getName).collect(Collectors.toSet());

        List<Component> newComponents = distinctNames.stream()
                .filter(name -> !existingNames.contains(name))
                .map(Component::of)
                .toList();
        componentRepository.saveAll(newComponents);

        Set<Component> components = new LinkedHashSet<>(existingComponents);
        components.addAll(newComponents);
        return components;
    }

    /**
     * 상품을 등록한 회원 본인인지 확인한다.
     *
     * @param product 확인할 상품
     * @param memberId 요청한 회원 ID
     * @throws ProductAccessDeniedException 본인이 등록한 상품이 아닌 경우
     */
    private void validateRegisteredBy(Product product, Long memberId) {
        if (!product.isRegisteredBy(memberId)) {
            throw new ProductAccessDeniedException(product.getId());
        }
    }

    private static Specification<Product> hasMemberId(Long memberId) {
        return (root, query, cb) ->
                memberId == null ? null : cb.equal(root.get("member").get("id"), memberId);
    }

    private static Specification<Product> hasCategoryId(Long categoryId) {
        return (root, query, cb) ->
                categoryId == null ? null : cb.equal(root.get("category").get("id"), categoryId);
    }

    private static Specification<Product> hasStatus(ProductStatus status) {
        return (root, query, cb) -> status == null ? null : cb.equal(root.get("status"), status);
    }

    /** 제목/설명에 키워드가 포함된 상품만 조회한다(대소문자 무시). */
    private static Specification<Product> hasKeyword(String keyword) {
        return (root, query, cb) -> {
            if (keyword == null || keyword.isBlank()) {
                return null;
            }
            String pattern = "%" + keyword.trim().toLowerCase() + "%";
            return cb.or(
                    cb.like(cb.lower(root.get("title")), pattern), cb.like(cb.lower(root.get("description")), pattern));
        };
    }

    private static Specification<Product> idLessThan(Long cursor) {
        return (root, query, cb) -> cursor == null ? null : cb.lessThan(root.get("id"), cursor);
    }
}
