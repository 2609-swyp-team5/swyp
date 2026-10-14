package com.swyp.team5.platform.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.swyp.team5.platform.entity.ProductPlatform;

public interface ProductPlatformRepository extends JpaRepository<ProductPlatform, Long> {

    List<ProductPlatform> findByProductId(Long productId);

    Optional<ProductPlatform> findByProductIdAndMemberPlatformId(Long productId, Long memberPlatformId);

    /** 상품 삭제 전 정리용 — 외부 플랫폼 게시·연동 기록을 지운다(외부에 올라간 매물 자체는 그대로 남는다). */
    @Modifying(flushAutomatically = true)
    @Query("DELETE FROM ProductPlatform pp WHERE pp.product.id = :productId")
    int deleteAllByProductId(@Param("productId") Long productId);
}
