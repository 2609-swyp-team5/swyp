package com.swyp.team5.product.repository;

import java.util.Map;

import org.springframework.data.jpa.domain.Specification;

import com.swyp.team5.product.entity.Product;
import com.swyp.team5.product.entity.ProductStatus;

/** {@link ProductRepository}에 붙는 직접 구현 쿼리(Spring Data 파생 쿼리로 표현하기 어려운 것). */
public interface ProductRepositoryCustom {

    /**
     * 조건에 맞는 상품을 상태별로 한 번의 GROUP BY 쿼리로 센다.
     *
     * @param spec 조회 조건({@code null}이면 전체)
     * @return 상태별 건수(상품이 없는 상태는 키가 없음)
     */
    Map<ProductStatus, Long> countByStatus(Specification<Product> spec);
}
