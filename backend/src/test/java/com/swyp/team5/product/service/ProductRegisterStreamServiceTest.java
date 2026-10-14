package com.swyp.team5.product.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.timeout;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.IOException;
import java.time.Duration;
import java.util.List;
import java.util.Objects;
import java.util.function.Consumer;

import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import com.swyp.team5.common.common.ApiResponse;
import com.swyp.team5.file.dto.FileUploadResponse;
import com.swyp.team5.file.dto.InMemoryMultipartFile;
import com.swyp.team5.file.service.FileStorageService;
import com.swyp.team5.product.config.ProductRegisterStreamProperties;
import com.swyp.team5.product.dto.ProductAiAnalysisResult;
import com.swyp.team5.product.dto.ProductResponse;
import com.swyp.team5.product.dto.register.ProductRegisterResponse;
import com.swyp.team5.product.dto.register.ProductRegisterStep;
import com.swyp.team5.product.dto.register.ProductRegisterStepEvent;
import com.swyp.team5.product.entity.DefectStatus;
import com.swyp.team5.product.entity.ProductCondition;
import com.swyp.team5.productanalysis.dto.AnalysisStatus;
import com.swyp.team5.productanalysis.dto.AnalysisStep;
import com.swyp.team5.productanalysis.dto.AnalysisStepEvent;
import com.swyp.team5.productanalysis.dto.ProductAnalysisResponse;
import com.swyp.team5.productanalysis.entity.AnalysisRecommendation;
import com.swyp.team5.productanalysis.service.AnalysisCompletionWaiter;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

// 상품 등록·수정 SSE - 시간 초과·연결 끊김 시 저장 직전 취소 단위 테스트(SseEmitter를 목으로 바꿔 흉내 냄).
class ProductRegisterStreamServiceTest {

    private static final long WAIT_MS = 5_000;

    private final ProductService productService = mock(ProductService.class);
    private final ProductAiService productAiService = mock(ProductAiService.class);
    private final FileStorageService fileStorageService = mock(FileStorageService.class);
    private final AnalysisCompletionWaiter analysisCompletionWaiter = mock(AnalysisCompletionWaiter.class);
    private final SseEmitter emitter = mock(SseEmitter.class);

    private ProductRegisterStreamService service;

    @BeforeEach
    void setUp() {
        // keepalive는 테스트 중 돌지 않도록 길게
        ProductRegisterStreamProperties properties = new ProductRegisterStreamProperties(
                1, 1, 1, Duration.ofSeconds(180), Duration.ofHours(1), Duration.ofSeconds(90));
        service =
                new ProductRegisterStreamService(
                        productService,
                        productAiService,
                        fileStorageService,
                        mock(ProductImageLoader.class),
                        analysisCompletionWaiter,
                        properties) {
                    @Override
                    SseEmitter createEmitter(long timeoutMillis) {
                        return emitter;
                    }
                };
        when(fileStorageService.upload(any(), eq("products")))
                .thenReturn(new FileUploadResponse("products/a.png", "https://r2/products/a.png", 3, "image/png"));
    }

    @AfterEach
    void tearDown() {
        service.destroy();
    }

    private SseEmitter registerWithAi() {
        return registerWithAi(false);
    }

    private SseEmitter registerWithAi(boolean withMarketAnalysis) {
        List<MultipartFile> images =
                List.of(InMemoryMultipartFile.of("images", "a.png", "image/png", new byte[] {1, 2, 3}));
        return service.registerWithAi(1L, images, null, DefectStatus.NORMAL, null, withMarketAnalysis);
    }

    /** 지금까지 보낸 이벤트의 ApiResponse 목록(ping 주석 제외). */
    private List<ApiResponse<?>> sentResponses() throws IOException {
        ArgumentCaptor<SseEmitter.SseEventBuilder> captor = ArgumentCaptor.forClass(SseEmitter.SseEventBuilder.class);
        verify(emitter, org.mockito.Mockito.atLeast(0)).send(captor.capture());
        return captor.getAllValues().stream()
                .flatMap(builder -> builder.build().stream())
                .<ApiResponse<?>>map(data -> data.getData() instanceof ApiResponse<?> response ? response : null)
                .filter(Objects::nonNull)
                .toList();
    }

    /** 시세 분석 단계 이벤트의 "상태" 목록. */
    private List<String> marketAnalysisStatuses() throws IOException {
        return sentResponses().stream()
                .map(ApiResponse::data)
                .filter(data -> data instanceof ProductRegisterStepEvent event
                        && event.step() == ProductRegisterStep.MARKET_ANALYSIS)
                .map(data -> ((ProductRegisterStepEvent) data).status())
                .toList();
    }

    private ProductRegisterResponse sentComplete() throws IOException {
        return sentResponses().stream()
                .map(ApiResponse::data)
                .filter(ProductRegisterResponse.class::isInstance)
                .map(ProductRegisterResponse.class::cast)
                .findFirst()
                .orElseThrow();
    }

    private ProductResponse savedProduct() {
        ProductResponse product = mock(ProductResponse.class);
        when(product.id()).thenReturn(10L);
        when(productAiService.analyze(anyList())).thenReturn(analysis());
        when(productService.saveFromAnalysis(anyLong(), any(), anyList(), any(), any(), any()))
                .thenReturn(product);
        return product;
    }

    private static ProductAnalysisResponse marketAnalysis(AnalysisStatus status, String skipMessage) {
        ProductAnalysisResponse analysis = mock(ProductAnalysisResponse.class);
        when(analysis.analysisStatus()).thenReturn(status);
        when(analysis.analysisSkipMessage()).thenReturn(skipMessage);
        when(analysis.recommendation())
                .thenReturn(status == AnalysisStatus.ANALYZED ? AnalysisRecommendation.SELL : null);
        return analysis;
    }

    private Runnable timeoutCallback() {
        ArgumentCaptor<Runnable> captor = ArgumentCaptor.forClass(Runnable.class);
        verify(emitter).onTimeout(captor.capture());
        return captor.getValue();
    }

    private static ProductAiAnalysisResult analysis() {
        return new ProductAiAnalysisResult(
                10L, "아이폰 13", "애플", "설명", ProductCondition.A, 500_000L, "근거", List.of(), List.of());
    }

    /** 지금까지 보낸 이벤트 중 에러 이벤트의 error.code 목록. */
    private List<String> sentErrorCodes() throws IOException {
        ArgumentCaptor<SseEmitter.SseEventBuilder> captor = ArgumentCaptor.forClass(SseEmitter.SseEventBuilder.class);
        verify(emitter, org.mockito.Mockito.atLeast(0)).send(captor.capture());
        return captor.getAllValues().stream()
                .flatMap(builder -> builder.build().stream())
                .map(data -> data.getData() instanceof ApiResponse<?> response && response.error() != null
                        ? response.error().code()
                        : null)
                .filter(Objects::nonNull)
                .toList();
    }

    // 시간 초과 - 저장 전(AI 분석 중)이면 취소: 저장하지 않고 업로드 파일 삭제, REGISTER_TIMEOUT_CANCELLED 안내
    @Test
    void timeoutBeforeSaveCancelsAndDeletesUploadedFiles() throws IOException {
        when(productAiService.analyze(anyList())).thenAnswer(invocation -> {
            timeoutCallback().run();
            return analysis();
        });

        registerWithAi();

        verify(fileStorageService, timeout(WAIT_MS)).deleteAll(List.of("products/a.png"));
        verify(productService, never()).saveFromAnalysis(anyLong(), any(), anyList(), any(), any(), any());
        assertThat(sentErrorCodes()).containsExactly("REGISTER_TIMEOUT_CANCELLED");
    }

    // 시간 초과 - 이미 저장 중이면 저장은 끝까지 진행하고 REGISTER_TIMEOUT(내 상품 목록 확인) 안내
    @Test
    void timeoutDuringSaveKeepsSaving() throws IOException {
        when(productAiService.analyze(anyList())).thenReturn(analysis());
        when(productService.saveFromAnalysis(anyLong(), any(), anyList(), any(), any(), any()))
                .thenAnswer(invocation -> {
                    timeoutCallback().run();
                    return mock(ProductResponse.class);
                });

        registerWithAi();

        verify(emitter, timeout(WAIT_MS)).complete();
        verify(productService).saveFromAnalysis(anyLong(), any(), anyList(), any(), any(), any());
        verify(fileStorageService, never()).deleteAll(anyList());
        assertThat(sentErrorCodes()).containsExactly("REGISTER_TIMEOUT");
    }

    // 연결 끊김 - 이벤트 전송이 실패하면 다음 단계에서 취소: AI 호출·저장 없이 업로드 파일 삭제
    @Test
    void disconnectCancelsBeforeNextStep() throws IOException {
        doThrow(new IOException("Broken pipe")).when(emitter).send(any(SseEmitter.SseEventBuilder.class));

        registerWithAi();

        verify(fileStorageService, timeout(WAIT_MS)).deleteAll(List.of("products/a.png"));
        verify(productAiService, never()).analyze(anyList());
        verify(productService, never()).saveFromAnalysis(anyLong(), any(), anyList(), any(), any(), any());
    }

    // 정상 - 끊김·시간 초과가 없으면 저장하고 파일은 지우지 않음
    @Test
    void savesWhenNotCancelled() {
        when(productAiService.analyze(anyList())).thenReturn(analysis());
        when(productService.saveFromAnalysis(anyLong(), any(), anyList(), any(), any(), any()))
                .thenReturn(mock(ProductResponse.class));

        registerWithAi();

        verify(emitter, timeout(WAIT_MS)).complete();
        verify(productService).saveFromAnalysis(anyLong(), any(), anyList(), any(), any(), any());
        verify(fileStorageService, never()).deleteAll(anyList());
    }

    // 시세 분석 - 저장 뒤 분석 대기열 진행을 PROGRESS로 보내고, 끝나면 DONE + 상품 재조회(판단 반영) + complete에 marketAnalysis
    @Test
    @SuppressWarnings("unchecked")
    void marketAnalysisStreamsProgressAndCompletesWithResult() throws IOException {
        savedProduct();
        ProductResponse refreshed = mock(ProductResponse.class);
        when(productService.getProduct(10L, 1L)).thenReturn(refreshed);
        ProductAnalysisResponse result = marketAnalysis(AnalysisStatus.ANALYZED, null);
        when(analysisCompletionWaiter.await(eq(10L), any(), any(), any())).thenAnswer(invocation -> {
            Consumer<AnalysisStepEvent> onStep = invocation.getArgument(2);
            onStep.accept(AnalysisStepEvent.waiting());
            onStep.accept(AnalysisStepEvent.of(AnalysisStep.CANDIDATE_SEARCH, AnalysisStepEvent.START));
            return result;
        });

        registerWithAi(true);

        verify(emitter, timeout(WAIT_MS)).complete();
        assertThat(marketAnalysisStatuses()).containsExactly("START", "PROGRESS", "PROGRESS", "DONE");
        ProductRegisterResponse complete = sentComplete();
        assertThat(complete.marketAnalysis()).isSameAs(result);
        assertThat(complete.product()).isSameAs(refreshed);
        // 대기 시간은 설정값(90초)과 스트림 남은 시간(180초 - 여유 10초) 중 짧은 쪽
        ArgumentCaptor<Duration> wait = ArgumentCaptor.forClass(Duration.class);
        verify(analysisCompletionWaiter).await(eq(10L), wait.capture(), any(), any());
        assertThat(wait.getValue()).isEqualTo(Duration.ofSeconds(90));
    }

    // 시세 분석 - 비교 매물 부족이면 등록은 성공하고 시세 분석 단계만 SKIP(건너뛴 사유 문구), 상품은 다시 조회하지 않음
    @Test
    void marketAnalysisSkipsWhenNotAnalyzed() throws IOException {
        ProductResponse product = savedProduct();
        ProductAnalysisResponse result = marketAnalysis(AnalysisStatus.SKIPPED, "비슷한 매물이 부족해요.");
        when(analysisCompletionWaiter.await(eq(10L), any(), any(), any())).thenReturn(result);

        registerWithAi(true);

        verify(emitter, timeout(WAIT_MS)).complete();
        assertThat(marketAnalysisStatuses()).containsExactly("START", "SKIP");
        assertThat(sentResponses().stream().map(ApiResponse::message)).contains("비슷한 매물이 부족해요.");
        assertThat(sentComplete().marketAnalysis()).isSameAs(result);
        assertThat(sentComplete().product()).isSameAs(product);
        verify(productService, never()).getProduct(anyLong(), anyLong());
        assertThat(sentErrorCodes()).isEmpty();
    }

    // 시세 분석 - 결과 확인 중 오류가 나도 등록은 성공(SKIP 후 complete, marketAnalysis는 null)
    @Test
    void marketAnalysisFailureDoesNotFailRegistration() throws IOException {
        savedProduct();
        when(analysisCompletionWaiter.await(eq(10L), any(), any(), any())).thenThrow(new IllegalStateException("x"));

        registerWithAi(true);

        verify(emitter, timeout(WAIT_MS)).complete();
        assertThat(marketAnalysisStatuses()).containsExactly("START", "SKIP");
        assertThat(sentComplete().marketAnalysis()).isNull();
        assertThat(sentErrorCodes()).isEmpty();
        verify(fileStorageService, never()).deleteAll(anyList());
    }

    // 시세 분석을 요청하지 않으면 기다리지 않고 단계도 붙이지 않음
    @Test
    void noMarketAnalysisByDefault() throws IOException {
        savedProduct();

        registerWithAi(false);

        verify(emitter, timeout(WAIT_MS)).complete();
        verify(analysisCompletionWaiter, never()).await(anyLong(), any(), any(), any());
        assertThat(marketAnalysisStatuses()).isEmpty();
        assertThat(sentComplete().marketAnalysis()).isNull();
    }
}
