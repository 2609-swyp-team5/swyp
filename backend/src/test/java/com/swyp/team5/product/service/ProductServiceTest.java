package com.swyp.team5.product.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.lang.reflect.Constructor;
import java.lang.reflect.Field;
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
import com.swyp.team5.file.dto.FileUploadResponse;
import com.swyp.team5.file.service.FileStorageService;
import com.swyp.team5.member.entity.Member;
import com.swyp.team5.member.repository.MemberRepository;
import com.swyp.team5.product.dto.ProductAiAnalysisResult;
import com.swyp.team5.product.dto.ProductCreateRequest;
import com.swyp.team5.product.dto.ProductResponse;
import com.swyp.team5.product.dto.ProductUpdateRequest;
import com.swyp.team5.product.entity.Product;
import com.swyp.team5.product.entity.ProductCondition;
import com.swyp.team5.product.entity.ProductStatus;
import com.swyp.team5.product.entity.TradeMethod;
import com.swyp.team5.product.error.ProductAccessDeniedException;
import com.swyp.team5.product.error.ProductNotFoundException;
import com.swyp.team5.product.repository.ProductRepository;
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

    private ProductService service() {
        return new ProductService(
                productRepository,
                categoryRepository,
                memberRepository,
                fileStorageService,
                productAiService,
                tagRepository);
    }

    // 상품 등록 성공
    @Test
    void createSucceeds() {
        Member member = newMember(1L);
        Category category = newCategory(1L, "전자기기");
        ProductCreateRequest request = new ProductCreateRequest(
                category.getId(),
                "아이폰 13",
                "설명",
                500_000L,
                ProductCondition.A,
                false,
                true,
                TradeMethod.DIRECT,
                null,
                "서울시 강남구",
                List.of("https://image.example.com/1.png"),
                List.of());

        when(memberRepository.getReferenceById(1L)).thenReturn(member);
        when(categoryRepository.findById(category.getId())).thenReturn(Optional.of(category));
        when(productRepository.save(any(Product.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ProductResponse response = service().create(1L, request);

        assertThat(response.title()).isEqualTo("아이폰 13");
        assertThat(response.memberId()).isEqualTo(1L);
        assertThat(response.category().id()).isEqualTo(category.getId());
        assertThat(response.imageUrls()).containsExactly("https://image.example.com/1.png");
        assertThat(response.status()).isEqualTo(ProductStatus.ON_SALE);
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
                "설명",
                500_000L,
                ProductCondition.A,
                false,
                true,
                TradeMethod.DIRECT,
                null,
                null,
                List.of("https://image.example.com/1.png"),
                List.of("애플", "아이폰"));

        when(memberRepository.getReferenceById(1L)).thenReturn(member);
        when(categoryRepository.findById(category.getId())).thenReturn(Optional.of(category));
        when(tagRepository.findAllByNameIn(List.of("애플", "아이폰"))).thenReturn(List.of(existingTag));
        when(tagRepository.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(productRepository.save(any(Product.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ProductResponse response = service().create(1L, request);

        assertThat(response.tags()).containsExactlyInAnyOrder("애플", "아이폰");
    }

    // 상품 등록 실패 - 존재하지 않는 카테고리
    @Test
    void createFailsWhenCategoryNotFound() {
        ProductCreateRequest request = new ProductCreateRequest(
                99L,
                "아이폰 13",
                "설명",
                500_000L,
                ProductCondition.A,
                false,
                true,
                TradeMethod.DIRECT,
                null,
                null,
                List.of("https://image.example.com/1.png"),
                List.of());

        when(categoryRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service().create(1L, request)).isInstanceOf(CategoryNotFoundException.class);
    }

    // 상품 이미지 AI 분석 등록 성공
    @Test
    void createFromImagesSucceeds() {
        Member member = newMember(1L);
        Category category = newCategory(1L, "전자기기");
        MockMultipartFile image = new MockMultipartFile("images", "iphone.png", "image/png", new byte[] {1, 2, 3});
        ProductAiAnalysisResult analysis = new ProductAiAnalysisResult(
                category.getId(), "아이폰 13", "AI가 분석한 설명", ProductCondition.A, false, List.of("애플", "아이폰"));

        when(memberRepository.getReferenceById(1L)).thenReturn(member);
        when(productAiService.analyze(List.of(image))).thenReturn(analysis);
        when(categoryRepository.findById(category.getId())).thenReturn(Optional.of(category));
        when(fileStorageService.upload(image, "products"))
                .thenReturn(new FileUploadResponse("key", "https://image.example.com/iphone.png", 3, "image/png"));
        when(tagRepository.findAllByNameIn(List.of("애플", "아이폰"))).thenReturn(List.of());
        when(tagRepository.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(productRepository.save(any(Product.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ProductResponse response = service().createFromImages(1L, List.of(image));

        assertThat(response.title()).isEqualTo("아이폰 13");
        assertThat(response.description()).isEqualTo("AI가 분석한 설명");
        assertThat(response.category().id()).isEqualTo(category.getId());
        assertThat(response.condition()).isEqualTo(ProductCondition.A);
        assertThat(response.price()).isEqualTo(0L);
        assertThat(response.tradeMethod()).isEqualTo(TradeMethod.DIRECT);
        assertThat(response.imageUrls()).containsExactly("https://image.example.com/iphone.png");
        assertThat(response.tags()).containsExactlyInAnyOrder("애플", "아이폰");
    }

    // 상품 이미지 AI 분석 등록 실패 - AI가 존재하지 않는 카테고리를 추론
    @Test
    void createFromImagesFailsWhenCategoryNotFound() {
        MockMultipartFile image = new MockMultipartFile("images", "iphone.png", "image/png", new byte[] {1, 2, 3});
        ProductAiAnalysisResult analysis =
                new ProductAiAnalysisResult(99L, "아이폰 13", "설명", ProductCondition.A, false, List.of());

        when(memberRepository.getReferenceById(1L)).thenReturn(newMember(1L));
        when(productAiService.analyze(List.of(image))).thenReturn(analysis);
        when(categoryRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service().createFromImages(1L, List.of(image)))
                .isInstanceOf(CategoryNotFoundException.class);
    }

    // 상품 상세 조회 실패 - 존재하지 않는 상품
    @Test
    void getProductFailsWhenNotFound() {
        when(productRepository.findById(1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service().getProduct(1L)).isInstanceOf(ProductNotFoundException.class);
    }

    // 상품 목록 조회 - 다음 페이지 존재(size보다 1개 더 조회되어 hasNext=true, nextCursor=마지막 항목 id)
    @Test
    void getProductsHasNextWhenMoreItemsExist() {
        Category category = newCategory(1L, "전자기기");
        Member member = newMember(1L);
        List<Product> products = List.of(
                newProduct(3L, member, category), newProduct(2L, member, category), newProduct(1L, member, category));

        when(productRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(products));

        CursorPageResponse<?> response = service().getProducts(null, null, null, 2);

        assertThat(response.content()).hasSize(2);
        assertThat(response.hasNext()).isTrue();
        assertThat(response.nextCursor()).isEqualTo(2L);
    }

    // 상품 목록 조회 - 마지막 페이지(size만큼만 조회되어 hasNext=false, nextCursor=null)
    @Test
    void getProductsNoNextWhenLastPage() {
        Category category = newCategory(1L, "전자기기");
        Member member = newMember(1L);
        List<Product> products = List.of(newProduct(2L, member, category), newProduct(1L, member, category));

        when(productRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(products));

        CursorPageResponse<?> response = service().getProducts(null, null, null, 2);

        assertThat(response.content()).hasSize(2);
        assertThat(response.hasNext()).isFalse();
        assertThat(response.nextCursor()).isNull();
    }

    // 상품 수정 성공 - 소유자 본인
    @Test
    void updateSucceedsWhenOwner() {
        Category category = newCategory(1L, "전자기기");
        Product product = newProduct(1L, newMember(1L), category);

        ProductUpdateRequest request = new ProductUpdateRequest(
                category.getId(),
                "아이폰 13 프로",
                "수정된 설명",
                450_000L,
                ProductStatus.RESERVED,
                ProductCondition.B,
                true,
                false,
                TradeMethod.DELIVERY,
                null,
                null,
                List.of("https://image.example.com/2.png"),
                List.of("가성비"));

        when(productRepository.findById(1L)).thenReturn(Optional.of(product));
        when(categoryRepository.findById(category.getId())).thenReturn(Optional.of(category));
        when(tagRepository.findAllByNameIn(List.of("가성비"))).thenReturn(List.of());
        when(tagRepository.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));

        ProductResponse response = service().update(1L, 1L, request);

        assertThat(response.title()).isEqualTo("아이폰 13 프로");
        assertThat(response.status()).isEqualTo(ProductStatus.RESERVED);
        assertThat(response.imageUrls()).containsExactly("https://image.example.com/2.png");
        assertThat(response.tags()).containsExactly("가성비");
    }

    // 상품 수정 실패 - 소유자가 아님
    @Test
    void updateFailsWhenNotOwner() {
        Category category = newCategory(1L, "전자기기");
        Product product = newProduct(1L, newMember(1L), category);

        ProductUpdateRequest request = new ProductUpdateRequest(
                category.getId(),
                "아이폰 13 프로",
                "수정된 설명",
                450_000L,
                ProductStatus.RESERVED,
                ProductCondition.B,
                true,
                false,
                TradeMethod.DELIVERY,
                null,
                null,
                List.of("https://image.example.com/2.png"),
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

    private Product newProduct(Long id, Member member, Category category) {
        Product product = Product.create(
                member,
                category,
                "아이폰 13",
                "설명",
                500_000L,
                ProductCondition.A,
                false,
                true,
                TradeMethod.DIRECT,
                null,
                null,
                List.of("https://image.example.com/1.png"),
                Set.of());
        setField(product, "id", id);
        return product;
    }

    private Tag newTag(Long id, String name) {
        Tag tag = Tag.of(name);
        setField(tag, "id", id);
        return tag;
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
