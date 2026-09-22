package com.swyp.team5.member.controller;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.swyp.team5.common.common.ApiResponse;
import com.swyp.team5.common.passport.PrincipalMember;
import com.swyp.team5.member.dto.MemberResponse;
import com.swyp.team5.member.dto.MemberUpdateRequest;
import com.swyp.team5.member.dto.PasswordChangeRequest;
import com.swyp.team5.member.service.MemberService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@Tag(name = "Member", description = "회원")
@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
public class MemberController {

    private final MemberService memberService;

    @Operation(summary = "내 정보 조회")
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<MemberResponse>> getMe(@AuthenticationPrincipal PrincipalMember currentMember) {
        return ResponseEntity.ok(ApiResponse.success(memberService.getProfile(currentMember.memberId())));
    }

    @Operation(summary = "프로필 이미지 등록")
    @PostMapping(value = "/profile/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<MemberResponse>> updateProfileImage(
            @AuthenticationPrincipal PrincipalMember currentMember, @RequestParam("image") MultipartFile image) {
        return ResponseEntity.ok(
                ApiResponse.success(memberService.updateProfileImage(currentMember.memberId(), image)));
    }

    @Operation(summary = "비밀번호 변경")
    @PatchMapping("/password")
    public ResponseEntity<ApiResponse<Void>> changePassword(
            @AuthenticationPrincipal PrincipalMember currentMember, @Valid @RequestBody PasswordChangeRequest request) {
        memberService.changePassword(currentMember.memberId(), request);
        return ResponseEntity.ok(ApiResponse.success("비밀번호가 변경되었습니다.", null));
    }

    @Operation(summary = "내 정보 수정")
    @PatchMapping("/me")
    public ResponseEntity<ApiResponse<MemberResponse>> updateMe(
            @AuthenticationPrincipal PrincipalMember currentMember, @Valid @RequestBody MemberUpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.success(memberService.updateProfile(currentMember.memberId(), request)));
    }
}
