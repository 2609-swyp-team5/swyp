package com.swyp.team5.product.service;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.swyp.team5.category.entity.Category;
import com.swyp.team5.category.error.CategoryNotFoundException;
import com.swyp.team5.category.repository.CategoryRepository;
import com.swyp.team5.common.common.CursorPageResponse;
import com.swyp.team5.file.service.FileStorageService;
import com.swyp.team5.member.entity.Member;
import com.swyp.team5.member.repository.MemberRepository;
import com.swyp.team5.product.dto.ProductAiAnalysisResult;
import com.swyp.team5.product.dto.ProductCreateRequest;
import com.swyp.team5.product.dto.ProductResponse;
import com.swyp.team5.product.dto.ProductSummaryResponse;
import com.swyp.team5.product.dto.ProductUpdateRequest;
import com.swyp.team5.product.entity.Product;
import com.swyp.team5.product.entity.ProductStatus;
import com.swyp.team5.product.entity.TradeMethod;
import com.swyp.team5.product.error.ProductAccessDeniedException;
import com.swyp.team5.product.error.ProductNotFoundException;
import com.swyp.team5.product.repository.ProductRepository;
import com.swyp.team5.productanalysis.entity.AnalysisRecommendation;
import com.swyp.team5.productanalysis.entity.ProductAnalysis;
import com.swyp.team5.productanalysis.repository.ProductAnalysisRepository;
import com.swyp.team5.tag.entity.Tag;
import com.swyp.team5.tag.repository.TagRepository;

/**
 * 상품(Product) 도메인의 등록/조회/수정/삭제를 담당하는 서비스.
 */
@Service
public class ProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final MemberRepository memberRepository;
    private final FileStorageService fileStorageService;
    private final ProductAiService productAiService;
    private final TagRepository tagRepository;
    private final ProductAnalysisRepository productAnalysisRepository;

    public ProductService(
            ProductRepository productRepository,
            CategoryRepository categoryRepository,
            MemberRepository memberRepository,
            FileStorageService fileStorageService,
            ProductAiService productAiService,
            TagRepository tagRepository,
            ProductAnalysisRepository productAnalysisRepository) {
        this.productRepository = productRepository;
        this.categoryRepository = categoryRepository;
        this.memberRepository = memberRepository;
        this.fileStorageService = fileStorageService;
        this.productAiService = productAiService;
        this.tagRepository = tagRepository;
        this.productAnalysisRepository = productAnalysisRepository;
    }

    /**
     * 상품을 직접 등록한다.
     *
     * @param memberId 등록하는 회원 ID
     * @param request 등록 요청 바디
     * @return 등록된 상품
     * @throws CategoryNotFoundException 존재하지 않는 카테고리인 경우
     */
    @Transactional
    public ProductResponse create(Long memberId, ProductCreateRequest request) {
        Member member = memberRepository.getReferenceById(memberId);
        Category category = getCategoryOrThrow(request.categoryId());

        Product product = Product.create(
                member,
                category,
                request.title(),
                request.description(),
                request.price(),
                request.condition(),
                request.hasDefect(),
                toPurchasedAt(request.purchasedMonths()),
                request.allowPriceSuggestion(),
                request.tradeMethod(),
                request.deliveryType(),
                request.preferredTradeRegion(),
                request.imageUrls(),
                resolveTags(request.tags()));

        return ProductResponse.from(productRepository.save(product));
    }

    /**
     * 상품 사진을 AI(Gemini)로 분석해 자동으로 등록한다. 가격은 AI가 추정한 참고용 시세로 채워지며
     * (실제 시세 데이터 기반은 아님, 등록 후 판매자가 직접 수정 가능), 거래 방식은 기본값
     * 직거래(DIRECT)로 등록되며, 배송 방법/희망 거래 지역은 비워둔 채 등록 후 수정으로 채운다.
     * 구매 일시/결함 여부는 AI가 추론하지 않고 사용자가 직접 입력한 값을 그대로 사용한다.
     *
     * @param memberId 등록하는 회원 ID
     * @param images 분석할 상품 이미지 목록
     * @param purchasedMonths 사용자가 입력한 구매 후 경과 개월 수(선택, 등록 시점 기준 구매일시로 변환)
     * @param hasDefect 사용자가 입력한 결함 여부
     * @return 등록된 상품
     * @throws CategoryNotFoundException 등록된 카테고리가 없거나 AI가 반환한 카테고리가 존재하지 않는 경우
     */
    @Transactional
    public ProductResponse createFromImages(
            Long memberId, List<MultipartFile> images, Integer purchasedMonths, boolean hasDefect) {
        Member member = memberRepository.getReferenceById(memberId);
        ProductAiAnalysisResult analysis = productAiService.analyze(images);
        Category category = getCategoryOrThrow(analysis.categoryId());
        List<String> imageUrls = images.stream()
                .map(image -> fileStorageService.upload(image, "products").url())
                .toList();

        Product product = Product.create(
                member,
                category,
                analysis.title(),
                analysis.description(),
                analysis.suggestedPrice(),
                analysis.condition(),
                hasDefect,
                toPurchasedAt(purchasedMonths),
                true,
                TradeMethod.DIRECT,
                null,
                null,
                imageUrls,
                resolveTags(analysis.tags()));

        return ProductResponse.from(productRepository.save(product));
    }

    /**
     * 상품 상세 정보를 조회한다. 가장 최근 시세 분석 판단({@code recommendation})도 함께 포함한다(분석
     * 이력이 없으면 {@code null}).
     *
     * @param productId 조회할 상품 ID
     * @return 상품 상세 정보
     * @throws ProductNotFoundException 존재하지 않는 상품인 경우
     */
    @Transactional(readOnly = true)
    public ProductResponse getProduct(Long productId) {
        Product product = getProductOrThrow(productId);
        AnalysisRecommendation recommendation = productAnalysisRepository
                .findFirstByProductIdOrderByAnalyzedAtDesc(productId)
                .map(ProductAnalysis::getRecommendation)
                .orElse(null);
        return ProductResponse.from(product, recommendation);
    }

    /**
     * 상품 목록을 커서 기반으로 조회한다(정렬은 {@code id} 내림차순 고정, {@code HIDDEN} 상태는 항상
     * 제외 — 공개 목록이므로 판매자가 숨긴 상품은 노출하지 않음). - 타이브레이커는 추후 적용 예정. 각
     * 상품의 가장 최근 시세 분석 판단({@code recommendation})도 함께 포함한다(분석 이력이 없으면
     * {@code null}).
     *
     * @param keyword 제목/설명 키워드 검색(선택, {@code null}이거나 공백이면 미적용)
     * @param status 상태 필터(선택, {@code null}이면 전체 — 단, {@code HIDDEN}은 지정해도 결과에서 제외)
     * @param cursor 이전 페이지 마지막 상품의 {@code id}(선택, {@code null}이면 첫 페이지)
     * @param size 페이지 크기
     * @return {@code hasNext}/{@code nextCursor}를 포함한 커서 페이지 응답
     */
    @Transactional(readOnly = true)
    public CursorPageResponse<ProductSummaryResponse> getProducts(
            String keyword, ProductStatus status, Long cursor, int size) {
        Specification<Product> spec = Specification.where(hasKeyword(keyword))
                .and(hasStatus(status))
                .and(statusNot(ProductStatus.HIDDEN))
                .and(idLessThan(cursor));
        return findProducts(spec, size);
    }

    /**
     * 인증된 본인이 등록한 상품 목록을 커서 기반으로 조회한다(정렬은 {@code id} 내림차순 고정). 본인
     * 관리 화면 용도라 {@link #getProducts}와 달리 {@code HIDDEN} 상태도 그대로 포함한다.
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

    private CursorPageResponse<ProductSummaryResponse> findProducts(Specification<Product> spec, int size) {
        Pageable pageable = PageRequest.of(0, size + 1, Sort.by(Sort.Direction.DESC, "id"));

        List<Product> products = productRepository.findAll(spec, pageable).getContent();
        Map<Long, AnalysisRecommendation> recommendations = findLatestRecommendations(products);

        List<ProductSummaryResponse> items = products.stream()
                .map(product -> ProductSummaryResponse.from(product, recommendations.get(product.getId())))
                .toList();
        return CursorPageResponse.of(items, size, ProductSummaryResponse::id);
    }

    /**
     * 상품 목록의 각 상품 ID에 대한 가장 최근 시세 분석 판단을 한 번의 쿼리로 조회한다(N+1 방지).
     * {@code recommendation}이 {@code null}인 경우가 흔해 {@link Collectors#toMap}(null 값에서
     * NPE 발생)은 쓸 수 없다.
     */
    private Map<Long, AnalysisRecommendation> findLatestRecommendations(List<Product> products) {
        if (products.isEmpty()) {
            return Map.of();
        }
        List<Long> productIds = products.stream().map(Product::getId).toList();
        Map<Long, AnalysisRecommendation> recommendations = new HashMap<>();
        for (ProductAnalysis analysis : productAnalysisRepository.findLatestByProductIdIn(productIds)) {
            recommendations.put(analysis.getProduct().getId(), analysis.getRecommendation());
        }
        return recommendations;
    }

    /**
     * 상품 정보를 수정한다. 본인이 등록한 상품만 수정할 수 있다.
     *
     * @param memberId 요청한 회원 ID
     * @param productId 수정할 상품 ID
     * @param request 수정 요청 바디
     * @return 수정된 상품
     * @throws ProductNotFoundException 존재하지 않는 상품인 경우
     * @throws ProductAccessDeniedException 본인이 등록한 상품이 아닌 경우
     * @throws CategoryNotFoundException 존재하지 않는 카테고리인 경우
     */
    @Transactional
    public ProductResponse update(Long memberId, Long productId, ProductUpdateRequest request) {
        Product product = getProductOrThrow(productId);
        validateRegisteredBy(product, memberId);
        Category category = getCategoryOrThrow(request.categoryId());

        product.update(
                category,
                request.title(),
                request.description(),
                request.price(),
                request.status(),
                request.condition(),
                request.hasDefect(),
                request.allowPriceSuggestion(),
                request.tradeMethod(),
                request.deliveryType(),
                request.preferredTradeRegion());

        product.clearImages();
        productRepository.flush();
        product.addImages(request.imageUrls());

        product.clearTags();
        product.addTags(resolveTags(request.tags()));

        return ProductResponse.from(product);
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

    private Category getCategoryOrThrow(Long categoryId) {
        return categoryRepository.findById(categoryId).orElseThrow(() -> new CategoryNotFoundException(categoryId));
    }

    /**
     * 구매 후 경과 개월 수를 등록 시점 기준 구매일시로 변환한다. 이 값은 등록 시점에만 계산되며 이후
     * 수정으로는 변경되지 않는다.
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

    private static Specification<Product> statusNot(ProductStatus excludedStatus) {
        return (root, query, cb) -> cb.notEqual(root.get("status"), excludedStatus);
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
