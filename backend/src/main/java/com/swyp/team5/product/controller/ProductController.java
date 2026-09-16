package com.swyp.team5.product.controller;

import java.util.List;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.swyp.team5.common.common.ApiResponse;
import com.swyp.team5.common.common.CursorPageResponse;
import com.swyp.team5.common.passport.PrincipalMember;
import com.swyp.team5.product.dto.ProductCreateRequest;
import com.swyp.team5.product.dto.ProductResponse;
import com.swyp.team5.product.dto.ProductStatusUpdateRequest;
import com.swyp.team5.product.dto.ProductSummaryResponse;
import com.swyp.team5.product.dto.ProductUpdateRequest;
import com.swyp.team5.product.entity.ProductStatus;
import com.swyp.team5.product.service.ProductService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@Tag(name = "Product", description = "상품")
@RestController
@RequestMapping("/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;

    /**
     * 상품을 직접 등록한다.
     *
     * @param currentMember 인증된 요청자
     * @param request 등록 요청 바디
     * @return 201 Created + 등록된 상품
     */
    @Operation(summary = "상품 등록")
    @PostMapping
    public ResponseEntity<ApiResponse<ProductResponse>> create(
            @AuthenticationPrincipal PrincipalMember currentMember, @Valid @RequestBody ProductCreateRequest request) {
        ProductResponse response = productService.create(currentMember.memberId(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }

    /**
     * 상품 사진을 업로드하면 AI(Gemini)가 상품 정보를 분석해 자동으로 등록한다.
     *
     * @param currentMember 인증된 요청자
     * @param images 분석할 상품 이미지 목록
     * @return 201 Created + 등록된 상품
     */
    @Operation(summary = "상품 이미지 AI 등록", description = "상품 사진을 업로드하면 AI(Gemini)가 상품 정보를 분석해 자동으로 등록한다.")
    @PostMapping(value = "/analyze", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<ProductResponse>> createFromImages(
            @AuthenticationPrincipal PrincipalMember currentMember,
            @RequestParam("images") List<MultipartFile> images) {
        ProductResponse response = productService.createFromImages(currentMember.memberId(), images);
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
     * 상품 목록을 커서 기반으로 조회한다(정렬은 {@code id} 내림차순 고정).
     *
     * @param categoryId 카테고리 필터(선택)
     * @param status 상태 필터(선택)
     * @param cursor 이전 페이지 마지막 상품의 {@code id}(선택, 첫 페이지는 생략)
     * @param size 페이지 크기(기본 20)
     * @return 200 OK + 커서 페이지 응답
     */
    // 커서 기반 페이징 적용
    @Operation(summary = "상품 목록 조회")
    @GetMapping
    public ResponseEntity<ApiResponse<CursorPageResponse<ProductSummaryResponse>>> getProducts(
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) ProductStatus status,
            @RequestParam(required = false) Long cursor,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.success(productService.getProducts(categoryId, status, cursor, size)));
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
