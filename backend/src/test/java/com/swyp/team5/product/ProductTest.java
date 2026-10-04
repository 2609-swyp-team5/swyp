package com.swyp.team5.product;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.not;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.asyncDispatch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.lang.reflect.Constructor;
import java.lang.reflect.Field;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.RequestBuilder;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.swyp.team5.category.entity.Category;
import com.swyp.team5.category.repository.CategoryRepository;
import com.swyp.team5.common.passport.JwtTokenProvider;
import com.swyp.team5.file.dto.FileUploadResponse;
import com.swyp.team5.interest.entity.Interest;
import com.swyp.team5.interest.repository.InterestRepository;
import com.swyp.team5.member.entity.Member;
import com.swyp.team5.member.entity.MemberRole;
import com.swyp.team5.member.repository.MemberRepository;
import com.swyp.team5.platform.entity.CategoryPlatform;
import com.swyp.team5.platform.entity.Platform;
import com.swyp.team5.platform.entity.PlatformListing;
import com.swyp.team5.platform.repository.CategoryPlatformRepository;
import com.swyp.team5.platform.repository.PlatformListingRepository;
import com.swyp.team5.platform.repository.PlatformRepository;
import com.swyp.team5.product.dto.ProductAiAnalysisResult;
import com.swyp.team5.product.dto.ProductCreateRequest;
import com.swyp.team5.product.dto.ProductSearchCondition;
import com.swyp.team5.product.dto.ProductSortType;
import com.swyp.team5.product.dto.ProductStatusUpdateRequest;
import com.swyp.team5.product.dto.ProductUpdateRequest;
import com.swyp.team5.product.entity.DefectStatus;
import com.swyp.team5.product.entity.DeliveryType;
import com.swyp.team5.product.entity.Product;
import com.swyp.team5.product.entity.ProductCondition;
import com.swyp.team5.product.entity.ProductStatus;
import com.swyp.team5.product.entity.TradeMethod;
import com.swyp.team5.product.repository.ProductRepository;
import com.swyp.team5.product.service.ProductAiSearchService;
import com.swyp.team5.productanalysis.entity.AnalysisRecommendation;
import com.swyp.team5.productanalysis.entity.ProductAnalysis;
import com.swyp.team5.productanalysis.repository.ProductAnalysisRepository;
import com.swyp.team5.search.repository.SearchLogRepository;
import com.swyp.team5.support.IntegrationTest;
import com.swyp.team5.tag.repository.TagRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

// 상품 관련 통합 테스트.
class ProductTest extends IntegrationTest {

    private final ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private CategoryPlatformRepository categoryPlatformRepository;

    @Autowired
    private MemberRepository memberRepository;

    @Autowired
    private TagRepository tagRepository;

    @Autowired
    private PlatformRepository platformRepository;

    @Autowired
    private PlatformListingRepository platformListingRepository;

    @Autowired
    private InterestRepository interestRepository;

    @Autowired
    private ProductAnalysisRepository productAnalysisRepository;

    @Autowired
    private SearchLogRepository searchLogRepository;

    // 검색 테스트가 만든 행 — 상품 삭제(setUp) 전에 참조 행부터 지운다
    private final List<Interest> createdInterests = new ArrayList<>();
    private final List<ProductAnalysis> createdAnalyses = new ArrayList<>();
    private final List<PlatformListing> createdListings = new ArrayList<>();

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    private Long sellerId;
    private String sellerToken;
    private Category category;

    @AfterEach
    void cleanUpSearchRows() {
        interestRepository.deleteAll(createdInterests);
        productAnalysisRepository.deleteAll(createdAnalyses);
        platformListingRepository.deleteAll(createdListings);
        // 비로그인 검색 로그는 회원 삭제로 함께 지워지지 않아 인기 검색어 테스트에 섞이지 않도록 직접 지운다
        searchLogRepository.deleteAll(searchLogRepository.findAll().stream()
                .filter(log -> log.getMember() == null)
                .toList());
    }

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
        when(fileStorageService.upload(any(), eq("products")))
                .thenReturn(new FileUploadResponse("key", "https://image.example.com/default.png", 3, "image/png"));
        // 등록에는 AI 사진 분석이 필수라 기본 분석 결과를 둔다(테스트별로 다시 지정 가능)
        when(productAiService.analyze(anyList()))
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
    }

    // 상품 등록 성공 - 이미지 파일을 직접 받아 서버가 업로드까지 처리(AI 등록과 동일한 방식)
    @Test
    void createSucceeds() throws Exception {
        ProductCreateRequest request = createRequest(category.getId());
        when(fileStorageService.upload(any(), eq("products")))
                .thenReturn(new FileUploadResponse("key", "https://image.example.com/1.png", 3, "image/png"));
        when(productAiService.analyze(anyList()))
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

        JsonNode data = performStream(multipart("/products")
                        .file(imagePart())
                        .file(requestPart(request))
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + sellerToken))
                .get("data");

        assertThat(data.get("event").asText()).isEqualTo("complete");
        assertThat(data.get("price").asLong()).isEqualTo(request.price()); // 사용자가 입력한 판매 가격
        assertThat(data.get("suggestedPrice").asLong()).isEqualTo(470_000L); // AI가 추정한 적정가
        assertThat(data.get("analysisDescription").asText()).isEqualTo("판단 근거"); // 적정가 판단 근거
        assertThat(data.get("title").asText()).isEqualTo("아이폰 13");
        assertThat(data.get("brand").asText()).isEqualTo("애플");
        assertThat(data.get("memberId").asLong()).isEqualTo(sellerId);
        assertThat(data.at("/category/id").asLong()).isEqualTo(category.getId());
        assertThat(data.at("/category/leaf").asBoolean()).isTrue();
        assertThat(data.get("status").asText()).isEqualTo("DRAFT"); // 등록 직후는 외부 미게시
        assertThat(data.at("/imageUrls/0").asText()).isEqualTo("https://image.example.com/1.png");

        assertThat(productRepository.count()).isEqualTo(1);
    }

    // AI 제안가/판단 근거 - 등록 시 AI 사진 추정가와 판단 근거가 저장돼 상세 조회에도 포함되고, 사용자 수정으로는 바뀌지 않음.
    // 비교 매물 평균가는 수집 매물이 없어 null
    @Test
    void suggestedPriceIsStoredAndKeptOnUpdate() throws Exception {
        when(productAiService.analyze(anyList()))
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
        Long productId = createProduct();

        mockMvc.perform(get("/products/{productId}", productId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + sellerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.suggestedPrice").value(470_000))
                .andExpect(jsonPath("$.data.analysisDescription").value("판단 근거")) // 등록 때 저장된 근거
                .andExpect(jsonPath("$.data.marketAveragePrice").isEmpty());

        JsonNode updated = performStream(multipart(HttpMethod.PATCH, "/products/{productId}", productId)
                .file(requestPart(updateRequest(category.getId(), ProductStatus.ON_SALE)))
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + sellerToken));
        assertThat(updated.at("/data/suggestedPrice").asLong()).isEqualTo(470_000L); // 사용자 수정으로는 바뀌지 않음
    }

    // 상품 등록 실패 - 인증 없음
    @Test
    void createFailsWithoutAuthentication() throws Exception {
        ProductCreateRequest request = createRequest(category.getId());

        mockMvc.perform(multipart("/products").file(imagePart()).file(requestPart(request)))
                .andExpect(status().isUnauthorized());
    }

    // 상품 등록 실패 - 요청값 검증 실패(제목 없음)
    @Test
    void createFailsWhenRequestInvalid() throws Exception {
        ProductCreateRequest invalidRequest = new ProductCreateRequest(
                category.getId(),
                "",
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

        mockMvc.perform(multipart("/products")
                        .file(imagePart())
                        .file(requestPart(invalidRequest))
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + sellerToken))
                .andExpect(status().isBadRequest());
    }

    // 상품 등록 실패 - 이미지가 없음
    @Test
    void createFailsWhenImagesEmpty() throws Exception {
        ProductCreateRequest request = createRequest(category.getId());

        mockMvc.perform(multipart("/products")
                        .file(requestPart(request))
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + sellerToken))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("INVALID_INPUT_VALUE"));
    }

    // 상품 등록 실패 - 존재하지 않는 카테고리
    @Test
    void createFailsWhenCategoryNotFound() throws Exception {
        ProductCreateRequest request = createRequest(999_999_999L);

        mockMvc.perform(multipart("/products")
                        .file(imagePart())
                        .file(requestPart(request))
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + sellerToken))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("NOT_FOUND"));
    }

    // 상품 등록 실패 - 구매 후 경과 개월 수가 음수(미래 구매일시로 계산되는 것을 방지)
    @Test
    void createFailsWhenPurchasedMonthsNegative() throws Exception {
        ProductCreateRequest invalidRequest = new ProductCreateRequest(
                category.getId(),
                "아이폰 13",
                null,
                "설명",
                500_000L,
                ProductCondition.A,
                DefectStatus.NORMAL,
                -1,
                true,
                TradeMethod.DIRECT,
                null,
                null,
                List.of(),
                List.of());

        mockMvc.perform(multipart("/products")
                        .file(imagePart())
                        .file(requestPart(invalidRequest))
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + sellerToken))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("INVALID_INPUT_VALUE"));
    }

    // 상품 등록 실패 - 구매 후 경과 개월 수가 6 초과(최대 6개월까지만 허용)
    @Test
    void createFailsWhenPurchasedMonthsExceedsMax() throws Exception {
        ProductCreateRequest invalidRequest = new ProductCreateRequest(
                category.getId(),
                "아이폰 13",
                null,
                "설명",
                500_000L,
                ProductCondition.A,
                DefectStatus.NORMAL,
                7,
                true,
                TradeMethod.DIRECT,
                null,
                null,
                List.of(),
                List.of());

        mockMvc.perform(multipart("/products")
                        .file(imagePart())
                        .file(requestPart(invalidRequest))
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + sellerToken))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("INVALID_INPUT_VALUE"));
    }

    // 상품 이미지 AI 분석 등록 성공
    @Test
    void createFromImagesSucceeds() throws Exception {
        ProductAiAnalysisResult analysis = new ProductAiAnalysisResult(
                category.getId(),
                "AI가 분석한 상품",
                "애플",
                "AI 설명",
                ProductCondition.B,
                300_000L,
                "외관 상태가 양호해 A급 시세 대비 적정합니다.",
                List.of("가성비"),
                List.of());
        when(productAiService.analyze(anyList())).thenReturn(analysis);
        when(fileStorageService.upload(any(), eq("products")))
                .thenReturn(new FileUploadResponse("key", "https://image.example.com/ai.png", 3, "image/png"));

        MockMultipartFile image = new MockMultipartFile("images", "photo.png", "image/png", new byte[] {1, 2, 3});

        JsonNode data = performStream(multipart("/products/analyze")
                        .file(image)
                        .param("purchasedMonths", "3")
                        .param("defectStatus", "issues") // 소문자로 보내도 대소문자 무관하게 처리되는지 검증
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + sellerToken))
                .get("data");

        assertThat(data.get("title").asText()).isEqualTo("AI가 분석한 상품");
        assertThat(data.get("brand").asText()).isEqualTo("애플");
        assertThat(data.get("price").asLong()).isEqualTo(300_000L); // AI가 추정한 적정가가 판매 가격으로
        assertThat(data.get("suggestedPrice").asLong()).isEqualTo(300_000L); // 같은 값을 AI 제안가로도 제공
        assertThat(data.get("analysisDescription").asText()).isEqualTo("외관 상태가 양호해 A급 시세 대비 적정합니다.");
        assertThat(data.get("tradeMethod").asText()).isEqualTo("DIRECT");
        assertThat(data.get("defectStatus").asText()).isEqualTo("ISSUES");
        assertThat(data.get("purchasedAt").asText())
                .isEqualTo(LocalDate.now().minusMonths(3).toString());
        assertThat(data.get("purchasedMonths").asInt()).isEqualTo(3);
    }

    // 상품 이미지 AI 분석 등록 성공 - 태그는 AI 추론 결과만(tags 파라미터를 보내도 무시), 구성품은 AI 추론과 사용자 입력을 합쳐서 저장
    @Test
    void createFromImagesUsesAiTagsAndMergesIncludedItems() throws Exception {
        ProductAiAnalysisResult analysis = new ProductAiAnalysisResult(
                category.getId(),
                "AI가 분석한 상품",
                null,
                "AI 설명",
                ProductCondition.B,
                300_000L,
                "외관 상태가 양호해 A급 시세 대비 적정합니다.",
                List.of("애플"),
                List.of("박스"));
        when(productAiService.analyze(anyList())).thenReturn(analysis);
        when(fileStorageService.upload(any(), eq("products")))
                .thenReturn(new FileUploadResponse("key", "https://image.example.com/ai.png", 3, "image/png"));

        MockMultipartFile image = new MockMultipartFile("images", "photo.png", "image/png", new byte[] {1, 2, 3});

        JsonNode data = performStream(multipart("/products/analyze")
                        .file(image)
                        .param("purchasedMonths", "3")
                        .param("defectStatus", "NORMAL")
                        .param("tags", "급처")
                        .param("includedItems", "충전기")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + sellerToken))
                .get("data");

        assertThat(data.get("tags")).extracting(JsonNode::asText).containsExactlyInAnyOrder("애플");
        assertThat(data.get("includedItems")).extracting(JsonNode::asText).containsExactlyInAnyOrder("박스", "충전기");
    }

    // 상품 이미지 AI 분석 등록 실패 - 구매 후 경과 개월 수가 음수
    @Test
    void createFromImagesFailsWhenPurchasedMonthsNegative() throws Exception {
        MockMultipartFile image = new MockMultipartFile("images", "photo.png", "image/png", new byte[] {1, 2, 3});

        mockMvc.perform(multipart("/products/analyze")
                        .file(image)
                        .param("purchasedMonths", "-1")
                        .param("defectStatus", "NORMAL")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + sellerToken))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("INVALID_INPUT_VALUE"));
    }

    // 상품 이미지 AI 분석 등록 실패 - 구매 후 경과 개월 수가 6 초과
    @Test
    void createFromImagesFailsWhenPurchasedMonthsExceedsMax() throws Exception {
        MockMultipartFile image = new MockMultipartFile("images", "photo.png", "image/png", new byte[] {1, 2, 3});

        mockMvc.perform(multipart("/products/analyze")
                        .file(image)
                        .param("purchasedMonths", "7")
                        .param("defectStatus", "NORMAL")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + sellerToken))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("INVALID_INPUT_VALUE"));
    }

    // 상품 상세 조회 성공
    @Test
    void getProductSucceeds() throws Exception {
        Long productId = createProduct();

        mockMvc.perform(get("/products/{productId}", productId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + sellerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(productId))
                .andExpect(jsonPath("$.data.category.name").value(category.getName()));
    }

    // 상품 상세 조회 - 관심 수·조회수는 모두에게, 게시 플랫폼은 판매자 본인에게만 내려줌
    @Test
    void getProductIncludesPlatformsOnlyForOwner() throws Exception {
        Long productId = createProduct();
        String otherToken = createOtherMemberToken();

        mockMvc.perform(get("/products/{productId}", productId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + sellerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.platforms.length()").value(0))
                .andExpect(jsonPath("$.data.interestCount").value(0))
                .andExpect(jsonPath("$.data.viewCount").isNumber());
        mockMvc.perform(get("/products/{productId}", productId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + otherToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.platforms").doesNotExist())
                .andExpect(jsonPath("$.data.interestCount").value(0))
                .andExpect(jsonPath("$.data.viewCount").isNumber());
    }

    // 상품 상세 조회 실패 - 존재하지 않는 상품
    @Test
    void getProductFailsWhenNotFound() throws Exception {
        mockMvc.perform(get("/products/{productId}", 999_999_999L)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + sellerToken))
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

    // 내 상품 목록 조회 - 카테고리 필터
    @Test
    void getMyProductsFiltersByCategory() throws Exception {
        createProduct();
        Category otherCategory = createCategory();
        createProduct(otherCategory);

        mockMvc.perform(get("/products/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + sellerToken)
                        .param("categoryId", String.valueOf(otherCategory.getId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content.length()").value(1))
                .andExpect(jsonPath("$.data.content[0].categoryName").value(otherCategory.getName()))
                .andExpect(jsonPath("$.data.content[0].brand").value("애플"))
                .andExpect(jsonPath("$.data.content[0].defectStatus").value("NORMAL"))
                .andExpect(jsonPath("$.data.content[0].purchasedMonths").value(3));
    }

    // 내 상품 목록 조회 - 상태 필터 여러 값, 첫 페이지에 전체 건수·상태별 건수(필터 적용)
    @Test
    void getMyProductsFiltersByMultipleStatuses() throws Exception {
        Long draft = createProduct();
        Long reserved = createProduct();
        Long soldOut = createProduct();
        changeStatus(reserved, "RESERVED");
        changeStatus(soldOut, "SOLD_OUT");

        mockMvc.perform(get("/products/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + sellerToken)
                        .param("status", "DRAFT", "RESERVED"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content.length()").value(2))
                .andExpect(jsonPath("$.data.totalCount").value(2))
                .andExpect(jsonPath("$.data.statusCounts.DRAFT").value(1))
                .andExpect(jsonPath("$.data.statusCounts.RESERVED").value(1))
                .andExpect(jsonPath("$.data.statusCounts.SOLD_OUT").value(0))
                .andExpect(jsonPath(
                        "$.data.content[*].id",
                        org.hamcrest.Matchers.containsInAnyOrder(draft.intValue(), reserved.intValue())));
    }

    private void changeStatus(Long productId, String status) throws Exception {
        mockMvc.perform(patch("/products/{productId}/status", productId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + sellerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"" + status + "\"}"))
                .andExpect(status().isOk());
    }

    // 상품 목록 조회 - 키워드 검색(제목/설명)
    @Test
    void getProductsFiltersByKeyword() throws Exception {
        createProduct(category, "아이폰 13 프로맥스", sellerToken);
        createProduct(category, "갤럭시 S24 울트라", sellerToken);

        mockMvc.perform(get("/products")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + sellerToken)
                        .param("keyword", "갤럭시"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content.length()").value(1))
                .andExpect(jsonPath("$.data.content[0].title").value("갤럭시 S24 울트라"))
                .andExpect(jsonPath("$.data.content[0].brand").value("애플"))
                .andExpect(jsonPath("$.data.content[0].defectStatus").value("NORMAL"))
                .andExpect(jsonPath("$.data.content[0].purchasedMonths").value(3));
    }

    // 상품 목록 조회(공개) - 외부 게시 전(DRAFT) 상품도 노출
    @Test
    void getProductsIncludesDraft() throws Exception {
        createProduct();

        mockMvc.perform(get("/products").header(HttpHeaders.AUTHORIZATION, "Bearer " + sellerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content.length()").value(1))
                .andExpect(jsonPath("$.data.content[0].status").value("DRAFT"));
    }

    // 상품 상세 조회 - 외부 수집 매물도 같은 ID 체계(items)라 /products/{productId}로 같은 응답 형태로 조회되고, 우리 상품과 ID가 겹치지 않음
    @Test
    void getProductReturnsExternalListingByItemId() throws Exception {
        Product product = saveProduct(uniqueKeyword() + " 우리 상품", 100_000L, ProductCondition.A, DefectStatus.NORMAL);
        PlatformListing listing = saveListing(uniqueKeyword() + " 번개 매물", 200_000L, "SOLD_OUT");

        assertThat(listing.getId()).isNotEqualTo(product.getId());
        mockMvc.perform(get("/products/{productId}", listing.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + sellerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.source").value("EXTERNAL"))
                .andExpect(jsonPath("$.data.id").value(listing.getId()))
                .andExpect(jsonPath("$.data.price").value(200_000))
                .andExpect(jsonPath("$.data.status").value("SOLD_OUT"))
                .andExpect(jsonPath("$.data.externalStatus").value("SOLD_OUT"))
                .andExpect(jsonPath("$.data.platformName").value("번개장터"))
                .andExpect(jsonPath("$.data.memberId").doesNotExist())
                .andExpect(jsonPath("$.data.interestCount").value(0)) // 외부 매물도 관심 수는 내려줌
                .andExpect(jsonPath("$.data.viewCount").doesNotExist()) // 외부 매물은 조회수 없음
                .andExpect(jsonPath("$.data.category.id").value(category.getId()));
        mockMvc.perform(get("/products/{productId}", product.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + sellerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.source").value("OUR"))
                .andExpect(jsonPath("$.data.memberId").value(sellerId));
    }

    // 상품 목록 조회(검색 필터) - 가격·제품 상태·하자·제외 키워드·플랫폼·거래 상태 필터가 우리 상품/외부 매물에 맞게 적용됨
    @Test
    void getProductsAppliesSearchFilters() throws Exception {
        String keyword = uniqueKeyword();
        saveProduct(keyword + " 아이폰 A급", 100_000L, ProductCondition.A, DefectStatus.NORMAL);
        saveProduct(keyword + " 아이폰 S급 파손", 300_000L, ProductCondition.S, DefectStatus.ISSUES);
        saveListing(keyword + " 아이폰 번개", 200_000L, "SELLING");
        saveListing(keyword + " 아이폰 판매완료", 150_000L, "SOLD_OUT");

        // 거래 상태 미지정 - 외부 매물은 판매중만
        searchProducts(keyword).andExpect(jsonPath("$.data.content.length()").value(3));
        // 제품 상태 등급 지정 - 등급이 없는 외부 매물은 제외
        searchProducts(keyword, "condition", "A,S")
                .andExpect(jsonPath("$.data.content.length()").value(2))
                .andExpect(jsonPath("$.data.content[*].source", everyItem(is("OUR"))));
        // 가격 범위(경계 포함)
        searchProducts(keyword, "minPrice", "150000", "maxPrice", "200000")
                .andExpect(jsonPath("$.data.content.length()").value(1))
                .andExpect(jsonPath("$.data.content[0].price").value(200_000));
        // 제외 키워드
        searchProducts(keyword, "excludeKeyword", "파손")
                .andExpect(jsonPath("$.data.content.length()").value(2))
                .andExpect(jsonPath("$.data.content[*].title", everyItem(not(containsString("파손")))));
        // 플랫폼 + 거래 상태
        searchProducts(keyword, "platform", "BUNJANG", "status", "SOLD_OUT")
                .andExpect(jsonPath("$.data.content.length()").value(1))
                .andExpect(jsonPath("$.data.content[0].status").value("SOLD_OUT"));
        searchProducts(keyword, "platform", "OUR", "defectStatus", "ISSUES")
                .andExpect(jsonPath("$.data.content.length()").value(1))
                .andExpect(jsonPath("$.data.content[0].defectStatus").value("ISSUES"));
        // 예약중인 우리 상품은 없음(등록 직후 DRAFT)
        searchProducts(keyword, "platform", "OUR", "status", "RESERVED")
                .andExpect(jsonPath("$.data.content.length()").value(0));
        // 상태 체계 통일 - 외부 매물 원본 SELLING은 응답에서 ON_SALE
        searchProducts(keyword, "platform", "BUNJANG")
                .andExpect(jsonPath("$.data.content.length()").value(1))
                .andExpect(jsonPath("$.data.content[0].status").value("ON_SALE"));
        // DRAFT와 ON_SALE은 분리 - DRAFT는 우리 상품만, ON_SALE은 외부 판매중(우리 상품은 외부 미게시라 제외)
        searchProducts(keyword, "status", "DRAFT")
                .andExpect(jsonPath("$.data.content.length()").value(2))
                .andExpect(jsonPath("$.data.content[*].status", everyItem(is("DRAFT"))));
        searchProducts(keyword, "status", "ON_SALE")
                .andExpect(jsonPath("$.data.content.length()").value(1))
                .andExpect(jsonPath("$.data.content[0].source").value("EXTERNAL"));
        // 상태 필터는 여러 값 - DRAFT + ON_SALE이면 우리 상품 DRAFT와 외부 판매중
        searchProducts(keyword, "status", "DRAFT,ON_SALE")
                .andExpect(jsonPath("$.data.content.length()").value(3));
        // 이전 파라미터 tradeStatus는 더 이상 쓰지 않음(무시 — 필터 미적용과 같음)
        searchProducts(keyword, "tradeStatus", "SOLD_OUT")
                .andExpect(jsonPath("$.data.content.length()").value(3));
    }

    // 상품 목록 조회 - 우리 상품은 거래 지역·택배 가능 여부(거래 방식이 택배면 true)를 내려주고, 외부 매물은 지역 null·택배 가능 true 고정
    @Test
    void getProductsIncludesTradeRegionAndDeliveryAvailability() throws Exception {
        String keyword = uniqueKeyword();
        Member seller = memberRepository.findById(sellerId).orElseThrow();
        productRepository.save(Product.create(
                seller,
                category,
                keyword + " 택배 상품",
                null,
                "설명",
                100_000L,
                ProductCondition.A,
                DefectStatus.NORMAL,
                null,
                false,
                TradeMethod.DELIVERY,
                DeliveryType.INCLUDED,
                "서울 송파구",
                List.of("https://image.example.com/1.png"),
                Set.of(),
                Set.of()));
        saveProduct(keyword + " 직거래 상품", 200_000L, ProductCondition.A, DefectStatus.NORMAL);
        saveListing(keyword + " 번개 매물", 300_000L, "SELLING");

        searchProducts(keyword, "sort", "PRICE_LOW")
                .andExpect(jsonPath("$.data.content[0].tradeRegion").value("서울 송파구"))
                .andExpect(jsonPath("$.data.content[0].deliveryAvailable").value(true))
                .andExpect(jsonPath("$.data.content[1].tradeRegion").doesNotExist())
                .andExpect(jsonPath("$.data.content[1].deliveryAvailable").value(false))
                .andExpect(jsonPath("$.data.content[2].source").value("EXTERNAL"))
                .andExpect(jsonPath("$.data.content[2].tradeRegion").doesNotExist())
                .andExpect(jsonPath("$.data.content[2].deliveryAvailable").value(true));
    }

    // 비로그인 검색 - 목록·인기 검색어·인기 상품·카테고리는 토큰 없이 조회되고, 검색 로그는 회원 없이 남음
    @Test
    void guestCanSearchProducts() throws Exception {
        String keyword = uniqueKeyword();
        saveProduct(keyword + " 아이폰", 100_000L, ProductCondition.A, DefectStatus.NORMAL);

        mockMvc.perform(get("/products").param("keyword", keyword))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content.length()").value(1));
        mockMvc.perform(get("/products/keywords/trending")).andExpect(status().isOk());
        mockMvc.perform(get("/products/popular")).andExpect(status().isOk());
        mockMvc.perform(get("/categories")).andExpect(status().isOk());

        assertThat(searchLogRepository.findAll())
                .filteredOn(log -> log.getKeyword().equals(keyword))
                .singleElement()
                .satisfies(log -> assertThat(log.getMember()).isNull());
    }

    // 비로그인 검색 - 만료·위조 토큰이 붙어 있어도 비회원으로 조회됨
    @Test
    void guestSearchIgnoresInvalidToken() throws Exception {
        mockMvc.perform(get("/products").header(HttpHeaders.AUTHORIZATION, "Bearer invalid-token"))
                .andExpect(status().isOk());
    }

    // 비로그인 - 상세·관심 수·조회수는 조회되지만 게시 플랫폼은 내려주지 않음
    @Test
    void guestCanGetProductDetailWithoutSellerStats() throws Exception {
        Long productId = createProduct();

        mockMvc.perform(get("/products/{productId}", productId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(productId))
                .andExpect(jsonPath("$.data.platforms").doesNotExist())
                .andExpect(jsonPath("$.data.interestCount").value(0))
                .andExpect(jsonPath("$.data.viewCount").isNumber());
        // 잘못된 토큰도 비로그인으로 처리
        mockMvc.perform(get("/products/{productId}", productId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer invalid-token"))
                .andExpect(status().isOk());
    }

    // 비로그인 - 검색·상세 외 기능(AI 검색·시세 분석·내 상품)과 목록 경로의 다른 메서드는 여전히 로그인 필요
    @Test
    void guestCannotUseFeaturesOtherThanSearch() throws Exception {
        Long productId = saveProduct(uniqueKeyword(), 100_000L, ProductCondition.A, DefectStatus.NORMAL)
                .getId();

        mockMvc.perform(get("/products/analysis/search").param("query", "아이폰")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/products/{productId}/analysis", productId)).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/products/me")).andExpect(status().isUnauthorized());
        mockMvc.perform(multipart("/products").file(imagePart())).andExpect(status().isUnauthorized());
    }

    // AI 상품 검색 - 로그인 회원은 AI가 해석한 조건(키워드·최대 가격·정렬)으로 검색되고, 조건과 해석한 키워드 검색 로그가 남음
    @Test
    void memberCanSearchProductsWithAi() throws Exception {
        String keyword = uniqueKeyword();
        String query = keyword + " 50만원 이하 싼 순으로";
        saveProduct(keyword + " 저가", 100_000L, ProductCondition.A, DefectStatus.NORMAL);
        saveProduct(keyword + " 고가", 600_000L, ProductCondition.A, DefectStatus.NORMAL);
        saveListing(keyword + " 중간", 200_000L, "SELLING");
        when(productAiSearchService.interpret(query))
                .thenReturn(new ProductAiSearchService.Interpretation(
                        true,
                        new ProductSearchCondition(
                                keyword,
                                List.of("깨짐"),
                                null,
                                null,
                                null,
                                500_000L,
                                null,
                                null,
                                ProductSortType.PRICE_LOW)));

        mockMvc.perform(get("/products/analysis/search")
                        .param("query", query)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + sellerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.aiApplied").value(true))
                .andExpect(jsonPath("$.data.condition.keyword").value(keyword))
                .andExpect(jsonPath("$.data.condition.excludeKeyword").value("깨짐"))
                .andExpect(jsonPath("$.data.condition.maxPrice").value(500_000))
                .andExpect(jsonPath("$.data.condition.minPrice").doesNotExist())
                .andExpect(jsonPath("$.data.condition.sort").value("PRICE_LOW"))
                .andExpect(jsonPath("$.data.result.content[*].price", contains(100_000, 200_000)))
                .andExpect(jsonPath("$.data.result.hasNext").value(false));

        assertThat(searchLogRepository.findAll())
                .filteredOn(log -> log.getKeyword().equals(keyword))
                .singleElement()
                .satisfies(log -> assertThat(log.getMember()).isNotNull());
    }

    // AI 상품 검색 - 검색 문장이 비었거나 200자를 넘으면 400
    @Test
    void searchProductsWithAiRejectsInvalidQuery() throws Exception {
        String auth = "Bearer " + sellerToken;
        mockMvc.perform(get("/products/analysis/search").param("query", " ").header(HttpHeaders.AUTHORIZATION, auth))
                .andExpect(status().isBadRequest());
        mockMvc.perform(get("/products/analysis/search")
                        .param("query", "가".repeat(201))
                        .header(HttpHeaders.AUTHORIZATION, auth))
                .andExpect(status().isBadRequest());
        mockMvc.perform(get("/products/analysis/search").header(HttpHeaders.AUTHORIZATION, auth))
                .andExpect(status().isBadRequest());
    }

    // 상품 목록 조회(정렬) - 가격순은 우리 상품·외부 매물을 섞어 정렬하고 커서로 다음 페이지를 이어서 조회함
    @Test
    void getProductsSortsByPriceWithCursor() throws Exception {
        String keyword = uniqueKeyword();
        saveProduct(keyword + " 저가", 100_000L, ProductCondition.A, DefectStatus.NORMAL);
        saveProduct(keyword + " 고가", 300_000L, ProductCondition.A, DefectStatus.NORMAL);
        saveListing(keyword + " 중간", 200_000L, "SELLING");

        String body = searchProducts(keyword, "sort", "PRICE_LOW", "size", "2")
                .andExpect(jsonPath("$.data.content[*].price", contains(100_000, 200_000)))
                .andExpect(jsonPath("$.data.hasNext").value(true))
                .andReturn()
                .getResponse()
                .getContentAsString(StandardCharsets.UTF_8);
        String nextCursor = objectMapper.readTree(body).at("/data/nextCursor").asText();

        searchProducts(keyword, "sort", "PRICE_LOW", "size", "2", "cursor", nextCursor)
                .andExpect(jsonPath("$.data.content[*].price", contains(300_000)))
                .andExpect(jsonPath("$.data.hasNext").value(false));
        searchProducts(keyword, "sort", "PRICE_HIGH")
                .andExpect(jsonPath("$.data.content[*].price", contains(300_000, 200_000, 100_000)));
        // 다른 정렬의 커서는 거부
        searchRequest(keyword, "sort", "LATEST", "cursor", nextCursor).andExpect(status().isBadRequest());
    }

    // 상품 목록 조회(정렬) - 관심순은 관심 등록 수, 추천순은 최근 시세 분석이 BUY인 항목이 먼저
    @Test
    void getProductsSortsByInterestAndRecommendation() throws Exception {
        String keyword = uniqueKeyword();
        Product buyProduct = saveProduct(keyword + " 추천", 100_000L, ProductCondition.A, DefectStatus.NORMAL);
        PlatformListing interestedListing = saveListing(keyword + " 관심", 200_000L, "SELLING");
        saveProduct(keyword + " 최신", 300_000L, ProductCondition.A, DefectStatus.NORMAL);
        Member seller = memberRepository.findById(sellerId).orElseThrow();
        createdInterests.add(interestRepository.save(Interest.ofListing(seller, interestedListing)));
        createdAnalyses.add(productAnalysisRepository.save(ProductAnalysis.create(
                buyProduct,
                90_000L,
                110_000L,
                130_000L,
                null,
                AnalysisRecommendation.BUY,
                null,
                null,
                LocalDateTime.now())));

        searchProducts(keyword, "sort", "INTEREST")
                .andExpect(jsonPath(
                        "$.data.content[*].title", contains(keyword + " 관심", keyword + " 최신", keyword + " 추천")));
        searchProducts(keyword, "sort", "RECOMMENDED")
                .andExpect(jsonPath(
                        "$.data.content[*].title", contains(keyword + " 추천", keyword + " 최신", keyword + " 관심")))
                .andExpect(jsonPath("$.data.content[0].recommendation").value("BUY"));
    }

    // 상품 목록 조회(검색 필터) - 최소 가격이 최대 가격보다 크거나 커서를 해석할 수 없으면 400
    @Test
    void getProductsRejectsInvalidSearchCondition() throws Exception {
        searchRequest("아이폰", "minPrice", "300000", "maxPrice", "100000").andExpect(status().isBadRequest());
        searchRequest("아이폰", "cursor", "not-a-cursor").andExpect(status().isBadRequest());
        searchRequest("아이폰", "sort", "UNKNOWN").andExpect(status().isBadRequest());
    }

    // 인기 검색어 조회 - 키워드로 상품 목록을 조회하면 검색 로그가 남고, 인기검색어 조회에 노출됨
    @Test
    void getPopularKeywordsReflectsRecentSearches() throws Exception {
        createProduct(category, "아이폰 13 프로맥스", sellerToken);

        mockMvc.perform(get("/products")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + sellerToken)
                        .param("keyword", "아이폰"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/products/keywords/trending").header(HttpHeaders.AUTHORIZATION, "Bearer " + sellerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0]").value("아이폰"));
    }

    // 인기 상품 조회 - 관심상품 등록 이력이 없으면 빈 목록 반환(경로가 {productId}와 충돌하지 않음도 함께 확인)
    @Test
    void getPopularProductsReturnsEmptyWhenNoInterests() throws Exception {
        mockMvc.perform(get("/products/popular").header(HttpHeaders.AUTHORIZATION, "Bearer " + sellerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(0));
    }

    // 내 상품 목록 조회 - 본인 것만(품절 포함), 다른 회원 상품은 제외
    @Test
    void getMyProductsIncludesSoldOutAndScopedToSelf() throws Exception {
        Long soldOutProductId = createProduct();
        mockMvc.perform(patch("/products/{productId}/status", soldOutProductId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + sellerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new ProductStatusUpdateRequest(ProductStatus.SOLD_OUT))))
                .andExpect(status().isOk());
        createProduct();

        Member other = memberRepository.save(Member.ofLocalSignUp(
                "other-seller2@example.com", null, "encoded-password", "다른판매자2", "otherSeller2", null));
        String otherToken = jwtTokenProvider.createAccessToken(other.getId(), MemberRole.USER);
        createProduct(category, "아이폰 13", otherToken);

        mockMvc.perform(get("/products/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + sellerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content.length()").value(2));
    }

    // 상품 수정 성공 - 소유자 본인
    @Test
    void updateSucceedsWhenOwner() throws Exception {
        Long productId = createProduct();
        ProductUpdateRequest request = updateRequest(category.getId(), ProductStatus.SOLD_OUT);

        JsonNode data = performStream(multipart(HttpMethod.PATCH, "/products/{productId}", productId)
                        .file(requestPart(request))
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + sellerToken))
                .get("data");

        assertThat(data.get("title").asText()).isEqualTo("아이폰 13 프로");
        assertThat(data.get("brand").asText()).isEqualTo("애플");
        assertThat(data.get("status").asText()).isEqualTo("SOLD_OUT");
        assertThat(data.get("defectStatus").asText()).isEqualTo("ISSUES");
        assertThat(data.get("purchasedMonths").asInt()).isEqualTo(1);
        assertThat(data.at("/includedItems/0").asText()).isEqualTo("케이블");
    }

    // 상품 수정 성공 - 유지할 기존 이미지 뒤에 새 이미지 파일(images)이 이어 붙음
    @Test
    void updateAppendsNewImageFiles() throws Exception {
        Long productId = createProduct();
        ProductUpdateRequest request = updateRequest(category.getId(), ProductStatus.ON_SALE);
        when(fileStorageService.upload(any(), eq("products")))
                .thenReturn(new FileUploadResponse("key", "https://image.example.com/new.png", 3, "image/png"));

        JsonNode data = performStream(multipart(HttpMethod.PATCH, "/products/{productId}", productId)
                        .file(new MockMultipartFile("images", "new.png", "image/png", new byte[] {1, 2, 3}))
                        .file(requestPart(request))
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + sellerToken))
                .get("data");

        assertThat(data.get("imageUrls"))
                .extracting(JsonNode::asText)
                .containsExactly("https://image.example.com/2.png", "https://image.example.com/new.png");
    }

    // 상품 수정 실패 - 유지할 이미지도 새 파일도 없음
    @Test
    void updateFailsWhenNoImages() throws Exception {
        Long productId = createProduct();
        ProductUpdateRequest base = updateRequest(category.getId(), ProductStatus.ON_SALE);
        ProductUpdateRequest request = new ProductUpdateRequest(
                base.categoryId(),
                base.title(),
                base.brand(),
                base.description(),
                base.price(),
                base.status(),
                base.condition(),
                base.defectStatus(),
                base.purchasedMonths(),
                base.allowPriceSuggestion(),
                base.tradeMethod(),
                base.deliveryType(),
                base.preferredTradeRegion(),
                List.of(),
                base.tags(),
                base.includedItems());

        mockMvc.perform(multipart(HttpMethod.PATCH, "/products/{productId}", productId)
                        .file(requestPart(request))
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + sellerToken))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("INVALID_INPUT_VALUE"));
    }

    // 상품 수정 실패 - 소유자가 아님
    @Test
    void updateFailsWhenNotOwner() throws Exception {
        Long productId = createProduct();
        String otherToken = createOtherMemberToken();
        ProductUpdateRequest request = updateRequest(category.getId(), ProductStatus.SOLD_OUT);

        mockMvc.perform(multipart(HttpMethod.PATCH, "/products/{productId}", productId)
                        .file(requestPart(request))
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + otherToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("FORBIDDEN"));
    }

    // 상품 수정 실패 - 존재하지 않는 상품
    @Test
    void updateFailsWhenNotFound() throws Exception {
        ProductUpdateRequest request = updateRequest(category.getId(), ProductStatus.SOLD_OUT);

        mockMvc.perform(multipart(HttpMethod.PATCH, "/products/{productId}", 999_999_999L)
                        .file(requestPart(request))
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + sellerToken))
                .andExpect(status().isNotFound());
    }

    // 상품 상태 변경 성공 - 소유자 본인
    @Test
    void updateStatusSucceedsWhenOwner() throws Exception {
        Long productId = createProduct();

        mockMvc.perform(patch("/products/{productId}/status", productId)
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

        mockMvc.perform(patch("/products/{productId}/status", productId)
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

        mockMvc.perform(delete("/products/{productId}", productId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + sellerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        assertThat(productRepository.existsById(productId)).isFalse();
    }

    // 상품 삭제 실패 - 소유자가 아님
    @Test
    void deleteFailsWhenNotOwner() throws Exception {
        Long productId = createProduct();
        String otherToken = createOtherMemberToken();

        mockMvc.perform(delete("/products/{productId}", productId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + otherToken))
                .andExpect(status().isForbidden());

        assertThat(productRepository.existsById(productId)).isTrue();
    }

    // 상품 삭제 실패 - 인증 없음
    @Test
    void deleteFailsWithoutAuthentication() throws Exception {
        Long productId = createProduct();

        mockMvc.perform(delete("/products/{productId}", productId)).andExpect(status().isUnauthorized());
    }

    // 상품 재삭제 - 이미 삭제된 상품은 404
    @Test
    void deleteFailsWhenAlreadyDeleted() throws Exception {
        Long productId = createProduct();
        mockMvc.perform(delete("/products/{productId}", productId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + sellerToken))
                .andExpect(status().isOk());

        mockMvc.perform(delete("/products/{productId}", productId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + sellerToken))
                .andExpect(status().isNotFound());
    }

    // 상품 등록 실패 - 하위 카테고리가 있는(최하위가 아닌) 카테고리
    @Test
    void createFailsWhenCategoryNotLeaf() throws Exception {
        Category parent = createCategory();
        createChildCategory(parent);

        mockMvc.perform(multipart("/products")
                        .file(imagePart())
                        .file(requestPart(createRequest(parent.getId())))
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + sellerToken))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("INVALID_INPUT_VALUE"));

        assertThat(productRepository.count()).isZero();
    }

    // 시세 수집 대상은 분석 대상(등록됨·판매중) 우리 상품이 있는 카테고리의 번개장터 매핑뿐(V13 시드: 스마트폰 = 600700001)
    @Test
    void collectTargetsOnlyCategoriesWithAnalysisTargetProducts() throws Exception {
        Category smartphone = categoryRepository.findAll().stream()
                .filter(c -> c.getName().equals("스마트폰") && c.getParent() != null)
                .filter(c -> c.getParent().getName().equals("휴대폰"))
                .findFirst()
                .orElseThrow();
        createProduct(smartphone);

        List<CategoryPlatform> targets =
                categoryPlatformRepository.findCollectTargets("번개장터", ProductStatus.ANALYSIS_TARGETS);

        assertThat(targets).extracting(CategoryPlatform::getExternalCategoryId).containsExactly("600700001");
    }

    private ResultActions searchRequest(String keyword, String... params) throws Exception {
        MockHttpServletRequestBuilder builder = get("/products")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + sellerToken)
                .param("keyword", keyword);
        for (int i = 0; i < params.length; i += 2) {
            builder.param(params[i], params[i + 1]);
        }
        return mockMvc.perform(builder);
    }

    private ResultActions searchProducts(String keyword, String... params) throws Exception {
        return searchRequest(keyword, params).andExpect(status().isOk());
    }

    /** 다른 테스트 클래스가 남긴 상품·매물과 섞이지 않도록 검색어로 쓸 고유 단어. */
    private static String uniqueKeyword() {
        return "검색" + UUID.randomUUID().toString().substring(0, 8);
    }

    private Product saveProduct(String title, long price, ProductCondition condition, DefectStatus defectStatus) {
        Member seller = memberRepository.findById(sellerId).orElseThrow();
        return productRepository.save(Product.create(
                seller,
                category,
                title,
                null,
                "설명",
                price,
                condition,
                defectStatus,
                null,
                false,
                TradeMethod.DIRECT,
                null,
                null,
                List.of("https://image.example.com/1.png"),
                Set.of(),
                Set.of()));
    }

    private PlatformListing saveListing(String title, long price, String status) {
        Platform platform = platformRepository.findByName("번개장터").orElseThrow();
        PlatformListing listing = platformListingRepository.save(PlatformListing.create(
                platform, category, "search-" + UUID.randomUUID(), title, price, status, null, null));
        createdListings.add(listing);
        return listing;
    }

    private Long createProduct() throws Exception {
        return createProduct(category);
    }

    private Long createProduct(Category productCategory) throws Exception {
        return createProduct(productCategory, "아이폰 13", sellerToken);
    }

    private Long createProduct(Category productCategory, String title, String token) throws Exception {
        ProductCreateRequest request = createRequest(productCategory.getId(), title);
        JsonNode complete = performStream(multipart("/products")
                .file(imagePart())
                .file(requestPart(request))
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token));

        return complete.at("/data/id").asLong();
    }

    /**
     * SSE로 응답하는 등록·수정 요청을 끝까지 받아 마지막 이벤트(complete)의 JSON을 반환한다. 이벤트는 {@code data:} 한 줄에
     * 기존 API 응답과 같은 형태로 온다.
     */
    private JsonNode performStream(RequestBuilder builder) throws Exception {
        MvcResult started =
                mockMvc.perform(builder).andExpect(request().asyncStarted()).andReturn();
        started.getAsyncResult(10_000);
        String body = mockMvc.perform(asyncDispatch(started))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString(StandardCharsets.UTF_8);
        String last = null;
        for (String line : body.split("\n")) {
            if (line.startsWith("data:")) {
                last = line.substring("data:".length());
            }
        }
        JsonNode complete = objectMapper.readTree(last);
        assertThat(complete.at("/data/event").asText()).isEqualTo("complete");
        return complete;
    }

    private String createOtherMemberToken() {
        Member other = memberRepository.save(
                Member.ofLocalSignUp("buyer@example.com", null, "encoded-password", "구매자", "buyer", null));
        return jwtTokenProvider.createAccessToken(other.getId(), MemberRole.USER);
    }

    /** {@code images} 멀티파트 파트로 보낼 더미 이미지 파일 하나. */
    private MockMultipartFile imagePart() {
        return new MockMultipartFile("images", "photo.png", "image/png", new byte[] {1, 2, 3});
    }

    /** {@code data} 멀티파트 파트로 보낼 JSON 본문(등록 정보). */
    private MockMultipartFile requestPart(Object request) throws Exception {
        return new MockMultipartFile(
                "data", "data.json", MediaType.APPLICATION_JSON_VALUE, objectMapper.writeValueAsBytes(request));
    }

    private ProductCreateRequest createRequest(Long categoryId) {
        return createRequest(categoryId, "아이폰 13");
    }

    private ProductCreateRequest createRequest(Long categoryId, String title) {
        return new ProductCreateRequest(
                categoryId,
                title,
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
    }

    private ProductUpdateRequest updateRequest(Long categoryId, ProductStatus status) {
        return new ProductUpdateRequest(
                categoryId,
                "아이폰 13 프로",
                "애플",
                "수정된 설명",
                450_000L,
                status,
                ProductCondition.B,
                DefectStatus.ISSUES,
                1,
                false,
                TradeMethod.DELIVERY,
                null,
                null,
                List.of("https://image.example.com/2.png"),
                List.of(),
                List.of("케이블"));
    }

    private Category createChildCategory(Category parent) {
        try {
            Constructor<Category> constructor = Category.class.getDeclaredConstructor();
            constructor.setAccessible(true);
            Category child = constructor.newInstance();
            Field nameField = Category.class.getDeclaredField("name");
            nameField.setAccessible(true);
            nameField.set(child, "테스트카테고리-" + UUID.randomUUID());
            Field parentField = Category.class.getDeclaredField("parent");
            parentField.setAccessible(true);
            parentField.set(child, parent);
            return categoryRepository.save(child);
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException(e);
        }
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
