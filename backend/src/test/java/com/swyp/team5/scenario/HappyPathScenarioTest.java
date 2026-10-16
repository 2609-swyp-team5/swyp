package com.swyp.team5.scenario;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.asyncDispatch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.StreamSupport;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.swyp.team5.file.dto.FileUploadResponse;
import com.swyp.team5.notification.service.NotificationService;
import com.swyp.team5.product.dto.ProductAiAnalysisResult;
import com.swyp.team5.product.dto.ProductCreateRequest;
import com.swyp.team5.product.entity.DefectStatus;
import com.swyp.team5.product.entity.IncludedStatus;
import com.swyp.team5.product.entity.Product;
import com.swyp.team5.product.entity.ProductCondition;
import com.swyp.team5.product.entity.TradeMethod;
import com.swyp.team5.product.repository.ProductRepository;
import com.swyp.team5.productanalysis.entity.AnalysisRecommendation;
import com.swyp.team5.productanalysis.entity.ProductAnalysis;
import com.swyp.team5.productanalysis.repository.ProductAnalysisRepository;
import com.swyp.team5.support.IntegrationTest;
import org.junit.jupiter.api.Test;

/**
 * 판매자·구매자 정상 흐름 전체를 API 순서대로 한 번에 따라가는 시나리오 테스트. 기능별 세부 검증은 각 도메인 테스트가 맡고, 여기서는 앞 단계의
 * 결과(토큰·상품 ID·관심상품 ID)를 다음 단계가 그대로 이어 받아 화면 흐름이 끊기지 않는지만 본다.
 *
 * <p>외부 호출(사진 AI 분석·파일 저장)은 {@link IntegrationTest}의 Mock을 쓰고, 시세 분석 배치는 실제 AI를 부르므로 배치가 저장하는 분석
 * 결과와 추천 전환 알림을 직접 만들어 대신한다.
 */
class HappyPathScenarioTest extends IntegrationTest {

    private static final String PASSWORD = "scenario1234";
    private static final String TITLE = "시나리오 아이패드 미니 6";

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private ProductAnalysisRepository productAnalysisRepository;

    @Autowired
    private NotificationService notificationService;

    @Test
    void sellerAndBuyerCompleteTheMainFlow() throws Exception {
        // 1. 판매자 가입·로그인
        String sellerToken = signUpAndLogin("seller-scenario@example.com", "판매자");
        mockMvc.perform(get("/users/me").with(bearer(sellerToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.email").value("seller-scenario@example.com"));

        // 2. 등록 화면 — 카테고리(리프만 등록 가능)
        long categoryId = firstLeafCategoryId();

        // 3. 직접 등록(SSE) — 사진 AI 분석 결과(추천가)가 붙고, 등록 직후는 임시저장(DRAFT)
        when(fileStorageService.upload(any(), eq("products")))
                .thenReturn(new FileUploadResponse(
                        "products/scenario-1", "https://image.example.com/scenario-1.png", 3, "image/png"));
        when(productAiService.analyze(anyList())).thenReturn(aiResult(categoryId));
        JsonNode registered = registerProduct(sellerToken, categoryId);
        long productId = registered.get("id").asLong();
        assertThat(registered.get("status").asText()).isEqualTo("DRAFT");
        assertThat(registered.get("price").asLong()).isEqualTo(500_000L);
        assertThat(registered.get("suggestedPrice").asLong()).isEqualTo(480_000L);

        // 4. 판매 관리 — 내 상품 목록·상세에서 확인
        JsonNode myProducts = body(mockMvc.perform(get("/products/me").with(bearer(sellerToken))));
        assertThat(ids(myProducts.at("/data/content"))).contains(productId);
        mockMvc.perform(get("/products/{id}", productId).with(bearer(sellerToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title").value(TITLE))
                .andExpect(jsonPath("$.data.imageUrls[0]").value("https://image.example.com/scenario-1.png"));

        // 5. 공개 목록은 외부 게시 전(DRAFT) 상품도 보여 줌(팀 결정) — 판매중으로 전환
        assertThat(searchOurProductIds()).contains(productId);
        changeStatus(sellerToken, productId, "{\"status\": \"ON_SALE\"}")
                .andExpect(jsonPath("$.data.status").value("ON_SALE"));

        // 6. 구매자 — 비로그인 검색·상세 조회 후 가입·로그인
        assertThat(searchOurProductIds()).contains(productId);
        mockMvc.perform(get("/products/{id}", productId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title").value(TITLE));
        String buyerToken = signUpAndLogin("buyer-scenario@example.com", "구매자");

        // 7. 관심 등록 → 관심 목록(분석 전이라 분석대기)
        long interestId = body(mockMvc.perform(post("/interests")
                                .with(bearer(buyerToken))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"source\": \"OUR\", \"targetId\": " + productId + "}"))
                        .andExpect(status().isCreated()))
                .at("/data/interestId")
                .asLong();
        JsonNode interest = onlyInterest(buyerToken);
        assertThat(interest.get("interestId").asLong()).isEqualTo(interestId);
        assertThat(interest.get("targetId").asLong()).isEqualTo(productId);
        assertThat(interest.get("interestStatus").asText()).isEqualTo("PENDING");

        // 8. 목표가 설정(현재가 500,000원 > 목표가 450,000원 — 아직 알림 없음)
        mockMvc.perform(patch("/interests/{id}/target-price", interestId)
                        .with(bearer(buyerToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"targetPrice\": 450000}"))
                .andExpect(status().isOk());
        assertThat(notificationTypes(buyerToken)).isEmpty();

        // 9. 시세 분석 배치(대체) — 분석 결과 저장 + 추천 전환 알림
        Product product = productRepository.findById(productId).orElseThrow();
        ProductAnalysis analysis = ProductAnalysis.builder()
                .product(product)
                .minPrice(420_000L)
                .averagePrice(470_000L)
                .maxPrice(520_000L)
                .recommendation(AnalysisRecommendation.SELL)
                .analyzedAt(LocalDateTime.now())
                .build();
        analysis.assignBuyerView(AnalysisRecommendation.WAIT, "평균 시세보다 비싸요");
        productAnalysisRepository.save(analysis);
        notificationService.notifyRecommendationChanged(product, null, AnalysisRecommendation.SELL);

        // 10. 판매자 — 분석 결과·알림 확인, 알림 읽음
        mockMvc.perform(get("/products/{id}/analysis", productId).with(bearer(sellerToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.recommendation").value("SELL"))
                .andExpect(jsonPath("$.data.averagePrice").value(470_000));
        mockMvc.perform(get("/products/{id}/summary", productId).with(bearer(sellerToken)))
                .andExpect(status().isOk());
        JsonNode sellerNotifications =
                body(mockMvc.perform(get("/notifications").with(bearer(sellerToken))));
        assertThat(sellerNotifications.at("/data/content/0/type").asText()).isEqualTo("SELL");
        long notificationId =
                sellerNotifications.at("/data/content/0/notificationId").asLong();
        mockMvc.perform(get("/notifications/unread").with(bearer(sellerToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.count").value(1));
        mockMvc.perform(patch("/notifications/{id}/read", notificationId).with(bearer(sellerToken)))
                .andExpect(status().isOk());
        mockMvc.perform(get("/notifications/unread").with(bearer(sellerToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.count").value(0));

        // 11. 구매자 — 같은 상품을 구매자 관점으로 조회, 관심 목록도 분석 결과 반영
        mockMvc.perform(get("/products/{id}/analysis", productId)
                        .param("perspective", "BUY")
                        .with(bearer(buyerToken)))
                .andExpect(status().isOk());
        assertThat(onlyInterest(buyerToken).get("interestStatus").asText()).isIn("BUY", "WAIT");

        // 12. 판매자가 판매 관리에서 가격을 목표가 아래로 내리면 구매자에게 목표가 도달 알림
        mockMvc.perform(patch("/products/{id}/price", productId)
                        .with(bearer(sellerToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"price\": 440000}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.price").value(440_000));
        assertThat(notificationTypes(buyerToken)).contains("TARGET_PRICE");

        // 13. 판매 완료 — 판매가 기록, 구매자 관심 목록은 판매 종료
        changeStatus(
                        sellerToken,
                        productId,
                        "{\"status\": \"SOLD_OUT\", \"soldPrice\": 440000, \"soldPlatform\": \"직거래\"}")
                .andExpect(jsonPath("$.data.status").value("SOLD_OUT"));
        assertThat(onlyInterest(buyerToken).get("interestStatus").asText()).isEqualTo("SOLD_OUT");

        // 14. 홈 요약·로그아웃
        mockMvc.perform(get("/home/summary").with(bearer(sellerToken))).andExpect(status().isOk());
        mockMvc.perform(post("/auth/logout").with(bearer(sellerToken))).andExpect(status().isOk());
        mockMvc.perform(post("/auth/logout").with(bearer(buyerToken))).andExpect(status().isOk());
    }

    private String signUpAndLogin(String email, String name) throws Exception {
        mockMvc.perform(get("/auth/email/check").param("email", email))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.available").value(true));
        mockMvc.perform(post("/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                Map.of("email", email, "password", PASSWORD, "name", name, "nickname", name))))
                .andExpect(status().isCreated());
        return body(mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("email", email, "password", PASSWORD)))))
                .at("/data/accessToken")
                .asText();
    }

    private long firstLeafCategoryId() throws Exception {
        JsonNode categories = body(mockMvc.perform(get("/categories"))).get("data");
        return StreamSupport.stream(categories.spliterator(), false)
                .filter(category -> category.get("leaf").asBoolean())
                .findFirst()
                .orElseThrow()
                .get("id")
                .asLong();
    }

    private JsonNode registerProduct(String token, long categoryId) throws Exception {
        ProductCreateRequest request = new ProductCreateRequest(
                categoryId,
                TITLE,
                "애플",
                "생활 기스 조금 있고 배터리 효율 좋아요",
                500_000L,
                ProductCondition.A,
                DefectStatus.NORMAL,
                3,
                true,
                TradeMethod.DIRECT,
                null,
                "서울시 마포구",
                List.of("아이패드"),
                List.of("충전기"),
                null,
                IncludedStatus.ALL,
                null);
        MvcResult started = mockMvc.perform(multipart("/products")
                        .file(new MockMultipartFile("images", "photo.png", "image/png", new byte[] {1, 2, 3}))
                        .file(new MockMultipartFile(
                                "data", "", MediaType.APPLICATION_JSON_VALUE, objectMapper.writeValueAsBytes(request)))
                        .with(bearer(token))
                        .accept(MediaType.TEXT_EVENT_STREAM))
                .andExpect(request().asyncStarted())
                .andReturn();
        started.getAsyncResult(10_000);
        String stream = mockMvc.perform(asyncDispatch(started))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString(StandardCharsets.UTF_8);
        JsonNode last = lastSseData(stream);
        assertThat(last.get("success").asBoolean()).isTrue();
        assertThat(last.at("/data/event").asText()).isEqualTo("complete");
        return last.get("data");
    }

    private JsonNode lastSseData(String stream) throws Exception {
        List<String> payloads = new ArrayList<>();
        for (String line : stream.split("\n")) {
            if (line.startsWith("data:")) {
                payloads.add(line.substring("data:".length()));
            }
        }
        return objectMapper.readTree(payloads.getLast());
    }

    private org.springframework.test.web.servlet.ResultActions changeStatus(String token, long productId, String json)
            throws Exception {
        return mockMvc.perform(patch("/products/{id}/status", productId)
                        .with(bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isOk());
    }

    private List<Long> searchOurProductIds() throws Exception {
        return ids(body(mockMvc.perform(
                        get("/products").param("keyword", "시나리오 아이패드").param("platform", "OUR")))
                .at("/data/content"));
    }

    private JsonNode onlyInterest(String token) throws Exception {
        JsonNode content =
                body(mockMvc.perform(get("/interests").with(bearer(token)))).at("/data/content");
        assertThat(content.size()).isEqualTo(1);
        return content.get(0);
    }

    private List<String> notificationTypes(String token) throws Exception {
        JsonNode content =
                body(mockMvc.perform(get("/notifications").with(bearer(token)))).at("/data/content");
        return StreamSupport.stream(content.spliterator(), false)
                .map(notification -> notification.get("type").asText())
                .toList();
    }

    private JsonNode body(org.springframework.test.web.servlet.ResultActions actions) throws Exception {
        String json = actions.andExpect(status().is2xxSuccessful())
                .andReturn()
                .getResponse()
                .getContentAsString(StandardCharsets.UTF_8);
        return objectMapper.readTree(json);
    }

    private static List<Long> ids(JsonNode content) {
        return StreamSupport.stream(content.spliterator(), false)
                .map(item -> item.get("id").asLong())
                .toList();
    }

    private static org.springframework.test.web.servlet.request.RequestPostProcessor bearer(String token) {
        return request -> {
            request.addHeader(HttpHeaders.AUTHORIZATION, "Bearer " + token);
            return request;
        };
    }

    private static ProductAiAnalysisResult aiResult(long categoryId) {
        return new ProductAiAnalysisResult(
                categoryId,
                "아이패드 미니 6세대",
                "애플",
                "AI가 분석한 상품 설명입니다",
                ProductCondition.A,
                480_000L,
                "같은 모델 최근 시세 기준",
                List.of(),
                List.of());
    }
}
