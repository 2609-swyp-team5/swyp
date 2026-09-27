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

public interface InterestRepository extends JpaRepository<Interest, Long> {

    boolean existsByMemberIdAndProductId(Long memberId, Long productId);

    boolean existsByMemberIdAndListingId(Long memberId, Long listingId);

    Optional<Interest> findByIdAndMemberId(Long interestId, Long memberId);

    @Query("SELECT i FROM Interest i LEFT JOIN FETCH i.product LEFT JOIN FETCH i.listing WHERE i.member.id = :memberId")
    Page<Interest> findByMemberId(@Param("memberId") Long memberId, Pageable pageable);

    /** 우리 상품을 관심 등록한 회원 목록(구매 추천 알림 수신자). */
    @Query("SELECT i.member FROM Interest i WHERE i.product.id = :productId")
    List<Member> findMembersByProductId(@Param("productId") Long productId);

    @Query("SELECT i.product.id FROM Interest i WHERE i.product IS NOT NULL AND i.createdAt >= :since "
            + "GROUP BY i.product.id ORDER BY COUNT(i) DESC")
    List<Long> findPopularProductIds(@Param("since") LocalDateTime since, Pageable pageable);
}
