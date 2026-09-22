package com.swyp.team5.member.service;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.swyp.team5.auth.error.DuplicatePhoneException;
import com.swyp.team5.member.dto.MemberResponse;
import com.swyp.team5.member.dto.MemberUpdateRequest;
import com.swyp.team5.member.entity.Member;
import com.swyp.team5.member.error.MemberNotFoundException;
import com.swyp.team5.member.repository.MemberRepository;

@Service
@RequiredArgsConstructor
public class MemberService {

    private final MemberRepository memberRepository;

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

    private Member findMember(Long memberId) {
        return memberRepository.findById(memberId).orElseThrow(() -> new MemberNotFoundException(memberId));
    }
}
