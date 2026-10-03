package com.swyp.team5.product.controller;

import java.util.List;
import java.util.Set;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import lombok.RequiredArgsConstructor;

import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import com.swyp.team5.common.common.ApiResponse;
import com.swyp.team5.common.common.CursorPageResponse;
import com.swyp.team5.common.passport.PrincipalMember;
import com.swyp.team5.product.dto.ListingTradeStatus;
import com.swyp.team5.product.dto.ProductAiSearchResponse;
import com.swyp.team5.product.dto.ProductCreateRequest;
import com.swyp.team5.product.dto.ProductDetailSummaryResponse;
import com.swyp.team5.product.dto.ProductListItemResponse;
import com.swyp.team5.product.dto.ProductResponse;
import com.swyp.team5.product.dto.ProductSearchCondition;
import com.swyp.team5.product.dto.ProductSearchPlatform;
import com.swyp.team5.product.dto.ProductSortType;
import com.swyp.team5.product.dto.ProductStatusUpdateRequest;
import com.swyp.team5.product.dto.ProductSummaryResponse;
import com.swyp.team5.product.dto.ProductUpdateRequest;
import com.swyp.team5.product.entity.DefectStatus;
import com.swyp.team5.product.entity.ProductCondition;
import com.swyp.team5.product.entity.ProductStatus;
import com.swyp.team5.product.service.ProductAiSearchService;
import com.swyp.team5.product.service.ProductRegisterStreamService;
import com.swyp.team5.product.service.ProductService;
import com.swyp.team5.productanalysis.dto.ProductCompetitionResponse;
import com.swyp.team5.search.service.SearchLogService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@Tag(name = "Product", description = "상품")
@RestController
@RequestMapping("/products")
@RequiredArgsConstructor
@Validated
public class ProductController {

    private final ProductService productService;
    private final ProductRegisterStreamService productRegisterStreamService;
    private final SearchLogService searchLogService;
    private final ProductAiSearchService productAiSearchService;

    /**
     * 상품을 직접 등록하며 진행 상황을 SSE로 보낸다. 상품 사진 파일을 직접 받아 서버가 업로드 → AI 사진 분석 → 저장까지 한 번에
     * 처리한다(별도로 {@code POST /files}를 먼저 호출할 필요 없음). AI 사진 분석은 필수라, 실패하면 업로드한 파일을 지우고
     * {@code error} 이벤트({@code AI_ANALYSIS_FAILED})로 등록을 취소한다. 인증·입력값·카테고리 오류와 처리 대기열 포화(503)는 스트림을 열기 전에 일반 JSON 에러로
     * 응답한다.
     *
     * <pre>
     * 모든 이벤트는 SSE {@code data:} 한 줄로 오며, 내용은 기존 API 응답과 같은 형태다. 이벤트 종류는 {@code data.event}로 구분한다.
     * data:{"success":true,"message":"진행 문구","data":{"event":"step","step":"IMAGE_UPLOAD","status":"START|DONE|SKIP","index":1,"total":3,"result":...},"error":null}
     * (SKIP은 수정에서만 — 새 이미지 없음, 이미지 변경 없음, 재분석 실패)
     * data:{"success":true,"message":"...","data":{"event":"complete",상품 필드,"analysis":{가격·분석 정보}},"error":null}
     * data:{"success":false,"message":"...","data":{"event":"error","step":"IMAGE_ANALYSIS"},"error":{"status":"502","code":"AI_ANALYSIS_FAILED"}}
     * </pre>
     *
     * @param currentMember 인증된 요청자
     * @param images 등록할 상품 이미지 목록(순서대로 저장)
     * @param request 등록 요청 정보(JSON, {@code data} 파트)
     * @return 진행 상황 SSE 스트림
     */
    @Operation(
            summary = "상품 등록(단계별 스트리밍)",
            description =
                    "상품 이미지 파일과 등록 정보(JSON, data 파트)를 받아 이미지 업로드 → AI 사진 분석 → 상품 저장 진행 상황을 SSE(step/complete/error 이벤트)로 보낸다.")
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE, produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public ResponseEntity<SseEmitter> create(
            @AuthenticationPrincipal PrincipalMember currentMember,
            @RequestPart("images") @NotEmpty List<MultipartFile> images,
            @RequestPart("data") @Valid ProductCreateRequest request) {
        return stream(productRegisterStreamService.registerDirect(currentMember.memberId(), request, images));
    }

    /**
     * 상품 사진을 AI(Gemini)로 분석해 등록하며 진행 상황을 SSE로 보낸다. 구매 일시/결함 여부는 AI가 추론하지 않고 사용자가
     * 직접 입력한 값을 그대로 사용하며, 브랜드는 AI가 사진에서 식별해 채운다(식별 불가 시 null). 태그는 AI가 추론한 목록만
     * 저장하고, 구성품은 AI 추론 목록과 사용자가 추가로 입력한 목록을 합쳐서 저장한다. AI 사진 분석이 실패하면 업로드한 파일을
     * 지우고 {@code error} 이벤트로 끝낸다. 이벤트 형식은 {@link #create}와 같다.
     *
     * @param currentMember 인증된 요청자
     * @param images 분석할 상품 이미지 목록
     * @param purchasedMonths 사용자가 입력한 구매 후 경과 개월 수(선택, 0~6, 등록 시점 기준 구매일시로 변환)
     * @param defectStatus 사용자가 입력한 결함(하자) 상태(NORMAL/ISSUES/UNKNOWN, 대소문자 무관)
     * @param includedItems 사용자가 추가로 입력한 구성품 이름 목록(선택, AI 추론 결과와 합쳐짐)
     * @return 진행 상황 SSE 스트림
     */
    @Operation(
            summary = "상품 이미지 AI 등록(단계별 스트리밍)",
            description =
                    "상품 사진을 업로드하면 AI(Gemini)가 상품 정보를 분석해 등록하며, 이미지 업로드 → AI 사진 분석 → 상품 저장 진행 상황을 SSE(step/complete/error 이벤트)로 보낸다.")
    @PostMapping(
            value = "/analyze",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE,
            produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public ResponseEntity<SseEmitter> createFromImages(
            @AuthenticationPrincipal PrincipalMember currentMember,
            @RequestParam("images") @NotEmpty List<MultipartFile> images,
            @RequestParam(required = false) @PositiveOrZero @Max(6) Integer purchasedMonths,
            @RequestParam DefectStatus defectStatus,
            @RequestParam(required = false) List<@NotBlank @Size(max = 50) String> includedItems) {
        return stream(productRegisterStreamService.registerWithAi(
                currentMember.memberId(), images, purchasedMonths, defectStatus, includedItems));
    }

    /**
     * 상품 상세 정보를 조회한다. 외부 수집 매물도 같은 ID 체계라 목록 응답의 {@code id}를 그대로 넘기면 같은 응답 형태로
     * 조회된다({@code source}로 구분). 비로그인도 조회할 수 있다. 판매자 본인이 조회하면 게시 플랫폼·관심 수·조회수도
     * 포함하고, 그 밖의 조회(다른 회원·비회원)는 조회수에 반영한다(회원은 회원 단위, 비회원은 IP 단위로 24시간에 1회).
     *
     * @param currentMember 요청자(비로그인이면 null)
     * @param productId 조회할 상품(또는 외부 매물) ID
     * @param request 비회원 조회수 구분용 요청 IP
     * @return 200 OK + 상품 상세 정보
     */
    @Operation(summary = "상품 상세 조회")
    @GetMapping("/{productId}")
    public ResponseEntity<ApiResponse<ProductResponse>> getProduct(
            @AuthenticationPrincipal PrincipalMember currentMember,
            @PathVariable Long productId,
            HttpServletRequest request) {
        Long memberId = currentMember == null ? null : currentMember.memberId();
        productService.recordView(productId, memberId, request.getRemoteAddr());
        return ResponseEntity.ok(ApiResponse.success(productService.getProduct(productId, memberId)));
    }

    /**
     * 상품 상세 요약(판매 관리 화면 요약 영역)을 조회한다. 로그인 회원 누구나 모든 필드를 조회할 수 있고, 외부 수집 매물 ID도
     * 받는다. 상세 조회와 같은 규칙으로 조회수에 반영한다(판매자 본인 제외, 회원 단위 24시간에 1회).
     *
     * @param productId 조회할 상품(또는 외부 매물) ID
     * @return 200 OK + 상품 상세 요약(조회수·관심 수·판매 일수·게시 플랫폼 링크 포함)
     */
    @Operation(summary = "상품 상세 요약 조회")
    @GetMapping("/{productId}/summary")
    public ResponseEntity<ApiResponse<ProductDetailSummaryResponse>> getProductSummary(
            @AuthenticationPrincipal PrincipalMember currentMember,
            @PathVariable Long productId,
            HttpServletRequest request) {
        productService.recordView(productId, currentMember.memberId(), request.getRemoteAddr());
        return ResponseEntity.ok(ApiResponse.success(productService.getProductSummary(productId)));
    }

    /**
     * 수집한 외부 매물 중 기준 상품과 같은 유형의 판매 중 매물(경쟁 상품)을 조회한다(AI 호출 없음).
     *
     * @param productId 기준 상품 ID(외부 매물 ID 포함)
     * @return 200 OK + 경쟁 상품 수·경쟁 정도·가격이 가까운 매물 목록(없으면 count 0, 빈 목록)
     */
    @Operation(summary = "경쟁 상품 조회")
    @GetMapping("/{productId}/competition")
    public ResponseEntity<ApiResponse<ProductCompetitionResponse>> getCompetition(@PathVariable Long productId) {
        return ResponseEntity.ok(ApiResponse.success(productService.getCompetition(productId)));
    }

    /**
     * 상품 목록을 커서 기반으로 조회한다(공개 목록, 검색 필터·정렬). 우리 회원 상품과 외부 플랫폼에서 수집한 매물을 한
     * 목록에 섞어 반환한다({@code source} 필드로 구분, {@link ProductService#getProducts} 참고). 복수 값 필터는 같은
     * 파라미터를 반복하거나 쉼표로 구분해 보낸다. 인증된 본인 상품만 보려면 {@link #getMyProducts} 참고.
     *
     * @param currentMember 요청자(키워드 검색 로그 기록용, 비로그인이면 null — 비로그인도 조회 가능)
     * @param keyword 제목/설명(외부 매물은 제목만) 키워드 검색(선택)
     * @param excludeKeyword 제외 키워드(선택, 공백·쉼표로 구분한 단어 중 하나라도 제목/설명에 있으면 제외)
     * @param status 우리 상품 상태 필터(선택, 지정 시 외부 매물 제외)
     * @param tradeStatus 거래 상태 필터(선택, SELLING/RESERVED/SOLD_OUT 복수, 미지정 시 외부 매물은 판매중만)
     * @param platform 플랫폼 필터(선택, OUR/BUNJANG 복수)
     * @param minPrice 최소 가격(선택, 포함)
     * @param maxPrice 최대 가격(선택, 포함)
     * @param condition 제품 상태 등급 필터(선택, S~D 복수, 지정 시 외부 매물 제외)
     * @param defectStatus 하자 여부 필터(선택, NORMAL/ISSUES/UNKNOWN 복수, 지정 시 외부 매물 제외)
     * @param sort 정렬(기본 LATEST — RECOMMENDED/LATEST/INTEREST/PRICE_HIGH/PRICE_LOW)
     * @param cursor 이전 응답의 {@code nextCursor}(선택, 첫 페이지는 생략)
     * @param size 페이지 크기(기본 20, 1~100)
     * @return 200 OK + 커서 페이지 응답
     */
    @Operation(summary = "상품 목록 조회(검색)")
    @GetMapping
    public ResponseEntity<ApiResponse<CursorPageResponse<ProductListItemResponse>>> getProducts(
            @AuthenticationPrincipal PrincipalMember currentMember,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String excludeKeyword,
            @RequestParam(required = false) ProductStatus status,
            @RequestParam(required = false) Set<ListingTradeStatus> tradeStatus,
            @RequestParam(required = false) Set<ProductSearchPlatform> platform,
            @RequestParam(required = false) @PositiveOrZero Long minPrice,
            @RequestParam(required = false) @PositiveOrZero Long maxPrice,
            @RequestParam(required = false) Set<ProductCondition> condition,
            @RequestParam(required = false) Set<DefectStatus> defectStatus,
            @RequestParam(defaultValue = "LATEST") ProductSortType sort,
            @RequestParam(required = false) String cursor,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        ProductSearchCondition searchCondition = new ProductSearchCondition(
                keyword,
                ProductSearchCondition.splitExcludeKeywords(excludeKeyword),
                status,
                tradeStatus,
                platform,
                minPrice,
                maxPrice,
                condition,
                defectStatus,
                sort);
        return ResponseEntity.ok(ApiResponse.success(productService.getProducts(
                currentMember == null ? null : currentMember.memberId(), searchCondition, cursor, size)));
    }

    /**
     * 자연어 문장을 AI로 해석해 상품 목록을 검색한다(예: "아이폰 15 프로 50만원 이하 하자 없는 거"). 해석한 조건으로
     * {@link #getProducts}와 같은 검색을 실행해 첫 페이지를 돌려주며, 다음 페이지는 응답의 {@code condition}과
     * {@code result.nextCursor}로 {@code GET /products}를 호출한다. AI 해석에 실패하면 문장 전체를 키워드로 검색한다.
     *
     * @param currentMember 요청자(검색 로그 기록용, 로그인 필요)
     * @param query 검색 문장(필수, 200자 이하)
     * @param size 페이지 크기(기본 20, 1~100)
     * @return 200 OK + 적용한 검색 조건과 첫 페이지 결과
     */
    @Operation(summary = "AI 상품 검색")
    @GetMapping("/analysis/search")
    public ResponseEntity<ApiResponse<ProductAiSearchResponse>> searchProductsWithAi(
            @AuthenticationPrincipal PrincipalMember currentMember,
            @RequestParam @NotBlank @Size(max = 200) String query,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        ProductAiSearchService.Interpretation interpretation = productAiSearchService.interpret(query);
        CursorPageResponse<ProductListItemResponse> result = productService.getProducts(
                currentMember == null ? null : currentMember.memberId(), interpretation.condition(), null, size);
        return ResponseEntity.ok(ApiResponse.success(
                ProductAiSearchResponse.of(interpretation.aiApplied(), interpretation.condition(), result)));
    }

    /**
     * 최근 7일간 검색 빈도 상위 10개 키워드를 조회한다.
     *
     * @return 200 OK + 인기검색어 목록(빈도 내림차순)
     */
    @Operation(summary = "인기 검색어 조회")
    @GetMapping("/keywords/trending")
    public ResponseEntity<ApiResponse<List<String>>> getPopularKeywords() {
        return ResponseEntity.ok(ApiResponse.success(searchLogService.getPopularKeywords()));
    }

    /**
     * 최근 7일간 관심상품(찜) 등록 수 상위 10개 우리 상품을 조회한다.
     *
     * @return 200 OK + 인기 상품 목록(관심상품 등록 수 내림차순)
     */
    @Operation(summary = "인기 상품 조회")
    @GetMapping("/popular")
    public ResponseEntity<ApiResponse<List<ProductSummaryResponse>>> getPopularProducts() {
        return ResponseEntity.ok(ApiResponse.success(productService.getPopularProducts()));
    }

    /**
     * 인증된 본인이 등록한 상품 목록을 커서 기반으로 조회한다(정렬은 {@code id} 내림차순 고정, 본인 관리
     * 화면 용도).
     *
     * @param currentMember 인증된 요청자
     * @param categoryId 카테고리 필터(선택)
     * @param keyword 제목/설명 키워드 검색(선택)
     * @param status 상태 필터(선택)
     * @param cursor 이전 페이지 마지막 상품의 {@code id}(선택, 첫 페이지는 생략)
     * @param size 페이지 크기(기본 20)
     * @return 200 OK + 커서 페이지 응답
     */
    @Operation(summary = "내 상품 목록 조회")
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<CursorPageResponse<ProductSummaryResponse>>> getMyProducts(
            @AuthenticationPrincipal PrincipalMember currentMember,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) ProductStatus status,
            @RequestParam(required = false) Long cursor,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.success(
                productService.getMyProducts(currentMember.memberId(), categoryId, keyword, status, cursor, size)));
    }

    /**
     * 상품 정보를 수정하며 진행 상황을 SSE로 보낸다. 본인이 등록한 상품만 수정할 수 있다. 새 이미지 파일 업로드(없으면
     * {@code SKIP}) → AI 사진 분석 → 상품 저장 순으로 {@code step} 이벤트를 보내고, 끝나면 수정된 상품을 {@code complete}
     * 이벤트로 보낸다. 이벤트 형식은 {@link #create}와 같다.
     *
     * AI 사진 분석은 이미지 구성이 바뀐 경우(새 파일 추가 또는 기존 이미지 제거)에만 최종 이미지 전체로 다시 하고, AI 제안가·
     * 판단 근거만 갱신한다(사용자 입력값은 덮어쓰지 않음). 이미지가 그대로이거나 분석에 실패하면 {@code SKIP}하고 기존 값을
     * 유지한다.
     *
     * 이미지는 {@code data.imageUrls}(유지할 기존 이미지 URL)와 {@code images}(새로 추가할 이미지 파일)를
     * 이 순서대로 합친 목록으로 전체 교체된다. 인증·입력값 오류, 상품 없음(404)·권한 없음(403), 카테고리 오류, 이미지 0장,
     * 처리 대기열 포화(503)는 스트림을 열기 전에 일반 JSON 에러로 응답한다.
     *
     * @param currentMember 인증된 요청자
     * @param productId 수정할 상품 ID
     * @param images 새로 추가할 이미지 파일 목록(선택)
     * @param request 수정 정보(JSON, {@code data} 파트)
     * @return 진행 상황 SSE 스트림
     */
    @Operation(
            summary = "상품 수정(단계별 스트리밍)",
            description =
                    "수정 정보(JSON, data 파트)와 새로 추가할 이미지 파일(images, 선택)을 받아 이미지 업로드 → AI 사진 분석(이미지 구성이 바뀐 경우만) → 상품 저장 진행 상황을 SSE(step/complete/error 이벤트)로 보낸다. 이미지는 data.imageUrls(유지할 기존 이미지) 뒤에 새 파일을 이어 붙인 순서로 전체 교체된다.")
    @PatchMapping(
            value = "/{productId}",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE,
            produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public ResponseEntity<SseEmitter> update(
            @AuthenticationPrincipal PrincipalMember currentMember,
            @PathVariable Long productId,
            @RequestPart(value = "images", required = false) List<MultipartFile> images,
            @RequestPart("data") @Valid ProductUpdateRequest request) {
        return stream(productRegisterStreamService.update(currentMember.memberId(), productId, request, images));
    }

    /**
     * 상품 게시 상태만 변경한다. 본인이 등록한 상품만 변경할 수 있다.
     *
     * @param currentMember 인증된 요청자
     * @param productId 상태를 변경할 상품 ID
     * @param request 변경할 상태를 담은 요청 바디
     * @return 200 OK + 변경된 상품
     */
    @Operation(summary = "상품 상태 변경")
    @PatchMapping("/{productId}/status")
    public ResponseEntity<ApiResponse<ProductResponse>> updateStatus(
            @AuthenticationPrincipal PrincipalMember currentMember,
            @PathVariable Long productId,
            @Valid @RequestBody ProductStatusUpdateRequest request) {
        ProductResponse response = productService.updateStatus(currentMember.memberId(), productId, request.status());
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * 상품을 삭제한다. 본인이 등록한 상품만 삭제할 수 있다.
     *
     * @param currentMember 인증된 요청자
     * @param productId 삭제할 상품 ID
     * @return 200 OK
     */
    @Operation(summary = "상품 삭제")
    @DeleteMapping("/{productId}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @AuthenticationPrincipal PrincipalMember currentMember, @PathVariable Long productId) {
        productService.delete(currentMember.memberId(), productId);
        return ResponseEntity.ok(ApiResponse.<Void>success(null));
    }

    /** 프록시(nginx 등)가 이벤트를 모아 보내지 않도록 버퍼링·캐시를 끈다. */
    private static ResponseEntity<SseEmitter> stream(SseEmitter emitter) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noCache())
                .header("X-Accel-Buffering", "no")
                .body(emitter);
    }
}
