package com.swyp.team5.product;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.asyncDispatch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.lang.reflect.Constructor;
import java.lang.reflect.Field;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
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
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockMultipartHttpServletRequestBuilder;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.swyp.team5.auth.service.RefreshTokenService;
import com.swyp.team5.category.entity.Category;
import com.swyp.team5.category.repository.CategoryRepository;
import com.swyp.team5.common.passport.JwtTokenProvider;
import com.swyp.team5.file.dto.FileUploadResponse;
import com.swyp.team5.file.error.FileStorageException;
import com.swyp.team5.file.service.FileStorageService;
import com.swyp.team5.member.entity.Member;
import com.swyp.team5.member.entity.MemberRole;
import com.swyp.team5.member.repository.MemberRepository;
import com.swyp.team5.product.dto.ProductAiAnalysisResult;
import com.swyp.team5.product.dto.ProductCreateRequest;
import com.swyp.team5.product.entity.DefectStatus;
import com.swyp.team5.product.entity.ProductCondition;
import com.swyp.team5.product.entity.TradeMethod;
import com.swyp.team5.product.repository.ProductRepository;
import com.swyp.team5.product.service.ProductAiService;
import com.swyp.team5.tag.repository.TagRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

// 상품 단계별 스트리밍 등록(v2, SSE) 통합 테스트.
@SpringBootTest
@AutoConfigureMockMvc
class ProductV2Test {

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

    private String sellerToken;
    private Category category;

    @BeforeEach
    void setUp() {
        productRepository.deleteAll();
        tagRepository.deleteAll();
        memberRepository.deleteAll();

        Member seller = memberRepository.save(
                Member.ofLocalSignUp("seller-v2@example.com", null, "encoded-password", "판매자", "seller", null));
        sellerToken = jwtTokenProvider.createAccessToken(seller.getId(), MemberRole.USER);
        category = createCategory(null);
        when(fileStorageService.upload(any(), eq("products")))
                .thenReturn(
                        new FileUploadResponse("products/key-1", "https://image.example.com/1.png", 3, "image/png"));
    }

    // 직접 등록 성공 - 업로드 → 분석 → 저장 순으로 step 이벤트, 마지막에 기존 등록 응답과 같은 형식의 complete 이벤트
    @Test
    void createStreamsStepsAndCompletes() throws Exception {
        when(productAiService.analyze(anyList())).thenReturn(analysis(category.getId()));

        List<SseEvent> events = streamEvents(directRequest(createRequest(category.getId())));

        assertThat(events)
                .extracting(SseEvent::name, SseEvent::stepStatus)
                .containsExactly(
                        tuple("step", "IMAGE_UPLOAD:START"),
                        tuple("step", "IMAGE_UPLOAD:DONE"),
                        tuple("step", "IMAGE_ANALYSIS:START"),
                        tuple("step", "IMAGE_ANALYSIS:DONE"),
                        tuple("step", "PRODUCT_SAVE:START"),
                        tuple("step", "PRODUCT_SAVE:DONE"),
                        tuple("complete", null));
        assertThat(events.get(1).data().at("/result/imageCount").asInt()).isEqualTo(1);
        assertThat(events.get(3).data().at("/result/suggestedPrice").asLong()).isEqualTo(470_000L);
        assertThat(events.get(1).data().get("index").asInt()).isEqualTo(1);
        assertThat(events.get(1).data().get("total").asInt()).isEqualTo(3);

        JsonNode product = events.getLast().data().get("data");
        assertThat(events.getLast().data().get("success").asBoolean()).isTrue();
        // 최종 응답은 기존 등록 응답과 같은 형태(data = 상품 필드 그대로 + analysis), 단계 결과 목록(steps)은 없음
        assertThat(events.getLast().data().has("steps")).isFalse();
        assertThat(events.getLast().data().has("analysis")).isFalse();
        // 가격·분석 정보 모음은 data 하위
        JsonNode analysis = product.get("analysis");
        assertThat(analysis.get("status").asText()).isEqualTo("DONE");
        assertThat(analysis.get("suggestedPrice").asLong()).isEqualTo(470_000L);
        assertThat(analysis.get("analysisDescription").asText()).isEqualTo("판단 근거");
        assertThat(analysis.get("marketAveragePrice").isNull()).isTrue(); // 수집 매물이 없어 평균가 없음
        assertThat(analysis.get("recommendation").isNull()).isTrue(); // 등록 직후엔 시세 분석 전
        assertThat(analysis.get("title").asText()).isEqualTo("AI 제목"); // 상품엔 저장 안 된 AI 추론값
        assertThat(analysis.get("condition").asText()).isEqualTo("A");
        assertThat(analysis.has("aiResult")).isFalse(); // AI 추론값은 analysis에 바로 펼쳐짐
        assertThat(product.get("title").asText()).isEqualTo("아이폰 13"); // 직접 등록은 사용자 입력 우선
        assertThat(product.get("price").asLong()).isEqualTo(500_000L);
        assertThat(product.get("suggestedPrice").asLong()).isEqualTo(470_000L);
        assertThat(product.get("analysisDescription").asText()).isEqualTo("판단 근거");
        assertThat(product.at("/imageUrls/0").asText()).isEqualTo("https://image.example.com/1.png");
        assertThat(productRepository.count()).isEqualTo(1);
        verify(fileStorageService, never()).deleteAll(anyList());
    }

    // 직접 등록 - AI 분석이 실패해도 SKIP 후 추천 가격 없이 등록
    @Test
    void createSkipsAnalysisWhenAiFails() throws Exception {
        when(productAiService.analyze(anyList())).thenThrow(new IllegalStateException("gemini down"));

        List<SseEvent> events = streamEvents(directRequest(createRequest(category.getId())));

        assertThat(events).extracting(SseEvent::stepStatus).contains("IMAGE_ANALYSIS:SKIP");
        SseEvent complete = events.getLast();
        assertThat(complete.name()).isEqualTo("complete");
        assertThat(complete.data().at("/data/suggestedPrice").isNull()).isTrue();
        assertThat(complete.data().at("/data/analysisDescription").isNull()).isTrue();
        assertThat(complete.data().at("/data/analysis/status").asText()).isEqualTo("SKIP");
        assertThat(complete.data().at("/data/analysis/suggestedPrice").isNull()).isTrue();
        assertThat(complete.data().at("/data/analysis/title").isNull()).isTrue(); // 건너뛰면 AI 추론값 없음
        assertThat(complete.data().at("/data/analysis/condition").isNull()).isTrue();
        assertThat(productRepository.count()).isEqualTo(1);
    }

    // AI 등록 성공 - 분석 결과로 상품을 채우고, 분석 단계 이벤트에 미리보기 결과 포함
    @Test
    void createFromImagesStreamsAnalysisPreview() throws Exception {
        when(productAiService.analyze(anyList())).thenReturn(analysis(category.getId()));

        List<SseEvent> events = streamEvents(aiRequest());

        SseEvent analysisDone = events.stream()
                .filter(event -> "IMAGE_ANALYSIS:DONE".equals(event.stepStatus()))
                .findFirst()
                .orElseThrow();
        assertThat(analysisDone.data().at("/result/title").asText()).isEqualTo("AI 제목");
        assertThat(analysisDone.data().at("/result/categoryId").asLong()).isEqualTo(category.getId());

        JsonNode product = events.getLast().data().get("data");
        assertThat(events.getLast().name()).isEqualTo("complete");
        assertThat(product.get("title").asText()).isEqualTo("AI 제목");
        assertThat(product.get("price").asLong()).isEqualTo(470_000L);
        assertThat(product.get("tradeMethod").asText()).isEqualTo("DIRECT");
        assertThat(product.get("defectStatus").asText()).isEqualTo("NORMAL");
        assertThat(events.getLast().data().at("/data/analysis/suggestedPrice").asLong())
                .isEqualTo(470_000L);
        assertThat(events.getLast().data().at("/data/analysis/categoryId").asLong())
                .isEqualTo(category.getId());
        assertThat(productRepository.count()).isEqualTo(1);
    }

    // AI 등록 - 분석 실패 시 업로드한 파일을 지우고 error 이벤트, 상품은 저장하지 않음
    @Test
    void createFromImagesFailsAndDeletesUploadedFilesWhenAiFails() throws Exception {
        when(productAiService.analyze(anyList())).thenThrow(new IllegalStateException("gemini down"));

        List<SseEvent> events = streamEvents(aiRequest());

        SseEvent error = events.getLast();
        assertThat(error.name()).isEqualTo("error");
        assertThat(error.data().get("success").asBoolean()).isFalse();
        assertThat(error.data().get("step").asText()).isEqualTo("IMAGE_ANALYSIS");
        assertThat(error.data().has("steps")).isFalse();
        assertThat(error.data().at("/error/code").asText()).isEqualTo("AI_ANALYSIS_FAILED");
        assertThat(productRepository.count()).isZero();
        verify(fileStorageService).deleteAll(List.of("products/key-1"));
    }

    // 업로드 도중 실패 - 먼저 올라간 파일만 지우고 error 이벤트
    @Test
    void createFailsAndDeletesPartiallyUploadedFiles() throws Exception {
        when(fileStorageService.upload(any(), eq("products")))
                .thenReturn(new FileUploadResponse("products/key-1", "https://image.example.com/1.png", 3, "image/png"))
                .thenThrow(new FileStorageException("R2 down"));

        List<SseEvent> events = streamEvents(directRequest(createRequest(category.getId()))
                .file(new MockMultipartFile("images", "photo2.png", "image/png", new byte[] {4, 5, 6})));

        SseEvent error = events.getLast();
        assertThat(error.name()).isEqualTo("error");
        assertThat(error.data().get("step").asText()).isEqualTo("IMAGE_UPLOAD");
        assertThat(error.data().at("/error/code").asText()).isEqualTo("IMAGE_UPLOAD_FAILED");
        assertThat(productRepository.count()).isZero();
        verify(fileStorageService).deleteAll(List.of("products/key-1"));
    }

    // 스트림 시작 전 검사 - 최하위가 아닌 카테고리는 스트림을 열지 않고 400 JSON
    @Test
    void createRejectsNonLeafCategoryBeforeStreaming() throws Exception {
        createCategory(category); // category에 하위를 만들어 중간 노드로

        mockMvc.perform(directRequest(createRequest(category.getId())))
                .andExpect(status().isBadRequest())
                .andExpect(header().string(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE))
                .andExpect(jsonPath("$.error.code").value("INVALID_INPUT_VALUE"));
        verify(fileStorageService, never()).upload(any(), any());
    }

    // 스트림 시작 전 검사 - 빈 이미지 파일은 400 JSON
    @Test
    void createFromImagesRejectsEmptyFileBeforeStreaming() throws Exception {
        mockMvc.perform(multipart("/products/v2/analyze")
                        .file(new MockMultipartFile("images", "empty.png", "image/png", new byte[0]))
                        .param("defectStatus", "NORMAL")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + sellerToken)
                        .accept(MediaType.TEXT_EVENT_STREAM))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    // 인증 없이 요청하면 401
    @Test
    void createRequiresAuthentication() throws Exception {
        mockMvc.perform(multipart("/products/v2/analyze")
                        .file(imagePart())
                        .param("defectStatus", "NORMAL")
                        .accept(MediaType.TEXT_EVENT_STREAM))
                .andExpect(status().isUnauthorized());
    }

    private List<SseEvent> streamEvents(MockMultipartHttpServletRequestBuilder builder) throws Exception {
        MvcResult started =
                mockMvc.perform(builder).andExpect(request().asyncStarted()).andReturn();
        started.getAsyncResult(10_000);
        String body = mockMvc.perform(asyncDispatch(started))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString(StandardCharsets.UTF_8);
        return parse(body);
    }

    private List<SseEvent> parse(String body) throws Exception {
        List<SseEvent> events = new ArrayList<>();
        for (String block : body.split("\n\n")) {
            String name = null;
            StringBuilder data = new StringBuilder();
            for (String line : block.split("\n")) {
                if (line.startsWith("event:")) {
                    name = line.substring("event:".length()).trim();
                } else if (line.startsWith("data:")) {
                    data.append(line.substring("data:".length()));
                }
            }
            if (name != null) {
                events.add(new SseEvent(name, objectMapper.readTree(data.toString())));
            }
        }
        return events;
    }

    private MockMultipartHttpServletRequestBuilder directRequest(ProductCreateRequest request) throws Exception {
        return (MockMultipartHttpServletRequestBuilder) multipart("/products/v2")
                .file(imagePart())
                .file(new MockMultipartFile(
                        "data", "", MediaType.APPLICATION_JSON_VALUE, objectMapper.writeValueAsBytes(request)))
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + sellerToken)
                .accept(MediaType.TEXT_EVENT_STREAM);
    }

    private MockMultipartHttpServletRequestBuilder aiRequest() {
        return (MockMultipartHttpServletRequestBuilder) multipart("/products/v2/analyze")
                .file(imagePart())
                .param("defectStatus", "NORMAL")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + sellerToken)
                .accept(MediaType.TEXT_EVENT_STREAM);
    }

    private static MockMultipartFile imagePart() {
        return new MockMultipartFile("images", "photo.png", "image/png", new byte[] {1, 2, 3});
    }

    private static ProductAiAnalysisResult analysis(Long categoryId) {
        return new ProductAiAnalysisResult(
                categoryId, "AI 제목", "애플", "AI 설명", ProductCondition.A, 470_000L, "판단 근거", List.of(), List.of());
    }

    private static ProductCreateRequest createRequest(Long categoryId) {
        return new ProductCreateRequest(
                categoryId,
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
    }

    private static org.assertj.core.groups.Tuple tuple(Object... values) {
        return org.assertj.core.groups.Tuple.tuple(values);
    }

    private Category createCategory(Category parent) {
        try {
            Constructor<Category> constructor = Category.class.getDeclaredConstructor();
            constructor.setAccessible(true);
            Category newCategory = constructor.newInstance();
            Field nameField = Category.class.getDeclaredField("name");
            nameField.setAccessible(true);
            nameField.set(newCategory, "테스트카테고리-" + UUID.randomUUID());
            Field parentField = Category.class.getDeclaredField("parent");
            parentField.setAccessible(true);
            parentField.set(newCategory, parent);
            return categoryRepository.save(newCategory);
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException(e);
        }
    }

    private record SseEvent(String name, JsonNode data) {

        /** step 이벤트면 "단계:상태", 아니면 null. */
        String stepStatus() {
            return "step".equals(name)
                    ? data.get("step").asText() + ":" + data.get("status").asText()
                    : null;
        }
    }
}
