package com.swyp.team5.product;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.lang.reflect.Constructor;
import java.lang.reflect.Field;
import java.util.List;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.swyp.team5.auth.service.RefreshTokenService;
import com.swyp.team5.category.entity.Category;
import com.swyp.team5.category.repository.CategoryRepository;
import com.swyp.team5.common.passport.JwtTokenProvider;
import com.swyp.team5.file.dto.FileUploadResponse;
import com.swyp.team5.file.service.FileStorageService;
import com.swyp.team5.member.entity.Member;
import com.swyp.team5.member.entity.MemberRole;
import com.swyp.team5.member.repository.MemberRepository;
import com.swyp.team5.product.dto.ProductAiAnalysisResult;
import com.swyp.team5.product.dto.ProductCreateRequest;
import com.swyp.team5.product.dto.ProductStatusUpdateRequest;
import com.swyp.team5.product.dto.ProductUpdateRequest;
import com.swyp.team5.product.entity.ProductCondition;
import com.swyp.team5.product.entity.ProductStatus;
import com.swyp.team5.product.entity.TradeMethod;
import com.swyp.team5.product.repository.ProductRepository;
import com.swyp.team5.product.service.ProductAiService;
import com.swyp.team5.tag.repository.TagRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

// 상품 관련 통합 테스트.
@SpringBootTest
@AutoConfigureMockMvc
class ProductTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private MemberRepository memberRepository;

    @Autowired
    private TagRepository tagRepository;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @MockitoBean
    private RefreshTokenService refreshTokenService;

    @MockitoBean
    private FileStorageService fileStorageService;

    @MockitoBean
    private ProductAiService productAiService;

    private Long sellerId;
    private String sellerToken;
    private Category category;

    @BeforeEach
    void setUp() {
        productRepository.deleteAll();
        tagRepository.deleteAll();
        memberRepository.deleteAll();

        Member seller = memberRepository.save(
                Member.ofLocalSignUp("seller@example.com", null, "encoded-password", "판매자", "seller", null));
        sellerId = seller.getId();
        sellerToken = jwtTokenProvider.createAccessToken(sellerId, MemberRole.USER);
        category = createCategory();
    }

    // 상품 등록 성공
    @Test
    void createSucceeds() throws Exception {
        ProductCreateRequest request = createRequest(category.getId());

        mockMvc.perform(post("/products")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + sellerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.title").value("아이폰 13"))
                .andExpect(jsonPath("$.data.memberId").value(sellerId))
                .andExpect(jsonPath("$.data.categoryId").value(category.getId()))
                .andExpect(jsonPath("$.data.status").value("ON_SALE"));

        assertThat(productRepository.count()).isEqualTo(1);
    }

    // 상품 등록 실패 - 인증 없음
    @Test
    void createFailsWithoutAuthentication() throws Exception {
        ProductCreateRequest request = createRequest(category.getId());

        mockMvc.perform(post("/products")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());
    }

    // 상품 등록 실패 - 요청값 검증 실패(제목 없음)
    @Test
    void createFailsWhenRequestInvalid() throws Exception {
        ProductCreateRequest invalidRequest = new ProductCreateRequest(
                category.getId(),
                "",
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

        mockMvc.perform(post("/products")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + sellerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpect(status().isBadRequest());
    }

    // 상품 등록 실패 - 존재하지 않는 카테고리
    @Test
    void createFailsWhenCategoryNotFound() throws Exception {
        ProductCreateRequest request = createRequest(999_999_999L);

        mockMvc.perform(post("/products")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + sellerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("NOT_FOUND"));
    }

    // 상품 이미지 AI 분석 등록 성공
    @Test
    void createFromImagesSucceeds() throws Exception {
        ProductAiAnalysisResult analysis = new ProductAiAnalysisResult(
                category.getId(), "AI가 분석한 상품", "AI 설명", ProductCondition.B, false, List.of("가성비"));
        when(productAiService.analyze(anyList())).thenReturn(analysis);
        when(fileStorageService.upload(any(), eq("products")))
                .thenReturn(new FileUploadResponse("key", "https://image.example.com/ai.png", 3, "image/png"));

        MockMultipartFile image = new MockMultipartFile("images", "photo.png", "image/png", new byte[] {1, 2, 3});

        mockMvc.perform(multipart("/products/analyze")
                        .file(image)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + sellerToken))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.title").value("AI가 분석한 상품"))
                .andExpect(jsonPath("$.data.price").value(0))
                .andExpect(jsonPath("$.data.tradeMethod").value("DIRECT"));
    }

    // 상품 상세 조회 성공
    @Test
    void getProductSucceeds() throws Exception {
        Long productId = createProduct();

        mockMvc.perform(get("/products/{id}", productId).header(HttpHeaders.AUTHORIZATION, "Bearer " + sellerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(productId))
                .andExpect(jsonPath("$.data.categoryName").value(category.getName()));
    }

    // 상품 상세 조회 실패 - 존재하지 않는 상품
    @Test
    void getProductFailsWhenNotFound() throws Exception {
        mockMvc.perform(get("/products/{id}", 999_999_999L).header(HttpHeaders.AUTHORIZATION, "Bearer " + sellerToken))
                .andExpect(status().isNotFound());
    }

    // 상품 목록 조회 - 커서 페이징(다음 페이지 존재)
    @Test
    void getProductsPaginatesWithCursor() throws Exception {
        createProduct();
        createProduct();
        createProduct();

        mockMvc.perform(get("/products")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + sellerToken)
                        .param("size", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content.length()").value(2))
                .andExpect(jsonPath("$.data.hasNext").value(true))
                .andExpect(jsonPath("$.data.nextCursor").isNotEmpty());
    }

    // 상품 목록 조회 - 카테고리 필터
    @Test
    void getProductsFiltersByCategory() throws Exception {
        createProduct();
        Category otherCategory = createCategory();
        createProduct(otherCategory);

        mockMvc.perform(get("/products")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + sellerToken)
                        .param("categoryId", String.valueOf(otherCategory.getId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content.length()").value(1))
                .andExpect(jsonPath("$.data.content[0].categoryName").value(otherCategory.getName()));
    }

    // 상품 수정 성공 - 소유자 본인
    @Test
    void updateSucceedsWhenOwner() throws Exception {
        Long productId = createProduct();
        ProductUpdateRequest request = updateRequest(category.getId(), ProductStatus.RESERVED);

        mockMvc.perform(patch("/products/{id}", productId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + sellerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title").value("아이폰 13 프로"))
                .andExpect(jsonPath("$.data.status").value("RESERVED"));
    }

    // 상품 수정 실패 - 소유자가 아님
    @Test
    void updateFailsWhenNotOwner() throws Exception {
        Long productId = createProduct();
        String otherToken = createOtherMemberToken();
        ProductUpdateRequest request = updateRequest(category.getId(), ProductStatus.RESERVED);

        mockMvc.perform(patch("/products/{id}", productId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + otherToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("FORBIDDEN"));
    }

    // 상품 수정 실패 - 존재하지 않는 상품
    @Test
    void updateFailsWhenNotFound() throws Exception {
        ProductUpdateRequest request = updateRequest(category.getId(), ProductStatus.RESERVED);

        mockMvc.perform(patch("/products/{id}", 999_999_999L)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + sellerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound());
    }

    // 상품 상태 변경 성공 - 소유자 본인
    @Test
    void updateStatusSucceedsWhenOwner() throws Exception {
        Long productId = createProduct();

        mockMvc.perform(patch("/products/{id}/status", productId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + sellerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new ProductStatusUpdateRequest(ProductStatus.SOLD_OUT))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("SOLD_OUT"));
    }

    // 상품 상태 변경 실패 - 소유자가 아님
    @Test
    void updateStatusFailsWhenNotOwner() throws Exception {
        Long productId = createProduct();
        String otherToken = createOtherMemberToken();

        mockMvc.perform(patch("/products/{id}/status", productId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + otherToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new ProductStatusUpdateRequest(ProductStatus.SOLD_OUT))))
                .andExpect(status().isForbidden());
    }

    // 상품 삭제 성공 - 소유자 본인
    @Test
    void deleteSucceedsWhenOwner() throws Exception {
        Long productId = createProduct();

        mockMvc.perform(delete("/products/{id}", productId).header(HttpHeaders.AUTHORIZATION, "Bearer " + sellerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        assertThat(productRepository.existsById(productId)).isFalse();
    }

    // 상품 삭제 실패 - 소유자가 아님
    @Test
    void deleteFailsWhenNotOwner() throws Exception {
        Long productId = createProduct();
        String otherToken = createOtherMemberToken();

        mockMvc.perform(delete("/products/{id}", productId).header(HttpHeaders.AUTHORIZATION, "Bearer " + otherToken))
                .andExpect(status().isForbidden());

        assertThat(productRepository.existsById(productId)).isTrue();
    }

    // 상품 삭제 실패 - 인증 없음
    @Test
    void deleteFailsWithoutAuthentication() throws Exception {
        Long productId = createProduct();

        mockMvc.perform(delete("/products/{id}", productId)).andExpect(status().isUnauthorized());
    }

    // 상품 재삭제 - 이미 삭제된 상품은 404
    @Test
    void deleteFailsWhenAlreadyDeleted() throws Exception {
        Long productId = createProduct();
        mockMvc.perform(delete("/products/{id}", productId).header(HttpHeaders.AUTHORIZATION, "Bearer " + sellerToken))
                .andExpect(status().isOk());

        mockMvc.perform(delete("/products/{id}", productId).header(HttpHeaders.AUTHORIZATION, "Bearer " + sellerToken))
                .andExpect(status().isNotFound());
    }

    private Long createProduct() throws Exception {
        return createProduct(category);
    }

    private Long createProduct(Category productCategory) throws Exception {
        ProductCreateRequest request = createRequest(productCategory.getId());
        String response = mockMvc.perform(post("/products")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + sellerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();

        return objectMapper.readTree(response).path("data").path("id").asLong();
    }

    private String createOtherMemberToken() {
        Member other = memberRepository.save(
                Member.ofLocalSignUp("buyer@example.com", null, "encoded-password", "구매자", "buyer", null));
        return jwtTokenProvider.createAccessToken(other.getId(), MemberRole.USER);
    }

    private ProductCreateRequest createRequest(Long categoryId) {
        return new ProductCreateRequest(
                categoryId,
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
    }

    private ProductUpdateRequest updateRequest(Long categoryId, ProductStatus status) {
        return new ProductUpdateRequest(
                categoryId,
                "아이폰 13 프로",
                "수정된 설명",
                450_000L,
                status,
                ProductCondition.B,
                true,
                false,
                TradeMethod.DELIVERY,
                null,
                null,
                List.of("https://image.example.com/2.png"),
                List.of());
    }

    private Category createCategory() {
        try {
            Constructor<Category> constructor = Category.class.getDeclaredConstructor();
            constructor.setAccessible(true);
            Category newCategory = constructor.newInstance();
            Field nameField = Category.class.getDeclaredField("name");
            nameField.setAccessible(true);
            nameField.set(newCategory, "테스트카테고리-" + UUID.randomUUID());
            return categoryRepository.save(newCategory);
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException(e);
        }
    }
}
