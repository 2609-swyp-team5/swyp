package com.swyp.team5.aichat.controller;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.swyp.team5.aichat.dto.AiChatAnswerResponse;
import com.swyp.team5.aichat.dto.AiChatDeleteAllResponse;
import com.swyp.team5.aichat.dto.AiChatDetailResponse;
import com.swyp.team5.aichat.dto.AiChatQuestionRequest;
import com.swyp.team5.aichat.dto.AiChatRegenerateRequest;
import com.swyp.team5.aichat.dto.AiChatSuggestionResponse;
import com.swyp.team5.aichat.dto.AiChatSummaryResponse;
import com.swyp.team5.aichat.service.AiChatService;
import com.swyp.team5.aichat.service.AiChatSuggestionService;
import com.swyp.team5.common.common.ApiResponse;
import com.swyp.team5.common.common.CursorPageResponse;
import com.swyp.team5.common.passport.PrincipalMember;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

/**
 * 지금이니 AI 대화 API(로그인 필요). 질문을 보내면 AI가 질문을 해석해 매물을 찾고, 시세 분석 결과를 근거로 설명 문장·"상세 시세 분석"
 * 카드·추천 상품을 돌려준다. 질문 1건당 AI 호출은 최대 2회(해석·문장)이고, 대상 상품의 분석 결과가 없으면 분석을 요청한 뒤 카드를
 * "분석 중"(ANALYZING)으로 먼저 답한다 — 결과는 카드의 {@code productId}로 {@code GET /products/{id}/analysis}를 조회한다.
 */
@Tag(name = "AiChat", description = "지금이니 AI 대화")
@RestController
@RequestMapping("/ai/chats")
@RequiredArgsConstructor
@Validated
public class AiChatController {

    private final AiChatService aiChatService;
    private final AiChatSuggestionService aiChatSuggestionService;

    /**
     * 추천 질문을 조회한다(메인 검색창 아래 칩 — 누르면 그 질문을 그대로 보낸다). AI를 부르지 않고 내 판매 상품(팔기)·관심상품(사기)·
     * 인기 검색어(시세·사기·팔기 번갈아)로 만들며, 재료가 없으면 기본 질문으로 채운다.
     *
     * @param size 최대 개수(기본 5, 1~10)
     * @return 200 OK + 추천 질문 목록
     */
    @Operation(summary = "추천 질문 조회")
    @GetMapping("/suggestions")
    public ResponseEntity<ApiResponse<List<AiChatSuggestionResponse>>> getSuggestions(
            @AuthenticationPrincipal PrincipalMember currentMember,
            @RequestParam(defaultValue = "5") @Min(1) @Max(10) int size) {
        return ResponseEntity.ok(
                ApiResponse.success(aiChatSuggestionService.getSuggestions(currentMember.memberId(), size)));
    }

    /**
     * 본인 최근 대화 목록을 조회한다(마지막 메시지 시각 내림차순).
     *
     * @param cursor 이전 응답의 {@code nextCursor}(선택, 첫 페이지는 생략)
     * @param size 페이지 크기(기본 20, 1~100)
     * @return 200 OK + 커서 페이지 응답({@code totalCount} = 전체 대화 수)
     */
    @Operation(summary = "최근 대화 목록")
    @GetMapping
    public ResponseEntity<ApiResponse<CursorPageResponse<AiChatSummaryResponse>>> getChats(
            @AuthenticationPrincipal PrincipalMember currentMember,
            @RequestParam(required = false) String cursor,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return ResponseEntity.ok(ApiResponse.success(aiChatService.getChats(currentMember.memberId(), cursor, size)));
    }

    /**
     * 새 대화를 시작한다(첫 질문에 답하고, 제목은 첫 질문 앞 30자).
     *
     * @return 201 Created + 저장된 질문과 답변
     */
    @Operation(summary = "새 대화(첫 질문)")
    @PostMapping
    public ResponseEntity<ApiResponse<AiChatAnswerResponse>> startChat(
            @AuthenticationPrincipal PrincipalMember currentMember, @RequestBody @Valid AiChatQuestionRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(aiChatService.startChat(currentMember.memberId(), request.message())));
    }

    /**
     * 대화를 연다 — 질문·답변을 오래된 순으로.
     *
     * @return 200 OK + 대화 제목과 메시지 목록
     */
    @Operation(summary = "대화 열기")
    @GetMapping("/{chatId}/messages")
    public ResponseEntity<ApiResponse<AiChatDetailResponse>> getMessages(
            @AuthenticationPrincipal PrincipalMember currentMember, @PathVariable Long chatId) {
        return ResponseEntity.ok(ApiResponse.success(aiChatService.getMessages(currentMember.memberId(), chatId)));
    }

    /**
     * 대화에 이어서 질문한다. 직전 질문·답변 2턴을 맥락으로 함께 해석한다("그럼 256기가는?" 등).
     *
     * @return 201 Created + 저장된 질문과 답변
     */
    @Operation(summary = "이어서 질문")
    @PostMapping("/{chatId}/messages")
    public ResponseEntity<ApiResponse<AiChatAnswerResponse>> ask(
            @AuthenticationPrincipal PrincipalMember currentMember,
            @PathVariable Long chatId,
            @RequestBody @Valid AiChatQuestionRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(aiChatService.ask(currentMember.memberId(), chatId, request.message())));
    }

    /**
     * 답변을 다시 만든다. 그 답변과 뒤에 이어진 메시지는 지워지고, {@code message}를 보내면 바로 앞 질문을 그 내용으로 고친 뒤 다시
     * 답한다(질문 수정). 바디는 생략할 수 있다.
     *
     * @param messageId 다시 만들 답변(ASSISTANT) 메시지 ID
     * @return 201 Created + 질문과 새 답변
     */
    @Operation(summary = "답변 다시 만들기·질문 수정")
    @PostMapping("/{chatId}/messages/{messageId}/regenerate")
    public ResponseEntity<ApiResponse<AiChatAnswerResponse>> regenerate(
            @AuthenticationPrincipal PrincipalMember currentMember,
            @PathVariable Long chatId,
            @PathVariable Long messageId,
            @RequestBody(required = false) @Valid AiChatRegenerateRequest request) {
        String edited = request != null && request.editsQuestion() ? request.message() : null;
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(
                        aiChatService.regenerate(currentMember.memberId(), chatId, messageId, edited)));
    }

    /**
     * 대화를 지운다(메시지도 함께).
     *
     * @return 200 OK
     */
    @Operation(summary = "대화 삭제")
    @DeleteMapping("/{chatId}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @AuthenticationPrincipal PrincipalMember currentMember, @PathVariable Long chatId) {
        aiChatService.delete(currentMember.memberId(), chatId);
        return ResponseEntity.ok(ApiResponse.<Void>success(null));
    }

    /**
     * 최근 대화 목록을 비운다 — 본인 대화와 메시지를 모두 지운다(되돌릴 수 없음). 대화 하나만 지울 때는 {@code DELETE /ai/chats/{chatId}}.
     *
     * @return 200 OK + 지운 대화 수(대화가 없으면 0)
     */
    @Operation(summary = "대화 전체 삭제")
    @DeleteMapping
    public ResponseEntity<ApiResponse<AiChatDeleteAllResponse>> deleteAll(
            @AuthenticationPrincipal PrincipalMember currentMember) {
        return ResponseEntity.ok(ApiResponse.success(aiChatService.deleteAll(currentMember.memberId())));
    }
}
