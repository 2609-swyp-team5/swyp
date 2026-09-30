package com.swyp.team5.platform.repository;

import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.swyp.team5.platform.entity.CategoryPlatform;
import com.swyp.team5.product.entity.ProductStatus;

public interface CategoryPlatformRepository extends JpaRepository<CategoryPlatform, Long> {

    /**
     * 시세 수집 대상 매핑. 카테고리가 번개장터와 1:1(800여 개)이라 전부 수집하면 요청이 과하므로, 해당
     * 상태(시세 분석 대상 — {@code DRAFT}/{@code ON_SALE})의 우리 상품이 있는 카테고리만 고른다(분석은 상품과 같은
     * 카테고리 매물만 비교).
     */
    @Query(
            """
            select cp from CategoryPlatform cp
            where cp.platform.name = :platformName
              and cp.category.id in (select p.category.id from Product p where p.status in :productStatuses)
            """)
    List<CategoryPlatform> findCollectTargets(
            @Param("platformName") String platformName,
            @Param("productStatuses") Collection<ProductStatus> productStatuses);
}
