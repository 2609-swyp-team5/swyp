package com.swyp.team5.product.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import com.swyp.team5.product.entity.Product;
import com.swyp.team5.product.entity.ProductStatus;

public interface ProductRepository extends JpaRepository<Product, Long>, JpaSpecificationExecutor<Product> {

    List<Product> findByCategoryId(Long categoryId);

    List<Product> findByStatus(ProductStatus status);

    /**
     * AI 제안가 컬럼만 갱신한다(시세 분석용). 엔티티 전체를 저장하지 않으므로, 분석이 도는 동안 판매자가
     * 수정한 다른 필드를 오래된 값으로 덮어쓰지 않는다.
     */
    @Transactional
    @Modifying
    @Query("update Product p set p.suggestedPrice = :suggestedPrice where p.id = :productId")
    int updateSuggestedPrice(@Param("productId") Long productId, @Param("suggestedPrice") Long suggestedPrice);
}
