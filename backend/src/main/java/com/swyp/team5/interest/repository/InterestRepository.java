package com.swyp.team5.interest.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.swyp.team5.interest.entity.Interest;
import com.swyp.team5.member.entity.Member;
import com.swyp.team5.platform.entity.PlatformListing;

public interface InterestRepository extends JpaRepository<Interest, Long> {

    boolean existsByMemberIdAndProductId(Long memberId, Long productId);

    boolean existsByMemberIdAndListingId(Long memberId, Long listingId);

    Optional<Interest> findByIdAndMemberId(Long interestId, Long memberId);

    @Query("SELECT i FROM Interest i LEFT JOIN FETCH i.product LEFT JOIN FETCH i.listing WHERE i.member.id = :memberId")
    Page<Interest> findByMemberId(@Param("memberId") Long memberId, Pageable pageable);

    /** 우리 상품을 관심 등록한 회원 목록(구매 추천 알림 수신자). */
    @Query("SELECT i.member FROM Interest i WHERE i.product.id = :productId")
    List<Member> findMembersByProductId(@Param("productId") Long productId);

    /** 외부 매물을 관심 등록한 회원 목록(구매 추천 알림 수신자). */
    @Query("SELECT i.member FROM Interest i WHERE i.listing.id = :listingId")
    List<Member> findMembersByListingId(@Param("listingId") Long listingId);

    /** 한 명 이상이 관심 등록한 외부 매물 중 지정 상태(판매중)인 매물 — 시세 분석 대상. */
    @Query("SELECT DISTINCT l FROM Interest i JOIN i.listing l WHERE l.status = :status")
    List<PlatformListing> findInterestedListingsByStatus(@Param("status") String status);

    @Query("SELECT i.product.id FROM Interest i WHERE i.product IS NOT NULL AND i.createdAt >= :since "
            + "GROUP BY i.product.id ORDER BY COUNT(i) DESC")
    List<Long> findPopularProductIds(@Param("since") LocalDateTime since, Pageable pageable);
}
