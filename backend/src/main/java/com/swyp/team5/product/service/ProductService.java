package com.swyp.team5.product.service;

import java.time.LocalDate;
import java.util.LinkedHashSet;
import java.util.List;
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

    public ProductService(
            ProductRepository productRepository,
            CategoryRepository categoryRepository,
            MemberRepository memberRepository,
            FileStorageService fileStorageService,
            ProductAiService productAiService,
            TagRepository tagRepository) {
        this.productRepository = productRepository;
        this.categoryRepository = categoryRepository;
        this.memberRepository = memberRepository;
        this.fileStorageService = fileStorageService;
        this.productAiService = productAiService;
        this.tagRepository = tagRepository;
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
     * 상품 상세 정보를 조회한다.
     *
     * @param productId 조회할 상품 ID
     * @return 상품 상세 정보
     * @throws ProductNotFoundException 존재하지 않는 상품인 경우
     */
    @Transactional(readOnly = true)
    public ProductResponse getProduct(Long productId) {
        return ProductResponse.from(getProductOrThrow(productId));
    }

    /**
     * 상품 목록을 커서 기반으로 조회한다(정렬은 {@code id} 내림차순 고정). - 타이브레이커는 추후 적용 예정
     *
     * @param categoryId 카테고리 필터(선택, {@code null}이면 전체)
     * @param status 상태 필터(선택, {@code null}이면 전체)
     * @param cursor 이전 페이지 마지막 상품의 {@code id}(선택, {@code null}이면 첫 페이지)
     * @param size 페이지 크기
     * @return {@code hasNext}/{@code nextCursor}를 포함한 커서 페이지 응답
     */
    @Transactional(readOnly = true)
    public CursorPageResponse<ProductSummaryResponse> getProducts(
            Long categoryId, ProductStatus status, Long cursor, int size) {
        Specification<Product> spec = Specification.where(hasCategoryId(categoryId))
                .and(hasStatus(status))
                .and(idLessThan(cursor));
        Pageable pageable = PageRequest.of(0, size + 1, Sort.by(Sort.Direction.DESC, "id"));

        List<ProductSummaryResponse> items = productRepository.findAll(spec, pageable).stream()
                .map(ProductSummaryResponse::from)
                .toList();
        return CursorPageResponse.of(items, size, ProductSummaryResponse::id);
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

    private static Specification<Product> hasCategoryId(Long categoryId) {
        return (root, query, cb) ->
                categoryId == null ? null : cb.equal(root.get("category").get("id"), categoryId);
    }

    private static Specification<Product> hasStatus(ProductStatus status) {
        return (root, query, cb) -> status == null ? null : cb.equal(root.get("status"), status);
    }

    private static Specification<Product> idLessThan(Long cursor) {
        return (root, query, cb) -> cursor == null ? null : cb.lessThan(root.get("id"), cursor);
    }
}
