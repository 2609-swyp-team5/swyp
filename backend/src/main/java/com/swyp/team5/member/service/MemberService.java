package com.swyp.team5.member.service;

import lombok.RequiredArgsConstructor;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.swyp.team5.auth.error.DuplicatePhoneException;
import com.swyp.team5.auth.service.RefreshTokenService;
import com.swyp.team5.file.dto.FileUploadResponse;
import com.swyp.team5.file.error.FileStorageException;
import com.swyp.team5.file.service.FileStorageService;
import com.swyp.team5.member.dto.MemberResponse;
import com.swyp.team5.member.dto.MemberUpdateRequest;
import com.swyp.team5.member.dto.PasswordChangeRequest;
import com.swyp.team5.member.entity.Member;
import com.swyp.team5.member.error.InvalidCurrentPasswordException;
import com.swyp.team5.member.error.MemberNotFoundException;
import com.swyp.team5.member.error.PasswordChangeNotAllowedException;
import com.swyp.team5.member.repository.MemberRepository;

@Service
@RequiredArgsConstructor
public class MemberService {

    private static final String PROFILE_IMAGE_DIRECTORY = "profile";

    private final MemberRepository memberRepository;

    private final PasswordEncoder passwordEncoder;

    private final RefreshTokenService refreshTokenService;

    private final FileStorageService fileStorageService;

    @Transactional(readOnly = true)
    public MemberResponse getProfile(Long memberId) {
        return MemberResponse.from(findMember(memberId));
    }

    @Transactional
    public MemberResponse updateProfile(Long memberId, MemberUpdateRequest request) {
        Member member = findMember(memberId);

        String phone = request.phone();
        if (phone != null && !phone.equals(member.getPhone()) && memberRepository.existsByPhone(phone)) {
            throw new DuplicatePhoneException(phone);
        }

        member.updateProfile(request.nickname(), phone);
        return MemberResponse.from(member);
    }

    @Transactional
    public void changePassword(Long memberId, PasswordChangeRequest request) {
        Member member = findMember(memberId);

        if (member.getPassword() == null) {
            throw new PasswordChangeNotAllowedException();
        }
        if (!passwordEncoder.matches(request.currentPassword(), member.getPassword())) {
            throw new InvalidCurrentPasswordException();
        }

        member.changePassword(passwordEncoder.encode(request.newPassword()));
        refreshTokenService.delete(memberId);
    }

    @Transactional
    public MemberResponse updateProfileImage(Long memberId, MultipartFile image) {
        if (image == null || image.isEmpty()) {
            throw new FileStorageException("업로드할 이미지가 없습니다.");
        }
        String contentType = image.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new FileStorageException("이미지 파일만 등록할 수 있습니다.");
        }

        Member member = findMember(memberId);
        FileUploadResponse uploaded = fileStorageService.upload(image, PROFILE_IMAGE_DIRECTORY);
        member.changeProfileImage(uploaded.url());

        return MemberResponse.from(member);
    }

    private Member findMember(Long memberId) {
        return memberRepository.findById(memberId).orElseThrow(() -> new MemberNotFoundException(memberId));
    }
}
