package com.swyp.team5.notification.controller;

import java.util.List;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.swyp.team5.common.common.ApiResponse;
import com.swyp.team5.common.passport.PrincipalMember;
import com.swyp.team5.notification.dto.NotificationReadResponse;
import com.swyp.team5.notification.dto.NotificationResponse;
import com.swyp.team5.notification.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

/** 회원 알림 API. 알림은 서버가 시세 분석 결과에 따라 만들며, 회원은 조회/읽음 처리/삭제만 한다. */
@Tag(name = "Notification", description = "알림")
@RestController
@RequestMapping("/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    /**
     * @param page 페이지 번호(0-base, 기본 0)
     * @param size 페이지 크기(기본 20)
     * @return 200 OK + 최신순 알림 목록
     */
    @Operation(summary = "알림 목록 조회")
    @GetMapping
    public ResponseEntity<ApiResponse<List<NotificationResponse>>> getNotifications(
            @AuthenticationPrincipal PrincipalMember currentMember,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(
                ApiResponse.success(notificationService.getNotifications(currentMember.memberId(), page, size)));
    }

    @Operation(summary = "알림 읽음 처리")
    @PatchMapping("/{notificationId}/read")
    public ResponseEntity<ApiResponse<NotificationReadResponse>> markRead(
            @AuthenticationPrincipal PrincipalMember currentMember, @PathVariable Long notificationId) {
        return ResponseEntity.ok(
                ApiResponse.success(notificationService.markRead(currentMember.memberId(), notificationId)));
    }

    @Operation(summary = "알림 삭제")
    @DeleteMapping("/{notificationId}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @AuthenticationPrincipal PrincipalMember currentMember, @PathVariable Long notificationId) {
        notificationService.delete(currentMember.memberId(), notificationId);
        return ResponseEntity.ok(ApiResponse.<Void>success(null));
    }
}
