package com.swyp.team5.product.repository;

import java.time.LocalDateTime;
import java.util.Collection;
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

    List<Product> findByStatusIn(Collection<ProductStatus> statuses);

    /** 조회수를 1 올린다(동시 조회에도 누락되지 않도록 DB에서 더한다). */
    @Transactional
    @Modifying
    @Query("update Product p set p.viewCount = p.viewCount + 1 where p.id = :productId")
    int incrementViewCount(@Param("productId") Long productId);

    long countByCreatedAtGreaterThanEqual(LocalDateTime from);

    long countByMemberId(Long memberId);
}
