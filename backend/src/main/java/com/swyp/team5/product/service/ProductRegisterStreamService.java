package com.swyp.team5.product.service;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;
import java.util.function.Function;
import java.util.function.Supplier;

import lombok.extern.slf4j.Slf4j;

import org.springframework.beans.factory.DisposableBean;
import org.springframework.core.task.TaskRejectedException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import com.swyp.team5.category.error.CategoryNotFoundException;
import com.swyp.team5.category.error.CategoryNotLeafException;
import com.swyp.team5.common.common.ApiResponse;
import com.swyp.team5.file.dto.FileUploadResponse;
import com.swyp.team5.file.dto.InMemoryMultipartFile;
import com.swyp.team5.file.error.FileStorageException;
import com.swyp.team5.file.service.FileStorageService;
import com.swyp.team5.product.config.ProductRegisterStreamProperties;
import com.swyp.team5.product.dto.ProductAiAnalysisResult;
import com.swyp.team5.product.dto.ProductCreateRequest;
import com.swyp.team5.product.dto.ProductResponse;
import com.swyp.team5.product.dto.register.ProductRegisterAnalysis;
import com.swyp.team5.product.dto.register.ProductRegisterErrorEvent;
import com.swyp.team5.product.dto.register.ProductRegisterResponse;
import com.swyp.team5.product.dto.register.ProductRegisterStep;
import com.swyp.team5.product.dto.register.ProductRegisterStepEvent;
import com.swyp.team5.product.dto.register.ProductRegisterStepEvent.ImageAnalysisResult;
import com.swyp.team5.product.dto.register.ProductRegisterStepEvent.ImageUploadResult;
import com.swyp.team5.product.entity.DefectStatus;
import com.swyp.team5.product.error.ProductImageRequiredException;
import com.swyp.team5.product.error.ProductRegisterBusyException;

/**
 * 상품 단계별 스트리밍 등록(v2). 등록 요청 하나를 이미지 업로드 → AI 사진 분석 → 상품 저장 단계로 나눠 처리하며, 단계마다
 * SSE {@code step} 이벤트를, 끝나면 {@code complete}(등록된 상품) 또는 {@code error} 이벤트를 보낸다.
 *
 * <p>기존 한 번에 등록({@link ProductService#create}/{@link ProductService#createFromImages})과 같은 규칙으로 저장하되,
 * 업로드와 AI 호출은 트랜잭션 밖에서 하고 저장만 짧은 트랜잭션으로 처리한다. 실패하면 이미 업로드한 파일을 지운다.
 * 클라이언트가 연결을 끊거나 스트림 시간이 지나도 등록은 끝까지 진행한다(결과는 내 상품 목록에서 확인).
 */
@Slf4j
@Service
public class ProductRegisterStreamService implements DisposableBean {

    private static final String IMAGE_DIRECTORY = "products";

    /*
     * 방식별 진행 단계(이 순서대로 index/total을 매긴다). 단계를 추가할 때는 enum에 값을 더하고 해당 방식 목록에 넣은 뒤
     * 작업 코드에서 begin/done(또는 skip)을 호출하면 된다. complete 이벤트는 모든 단계가 끝난 뒤 run()이 보낸다.
     */
    private static final List<ProductRegisterStep> DIRECT_STEPS = List.of(
            ProductRegisterStep.IMAGE_UPLOAD, ProductRegisterStep.IMAGE_ANALYSIS, ProductRegisterStep.PRODUCT_SAVE);
    private static final List<ProductRegisterStep> AI_STEPS = List.of(
            ProductRegisterStep.IMAGE_UPLOAD, ProductRegisterStep.IMAGE_ANALYSIS, ProductRegisterStep.PRODUCT_SAVE);

    private final ProductService productService;
    private final ProductAiService productAiService;
    private final FileStorageService fileStorageService;
    private final ProductRegisterStreamProperties properties;
    private final ThreadPoolTaskExecutor executor;
    private final ScheduledExecutorService keepAliveScheduler;

    public ProductRegisterStreamService(
            ProductService productService,
            ProductAiService productAiService,
            FileStorageService fileStorageService,
            ProductRegisterStreamProperties properties) {
        this.productService = productService;
        this.productAiService = productAiService;
        this.fileStorageService = fileStorageService;
        this.properties = properties;
        // 스프링 빈으로 Executor를 등록하면 기본 applicationTaskExecutor 자동 설정이 꺼지므로 이 서비스 안에서만 쓴다
        this.executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(properties.corePoolSize());
        executor.setMaxPoolSize(properties.maxPoolSize());
        executor.setQueueCapacity(properties.queueCapacity());
        executor.setThreadNamePrefix("product-register-");
        executor.setWaitForTasksToCompleteOnShutdown(true); // 종료 시 진행 중인 등록은 마저 끝낸다
        executor.setAwaitTerminationSeconds((int) properties.timeout().toSeconds());
        executor.initialize();
        this.keepAliveScheduler = Executors.newSingleThreadScheduledExecutor(runnable -> {
            Thread thread = new Thread(runnable, "product-register-keepalive");
            thread.setDaemon(true);
            return thread;
        });
    }

    /**
     * 직접 등록을 단계별로 처리한다. AI 사진 분석이 실패하면 그 단계만 {@code SKIP}로 알리고 제안가/판단 근거 없이
     * 등록한다(기존 직접 등록과 같은 규칙).
     *
     * @param memberId 등록하는 회원 ID
     * @param request 등록 요청 바디
     * @param images 등록할 상품 이미지 목록(순서대로 저장)
     * @return 진행 상황을 보내는 SSE 스트림
     * @throws CategoryNotFoundException 존재하지 않는 카테고리인 경우(스트림 시작 전)
     * @throws CategoryNotLeafException 최하위 카테고리가 아닌 경우(스트림 시작 전)
     * @throws ProductImageRequiredException 이미지가 없는 경우(스트림 시작 전)
     * @throws FileStorageException 빈 파일이거나 파일을 읽지 못한 경우(스트림 시작 전)
     * @throws ProductRegisterBusyException 처리 대기열이 가득 찬 경우(스트림 시작 전)
     */
    public SseEmitter registerDirect(Long memberId, ProductCreateRequest request, List<MultipartFile> images) {
        productService.validateLeafCategory(request.categoryId());
        List<MultipartFile> copies = copyImages(images);
        return start(DIRECT_STEPS, stream -> {
            List<String> imageUrls = uploadImages(stream, copies);
            ProductAiAnalysisResult analysis = analyzeOrSkip(stream, copies);
            return save(stream, () -> productService.saveDirect(memberId, request, imageUrls, analysis));
        });
    }

    /**
     * AI 등록을 단계별로 처리한다. AI 사진 분석이 실패하면 업로드한 파일을 지우고 {@code error} 이벤트로 끝낸다.
     *
     * @param memberId 등록하는 회원 ID
     * @param images 분석할 상품 이미지 목록
     * @param purchasedMonths 사용자가 입력한 구매 후 경과 개월 수(선택)
     * @param defectStatus 사용자가 입력한 결함(하자) 상태
     * @param includedItems 사용자가 추가로 입력한 구성품 이름 목록(선택, AI 추론 결과와 합쳐짐)
     * @return 진행 상황을 보내는 SSE 스트림
     * @throws ProductImageRequiredException 이미지가 없는 경우(스트림 시작 전)
     * @throws FileStorageException 빈 파일이거나 파일을 읽지 못한 경우(스트림 시작 전)
     * @throws ProductRegisterBusyException 처리 대기열이 가득 찬 경우(스트림 시작 전)
     */
    public SseEmitter registerWithAi(
            Long memberId,
            List<MultipartFile> images,
            Integer purchasedMonths,
            DefectStatus defectStatus,
            List<String> includedItems) {
        List<MultipartFile> copies = copyImages(images);
        return start(AI_STEPS, stream -> {
            List<String> imageUrls = uploadImages(stream, copies);
            stream.begin(ProductRegisterStep.IMAGE_ANALYSIS, "AI가 사진을 분석하고 있습니다.");
            ProductAiAnalysisResult analysis = productAiService.analyze(copies);
            stream.done(ProductRegisterStep.IMAGE_ANALYSIS, "사진 분석 완료", ImageAnalysisResult.from(analysis));
            return save(
                    stream,
                    () -> productService.saveFromAnalysis(
                            memberId, analysis, imageUrls, purchasedMonths, defectStatus, includedItems));
        });
    }

    @Override
    public void destroy() {
        keepAliveScheduler.shutdownNow();
        executor.shutdown();
    }

    /** 요청 스레드가 끝나면 원본 multipart 임시 파일이 지워질 수 있어, 스트림을 열기 전에 내용을 메모리로 복사한다. */
    private static List<MultipartFile> copyImages(List<MultipartFile> images) {
        if (images == null || images.isEmpty()) {
            throw new ProductImageRequiredException();
        }
        return images.stream()
                .map(image -> {
                    if (image.isEmpty()) {
                        throw new FileStorageException("업로드할 파일이 비어 있습니다.");
                    }
                    return (MultipartFile) InMemoryMultipartFile.copyOf(image);
                })
                .toList();
    }

    private SseEmitter start(List<ProductRegisterStep> steps, Function<RegisterStream, ProductResponse> work) {
        SseEmitter emitter = new SseEmitter(properties.timeout().toMillis());
        RegisterStream stream = new RegisterStream(emitter, steps);
        emitter.onTimeout(() -> {
            log.warn("상품 등록 스트림 시간 초과 - 등록은 계속 진행합니다. step={}", stream.currentStep);
            stream.sendAndClose(
                    "error",
                    ProductRegisterErrorEvent.of(
                            stream.currentStep,
                            HttpStatus.SERVICE_UNAVAILABLE,
                            "REGISTER_TIMEOUT",
                            "처리가 지연되고 있습니다. 등록 결과는 내 상품 목록에서 확인해 주세요."));
        });
        emitter.onCompletion(stream::markClosed);
        emitter.onError(error -> stream.markClosed());
        try {
            executor.execute(() -> run(stream, work));
        } catch (TaskRejectedException e) {
            throw new ProductRegisterBusyException();
        }
        return emitter;
    }

    private void run(RegisterStream stream, Function<RegisterStream, ProductResponse> work) {
        long interval = properties.keepAliveInterval().toMillis();
        ScheduledFuture<?> keepAlive =
                keepAliveScheduler.scheduleAtFixedRate(stream::ping, interval, interval, TimeUnit.MILLISECONDS);
        try {
            ProductResponse product = work.apply(stream);
            stream.send(
                    "complete",
                    ApiResponse.success(new ProductRegisterResponse(
                            product, ProductRegisterAnalysis.of(product, stream.completedSteps))));
        } catch (RuntimeException e) {
            deleteUploadedFiles(stream);
            stream.send("error", toErrorEvent(stream.currentStep, e));
        } finally {
            keepAlive.cancel(false);
            stream.complete();
        }
    }

    private List<String> uploadImages(RegisterStream stream, List<MultipartFile> images) {
        stream.begin(ProductRegisterStep.IMAGE_UPLOAD, "이미지를 업로드하고 있습니다.");
        List<String> imageUrls = new ArrayList<>();
        for (MultipartFile image : images) {
            FileUploadResponse uploaded = fileStorageService.upload(image, IMAGE_DIRECTORY);
            stream.uploadedKeys.add(uploaded.key());
            imageUrls.add(uploaded.url());
        }
        stream.done(
                ProductRegisterStep.IMAGE_UPLOAD,
                "이미지 " + images.size() + "장 업로드 완료",
                new ImageUploadResult(images.size()));
        return imageUrls;
    }

    /** 직접 등록의 AI 분석은 참고용이라 실패해도 등록을 계속한다. */
    private ProductAiAnalysisResult analyzeOrSkip(RegisterStream stream, List<MultipartFile> images) {
        stream.begin(ProductRegisterStep.IMAGE_ANALYSIS, "AI가 사진을 분석하고 있습니다.");
        try {
            ProductAiAnalysisResult analysis = productAiService.analyze(images);
            stream.done(ProductRegisterStep.IMAGE_ANALYSIS, "사진 분석 완료", ImageAnalysisResult.from(analysis));
            return analysis;
        } catch (RuntimeException e) {
            log.warn("직접 등록 AI 적정가 추정 실패 - suggestedPrice 없이 등록합니다. reason={}", e.getMessage());
            stream.skip(ProductRegisterStep.IMAGE_ANALYSIS, "사진 분석에 실패해 추천 가격 없이 등록합니다.");
            return null;
        }
    }

    private ProductResponse save(RegisterStream stream, Supplier<ProductResponse> saver) {
        stream.begin(ProductRegisterStep.PRODUCT_SAVE, "상품을 등록하고 있습니다.");
        ProductResponse product = saver.get();
        stream.uploadedKeys.clear(); // 저장이 끝났으므로 이후에는 파일을 지우지 않는다
        stream.done(ProductRegisterStep.PRODUCT_SAVE, "상품 등록 완료", null);
        return product;
    }

    private void deleteUploadedFiles(RegisterStream stream) {
        if (stream.uploadedKeys.isEmpty()) {
            return;
        }
        try {
            fileStorageService.deleteAll(List.copyOf(stream.uploadedKeys));
        } catch (RuntimeException e) {
            log.warn("등록 실패 후 업로드 파일 삭제 실패: keys={}, reason={}", stream.uploadedKeys, e.getMessage());
        }
    }

    private static ProductRegisterErrorEvent toErrorEvent(ProductRegisterStep step, RuntimeException e) {
        if (step == ProductRegisterStep.IMAGE_UPLOAD) {
            log.error("상품 등록 - 이미지 업로드 실패: {}", e.getMessage(), e);
            return ProductRegisterErrorEvent.of(
                    step, HttpStatus.BAD_GATEWAY, "IMAGE_UPLOAD_FAILED", "이미지 업로드에 실패했습니다. 잠시 후 다시 시도해 주세요.");
        }
        if (step == ProductRegisterStep.IMAGE_ANALYSIS) {
            log.error("상품 등록 - AI 사진 분석 실패: {}", e.getMessage(), e);
            return ProductRegisterErrorEvent.of(
                    step, HttpStatus.BAD_GATEWAY, "AI_ANALYSIS_FAILED", "AI 사진 분석에 실패했습니다. 잠시 후 다시 시도해 주세요.");
        }
        if (e instanceof CategoryNotFoundException) {
            log.warn("상품 등록 - 카테고리 없음: {}", e.getMessage());
            return ProductRegisterErrorEvent.of(step, HttpStatus.NOT_FOUND, "NOT_FOUND", e.getMessage());
        }
        if (e instanceof CategoryNotLeafException) {
            log.warn("상품 등록 - 최하위가 아닌 카테고리: {}", e.getMessage());
            return ProductRegisterErrorEvent.of(step, HttpStatus.BAD_REQUEST, "INVALID_INPUT_VALUE", e.getMessage());
        }
        if (e instanceof DataIntegrityViolationException) {
            log.warn("상품 등록 - 데이터 무결성 위반: {}", e.getMessage());
            return ProductRegisterErrorEvent.of(step, HttpStatus.CONFLICT, "CONFLICT", "이미 사용 중인 값입니다.");
        }
        log.error("상품 등록 - 처리 실패: step={}", step, e);
        return ProductRegisterErrorEvent.of(
                step, HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_SERVER_ERROR", "서버 내부 오류가 발생했습니다.");
    }

    /** 요청 하나의 스트림 상태. 작업 스레드와 keepalive 스레드가 함께 보내므로 전송은 동기화한다. */
    private static final class RegisterStream {

        private final SseEmitter emitter;
        private final List<ProductRegisterStep> steps;
        private final List<String> uploadedKeys = new ArrayList<>();
        // 단계별 최종 결과(DONE/SKIP). complete 이벤트의 analysis를 만들 때 쓴다
        private final List<ProductRegisterStepEvent> completedSteps = new CopyOnWriteArrayList<>();
        private volatile ProductRegisterStep currentStep;
        private boolean closed;

        private RegisterStream(SseEmitter emitter, List<ProductRegisterStep> steps) {
            this.emitter = emitter;
            this.steps = steps;
        }

        void begin(ProductRegisterStep step, String message) {
            currentStep = step;
            send("step", new ProductRegisterStepEvent(step, "START", indexOf(step), steps.size(), message, null));
        }

        void done(ProductRegisterStep step, String message, Object result) {
            finish(new ProductRegisterStepEvent(step, "DONE", indexOf(step), steps.size(), message, result));
        }

        void skip(ProductRegisterStep step, String message) {
            finish(new ProductRegisterStepEvent(step, "SKIP", indexOf(step), steps.size(), message, null));
        }

        /** 단계 결과를 기록하고(최종 analysis 계산용) 바로 step 이벤트로 보낸다. */
        private void finish(ProductRegisterStepEvent event) {
            completedSteps.add(event);
            send("step", event);
        }

        /** 이 방식의 단계 목록 안에서의 순서(1부터). 목록에 없는 단계를 쓰면 개발 실수이므로 바로 실패시킨다. */
        private int indexOf(ProductRegisterStep step) {
            int index = steps.indexOf(step);
            if (index < 0) {
                throw new IllegalStateException("등록 단계 목록에 없는 단계입니다: " + step);
            }
            return index + 1;
        }

        /** 연결이 끊겼으면 보내지 않고 넘어간다(등록 처리는 계속). */
        synchronized void send(String name, Object data) {
            if (closed) {
                return;
            }
            try {
                emitter.send(SseEmitter.event().name(name).data(data, MediaType.APPLICATION_JSON));
            } catch (IOException | IllegalStateException e) {
                closed = true;
                log.debug("SSE 이벤트 전송 실패(연결 종료): event={}, reason={}", name, e.getMessage());
            }
        }

        synchronized void ping() {
            if (closed) {
                return;
            }
            try {
                emitter.send(SseEmitter.event().comment("ping"));
            } catch (IOException | IllegalStateException e) {
                closed = true;
            }
        }

        synchronized void sendAndClose(String name, Object data) {
            send(name, data);
            complete();
        }

        synchronized void markClosed() {
            closed = true;
        }

        synchronized void complete() {
            if (closed) {
                return;
            }
            closed = true;
            try {
                emitter.complete();
            } catch (IllegalStateException e) {
                log.debug("SSE 종료 실패(이미 종료됨): {}", e.getMessage());
            }
        }
    }
}
