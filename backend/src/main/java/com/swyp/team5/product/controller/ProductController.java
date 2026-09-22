package com.swyp.team5.product.controller;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.PositiveOrZero;

import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpStatus;
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

import com.swyp.team5.common.common.ApiResponse;
import com.swyp.team5.common.common.CursorPageResponse;
import com.swyp.team5.common.passport.PrincipalMember;
import com.swyp.team5.product.dto.ProductCreateRequest;
import com.swyp.team5.product.dto.ProductListItemResponse;
import com.swyp.team5.product.dto.ProductResponse;
import com.swyp.team5.product.dto.ProductStatusUpdateRequest;
import com.swyp.team5.product.dto.ProductSummaryResponse;
import com.swyp.team5.product.dto.ProductUpdateRequest;
import com.swyp.team5.product.entity.DefectStatus;
import com.swyp.team5.product.entity.ProductStatus;
import com.swyp.team5.product.service.ProductService;
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
    private final SearchLogService searchLogService;

    /**
     * 상품을 직접 등록한다. AI 등록({@link #createFromImages})과 동일하게 상품 사진 파일을 직접
     * 받아 서버가 업로드까지 한 번에 처리한다(별도로 {@code POST /files}를 먼저 호출할 필요 없음).
     *
     * @param currentMember 인증된 요청자
     * @param images 등록할 상품 이미지 목록(순서대로 저장)
     * @param request 등록 요청 정보(JSON, {@code data} 파트)
     * @return 201 Created + 등록된 상품
     */
    @Operation(summary = "상품 등록", description = "상품 이미지 파일과 등록 정보(JSON, data 파트)를 함께 받아 이미지 업로드부터 등록까지 한 번에 처리한다.")
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<ProductResponse>> create(
            @AuthenticationPrincipal PrincipalMember currentMember,
            @RequestPart("images") @NotEmpty List<MultipartFile> images,
            @RequestPart("data") @Valid ProductCreateRequest request) {
        ProductResponse response = productService.create(currentMember.memberId(), request, images);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }

    /**
     * 상품 사진을 업로드하면 AI(Gemini)가 상품 정보를 분석해 자동으로 등록한다.
     * 구매 일시/결함 여부는 AI가 추론하지 않고 사용자가 직접 입력한 값을 그대로 사용하며,
     * 브랜드/구성품은 AI가 사진에서 식별해 채운다(식별 불가 시 각각 null/빈 목록).
     *
     * @param currentMember 인증된 요청자
     * @param images 분석할 상품 이미지 목록
     * @param purchasedMonths 사용자가 입력한 구매 후 경과 개월 수(선택, 0~6, 등록 시점 기준 구매일시로 변환)
     * @param defectStatus 사용자가 입력한 결함(하자) 상태(NORMAL/ISSUES/UNKNOWN, 대소문자 무관)
     * @return 201 Created + 등록된 상품
     */
    @Operation(summary = "상품 이미지 AI 등록", description = "상품 사진을 업로드하면 AI(Gemini)가 상품 정보를 분석해 자동으로 등록한다.")
    @PostMapping(value = "/analyze", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<ProductResponse>> createFromImages(
            @AuthenticationPrincipal PrincipalMember currentMember,
            @RequestParam("images") List<MultipartFile> images,
            @RequestParam(required = false) @PositiveOrZero @Max(6) Integer purchasedMonths,
            @RequestParam DefectStatus defectStatus) {
        ProductResponse response =
                productService.createFromImages(currentMember.memberId(), images, purchasedMonths, defectStatus);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }

    /**
     * 상품 상세 정보를 조회한다.
     *
     * @param productId 조회할 상품 ID
     * @return 200 OK + 상품 상세 정보
     */
    @Operation(summary = "상품 상세 조회")
    @GetMapping("/{productId}")
    public ResponseEntity<ApiResponse<ProductResponse>> getProduct(@PathVariable Long productId) {
        return ResponseEntity.ok(ApiResponse.success(productService.getProduct(productId)));
    }

    /**
     * 상품 목록을 커서 기반으로 조회한다(정렬은 등록일시 내림차순, {@code HIDDEN} 상태는 항상 제외되는
     * 공개 목록). 우리 회원 상품과 외부 플랫폼에서 수집한 매물을 한 목록에 섞어 반환한다({@code source}
     * 필드로 구분, {@link ProductService#getProducts} 참고). 인증된 본인 전체 상품(숨김 포함)은
     * {@link #getMyProducts} 참고.
     *
     * @param currentMember 인증된 요청자(키워드 검색 로그 기록용)
     * @param keyword 제목/설명(외부 매물은 제목만) 키워드 검색(선택)
     * @param status 상태 필터(선택, 지정 시 외부 매물은 제외되고 우리 상품만 반환)
     * @param cursor 이전 페이지 마지막 항목의 등록일시(epoch millisecond, 선택, 첫 페이지는 생략)
     * @param size 페이지 크기(기본 20)
     * @return 200 OK + 커서 페이지 응답
     */
    // 커서 기반 페이징 적용
    @Operation(summary = "상품 목록 조회")
    @GetMapping
    public ResponseEntity<ApiResponse<CursorPageResponse<ProductListItemResponse>>> getProducts(
            @AuthenticationPrincipal PrincipalMember currentMember,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) ProductStatus status,
            @RequestParam(required = false) Long cursor,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.success(
                productService.getProducts(currentMember.memberId(), keyword, status, cursor, size)));
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
     * 인증된 본인이 등록한 상품 목록을 커서 기반으로 조회한다(정렬은 {@code id} 내림차순 고정). 본인
     * 관리 화면 용도라 {@link #getProducts}와 달리 {@code HIDDEN} 상태도 포함한다.
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
     * 상품 정보를 수정한다. 본인이 등록한 상품만 수정할 수 있다.
     *
     * @param currentMember 인증된 요청자
     * @param productId 수정할 상품 ID
     * @param request 수정 요청 바디
     * @return 200 OK + 수정된 상품
     */
    @Operation(summary = "상품 수정")
    @PatchMapping("/{productId}")
    public ResponseEntity<ApiResponse<ProductResponse>> update(
            @AuthenticationPrincipal PrincipalMember currentMember,
            @PathVariable Long productId,
            @Valid @RequestBody ProductUpdateRequest request) {
        ProductResponse response = productService.update(currentMember.memberId(), productId, request);
        return ResponseEntity.ok(ApiResponse.success(response));
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
}
