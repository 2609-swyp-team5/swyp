package com.swyp.team5.interest.service;

import com.swyp.team5.interest.entity.Interest;
import com.swyp.team5.member.entity.Member;
import com.swyp.team5.product.dto.ListingSource;

/**
 * 관심상품 등록 대상(source)별 검증·생성 전략. 새 source가 추가되면 이 인터페이스의 구현체만
 * 추가하면 되고, {@link InterestService}는 수정할 필요가 없다.
 */
public interface InterestRegistrar {

    ListingSource source();

    /**
     * 대상이 실제로 존재하는지, 이미 등록돼 있지 않은지 검증한 뒤 저장 전 {@link Interest}를 만든다.
     *
     * @param member 등록하는 회원(연관관계 설정용)
     * @param memberId 등록하는 회원 ID(중복 등록 검증용)
     * @param targetId 등록 대상 ID(source가 {@code OUR}이면 productId, {@code EXTERNAL}이면 listingId)
     * @return 저장 전 {@link Interest}
     */
    Interest register(Member member, Long memberId, Long targetId);
}
