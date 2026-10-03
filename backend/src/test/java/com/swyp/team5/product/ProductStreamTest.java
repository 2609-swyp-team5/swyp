package com.swyp.team5.product;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
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
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockMultipartHttpServletRequestBuilder;
import org.springframework.web.multipart.MultipartFile;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.swyp.team5.category.entity.Category;
import com.swyp.team5.category.repository.CategoryRepository;
import com.swyp.team5.common.passport.JwtTokenProvider;
import com.swyp.team5.file.dto.FileUploadResponse;
import com.swyp.team5.file.dto.InMemoryMultipartFile;
import com.swyp.team5.file.error.FileStorageException;
import com.swyp.team5.member.entity.Member;
import com.swyp.team5.member.entity.MemberRole;
import com.swyp.team5.member.repository.MemberRepository;
import com.swyp.team5.product.dto.ProductAiAnalysisResult;
import com.swyp.team5.product.dto.ProductCreateRequest;
import com.swyp.team5.product.dto.ProductUpdateRequest;
import com.swyp.team5.product.entity.DefectStatus;
import com.swyp.team5.product.entity.ProductCondition;
import com.swyp.team5.product.entity.ProductStatus;
import com.swyp.team5.product.entity.TradeMethod;
import com.swyp.team5.product.repository.ProductRepository;
import com.swyp.team5.support.IntegrationTest;
import com.swyp.team5.tag.repository.TagRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

// 상품 단계별 스트리밍 등록·수정(SSE) 통합 테스트.
class ProductStreamTest extends IntegrationTest {

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

    private String sellerToken;
    private Category category;

    @BeforeEach
    void setUp() {
        productRepository.deleteAll();
        tagRepository.deleteAll();
        memberRepository.deleteAll();

        Member seller = memberRepository.save(
                Member.ofLocalSignUp("seller-stream@example.com", null, "encoded-password", "판매자", "seller", null));
        sellerToken = jwtTokenProvider.createAccessToken(seller.getId(), MemberRole.USER);
        category = createCategory(null);
        when(fileStorageService.upload(any(), eq("products")))
                .thenReturn(
                        new FileUploadResponse("products/key-1", "https://image.example.com/1.png", 3, "image/png"));
        when(productImageLoader.load(any()))
                .thenAnswer(invocation ->
                        InMemoryMultipartFile.of("images", "stored.png", "image/png", new byte[] {7, 8, 9}));
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
        assertThat(events.get(1).data().at("/data/result/imageCount").asInt()).isEqualTo(1);
        assertThat(events.get(3).data().at("/data/result/suggestedPrice").asLong())
                .isEqualTo(470_000L);
        assertThat(events.get(1).data().at("/data/index").asInt()).isEqualTo(1);
        assertThat(events.get(1).data().at("/data/total").asInt()).isEqualTo(3);
        // 진행 이벤트도 기존 API 응답 형태: 진행 문구는 message, 단계 정보는 data
        assertThat(events.get(1).data().get("success").asBoolean()).isTrue();
        assertThat(events.get(1).data().get("message").asText()).isEqualTo("이미지 1장 업로드 완료");
        assertThat(events.get(1).data().get("error").isNull()).isTrue();

        JsonNode product = events.getLast().data().get("data");
        assertThat(events.getLast().data().get("success").asBoolean()).isTrue();
        // 최종 응답은 기존 등록 응답과 같은 형태(data = 상품 필드 그대로 + analysis), 단계 결과 목록(steps)은 없음
        assertThat(events.getLast().data().has("steps")).isFalse();
        assertThat(events.getLast().data().has("analysis")).isFalse();
        assertThat(product.get("event").asText()).isEqualTo("complete");
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

    // 직접 등록 - AI 분석은 필수라 실패하면 SKIP 없이 업로드 파일을 지우고 error 이벤트로 취소
    @Test
    void createFailsAndDeletesUploadedFilesWhenAiFails() throws Exception {
        when(productAiService.analyze(anyList())).thenThrow(new IllegalStateException("gemini down"));

        List<SseEvent> events = streamEvents(directRequest(createRequest(category.getId())));

        assertThat(events).extracting(SseEvent::stepStatus).doesNotContain("IMAGE_ANALYSIS:SKIP");
        SseEvent error = events.getLast();
        assertThat(error.name()).isEqualTo("error");
        assertThat(error.data().at("/data/step").asText()).isEqualTo("IMAGE_ANALYSIS");
        assertThat(error.data().at("/error/code").asText()).isEqualTo("AI_ANALYSIS_FAILED");
        assertThat(productRepository.count()).isZero();
        verify(fileStorageService).deleteAll(List.of("products/key-1"));
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
        assertThat(analysisDone.data().at("/data/result/title").asText()).isEqualTo("AI 제목");
        assertThat(analysisDone.data().at("/data/result/categoryId").asLong()).isEqualTo(category.getId());

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
        assertThat(error.data().at("/data/event").asText()).isEqualTo("error");
        assertThat(error.data().at("/data/step").asText()).isEqualTo("IMAGE_ANALYSIS");
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
        assertThat(error.data().at("/data/step").asText()).isEqualTo("IMAGE_UPLOAD");
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
        mockMvc.perform(multipart("/products/analyze")
                        .file(new MockMultipartFile("images", "empty.png", "image/png", new byte[0]))
                        .param("defectStatus", "NORMAL")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + sellerToken)
                        .accept(MediaType.TEXT_EVENT_STREAM))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    // 수정 성공 - 새 이미지 업로드 → 최종 이미지 전체 재분석 → 저장, 유지할 이미지 뒤에 새 이미지가 붙고 AI 제안가/근거만 갱신
    @Test
    void updateStreamsStepsAndCompletes() throws Exception {
        Long productId = registerProduct();
        when(fileStorageService.upload(any(), eq("products")))
                .thenReturn(new FileUploadResponse(
                        "products/key-new", "https://image.example.com/new.png", 3, "image/png"));
        when(productAiService.analyze(anyList())).thenReturn(reanalysis(category.getId()));

        List<SseEvent> events =
                streamEvents(updateRequest(productId, updateBody(List.of("https://image.example.com/1.png")))
                        .file(imagePart()));

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
        assertThat(events.get(1).data().at("/data/total").asInt()).isEqualTo(3);
        assertThat(events.get(5).data().get("message").asText()).isEqualTo("상품 수정 완료");
        JsonNode product = events.getLast().data().get("data");
        assertThat(product.get("id").asLong()).isEqualTo(productId);
        assertThat(product.get("title").asText()).isEqualTo("아이폰 13 프로");
        assertThat(product.get("status").asText()).isEqualTo("SOLD_OUT");
        assertThat(product.get("price").asLong()).isEqualTo(450_000L); // 사용자 입력값은 그대로
        assertThat(product.get("suggestedPrice").asLong()).isEqualTo(430_000L); // 재분석 결과로 갱신
        assertThat(product.get("analysisDescription").asText()).isEqualTo("스크래치 추가 확인");
        assertThat(product.at("/imageUrls/0").asText()).isEqualTo("https://image.example.com/1.png");
        assertThat(product.at("/imageUrls/1").asText()).isEqualTo("https://image.example.com/new.png");
        assertThat(product.at("/analysis/status").asText()).isEqualTo("DONE");
        assertThat(product.at("/analysis/condition").asText()).isEqualTo("B"); // AI 추론값은 참고용
        // 최종 이미지 전체(유지할 기존 이미지 → 새 파일)를 분석
        verify(productImageLoader).load("https://image.example.com/1.png");
        ArgumentCaptor<List<MultipartFile>> analyzed = ArgumentCaptor.captor();
        verify(productAiService, times(2)).analyze(analyzed.capture()); // 등록 1번 + 수정 1번
        assertThat(analyzed.getAllValues().getLast())
                .extracting(MultipartFile::getOriginalFilename)
                .containsExactly("stored.png", "photo.png");
    }

    // 수정 - 기존 이미지만 뺀 경우에도 이미지 구성이 바뀌었으므로 남은 이미지로 재분석
    @Test
    void updateReanalyzesWhenImageRemoved() throws Exception {
        when(fileStorageService.upload(any(), eq("products")))
                .thenReturn(new FileUploadResponse("products/key-1", "https://image.example.com/1.png", 3, "image/png"))
                .thenReturn(
                        new FileUploadResponse("products/key-2", "https://image.example.com/2.png", 3, "image/png"));
        when(productAiService.analyze(anyList())).thenReturn(analysis(category.getId()));
        Long productId = streamEvents(directRequest(createRequest(category.getId()))
                        .file(new MockMultipartFile("images", "photo2.png", "image/png", new byte[] {4, 5, 6})))
                .getLast()
                .data()
                .at("/data/id")
                .asLong();
        when(productAiService.analyze(anyList())).thenReturn(reanalysis(category.getId()));

        List<SseEvent> events =
                streamEvents(updateRequest(productId, updateBody(List.of("https://image.example.com/2.png"))));

        assertThat(events).extracting(SseEvent::stepStatus).contains("IMAGE_UPLOAD:SKIP", "IMAGE_ANALYSIS:DONE");
        assertThat(events.getLast().data().at("/data/suggestedPrice").asLong()).isEqualTo(430_000L);
        verify(productImageLoader).load("https://image.example.com/2.png");
        verify(productImageLoader, never()).load("https://image.example.com/1.png");
    }

    // 수정 - 재분석이 실패하면 SKIP하고 기존 AI 제안가/근거를 유지한 채 수정
    @Test
    void updateKeepsAiValuesWhenReanalysisFails() throws Exception {
        Long productId = registerProduct();
        when(productAiService.analyze(anyList())).thenThrow(new IllegalStateException("gemini down"));

        List<SseEvent> events =
                streamEvents(updateRequest(productId, updateBody(List.of("https://image.example.com/1.png")))
                        .file(imagePart()));

        assertThat(events).extracting(SseEvent::stepStatus).contains("IMAGE_ANALYSIS:SKIP");
        JsonNode product = events.getLast().data().get("data");
        assertThat(events.getLast().name()).isEqualTo("complete");
        assertThat(product.get("title").asText()).isEqualTo("아이폰 13 프로");
        assertThat(product.get("suggestedPrice").asLong()).isEqualTo(470_000L);
        assertThat(product.get("analysisDescription").asText()).isEqualTo("판단 근거");
        assertThat(product.at("/analysis/status").asText()).isEqualTo("SKIP");
        verify(fileStorageService, never()).deleteAll(anyList());
    }

    // 수정 - 요청에 이 상품에 없는 이미지 URL이 섞여 있어도 서버가 내려받지 않음(분석에서 제외)
    @Test
    void updateDoesNotDownloadForeignImageUrls() throws Exception {
        Long productId = registerProduct();

        streamEvents(updateRequest(
                        productId,
                        updateBody(List.of("https://image.example.com/1.png", "http://169.254.169.254/latest")))
                .file(imagePart()));

        verify(productImageLoader).load("https://image.example.com/1.png");
        verify(productImageLoader, never()).load("http://169.254.169.254/latest");
    }

    // 수정 - 이미지가 그대로면(새 파일 없음, 기존 이미지 유지) 업로드·분석 모두 SKIP, AI 호출 없음
    @Test
    void updateSkipsUploadWhenNoNewImages() throws Exception {
        Long productId = registerProduct();

        List<SseEvent> events =
                streamEvents(updateRequest(productId, updateBody(List.of("https://image.example.com/1.png"))));

        assertThat(events).extracting(SseEvent::stepStatus).startsWith("IMAGE_UPLOAD:SKIP", "IMAGE_ANALYSIS:SKIP");
        assertThat(events.getLast().name()).isEqualTo("complete");
        assertThat(events.getLast().data().at("/data/imageUrls").size()).isEqualTo(1);
        assertThat(events.getLast().data().at("/data/suggestedPrice").asLong()).isEqualTo(470_000L);
        verify(productAiService, times(1)).analyze(anyList()); // 등록 때 1번뿐
        verify(productImageLoader, never()).load(any());
    }

    // 수정 - 저장 단계 실패 시 새로 올린 파일만 지우고 error 이벤트, 상품은 그대로
    @Test
    void updateDeletesNewFilesWhenSaveFails() throws Exception {
        Long productId = registerProduct();
        // 스트림 시작 전 검사 뒤 저장 전에 상품이 지워진 상황
        doAnswer(invocation -> {
                    productRepository.deleteById(productId);
                    return new FileUploadResponse(
                            "products/key-new", "https://image.example.com/new.png", 3, "image/png");
                })
                .when(fileStorageService)
                .upload(any(), eq("products"));

        List<SseEvent> events =
                streamEvents(updateRequest(productId, updateBody(List.of("https://image.example.com/1.png")))
                        .file(imagePart()));

        SseEvent error = events.getLast();
        assertThat(error.name()).isEqualTo("error");
        assertThat(error.data().at("/data/step").asText()).isEqualTo("PRODUCT_SAVE");
        assertThat(error.data().at("/error/code").asText()).isEqualTo("NOT_FOUND");
        verify(fileStorageService).deleteAll(List.of("products/key-new"));
    }

    // 수정 - 스트림 시작 전 검사: 본인 상품이 아니면 403 JSON, 업로드하지 않음
    @Test
    void updateRejectsNonOwnerBeforeStreaming() throws Exception {
        Long productId = registerProduct();
        Member other = memberRepository.save(
                Member.ofLocalSignUp("other-stream@example.com", null, "encoded-password", "다른판매자", "other", null));
        String otherToken = jwtTokenProvider.createAccessToken(other.getId(), MemberRole.USER);
        clearInvocations(fileStorageService);

        mockMvc.perform(updateRequest(productId, updateBody(List.of("https://image.example.com/1.png")), otherToken)
                        .file(imagePart()))
                .andExpect(status().isForbidden())
                .andExpect(header().string(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE))
                .andExpect(jsonPath("$.error.code").value("FORBIDDEN"));
        verify(fileStorageService, never()).upload(any(), any());
    }

    // 수정 - 스트림 시작 전 검사: 유지할 이미지도 새 파일도 없으면 400 JSON
    @Test
    void updateRejectsNoImagesBeforeStreaming() throws Exception {
        Long productId = registerProduct();

        mockMvc.perform(updateRequest(productId, updateBody(List.of())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("INVALID_INPUT_VALUE"));
    }

    // 수정 - 스트림 시작 전 검사: 없는 상품은 404 JSON
    @Test
    void updateRejectsMissingProductBeforeStreaming() throws Exception {
        mockMvc.perform(updateRequest(999_999_999L, updateBody(List.of("https://image.example.com/1.png"))))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("NOT_FOUND"));
    }

    // 인증 없이 요청하면 401
    @Test
    void createRequiresAuthentication() throws Exception {
        mockMvc.perform(multipart("/products/analyze")
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
            StringBuilder data = new StringBuilder();
            for (String line : block.split("\n")) {
                // SSE event: 이름은 보내지 않음(이벤트 종류는 JSON의 data.event)
                assertThat(line).doesNotStartWith("event:");
                if (line.startsWith("data:")) {
                    data.append(line.substring("data:".length()));
                }
            }
            if (!data.isEmpty()) {
                JsonNode json = objectMapper.readTree(data.toString());
                events.add(new SseEvent(json.at("/data/event").asText(), json));
            }
        }
        return events;
    }

    private MockMultipartHttpServletRequestBuilder directRequest(ProductCreateRequest request) throws Exception {
        return (MockMultipartHttpServletRequestBuilder) multipart("/products")
                .file(imagePart())
                .file(new MockMultipartFile(
                        "data", "", MediaType.APPLICATION_JSON_VALUE, objectMapper.writeValueAsBytes(request)))
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + sellerToken)
                .accept(MediaType.TEXT_EVENT_STREAM);
    }

    /** 직접 등록 스트림을 끝까지 받아 등록된 상품 ID를 반환한다. */
    private Long registerProduct() throws Exception {
        when(productAiService.analyze(anyList())).thenReturn(analysis(category.getId()));
        List<SseEvent> events = streamEvents(directRequest(createRequest(category.getId())));
        return events.getLast().data().at("/data/id").asLong();
    }

    private MockMultipartHttpServletRequestBuilder updateRequest(Long productId, ProductUpdateRequest request)
            throws Exception {
        return updateRequest(productId, request, sellerToken);
    }

    private MockMultipartHttpServletRequestBuilder updateRequest(
            Long productId, ProductUpdateRequest request, String token) throws Exception {
        return (MockMultipartHttpServletRequestBuilder) multipart(HttpMethod.PATCH, "/products/{id}", productId)
                .file(new MockMultipartFile(
                        "data", "", MediaType.APPLICATION_JSON_VALUE, objectMapper.writeValueAsBytes(request)))
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .accept(MediaType.TEXT_EVENT_STREAM);
    }

    private ProductUpdateRequest updateBody(List<String> keptImageUrls) {
        return new ProductUpdateRequest(
                category.getId(),
                "아이폰 13 프로",
                "애플",
                "수정된 설명",
                450_000L,
                ProductStatus.SOLD_OUT,
                ProductCondition.B,
                DefectStatus.ISSUES,
                1,
                false,
                TradeMethod.DELIVERY,
                null,
                null,
                keptImageUrls,
                List.of(),
                List.of("케이블"));
    }

    private MockMultipartHttpServletRequestBuilder aiRequest() {
        return (MockMultipartHttpServletRequestBuilder) multipart("/products/analyze")
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

    /** 수정 시 재분석 결과(제안가·근거가 등록 때와 다름). */
    private static ProductAiAnalysisResult reanalysis(Long categoryId) {
        return new ProductAiAnalysisResult(
                categoryId, "AI 제목", "애플", "AI 설명", ProductCondition.B, 430_000L, "스크래치 추가 확인", List.of(), List.of());
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
                    ? data.at("/data/step").asText() + ":"
                            + data.at("/data/status").asText()
                    : null;
        }
    }
}
