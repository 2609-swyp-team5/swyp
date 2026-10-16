package com.swyp.team5.product.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
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
import com.swyp.team5.category.entity.SelectedCategoryOption;
import com.swyp.team5.category.error.CategoryNotFoundException;
import com.swyp.team5.category.error.CategoryNotLeafException;
import com.swyp.team5.category.error.InvalidCategoryOptionException;
import com.swyp.team5.category.repository.CategoryRepository;
import com.swyp.team5.category.service.CategoryOptionService;
import com.swyp.team5.common.common.CursorPageResponse;
import com.swyp.team5.component.entity.Component;
import com.swyp.team5.component.repository.ComponentRepository;
import com.swyp.team5.interest.repository.InterestRepository;
import com.swyp.team5.interest.repository.InterestRepository.InterestedItem;
import com.swyp.team5.interest.service.TargetPriceAlertService;
import com.swyp.team5.item.entity.Item;
import com.swyp.team5.item.entity.ListingSource;
import com.swyp.team5.item.repository.ItemRepository;
import com.swyp.team5.member.entity.Member;
import com.swyp.team5.member.repository.MemberRepository;
import com.swyp.team5.notification.repository.NotificationRepository;
import com.swyp.team5.platform.entity.PlatformListing;
import com.swyp.team5.platform.entity.ProductPlatformStatus;
import com.swyp.team5.platform.repository.PlatformListingRepository;
import com.swyp.team5.platform.repository.ProductPlatformRepository;
import com.swyp.team5.product.dto.ProductAiAnalysisResult;
import com.swyp.team5.product.dto.ProductCreateRequest;
import com.swyp.team5.product.dto.ProductDetailSummaryResponse;
import com.swyp.team5.product.dto.ProductDetailSummaryResponse.PlatformLink;
import com.swyp.team5.product.dto.ProductListItemResponse;
import com.swyp.team5.product.dto.ProductPlatformSummaryResponse;
import com.swyp.team5.product.dto.ProductResponse;
import com.swyp.team5.product.dto.ProductSearchCondition;
import com.swyp.team5.product.dto.ProductSearchCursor;
import com.swyp.team5.product.dto.ProductSearchHit;
import com.swyp.team5.product.dto.ProductSummaryResponse;
import com.swyp.team5.product.dto.ProductUpdateRequest;
import com.swyp.team5.product.entity.DefectStatus;
import com.swyp.team5.product.entity.DeliveryType;
import com.swyp.team5.product.entity.IncludedStatus;
import com.swyp.team5.product.entity.Product;
import com.swyp.team5.product.entity.ProductCondition;
import com.swyp.team5.product.entity.ProductImage;
import com.swyp.team5.product.entity.ProductStatus;
import com.swyp.team5.product.entity.TradeMethod;
import com.swyp.team5.product.error.InvalidProductRequestException;
import com.swyp.team5.product.error.InvalidProductSearchException;
import com.swyp.team5.product.error.ProductAccessDeniedException;
import com.swyp.team5.product.error.ProductImageLimitExceededException;
import com.swyp.team5.product.error.ProductImageRequiredException;
import com.swyp.team5.product.error.ProductNotFoundException;
import com.swyp.team5.product.event.ProductPriceChangedEvent;
import com.swyp.team5.product.event.ProductRegisteredEvent;
import com.swyp.team5.product.repository.ProductRepository;
import com.swyp.team5.product.repository.ProductSearchRepository;
import com.swyp.team5.productanalysis.dto.CompetitionSortType;
import com.swyp.team5.productanalysis.dto.ProductCompetitionResponse;
import com.swyp.team5.productanalysis.entity.AnalysisRecommendation;
import com.swyp.team5.productanalysis.entity.ProductAnalysis;
import com.swyp.team5.productanalysis.repository.PriceForecastRepository;
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
    private final PriceForecastRepository priceForecastRepository;
    private final NotificationRepository notificationRepository;
    private final ProductViewCounter productViewCounter;
    private final ApplicationEventPublisher eventPublisher;
    private final CategoryOptionService categoryOptionService;

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
            PriceForecastRepository priceForecastRepository,
            NotificationRepository notificationRepository,
            ProductViewCounter productViewCounter,
            ApplicationEventPublisher eventPublisher,
            CategoryOptionService categoryOptionService) {
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
        this.priceForecastRepository = priceForecastRepository;
        this.notificationRepository = notificationRepository;
        this.productViewCounter = productViewCounter;
        this.eventPublisher = eventPublisher;
        this.categoryOptionService = categoryOptionService;
    }

    /**
     * 직접 등록 요청을 업로드 전에 검증한다 — 존재하는 최하위 카테고리인지와 카테고리별 추가 항목. 스트리밍
     * 등록이 스트림을 열기 전에 호출해 잘못된 입력은 일반 JSON 에러(400/404)로 응답하게 한다.
     *
     * @throws CategoryNotFoundException 존재하지 않는 카테고리인 경우
     * @throws CategoryNotLeafException 최하위 카테고리가 아닌 경우
     * @throws InvalidCategoryOptionException 추가 항목이 옵션 정의와 맞지 않거나 필수 항목이 빠진 경우
     */
    @Transactional(readOnly = true)
    public void validateCreate(ProductCreateRequest request) {
        ProductRegistrationPolicy.validateProductFields(
                request.title(), request.description(), request.price(), request.tags(), request.includedStatus());
        ProductRegistrationPolicy.validateTrade(
                request.tradeMethod(), request.deliveryType(), request.deliveryFee(), request.preferredTradeRegion());
        getLeafCategoryOrThrow(request.categoryId());
        categoryOptionService.resolve(request.categoryId(), request.categoryOptions());
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
     * @throws InvalidCategoryOptionException 추가 항목이 옵션 정의와 맞지 않거나 필수 항목이 빠진 경우
     */
    @Transactional
    public ProductResponse saveDirect(
            Long memberId, ProductCreateRequest request, List<String> imageUrls, ProductAiAnalysisResult analysis) {
        Member member = memberRepository.getReferenceById(memberId);
        Category category = getLeafCategoryOrThrow(request.categoryId());
        Product product = newDirectProduct(member, category, request, imageUrls);
        product.replaceCategoryOptions(categoryOptionService.resolve(category.getId(), request.categoryOptions()));
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
        return saveFromAnalysisInternal(
                memberId,
                analysis,
                imageUrls,
                purchasedMonths,
                defectStatus,
                includedItems,
                null,
                null,
                null,
                null,
                null,
                null);
    }

    /** 새 AI 등록 화면의 상태·구성품·거래 방식을 저장한다. */
    @Transactional
    public ProductResponse saveFromAnalysis(
            Long memberId,
            ProductAiAnalysisResult analysis,
            List<String> imageUrls,
            Integer purchasedMonths,
            DefectStatus defectStatus,
            List<String> includedItems,
            ProductCondition selectedCondition,
            IncludedStatus includedStatus,
            TradeMethod tradeMethod,
            DeliveryType deliveryType,
            Long deliveryFee,
            String preferredTradeRegion) {
        // AI가 만든 값은 사용자가 고칠 수 없으므로 거절하지 않고 저장 가능한 범위로 맞춘 뒤 검증한다
        ProductAiAnalysisResult normalized = ProductRegistrationPolicy.normalizeAiAnalysis(analysis);
        ProductRegistrationPolicy.validateAiAnalysis(normalized, includedStatus);
        if (selectedCondition == null) {
            throw new InvalidProductRequestException("condition", "상품 상태를 선택해 주세요.");
        }
        ProductRegistrationPolicy.validateTrade(tradeMethod, deliveryType, deliveryFee, preferredTradeRegion);
        return saveFromAnalysisInternal(
                memberId,
                analysis,
                imageUrls,
                purchasedMonths,
                defectStatus,
                includedItems,
                selectedCondition,
                includedStatus,
                tradeMethod,
                deliveryType,
                deliveryFee,
                preferredTradeRegion);
    }

    @Transactional
    private ProductResponse saveFromAnalysisInternal(
            Long memberId,
            ProductAiAnalysisResult analysis,
            List<String> imageUrls,
            Integer purchasedMonths,
            DefectStatus defectStatus,
            List<String> includedItems,
            ProductCondition selectedCondition,
            IncludedStatus includedStatus,
            TradeMethod tradeMethod,
            DeliveryType deliveryType,
            Long deliveryFee,
            String preferredTradeRegion) {
        // AI가 만든 값은 사용자가 고칠 수 없으므로 거절하지 않고 저장 가능한 범위(가격·태그 수·글자 수)로 맞춘다
        ProductAiAnalysisResult normalized = ProductRegistrationPolicy.normalizeAiAnalysis(analysis);
        Member member = memberRepository.getReferenceById(memberId);
        Category category = getLeafCategoryOrThrow(normalized.categoryId());
        Product product = newAiProduct(
                member,
                category,
                normalized,
                imageUrls,
                purchasedMonths,
                defectStatus,
                includedItems,
                selectedCondition,
                includedStatus,
                tradeMethod,
                deliveryType,
                deliveryFee,
                preferredTradeRegion);
        product.replaceCategoryOptions(categoryOptionService.resolve(category.getId(), null));
        Product saved = productRepository.save(product);
        // 커밋 후 시세 분석 1회(ProductRegisteredAnalysisListener) — 정기 배치를 기다리지 않고 바로 추천을 보여주기 위함
        eventPublisher.publishEvent(new ProductRegisteredEvent(saved.getId()));
        return ProductResponse.from(saved, null, calculateMarketAveragePrice(saved));
    }

    private Product newDirectProduct(
            Member member, Category category, ProductCreateRequest request, List<String> imageUrls) {
        Product product = Product.create(
                member,
                category,
                request.title(),
                request.brand(),
                request.description(),
                request.price(),
                request.condition(),
                request.defectStatus() == null ? DefectStatus.NORMAL : request.defectStatus(),
                toPurchasedAt(request.purchasedMonths()),
                request.allowPriceSuggestion(),
                request.tradeMethod(),
                request.tradeMethod() == TradeMethod.DELIVERY ? request.deliveryType() : null,
                request.tradeMethod() == TradeMethod.DIRECT ? request.preferredTradeRegion() : null,
                imageUrls,
                resolveTags(request.tags()),
                resolveComponents(resolveIncludedItems(request.includedStatus(), request.includedItems())));
        product.changeDeliveryFee(
                normalizeDeliveryFee(request.tradeMethod(), request.deliveryType(), request.deliveryFee()));
        return product;
    }

    /** AI 등록 상품: AI 분석값을 기본으로 사용하고 화면에서 선택한 값을 우선 저장한다. */
    private Product newAiProduct(
            Member member,
            Category category,
            ProductAiAnalysisResult analysis,
            List<String> imageUrls,
            Integer purchasedMonths,
            DefectStatus defectStatus,
            List<String> includedItems,
            ProductCondition selectedCondition,
            IncludedStatus includedStatus,
            TradeMethod selectedTradeMethod,
            DeliveryType deliveryType,
            Long deliveryFee,
            String preferredTradeRegion) {
        ProductCondition condition = selectedCondition == null ? analysis.condition() : selectedCondition;
        TradeMethod tradeMethod = selectedTradeMethod == null ? TradeMethod.DIRECT : selectedTradeMethod;
        Product product = Product.create(
                member,
                category,
                analysis.title(),
                analysis.brand(),
                analysis.description(),
                analysis.suggestedPrice(),
                condition,
                defectStatus == null ? DefectStatus.NORMAL : defectStatus,
                toPurchasedAt(purchasedMonths),
                true,
                tradeMethod,
                tradeMethod == TradeMethod.DELIVERY ? deliveryType : null,
                tradeMethod == TradeMethod.DIRECT ? preferredTradeRegion : null,
                imageUrls,
                resolveTags(analysis.tags()),
                resolveComponents(
                        includedStatus == null
                                ? mergeNames(analysis.includedItems(), includedItems)
                                : resolveIncludedItems(includedStatus, null)));
        product.changeDeliveryFee(normalizeDeliveryFee(tradeMethod, deliveryType, deliveryFee));
        product.changeSuggestedPrice(analysis.suggestedPrice());
        product.changeAnalysisDescription(analysis.analysisDescription());
        return product;
    }

    /**
     * 상품 상세 정보를 조회한다. 우리 상품과 외부 수집 매물은 같은 ID 체계({@code items})라 ID만으로 찾고, 외부 매물도 같은
     * 응답 형태로 내려준다({@code source}로 구분). 가장 최근 시세 분석 판단({@code recommendation})과 그 분석의 비교 매물
     * 평균가({@code marketAveragePrice})도 함께 포함한다. 분석 이력이 없으면 둘 다 {@code null}이다 — AI가 같은 물건을 고르기
     * 전의 단순 유사 매물 평균은 세트·낱개처럼 다른 물건이 섞여 "평균보다 몇 % 높아요" 같은 비교를 잘못 보여 줄 수 있어 쓰지 않는다. 외부 매물은 번개장터를 다시 조회하지 않고 수집·재확인
     * 배치가 저장한 값만 쓴다. 관심 수·조회수(외부 매물은 관심 수만)는 모든 조회자에게 채우고, 외부 플랫폼 게시 상태
     * ({@code platforms})는 판매자 본인이 조회할 때만 채운다.
     *
     * @param itemId 조회할 상품(또는 외부 매물) ID
     * @param memberId 조회하는 회원 ID(판매자 본인 여부 판단용, 비로그인이면 null)
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
            Long averagePrice = latest.map(ProductAnalysis::getAveragePrice).orElse(null);
            return ProductResponse.fromListing(listing, recommendation, averagePrice)
                    .withStats(null, interestRepository.countByItemId(listing.getId()), null)
                    .withInterest(findInterestId(memberId, itemId));
        }
        Product product = (Product) Hibernate.unproxy(item);
        Long averagePrice = latest.map(ProductAnalysis::getAveragePrice).orElse(null);
        List<ProductPlatformSummaryResponse> platforms = product.isRegisteredBy(memberId)
                ? productPlatformRepository.findByProductId(product.getId()).stream()
                        .map(ProductPlatformSummaryResponse::from)
                        .toList()
                : null;
        return ProductResponse.from(product, recommendation, averagePrice, product.isRegisteredBy(memberId))
                .withStats(platforms, interestRepository.countByItemId(product.getId()), product.getViewCount())
                .withInterest(findInterestId(memberId, itemId));
    }

    /**
     * 상품 상세 요약(판매 관리 화면 요약 영역)을 조회한다. 로그인 회원 누구에게나 공개하되, 최종 판매 정보(가격·플랫폼)는
     * 판매자 본인에게만 채운다 — 게시 플랫폼은 우리 상품이면 게시 완료(POSTED)된 외부 게시글 링크, 외부 매물이면 원본 매물
     * 링크 1건. 시세 정보는 포함하지 않는다.
     *
     * @param itemId 조회할 상품(또는 외부 매물) ID
     * @param memberId 조회하는 회원 ID(최종 판매 정보 공개 여부 판단용)
     * @return 상품 상세 요약
     * @throws ProductNotFoundException 존재하지 않는 ID인 경우
     */
    @Transactional(readOnly = true)
    public ProductDetailSummaryResponse getProductSummary(Long itemId, Long memberId) {
        Item item = itemRepository.findById(itemId).orElseThrow(() -> new ProductNotFoundException(itemId));
        long interestCount = interestRepository.countByItemId(itemId);
        LocalDate today = LocalDate.now();
        if (Hibernate.unproxy(item) instanceof PlatformListing listing) {
            List<PlatformLink> platforms = listing.getListingUrl() == null
                    ? List.of()
                    : List.of(new PlatformLink(listing.getPlatform().getName(), listing.getListingUrl()));
            ProductResponse detail =
                    ProductResponse.fromListing(listing, null, null).withStats(null, interestCount, null);
            return ProductDetailSummaryResponse.of(detail, platforms, today);
        }
        Product product = (Product) Hibernate.unproxy(item);
        List<PlatformLink> platforms = productPlatformRepository.findByProductId(product.getId()).stream()
                .filter(productPlatform -> productPlatform.getStatus() == ProductPlatformStatus.POSTED)
                .filter(productPlatform -> productPlatform.getProductUrl() != null)
                .map(productPlatform -> new PlatformLink(
                        productPlatform.getMemberPlatform().getPlatform().getName(), productPlatform.getProductUrl()))
                .toList();
        ProductResponse detail = ProductResponse.from(product, null, null, product.isRegisteredBy(memberId))
                .withStats(null, interestCount, product.getViewCount());
        return ProductDetailSummaryResponse.of(detail, platforms, today);
    }

    /**
     * 상품 상세 조회 1건을 조회수에 반영한다. 우리 상품만 세고, 판매자 본인 조회와 같은 조회자의 24시간 내 재조회는 세지
     * 않는다({@link ProductViewCounter}) — 회원은 회원 단위, 비회원은 IP 단위로 구분한다. 없는 ID는 무시한다(상세 조회가
     * 404로 응답).
     *
     * @param itemId 조회한 상품(또는 외부 매물) ID
     * @param memberId 조회한 회원 ID(비로그인이면 null)
     * @param clientIp 요청 IP(비회원 구분용)
     */
    @Transactional
    public void recordView(Long itemId, Long memberId, String clientIp) {
        String viewerKey = ProductViewCounter.viewerKey(memberId, clientIp);
        productRepository
                .findById(itemId)
                .filter(product -> memberId == null || !product.isRegisteredBy(memberId))
                .filter(product -> productViewCounter.isFirstView(product.getId(), viewerKey))
                .ifPresent(product -> productRepository.incrementViewCount(product.getId()));
    }

    /**
     * 수집한 외부 매물 중 기준 상품과 같은 유형의 판매 중 매물(경쟁 상품)을 조회한다. 상품명 키워드로 고르며 AI는 호출하지
     * 않는다 — 시세 분석과 같은 매물 필터를 쓰므로 계산은 {@link ProductAnalysisService#getCompetition}에 맡긴다.
     *
     * @param sort 목록 정렬(기본 최신 등록 순)
     * @throws ProductNotFoundException 존재하지 않는 상품(외부 매물 포함)인 경우
     */
    @Transactional(readOnly = true)
    public ProductCompetitionResponse getCompetition(Long productId, CompetitionSortType sort) {
        return productAnalysisService.getCompetition(productId, sort);
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
        Map<Long, Long> interestIds = findInterestIds(
                memberId, pageHits.stream().map(ProductSearchHit::id).toList());

        // 조회 사이에 삭제된 항목은 건너뛴다(정렬 순서는 검색 결과 순서를 그대로 따른다).
        List<ProductListItemResponse> content = pageHits.stream()
                .map(hit -> hit.source() == ListingSource.OUR
                        ? Optional.ofNullable(products.get(hit.id()))
                                .map(product -> ProductListItemResponse.fromProduct(
                                        product,
                                        productAnalyses.get(product.getId()),
                                        interestIds.get(product.getId())))
                        : Optional.ofNullable(listings.get(hit.id()))
                                .map(listing -> ProductListItemResponse.fromListing(
                                        listing,
                                        listingAnalyses.get(listing.getId()),
                                        interestIds.get(listing.getId()))))
                .flatMap(Optional::stream)
                .toList();
        CursorPageResponse<ProductListItemResponse> page =
                new CursorPageResponse<>(content, nextCursor, hasNext, null, null);
        // 전체 건수는 첫 페이지에서만 센다(스크롤마다 COUNT를 돌리지 않음). 검색 로그도 첫 페이지에서만 결과 건수와 함께
        // 남긴다(다음 페이지 요청마다 같은 검색이 여러 번 집계되지 않게)
        if (cursor != null) {
            return page;
        }
        long totalCount = productSearchRepository.count(condition);
        searchLogService.record(memberId, condition.keyword(), totalCount);
        return page.withTotalCount(totalCount);
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
     * @param status 상태 필터(선택, 복수 — 비어 있거나 {@code null}이면 전체)
     * @param cursor 이전 페이지 마지막 상품의 {@code id}(선택, {@code null}이면 첫 페이지)
     * @param size 페이지 크기
     * @return {@code hasNext}/{@code nextCursor}를 포함한 커서 페이지 응답. {@code totalCount}는 요청 필터를 모두 적용한 건수,
     *     {@code statusCounts}는 탭 숫자용이라 상태 필터만 빼고(카테고리·키워드는 적용) 센 상태별 건수
     */
    @Transactional(readOnly = true)
    public CursorPageResponse<ProductSummaryResponse> getMyProducts(
            Long memberId, Long categoryId, String keyword, Set<ProductStatus> status, Long cursor, int size) {
        Specification<Product> withoutStatus = Specification.where(hasMemberId(memberId))
                .and(hasCategoryId(categoryId))
                .and(hasKeyword(keyword));
        CursorPageResponse<ProductSummaryResponse> page =
                findProducts(withoutStatus.and(hasStatusIn(status)).and(idLessThan(cursor)), size);
        // 건수는 매 페이지 센다(회원 본인 상품이라 부담이 작음). 상태별 건수는 어느 탭을 요청해도 모든 탭 숫자를 채우도록 상태 필터 없이
        // GROUP BY 한 번으로 세고, 전체 건수는 그중 요청한 상태(없으면 전부)의 합이다
        Map<ProductStatus, Long> counted = productRepository.countByStatus(withoutStatus);
        long total = counted.entrySet().stream()
                .filter(entry -> status == null || status.isEmpty() || status.contains(entry.getKey()))
                .mapToLong(Map.Entry::getValue)
                .sum();
        return page.withTotalCount(total).withStatusCounts(ProductStatus.toStatusCounts(counted));
    }

    private static final int POPULAR_WINDOW_DAYS = 7;
    private static final int POPULAR_LIMIT = 10;
    private static final List<ProductStatus> POPULAR_STATUSES = List.of(ProductStatus.ON_SALE, ProductStatus.RESERVED);

    /**
     * 판매중·예약중인 우리 상품 중 최근 {@value #POPULAR_WINDOW_DAYS}일간 관심상품(찜) 등록 수 상위 {@value #POPULAR_LIMIT}개를
     * 조회한다(외부 플랫폼 매물·임시저장·판매완료는 제외). {@value #POPULAR_LIMIT}개가 안 되면 나머지를 누적 관심 등록 수 → 조회수 →
     * 최신 순으로 채운다. 각 상품의 가장 최근 시세 분석 스냅샷도 함께 포함한다.
     *
     * @param memberId 조회하는 회원 ID(관심 등록 여부 표시용, 비로그인이면 null)
     * @return 인기 상품 목록(최근 관심 등록 순, 이어서 보충분). 판매중·예약중 상품이 없으면 빈 목록
     */
    @Transactional(readOnly = true)
    public List<ProductSummaryResponse> getPopularProducts(Long memberId) {
        LocalDateTime since = LocalDateTime.now().minusDays(POPULAR_WINDOW_DAYS);
        List<Long> popularProductIds = new ArrayList<>(
                interestRepository.findPopularProductIds(since, POPULAR_STATUSES, PageRequest.of(0, POPULAR_LIMIT)));
        if (popularProductIds.size() < POPULAR_LIMIT) {
            interestRepository
                    .findProductIdsByInterestAndViews(POPULAR_STATUSES, PageRequest.of(0, POPULAR_LIMIT))
                    .stream()
                    .filter(id -> !popularProductIds.contains(id))
                    .limit(POPULAR_LIMIT - popularProductIds.size())
                    .forEach(popularProductIds::add);
        }
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
        Map<Long, Long> interestIds = findInterestIds(memberId, productsById.keySet());
        return products.stream()
                .map(product -> ProductSummaryResponse.from(
                        product, analyses.get(product.getId()), false, interestIds.get(product.getId())))
                .toList();
    }

    /** 조회자가 관심 등록한 대상이면 그 관심 ID, 아니거나 비로그인이면 null. */
    private Long findInterestId(Long memberId, Long itemId) {
        return findInterestIds(memberId, List.of(itemId)).get(itemId);
    }

    /** 조회자가 관심 등록한 대상 ID → 관심 ID(한 번의 쿼리, 비로그인이거나 대상이 없으면 빈 맵). */
    private Map<Long, Long> findInterestIds(Long memberId, Collection<Long> itemIds) {
        if (memberId == null || itemIds.isEmpty()) {
            return Map.of();
        }
        return interestRepository.findInterestedItems(memberId, itemIds).stream()
                .collect(Collectors.toMap(InterestedItem::getItemId, InterestedItem::getInterestId));
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
     * @throws InvalidCategoryOptionException 추가 항목이 옵션 정의와 맞지 않거나 필수 항목이 빠진 경우
     */
    @Transactional(readOnly = true)
    public List<String> validateUpdate(Long memberId, Long productId, ProductUpdateRequest request, int newImageCount) {
        Product product = getProductOrThrow(productId);
        validateRegisteredBy(product, memberId);
        ProductRegistrationPolicy.validateProductFields(
                request.title(), request.description(), request.price(), request.tags(), request.includedStatus());
        ProductRegistrationPolicy.validateTrade(
                request.tradeMethod(), request.deliveryType(), request.deliveryFee(), request.preferredTradeRegion());
        getLeafCategoryOrThrow(request.categoryId());
        categoryOptionService.resolve(request.categoryId(), request.categoryOptions());
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
     * @throws InvalidCategoryOptionException 추가 항목이 옵션 정의와 맞지 않거나 필수 항목이 빠진 경우
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
        List<SelectedCategoryOption> categoryOptions =
                categoryOptionService.resolve(category.getId(), request.categoryOptions());
        List<String> imageUrls = Stream.concat(keptImageUrls(request).stream(), newImageUrls.stream())
                .toList();
        Long previousPrice = product.getPrice();

        product.update(
                category,
                request.title(),
                request.brand(),
                request.description(),
                request.price(),
                request.status(),
                request.condition(),
                request.defectStatus() == null ? product.getDefectStatus() : request.defectStatus(),
                request.purchasedMonths() == null ? product.getPurchasedAt() : toPurchasedAt(request.purchasedMonths()),
                request.allowPriceSuggestion(),
                request.tradeMethod(),
                request.tradeMethod() == TradeMethod.DELIVERY ? request.deliveryType() : null,
                request.tradeMethod() == TradeMethod.DIRECT ? request.preferredTradeRegion() : null);
        product.changeDeliveryFee(
                normalizeDeliveryFee(request.tradeMethod(), request.deliveryType(), request.deliveryFee()));
        product.replaceCategoryOptions(categoryOptions);

        product.clearImages();
        productRepository.flush();
        product.addImages(imageUrls);

        product.clearTags();
        product.addTags(resolveTags(request.tags()));

        product.clearComponents();
        product.addComponents(
                resolveComponents(resolveIncludedItems(request.includedStatus(), request.includedItems())));

        if (analysis != null) {
            product.changeSuggestedPrice(analysis.suggestedPrice());
            product.changeAnalysisDescription(analysis.analysisDescription());
        }

        // 가격이 바뀌었으면 이 상품에 목표가를 건 관심 회원에게 도달 알림(가격이 오르면 알림 기록 초기화)
        targetPriceAlertService.checkProduct(product.getId());
        // 가격이 바뀌었으면 시세 분석의 가격 비교 근거도 새 가격 기준으로
        if (!Objects.equals(previousPrice, product.getPrice())) {
            eventPublisher.publishEvent(new ProductPriceChangedEvent(product.getId()));
        }

        return ProductResponse.from(product);
    }

    private static List<String> keptImageUrls(ProductUpdateRequest request) {
        return request.imageUrls() == null ? List.of() : request.imageUrls();
    }

    private static void validateImageCount(ProductUpdateRequest request, int newImageCount) {
        int totalImageCount = keptImageUrls(request).size() + newImageCount;
        if (totalImageCount == 0) {
            throw new ProductImageRequiredException();
        }
        if (totalImageCount > 10) {
            throw new ProductImageLimitExceededException();
        }
    }

    /**
     * 상품 게시 상태만 변경한다. 본인이 등록한 상품만 변경할 수 있다.
     *
     * @param memberId 요청한 회원 ID
     * @param productId 상태를 변경할 상품 ID
     * @param status 변경할 상태
     * @param soldPrice 최종 판매 가격(판매 완료일 때만 저장, 미입력이면 null)
     * @param soldPlatform 최종 판매 플랫폼명(판매 완료일 때만 저장, 미입력이면 null)
     * @return 변경된 상품
     * @throws ProductNotFoundException 존재하지 않는 상품인 경우
     * @throws ProductAccessDeniedException 본인이 등록한 상품이 아닌 경우
     */
    @Transactional
    public ProductResponse updateStatus(
            Long memberId, Long productId, ProductStatus status, Long soldPrice, String soldPlatform) {
        Product product = getProductOrThrow(productId);
        validateRegisteredBy(product, memberId);

        product.changeStatus(status, soldPrice, soldPlatform);

        return ProductResponse.from(product);
    }

    /**
     * 상품의 판매 희망가만 변경한다. 본인이 등록한 상품만 변경할 수 있다. 외부 플랫폼에 게시된 글의 가격은 바꾸지 않고(상품 수정과
     * 같음), 시세 대비 차이({@code marketPriceDiffRate})는 조회할 때 새 가격으로 다시 계산된다. 가격이 바뀌면 가장 최근 시세 분석의
     * 가격 비교 근거도 새 가격 기준으로 다시 쓴다({@link ProductPriceChangedEvent}).
     *
     * @param memberId 요청한 회원 ID
     * @param productId 가격을 변경할 상품 ID
     * @param price 변경할 판매 희망가(0원 이상)
     * @return 변경된 상품
     * @throws ProductNotFoundException 존재하지 않는 상품인 경우
     * @throws ProductAccessDeniedException 본인이 등록한 상품이 아닌 경우
     */
    @Transactional
    public ProductResponse updatePrice(Long memberId, Long productId, Long price) {
        ProductRegistrationPolicy.validatePrice(price);
        Product product = getProductOrThrow(productId);
        validateRegisteredBy(product, memberId);

        boolean priceChanged = !price.equals(product.getPrice());
        product.changePrice(price);
        // 이 상품에 목표가를 건 관심 회원에게 도달 알림(가격이 오르면 알림 기록 초기화) — 전체 수정과 같게
        targetPriceAlertService.checkProduct(product.getId());
        if (priceChanged) {
            eventPublisher.publishEvent(new ProductPriceChangedEvent(product.getId()));
        }

        return ProductResponse.from(product);
    }

    /**
     * 상품을 삭제한다. 본인이 등록한 상품만 삭제할 수 있다.
     *
     * <p>상품을 참조하는 기록은 FK에 {@code ON DELETE}가 없어 먼저 지워야 한다(남아 있으면 FK 위반으로 409).
     * 감가 예측 → 시세 분석 → 알림·관심(다른 회원 것 포함) → 외부 플랫폼 게시 기록 순으로 지운 뒤 상품을 지운다.
     * 이미지·태그·구성품 연결은 엔티티 매핑으로 함께 지워진다. 외부 플랫폼에 올라간 매물 자체는 그대로 남는다.
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
        priceForecastRepository.deleteAllByItemId(productId);
        productAnalysisRepository.deleteAllByItemId(productId);
        notificationRepository.deleteAllByItemId(productId);
        interestRepository.deleteAllByItemId(productId);
        productPlatformRepository.deleteAllByProductId(productId);
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

    /** 새 화면의 구성품 상태를 기존 구성품 목록 저장 구조로 변환한다. */
    private static List<String> resolveIncludedItems(IncludedStatus includedStatus, List<String> legacyItems) {
        if (includedStatus == null) {
            return legacyItems;
        }
        return List.of(
                switch (includedStatus) {
                    case NONE -> "없음";
                    case PARTIAL -> "일부 포함";
                    case ALL -> "전체 포함";
                });
    }

    /** 직거래·배송비 포함에서는 배송비를 저장하지 않도록 정규화한다. */
    private static Long normalizeDeliveryFee(TradeMethod tradeMethod, DeliveryType deliveryType, Long deliveryFee) {
        return tradeMethod == TradeMethod.DELIVERY && deliveryType == DeliveryType.PREPAID ? deliveryFee : null;
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

    /** 상태 중 하나에 해당하는 상품만 조회한다(비어 있거나 {@code null}이면 미적용). */
    private static Specification<Product> hasStatusIn(Set<ProductStatus> statuses) {
        return (root, query, cb) -> statuses == null || statuses.isEmpty()
                ? null
                : root.get("status").in(statuses);
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
