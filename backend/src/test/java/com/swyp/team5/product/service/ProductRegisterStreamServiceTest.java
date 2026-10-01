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

import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import com.swyp.team5.common.common.ApiResponse;
import com.swyp.team5.file.dto.FileUploadResponse;
import com.swyp.team5.file.dto.InMemoryMultipartFile;
import com.swyp.team5.file.service.FileStorageService;
import com.swyp.team5.product.config.ProductRegisterStreamProperties;
import com.swyp.team5.product.dto.ProductAiAnalysisResult;
import com.swyp.team5.product.dto.ProductResponse;
import com.swyp.team5.product.entity.DefectStatus;
import com.swyp.team5.product.entity.ProductCondition;
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
    private final SseEmitter emitter = mock(SseEmitter.class);

    private ProductRegisterStreamService service;

    @BeforeEach
    void setUp() {
        // keepalive는 테스트 중 돌지 않도록 길게
        ProductRegisterStreamProperties properties =
                new ProductRegisterStreamProperties(1, 1, 1, Duration.ofSeconds(180), Duration.ofHours(1));
        service =
                new ProductRegisterStreamService(
                        productService,
                        productAiService,
                        fileStorageService,
                        mock(ProductImageLoader.class),
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
        List<MultipartFile> images =
                List.of(InMemoryMultipartFile.of("images", "a.png", "image/png", new byte[] {1, 2, 3}));
        return service.registerWithAi(1L, images, null, DefectStatus.NORMAL, null);
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
}
