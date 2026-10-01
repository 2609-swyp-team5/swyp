package com.swyp.team5.product.service;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
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
import com.swyp.team5.common.common.ApiError;
import com.swyp.team5.common.common.ApiResponse;
import com.swyp.team5.file.dto.FileUploadResponse;
import com.swyp.team5.file.dto.InMemoryMultipartFile;
import com.swyp.team5.file.error.FileStorageException;
import com.swyp.team5.file.service.FileStorageService;
import com.swyp.team5.product.config.ProductRegisterStreamProperties;
import com.swyp.team5.product.dto.ProductAiAnalysisResult;
import com.swyp.team5.product.dto.ProductCreateRequest;
import com.swyp.team5.product.dto.ProductResponse;
import com.swyp.team5.product.dto.ProductUpdateRequest;
import com.swyp.team5.product.dto.register.ProductRegisterAnalysis;
import com.swyp.team5.product.dto.register.ProductRegisterErrorEvent;
import com.swyp.team5.product.dto.register.ProductRegisterResponse;
import com.swyp.team5.product.dto.register.ProductRegisterStep;
import com.swyp.team5.product.dto.register.ProductRegisterStepEvent;
import com.swyp.team5.product.dto.register.ProductRegisterStepEvent.ImageAnalysisResult;
import com.swyp.team5.product.dto.register.ProductRegisterStepEvent.ImageUploadResult;
import com.swyp.team5.product.entity.DefectStatus;
import com.swyp.team5.product.error.ProductAccessDeniedException;
import com.swyp.team5.product.error.ProductImageRequiredException;
import com.swyp.team5.product.error.ProductNotFoundException;
import com.swyp.team5.product.error.ProductRegisterBusyException;

/**
 * 상품 등록·수정을 단계별로 처리하며 진행 상황을 SSE로 보낸다. 등록은 이미지 업로드 → AI 사진 분석 → 상품 저장, 수정은
 * 이미지 업로드 → 상품 저장 단계로 나눠 처리하며, 단계마다 SSE {@code step} 이벤트를, 끝나면 {@code complete}(등록·수정된
 * 상품) 또는 {@code error} 이벤트를 보낸다.
 *
 * <p>업로드와 AI 호출은 트랜잭션 밖에서 하고 저장({@link ProductService#saveDirect}/{@link ProductService#saveFromAnalysis}/
 * {@link ProductService#saveUpdate})만 짧은 트랜잭션으로 처리한다. 실패하면 이번 요청에서 업로드한 파일을 지운다.
 *
 * <p>스트림 시간이 지나거나 클라이언트 연결이 끊기면(이벤트 전송 실패로 감지) 요청을 취소 상태로 표시하고, 다음 단계를
 * 시작할 때(늦어도 상품 저장 직전) 확인해 저장하지 않고 업로드한 파일을 지운다 — 클라이언트가 결과를 받지 못한 요청은 저장되지
 * 않으므로 다시 시도해도 중복 등록되지 않는다. 진행 중인 업로드·AI 호출 자체는 중단하지 않는다. 이미 저장을 시작한 뒤에 시간이
 * 지나면 저장은 그대로 끝내고 결과를 내 상품 목록에서 확인하도록 안내한다.
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
    private static final List<ProductRegisterStep> UPDATE_STEPS = List.of(
            ProductRegisterStep.IMAGE_UPLOAD, ProductRegisterStep.IMAGE_ANALYSIS, ProductRegisterStep.PRODUCT_SAVE);

    private final ProductService productService;
    private final ProductAiService productAiService;
    private final FileStorageService fileStorageService;
    private final ProductImageLoader productImageLoader;
    private final ProductRegisterStreamProperties properties;
    private final ThreadPoolTaskExecutor executor;
    private final ScheduledExecutorService keepAliveScheduler;

    public ProductRegisterStreamService(
            ProductService productService,
            ProductAiService productAiService,
            FileStorageService fileStorageService,
            ProductImageLoader productImageLoader,
            ProductRegisterStreamProperties properties) {
        this.productService = productService;
        this.productAiService = productAiService;
        this.fileStorageService = fileStorageService;
        this.productImageLoader = productImageLoader;
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
     * 직접 등록을 단계별로 처리한다. AI 사진 분석은 필수라, 실패하면 업로드한 파일을 지우고 {@code error} 이벤트로
     * 등록을 취소한다(AI 등록과 같은 규칙).
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
            ProductAiAnalysisResult analysis = analyze(stream, copies);
            return save(
                    stream,
                    "상품을 등록하고 있습니다.",
                    "상품 등록 완료",
                    () -> productService.saveDirect(memberId, request, imageUrls, analysis));
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
            ProductAiAnalysisResult analysis = analyze(stream, copies);
            return save(
                    stream,
                    "상품을 등록하고 있습니다.",
                    "상품 등록 완료",
                    () -> productService.saveFromAnalysis(
                            memberId, analysis, imageUrls, purchasedMonths, defectStatus, includedItems));
        });
    }

    /**
     * 상품 수정을 단계별로 처리한다. 새 이미지 파일을 업로드한 뒤(없으면 {@code SKIP}) 유지할 기존 이미지 뒤에 이어 붙여
     * 저장한다. 빈 파일은 무시한다.
     *
     * <p>이미지 구성이 바뀌었으면(새 파일 추가 또는 기존 이미지 제거 — 순서만 바뀐 경우는 제외) 최종 이미지 전체를 AI로 다시
     * 분석해 AI 제안가/판단 근거만 갱신한다. 유지하는 기존 이미지는 스토리지에서 내려받되, 이 상품에 실제로 등록된 URL만
     * 내려받는다(요청에 섞인 임의 URL은 분석에서 제외). 이미지가 그대로이거나 분석에 실패하면 {@code SKIP}하고 기존 값을
     * 유지한 채 수정한다.
     *
     * @param memberId 요청한 회원 ID
     * @param productId 수정할 상품 ID
     * @param request 수정 요청 바디
     * @param images 새로 추가할 이미지 파일 목록(선택, {@code null} 허용)
     * @return 진행 상황을 보내는 SSE 스트림
     * @throws ProductNotFoundException 존재하지 않는 상품인 경우(스트림 시작 전)
     * @throws ProductAccessDeniedException 본인이 등록한 상품이 아닌 경우(스트림 시작 전)
     * @throws CategoryNotFoundException 존재하지 않는 카테고리인 경우(스트림 시작 전)
     * @throws CategoryNotLeafException 최하위 카테고리가 아닌 경우(스트림 시작 전)
     * @throws ProductImageRequiredException 유지할 이미지와 새 파일을 합쳐 1장도 없는 경우(스트림 시작 전)
     * @throws ProductRegisterBusyException 처리 대기열이 가득 찬 경우(스트림 시작 전)
     */
    public SseEmitter update(Long memberId, Long productId, ProductUpdateRequest request, List<MultipartFile> images) {
        List<MultipartFile> copies = images == null
                ? List.of()
                : images.stream()
                        .filter(image -> !image.isEmpty())
                        .map(image -> (MultipartFile) InMemoryMultipartFile.copyOf(image))
                        .toList();
        List<String> currentImageUrls = productService.validateUpdate(memberId, productId, request, copies.size());
        List<String> keptImageUrls = request.imageUrls() == null ? List.of() : request.imageUrls();
        boolean imagesChanged = !copies.isEmpty() || !Set.copyOf(keptImageUrls).equals(Set.copyOf(currentImageUrls));
        return start(UPDATE_STEPS, stream -> {
            List<String> newImageUrls;
            if (copies.isEmpty()) {
                stream.skip(ProductRegisterStep.IMAGE_UPLOAD, "새로 추가할 이미지가 없습니다.");
                newImageUrls = List.of();
            } else {
                newImageUrls = uploadImages(stream, copies);
            }
            ProductAiAnalysisResult analysis = null;
            if (imagesChanged) {
                analysis = analyzeOrSkip(stream, () -> updatedImages(keptImageUrls, currentImageUrls, copies));
            } else {
                stream.skip(ProductRegisterStep.IMAGE_ANALYSIS, "이미지가 바뀌지 않아 사진 분석을 건너뜁니다.");
            }
            ProductAiAnalysisResult finalAnalysis = analysis;
            return save(
                    stream,
                    "상품을 수정하고 있습니다.",
                    "상품 수정 완료",
                    () -> productService.saveUpdate(memberId, productId, request, newImageUrls, finalAnalysis));
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

    /** 스트림 응답 객체를 만든다(테스트에서 시간 초과·연결 끊김을 흉내 내려고 분리). */
    SseEmitter createEmitter(long timeoutMillis) {
        return new SseEmitter(timeoutMillis);
    }

    private SseEmitter start(List<ProductRegisterStep> steps, Function<RegisterStream, ProductResponse> work) {
        SseEmitter emitter = createEmitter(properties.timeout().toMillis());
        RegisterStream stream = new RegisterStream(emitter, steps);
        emitter.onTimeout(() -> {
            if (stream.cancel()) {
                log.warn("상품 등록·수정 스트림 시간 초과 - 저장 전이라 취소합니다. step={}", stream.currentStep);
                stream.sendAndClose(errorResponse(
                        stream.currentStep,
                        HttpStatus.SERVICE_UNAVAILABLE,
                        "REGISTER_TIMEOUT_CANCELLED",
                        "처리 시간이 초과되어 요청을 취소했습니다. 잠시 후 다시 시도해 주세요."));
                return;
            }
            log.warn("상품 등록·수정 스트림 시간 초과 - 이미 저장 중이라 처리는 계속 진행합니다. step={}", stream.currentStep);
            stream.sendAndClose(errorResponse(
                    stream.currentStep,
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "REGISTER_TIMEOUT",
                    "처리가 지연되고 있습니다. 처리 결과는 내 상품 목록에서 확인해 주세요."));
        });
        emitter.onCompletion(stream::markClosed);
        emitter.onError(error -> stream.disconnect());
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
            stream.send(ApiResponse.success(
                    ProductRegisterResponse.of(product, ProductRegisterAnalysis.of(product, stream.completedSteps))));
        } catch (RegisterCancelledException e) {
            log.info("상품 등록·수정 취소 - 결과를 받을 클라이언트가 없어 저장하지 않고 업로드 파일을 지웁니다. step={}", stream.currentStep);
            deleteUploadedFiles(stream);
        } catch (RuntimeException e) {
            deleteUploadedFiles(stream);
            stream.send(toErrorResponse(stream.currentStep, e));
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

    /** 등록의 AI 사진 분석은 필수라 실패하면 예외를 그대로 던져 등록을 취소한다(run()이 파일 삭제 후 error 이벤트). */
    private ProductAiAnalysisResult analyze(RegisterStream stream, List<MultipartFile> images) {
        stream.begin(ProductRegisterStep.IMAGE_ANALYSIS, "AI가 사진을 분석하고 있습니다.");
        ProductAiAnalysisResult analysis = productAiService.analyze(images);
        stream.done(ProductRegisterStep.IMAGE_ANALYSIS, "사진 분석 완료", ImageAnalysisResult.from(analysis));
        return analysis;
    }

    /** 수정의 AI 재분석은 제안가/판단 근거 갱신용이라 실패하면 건너뛰고 기존 값으로 수정을 계속한다. */
    private ProductAiAnalysisResult analyzeOrSkip(RegisterStream stream, Supplier<List<MultipartFile>> images) {
        stream.begin(ProductRegisterStep.IMAGE_ANALYSIS, "AI가 사진을 분석하고 있습니다.");
        try {
            ProductAiAnalysisResult analysis = productAiService.analyze(images.get());
            stream.done(ProductRegisterStep.IMAGE_ANALYSIS, "사진 분석 완료", ImageAnalysisResult.from(analysis));
            return analysis;
        } catch (RuntimeException e) {
            log.warn("상품 수정 AI 사진 분석 실패 - 기존 제안가/판단 근거를 유지합니다. reason={}", e.getMessage());
            stream.skip(ProductRegisterStep.IMAGE_ANALYSIS, "사진 분석에 실패해 기존 추천 가격을 유지합니다.");
            return null;
        }
    }

    /**
     * 수정 후 최종 이미지(유지할 기존 이미지 → 새 파일 순)를 분석용 파일로 모은다. 기존 이미지는 이 상품에 등록된 URL만
     * 내려받는다(요청에 섞인 임의 URL을 서버가 대신 요청하지 않도록).
     */
    private List<MultipartFile> updatedImages(
            List<String> keptImageUrls, List<String> currentImageUrls, List<MultipartFile> newImages) {
        List<MultipartFile> images = new ArrayList<>();
        for (String url : keptImageUrls) {
            if (currentImageUrls.contains(url)) {
                images.add(productImageLoader.load(url));
            } else {
                log.warn("상품 수정 - 등록되지 않은 이미지 URL은 사진 분석에서 제외합니다. url={}", url);
            }
        }
        images.addAll(newImages);
        if (images.isEmpty()) {
            throw new IllegalStateException("분석할 이미지가 없습니다.");
        }
        return images;
    }

    private ProductResponse save(
            RegisterStream stream, String startMessage, String doneMessage, Supplier<ProductResponse> saver) {
        stream.begin(ProductRegisterStep.PRODUCT_SAVE, startMessage);
        // 저장 시작 이벤트 전송까지 끝난 뒤 마지막으로 취소 여부를 확인한다(이후 시간이 지나도 저장은 끝까지 진행)
        stream.startSaving();
        ProductResponse product = saver.get();
        stream.uploadedKeys.clear(); // 저장이 끝났으므로 이후에는 파일을 지우지 않는다
        stream.done(ProductRegisterStep.PRODUCT_SAVE, doneMessage, null);
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

    private static ApiResponse<ProductRegisterErrorEvent> toErrorResponse(
            ProductRegisterStep step, RuntimeException e) {
        if (step == ProductRegisterStep.IMAGE_UPLOAD) {
            log.error("상품 등록 - 이미지 업로드 실패: {}", e.getMessage(), e);
            return errorResponse(
                    step, HttpStatus.BAD_GATEWAY, "IMAGE_UPLOAD_FAILED", "이미지 업로드에 실패했습니다. 잠시 후 다시 시도해 주세요.");
        }
        if (step == ProductRegisterStep.IMAGE_ANALYSIS) {
            log.error("상품 등록 - AI 사진 분석 실패: {}", e.getMessage(), e);
            return errorResponse(
                    step, HttpStatus.BAD_GATEWAY, "AI_ANALYSIS_FAILED", "AI 사진 분석에 실패했습니다. 잠시 후 다시 시도해 주세요.");
        }
        if (e instanceof ProductNotFoundException) {
            log.warn("상품 수정 - 상품 없음: {}", e.getMessage());
            return errorResponse(step, HttpStatus.NOT_FOUND, "NOT_FOUND", e.getMessage());
        }
        if (e instanceof ProductAccessDeniedException) {
            log.warn("상품 수정 - 권한 없음: {}", e.getMessage());
            return errorResponse(step, HttpStatus.FORBIDDEN, "FORBIDDEN", e.getMessage());
        }
        if (e instanceof CategoryNotFoundException) {
            log.warn("상품 등록 - 카테고리 없음: {}", e.getMessage());
            return errorResponse(step, HttpStatus.NOT_FOUND, "NOT_FOUND", e.getMessage());
        }
        if (e instanceof CategoryNotLeafException) {
            log.warn("상품 등록 - 최하위가 아닌 카테고리: {}", e.getMessage());
            return errorResponse(step, HttpStatus.BAD_REQUEST, "INVALID_INPUT_VALUE", e.getMessage());
        }
        if (e instanceof DataIntegrityViolationException) {
            log.warn("상품 등록 - 데이터 무결성 위반: {}", e.getMessage());
            return errorResponse(step, HttpStatus.CONFLICT, "CONFLICT", "이미 사용 중인 값입니다.");
        }
        log.error("상품 등록 - 처리 실패: step={}", step, e);
        return errorResponse(step, HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_SERVER_ERROR", "서버 내부 오류가 발생했습니다.");
    }

    /** 기존 에러 응답과 같은 형태({@code success=false}, {@code error})에 이벤트 종류와 실패 단계를 {@code data}로 담는다. */
    private static ApiResponse<ProductRegisterErrorEvent> errorResponse(
            ProductRegisterStep step, HttpStatus status, String code, String message) {
        return new ApiResponse<>(false, message, ProductRegisterErrorEvent.of(step), ApiError.of(status, code));
    }

    /** 시간 초과·연결 끊김으로 취소된 요청(저장하지 않고 업로드 파일만 지운다). */
    private static final class RegisterCancelledException extends RuntimeException {

        private RegisterCancelledException() {
            super("상품 등록·수정 요청이 취소되었습니다.", null, false, false);
        }
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
        private boolean cancelled; // 시간 초과·연결 끊김으로 저장하지 않기로 함
        private boolean saving; // 저장을 시작함(이후에는 취소하지 않음)

        private RegisterStream(SseEmitter emitter, List<ProductRegisterStep> steps) {
            this.emitter = emitter;
            this.steps = steps;
        }

        void begin(ProductRegisterStep step, String message) {
            throwIfCancelled();
            currentStep = step;
            send(ApiResponse.success(
                    message, ProductRegisterStepEvent.of(step, "START", indexOf(step), steps.size(), null)));
        }

        void done(ProductRegisterStep step, String message, Object result) {
            finish(message, ProductRegisterStepEvent.of(step, "DONE", indexOf(step), steps.size(), result));
        }

        void skip(ProductRegisterStep step, String message) {
            finish(message, ProductRegisterStepEvent.of(step, "SKIP", indexOf(step), steps.size(), null));
        }

        /** 단계 결과를 기록하고(최종 analysis 계산용) 바로 step 이벤트로 보낸다. */
        private void finish(String message, ProductRegisterStepEvent event) {
            completedSteps.add(event);
            send(ApiResponse.success(message, event));
        }

        /**
         * 저장 전이면 취소 상태로 표시한다.
         *
         * @return 취소했으면 {@code true}, 이미 저장을 시작해 취소할 수 없으면 {@code false}
         */
        synchronized boolean cancel() {
            if (saving) {
                return false;
            }
            cancelled = true;
            return true;
        }

        /** 연결이 끊겨 결과를 보낼 수 없다(저장 전이면 취소). */
        synchronized void disconnect() {
            closed = true;
            cancel();
        }

        synchronized void throwIfCancelled() {
            if (cancelled) {
                throw new RegisterCancelledException();
            }
        }

        /** 취소되지 않았으면 저장 시작으로 표시한다(이후 시간 초과는 저장을 막지 않음). */
        synchronized void startSaving() {
            throwIfCancelled();
            saving = true;
        }

        /** 이 방식의 단계 목록 안에서의 순서(1부터). 목록에 없는 단계를 쓰면 개발 실수이므로 바로 실패시킨다. */
        private int indexOf(ProductRegisterStep step) {
            int index = steps.indexOf(step);
            if (index < 0) {
                throw new IllegalStateException("등록 단계 목록에 없는 단계입니다: " + step);
            }
            return index + 1;
        }

        /**
         * 이벤트 하나를 {@code data:} 줄로 보낸다. SSE {@code event:} 이름은 쓰지 않고, 이벤트 종류는 응답 JSON의
         * {@code data.event}(step/complete/error)로 구분한다. 전송에 실패하면 연결이 끊긴 것으로 보고 저장 전이면 취소한다.
         */
        synchronized void send(ApiResponse<?> response) {
            if (closed) {
                return;
            }
            try {
                emitter.send(SseEmitter.event().data(response, MediaType.APPLICATION_JSON));
            } catch (IOException | IllegalStateException e) {
                disconnect();
                log.debug("SSE 이벤트 전송 실패(연결 종료): reason={}", e.getMessage());
            }
        }

        synchronized void ping() {
            if (closed) {
                return;
            }
            try {
                emitter.send(SseEmitter.event().comment("ping"));
            } catch (IOException | IllegalStateException e) {
                disconnect();
            }
        }

        synchronized void sendAndClose(ApiResponse<?> response) {
            send(response);
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
