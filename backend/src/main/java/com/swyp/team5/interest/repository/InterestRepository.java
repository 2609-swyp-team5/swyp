package com.swyp.team5.interest.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.swyp.team5.interest.entity.Interest;
import com.swyp.team5.member.entity.Member;
import com.swyp.team5.platform.entity.PlatformListing;

public interface InterestRepository extends JpaRepository<Interest, Long> {

    boolean existsByMemberIdAndItemId(Long memberId, Long itemId);

    long countByItemId(Long itemId);

    Optional<Interest> findByIdAndMemberId(Long interestId, Long memberId);

    /** 커서({@code id}) 미만의 본인 관심상품을 대상 상품/매물과 함께 조회한다(정렬·개수는 {@code pageable}). */
    @Query("SELECT i FROM Interest i JOIN FETCH i.item " + "WHERE i.member.id = :memberId AND i.id < :cursor")
    List<Interest> findByMemberIdAndIdLessThan(
            @Param("memberId") Long memberId, @Param("cursor") Long cursor, Pageable pageable);

    /** 목표가가 설정된 관심상품 전체(대상 상품/매물과 함께) — 목표가 도달 알림 배치용. */
    @Query("SELECT i FROM Interest i JOIN FETCH i.item WHERE i.targetPrice IS NOT NULL")
    List<Interest> findAllWithTargetPrice();

    /** 우리 상품 1건에 목표가를 설정한 관심상품 — 상품 수정 직후 목표가 도달 확인용. */
    @Query("SELECT i FROM Interest i JOIN FETCH i.item it WHERE it.id = :productId AND i.targetPrice IS NOT NULL")
    List<Interest> findWithTargetPriceByProductId(@Param("productId") Long productId);

    /** 우리 상품을 관심 등록한 회원 목록(구매 추천 알림 수신자). */
    @Query("SELECT i.member FROM Interest i WHERE i.item.id = :itemId")
    List<Member> findMembersByItemId(@Param("itemId") Long itemId);

    /** 한 명 이상이 관심 등록한 외부 매물 중 지정 상태(판매중)인 매물 — 시세 분석 대상. */
    @Query(
            "SELECT l FROM PlatformListing l WHERE l.status = :status AND EXISTS (SELECT 1 FROM Interest i WHERE i.item.id = l.id)")
    List<PlatformListing> findInterestedListingsByStatus(@Param("status") String status);

    @Query("SELECT p.id FROM Interest i, Product p WHERE i.item.id = p.id AND i.createdAt >= :since "
            + "GROUP BY p.id ORDER BY COUNT(i) DESC")
    List<Long> findPopularProductIds(@Param("since") LocalDateTime since, Pageable pageable);
}
