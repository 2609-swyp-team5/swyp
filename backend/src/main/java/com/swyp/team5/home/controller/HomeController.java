package com.swyp.team5.home.controller;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.swyp.team5.common.common.ApiResponse;
import com.swyp.team5.common.passport.PrincipalMember;
import com.swyp.team5.home.dto.HomeSummaryResponse;
import com.swyp.team5.home.service.HomeSummaryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

/** 로그인 홈 화면용 API. */
@Tag(name = "Home", description = "홈")
@RestController
@RequestMapping("/home")
@RequiredArgsConstructor
public class HomeController {

    private final HomeSummaryService homeSummaryService;

    /**
     * 본인 홈 상단 요약(등록한 물건·관심 상품·오늘 받은 AI 추천 알림·평균 시세 대비·최근 분석일)을 조회한다.
     *
     * @return 200 OK + 홈 요약
     */
    @Operation(summary = "홈 요약 조회")
    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<HomeSummaryResponse>> getSummary(
            @AuthenticationPrincipal PrincipalMember currentMember) {
        return ResponseEntity.ok(ApiResponse.success(homeSummaryService.getSummary(currentMember.memberId())));
    }
}
