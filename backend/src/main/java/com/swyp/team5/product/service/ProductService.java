package com.swyp.team5.product.service;

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
                request.allowPriceSuggestion(),
                request.tradeMethod(),
                request.deliveryType(),
                request.preferredTradeRegion(),
                request.imageUrls(),
                resolveTags(request.tags()));

        return ProductResponse.from(productRepository.save(product));
    }

    @Transactional
    public ProductResponse createFromImages(Long memberId, List<MultipartFile> images) {
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
                0L,
                analysis.condition(),
                analysis.hasDefect(),
                true,
                TradeMethod.DIRECT,
                null,
                null,
                imageUrls,
                resolveTags(analysis.tags()));

        return ProductResponse.from(productRepository.save(product));
    }

    @Transactional(readOnly = true)
    public ProductResponse getProduct(Long productId) {
        return ProductResponse.from(getProductOrThrow(productId));
    }

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

    @Transactional
    public ProductResponse update(Long memberId, Long productId, ProductUpdateRequest request) {
        Product product = getProductOrThrow(productId);
        validateOwner(product, memberId);
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

    @Transactional
    public ProductResponse updateStatus(Long memberId, Long productId, ProductStatus status) {
        Product product = getProductOrThrow(productId);
        validateOwner(product, memberId);

        product.changeStatus(status);

        return ProductResponse.from(product);
    }

    @Transactional
    public void delete(Long memberId, Long productId) {
        Product product = getProductOrThrow(productId);
        validateOwner(product, memberId);
        productRepository.delete(product);
    }

    private Product getProductOrThrow(Long productId) {
        return productRepository.findById(productId).orElseThrow(() -> new ProductNotFoundException(productId));
    }

    private Category getCategoryOrThrow(Long categoryId) {
        return categoryRepository.findById(categoryId).orElseThrow(() -> new CategoryNotFoundException(categoryId));
    }

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

    private void validateOwner(Product product, Long memberId) {
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
